'use client';

/**
 * Secretary Events section (both portals), wired to live endpoints and
 * styled in the approved dashboard/players design language: contextual
 * header with jurisdiction badge, KPI cards with icon tiles, per-event
 * rows with registration / batch / decided / pending counts. Read-only.
 */
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { secretaryApi, type SecretaryEvent, type SecretaryKind } from '@/lib/api/secretary.api';

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

function dateBlock(eventDate: string | null): { top: string; bottom: string } {
  if (!eventDate) return { top: '—', bottom: 'TBA' };
  const d = new Date(eventDate);
  if (Number.isNaN(d.getTime())) return { top: '—', bottom: 'TBA' };
  return {
    top: d.toLocaleString('en-US', { month: 'short' }),
    bottom: String(d.getFullYear()),
  };
}

export function SecretaryEventsSection({
  events,
  basePath,
  canMonitor,
  scopeLabel,
  kind,
}: {
  events: SecretaryEvent[];
  basePath: string;
  canMonitor: boolean;
  scopeLabel: string;
  kind: SecretaryKind;
}) {
  const [stats, setStats] = useState<Map<string, EventStats>>(new Map());
  const [dataError, setDataError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState<'all' | 'active' | 'review'>('all');

  const roleLabel = kind === 'district_secretary' ? 'District Secretary' : 'State Secretary';
  const accentVar =
    kind === 'district_secretary' ? 'var(--color-role-district-secretary)' : 'var(--color-role-state-secretary)';

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
        const regs = rRes.success && rRes.data ? rRes.data : [];
        const matches = (mRes.success && mRes.data ? mRes.data : []) as Record<string, unknown>[];
        const batches = new Set(matches.map((m) => m.batch_id as string)).size;
        const decided = matches.filter((m) => String(m.status) === 'completed').length;
        return [
          e.event_id,
          {
            regs: regs.length,
            pending: regs.filter((r) => r.status === 'pending').length,
            batches,
            decided,
            total: matches.length,
          },
        ] as const;
      }),
    )
      .then((rows) => {
        if (live) setStats(new Map(rows));
      })
      .catch((err: unknown) => {
        if (live) setDataError(err instanceof Error ? err.message : 'Failed to load event data');
      });
    return () => {
      live = false;
    };
  }, [canMonitor, eventIds]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (q && !e.event_name.toLowerCase().includes(q)) return false;
      const s = stats.get(e.event_id);
      if (chip === 'active' && e.status !== 'active') return false;
      if (chip === 'review' && (s ? s.pending === 0 : true)) return false;
      return true;
    });
  }, [events, query, chip, stats]);

  // Counts load per event; the map is filled for every event (even empty
  // ones) once the fetch completes, so an empty map means still loading.
  const countsLoading = canMonitor && events.length > 0 && stats.size === 0 && !dataError;

  const needReview = events.filter((e) => (stats.get(e.event_id)?.pending ?? 0) > 0).length;
  const fullyDecided = events.filter((e) => {
    const s = stats.get(e.event_id);
    return s && s.total > 0 && s.decided === s.total;
  }).length;

  return (
    <div className="events">
      <header className="head">
        <div>
          <span className="crumb">
            {roleLabel} · {scopeLabel}
          </span>
          <h1>Events</h1>
          <p>Events assigned to {scopeLabel} — track registrations, batches and decision progress.</p>
        </div>
        <span className="scope-pill">
          <span className="dot" />
          {scopeLabel}
        </span>
      </header>

      {!canMonitor ? (
        <div className="card">
          <p className="text-muted">Needs the manage_registrations permission — ask an admin.</p>
        </div>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi tint-violet">
              <div className="kpi-top">
                <span className="k-label">In scope</span>
                <span className="tile sm violet"><Icon name="trophy" /></span>
              </div>
              <strong className="k-value">{events.length}</strong>
              <span className="k-hint">Assigned to jurisdiction</span>
            </div>
            <div className={needReview > 0 ? 'kpi alert' : 'kpi'}>
              <div className="kpi-top">
                <span className="k-label">Need review</span>
                <span className="tile sm amber"><Icon name="clock" /></span>
              </div>
              <strong className={needReview > 0 ? 'k-value alert' : 'k-value'}>{needReview}</strong>
              <span className="k-hint">Pending approvals</span>
            </div>
            <div className="kpi tint-green">
              <div className="kpi-top">
                <span className="k-label">Fully decided</span>
                <span className="tile sm green"><Icon name="check" /></span>
              </div>
              <strong className="k-value">{fullyDecided}</strong>
              <span className="k-hint">Ready for certificates</span>
            </div>
          </div>

          <section className="card">
            <div className="card-head">
              <h2>
                All events <span className="count-badge">{visible.length} event{visible.length === 1 ? '' : 's'}</span>
              </h2>
            </div>
            <div className="search-row">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search events…"
                aria-label="Search events"
              />
              {(['all', 'active', 'review'] as const).map((c) => (
                <button key={c} onClick={() => setChip(c)} className={chip === c ? 'chip on' : 'chip'}>
                  {c === 'all' ? 'All' : c === 'active' ? 'Active' : 'Pending review'}
                </button>
              ))}
            </div>
            {dataError && <p className="text-error">{dataError}</p>}
            {visible.length === 0 ? (
              <p className="text-muted">
                {events.length === 0
                  ? 'No events assigned to this jurisdiction yet — an admin assigns event geography.'
                  : 'No events match this filter.'}
              </p>
            ) : (
              visible.map((e) => {
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
                      <strong>{e.event_name}</strong>
                      <span className="event-stats">
                        {s ? (
                          <>
                            <span><strong>{s.regs}</strong> reg{s.regs === 1 ? '' : 's'}</span>
                            <span className="sep">·</span>
                            <span><strong>{s.batches}</strong> {s.batches === 1 ? 'batch' : 'batches'}</span>
                            <span className="sep">·</span>
                            <span><strong>{s.decided}/{s.total}</strong> decided</span>
                          </>
                        ) : countsLoading ? (
                          <span>Loading counts…</span>
                        ) : (
                          <span>{e.status ?? ''}</span>
                        )}
                      </span>
                    </div>
                    {s &&
                      (pending > 0 ? (
                        <span className="pill warn">{pending} pending</span>
                      ) : (
                        <span className="pill ok">Clear</span>
                      ))}
                    <Link href={`${basePath}/events/${e.event_id}`} className="open-btn">
                      Open
                    </Link>
                  </div>
                );
              })
            )}
          </section>
        </>
      )}

      <style jsx>{`
        .events {
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
          grid-template-columns: repeat(3, 1fr);
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
        .card {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 14px;
          padding: 18px 20px;
          box-shadow: 0 1px 2px rgba(16, 20, 24, 0.05);
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
        .count-badge {
          font-size: 13px;
          font-weight: 700;
          color: #5b6470;
          background: #eef0f3;
          border-radius: 999px;
          padding: 3px 10px;
          vertical-align: 2px;
          margin-left: 6px;
        }
        .search-row {
          display: flex;
          gap: 6px;
          align-items: center;
          margin-bottom: 8px;
        }
        .search-row input {
          flex: 1;
          border: 1px solid var(--color-line);
          background: #f7f8fa;
          border-radius: 9px;
          padding: 8px 12px;
          font-size: 14.5px;
          font-family: inherit;
        }
        .chip {
          border: 1px solid var(--color-line);
          background: transparent;
          border-radius: 999px;
          padding: 6px 13px;
          font-size: 13px;
          font-weight: 600;
          color: var(--color-muted);
          white-space: nowrap;
          font-family: inherit;
          cursor: pointer;
        }
        .chip.on {
          background: var(--color-ink);
          color: #fff;
          border-color: var(--color-ink);
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
        .event-main > strong {
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
        .event-row :global(.open-btn) {
          display: inline-block;
          flex-shrink: 0;
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          background-color: #0091ea;
          background: var(--color-accent-blue);
          border: 1px solid var(--color-accent-blue);
          border-radius: 999px;
          padding: 7px 18px;
          white-space: nowrap;
          text-decoration: none;
          box-shadow: 0 1px 2px rgba(0, 145, 234, 0.4);
          transition: background 120ms ease, transform 80ms ease, box-shadow 120ms ease;
        }
        .event-row :global(.open-btn):hover {
          background: color-mix(in srgb, var(--color-accent-blue) 85%, #000);
          border-color: color-mix(in srgb, var(--color-accent-blue) 85%, #000);
          box-shadow: 0 2px 6px rgba(0, 145, 234, 0.45);
        }
        .event-row :global(.open-btn):active {
          transform: scale(0.96);
          box-shadow: 0 1px 2px rgba(0, 145, 234, 0.35);
        }
      `}</style>
    </div>
  );
}
