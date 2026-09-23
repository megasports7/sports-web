'use client';

/**
 * Secretary portal dashboard (both portals), wired to live endpoints and
 * styled to the approved design preview (/design-preview/district):
 * KPI stat cards, events-in-scope list with search, pending-approvals
 * table, recent results. Read-only overview -- actions live on the
 * split routes. Hub cards link to Players / Events / Profile.
 */
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { secretaryApi, type SecretaryRegistration } from '@/lib/api/secretary.api';
import { useSecretaryPortal } from '@/components/secretary/useSecretaryEvent';
import type { SecretaryKind } from '@/lib/api/secretary.api';

type Approval = SecretaryRegistration & { event_id: string; event_name: string };
type ResultRow = {
  id: string;
  match: string;
  meta: string;
  winner: string | null;
  status: string;
};

export function SecretaryOverview({ kind, basePath }: { kind: SecretaryKind; basePath: string }) {
  const { scope, perms, players, events, loading, error } = useSecretaryPortal(kind);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [matchTotals, setMatchTotals] = useState({ total: 0, decided: 0 });
  const [query, setQuery] = useState('');

  const canViewPlayers = perms.includes('view_players');
  const canMonitor = perms.includes('manage_registrations');

  const eventIds = events.map((e) => e.event_id).join(',');

  useEffect(() => {
    if (!canMonitor || events.length === 0) return;
    let live = true;
    Promise.all(
      events.map(async (e) => {
        const [rRes, mRes] = await Promise.all([
          secretaryApi.registrations(e.event_id),
          secretaryApi.eventMatches(e.event_id),
        ]);
        return { e, regs: rRes.success && rRes.data ? rRes.data : [], matches: mRes.success && mRes.data ? mRes.data : [] };
      }),
    ).then((perEvent) => {
      if (!live) return;
      const pending: Approval[] = [];
      const res: ResultRow[] = [];
      let total = 0;
      let decided = 0;
      for (const { e, regs, matches } of perEvent) {
        for (const r of regs) {
          if (r.status === 'pending') pending.push({ ...r, event_id: e.event_id, event_name: e.event_name });
        }
        total += matches.length;
        for (const m of matches as Record<string, unknown>[]) {
          if (String(m.status) === 'completed') decided += 1;
          res.push({
            id: m.id as string,
            match: `${String(m.player1_name ?? 'TBD')} vs ${String(m.player2_name ?? 'TBD')}`,
            meta: `${String(m.batch_name ?? 'Batch')} · R${String(m.round_number ?? '—')} · M${String(m.match_number ?? '—')} · ${e.event_name}`,
            winner: (m.winner_name as string | null) ?? null,
            status: String(m.status ?? ''),
          });
        }
      }
      setApprovals(pending.slice(0, 5));
      setResults(res.filter((r) => r.status === 'completed' || r.status === 'in_progress').slice(-5).reverse());
      setMatchTotals({ total, decided });
    });
    return () => {
      live = false;
    };
  }, [canMonitor, eventIds]);

  const visibleEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => e.event_name.toLowerCase().includes(q));
  }, [events, query]);

  if (loading)
    return <p className="text-muted">Loading {kind === 'district_secretary' ? 'district' : 'state'} dashboard…</p>;
  if (error && !scope) return <p className="text-error">{error}</p>;

  const complete = players.filter((p) => p.state && p.district).length;

  return (
    <div className="dash">
      <div className="head">
        <div>
          <h1>{kind === 'district_secretary' ? 'District' : 'State'} dashboard</h1>
          <p>
            {scope ? `Viewing ${scope.label} scope.` : ''} Supervisory overview — actions live on each section page.
          </p>
        </div>
        {scope && <span className="scope-pill">{scope.label}</span>}
      </div>
      {error && <p className="text-error">{error}</p>}

      <div className="stats">
        <div className="stat">
          <span className="s-label">Players</span>
          <strong className="s-value">{canViewPlayers ? players.length : '—'}</strong>
          <span className="s-hint">{canViewPlayers ? `${complete} location complete` : 'Needs view_players'}</span>
        </div>
        <div className="stat">
          <span className="s-label">Events in scope</span>
          <strong className="s-value">{canMonitor ? events.length : '—'}</strong>
          <span className="s-hint">{canMonitor ? 'Assigned to jurisdiction' : 'Needs manage_registrations'}</span>
        </div>
        <div className="stat">
          <span className="s-label">Pending approvals</span>
          <strong className={approvals.length > 0 ? 's-value alert' : 's-value'}>
            {canMonitor ? approvals.length : '—'}
          </strong>
          <span className="s-hint">{canMonitor ? 'Needs review' : 'Needs manage_registrations'}</span>
        </div>
        <div className="stat">
          <span className="s-label">Matches decided</span>
          <strong className="s-value">
            {canMonitor ? `${matchTotals.decided}/${matchTotals.total}` : '—'}
          </strong>
          <span className="s-hint">Across batches</span>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <div className="card-head">
            <h2>Events in scope</h2>
            <Link href={`${basePath}/events`}>View all →</Link>
          </div>
          {!canMonitor ? (
            <p className="text-muted">Needs the manage_registrations permission — ask an admin.</p>
          ) : (
            <>
              <div className="search-row">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search events…"
                  aria-label="Search events"
                />
              </div>
              {visibleEvents.length === 0 ? (
                <p className="text-muted">
                  {events.length === 0
                    ? 'No events assigned to this jurisdiction yet — an admin assigns event geography.'
                    : 'No events match this search.'}
                </p>
              ) : (
                visibleEvents.map((e) => (
                  <div key={e.event_id} className="event-row">
                    <span className="bar ok" />
                    <div className="event-main">
                      <Link href={`${basePath}/events/${e.event_id}`}>
                        <strong>{e.event_name}</strong>
                      </Link>
                      {e.status && e.status !== 'active' && <span className="pill">{e.status}</span>}
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Pending approvals</h2>
            <Link href={events[0] ? `${basePath}/events/${events[0].event_id}/registrations` : `${basePath}/events`}>
              Review →
            </Link>
          </div>
          {!canMonitor ? (
            <p className="text-muted">Needs the manage_registrations permission — ask an admin.</p>
          ) : approvals.length === 0 ? (
            <p className="text-muted">Nothing awaiting review.</p>
          ) : (
            <table className="data-table">
              <tbody>
                {approvals.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.player_name}</strong>
                      <span className="sub">{a.event_name}</span>
                    </td>
                    <td>
                      <span className="status status-pending">{a.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Recent results</h2>
          <Link href={`${basePath}/events`}>Open matches →</Link>
        </div>
        {!canMonitor ? (
          <p className="text-muted">Needs the manage_registrations permission — ask an admin.</p>
        ) : results.length === 0 ? (
          <p className="text-muted">No decided or live matches yet.</p>
        ) : (
          results.map((r) => (
            <div key={r.id} className="result-row">
              <div>
                <strong>{r.match}</strong>
                <span className="sub">{r.meta}</span>
              </div>
              {r.winner ? (
                <span className="winner-line">
                  Winner: <strong>{r.winner}</strong>
                </span>
              ) : (
                <span className="status status-in_progress">{r.status}</span>
              )}
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .dash {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .head h1 {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.3px;
          margin: 0;
        }
        .head p {
          margin: 4px 0 0;
          font-size: 13.5px;
          color: var(--color-muted);
        }
        .scope-pill {
          font-size: 12px;
          font-weight: 700;
          border-radius: 999px;
          padding: 4px 12px;
          background: color-mix(in srgb, var(--color-role-district-secretary) 12%, transparent);
          color: var(--color-role-district-secretary);
          white-space: nowrap;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 10px;
        }
        .stat {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 14px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .s-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: var(--color-muted);
        }
        .s-value {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .s-value.alert {
          color: var(--color-corner-red);
        }
        .s-hint {
          font-size: 12px;
          color: var(--color-muted);
        }
        .grid {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 900px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
        .card {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 14px;
          padding: 16px 18px;
        }
        .card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .card-head h2 {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: #3a3d45;
          margin: 0;
        }
        .card-head a {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--color-accent-blue);
          text-decoration: none;
        }
        .search-row input {
          width: 100%;
          border: 1px solid var(--color-line);
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 12.5px;
          font-family: inherit;
          margin-bottom: 10px;
        }
        .event-row {
          display: flex;
          gap: 10px;
          align-items: center;
          padding: 10px 4px;
          border-bottom: 1px solid var(--color-line);
        }
        .event-row:last-child {
          border-bottom: none;
        }
        .bar {
          width: 4px;
          align-self: stretch;
          border-radius: 4px;
          background: var(--color-accent-green);
        }
        .event-main {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .event-main a {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--color-ink);
          text-decoration: none;
        }
        .pill {
          font-size: 11px;
          font-weight: 700;
          border-radius: 999px;
          padding: 2px 10px;
          background: var(--color-line);
          color: var(--color-muted);
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .data-table td {
          padding: 8px;
          border-bottom: 1px solid var(--color-line);
          vertical-align: middle;
        }
        .data-table tbody tr:last-child td {
          border-bottom: none;
        }
        .sub {
          display: block;
          font-size: 11.5px;
          color: var(--color-muted);
          font-weight: 400;
        }
        .status {
          display: inline-block;
          border-radius: 999px;
          padding: 2px 10px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }
        .status-pending {
          background: #fef3c7;
          color: #92400e;
        }
        .status-in_progress {
          background: #e0f2fe;
          color: #075985;
        }
        .result-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 4px;
          border-bottom: 1px solid var(--color-line);
        }
        .result-row:last-child {
          border-bottom: none;
        }
        .result-row strong {
          font-size: 13.5px;
        }
        .winner-line {
          font-size: 12.5px;
          color: var(--color-muted);
          white-space: nowrap;
        }
        .winner-line strong {
          color: #166534;
        }
      `}</style>
    </div>
  );
}
