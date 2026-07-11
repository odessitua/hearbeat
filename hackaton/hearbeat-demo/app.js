import { AudioAnalyzer } from './audioAnalysis.js';
import { saveBaseline, loadBaseline, clearBaseline, computeDeltas } from './baseline.js';

// ── Question scripts ───────────────────────────────────────────────────────────

const CALIBRATION_QUESTIONS = [
  'Як ти почуваєшся сьогодні?',
  'Що ти їв на сніданок?',
  'Розкажи про свої плани на день.',
];

const CHECKIN_QUESTIONS = [
  'Як пройшов твій ранок?',
  'Що тебе порадувало останнім часом?',
  'Як ти почуваєшся зараз?',
];

// ── State ──────────────────────────────────────────────────────────────────────

const States = {
  IDLE: 'IDLE',
  CALIBRATING: 'CALIBRATING',
  CHECKIN: 'CHECKIN',
  ANALYZING: 'ANALYZING',
  REPORT: 'REPORT',
};

let state = States.IDLE;
let analyzer = null;
let recognition = null;
let currentQuestionIndex = 0;
let sessionAnswers = [];
let currentMode = null; // 'calibrate' | 'checkin'

// ── DOM refs ───────────────────────────────────────────────────────────────────

const screens = {
  idle: document.getElementById('screen-idle'),
  session: document.getElementById('screen-session'),
  report: document.getElementById('screen-report'),
};

const btnCalibrate = document.getElementById('btn-calibrate');
const btnCheckin = document.getElementById('btn-checkin');
const btnReset = document.getElementById('btn-reset');
const baselineStatus = document.getElementById('baseline-status');

const questionEl = document.getElementById('current-question');
const questionNumEl = document.getElementById('question-num');
const liveTranscriptEl = document.getElementById('live-transcript');
const sessionStatusEl = document.getElementById('session-status');
const waveCanvas = document.getElementById('waveform');

const reportBadge = document.getElementById('concern-badge');
const reportSummary = document.getElementById('report-summary');
const reportPatterns = document.getElementById('report-patterns');
const reportDisclaimer = document.getElementById('report-disclaimer');
const debugPanel = document.getElementById('debug-panel');
const debugTable = document.getElementById('debug-table');
const btnDebugToggle = document.getElementById('btn-debug-toggle');
const btnNewCheckin = document.getElementById('btn-new-checkin');

const chromeWarning = document.getElementById('chrome-warning');

// ── Init ───────────────────────────────────────────────────────────────────────

function init() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    chromeWarning.classList.remove('hidden');
  }

  updateBaselineStatus();
  updateIdleButtons();
  showScreen('idle');

  btnCalibrate.addEventListener('click', () => startSession('calibrate'));
  btnCheckin.addEventListener('click', () => startSession('checkin'));
  btnReset.addEventListener('click', handleReset);
  btnDebugToggle.addEventListener('click', toggleDebug);
  btnNewCheckin.addEventListener('click', returnToIdle);
}

// ── Screen management ──────────────────────────────────────────────────────────

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ── Baseline UI ────────────────────────────────────────────────────────────────

function updateBaselineStatus() {
  const b = loadBaseline();
  if (b) {
    const date = new Date(b.ts).toLocaleDateString('uk-UA');
    baselineStatus.textContent = `Базова лінія: ${date}`;
    baselineStatus.classList.add('has-baseline');
  } else {
    baselineStatus.textContent = 'Базова лінія: не встановлена';
    baselineStatus.classList.remove('has-baseline');
  }
}

function updateIdleButtons() {
  const hasBaseline = !!loadBaseline();
  btnCheckin.disabled = !hasBaseline;
}

// ── Session flow ───────────────────────────────────────────────────────────────

async function startSession(mode) {
  if (state !== States.IDLE) return;
  currentMode = mode;
  state = mode === 'calibrate' ? States.CALIBRATING : States.CHECKIN;
  sessionAnswers = [];
  currentQuestionIndex = 0;

  showScreen('session');
  setSessionStatus('Підключення до мікрофону…');

  try {
    analyzer = new AudioAnalyzer();
    await analyzer.init();
    setSessionStatus('Калібрування рівня шуму…');
    await analyzer.calibrateAmbientNoise();
    setSessionStatus('Готово. Починаємо…');
    await sleep(800);
    await runNextQuestion();
  } catch (err) {
    setSessionStatus(`Помилка: ${err.message}`);
    console.error(err);
  }
}

