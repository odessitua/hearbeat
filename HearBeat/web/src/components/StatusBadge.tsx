import type { CheckInStatus } from '../types/checkin';

interface StatusBadgeProps {
  status: CheckInStatus | null;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const isAlert = status === 'check-in needed';
  return (
    <div className={`status-badge ${isAlert ? 'status-alert' : 'status-ok'}`}>
      {isAlert ? 'Варто подзвонити' : 'Звучить як зазвичай'}
    </div>
  );
}
