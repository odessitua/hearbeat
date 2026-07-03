import { useEffect, useRef, useState } from 'react';

import { playAudioBlob, RecordingError, startRecordingSession } from '../lib/audioRecorder';
import { analyzeAudio, DEMO_BASELINE, ML_URL } from '../lib/checkinFlow';
import {
  BASELINE_STORAGE_HINT,
  clearPersonalBaseline,
  getPersonalBaseline,
  setPersonalBaseline,
  toBaseline,
} from '../lib/personalBaseline';

import { AcousticAnalysisCharts } from '../components/AcousticAnalysisCharts';

import type { AnalyzeResult } from '../types/checkin';
import type { BaselineFeatures } from '../lib/personalBaseline';

type Phase = 'idle' | 'recording' | 'analyzing' | 'done';
type RecordingIntent = 'baseline' | 'check';

function activeBaseline(): BaselineFeatures {
  return getPersonalBaseline() ?? DEMO_BASELINE;
}

export function MlDemoPage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const [recordingIntent, setRecordingIntent] = useState<RecordingIntent>('baseline');
  const [hasBaseline, setHasBaseline] = useState(() => getPersonalBaseline() !== null);
  const sessionRef = useRef<ReturnType<typeof startRecordingSession> | null>(null);
  const replayAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setHasBaseline(getPersonalBaseline() !== null);
  }, []);

  const runAnalysis = async (blob: Blob) => {
    setPhase('analyzing');
    setError(null);
    try {
      const analysis = await analyzeAudio(blob, {
        allowFallback: false,
        useDemoBaseline: true,
        includeSeries: true,
      });
      setResult(analysis);
      setLastBlob(blob);
      setPhase('done');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'Failed to fetch' || msg.includes('NetworkError')) {
        setError(
          'Не вдалося з’єднатися з ML API. Перевірте: (1) uvicorn на :8000, (2) перезапустіть npm run dev після зміни .env',
        );
      } else {
        setError(msg || 'Не вдалося проаналізувати аудіо');
      }
      setPhase('idle');
    }
  };

  const startRecording = (intent: RecordingIntent) => {
    setRecordingIntent(intent);
    setError(null);
    setResult(null);
    try {
      const session = startRecordingSession(30);
      sessionRef.current = session;
      setPhase('recording');
      void session.promise
        .then((blob) => {
          sessionRef.current = null;
          return runAnalysis(blob);
        })
        .catch((e: unknown) => {
          sessionRef.current = null;
          if (e instanceof RecordingError) {
            setError('Запис занадто короткий. Скажіть кілька речень і спробуйте знову.');
          } else {
            setError(e instanceof Error ? e.message : 'Помилка запису');
          }
          setPhase('idle');
        });
    } catch {
      setError('Немає доступу до мікрофона. Дозвольте запис у браузері.');
      setPhase('idle');
    }
  };

  const handleStop = () => {
    sessionRef.current?.stop();
  };

  const handleSaveBaseline = () => {
    if (!result?.features_json) {
      return;
    }
    setPersonalBaseline(toBaseline(result.features_json));
    setHasBaseline(true);
    if (lastBlob) {
      void runAnalysis(lastBlob);
    }
  };

  const handleClearBaseline = () => {
    clearPersonalBaseline();
    setHasBaseline(false);
    setResult(null);
    setPhase('idle');
  };

  const handleReplay = () => {
    if (!lastBlob) {
      return;
    }
    if (replayAudioRef.current) {
      replayAudioRef.current.pause();
    }
    replayAudioRef.current = playAudioBlob(lastBlob);
  };

  const handleReset = () => {
    setPhase('idle');
    setResult(null);
    setError(null);
  };

  const isAlert = result?.status === 'check-in needed';
  const baseline = activeBaseline();
  const awaitingBaselineSave =
    Boolean(result) && recordingIntent === 'baseline' && !hasBaseline && !result?.baseline_calibrated;

  const statusLabel = (() => {
    if (!result) {
      return '';
    }
    if (awaitingBaselineSave) {
      return 'Підтвердіть baseline';
    }
    if (!result.baseline_calibrated) {
      return 'Потрібен baseline (крок 1)';
    }
    if (isAlert) {
      return 'Варто подзвонити';
    }
    if (result.acoustic_index > 105) {
      return 'Бодріше за звичай';
    }
    if (result.acoustic_index < 95) {
      return 'Є відмінності від baseline';
    }
    return 'Звучить як зазвичай';
  })();

  return (
    <main className="page ml-demo-page">
      <header className="page-header">
        <h1>ML-тест</h1>
        <p className="muted flow-steps">
          <strong>Крок 1</strong> — записати baseline (бодрий «звичний» голос).{' '}
          <strong>Крок 2</strong> — записати перевірку (порівняння з baseline).
        </p>
        <p className="muted api-hint">API: {ML_URL}</p>
        <p className="baseline-hint">
          {hasBaseline ? (
            <>
              ✓ Baseline збережено · acoustic index 100 = цей голос
            </>
          ) : (
            <>Крок 1 ще не зроблено — спочатку baseline, потім перевірки</>
          )}
        </p>
        <p className="muted storage-hint">{BASELINE_STORAGE_HINT}</p>
      </header>

      <section className="card">
        {phase === 'recording' ? (
          <>
            <p className="recording-pulse">
              {recordingIntent === 'baseline'
                ? 'Крок 1: запис baseline…'
                : 'Крок 2: запис перевірки…'}
            </p>
            <button type="button" className="btn-decline" onClick={handleStop}>
              Зупинити запис
            </button>
          </>
        ) : (
          <div className="record-steps">
            <button
              type="button"
              className="btn-primary btn-record"
              onClick={() => startRecording('baseline')}
              disabled={phase === 'analyzing'}
            >
              {phase === 'analyzing' && recordingIntent === 'baseline'
                ? 'Аналіз…'
                : 'Крок 1 · Записати baseline'}
            </button>
            <button
              type="button"
              className="btn-secondary btn-record"
              onClick={() => startRecording('check')}
              disabled={phase === 'analyzing' || !hasBaseline}
              title={hasBaseline ? undefined : 'Спочатку зробіть крок 1 і збережіть baseline'}
            >
              {phase === 'analyzing' && recordingIntent === 'check'
                ? 'Аналіз…'
                : 'Крок 2 · Записати перевірку'}
            </button>
          </div>
        )}
      </section>

      {error && <p className="error-text">{error}</p>}

      {result && phase === 'done' && (
        <section className="card analysis-preview">
          {awaitingBaselineSave && (
            <p className="calibration-warn">
              Це запис для <strong>кроку 1</strong>. Натисніть «Зберегти baseline» — тоді відкриється
              крок 2.
            </p>
          )}
          {!result.baseline_calibrated && !awaitingBaselineSave && (
            <p className="calibration-warn">
              ⚠ Немає збереженого baseline — індекс не рахується. Спочатку крок 1.
            </p>
          )}
          <p className={isAlert && result.baseline_calibrated ? 'tag-alert' : 'tag-ok'}>
            {statusLabel}
          </p>
          {!result.baseline_calibrated ? (
            <>
              <p className="vitality-score index-score muted-uncalibrated">
                Acoustic index: <strong>—</strong>
              </p>
              {!awaitingBaselineSave && (
                <p className="delta-text muted">
                  Технічно vs демо: {result.acoustic_index} — ігноруйте до кроку 1.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="vitality-score index-score">
                Acoustic index: <strong>{result.acoustic_index}</strong>
                <span className="muted"> (100 = ваш baseline)</span>
              </p>
              <p className="delta-text">{result.acoustic_delta}</p>
            </>
          )}
          {result.baseline_calibrated && (
            <p className="vitality-score muted legacy-score">
              Vitality (legacy 0–100): {result.vitality_score}
            </p>
          )}
          {result.baseline_calibrated && result.summary_for_family && (
            <p className="summary-text">{result.summary_for_family}</p>
          )}
          {result.features_json && result.baseline_calibrated && (
            <AcousticAnalysisCharts
              features={result.features_json}
              series={result.series_json}
              baseline={baseline}
              metricDeviations={result.metric_deviations}
            />
          )}
          <div className="baseline-actions">
            {recordingIntent === 'baseline' && result.features_json && (
              <button type="button" className="btn-primary" onClick={handleSaveBaseline}>
                {hasBaseline ? 'Оновити baseline' : 'Зберегти baseline'}
              </button>
            )}
            {hasBaseline && (
              <>
                <button type="button" className="btn-secondary" onClick={() => startRecording('baseline')}>
                  Перезаписати baseline (крок 1)
                </button>
                <button type="button" className="btn-secondary" onClick={handleClearBaseline}>
                  Скинути baseline
                </button>
              </>
            )}
          </div>
          {lastBlob && (
            <button type="button" className="btn-secondary btn-replay" onClick={handleReplay}>
              ▶ Прослухати запис
            </button>
          )}
          <details className="features-details">
            <summary>Debug: поточний запис + baseline (JSON для копіювання)</summary>
            <pre>
              {JSON.stringify(
                {
                  current: result.features_json,
                  baseline,
                  metric_deviations: result.metric_deviations,
                  acoustic_index: result.acoustic_index,
                  vitality_score: result.vitality_score,
                  status: result.status,
                },
                null,
                2,
              )}
            </pre>
          </details>
          <button type="button" className="btn-secondary" onClick={handleReset}>
            Закрити результат
          </button>
        </section>
      )}

      <footer className="disclaimer">
        Потрібен запущений ML API: <code>uvicorn hearbeat_ml.api:app --port 8000</code>
      </footer>
    </main>
  );
}