async function runNextQuestion() {
  const questions = currentMode === 'calibrate' ? CALIBRATION_QUESTIONS : CHECKIN_QUESTIONS;

  if (currentQuestionIndex >= questions.length) {
    await finishSession();
    return;
  }

  const question = questions[currentQuestionIndex];
  const questionNum = currentQuestionIndex + 1;

  questionEl.textContent = question;
  questionNumEl.textContent = `Питання ${questionNum} з ${questions.length}`;
  liveTranscriptEl.textContent = '';
  setSessionStatus('Слухайте питання…');

  await speakTTS(question);

  const ttsDoneTime = Date.now();
  setSessionStatus('Ваша відповідь (говоріть зараз)…');

  analyzer.startAnswer(ttsDoneTime);
  const transcriptResult = await listenSTT();
  const wordCount = countWords(transcriptResult);
  const metrics = analyzer.stopAnswer(wordCount);

  sessionAnswers.push({
    question,
    transcript: transcriptResult,
    metrics,
    wordCount,
  });

  currentQuestionIndex++;
  await sleep(500);
  await runNextQuestion();
}

async function finishSession() {
  setSessionStatus('Обробка результатів…');

  if (analyzer) {
    analyzer.stop();
    analyzer = null;
  }

  const aggregated = aggregateMetrics(sessionAnswers);

  if (currentMode === 'calibrate') {
    saveBaseline(aggregated);
    updateBaselineStatus();
    updateIdleButtons();
    showToast('Базова лінія збережена!');
    showScreen('idle');
    state = States.IDLE;
    return;
  }

  // Check-in: compute deltas + call API
  const baseline = loadBaseline();
  const deltas = computeDeltas(baseline, aggregated);

  state = States.ANALYZING;
  showScreen('session');
  setSessionStatus('Аналіз та формування звіту…');

  const transcript = sessionAnswers
    .map((a) => `Питання: ${a.question}\nВідповідь: ${a.transcript}`)
    .join('\n\n');

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript,
        currentMetrics: aggregated,
        baselineMetrics: baseline,
        deltas,
      }),
    });

    if (!response.ok) {
      throw new Error(`Сервер: ${response.status}`);
    }

    const report = await response.json();
    renderReport(report, aggregated, baseline, deltas);
    state = States.REPORT;
    showScreen('report');
  } catch (err) {
    setSessionStatus(`Помилка аналізу: ${err.message}`);
    state = States.IDLE;
    console.error(err);
  }
}

// ── Metrics aggregation ────────────────────────────────────────────────────────

function aggregateMetrics(answers) {
  const n = answers.length;
  if (n === 0) return { speechRate: 0, pauseRatio: 0, avgLatencyMs: 0, pitchMeanHz: 0, pitchVarianceHz: 0 };

  const sum = (key) => answers.reduce((acc, a) => acc + (a.metrics[key] || 0), 0);

  return {
    speechRate: sum('speechRate') / n,
    pauseRatio: sum('pauseRatio') / n,
    avgLatencyMs: sum('latencyMs') / n,
    pitchMeanHz: sum('pitchMeanHz') / n,
    pitchVarianceHz: sum('pitchVarianceHz') / n,
  };
}

// ── Report rendering ───────────────────────────────────────────────────────────

