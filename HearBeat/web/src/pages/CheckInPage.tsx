import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { ConsentBanner } from '../components/ConsentBanner';
import { IncomingCall } from '../components/IncomingCall';
import { VoiceQuestion } from '../components/VoiceQuestion';
import { playAudioBlob, RecordingError, recordAudio } from '../lib/audioRecorder';
import { completeCheckIn, loadDemoAudio } from '../lib/checkinFlow';

import type { CheckIn } from '../types/checkin';
import { CHECKIN_QUESTIONS } from '../types/checkin';

type Phase = 'ringing' | 'consent' | 'questions' | 'done';

export function CheckInPage() {
  const [phase, setPhase] = useState<Phase>('ringing');
  const [questionIdx, setQuestionIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState<'live' | 'normal' | 'tired'>('live');
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<CheckIn | null>(null);
  const blobsRef = useRef<Blob[]>([]);

  const finishWithBlob = async (blob: Blob, mode: 'live' | 'normal' | 'tired') => {
    setSubmitting(true);
    setError(null);
    try {
      const row = await completeCheckIn(blob, mode);
      setLastResult(row);
      blobsRef.current = [];
      setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка збереження');
    } finally {
      setSubmitting(false);
    }
  };

  const advanceOrFinish = async (blob: Blob, mode: 'live' | 'normal' | 'tired') => {
    blobsRef.current.push(blob);
    if (questionIdx < CHECKIN_QUESTIONS.length - 1) {
      setQuestionIdx((i) => i + 1);
      return;
    }
    await finishWithBlob(blob, mode);
  };

  const handleRecord = async () => {
    setRecording(true);
    setError(null);
    try {
      const blob = await recordAudio(20);
      await advanceOrFinish(blob, demoMode);
    } catch (e) {
      if (e instanceof RecordingError) {
        setError('Запис занадто короткий або тихий. Спробуйте ще раз або оберіть демо-відповідь.');
      } else {
        setError('Не вдалося записати звук. Скористайтесь демо-відповіддю.');
      }
    } finally {
      setRecording(false);
    }
  };

  const handleDemo = async (kind: 'normal' | 'tired') => {
    setDemoMode(kind);
    setError(null);
    try {
      const blob = await loadDemoAudio(kind);
      playAudioBlob(blob);
      await advanceOrFinish(blob, kind);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Демо-аудіо недоступне');
    }
  };

  if (phase === 'ringing') {
    return (
      <main className="page checkin-page">
        <IncomingCall
          onAnswer={() => setPhase('consent')}
          onDecline={() => setError('Дзвінок відхилено')}
        />
        {error && <p className="error-text">{error}</p>}
      </main>
    );
  }

  if (phase === 'consent') {
    return (
      <main className="page checkin-page">
        <ConsentBanner />
        <button type="button" className="btn-primary" onClick={() => setPhase('questions')}>
          Продовжити
        </button>
      </main>
    );
  }

  if (phase === 'done') {
    const isAlert = lastResult?.status === 'check-in needed';
    return (
      <main className="page checkin-page done-screen">
        <h1>Дякуємо!</h1>
        <p>Олена отримає коротке повідомлення на dashboard.</p>
        {lastResult?.vitality_score != null && (
          <section className="card analysis-preview">
            <p className={isAlert ? 'tag-alert' : 'tag-ok'}>
              {isAlert ? 'Варто подзвонити' : 'Звучить як зазвичай'}
            </p>
            <p className="vitality-score">Vitality: {lastResult.vitality_score}</p>
            {lastResult.acoustic_delta && <p className="delta-text">{lastResult.acoustic_delta}</p>}
            {lastResult.summary_for_family && (
              <p className="summary-text">{lastResult.summary_for_family}</p>
            )}
            {lastResult.features_json && (
              <details className="features-details">
                <summary>Акустичні ознаки (ML)</summary>
                <pre>{JSON.stringify(lastResult.features_json, null, 2)}</pre>
              </details>
            )}
          </section>
        )}
        <Link to="/dashboard" className="btn-primary">
          Відкрити dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="page checkin-page">
      <VoiceQuestion
        question={CHECKIN_QUESTIONS[questionIdx]}
        index={questionIdx}
        total={CHECKIN_QUESTIONS.length}
        onRecord={handleRecord}
        onDemo={handleDemo}
        recording={recording || submitting}
        error={error}
      />
    </main>
  );
}
