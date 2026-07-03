import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { AcousticFeatures, AcousticSeries } from '../types/checkin';
import type { BaselineFeatures } from '../lib/personalBaseline';

interface AcousticAnalysisChartsProps {
  features: AcousticFeatures;
  series?: AcousticSeries | null;
  baseline: BaselineFeatures;
  metricDeviations?: Record<string, number>;
}

const FATIGUE_METRICS = [
  { key: 'tempo_bpm' as const, label: 'Темп', unit: 'уд/хв' },
  { key: 'pause_mean_ms' as const, label: 'Паузи', unit: 'мс' },
  { key: 'energy_rms' as const, label: 'Енергія', unit: 'RMS' },
] as const;

function signedDeviationPct(current: number, base: number): number {
  if (base === 0) {
    return 0;
  }
  return Math.round(((current - base) / base) * 100);
}

function deviationBarColor(key: string, deviation: number): string {
  const threshold = 25;
  const bad =
    (key === 'pause_mean_ms' && deviation >= threshold) ||
    (key !== 'pause_mean_ms' && deviation <= -threshold);
  const good =
    (key === 'pause_mean_ms' && deviation <= -threshold) ||
    (key !== 'pause_mean_ms' && deviation >= threshold);
  if (bad) {
    return '#c45c26';
  }
  if (good) {
    return '#2d6a4f';
  }
  return '#95d5b2';
}

export function AcousticAnalysisCharts({
  features,
  series,
  baseline,
  metricDeviations,
}: AcousticAnalysisChartsProps) {
  const deviationData = FATIGUE_METRICS.map((m) => {
    const base = baseline[m.key];
    const current = features[m.key];
    const deviation =
      metricDeviations?.[m.key] ?? signedDeviationPct(current, base);
    return {
      name: m.label,
      deviation,
      fill: deviationBarColor(m.key, deviation),
      current,
      baseline: base,
      unit: m.unit,
    };
  });

  const maxAbs = Math.max(50, ...deviationData.map((d) => Math.abs(d.deviation))) + 10;

  const rmsData = series?.rms_envelope.map((p) => ({ t: p.t_sec, rms: p.rms })) ?? [];
  const pitchData = series?.pitch_contour.map((p) => ({ t: p.t_sec, hz: p.hz })) ?? [];

  return (
    <div className="acoustic-charts">
      <p className="chart-caption muted">
        <strong>Acoustic index</strong> = темп + паузи + енергія (без pitch_std — на живому голосі він
        майже не змінюється). 100 = ваш baseline. Спочатку збережіть <strong>бодрий</strong> запис.
      </p>

      <h3 className="chart-title">Відхилення від baseline (%)</h3>
      <p className="muted chart-sub">
        0% = норма. Мінус — темп/енергія/інтонація нижчі; плюс у паузах — довші паузи.
      </p>
      <div className="chart-wrap chart-wrap-sm">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={deviationData} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8dfd4" horizontal={false} />
            <XAxis
              type="number"
              domain={[-maxAbs, maxAbs]}
              tick={{ fontSize: 11 }}
              unit="%"
            />
            <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11 }} />
            <ReferenceLine x={0} stroke="#6b5f52" strokeDasharray="4 4" />
            <Tooltip
              formatter={(value: number, _name, item) => {
                const row = item.payload as (typeof deviationData)[0];
                const sign = value > 0 ? '+' : '';
                return [
                  `${sign}${value}% (зараз ${row.current} ${row.unit}, baseline ${row.baseline})`,
                  'Δ',
                ];
              }}
            />
            <Bar dataKey="deviation" radius={[0, 4, 4, 0]}>
              {deviationData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {metricDeviations?.pitch_std_hz != null && (
        <p className="muted chart-sub debug-pitch">
          pitch_std (debug): {metricDeviations.pitch_std_hz > 0 ? '+' : ''}
          {metricDeviations.pitch_std_hz}% — не використовується в індексі
        </p>
      )}

      {series ? (
        <>
          <h3 className="chart-title">Енергія голосу (RMS) у часі</h3>
          <p className="muted chart-sub">
            Кожна точка — кадр librosa (~{Math.round((512 / 22050) * 1000)} мс). Пунктир — поріг
            паузи.
          </p>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={rmsData} margin={{ left: 4, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8dfd4" />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tick={{ fontSize: 11 }}
                  unit="с"
                />
                <YAxis tick={{ fontSize: 11 }} width={40} />
                <ReferenceLine
                  y={series.rms_threshold}
                  stroke="#b08900"
                  strokeDasharray="4 4"
                  label={{ value: 'пауза', position: 'insideTopRight', fontSize: 10 }}
                />
                <Tooltip
                  formatter={(value: number) => [value.toFixed(4), 'RMS']}
                  labelFormatter={(t) => `${Number(t).toFixed(2)} с`}
                />
                <Line
                  type="monotone"
                  dataKey="rms"
                  stroke="#2d6a4f"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <h3 className="chart-title">Висота тону (Hz) у часі</h3>
          <p className="muted chart-sub">Домінантна частота по voiced-кадрах (piptrack).</p>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={pitchData} margin={{ left: 4, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8dfd4" />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tick={{ fontSize: 11 }}
                  unit="с"
                />
                <YAxis tick={{ fontSize: 11 }} width={48} unit="Hz" />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(0)} Hz`, 'Тон']}
                  labelFormatter={(t) => `${Number(t).toFixed(2)} с`}
                />
                <Line
                  type="monotone"
                  dataKey="hz"
                  stroke="#c45c26"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <p className="muted chart-sub">
          Криві в часі недоступні — перезапустіть ML API (потрібна версія з <code>include_series</code>).
        </p>
      )}
    </div>
  );
}
