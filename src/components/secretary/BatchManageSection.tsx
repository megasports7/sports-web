'use client';

/**
 * Split step 2: single-batch manage section. Shows ONLY this batch's
 * matches (P1 vs P2, winner/loser, Start/declare with names) and ONLY its
 * players (distinct match participants). Start/declare gated on
 * manage_matches; the RPCs enforce grant + event scope regardless.
 */
import { useEffect, useState } from 'react';
import { secretaryApi } from '@/lib/api/secretary.api';
import { SecretaryStyles } from '@/components/secretary/SecretaryStyles';

export function BatchManageSection({
  eventId,
  batchId,
  canManageMatches,
}: {
  eventId: string;
  batchId: string;
  canManageMatches: boolean;
}) {
  const [matches, setMatches] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchActing, setMatchActing] = useState<string | null>(null);

  useEffect(() => {
    secretaryApi.eventMatches(eventId).then((mRes) => {
      if (mRes.success && mRes.data) {
        setMatches((mRes.data as Record<string, unknown>[]).filter((m) => m.batch_id === batchId));
        setError(null);
      } else {
        setError(mRes.message || 'Could not load matches');
      }
      setLoading(false);
    });
  }, [eventId, batchId]);

  async function startMatch(matchId: string) {
    setMatchActing(matchId);
    const res = await secretaryApi.startMatch(matchId);
    if (res.success) {
      const mRes = await secretaryApi.eventMatches(eventId);
      if (mRes.success && mRes.data)
        setMatches((mRes.data as Record<string, unknown>[]).filter((m) => m.batch_id === batchId));
      setError(null);
    } else {
      setError(res.message || 'Start failed');
    }
    setMatchActing(null);
  }

  async function declareWinner(matchId: string, winnerId: string, winnerName?: string) {
    if (!window.confirm(`Declare ${winnerName ?? 'this player'} the winner?`)) return;
    setMatchActing(matchId);
    const res = await secretaryApi.recordMatchResult(matchId, winnerId);
    if (res.success) {
      const mRes = await secretaryApi.eventMatches(eventId);
      if (mRes.success && mRes.data)
        setMatches((mRes.data as Record<string, unknown>[]).filter((m) => m.batch_id === batchId));
      setError(null);
    } else {
      setError(res.message || 'Declare failed');
    }
    setMatchActing(null);
  }

  if (loading) return <p className="text-muted">Loading batch…</p>;

  const batchName =
    (matches[0]?.batch_name as string) ||
    (matches.length ? `Batch ${batchId.slice(0, 8)}` : `Batch ${batchId.slice(0, 8)}`);
  const playerNames = Array.from(
    new Set(
      matches.flatMap((m) => [m.player1_name, m.player2_name]).filter((n): n is string => !!n && n !== 'TBD'),
    ),
  ).sort();

  return (
    <div className="batch-manage">
      {error && <p className="text-error">{error}</p>}
      <div className="card">
        <h2>
          {batchName} — players ({playerNames.length})
        </h2>
        {playerNames.length === 0 ? (
          <p className="text-muted">No players slotted yet.</p>
        ) : (
          <p>{playerNames.join(' · ')}</p>
        )}
      </div>
      <div className="card">
        <h2>Matches ({matches.length})</h2>
        {matches.length === 0 ? (
          <p className="text-muted">No matches in this batch.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Round</th>
                <th>Match</th>
                <th>Status</th>
                <th>Winner</th>
                {canManageMatches && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => {
                const id = m.id as string;
                const status = String(m.status ?? '');
                const p1 = m.player1_id as string | null;
                const p2 = m.player2_id as string | null;
                const p1Name = String(m.player1_name ?? 'TBD');
                const p2Name = String(m.player2_name ?? 'TBD');
                const winnerName = (m.winner_name as string | null) ?? null;
                const loserName = winnerName && p1 && p2 ? (m.winner_id === p1 ? p2Name : p1Name) : null;
                const busy = matchActing === id;
                return (
                  <tr key={id}>
                    <td>
                      {m.bracket_side && m.bracket_side !== 'W' ? `${String(m.bracket_side)}·` : ''}R
                      {String(m.round_number ?? '—')} · M{String(m.match_number ?? '—')}
                    </td>
                    <td>
                      <span className="versus">
                        {p1Name} <span className="vs">vs</span> {p2Name}
                      </span>
                    </td>
                    <td>
                      <span className={`status status-${status}`}>{status || '—'}</span>
                    </td>
                    <td>
                      {winnerName ? (
                        <>
                          <strong className="winner">{winnerName}</strong>
                          {loserName && (
                            <>
                              <br />
                              <span className="loser">Loser: {loserName}</span>
                            </>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    {canManageMatches && (
                      <td className="actions">
                        {status === 'scheduled' && p1 && p2 && (
                          <button disabled={busy} onClick={() => startMatch(id)}>
                            Start
                          </button>
                        )}
                        {status !== 'completed' && p1 && (
                          <button disabled={busy} onClick={() => declareWinner(id, p1, p1Name)}>
                            {p1Name} wins
                          </button>
                        )}
                        {status !== 'completed' && p2 && (
                          <button disabled={busy} onClick={() => declareWinner(id, p2, p2Name)}>
                            {p2Name} wins
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!canManageMatches && matches.length > 0 && (
          <p className="text-muted">Match actions need the manage_matches permission — ask an admin.</p>
        )}
      </div>
      <SecretaryStyles />
    </div>
  );
}
