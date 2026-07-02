interface VoiceQuestionProps {
  question: string;
  index: number;
  total: number;
  onRecord: () => void;
  onDemo: (kind: 'normal' | 'tired') => void;
  recording: boolean;
  error: string | null;
}

export function VoiceQuestion({
  question,
  index,
  total,
  onRecord,
  onDemo,
  recording,
  error,
}: VoiceQuestionProps) {
  return (
    <div className="voice-question">
      <p className="step-label">
        Питання {index + 1} з {total}
      </p>
      <h2>{question}</h2>
      <button type="button" className="btn-primary" onClick={onRecord} disabled={recording}>
        {recording ? 'Запис…' : 'Записати відповідь'}
      </button>
      <div className="demo-row">
        <button type="button" className="btn-secondary" onClick={() => onDemo('normal')}>
          Демо: як зазвичай
        </button>
        <button type="button" className="btn-secondary" onClick={() => onDemo('tired')}>
          Демо: втомлений день
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
