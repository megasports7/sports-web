'use client';

/**
 * Event batches section (both portals): approved batch-workspace design
 * wired to live endpoints. Groups derive from eventMatches batch groups --
 * no batches-table read (secretaries hold no batches SELECT by design).
 * Each batch links to its manage page by its real backend batch_id.
 *
 * Field mapping (all that exists): batch title = matches.batch_name
 * verbatim (organizer-given; carries sport/gender/age only as naming
 * text -- there are NO separate sport/gender/age columns); secondary id
 * chip = matches.batch_id (short); side chip = matches.bracket_side ONLY
 * when the row carries a non-empty value.
 *
 * Batch status derivation (no batch status column exists -- derived from
 * match rows, documented here): total===0 -> Not started; live>0 -> live;
 * decided===total -> Completed; else In progress. Decided = status
 * 'completed' (winner recorded); live = status 'in_progress'.
 */
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { secretaryApi, type SecretaryEvent, type SecretaryKind, type SecretaryRegistration } from '@/lib/api/secretary.api';
import { EventNav, eventNavItems } from '@/components/secretary/EventNav';

type Chip = 'all' | 'progress' | 'live' | 'completed';

type BatchGroup = {
  id: string;
  name: string;
  side: string | null;
  total: number;
  decided: number;
  live: number;
};

function Icon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  switch (name) {
    case 'trophy':
      return (
        <svg {...common}><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 5H4.5a.5.5 0 0 0-.5.5C4 8 6 10 8.2 10" /><path d="M16 5h3.5a.5.5 0 0 1 .5.5C20 8 18 10 15.8 10" /><path d="M12 13v4" /><path d="M8.5 20.5h7" /><path d="M10 17h4" /></svg>
      );
    case 'plus':
      return (
        <svg {...common}><path d="M12 5v14" /><path d="M5 12h14" /></svg>
      );
    default:
      return null;
  }
}

