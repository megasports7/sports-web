'use client';

/**
 * Secretary portal dashboard (both portals) — approved v2 design wired to
 * live endpoints. No mock data: jurisdiction, players, events, approvals
 * and results all come from secretaryApi (RLS-scoped). Approve/Reject goes
 * through review_registration (needs verify_players).
 */
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { secretaryApi, type SecretaryRegistration } from '@/lib/api/secretary.api';
import { useSecretaryPortal } from '@/components/secretary/useSecretaryEvent';
import type { SecretaryKind } from '@/lib/api/secretary.api';

type Approval = SecretaryRegistration & {
  event_id: string;
  event_name: string;
  email: string;
  sport: string | null;
};

type ResultRow = {
  id: string;
  match: string;
  meta: string;
  winner: string | null;
  live: boolean;
  event_id: string;
};

type EventStats = {
  regs: number;
  pending: number;
  batches: number;
  decided: number;
  total: number;
};

function Icon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  switch (name) {
    case 'users':
      return (
        <svg {...common}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" /><circle cx="17" cy="9" r="2.6" /><path d="M16 15.2c.6.3 4.6 1.9 5.3 4.3" /></svg>
      );
    case 'trophy':
      return (
        <svg {...common}><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 5H4.5a.5.5 0 0 0-.5.5C4 8 6 10 8.2 10" /><path d="M16 5h3.5a.5.5 0 0 1 .5.5C20 8 18 10 15.8 10" /><path d="M12 13v4" /><path d="M8.5 20.5h7" /><path d="M10 17h4" /></svg>
      );
    case 'clock':
      return (
        <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
      );
    case 'check':
      return (
        <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12.2 2.4 2.4 4.6-5" /></svg>
      );
    default:
      return null;
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function dateBlock(eventDate: string | null): { top: string; bottom: string } {
  if (!eventDate) return { top: '—', bottom: 'TBA' };
  const d = new Date(eventDate);
  if (Number.isNaN(d.getTime())) return { top: '—', bottom: 'TBA' };
  return {
    top: d.toLocaleString('en-US', { month: 'short' }),
    bottom: String(d.getFullYear()),
  };
}

export function SecretaryOverview({ kind, basePath }: { kind: SecretaryKind; basePath: string }) {
  const { scope, perms, players, events, loading, error } = useSecretaryPortal(kind);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [stats, setStats] = useState<Map<string, EventStats>>(new Map());
  const [matchTotals, setMatchTotals] = useState({ total: 0, decided: 0 });
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const canViewPlayers = perms.includes('view_players');
  const canMonitor = perms.includes('manage_registrations');
  const canVerify = perms.includes('verify_players');
  const roleLabel = kind === 'district_secretary' ? 'District Secretary' : 'State Secretary';
  const accentVar =
    kind === 'district_secretary' ? 'var(--color-role-district-secretary)' : 'var(--color-role-state-secretary)';

  const eventIds = events.map((e) => e.event_id).join(',');

  useEffect(() => {
    if (!canMonitor || events.length === 0) return;
    let live = true;
    const meta = new Map<string, { email: string; sport: string | null }>();
    for (const p of players) meta.set(p.id, { email: p.email, sport: p.sport });
    Promise.all(
      events.map(async (e) => {
        const [rRes, mRes] = await Promise.all([
          secretaryApi.registrations(e.event_id),
          secretaryApi.eventMatches(e.event_id),
        ]);
        return {
          e,
          regs: rRes.success && rRes.data ? rRes.data : [],
          matches: (mRes.success && mRes.data ? mRes.data : []) as Record<string, unknown>[],
        };
      }),
    )
      .then((perEvent) => {
        if (!live) return;
        const pending: Approval[] = [];
        const res: ResultRow[] = [];
        const statMap = new Map<string, EventStats>();
        let total = 0;
        let decided = 0;
        for (const { e, regs, matches } of perEvent) {
          const batches = new Set(matches.map((m) => m.batch_id as string)).size;
          let evDecided = 0;
          for (const r of regs) {
            if (r.status === 'pending') {
              const pm = meta.get(r.player_id);
              pending.push({
                ...r,
                event_id: e.event_id,
                event_name: e.event_name,
                email: pm?.email ?? '—',
                sport: pm?.sport ?? null,
              });
            }
          }
          for (const m of matches) {
            total += 1;
            const status = String(m.status ?? '');
            const isDecided = status === 'completed';
            if (isDecided) {
              decided += 1;
              evDecided += 1;
            }
            const liveMatch = status === 'in_progress';
            if (isDecided || liveMatch) {
              res.push({
                id: m.id as string,
                match: `${String(m.player1_name ?? 'TBD')} vs ${String(m.player2_name ?? 'TBD')}`,
                meta: `${String(m.batch_name ?? 'Batch')} · Round ${String(m.round_number ?? '—')} · Match ${String(m.match_number ?? '—')} · ${e.event_name}`,
                winner: (m.winner_name as string | null) ?? null,
                live: liveMatch,
                event_id: e.event_id,
              });
            }
          }
          statMap.set(e.event_id, {
            regs: regs.length,
            pending: regs.filter((r) => r.status === 'pending').length,
            batches,
            decided: evDecided,
            total: matches.length,
          });
        }
        pending.sort((a, b) => a.created_at.localeCompare(b.created_at));
        setApprovals(pending);
        setResults(res.slice(-5).reverse());
        setStats(statMap);
        setMatchTotals({ total, decided });
        setDataLoading(false);
      })
      .catch((err: unknown) => {
        if (!live) return;
        setDataError(err instanceof Error ? err.message : 'Failed to load dashboard data');
        setDataLoading(false);
      });
    return () => {
      live = false;
    };
  }, [canMonitor, eventIds, refreshKey]);

  async function decide(a: Approval, decision: 'approved' | 'rejected') {
    setBusyId(a.id);
    setActionError(null);
    const res = await secretaryApi.reviewRegistration(a.id, decision);
    setBusyId(null);
    if (!res.success) {
      setActionError(res.message || 'Could not update registration');
      return;
    }
    setDataLoading(true);
    setDataError(null);
    setRefreshKey((k) => k + 1);
  }

  const visibleEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => e.event_name.toLowerCase().includes(q));
  }, [events, query]);

  if (loading) return <p className="text-muted">Loading {roleLabel.toLowerCase()} dashboard…</p>;
  if (error && !scope) return <p className="text-error">{error}</p>;

  const complete = players.filter((p) => p.state && p.district).length;
  const decidedPct = matchTotals.total > 0 ? Math.round((matchTotals.decided / matchTotals.total) * 100) : 0;
  // First fetch in flight: per-event stats map is still empty (it is filled
  // for every event, even empty ones, once the fetch completes).
  const firstLoad = canMonitor && events.length > 0 && stats.size === 0 && !dataError;
  const listLoading = dataLoading || firstLoad;
  const reviewHref =
    approvals[0] != null
      ? `${basePath}/events/${approvals[0].event_id}/registrations`
      : `${basePath}/events`;

  return (
    <div className="dash">
      <header className="head">
        <div>
          <span className="crumb">
            {roleLabel} · {scope?.label ?? '…'}
          </span>
          <h1>{kind === 'district_secretary' ? 'District' : 'State'} dashboard</h1>
          <p>
            {scope ? `What is in ${scope.label} → events happening → what needs approval → results needing attention.` : 'Supervisory overview.'}
          </p>
        </div>
        {scope && (
          <span className="scope-pill">
            <span className="dot" />
            {scope.label}
          </span>
        )}
      </header>
      {error && <p className="text-error">{error}</p>}
      {dataError && <p className="text-error">{dataError}</p>}

      <div className="kpis">
        <div className="kpi tint-blue">
          <div className="kpi-top">
            <span className="k-label">Players in jurisdiction</span>
            <span className="tile sm blue"><Icon name="users" /></span>
          </div>
          <strong className="k-value">{canViewPlayers ? players.length : '—'}</strong>
          <span className="k-hint">{canViewPlayers ? `${complete} location complete` : 'Needs view_players'}</span>
        </div>
        <div className="kpi tint-violet">
          <div className="kpi-top">
            <span className="k-label">Events in scope</span>
            <span className="tile sm violet"><Icon name="trophy" /></span>
          </div>
          <strong className="k-value">{canMonitor ? events.length : '—'}</strong>
          <span className="k-hint">{canMonitor ? 'Assigned to jurisdiction' : 'Needs manage_registrations'}</span>
        </div>
        <div className={approvals.length > 0 ? 'kpi alert' : 'kpi'}>
          <div className="kpi-top">
            <span className="k-label">Pending approvals</span>
            <span className="tile sm amber"><Icon name="clock" /></span>
          </div>
          <strong className={approvals.length > 0 ? 'k-value alert' : 'k-value'}>
            {canMonitor ? approvals.length : '—'}
          </strong>
          <span className="k-hint">{canMonitor ? 'Needs review' : 'Needs manage_registrations'}</span>
        </div>
        <div className="kpi tint-green">
          <div className="kpi-top">
            <span className="k-label">Matches decided</span>
            <span className="tile sm green"><Icon name="check" /></span>
          </div>
          <strong className="k-value">{canMonitor ? `${matchTotals.decided} / ${matchTotals.total}` : '—'}</strong>
          <span className="k-hint">Across batches</span>
          {canMonitor && matchTotals.total > 0 && (
            <span className="bar-track">
              <span className="bar-fill" style={{ width: `${decidedPct}%` }} />
            </span>
          )}
        </div>
      </div>

      <div className="grid">
        <section className="card">
          <div className="card-head">
            <h2>Events in scope</h2>
            <Link href={`${basePath}/events`} className="link-btn">View all</Link>
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
                visibleEvents.map((e) => {
                  const s = stats.get(e.event_id);
                  const pending = s?.pending ?? 0;
                  const d = dateBlock(e.event_date);
                  return (
                    <div key={e.event_id} className="event-row">
                      <span className={pending > 0 ? 'rail warn' : 'rail ok'} />
                      <span className="date-block">
                        <strong>{d.top}</strong>
                        <span>{d.bottom}</span>
                      </span>
                      <div className="event-main">
                        <Link href={`${basePath}/events/${e.event_id}`}><strong>{e.event_name}</strong></Link>
                        <span className="event-stats">
                          {s ? (
                            <>
                              <span><strong>{s.regs}</strong> regs</span>
                              <span className="sep">·</span>
                              <span><strong>{s.batches}</strong> {s.batches === 1 ? 'batch' : 'batches'}</span>
                              <span className="sep">·</span>
                              <span><strong>{s.decided}/{s.total}</strong> decided</span>
                            </>
                          ) : (
                            <span>{dataLoading ? 'Loading…' : e.status ?? ''}</span>
                          )}
                        </span>
                      </div>
                      {s &&
                        (pending > 0 ? (
                          <span className="pill warn">{pending} pending</span>
                        ) : (
                          <span className="pill ok">{e.status ?? 'active'}</span>
                        ))}
                    </div>
                  );
                })
              )}
            </>
          )}
        </section>

        <section className="card action">
          <div className="card-head">
            <h2>
              Pending approvals {canMonitor && approvals.length > 0 && (
                <span className="count-badge">{approvals.length} waiting</span>
              )}
            </h2>
            <Link href={reviewHref} className="link-btn">Review all</Link>
          </div>
          {!canMonitor ? (
            <p className="text-muted">Needs the manage_registrations permission — ask an admin.</p>
          ) : listLoading && approvals.length === 0 ? (
            <p className="text-muted">Loading approvals…</p>
          ) : approvals.length === 0 ? (
            <p className="text-muted">Nothing awaiting review.</p>
          ) : (
            <>
              <div className="queue">
                {approvals.slice(0, 5).map((a, i) => (
                  <div key={a.id} className="approval-row">
                    <span className="queue-pos">#{i + 1}</span>
                    <span className="avatar ring">{initials(a.player_name)}</span>
                    <div className="approval-main">
                      <strong>{a.player_name}</strong>
                      <span>{a.email}</span>
                      <span className="cat">{[a.sport, a.event_name].filter(Boolean).join(' · ')}</span>
                    </div>
                    <div className="approval-side">
                      {canVerify ? (
                        <span className="actions">
                          <button
                            className="btn ghost"
                            disabled={busyId === a.id}
                            onClick={() => decide(a, 'rejected')}
                          >
                            {busyId === a.id ? '…' : 'Reject'}
                          </button>
                          <button
                            className="btn solid"
                            disabled={busyId === a.id}
                            onClick={() => decide(a, 'approved')}
                          >
                            {busyId === a.id ? '…' : 'Approve'}
                          </button>
                        </span>
                      ) : (
                        <span className="pill mute">needs verify_players</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="queue-foot">
                Oldest first{approvals.length > 5 ? ` · showing 5 of ${approvals.length}` : ' · approving writes to the live roster'}
              </p>
            </>
          )}
          {actionError && <p className="text-error">{actionError}</p>}
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Recent results</h2>
          <Link href={`${basePath}/events`} className="link-btn">Open matches</Link>
        </div>
        {!canMonitor ? (
          <p className="text-muted">Needs the manage_registrations permission — ask an admin.</p>
        ) : listLoading && results.length === 0 ? (
          <p className="text-muted">Loading results…</p>
        ) : results.length === 0 ? (
          <p className="text-muted">No decided or live matches yet.</p>
        ) : (
          results.map((r) => (
            <div key={r.id} className={r.winner ? 'result-row decided' : r.live ? 'result-row live' : 'result-row'}>
              <span className={r.live ? 'live-dot on' : r.winner ? 'live-dot done' : 'live-dot'} />
              <div className="result-main">
                <Link href={`${basePath}/events/${r.event_id}`}><strong>{r.match}</strong></Link>
                <span>{r.meta}</span>
              </div>
              {r.winner ? (
                <span className="winner">
                  <span className="trophy">✓</span> <strong>{r.winner}</strong>
                </span>
              ) : (
                <span className="pill info">● live</span>
              )}
            </div>
          ))
        )}
      </section>

      <style jsx>{`
        .dash {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--color-line);
          margin-bottom: 2px;
        }
        .crumb {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: ${accentVar};
        }
        .head h1 {
          margin: 4px 0 2px;
          font-size: 27px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .head p {
          margin: 0;
          font-size: 15px;
          color: var(--color-muted);
        }
        .scope-pill {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 14px;
          font-weight: 700;
          border-radius: 999px;
          padding: 7px 14px;
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          box-shadow: 0 1px 2px rgba(16, 20, 24, 0.06);
          white-space: nowrap;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${accentVar};
        }
        .kpis {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        @media (max-width: 1100px) {
          .kpis {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .kpi {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 14px;
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          box-shadow: 0 1px 2px rgba(16, 20, 24, 0.05);
        }
        .kpi.alert {
          box-shadow: inset 3px 0 0 var(--color-corner-red), 0 1px 2px rgba(16, 20, 24, 0.05);
        }
        .kpi.tint-blue { box-shadow: inset 0 3px 0 #2456c6, 0 1px 2px rgba(16, 20, 24, 0.05); }
        .kpi.tint-violet { box-shadow: inset 0 3px 0 #6a3fb5, 0 1px 2px rgba(16, 20, 24, 0.05); }
        .kpi.tint-green { box-shadow: inset 0 3px 0 #1c9a5b, 0 1px 2px rgba(16, 20, 24, 0.05); }
        .kpi-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 6px;
        }
        .tile {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .tile.sm {
          width: 36px;
          height: 36px;
          border-radius: 10px;
        }
        .tile.blue { background: #e8effd; color: #2456c6; }
        .tile.violet { background: #efe9fb; color: #6a3fb5; }
        .tile.amber { background: #fdf1de; color: #b26a00; }
        .tile.green { background: #e3f4e8; color: #177245; }
        .k-label {
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: var(--color-muted);
        }
        .k-value {
          font-size: 31px;
          font-weight: 800;
          letter-spacing: -0.6px;
          line-height: 1.15;
        }
        .k-value.alert {
          color: var(--color-corner-red);
        }
        .k-hint {
          font-size: 13.5px;
          color: var(--color-muted);
        }
        .bar-track {
          margin-top: 6px;
          height: 5px;
          border-radius: 4px;
          background: #edf0f3;
          overflow: hidden;
        }
        .bar-fill {
          display: block;
          height: 100%;
          background: #177245;
          border-radius: 4px;
        }
        .grid {
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: 12px;
        }
        @media (max-width: 1000px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
        .card {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 14px;
          padding: 18px 20px;
          box-shadow: 0 1px 2px rgba(16, 20, 24, 0.05);
        }
        .card.action {
          box-shadow: inset 0 3px 0 var(--color-status-pending), 0 1px 2px rgba(16, 20, 24, 0.05);
        }
        .card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .card-head h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: -0.1px;
        }
        .dash :global(.link-btn) {
          font-size: 14px;
          font-weight: 700;
          color: ${accentVar};
          border: 1px solid color-mix(in srgb, ${accentVar} 35%, transparent);
          background: color-mix(in srgb, ${accentVar} 8%, transparent);
          border-radius: 999px;
          padding: 5px 13px;
          white-space: nowrap;
          text-decoration: none;
        }
        .count-badge {
          font-size: 13px;
          font-weight: 700;
          color: #92580a;
          background: #fdf1de;
          border-radius: 999px;
          padding: 3px 10px;
          vertical-align: 2px;
          margin-left: 6px;
        }
        .search-row input {
          width: 100%;
          border: 1px solid var(--color-line);
          background: #f7f8fa;
          border-radius: 9px;
          padding: 8px 12px;
          font-size: 14.5px;
          font-family: inherit;
          margin-bottom: 8px;
        }
        .event-row {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 13px 10px;
          margin: 0 -10px;
          border-radius: 10px;
          border-bottom: 1px solid var(--color-line);
        }
        .event-row:last-child {
          border-bottom: none;
        }
        .event-row:hover {
          background: #f7f8fa;
        }
        .rail {
          width: 4px;
          align-self: stretch;
          border-radius: 4px;
        }
        .rail.warn { background: var(--color-status-pending); }
        .rail.ok { background: #1c9a5b; }
        .date-block {
          width: 62px;
          flex-shrink: 0;
          background: #f2f4f7;
          border-radius: 10px;
          padding: 7px 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          line-height: 1.2;
        }
        .date-block strong {
          font-size: 14.5px;
          text-transform: uppercase;
        }
        .date-block span {
          font-size: 13px;
          color: var(--color-muted);
        }
        .event-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .event-main a {
          text-decoration: none;
          color: inherit;
        }
        .event-main strong {
          font-size: 16px;
        }
        .event-stats {
          display: flex;
          gap: 6px;
          align-items: baseline;
          font-size: 14px;
          color: var(--color-muted);
        }
        .event-stats strong {
          font-size: 14.5px;
          color: var(--color-ink);
        }
        .event-stats .sep {
          color: #c9cfd7;
        }
        .pill {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.3px;
          border-radius: 999px;
          padding: 4px 11px;
          white-space: nowrap;
        }
        .pill.warn { background: #fdf1de; color: #92580a; }
        .pill.ok { background: #e3f4e8; color: #146c40; }
        .pill.info { background: #e8effd; color: #2456c6; }
        .pill.mute { background: #eef0f3; color: #5b6470; }
        .queue {
          display: flex;
          flex-direction: column;
          background: #f7f8fa;
          border: 1px solid #e8ebef;
          border-radius: 12px;
          padding: 4px 12px;
        }
        .approval-row {
          display: flex;
          gap: 10px;
          align-items: center;
          padding: 12px 10px;
          margin: 0 -10px;
          border-radius: 10px;
          border-bottom: 1px solid #e8ebef;
        }
        .approval-row:last-child {
          border-bottom: none;
        }
        .approval-row:hover {
          background: #fff;
        }
        .queue-pos {
          font-size: 12.5px;
          font-weight: 800;
          color: #9aa2ad;
          width: 28px;
          flex-shrink: 0;
          text-align: center;
        }
        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #e8effd;
          color: #2456c6;
          font-size: 14px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .avatar.ring {
          box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--color-status-pending);
        }
        .approval-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .approval-main strong {
          font-size: 15.5px;
        }
        .approval-main span {
          font-size: 13.5px;
          color: var(--color-muted);
        }
        .cat {
          display: inline-block;
          margin-top: 4px;
          font-size: 12.5px;
          font-weight: 700;
          color: #5b6470;
          background: #eef0f3;
          border-radius: 6px;
          padding: 2px 8px;
          width: fit-content;
        }
        .approval-side {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }
        .actions {
          display: flex;
          gap: 6px;
        }
        .btn {
          font-size: 13.5px;
          font-weight: 700;
          border-radius: 8px;
          padding: 6px 13px;
          white-space: nowrap;
          font-family: inherit;
          cursor: pointer;
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: wait;
        }
        .btn.ghost {
          border: 1px solid var(--color-line);
          background: transparent;
          color: var(--color-muted);
        }
        .btn.solid {
          background: var(--color-ink);
          color: #fff;
          border: 1px solid var(--color-ink);
        }
        .queue-foot {
          margin: 10px 0 0;
          font-size: 13px;
          color: var(--color-muted);
        }
        .result-row {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 13px 12px;
          margin: 0 -12px;
          border-radius: 12px;
          border-bottom: 1px solid var(--color-line);
        }
        .result-row:last-child {
          border-bottom: none;
        }
        .result-row.decided {
          background: #f2faf5;
          border-bottom-color: #e2f1e8;
        }
        .result-row.live {
          background: #f2f6fe;
          border-bottom-color: #e1eafb;
        }
        .live-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #c9cfd7;
          flex-shrink: 0;
        }
        .live-dot.done { background: #1c9a5b; }
        .live-dot.on { background: #2456c6; box-shadow: 0 0 0 4px #e8effd; }
        .result-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .result-main a {
          text-decoration: none;
          color: inherit;
        }
        .result-main strong {
          font-size: 15.5px;
        }
        .result-main span {
          font-size: 13.5px;
          color: var(--color-muted);
        }
        .winner {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 14.5px;
          white-space: nowrap;
        }
        .winner strong {
          color: #146c40;
        }
        .trophy {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #1c9a5b;
          color: #fff;
          font-size: 13px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
