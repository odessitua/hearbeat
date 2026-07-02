import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { CheckIn } from '../types/checkin';

interface VitalityChartProps {
  checkins: CheckIn[];
}

export function VitalityChart({ checkins }: VitalityChartProps) {
  const data = [...checkins]
    .filter((c) => c.vitality_score != null)
    .reverse()
    .map((c) => ({
      date: new Date(c.created_at).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }),
      score: c.vitality_score as number,
    }));

  if (data.length === 0) {
    return <p className="muted">Немає даних для графіка</p>;
  }

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8dfd4" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line type="monotone" dataKey="score" stroke="#c45c26" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
