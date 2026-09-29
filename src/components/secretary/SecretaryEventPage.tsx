'use client';

/**
 * Event monitor page (both portals share this shape via per-role wrappers):
 * approved event-detail design wired to live endpoints. Header, progress,
 * attention banner, tabs and the four management sections all render the
 * real selected event's data (scope/permission loading from the shared
 * useSecretaryEvent hook; regs/matches/certs fan out below).
 */
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { basePathFor, useSecretaryEvent } from '@/components/secretary/useSecretaryEvent';
import { secretaryApi, type SecretaryKind } from '@/lib/api/secretary.api';
import { EventNav, eventNavItems } from '@/components/secretary/EventNav';

const ACCENT: Record<SecretaryKind, string> = {
  district_secretary: 'var(--color-role-district-secretary)',
  state_secretary: 'var(--color-role-state-secretary)',
};

type BatchInfo = { id: string; name: string; total: number; decided: number };

function Icon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  switch (name) {
    case 'grid':
      return (
        <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
      );
    case 'users':
      return (
        <svg {...common}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" /><circle cx="17" cy="9" r="2.6" /><path d="M16 15.2c2.6.3 4.6 1.9 5.3 4.3" /></svg>
      );
    case 'trophy':
      return (
        <svg {...common}><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 5H4.5a.5.5 0 0 0-.5.5C4 8 6 10 8.2 10" /><path d="M16 5h3.5a.5.5 0 0 1 .5.5C20 8 18 10 15.8 10" /><path d="M12 13v4" /><path d="M8.5 20.5h7" /><path d="M10 17h4" /></svg>
      );
    case 'award':
      return (
        <svg {...common}><circle cx="12" cy="9" r="5" /><path d="m8.5 13.5-2 7 5.5-3 5.5 3-2-7" /></svg>
      );
    case 'arrow':
      return (
        <svg {...common}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
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

export function useEventId(params: Promise<{ id: string }>): string {
  return use(params).id;
}

export function SecretaryEventPage({ kind, eventId }: { kind: SecretaryKind; eventId: string }) {
  const { scope, event, perms, loading, error } = useSecretaryEvent(kind, eventId);
  const [regs, setRegs] = useState<{ status: string }[]>([]);
  const [matches, setMatches] = useState<Record<string, unknown>[]>([]);
  const [certs, setCerts] = useState<Record<string, unknown>[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const base = basePathFor(kind);
  const accentVar = ACCENT[kind];
  const canReview = perms.includes('verify_players');
  const canManageBatches = perms.includes('manage_batches');
  const canManageMatches = perms.includes('manage_matches');
  const canIssueCerts = perms.includes('certificate_ops');

  useEffect(() => {
    if (!event) return;
    let live = true;
    Promise.all([
      secretaryApi.registrations(eventId),
      secretaryApi.eventMatches(eventId),
      secretaryApi.eventCertificates(eventId),
    ])
      .then(([rRes, mRes, cRes]) => {
        if (!live) return;
        setRegs(rRes.success && rRes.data ? rRes.data : []);
        setMatches((mRes.success && mRes.data ? mRes.data : []) as Record<string, unknown>[]);
        setCerts((cRes.success && cRes.data ? cRes.data : []) as Record<string, unknown>[]);
        setDataError(null);
        setDataLoading(false);
      })
      .catch((err: unknown) => {
        if (!live) return;
        setDataError(err instanceof Error ? err.message : 'Failed to load event data');
        setDataLoading(false);
      });
    return () => {
      live = false;
    };
  }, [event, eventId, refreshKey]);

  if (loading) {
    return (
      <div className="event-page">
        <div className="skel crumbs" />
        <div className="skel header" />
        <div className="skel tabs" />
        <div className="skel progress" />
        <div className="skel grid">
          <div className="skel sec" />
          <div className="skel sec" />
          <div className="skel sec" />
          <div className="skel sec" />
        </div>
        <style jsx>{`
          .event-page { display: flex; flex-direction: column; gap: 14px; }
          .skel { border-radius: 14px; background: #dfe3e8; }
          .skel.crumbs { height: 18px; width: 180px; border-radius: 6px; }
          .skel.header { height: 104px; }
          .skel.tabs { height: 42px; border-radius: 0; background: transparent; border-bottom: 1.5px solid var(--color-line); }
          .skel.progress { height: 120px; background: var(--color-surface); border: 1px solid var(--color-line); }
          .skel.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: transparent; }
          .skel.sec { height: 190px; background: var(--color-surface); border: 1px solid var(--color-line); }
          @media (max-width: 1000px) { .skel.grid { grid-template-columns: 1fr; } }
        `}</style>
      </div>
    );
  }
  if (!event) return <p className="text-error">{error ?? 'Event not in your scope.'}</p>;

  const pending = regs.filter((r) => r.status === 'pending').length;
  const decided = matches.filter((m) => String(m.status) === 'completed').length;
  const liveCount = matches.filter((m) => String(m.status) === 'in_progress').length;
  const total = matches.length;
  const batchMap = new Map<string, BatchInfo>();
  for (const m of matches) {
    const id = String(m.batch_id ?? 'unbatched');
    const b = batchMap.get(id) ?? { id, name: String(m.batch_name ?? 'Batch'), total: 0, decided: 0 };
    b.total += 1;
    if (String(m.status) === 'completed') b.decided += 1;
    batchMap.set(id, b);
  }
  const batches = [...batchMap.values()];
  const batchesInProgress = batches.filter((b) => b.decided < b.total).length;
  const certBatchIds = new Set(certs.map((c) => String(c.batch_id ?? '')));
  const decidedBatches = batches.filter((b) => b.total > 0 && b.decided === b.total);
  const readyBatches = decidedBatches.filter((b) => !certBatchIds.has(b.id)).length;
  const pct = total > 0 ? Math.round((decided / total) * 100) : 0;
  const d = dateBlock(event.event_date);
  const status = (event.status ?? 'active').toLowerCase();

  const summaryParts: string[] = [];
  if (liveCount > 0) summaryParts.push(`${liveCount} match${liveCount === 1 ? '' : 'es'} live`);
  if (batchesInProgress > 0)
    summaryParts.push(`${batchesInProgress} batch${batchesInProgress === 1 ? '' : 'es'} in progress`);
  if (pending > 0) summaryParts.push(`${pending} registration${pending === 1 ? '' : 's'} need review`);

  const nav = eventNavItems(base, eventId);
  const counts: Record<string, string> = {
    [`${base}/events/${eventId}/registrations`]: String(regs.length),
    [`${base}/events/${eventId}/batches`]: String(batches.length),
  };

  const sections = [
    {
      title: 'Registrations',
      href: `${base}/events/${eventId}/registrations`,
      icon: 'users',
      tint: 'blue',
      stat: regs.length === 0 ? 'No registrations yet' : `${regs.length} registered`,
      pill: pending > 0 ? { text: `${pending} need review`, tone: 'warn' } : regs.length > 0 ? { text: 'all reviewed', tone: 'ok' } : null,
      desc: 'Approve, reject, or override player registrations.',
      action: 'Open registrations',
      locked: !canReview,
      lockHint: 'Needs verify_players — ask an admin.',
      bar: null as number | null,
    },
    {
      title: 'Batches',
      href: `${base}/events/${eventId}/batches`,
      icon: 'grid',
      tint: 'violet',
      stat: batches.length === 0 ? 'No batches yet' : `${batches.length} batch${batches.length === 1 ? '' : 'es'}`,
      pill: batches.length === 0 ? null : batchesInProgress > 0 ? { text: `${batchesInProgress} in progress`, tone: 'info' } : { text: 'all decided', tone: 'ok' },
      desc: 'Create batches from approved registrations; open a batch for its matches.',
      action: 'Open batches',
      locked: !canManageBatches,
      lockHint: 'Needs manage_batches — ask an admin.',
      bar: null as number | null,
    },
    {
      title: 'Matches',
      href: `${base}/events/${eventId}/batches`,
      icon: 'trophy',
      tint: 'green',
      stat: total === 0 ? 'No matches yet' : `${decided} / ${total} decided`,
      pill: liveCount > 0 ? { text: `${liveCount} live now`, tone: 'info' } : null,
      desc: 'Start matches and declare winners, batch by batch.',
      action: 'Open matches',
      locked: !canManageMatches,
      lockHint: 'Needs manage_matches — ask an admin.',
      bar: total > 0 ? pct : null,
    },
    {
      title: 'Certificates',
      href: `${base}/events/${eventId}/certificates`,
      icon: 'award',
      tint: 'amber',
      stat: certs.length === 0 ? 'No certificates issued yet' : `${certs.length} issued`,
      pill: !canIssueCerts
        ? { text: 'Needs certificate_ops', tone: 'mute' }
        : readyBatches > 0
          ? { text: `${readyBatches} batch${readyBatches === 1 ? '' : 'es'} ready`, tone: 'info' }
          : null,
      desc: 'Issue certificates for decided batches.',
      action: 'Open certificates',
      locked: !canIssueCerts,
      lockHint: 'Needs certificate_ops — ask an admin.',
      bar: null as number | null,
    },
  ];

  return (
    <div className="event-page">
      <div className="crumbs">
        <Link href={`${base}/events`}>Events</Link>
        <span className="sep">/</span>
        <strong>{event.event_name}</strong>
      </div>

      <header className="event-head">
        <span className="date-block">
          <strong>{d.top}</strong>
          <span>{d.bottom}</span>
        </span>
        <div className="id-block">
          <div className="title-row">
            <h1>{event.event_name}</h1>
            <span className={status === 'active' || status === 'completed' ? 'pill ok' : 'pill mute'}>
              {event.status ?? 'active'}
            </span>
          </div>
          <p>
            {scope?.label ?? ''} · {regs.length} registration{regs.length === 1 ? '' : 's'} · {batches.length} batch
            {batches.length === 1 ? '' : 'es'}
          </p>
        </div>
        <div className="head-actions">
          <Link href={`${base}/events/${eventId}/registrations`} className="btn primary">
            Open registrations
          </Link>
          <Link href={`${base}/events`} className="btn ghost">
            Back to events
          </Link>
        </div>
      </header>

      <EventNav items={nav} activeHref={`${base}/events/${eventId}`} counts={counts} accentVar={accentVar} />

      {error && <p className="text-error">{error}</p>}

      {dataLoading ? (
        <>
          <div className="skel block" />
          <div className="skel grid">
            <div className="skel sec" />
            <div className="skel sec" />
            <div className="skel sec" />
            <div className="skel sec" />
          </div>
        </>
      ) : dataError ? (
        <section className="card">
          <p className="text-error">{dataError}</p>
          <button
            className="btn ghost"
            onClick={() => {
              setDataError(null);
              setDataLoading(true);
              setRefreshKey((k) => k + 1);
            }}
          >
            Retry
          </button>
        </section>
      ) : (
        <>
          <section className="card progress">
            <div className="progress-top">
              <h2>Event progress</h2>
              <strong>
                {decided} / {total} matches decided
              </strong>
            </div>
            <span className="bar-track">
              <span className="bar-fill" style={{ width: `${pct}%` }} />
            </span>
            <p>{summaryParts.length > 0 ? summaryParts.join(' · ') : 'No activity yet.'}</p>
          </section>

          {pending > 0 && canReview && (
            <section className="card attention">
              <span className="tile sm amber"><Icon name="users" /></span>
              <div className="attention-main">
                <strong>
                  {pending} registration{pending === 1 ? '' : 's'} need review
                </strong>
                <span>Approving unlocks batch creation.</span>
              </div>
              <Link href={`${base}/events/${eventId}/registrations`} className="btn dark">
                Review now
              </Link>
            </section>
          )}

          <div className="grid">
            {sections.map((s) => (
              <section key={s.title} className={s.locked ? 'card sec locked' : 'card sec'}>
                <div className="sec-top">
                  <span className={`tile sm ${s.tint}`}><Icon name={s.icon} /></span>
                  <div>
                    <h2>{s.title}</h2>
                    <span className="sec-stat">{s.stat}</span>
                  </div>
                </div>
                <p>
                  {s.desc}
                  {s.locked && (
                    <>
                      <br />
                      <span className="lock-hint">{s.lockHint}</span>
                    </>
                  )}
                </p>
                {s.bar != null && (
                  <span className="bar-track slim">
                    <span className="bar-fill" style={{ width: `${s.bar}%` }} />
                  </span>
                )}
                <div className="sec-foot">
                  {s.pill ? (
                    <span className={`pill ${s.pill.tone}`}>{s.pill.text}</span>
                  ) : (
                    <span />
                  )}
                  <Link href={s.href} className={s.locked ? 'open-link muted' : 'open-link'}>
                    {s.action} <Icon name="arrow" />
                  </Link>
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      <style jsx>{`
        .event-page {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .crumbs {
          display: flex;
          gap: 8px;
          align-items: center;
          font-size: 13px;
          color: var(--color-muted);
        }
        .crumbs a {
          color: var(--color-muted);
          text-decoration: none;
        }
        .crumbs strong {
          color: var(--color-ink);
        }
        .crumbs .sep {
          color: #c9cfd7;
        }
        .event-head {
          display: flex;
          gap: 14px;
          align-items: center;
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 14px;
          padding: 18px 20px;
          box-shadow: 0 1px 2px rgba(16, 20, 24, 0.05);
        }
        .date-block {
          width: 64px;
          flex-shrink: 0;
          background: #f2f4f7;
          border-radius: 10px;
          padding: 9px 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          line-height: 1.2;
        }
        .date-block strong {
          font-size: 15px;
          text-transform: uppercase;
        }
        .date-block span {
          font-size: 13px;
          color: var(--color-muted);
        }
        .id-block {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .title-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .title-row h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .id-block p {
          margin: 0;
          font-size: 14px;
          color: var(--color-muted);
        }
        .head-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        .event-page :global(.btn) {
          font-size: 13.5px;
          font-weight: 700;
          border-radius: 9px;
          padding: 8px 16px;
          white-space: nowrap;
          text-decoration: none;
          font-family: inherit;
          cursor: pointer;
          transition: transform 80ms ease, box-shadow 120ms ease;
        }
        .event-page :global(.btn):active {
          transform: scale(0.97);
        }
        .event-page :global(.btn.primary) {
          background: var(--color-accent-blue);
          color: #fff;
          box-shadow: 0 1px 2px rgba(0, 145, 234, 0.4);
        }
        .event-page :global(.btn.ghost) {
          border: 1px solid var(--color-line);
          background: var(--color-surface);
          color: var(--color-muted);
        }
        .event-page :global(.btn.dark) {
          background: var(--color-ink);
          color: #fff;
        }
        .card {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 14px;
          padding: 18px 20px;
          box-shadow: 0 1px 2px rgba(16, 20, 24, 0.05);
        }
        .progress-top {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .progress h2 {
          margin: 0;
          font-size: 15px;
          font-weight: 800;
        }
        .progress-top strong {
          font-size: 15px;
        }
        .bar-track {
          display: block;
          height: 7px;
          border-radius: 5px;
          background: #edf0f3;
          overflow: hidden;
        }
        .bar-track.slim {
          height: 5px;
          margin: 10px 0 2px;
        }
        .bar-fill {
          display: block;
          height: 100%;
          background: #177245;
          border-radius: 5px;
        }
        .progress p {
          margin: 8px 0 0;
          font-size: 13.5px;
          color: var(--color-muted);
        }
        .attention {
          display: flex;
          gap: 12px;
          align-items: center;
          box-shadow: inset 3px 0 0 var(--color-status-pending), 0 1px 2px rgba(16, 20, 24, 0.05);
        }
        .attention-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }
        .attention-main strong {
          font-size: 15px;
        }
        .attention-main span {
          font-size: 13.5px;
          color: var(--color-muted);
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
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 1000px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
        .sec {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .sec:hover {
          border-color: #c8cfd8;
        }
        .sec.locked {
          background: #fafbfc;
        }
        .sec-top {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .sec-top h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
        }
        .sec-stat {
          font-size: 13px;
          font-weight: 700;
          color: var(--color-muted);
        }
        .sec p {
          margin: 0;
          font-size: 14px;
          color: var(--color-muted);
        }
        .lock-hint {
          color: #b42318;
          font-weight: 700;
        }
        .sec-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 4px;
        }
        .pill {
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 0.3px;
          border-radius: 999px;
          padding: 4px 11px;
          white-space: nowrap;
        }
        .pill.ok { background: #e3f4e8; color: #146c40; }
        .pill.warn { background: #fdf1de; color: #92580a; }
        .pill.info { background: #e8effd; color: #2456c6; }
        .pill.mute { background: #eef0f3; color: #5b6470; }
        .sec-foot :global(.open-link) {
          display: inline-flex;
          gap: 6px;
          align-items: center;
          font-size: 12.5px;
          font-weight: 700;
          color: var(--color-accent-blue);
          background: color-mix(in srgb, var(--color-accent-blue) 8%, transparent);
          border: 1px solid color-mix(in srgb, var(--color-accent-blue) 35%, transparent);
          border-radius: 999px;
          padding: 5px 13px;
          white-space: nowrap;
          text-decoration: none;
          transition: background 120ms ease, transform 80ms ease;
        }
        .sec-foot :global(.open-link):hover {
          background: color-mix(in srgb, var(--color-accent-blue) 15%, transparent);
        }
        .sec-foot :global(.open-link):active {
          transform: scale(0.95);
        }
        .sec-foot :global(.open-link) svg {
          width: 14px;
          height: 14px;
        }
        .sec-foot :global(.open-link.muted) {
          color: #9aa2ad;
          background: transparent;
          border-color: var(--color-line);
        }
        .skel {
          border-radius: 14px;
          background: #dfe3e8;
        }
        .skel.crumbs { height: 18px; width: 180px; border-radius: 6px; }
        .skel.header { height: 104px; }
        .skel.tabs { height: 42px; border-radius: 0; background: transparent; border-bottom: 1.5px solid var(--color-line); }
        .skel.progress { height: 120px; background: var(--color-surface); border: 1px solid var(--color-line); }
        .skel.block { height: 120px; background: var(--color-surface); border: 1px solid var(--color-line); }
        .skel.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: transparent; }
        .skel.sec { height: 190px; background: var(--color-surface); border: 1px solid var(--color-line); }
        @media (max-width: 1000px) { .skel.grid { grid-template-columns: 1fr; } }
        @media (max-width: 860px) {
          .event-head {
            flex-wrap: wrap;
          }
          .head-actions {
            width: 100%;
          }
          .head-actions :global(.btn) {
            flex: 1;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
