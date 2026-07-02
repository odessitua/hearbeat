interface IncomingCallProps {
  onAnswer: () => void;
  onDecline: () => void;
}

export function IncomingCall({ onAnswer, onDecline }: IncomingCallProps) {
  return (
    <div className="incoming-call">
      <p className="call-label">Вхідний дзвінок</p>
      <h1>HearBeat</h1>
      <p className="call-sub">Сімейний чек-ін від Олени</p>
      <div className="call-actions">
        <button type="button" className="btn-decline" onClick={onDecline}>
          Відхилити
        </button>
        <button type="button" className="btn-answer" onClick={onAnswer}>
          Відповісти
        </button>
      </div>
    </div>
  );
}
