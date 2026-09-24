'use client';

/**
 * Event registrations workspace (both portals): approved design wired to
 * live endpoints. Rows are the event's real registrations
 * (secretaryApi.registrations, RLS event-scoped) enriched best-effort with
 * the roster join for email/phone/sport (same join the dashboard uses).
 * Review actions call the audited review_registration RPC (verify_players).
 * Export writes the COMPLETE event dataset via the shared xlsx pattern.
 *
 * Field mapping: name = player_name; email/phone/sport = roster join by
 * player_id ('--' when the roster read is unavailable); date = created_at;
 * status = status verbatim. No gender/age/category/NSRD columns exist on
 * this backend path -- they are omitted, not fabricated.
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { secretaryApi, type SecretaryEvent, type SecretaryKind, type SecretaryRegistration } from '@/lib/api/secretary.api';
import { EventNav, eventNavItems } from '@/components/secretary/EventNav';
import { downloadSecretaryEventRegistrationsWorkbook } from '@/lib/registrationExport';

const PAGE_SIZE = 8;

type Filter = 'all' | 'pending' | 'approved' | 'rejected';

function Icon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  switch (name) {
    case 'trophy':
      return (
        <svg {...common}><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 5H4.5a.5.5 0 0 0-.5.5C4 8 6 10 8.2 10" /><path d="M16 5h3.5a.5.5 0 0 1 .5.5C20 8 18 10 15.8 10" /><path d="M12 13v4" /><path d="M8.5 20.5h7" /><path d="M10 17h4" /></svg>
      );
    case 'x':
      return (
        <svg {...common}><path d="M6 6l12 12" /><path d="M18 6 6 18" /></svg>
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

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

type Enriched = SecretaryRegistration & { email: string; phone: string; sport: string | null };

export function RegistrationsSection({
  eventId,
  basePath,
  canReview,
  kind,
  event,
  scopeLabel,
}: {
  eventId: string;
  basePath: string;
  canReview: boolean;
  kind: SecretaryKind;
  event: SecretaryEvent;
  scopeLabel: string;
}) {
  const [regs, setRegs] = useState<SecretaryRegistration[]>([]);
  const [roster, setRoster] = useState(new Map<string, { email: string; phone: string; sport: string | null }>());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<'view' | 'confirm-reject' | 'override-reason'>('view');
  const [overrideReason, setOverrideReason] = useState('');
  const [exportState, setExportState] = useState<'idle' | 'preparing' | 'done' | 'error'>('idle');
  const [refreshKey, setRefreshKey] = useState(0);

  const accentVar =
    kind === 'district_secretary' ? 'var(--color-role-district-secretary)' : 'var(--color-role-state-secretary)';

  useEffect(() => {
    let live = true;
    Promise.all([secretaryApi.registrations(eventId), secretaryApi.roster()])
      .then(([rRes, pRes]) => {
        if (!live) return;
        if (rRes.success && rRes.data) {
          setRegs(rRes.data);
          setError(null);
        } else {
          setError(rRes.message || 'Could not load registrations');
        }
        if (pRes.success && pRes.data) {
          const m = new Map<string, { email: string; phone: string; sport: string | null }>();
          for (const p of pRes.data) {
            m.set(p.id, { email: p.email, phone: p.phone ?? '', sport: p.sport });
          }
          setRoster(m);
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!live) return;
        setError(err instanceof Error ? err.message : 'Could not load registrations');
        setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [eventId, refreshKey]);

  const enriched: Enriched[] = useMemo(
    () =>
      regs.map((r) => {
        const meta = roster.get(r.player_id);
        return {
          ...r,
          email: meta?.email ?? '',
          phone: meta?.phone ?? '',
          sport: meta?.sport ?? null,
        };
      }),
    [regs, roster],
  );

  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    for (const r of enriched) {
      if (r.status === 'pending') pending += 1;
      else if (r.status === 'approved') approved += 1;
      else if (r.status === 'rejected') rejected += 1;
    }
    return { total: enriched.length, pending, approved, rejected };
  }, [enriched]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enriched.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (q && !r.player_name.toLowerCase().includes(q) && !r.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [enriched, filter, query]);

  const visible = expanded ? filtered : filtered.slice(0, PAGE_SIZE);
  const selected = selectedId != null ? enriched.find((r) => r.id === selectedId) ?? null : null;

  async function decide(reg: Enriched, decision: 'approved' | 'rejected' | 'overridden', reason?: string) {
    setActing(reg.id);
    const res = await secretaryApi.reviewRegistration(reg.id, decision, reason);
    if (res.success) {
      const status = decision === 'overridden' ? 'overridden' : decision;
      setRegs((prev) => prev.map((r) => (r.id === reg.id ? { ...r, status } : r)));
      setError(null);
      setDrawerMode('view');
      setOverrideReason('');
    } else {
      setError(res.message || 'Review failed');
    }
    setActing(null);
  }

  function openReview(reg: Enriched) {
    setSelectedId(reg.id);
    setDrawerMode('view');
    setOverrideReason('');
  }

  async function handleExport() {
    setExportState('preparing');
    try {
      await downloadSecretaryEventRegistrationsWorkbook(
        event.event_name,
        enriched.map((r) => ({
          player_id: r.player_id,
          player_name: r.player_name,
          email: r.email,
          phone: r.phone,
          sport: r.sport ?? '',
          status: r.status,
          created_at: r.created_at,
        })),
      );
      setExportState('done');
    } catch {
      setExportState('error');
    }
  }

  function retry() {
    setError(null);
    setLoading(true);
    setRefreshKey((k) => k + 1);
  }

  const d = dateBlock(event.event_date);
  const status = (event.status ?? 'active').toLowerCase();
  const regsHref = `${basePath}/events/${eventId}/registrations`;

  if (loading) {
    return (
      <div className="regs">
        <div className="skel crumbs" />
        <div className="skel header" />
        <div className="skel tabs" />
        <div className="skel strip">
          <div className="skel mini" />
          <div className="skel mini" />
          <div className="skel mini" />
          <div className="skel mini" />
        </div>
        <div className="skel block tall" />
        <style jsx>{`
          .regs { display: flex; flex-direction: column; gap: 12px; }
          .skel { border-radius: 14px; background: #dfe3e8; }
          .skel.crumbs { height: 18px; width: 240px; border-radius: 6px; }
          .skel.header { height: 104px; }
          .skel.tabs { height: 42px; border-radius: 0; background: transparent; border-bottom: 1.5px solid var(--color-line); }
          .skel.strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: transparent; }
          .skel.mini { height: 64px; background: var(--color-surface); border: 1px solid var(--color-line); border-radius: 12px; }
          .skel.block.tall { height: 340px; background: var(--color-surface); border: 1px solid var(--color-line); }
          @media (max-width: 1100px) { .skel.strip { grid-template-columns: repeat(2, 1fr); } }
        `}</style>
      </div>
    );
  }

  const summary = [
    { label: 'Total', value: counts.total, tint: 'neutral' },
    { label: 'Pending', value: counts.pending, tint: 'amber' },
    { label: 'Approved', value: counts.approved, tint: 'green' },
    { label: 'Rejected', value: counts.rejected, tint: 'red' },
  ] as const;

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.total },
    { key: 'pending', label: 'Pending', count: counts.pending },
    { key: 'approved', label: 'Approved', count: counts.approved },
    { key: 'rejected', label: 'Rejected', count: counts.rejected },
  ];

  return (
    <div className="regs">
      <div className="crumbs">
        <Link href={`${basePath}/events`}>Events</Link>
        <span className="sep">/</span>
        <Link href={`${basePath}/events/${eventId}`}>{event.event_name}</Link>
        <span className="sep">/</span>
        <strong>Registrations</strong>
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
            {scopeLabel} · {counts.total} registration{counts.total === 1 ? '' : 's'}
          </p>
        </div>
      </header>

      <EventNav items={eventNavItems(basePath, eventId)} activeHref={regsHref} accentVar={accentVar} />

      <div className="strip">
        {summary.map((s) => (
          <div key={s.label} className={`mini tint-${s.tint}`}>
            <span className="m-label">{s.label}</span>
            <strong>{s.value}</strong>
          </div>
        ))}
      </div>

      <div className="work">
        <section className="card">
          <div className="card-head">
            <h2>
              Registrations <span className="count-badge">{counts.total} registration{counts.total === 1 ? '' : 's'}</span>
            </h2>
            <button className="link-btn" onClick={handleExport} disabled={exportState === 'preparing' || enriched.length === 0}>
              {exportState === 'preparing' ? 'Preparing export…' : 'Export registrations ↓'}
            </button>
          </div>
          {exportState === 'done' && <p className="export-ok">Registrations exported successfully.</p>}
          {exportState === 'error' && <p className="text-error">Could not export registrations. Please try again.</p>}
          {error && (
            <div className="error-row">
              <p className="text-error">{error}</p>
              <button className="btn ghost" onClick={retry}>
                Retry
              </button>
            </div>
          )}
          <div className="search-row">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setExpanded(false);
              }}
              placeholder="Search players…"
              aria-label="Search players"
            />
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setFilter(f.key);
                  setExpanded(false);
                }}
                className={filter === f.key ? 'chip on' : 'chip'}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
          {filtered.length === 0 ? (
            enriched.length === 0 ? (
              <div className="empty">
                <strong>No registrations yet</strong>
                <span>This event does not have any registrations yet.</span>
              </div>
            ) : (
              <div className="empty">
                <strong>No {filter === 'all' ? '' : `${filter} `}registrations match</strong>
                <span>Try another filter or clear your search.</span>
              </div>
            )
          ) : (
            <>
              <div className="table-head">
                <span>Player</span>
                <span>Sport</span>
                <span>Registered</span>
                <span>Status</span>
                <span className="th-action">Action</span>
              </div>
              {visible.map((r) => (
                <div key={r.id} className="reg-row">
                  <div className="p-id">
                    <span className="avatar">{initials(r.player_name)}</span>
                    <div className="p-id-text">
                      <strong>{r.player_name}</strong>
                      <span>{r.email || '—'}</span>
                    </div>
                  </div>
                  <span>{r.sport ? <span className="cat">{r.sport}</span> : <span className="dash">—</span>}</span>
                  <span className="r-date">{fmtDate(r.created_at)}</span>
                  <span>
                    <span className={`pill ${r.status === 'pending' ? 'warn' : r.status === 'approved' ? 'ok' : r.status === 'rejected' ? 'bad' : 'mute'}`}>
                      {r.status}
                    </span>
                  </span>
                  <span className="r-actions">
                    {r.status === 'pending' && canReview ? (
                      <>
                        <button className="btn solid" disabled={acting === r.id} onClick={() => decide(r, 'approved')}>
                          {acting === r.id ? '…' : 'Approve'}
                        </button>
                        <button className="btn ghost" disabled={acting === r.id} onClick={() => openReview(r)}>
                          Review →
                        </button>
                      </>
                    ) : r.status === 'pending' ? (
                      <button className="btn ghost" onClick={() => openReview(r)}>
                        Review →
                      </button>
                    ) : r.status === 'approved' ? (
                      <>
                        <span className="done ok">Approved ✓</span>
                        <button className="btn text" onClick={() => openReview(r)}>
                          Review →
                        </button>
                      </>
                    ) : r.status === 'rejected' ? (
                      <>
                        <span className="done bad">Rejected</span>
                        {canReview && (
                          <button className="btn ghost" disabled={acting === r.id} onClick={() => openReview(r)}>
                            Review →
                          </button>
                        )}
                      </>
                    ) : (
                      <button className="btn text" onClick={() => openReview(r)}>
                        Review →
                      </button>
                    )}
                  </span>
                </div>
              ))}
              {!expanded && filtered.length > PAGE_SIZE && (
                <button className="show-all" onClick={() => setExpanded(true)}>
                  Showing {PAGE_SIZE} of {filtered.length} — show all
                </button>
              )}
              {expanded && filtered.length > PAGE_SIZE && (
                <button className="show-all ghost" onClick={() => setExpanded(false)}>
                  Show less
                </button>
              )}
            </>
          )}
          {!canReview && (
            <p className="perm-note">Review actions need the verify_players permission — ask an admin.</p>
          )}
        </section>

        {selected && (
          <aside className="drawer" aria-label="Registration review">
            <div className="drawer-head">
              <h2>Review registration</h2>
              <button className="drawer-x" onClick={() => setSelectedId(null)} aria-label="Close review">
                <Icon name="x" />
              </button>
            </div>
            <div className="drawer-id">
              <span className="avatar lg">{initials(selected.player_name)}</span>
              <div>
                <strong>{selected.player_name}</strong>
                <span>{selected.email || '—'}</span>
              </div>
              <span className={`pill ${selected.status === 'pending' ? 'warn' : selected.status === 'approved' ? 'ok' : selected.status === 'rejected' ? 'bad' : 'mute'}`}>
                {selected.status}
              </span>
            </div>
            <dl className="drawer-fields">
              <div><dt>Sport</dt><dd>{selected.sport ?? '—'}</dd></div>
              <div><dt>Registered</dt><dd>{fmtDate(selected.created_at)}</dd></div>
              <div><dt>Event</dt><dd>{event.event_name}</dd></div>
              <div><dt>Jurisdiction</dt><dd>{scopeLabel || '—'}</dd></div>
            </dl>
            {drawerMode === 'confirm-reject' ? (
              <div className="confirm">
                <strong>Reject registration?</strong>
                <span>{selected.player_name} will be marked rejected for {event.event_name}.</span>
                <div className="drawer-actions">
                  <button className="btn ghost" disabled={acting === selected.id} onClick={() => setDrawerMode('view')}>
                    Cancel
                  </button>
                  <button className="btn danger" disabled={acting === selected.id} onClick={() => decide(selected, 'rejected')}>
                    {acting === selected.id ? '…' : 'Reject registration'}
                  </button>
                </div>
              </div>
            ) : drawerMode === 'override-reason' ? (
              <div className="confirm">
                <strong>Override registration</strong>
                <span>A reason is required and recorded in audit.</span>
                <input
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Override reason (required)"
                  aria-label="Override reason"
                />
                <div className="drawer-actions">
                  <button className="btn ghost" disabled={acting === selected.id} onClick={() => setDrawerMode('view')}>
                    Cancel
                  </button>
                  <button
                    className="btn solid"
                    disabled={acting === selected.id || !overrideReason.trim()}
                    onClick={() => decide(selected, 'overridden', overrideReason.trim())}
                  >
                    {acting === selected.id ? '…' : 'Confirm override'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="drawer-note">
                  {selected.status === 'pending'
                    ? 'Approving unlocks batch creation for this player. Rejection asks for confirmation.'
                    : selected.status === 'rejected'
                      ? 'This registration was rejected. It can be overridden with a recorded reason.'
                      : 'This registration is decided. Override remains available with a recorded reason.'}
                </p>
                {canReview ? (
                  <div className="drawer-actions">
                    {selected.status === 'pending' && (
                      <button className="btn solid" disabled={acting === selected.id} onClick={() => decide(selected, 'approved')}>
                        {acting === selected.id ? '…' : 'Approve'}
                      </button>
                    )}
                    {selected.status === 'pending' && (
                      <button className="btn danger" disabled={acting === selected.id} onClick={() => setDrawerMode('confirm-reject')}>
                        Reject…
                      </button>
                    )}
                    <button className="btn ghost" disabled={acting === selected.id} onClick={() => setDrawerMode('override-reason')}>
                      Override…
                    </button>
                  </div>
                ) : (
                  <p className="perm-note">Review actions need the verify_players permission — ask an admin.</p>
                )}
              </>
            )}
          </aside>
        )}
      </div>

      <style jsx>{`
        .regs {
          display: flex;
          flex-direction: column;
          gap: 12px;
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
          margin: 3px 0 0;
          font-size: 14px;
          color: var(--color-muted);
        }
        .strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        @media (max-width: 1100px) {
          .strip {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .mini {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 12px;
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          gap: 1px;
          box-shadow: 0 1px 2px rgba(16, 20, 24, 0.05);
        }
        .mini.tint-neutral { box-shadow: inset 0 3px 0 #5b6470, 0 1px 2px rgba(16, 20, 24, 0.05); }
        .mini.tint-amber { box-shadow: inset 0 3px 0 var(--color-status-pending), 0 1px 2px rgba(16, 20, 24, 0.05); }
        .mini.tint-green { box-shadow: inset 0 3px 0 #1c9a5b, 0 1px 2px rgba(16, 20, 24, 0.05); }
        .mini.tint-red { box-shadow: inset 0 3px 0 var(--color-corner-red), 0 1px 2px rgba(16, 20, 24, 0.05); }
        .m-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: var(--color-muted);
        }
        .mini strong {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.4px;
        }
        .work {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 12px;
          align-items: start;
        }
        @media (max-width: 1200px) {
          .work {
            grid-template-columns: 1fr;
          }
        }
        .card {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 14px;
          padding: 18px 20px;
          box-shadow: 0 1px 2px rgba(16, 20, 24, 0.05);
          min-width: 0;
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
        .link-btn {
          font-size: 13px;
          font-weight: 700;
          color: ${accentVar};
          border: 1px solid color-mix(in srgb, ${accentVar} 35%, transparent);
          background: color-mix(in srgb, ${accentVar} 8%, transparent);
          border-radius: 999px;
          padding: 6px 14px;
          white-space: nowrap;
          font-family: inherit;
          cursor: pointer;
        }
        .link-btn:disabled {
          opacity: 0.5;
          cursor: default;
        }
        .export-ok {
          margin: 0 0 8px;
          font-size: 13px;
          font-weight: 700;
          color: #146c40;
        }
        .error-row {
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .error-row p {
          margin: 0;
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
          font-size: 13.5px;
          font-family: inherit;
          min-width: 0;
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
        .table-head {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 0.9fr 1.6fr;
          gap: 10px;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: var(--color-muted);
          border-bottom: 1.5px solid var(--color-line);
        }
        .reg-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 0.9fr 1.6fr;
          gap: 10px;
          align-items: center;
          padding: 12px;
          border-bottom: 1px solid var(--color-line);
          border-radius: 10px;
        }
        .reg-row:last-of-type {
          border-bottom: none;
        }
        .reg-row:hover {
          background: #f7f8fa;
        }
        .p-id {
          display: flex;
          gap: 10px;
          align-items: center;
          min-width: 0;
        }
        .avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #e8effd;
          color: #2456c6;
          font-size: 13px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .avatar.lg {
          width: 52px;
          height: 52px;
          font-size: 17px;
        }
        .p-id-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .p-id-text strong {
          font-size: 14.5px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .p-id-text span {
          font-size: 12.5px;
          color: var(--color-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .cat {
          font-size: 11.5px;
          font-weight: 700;
          color: #5b6470;
          background: #f2f4f7;
          border-radius: 6px;
          padding: 3px 9px;
          white-space: nowrap;
        }
        .dash {
          color: #c9cfd7;
        }
        .r-date {
          font-size: 13.5px;
          white-space: nowrap;
        }
        .pill {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.3px;
          border-radius: 999px;
          padding: 4px 11px;
          white-space: nowrap;
        }
        .pill.ok { background: #e3f4e8; color: #146c40; }
        .pill.warn { background: #fdf1de; color: #92580a; }
        .pill.bad { background: #fee2e2; color: #991b1b; }
        .pill.mute { background: #eef0f3; color: #5b6470; }
        .r-actions {
          display: flex;
          gap: 6px;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
        }
        .btn {
          font-size: 12.5px;
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
        .btn.solid {
          background: var(--color-ink);
          color: #fff;
          border: 1px solid var(--color-ink);
        }
        .btn.ghost {
          border: 1px solid var(--color-line);
          background: transparent;
          color: var(--color-muted);
        }
        .btn.danger {
          border: 1px solid #f3b7b7;
          color: #991b1b;
          background: #fff5f5;
        }
        .btn.text {
          border: none;
          background: none;
          color: var(--color-accent-blue);
          padding: 6px 8px;
        }
        .done {
          font-size: 12.5px;
          font-weight: 700;
          white-space: nowrap;
        }
        .done.ok {
          color: #146c40;
        }
        .done.bad {
          color: #991b1b;
        }
        .show-all {
          display: block;
          width: 100%;
          margin-top: 10px;
          border: 1px solid var(--color-line);
          border-radius: 10px;
          padding: 8px;
          font-size: 13px;
          font-weight: 700;
          text-align: center;
          background: var(--color-surface);
          color: var(--color-ink);
          font-family: inherit;
          cursor: pointer;
        }
        .show-all.ghost {
          background: transparent;
          color: var(--color-muted);
        }
        .perm-note {
          margin: 10px 0 0;
          font-size: 13px;
          color: var(--color-muted);
        }
        .empty {
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: center;
          text-align: center;
          padding: 24px 12px;
        }
        .empty strong {
          font-size: 15.5px;
        }
        .empty span {
          font-size: 13.5px;
          color: var(--color-muted);
        }
        .drawer {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 14px;
          padding: 18px 20px;
          box-shadow: 0 4px 14px rgba(16, 20, 24, 0.1);
          position: sticky;
          top: 26px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .drawer-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .drawer-head h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
        }
        .drawer-x {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: none;
          background: #f2f4f7;
          color: #5b6470;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-family: inherit;
        }
        .drawer-id {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .drawer-id > div {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .drawer-id strong {
          font-size: 16px;
        }
        .drawer-id span {
          font-size: 13px;
          color: var(--color-muted);
        }
        .drawer-fields {
          margin: 0;
          border: 1px solid #eef0f3;
          border-radius: 10px;
          overflow: hidden;
        }
        .drawer-fields > div {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          padding: 9px 12px;
          border-bottom: 1px solid #eef0f3;
          font-size: 13.5px;
        }
        .drawer-fields > div:last-child {
          border-bottom: none;
        }
        .drawer-fields dt {
          color: var(--color-muted);
        }
        .drawer-fields dd {
          margin: 0;
          font-weight: 700;
          text-align: right;
        }
        .drawer-note {
          margin: 0;
          font-size: 13px;
          color: var(--color-muted);
        }
        .drawer-actions {
          display: flex;
          gap: 8px;
        }
        .drawer-actions .btn {
          flex: 1;
          text-align: center;
          padding: 9px 0;
        }
        .confirm {
          display: flex;
          flex-direction: column;
          gap: 8px;
          border: 1px solid var(--color-line);
          border-radius: 10px;
          padding: 12px;
        }
        .confirm strong {
          font-size: 14.5px;
        }
        .confirm span {
          font-size: 13px;
          color: var(--color-muted);
        }
        .confirm input {
          border: 1px solid var(--color-line);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13.5px;
          font-family: inherit;
        }
        .skel {
          border-radius: 14px;
          background: #dfe3e8;
        }
        .skel.crumbs { height: 18px; width: 240px; border-radius: 6px; }
        .skel.header { height: 104px; }
        .skel.tabs { height: 42px; border-radius: 0; background: transparent; border-bottom: 1.5px solid var(--color-line); }
        .skel.strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: transparent; }
        .skel.mini { height: 64px; background: var(--color-surface); border: 1px solid var(--color-line); border-radius: 12px; }
        .skel.block.tall { height: 340px; background: var(--color-surface); border: 1px solid var(--color-line); }
        @media (max-width: 1100px) { .skel.strip { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 860px) {
          .table-head {
            display: none;
          }
          .reg-row {
            grid-template-columns: 1fr;
            gap: 6px;
          }
          .r-actions {
            justify-content: flex-start;
          }
          .drawer {
            position: static;
          }
        }
      `}</style>
    </div>
  );
}
