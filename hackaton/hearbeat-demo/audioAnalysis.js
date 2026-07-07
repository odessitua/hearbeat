const FRAME_SIZE = 2048;
const FRAME_INTERVAL_MS = 30;
const CALIBRATION_DURATION_MS = 600;
const SILENCE_MULTIPLIER = 2.5; // threshold = ambient RMS * multiplier
const MIN_PITCH_HZ = 50;
const MAX_PITCH_HZ = 400;

export class AudioAnalyzer {
  constructor() {
    this.audioCtx = null;
    this.analyser = null;
    this.stream = null;
    this.silenceThreshold = 0.01;

    this._frameBuffer = new Float32Array(FRAME_SIZE);
    this._tickInterval = null;

    // Per-answer state
    this._frames = [];
    this._pitchSamples = [];
    this._firstSpeechTime = null;
    this._recording = false;
    this._ttsDoneTime = null;
  }

  async init() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    this.audioCtx = new AudioContext();
    const source = this.audioCtx.createMediaStreamSource(this.stream);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = FRAME_SIZE;
    source.connect(this.analyser);
  }

  async calibrateAmbientNoise() {
    const rmsSamples = [];
    const start = Date.now();

    await new Promise((resolve) => {
      const measure = () => {
        if (Date.now() - start >= CALIBRATION_DURATION_MS) {
          resolve();
          return;
        }
        this.analyser.getFloatTimeDomainData(this._frameBuffer);
        rmsSamples.push(computeRMS(this._frameBuffer));
        setTimeout(measure, FRAME_INTERVAL_MS);
      };
      measure();
    });

    const avgAmbient = rmsSamples.reduce((a, b) => a + b, 0) / rmsSamples.length;
    this.silenceThreshold = Math.max(avgAmbient * SILENCE_MULTIPLIER, 0.005);
    console.log('[AudioAnalyzer] silence threshold calibrated:', this.silenceThreshold.toFixed(4));
  }

  startAnswer(ttsDoneTime) {
    this._frames = [];
    this._pitchSamples = [];
    this._firstSpeechTime = null;
    this._recording = true;
    this._ttsDoneTime = ttsDoneTime;

    this._tickInterval = setInterval(() => {
      if (!this._recording) return;
      this.analyser.getFloatTimeDomainData(this._frameBuffer);
      const rms = computeRMS(this._frameBuffer);
      const isSpeech = rms > this.silenceThreshold;
      const now = Date.now();

      this._frames.push({ rms, isSpeech, t: now });

      if (isSpeech && this._firstSpeechTime === null) {
        this._firstSpeechTime = now;
      }

      if (isSpeech) {
        const f0 = estimatePitch(this._frameBuffer, this.audioCtx.sampleRate);
        if (f0 !== null) {
          this._pitchSamples.push(f0);
        }
      }
    }, FRAME_INTERVAL_MS);
  }

  stopAnswer(wordCount) {
    this._recording = false;
    clearInterval(this._tickInterval);
    this._tickInterval = null;

    const totalFrames = this._frames.length;
    if (totalFrames === 0) {
      return {
        speechDurationMs: 0,
        pauseRatio: 0,
        latencyMs: 0,
        pitchMeanHz: 0,
        pitchVarianceHz: 0,
        speechRate: 0,
      };
    }

    const speechFrames = this._frames.filter((f) => f.isSpeech).length;
    const silenceFrames = totalFrames - speechFrames;
    const pauseRatio = silenceFrames / totalFrames;

    const speechDurationMs = speechFrames * FRAME_INTERVAL_MS;

    const latencyMs =
      this._firstSpeechTime !== null && this._ttsDoneTime !== null
        ? Math.max(0, this._firstSpeechTime - this._ttsDoneTime)
        : 0;

    let pitchMeanHz = 0;
    let pitchVarianceHz = 0;
    if (this._pitchSamples.length > 0) {
      pitchMeanHz = mean(this._pitchSamples);
      pitchVarianceHz = Math.sqrt(variance(this._pitchSamples, pitchMeanHz));
    }

    const speechRateWPM =
      speechDurationMs > 0 ? (wordCount / speechDurationMs) * 60000 : 0;

    return {
      speechDurationMs,
      pauseRatio,
      latencyMs,
      pitchMeanHz,
      pitchVarianceHz,
      speechRate: speechRateWPM,
    };
  }

  stop() {
    clearInterval(this._tickInterval);
    this._recording = false;
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
    }
    if (this.audioCtx) {
      this.audioCtx.close();
    }
  }
}

// --- helpers ---

function computeRMS(buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

function estimatePitch(buffer, sampleRate) {
  const minLag = Math.floor(sampleRate / MAX_PITCH_HZ);
  const maxLag = Math.floor(sampleRate / MIN_PITCH_HZ);

  let maxCorr = -Infinity;
  let bestLag = -1;

  const n = buffer.length;
  for (let lag = minLag; lag <= maxLag && lag < n; lag++) {
    let corr = 0;
    for (let i = 0; i < n - lag; i++) {
      corr += buffer[i] * buffer[i + lag];
    }
    if (corr > maxCorr) {
      maxCorr = corr;
      bestLag = lag;
    }
  }

  if (bestLag <= 0 || maxCorr < 0.01) return null;
  return sampleRate / bestLag;
}

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr, m) {
  return arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / arr.length;
}
