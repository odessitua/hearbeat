const BASELINE_KEY = 'hearbeat_baseline';

export function saveBaseline(metrics) {
  const data = { ...metrics, ts: Date.now() };
  localStorage.setItem(BASELINE_KEY, JSON.stringify(data));
}

export function loadBaseline() {
  const raw = localStorage.getItem(BASELINE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearBaseline() {
  localStorage.removeItem(BASELINE_KEY);
}

export function computeDeltas(baseline, current) {
  const pct = (curr, base) => {
    if (!base || base === 0) return 0;
    return ((curr - base) / base) * 100;
  };

  return {
    speechRatePct: pct(current.speechRate, baseline.speechRate),
    pauseRatioPct: pct(current.pauseRatio, baseline.pauseRatio),
    latencyPct: pct(current.avgLatencyMs, baseline.avgLatencyMs),
    pitchMeanPct: pct(current.pitchMeanHz, baseline.pitchMeanHz),
    pitchVariancePct: pct(current.pitchVarianceHz, baseline.pitchVarianceHz),
  };
}
