'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { playerApi } from '@/lib/api/player.api';
import type { PlayerDashboardData } from '@/lib/types';

export default function PlayerDashboardPage() {
  const [data, setData] = useState<PlayerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    playerApi
      .dashboard()
      .then((res) => {
        if (res.success && res.data) setData(res.data);
        else setError(res.message || 'Could not load dashboard');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading dashboard…</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return null;

  const { player, stats, upcoming_matches } = data;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h1 className="text-lg font-bold">{player.player_name}</h1>
        <p className="text-sm text-gray-500">
          {player.id_number || player.nsrd_id || (player.player_id ? `#${player.player_id}` : player.id.slice(0, 8))}
          {player.sport ? ` · ${player.sport}` : ''}
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-600">Your stats</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: 'Events', value: stats.events_count },
            { label: 'Gold', value: stats.certificates.gold },
            { label: 'Silver', value: stats.certificates.silver },
            { label: 'Bronze', value: stats.certificates.bronze },
            { label: 'Total certs', value: stats.total_certs },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-gray-200 bg-white p-3 text-center">
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-600">Upcoming matches</h2>
        {upcoming_matches.length === 0 ? (
          <p className="text-sm text-gray-500">No upcoming matches.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {upcoming_matches.map((m) => (
              <li key={m.match_id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
                <div className="font-medium">{m.event_name || 'Event'}</div>
                <div className="text-gray-500">vs {m.opponent_name || 'TBD'}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href="/player/events" className="text-sm font-medium underline">
        Browse events →
      </Link>
    </div>
  );
}
