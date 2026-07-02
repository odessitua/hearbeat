import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { CheckInHistory } from '../components/CheckInHistory';
import { StatusBadge } from '../components/StatusBadge';
import { VitalityChart } from '../components/VitalityChart';
import { fetchCheckIns } from '../lib/supabase';

import type { CheckIn } from '../types/checkin';

const PHONE = (import.meta.env.VITE_FAMILY_PHONE as string | undefined) ?? '+380501234567';

export function DashboardPage() {
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCheckIns()
      .then(setCheckins)
      .catch((e: Error) => setError(e.message));
  }, []);

  const latest = checkins[0];

  return (
    <main className="page dashboard-page">
      <header className="page-header">
        <h1>Dashboard для родини</h1>
        <p className="muted">Марія · останні чек-іни</p>
        <Link to="/check-in" className="link-inline">
          Пройти новий чек-ін →
        </Link>
      </header>

      {error && <p className="error-text">{error}</p>}

      {latest && (
        <section className="card status-card">
          <StatusBadge status={latest.status} />
          {latest.vitality_score != null && (
            <p className="vitality-score">Vitality: {latest.vitality_score}</p>
          )}
          {latest.summary_for_family && (
            <p className="summary-text">{latest.summary_for_family}</p>
          )}
          {latest.acoustic_delta && (
            <p className="delta-text">{latest.acoustic_delta}</p>
          )}
          <a className="btn-primary call-cta" href={`tel:${PHONE}`}>
            Подзвонити
          </a>
        </section>
      )}

      <section className="card">
        <h2>Тренд</h2>
        <VitalityChart checkins={checkins} />
      </section>

      <section className="card">
        <h2>Останні чек-іни</h2>
        <CheckInHistory checkins={checkins} />
      </section>

      <footer className="disclaimer">
        HearBeat не ставить діагнозів і не замінює лікаря. Це сімейний сигнал між
        вашими дзвінками.
      </footer>
    </main>
  );
}
