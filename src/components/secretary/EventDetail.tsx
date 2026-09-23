'use client';

/**
 * Shared event-monitor detail (both portals): registrations with verify
 * actions (gated on verify_players), results, certificates. Every action
 * calls the audited review_registration RPC -- a denied grant or scope
 * surfaces as the RPC's own error, shown inline.
 */
import { useEffect, useState } from 'react';
import { secretaryApi, type SecretaryEvent, type SecretaryRegistration } from '@/lib/api/secretary.api';

export function EventDetail({
  event,
  canReview,
  canManageBatches = false,
  canManageMatches = false,
  canIssueCerts = false,
}: {
  event: SecretaryEvent;
  canReview: boolean;
  canManageBatches?: boolean;
  canManageMatches?: boolean;
  canIssueCerts?: boolean;
}) {
  const [regs, setRegs] = useState<SecretaryRegistration[]>([]);
  const [matches, setMatches] = useState<Record<string, unknown>[]>([]);
  const [certs, setCerts] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [batchName, setBatchName] = useState('');
  const [batchFormat, setBatchFormat] = useState('single_elimination');
  const [creating, setCreating] = useState(false);
  const [matchActing, setMatchActing] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      secretaryApi.registrations(event.event_id),
      secretaryApi.eventMatches(event.event_id),
      secretaryApi.eventCertificates(event.event_id),
    ]).then(([rRes, mRes, cRes]) => {
      if (rRes.success && rRes.data) setRegs(rRes.data);
      if (mRes.success && mRes.data) setMatches(mRes.data);
      if (cRes.success && cRes.data) setCerts(cRes.data);
      if (!rRes.success) setError(rRes.message || 'Could not load registrations');
      else if (!mRes.success) setError(mRes.message || 'Could not load results');
      else if (!cRes.success) setError(cRes.message || 'Could not load certificates');
      else setError(null);
      setLoading(false);
    });
  }, [event.event_id]);

  async function decide(reg: SecretaryRegistration, decision: 'approved' | 'rejected' | 'overridden') {
    let reason: string | null = null;
    if (decision === 'overridden') {
      reason = window.prompt('Override reason (required, recorded in audit):');
      if (!reason || !reason.trim()) return;
    } else if (decision === 'rejected') {
      if (!window.confirm(`Reject ${reg.player_name}'s registration?`)) return;
    }
    setActing(reg.id);
    const res = await secretaryApi.reviewRegistration(reg.id, decision, reason ?? undefined);
    if (res.success) {
      const status = decision === 'overridden' ? 'overridden' : decision;
      setRegs((prev) => prev.map((r) => (r.id === reg.id ? { ...r, status } : r)));
      setError(null);
    } else {
      setError(res.message || 'Review failed');
    }
    setActing(null);
  }

  async function startMatch(matchId: string) {
    setMatchActing(matchId);
    const res = await secretaryApi.startMatch(matchId);
    if (res.success) {
      const mRes = await secretaryApi.eventMatches(event.event_id);
      if (mRes.success && mRes.data) setMatches(mRes.data);
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
      const mRes = await secretaryApi.eventMatches(event.event_id);
      if (mRes.success && mRes.data) setMatches(mRes.data);
      setError(null);
    } else {
      setError(res.message || 'Declare failed');
    }
    setMatchActing(null);
  }

  async function createBatch() {
    const name = batchName.trim();
    const playerIds = regs.filter((r) => r.status === 'approved').map((r) => r.player_id);
    if (!name) {
      setError('Enter a batch name first.');
      return;
    }
    if (playerIds.length < 1) {
      setError('Approve at least one registration before creating a batch.');
      return;
    }
    setCreating(true);
    const res = await secretaryApi.createBatch({
      event_id: event.event_id,
      batch_name: name,
      player_ids: playerIds,
      tournament_format: batchFormat,
    });
    setCreating(false);
    if (res.success) {
      setBatchName('');
      setError(null);
      const mRes = await secretaryApi.eventMatches(event.event_id);
      if (mRes.success && mRes.data) setMatches(mRes.data);
    } else {
      setError(res.message || 'Batch creation failed');
    }
  }

  if (loading) return <p className="text-muted">Loading event…</p>;

  const visible = regs.filter((r) => filter === 'all' || r.status === filter);

  return (
    <div className="detail">
      <h1>{event.event_name}</h1>
      {error && <p className="text-error">{error}</p>}

      <div className="card">
        <h2>Registrations ({visible.length}/{regs.length})</h2>
        <div className="filters">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={filter === f ? 'on' : ''}>
              {f}
            </button>
          ))}
        </div>
        {visible.length === 0 ? (
          <p className="text-muted">No registrations in this view.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Status</th>
                {canReview && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td>{r.player_name}</td>
                  <td>
                    <span className={`status status-${r.status}`}>{r.status}</span>
                  </td>
                  {canReview && (
                    <td className="actions">
                      <button disabled={acting === r.id} onClick={() => decide(r, 'approved')}>
                        Approve
                      </button>
                      <button disabled={acting === r.id} onClick={() => decide(r, 'rejected')}>
                        Reject
                      </button>
                      <button disabled={acting === r.id} onClick={() => decide(r, 'overridden')}>
                        Override
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!canReview && (
          <p className="text-muted">Review actions need the verify_players permission — ask an admin.</p>
        )}
      </div>

      <div className="card">
        <h2>Batches</h2>
        {!canManageBatches ? (
          <p className="text-muted">Batch creation needs the manage_batches permission — ask an admin.</p>
        ) : (
          <div className="batch-create">
            <input
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="Batch name (e.g. U-14 Boys)"
              aria-label="Batch name"
            />
            <select value={batchFormat} onChange={(e) => setBatchFormat(e.target.value)} aria-label="Format">
              <option value="single_elimination">Single elimination</option>
              <option value="round_robin">Round robin</option>
              <option value="double_elimination">Double elimination</option>
            </select>
            <button onClick={createBatch} disabled={creating}>
              {creating ? 'Creating…' : 'Create batch from approved'}
            </button>
            <p className="text-muted">Uses approved registrations as players. Ownership stays with the event organizer.</p>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Results ({matches.length})</h2>
        {matches.length === 0 ? (
          <p className="text-muted">No matches yet — create a batch from approved registrations above.</p>
        ) : (
          (() => {
            const groups = new Map<string, Record<string, unknown>[]>();
            for (const m of matches) {
              const key = (m.batch_id as string) ?? 'unknown';
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key)!.push(m);
            }
            return Array.from(groups.entries()).map(([batchId, ms]) => {
              const batchName = (ms[0]?.batch_name as string) || `Batch ${batchId.slice(0, 8)}`;
              return (
                <div key={batchId} className="batch-group">
                  <h3>
                    {batchName} <span className="muted-count">({ms.length})</span>
                  </h3>
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
                      {ms.map((m) => {
                        const id = m.id as string;
                        const status = String(m.status ?? '');
                        const p1 = m.player1_id as string | null;
                        const p2 = m.player2_id as string | null;
                        const p1Name = String(m.player1_name ?? 'TBD');
                        const p2Name = String(m.player2_name ?? 'TBD');
                        const winnerName = (m.winner_name as string | null) ?? null;
                        const loserName =
                          winnerName && p1 && p2
                            ? (m.winner_id === p1 ? p2Name : p1Name)
                            : null;
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
                </div>
              );
            });
          })()
        )}
        {!canManageMatches && matches.length > 0 && (
          <p className="text-muted">Match actions need the manage_matches permission — ask an admin.</p>
        )}
      </div>

      <div className="card">
        <h2>Certificates ({certs.length})</h2>
        {canIssueCerts ? (
          <CertIssueBlock
            matches={matches}
            onIssued={async () => {
              const cRes = await secretaryApi.eventCertificates(event.event_id);
              if (cRes.success && cRes.data) setCerts(cRes.data);
            }}
            onError={setError}
          />
        ) : (
          <p className="text-muted">Certificate issuance needs the certificate_ops permission — ask an admin.</p>
        )}
        {certs.length === 0 ? (
          <p className="text-muted">No certificates issued for this event yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Position</th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody>
              {certs.map((c) => (
                <tr key={c.id as string}>
                  <td>{String(c.player_name ?? '—')}</td>
                  <td>{String(c.position ?? '—')}</td>
                  <td>{String(c.category_name ?? '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style jsx>{`
        .detail {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .detail h1 {
          font-size: 20px;
          font-weight: 800;
          margin: 0;
        }
        .card {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 14px;
          padding: 16px 18px;
        }
        .card h2 {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: #3a3d45;
          margin: 0 0 12px;
        }
        .filters {
          display: flex;
          gap: 6px;
          margin-bottom: 10px;
        }
        .filters button {
          border: 1px solid var(--color-line);
          border-radius: 999px;
          padding: 4px 12px;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-muted);
          background: transparent;
          cursor: pointer;
          text-transform: capitalize;
        }
        .filters button.on {
          background: var(--color-ink);
          color: #fff;
          border-color: var(--color-ink);
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
        }
        .data-table th {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: var(--color-muted);
          text-align: left;
          padding: 6px 8px;
          border-bottom: 1.5px solid var(--color-line);
        }
        .data-table td {
          padding: 9px 8px;
          border-bottom: 1px solid var(--color-line);
          color: var(--color-ink);
        }
        .data-table tbody tr:last-child td {
          border-bottom: none;
        }
        .status {
          display: inline-block;
          border-radius: 999px;
          padding: 2px 10px;
          font-size: 12px;
          font-weight: 700;
        }
        .status-pending {
          background: #fef3c7;
          color: #92400e;
        }
        .status-approved,
        .status-overridden {
          background: #dcfce7;
          color: #166534;
        }
        .status-rejected {
          background: #fee2e2;
          color: #991b1b;
        }
        .actions {
          display: flex;
          gap: 6px;
        }
        .actions button {
          border: 1px solid var(--color-line);
          border-radius: 8px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          background: var(--color-surface);
        }
        .actions button:disabled {
          opacity: 0.5;
        }
        .batch-create {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .batch-create input,
        .batch-create select {
          border: 1px solid var(--color-line);
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 13px;
          background: var(--color-surface);
          color: var(--color-ink);
        }
        .batch-create button {
          border: 1px solid var(--color-line);
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          background: var(--color-ink);
          color: #fff;
        }
        .batch-create button:disabled {
          opacity: 0.5;
        }
        .batch-group {
          margin-bottom: 14px;
        }
        .batch-group:last-child {
          margin-bottom: 0;
        }
        .batch-group h3 {
          font-size: 13px;
          font-weight: 800;
          margin: 0 0 8px;
          color: var(--color-ink);
        }
        .muted-count {
          color: var(--color-muted);
          font-weight: 600;
        }
        .versus {
          font-weight: 700;
        }
        .versus .vs {
          color: var(--color-muted);
          font-weight: 600;
          margin: 0 4px;
        }
        .winner {
          color: #166534;
        }
        .loser {
          color: var(--color-muted);
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}

function CertIssueBlock({
  matches,
  onIssued,
  onError,
}: {
  matches: Record<string, unknown>[];
  onIssued: () => void;
  onError: (msg: string | null) => void;
}) {
  const [batchId, setBatchId] = useState('');
  const [issuing, setIssuing] = useState(false);
  const batchIds = Array.from(new Set(matches.map((m) => m.batch_id as string).filter(Boolean)));
  const selected = batchIds.includes(batchId) ? batchId : '';
  if (batchIds.length === 0) return <p className="text-muted">No batches yet — create one above first.</p>;
  return (
    <div className="batch-create" style={{ marginBottom: 12 }}>
      <select value={selected} onChange={(e) => setBatchId(e.target.value)} aria-label="Batch">
        <option value="">Select batch</option>
        {batchIds.map((b) => (
          <option key={b} value={b}>
            Batch {b.slice(0, 8)}
          </option>
        ))}
      </select>
      <button
        disabled={issuing || !selected}
        onClick={async () => {
          setIssuing(true);
          const res = await secretaryApi.issueCertificates(selected);
          setIssuing(false);
          if (res.success) {
            onError(null);
            onIssued();
          } else {
            onError(res.message || 'Certificate issuance failed');
          }
        }}
      >
        {issuing ? 'Issuing…' : 'Issue certificates'}
      </button>
    </div>
  );
}
