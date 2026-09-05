'use client';

import { useEffect, useState } from 'react';
import { playerApi } from '@/lib/api/player.api';
import { Card } from '@/lib/ui/Card';
import { StatusBadge } from '@/lib/ui/StatusBadge';
import type { Match } from '@/lib/types';

export default function PlayerMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    playerApi
      .matches()
      .then((res) => {
        if (res.success && res.data) setMatches(res.data);
        else setError(res.message || 'Could not load matches');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted">Loading matches…</p>;
  if (error) return <p className="text-corner-red">{error}</p>;

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-ink">My matches</h1>
      {matches.length === 0 ? (
        <p className="text-sm text-muted">No matches yet — they&apos;ll appear here once you&apos;re scheduled.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {matches.map((m) => (
            <Card as="li" key={m.match_id}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink">{m.event_name || 'Event match'}</span>
                {m.status && <StatusBadge status={m.status} />}
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <span className="h-[9px] w-[9px] rounded-full bg-corner-red" />
                <span className="text-ink">You</span>
                <span className="font-mono text-xs text-muted">
                  {m.player1_score !== undefined && m.player2_score !== undefined
                    ? `${m.player1_score} – ${m.player2_score}`
                    : 'vs'}
                </span>
                <span className="text-ink">{m.opponent_name || 'TBD'}</span>
                <span className="h-[9px] w-[9px] rounded-full bg-accent-blue" />
              </div>
              {m.scheduled_at && (
                <div className="mt-1 text-xs text-muted">{new Date(m.scheduled_at).toLocaleDateString()}</div>
              )}
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
