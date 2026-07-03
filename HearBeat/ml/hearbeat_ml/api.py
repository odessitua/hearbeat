"""FastAPI analyze endpoint for HearBeat hackathon MVP."""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any, Dict, Optional

import httpx
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from hearbeat_ml.baseline import aggregate_baseline, inline_baseline_from_json
from hearbeat_ml.features import extract_features, extract_time_series
from hearbeat_ml.scoring import ScoreResult, score_against_baseline
from hearbeat_ml.summary import generate_summary
from hearbeat_ml.supabase_client import fetch_baseline_rows

app = FastAPI(title="HearBeat ML API", version="0.1.0")

_cors_raw = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173",
)
_cors_origins = [o.strip() for o in _cors_raw.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROFILE_BASELINE_WINDOW = 10


class AnalyzeResponse(BaseModel):
    """Response matching contracts/ml-analyze-api.yaml."""

    features_json: Dict[str, float]
    vitality_score: float = Field(ge=0, le=100)
    acoustic_index: float
    metric_deviations: Dict[str, float] = Field(default_factory=dict)
    status: str
    acoustic_delta: str
    summary_for_family: Optional[str] = None
    series_json: Optional[Dict[str, Any]] = None
    baseline_calibrated: bool = False


class ErrorBody(BaseModel):
    error: str
    code: str


def _resolve_baseline(
    profile_id: str,
    baseline_features: Optional[str],
) -> Optional[Dict[str, float]]:
    inline = inline_baseline_from_json({"baseline_features": baseline_features})
    if inline is not None:
        return inline
    rows = fetch_baseline_rows(profile_id, PROFILE_BASELINE_WINDOW)
    return aggregate_baseline(rows)


def _analyze_file(
    path: Path,
    profile_id: str,
    scenario_label: str,
    baseline_features: Optional[str],
    transcript: Optional[str],
    include_series: bool = False,
    baseline_calibrated: bool = False,
) -> AnalyzeResponse:
    try:
        features = extract_features(path)
    except ValueError as exc:
        code = str(exc)
        if code in ("AUDIO_TOO_SHORT", "AUDIO_SILENT"):
            raise HTTPException(status_code=422, detail={"error": code, "code": code}) from exc
        raise HTTPException(status_code=400, detail={"error": str(exc), "code": "INVALID_FORMAT"}) from exc

    series_json: Optional[Dict[str, Any]] = None
    if include_series:
        try:
            series_json = extract_time_series(path)
        except ValueError as exc:
            code = str(exc)
            if code in ("AUDIO_TOO_SHORT", "AUDIO_SILENT"):
                raise HTTPException(status_code=422, detail={"error": code, "code": code}) from exc
            raise HTTPException(status_code=400, detail={"error": str(exc), "code": "INVALID_FORMAT"}) from exc

    baseline = _resolve_baseline(profile_id, baseline_features)
    result: ScoreResult = score_against_baseline(
        features, baseline, baseline_calibrated=baseline_calibrated
    )
    summary = generate_summary(result.status, result.acoustic_delta, transcript)
    return AnalyzeResponse(
        features_json=result.features_json,
        vitality_score=result.vitality_score,
        acoustic_index=result.acoustic_index,
        metric_deviations=result.metric_deviations,
        status=result.status,
        acoustic_delta=result.acoustic_delta,
        summary_for_family=summary,
        series_json=series_json,
        baseline_calibrated=result.baseline_calibrated,
    )


async def _download_audio(url: str, dest: Path) -> None:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        dest.write_bytes(resp.content)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    profile_id: str = Form(...),
    scenario_label: str = Form("live"),
    audio_url: Optional[str] = Form(None),
    baseline_features: Optional[str] = Form(None),
    transcript: Optional[str] = Form(None),
    include_series: bool = Form(False),
    baseline_calibrated: bool = Form(False),
    audio_file: Optional[UploadFile] = File(None),
) -> AnalyzeResponse:
    """Analyze uploaded audio or fetch from audio_url."""
    if audio_file is None and not audio_url:
        raise HTTPException(
            status_code=400,
            detail={"error": "audio_file or audio_url required", "code": "INVALID_FORMAT"},
        )

    suffix = ".wav"
    if audio_file and audio_file.filename:
        suffix = Path(audio_file.filename).suffix or ".wav"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = Path(tmp.name)
        try:
            if audio_file is not None:
                content = await audio_file.read()
                tmp_path.write_bytes(content)
            elif audio_url is not None:
                await _download_audio(audio_url, tmp_path)
            return _analyze_file(
                tmp_path,
                profile_id,
                scenario_label,
                baseline_features,
                transcript,
                include_series=include_series,
                baseline_calibrated=baseline_calibrated,
            )
        finally:
            if tmp_path.exists():
                try:
                    tmp_path.unlink()
                except PermissionError:
                    # Windows may keep the WAV handle open briefly after librosa.load.
                    pass


@app.post("/analyze/json", response_model=AnalyzeResponse)
async def analyze_json(body: Dict[str, Any]) -> AnalyzeResponse:
    """JSON analyze with audio_url only (for service-to-service calls)."""
    profile_id = str(body.get("profile_id", "demo-maria"))
    audio_url = body.get("audio_url")
    if not audio_url:
        raise HTTPException(status_code=400, detail="audio_url required")
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        tmp_path = Path(tmp.name)
        try:
            await _download_audio(str(audio_url), tmp_path)
            return _analyze_file(
                tmp_path,
                profile_id,
                str(body.get("scenario_label", "live")),
                body.get("baseline_features"),
                body.get("transcript"),
                include_series=bool(body.get("include_series", False)),
                baseline_calibrated=bool(body.get("baseline_calibrated", False)),
            )
        finally:
            if tmp_path.exists():
                try:
                    tmp_path.unlink()
                except PermissionError:
                    # Windows may keep the WAV handle open briefly after librosa.load.
                    pass