function renderReport(report, current, baseline, deltas) {
  const levelLabels = { normal: 'Норма', mild: 'Незначні зміни', notable: 'Варто зателефонувати' };
  const level = report.concernLevel || 'normal';

  reportBadge.textContent = levelLabels[level] || level;
  reportBadge.className = `concern-badge level-${level}`;

  reportSummary.textContent = report.summaryForFamily || '';

  reportPatterns.innerHTML = '';
  (report.observedPatterns || []).forEach((p) => {
    const li = document.createElement('li');
    li.textContent = p;
    reportPatterns.appendChild(li);
  });

  reportDisclaimer.textContent = report.disclaimer || '';

  // Debug table
  debugTable.innerHTML = `
    <thead><tr><th>Метрика</th><th>Зараз</th><th>Базова</th><th>Відхилення</th></tr></thead>
    <tbody>
      <tr><td>Швидкість мовлення (сл/хв)</td><td>${fmt(current.speechRate)}</td><td>${fmt(baseline.speechRate)}</td><td>${fmtPct(deltas.speechRatePct)}</td></tr>
      <tr><td>Коефіцієнт пауз</td><td>${fmtPct(current.pauseRatio * 100, true)}</td><td>${fmtPct(baseline.pauseRatio * 100, true)}</td><td>${fmtPct(deltas.pauseRatioPct)}</td></tr>
      <tr><td>Затримка відповіді (мс)</td><td>${fmt(current.avgLatencyMs, 0)}</td><td>${fmt(baseline.avgLatencyMs, 0)}</td><td>${fmtPct(deltas.latencyPct)}</td></tr>
      <tr><td>Висота голосу F0 (Гц)</td><td>${fmt(current.pitchMeanHz)}</td><td>${fmt(baseline.pitchMeanHz)}</td><td>${fmtPct(deltas.pitchMeanPct)}</td></tr>
      <tr><td>Варіація висоти (Гц)</td><td>${fmt(current.pitchVarianceHz)}</td><td>${fmt(baseline.pitchVarianceHz)}</td><td>${fmtPct(deltas.pitchVariancePct)}</td></tr>
    </tbody>
  `;
}

function fmt(val, decimals = 1) {
  return val != null ? Number(val).toFixed(decimals) : '—';
}

function fmtPct(val, noSign = false) {
  if (val == null) return '—';
  const sign = val > 0 ? '+' : '';
  return `${noSign ? '' : sign}${Number(val).toFixed(1)}%`;
}

// ── TTS helper ─────────────────────────────────────────────────────────────────

function speakTTS(text) {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'uk-UA';
    utterance.rate = 0.95;
    utterance.onend = resolve;
    utterance.onerror = resolve;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  });
}

// ── STT helper ─────────────────────────────────────────────────────────────────

function listenSTT() {
  return new Promise((resolve) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      resolve('');
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'uk-UA';
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = '';
    let silenceTimer = null;

    const resetSilenceTimer = () => {
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        recognition.stop();
      }, 3000);
    };

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t + ' ';
        } else {
          interim += t;
        }
      }
      liveTranscriptEl.textContent = finalTranscript + interim;
      resetSilenceTimer();
    };

    recognition.onend = () => {
      clearTimeout(silenceTimer);
      resolve(finalTranscript.trim());
    };

    recognition.onerror = (e) => {
      clearTimeout(silenceTimer);
      console.warn('STT error:', e.error);
      resolve(finalTranscript.trim());
    };

    recognition.start();
    resetSilenceTimer();
  });
}

// ── Reset ──────────────────────────────────────────────────────────────────────

function handleReset() {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
  if (analyzer) {
    analyzer.stop();
    analyzer = null;
  }
  speechSynthesis.cancel();
  clearBaseline();
  sessionAnswers = [];
  currentQuestionIndex = 0;
  currentMode = null;
  state = States.IDLE;
  updateBaselineStatus();
  updateIdleButtons();
  showScreen('idle');
  showToast('Базова лінія скинута');
}

function returnToIdle() {
  state = States.IDLE;
  showScreen('idle');
}

// ── Debug toggle ───────────────────────────────────────────────────────────────

function toggleDebug() {
  debugPanel.classList.toggle('open');
  btnDebugToggle.textContent = debugPanel.classList.contains('open')
    ? 'Сховати метрики'
    : 'Показати метрики';
}

// ── Toast ──────────────────────────────────────────────────────────────────────

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 3000);
}

// ── Waveform visualizer ────────────────────────────────────────────────────────

function startWaveform() {
  if (!analyzer || !analyzer.analyser) return;
  const ctx = waveCanvas.getContext('2d');
  const buf = new Float32Array(analyzer.analyser.fftSize);

  function draw() {
    if (!analyzer) return;
    requestAnimationFrame(draw);
    analyzer.analyser.getFloatTimeDomainData(buf);
    const w = waveCanvas.width;
    const h = waveCanvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.strokeStyle = '#5BB8D4';
    ctx.lineWidth = 2;
    const sliceW = w / buf.length;
    let x = 0;
    for (let i = 0; i < buf.length; i++) {
      const y = (buf[i] * 0.5 + 0.5) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      x += sliceW;
    }
    ctx.stroke();
  }
  draw();
}

// ── Utilities ──────────────────────────────────────────────────────────────────

function setSessionStatus(msg) {
  sessionStatusEl.textContent = msg;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ── Bootstrap ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
