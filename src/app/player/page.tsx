'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { playerApi } from '@/lib/api/player.api';
import { Card } from '@/lib/ui/Card';
import { StatTile } from '@/lib/ui/StatTile';
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

  if (loading) return <p className="text-muted">Loading dashboard…</p>;
  if (error) return <p className="text-corner-red">{error}</p>;
  if (!data) return null;

  const { player, stats, upcoming_matches } = data;

  return (
    <div className="flex flex-col gap-6">
      <Card accent="blue">
        <h1 className="text-lg font-bold text-ink">{player.player_name}</h1>
        <p className="text-sm text-muted">
          {player.id_number || player.nsrd_id || (player.player_id ? `#${player.player_id}` : player.id.slice(0, 8))}
          {player.sport ? ` · ${player.sport}` : ''}
        </p>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted">Your stats</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatTile value={stats.events_count} label="Events" accent="blue" />
          <StatTile value={stats.certificates.gold} label="Gold" accent="pending" />
          <StatTile value={stats.certificates.silver} label="Silver" accent="none" />
          <StatTile value={stats.certificates.bronze} label="Bronze" accent="none" />
          <StatTile value={stats.total_certs} label="Total certs" accent="green" />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted">Upcoming matches</h2>
        {upcoming_matches.length === 0 ? (
          <p className="text-sm text-muted">No upcoming matches.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {upcoming_matches.map((m) => (
              <Card as="li" key={m.match_id}>
                <div className="mb-2 text-xs text-muted">{m.event_name || 'Event'}</div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold text-ink">
                    <span className="h-[9px] w-[9px] rounded-full bg-corner-red" />
                    You
                  </span>
                  <span className="text-xs font-semibold text-muted">VS</span>
                  <span className="flex items-center gap-2 font-medium text-ink">
                    {m.opponent_name || 'TBD'}
                    <span className="h-[9px] w-[9px] rounded-full bg-accent-blue" />
                  </span>
                </div>
              </Card>
            ))}
          </ul>
        )}
      </section>

      <Link href="/player/events" className="text-sm font-medium text-accent-blue underline">
        Browse events →
      </Link>
    </div>
  );
}
