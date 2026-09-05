'use client';

import { useEffect, useState } from 'react';
import { playerApi } from '@/lib/api/player.api';
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

  if (loading) return <p className="text-gray-500">Loading matches…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold">My matches</h1>
      {matches.length === 0 ? (
        <p className="text-sm text-gray-500">No matches yet — they&apos;ll appear here once you&apos;re scheduled.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {matches.map((m) => (
            <li key={m.match_id} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{m.event_name || 'Event match'}</span>
                {m.status && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs uppercase">{m.status}</span>}
              </div>
              <div className="mt-1 text-sm text-gray-600">
                {m.player1_score !== undefined && m.player2_score !== undefined
                  ? `${m.player1_score} - ${m.player2_score}`
                  : `vs ${m.opponent_name || 'TBD'}`}
              </div>
              {m.scheduled_at && (
                <div className="mt-1 text-xs text-gray-400">{new Date(m.scheduled_at).toLocaleDateString()}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
