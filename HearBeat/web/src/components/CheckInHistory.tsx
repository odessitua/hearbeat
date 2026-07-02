import type { CheckIn } from '../types/checkin';

interface CheckInHistoryProps {
  checkins: CheckIn[];
}

export function CheckInHistory({ checkins }: CheckInHistoryProps) {
  const recent = checkins.slice(0, 8);
  return (
    <ul className="history-list">
      {recent.map((c) => (
        <li key={c.id}>
          <span>{new Date(c.created_at).toLocaleString('uk-UA')}</span>
          <span className={c.status === 'check-in needed' ? 'tag-alert' : 'tag-ok'}>
            {c.status === 'check-in needed' ? 'Увага' : 'Норма'}
          </span>
        </li>
      ))}
    </ul>
  );
}