function batchStatus(b: BatchGroup): { key: 'notstarted' | 'progress' | 'live' | 'completed'; text: string; tone: string } {
  if (b.total === 0) return { key: 'notstarted', text: 'Not started', tone: 'mute' };
  if (b.live > 0) return { key: 'live', text: `${b.live} live`, tone: 'info' };
  if (b.decided === b.total) return { key: 'completed', text: 'Completed', tone: 'ok' };
  return { key: 'progress', text: 'In progress', tone: 'info' };
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

export function BatchesSection({
  eventId,
  basePath,
  canManageBatches,
  kind,
  event,
  scopeLabel,
}: {
  eventId: string;
  basePath: string;
  canManageBatches: boolean;
  kind: SecretaryKind;
  event: SecretaryEvent;
  scopeLabel: string;
}) {
  const [regs, setRegs] = useState<SecretaryRegistration[]>([]);
  const [matches, setMatches] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [batchName, setBatchName] = useState('');
  const [batchFormat, setBatchFormat] = useState('single_elimination');
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState<Chip>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  const accentVar =
    kind === 'district_secretary' ? 'var(--color-role-district-secretary)' : 'var(--color-role-state-secretary)';

  useEffect(() => {
    let live = true;
    Promise.all([secretaryApi.registrations(eventId), secretaryApi.eventMatches(eventId)])
      .then(([rRes, mRes]) => {
        if (!live) return;
        if (rRes.success && rRes.data) setRegs(rRes.data);
        if (mRes.success && mRes.data) setMatches(mRes.data as Record<string, unknown>[]);
        if (!rRes.success) setError(rRes.message || 'Could not load registrations');
        else if (!mRes.success) setError(mRes.message || 'Could not load matches');
        else setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!live) return;
        setError(err instanceof Error ? err.message : 'Could not load batches');
        setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [eventId, refreshKey]);

  const groups = useMemo<BatchGroup[]>(() => {
    const map = new Map<string, BatchGroup>();
    for (const m of matches) {
      const id = String(m.batch_id ?? 'unknown');
      const g = map.get(id) ?? {
        id,
        name: String(m.batch_name ?? '') || `Batch ${id.slice(0, 8)}`,
        side: typeof m.bracket_side === 'string' && m.bracket_side.trim() !== '' ? m.bracket_side : null,
        total: 0,
        decided: 0,
        live: 0,
      };
      g.total += 1;
      const st = String(m.status ?? '');
      if (st === 'completed') g.decided += 1;
      if (st === 'in_progress') g.live += 1;
      map.set(id, g);
    }
    return [...map.values()];
  }, [matches]);

  const approvedCount = regs.filter((r) => r.status === 'approved').length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups.filter((g) => {
      if (q && !g.name.toLowerCase().includes(q) && !g.id.toLowerCase().includes(q)) return false;
      if (chip === 'all') return true;
      return batchStatus(g).key === chip;
    });
  }, [groups, query, chip]);

  const totalMatches = groups.reduce((n, g) => n + g.total, 0);
  const decidedMatches = groups.reduce((n, g) => n + g.decided, 0);
  const liveMatches = groups.reduce((n, g) => n + g.live, 0);
  const inProgress = groups.filter((g) => g.total > 0 && g.decided < g.total).length;

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
      event_id: eventId,
      batch_name: name,
      player_ids: playerIds,
      tournament_format: batchFormat,
    });
    setCreating(false);
    if (res.success) {
      setBatchName('');
      setError(null);
      setRefreshKey((k) => k + 1);
    } else {
      setError(res.message || 'Batch creation failed');
    }
  }

  function retry() {
    setError(null);
    setLoading(true);
    setRefreshKey((k) => k + 1);
  }

  const d = dateBlock(event.event_date);
  const status = (event.status ?? 'active').toLowerCase();
  const batchesHref = `${basePath}/events/${eventId}/batches`;

  if (loading) {
    return (
      <div className="batches">
        <div className="skel crumbs" />
        <div className="skel header" />
        <div className="skel tabs" />
        <div className="skel strip">
          <div className="skel mini" />
          <div className="skel mini" />
          <div className="skel mini" />
          <div className="skel mini" />
          <div className="skel mini" />
        </div>
        <div className="skel block" />
        <div className="skel block tall" />
        <style jsx>{`
          .batches { display: flex; flex-direction: column; gap: 12px; }
          .skel { border-radius: 14px; background: #dfe3e8; }
          .skel.crumbs { height: 18px; width: 220px; border-radius: 6px; }
          .skel.header { height: 104px; }
          .skel.tabs { height: 42px; border-radius: 0; background: transparent; border-bottom: 1.5px solid var(--color-line); }
          .skel.strip { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; background: transparent; }
          .skel.mini { height: 64px; background: var(--color-surface); border: 1px solid var(--color-line); border-radius: 12px; }
          .skel.block { height: 150px; background: var(--color-surface); border: 1px solid var(--color-line); }
          .skel.block.tall { height: 300px; }
          @media (max-width: 1100px) { .skel.strip { grid-template-columns: repeat(3, 1fr); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="batches">
      <div className="crumbs">
        <Link href={`${basePath}/events`}>Events</Link>
        <span className="sep">/</span>
        <Link href={`${basePath}/events/${eventId}`}>{event.event_name}</Link>
        <span className="sep">/</span>
        <strong>Batches</strong>
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
            {scopeLabel} · {regs.length} registration{regs.length === 1 ? '' : 's'} · {groups.length} batch
            {groups.length === 1 ? '' : 'es'}
          </p>
        </div>
      </header>

      <EventNav items={eventNavItems(basePath, eventId)} activeHref={batchesHref} accentVar={accentVar} />

      {error && (
        <section className="card error-card">
          <p className="text-error">{error}</p>
          <button className="btn ghost" onClick={retry}>
            Retry
          </button>
        </section>
      )}

      <div className="strip">
        <div className="mini">
          <span className="m-label">Batches</span>
          <strong>{groups.length}</strong>
        </div>
        <div className="mini">
          <span className="m-label">Matches</span>
          <strong>{totalMatches}</strong>
        </div>
        <div className="mini">
          <span className="m-label">Decided</span>
          <strong>{decidedMatches}</strong>
        </div>
        <div className="mini">
          <span className="m-label">Live</span>
          <strong className={liveMatches > 0 ? 'live-n' : ''}>{liveMatches}</strong>
        </div>
        <div className="mini">
          <span className="m-label">In progress</span>
          <strong>{inProgress}</strong>
        </div>
      </div>

      <section className="card create">
        <div className="create-top">
          <span className="tile sm violet"><Icon name="plus" /></span>
          <div>
            <h2>Create batch</h2>
            <span className="sec-stat">
              {approvedCount} approved registration{approvedCount === 1 ? '' : 's'} available · ownership stays with the
              event organizer
            </span>
          </div>
          <Link href={`${basePath}/events/${eventId}/batches/create`} className="full-setup">
            Full setup →
          </Link>
        </div>
        {!canManageBatches ? (
          <p className="locked-note">Batch creation needs the manage_batches permission — ask an admin.</p>
        ) : (
          <div className="create-row">
            <input
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="Batch name (e.g. SILAT · Male · U-20)"
              aria-label="Batch name"
            />
            <select value={batchFormat} onChange={(e) => setBatchFormat(e.target.value)} aria-label="Format">
              <option value="single_elimination">Single elimination</option>
              <option value="round_robin">Round robin</option>
              <option value="double_elimination">Double elimination</option>
            </select>
            <button className="btn primary" onClick={createBatch} disabled={creating}>
              {creating ? 'Creating…' : 'Create batch from approved'}
            </button>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>
            Batches <span className="count-badge">{filtered.length} batch{filtered.length === 1 ? '' : 'es'}</span>
          </h2>
        </div>
        <div className="search-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search batches…"
            aria-label="Search batches"
          />
          {(['all', 'progress', 'live', 'completed'] as const).map((c) => (
            <button key={c} onClick={() => setChip(c)} className={chip === c ? 'chip on' : 'chip'}>
              {c === 'all' ? 'All' : c === 'progress' ? 'In progress' : c === 'live' ? 'Live' : 'Completed'}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          groups.length === 0 ? (
            <div className="empty">
              <span className="tile sm violet"><Icon name="trophy" /></span>
              <strong>No batches created yet</strong>
              <span>Batches will appear here once the event is divided into its competition categories.</span>
              {!canManageBatches && (
                <span className="locked-note">Batch creation needs the manage_batches permission — ask an admin.</span>
              )}
            </div>
          ) : (
            <p className="text-muted">No batches match this search or filter.</p>
          )
        ) : (
          filtered.map((g) => {
            const st = batchStatus(g);
            const pct = g.total > 0 ? Math.round((g.decided / g.total) * 100) : 0;
            return (
              <div key={g.id} className="batch-row">
                <span className={`rail ${st.tone === 'ok' ? 'ok' : st.tone === 'info' ? 'live' : 'idle'}`} />
                <span className="tile sm violet"><Icon name="trophy" /></span>
                <div className="b-id">
                  <strong>{g.name}</strong>
                  <span className="b-meta">
                    <span className="bid">Batch · {g.id.slice(0, 8)}</span>
                    {g.side && <span className="cat">{g.side}</span>}
                    <span>
                      {g.total === 0 ? 'No matches drawn yet' : `${g.total} match${g.total === 1 ? '' : 'es'}`}
                    </span>
                  </span>
                </div>
                <div className="b-progress">
                  <span className="b-count">
                    {g.decided} / {g.total} decided
                  </span>
                  <span className="bar-track slim">
                    <span className="bar-fill" style={{ width: `${pct}%` }} />
                  </span>
                </div>
                <span className={`pill ${st.tone}`}>{st.text}</span>
                <Link href={`${basePath}/events/${eventId}/batches/${g.id}`} className="manage-btn">
                  Manage batch →
                </Link>
              </div>
            );
          })
        )}
      </section>

      <style jsx>{`
        .batches {
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
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
        }
        @media (max-width: 1100px) {
          .strip {
            grid-template-columns: repeat(3, 1fr);
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
        .live-n {
          color: #2456c6;
        }
        .card {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 14px;
          padding: 18px 20px;
          box-shadow: 0 1px 2px rgba(16, 20, 24, 0.05);
        }
        .error-card {
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
        }
        .error-card p {
          margin: 0;
        }
        .create-top {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 12px;
        }
        .create-top > div {
          flex: 1;
          min-width: 0;
        }
        .full-setup {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--color-accent-blue);
          text-decoration: none;
          white-space: nowrap;
        }
        .create-top h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
        }
        .sec-stat {
          font-size: 13px;
          color: var(--color-muted);
        }
        .create-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .create-row input {
          flex: 1;
          border: 1px solid var(--color-line);
          background: #f7f8fa;
          border-radius: 9px;
          padding: 8px 12px;
          font-size: 13.5px;
          font-family: inherit;
          min-width: 0;
        }
        .create-row select {
          flex: 0 0 190px;
          border: 1px solid var(--color-line);
          background: var(--color-surface);
          border-radius: 9px;
          padding: 8px 12px;
          font-size: 13.5px;
          font-family: inherit;
        }
        .btn {
          font-size: 13.5px;
          font-weight: 700;
          border-radius: 9px;
          padding: 8px 16px;
          white-space: nowrap;
          font-family: inherit;
          cursor: pointer;
        }
        .btn.primary {
          background: var(--color-accent-blue);
          color: #fff;
          border: 1px solid var(--color-accent-blue);
          box-shadow: 0 1px 2px rgba(0, 145, 234, 0.4);
        }
        .btn.primary:disabled {
          opacity: 0.6;
          cursor: wait;
        }
        .btn.ghost {
          border: 1px solid var(--color-line);
          background: var(--color-surface);
          color: var(--color-muted);
        }
        .locked-note {
          font-size: 13.5px;
          color: var(--color-muted);
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
        .batch-row {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 12px 10px;
          margin: 0 -10px;
          border-radius: 12px;
          border-bottom: 1px solid var(--color-line);
        }
        .batch-row:last-child {
          border-bottom: none;
        }
        .batch-row:hover {
          background: #f7f8fa;
        }
        .rail {
          width: 4px;
          align-self: stretch;
          border-radius: 4px;
          background: #c9cfd7;
        }
        .rail.ok { background: #1c9a5b; }
        .rail.live { background: #2456c6; }
        .rail.idle { background: #c9cfd7; }
        .tile {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .tile.sm {
          width: 38px;
          height: 38px;
          border-radius: 10px;
        }
        .tile.violet { background: #efe9fb; color: #6a3fb5; }
        .b-id {
          flex: 1.4;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .b-id strong {
          font-size: 16px;
          letter-spacing: -0.1px;
        }
        .b-meta {
          display: flex;
          gap: 8px;
          align-items: center;
          font-size: 13px;
          color: var(--color-muted);
          flex-wrap: wrap;
        }
        .bid {
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.3px;
          color: #9aa2ad;
          background: #f2f4f7;
          border-radius: 6px;
          padding: 2px 8px;
          white-space: nowrap;
          font-family: var(--font-mono);
        }
        .cat {
          font-size: 11.5px;
          font-weight: 700;
          color: #5b6470;
          background: #f2f4f7;
          border-radius: 6px;
          padding: 2px 8px;
          white-space: nowrap;
        }
        .b-progress {
          flex: 1;
          min-width: 120px;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .b-count {
          font-size: 13.5px;
          font-weight: 700;
        }
        .bar-track {
          display: block;
          height: 6px;
          border-radius: 4px;
          background: #edf0f3;
          overflow: hidden;
        }
        .bar-track.slim {
          height: 5px;
        }
        .bar-fill {
          display: block;
          height: 100%;
          background: #177245;
          border-radius: 4px;
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
        .pill.info { background: #e8effd; color: #2456c6; }
        .pill.mute { background: #eef0f3; color: #5b6470; }
        .manage-btn {
          font-size: 13.5px;
          font-weight: 700;
          color: ${accentVar};
          border: 1px solid color-mix(in srgb, ${accentVar} 35%, transparent);
          background: color-mix(in srgb, ${accentVar} 8%, transparent);
          border-radius: 999px;
          padding: 7px 16px;
          white-space: nowrap;
          text-decoration: none;
          transition: background 120ms ease, transform 80ms ease;
        }
        .manage-btn:hover {
          background: color-mix(in srgb, ${accentVar} 16%, transparent);
        }
        .manage-btn:active {
          transform: scale(0.96);
        }
        .empty {
          display: flex;
          flex-direction: column;
          gap: 6px;
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
        .skel {
          border-radius: 14px;
          background: #dfe3e8;
        }
        .skel.crumbs { height: 18px; width: 220px; border-radius: 6px; }
        .skel.header { height: 104px; }
        .skel.tabs { height: 42px; border-radius: 0; background: transparent; border-bottom: 1.5px solid var(--color-line); }
        .skel.strip { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; background: transparent; }
        .skel.mini { height: 64px; background: var(--color-surface); border: 1px solid var(--color-line); border-radius: 12px; }
        .skel.block { height: 150px; background: var(--color-surface); border: 1px solid var(--color-line); }
        .skel.block.tall { height: 300px; }
        @media (max-width: 1100px) { .skel.strip { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 860px) {
          .batch-row {
            flex-wrap: wrap;
          }
          .b-id {
            flex: 1 1 100%;
            order: 2;
          }
          .b-progress {
            flex: 1 1 100%;
            order: 3;
          }
          .create-row {
            flex-wrap: wrap;
          }
          .create-row select {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}
