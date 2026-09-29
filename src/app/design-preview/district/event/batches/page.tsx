'use client';

/**
 * DESIGN PREVIEW ONLY — secretary event batches page v1. Frontend, mock
 * data shaped like the real BatchesSection rows (batch_id + batch_name +
 * per-match status, grouped from eventMatches). No API imports, no auth
 * reads, no backend wiring. Search/filter/create controls are visual only
 * until the approved design is connected to the existing section.
 *
 * Design decision (Mobbin review): structured full-width batch rows, not
 * a dense table and not fragmented cards. One Batch Component Design —
 * Identity → Category → Progress → Status → Action — coherent from 2 to
 * 50+ batches. Refs: Midday (avatar rows + Manage actions), Eventbrite
 * manage-event (stat tiles, deliberate empty state), Luma (tabs).
 *
 * Data honesty note: batches expose ONLY batch_id + batch_name (+ match
 * statuses). There are no separate sport/gender/age fields — category
 * identity lives in the organizer-given batch_name, shown verbatim.
 */
const ACCENT = 'var(--color-role-district-secretary)';

const NAV = [
  { label: 'Dashboard', active: false, icon: 'grid' },
  { label: 'Players', active: false, icon: 'users' },
  { label: 'Events', active: true, icon: 'trophy' },
  { label: 'Profile', active: false, icon: 'id' },
] as const;

const TABS = [
  { label: 'Overview', active: false },
  { label: 'Registrations', active: false },
  { label: 'Batches', active: true },
  { label: 'Certificates', active: false },
] as const;

const BATCHES = [
  { name: 'SILAT · Male · U-20 · Pool A', id: 'a1b2c3d4', total: 4, decided: 4, live: 0 },
  { name: 'SILAT · Male · U-20 · Pool B', id: 'e5f6a7b8', total: 4, decided: 3, live: 1 },
  { name: 'SILAT · Female · U-20', id: 'c9d0e1f2', total: 3, decided: 1, live: 1 },
  { name: 'KABADDI · Male · Open', id: 'a3b4c5d6', total: 2, decided: 1, live: 0 },
  { name: 'SILAT · Male · U-17', id: 'e7f8a9b0', total: 2, decided: 0, live: 0 },
  { name: 'KABADDI · Female · Open', id: 'c1d2e3f4', total: 0, decided: 0, live: 0 },
];

function batchStatus(b: { total: number; decided: number; live: number }): { text: string; tone: string } {
  if (b.total === 0) return { text: 'Not started', tone: 'mute' };
  if (b.live > 0) return { text: `${b.live} live`, tone: 'info' };
  if (b.decided === b.total) return { text: 'Completed', tone: 'ok' };
  return { text: 'In progress', tone: 'info' };
}

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
    case 'id':
      return (
        <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="11" r="2" /><path d="M5.5 16.5c.6-1.8 1.7-2.7 3-2.7s2.4.9 3 2.7" /><path d="M14 9.5h4.5" /><path d="M14 13h4.5" /></svg>
      );
    case 'check':
      return (
        <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12.2 2.4 2.4 4.6-5" /></svg>
      );
    case 'plus':
      return (
        <svg {...common}><path d="M12 5v14" /><path d="M5 12h14" /></svg>
      );
    default:
      return null;
  }
}

export default function EventBatchesPreview() {
  const total = BATCHES.reduce((n, b) => n + b.total, 0);
  const decided = BATCHES.reduce((n, b) => n + b.decided, 0);
  const live = BATCHES.reduce((n, b) => n + b.live, 0);
  const inProgress = BATCHES.filter((b) => b.total > 0 && b.decided < b.total).length;

  return (
    <div className="page">
      <aside className="side">
        <div className="brand">
          <span className="mark">
            <svg width="30" height="30" viewBox="0 0 22 22">
              <path d="M11 2a9 9 0 0 1 0 18 9 9 0 0 0 0-18Z" fill="var(--color-corner-red)" />
              <path d="M11 2a9 9 0 0 0 0 18 9 9 0 0 1 0-18Z" fill="var(--color-accent-green)" />
            </svg>
          </span>
          <span className="brand-text">
            <strong>MegaSportsX</strong>
            <span>District secretary</span>
          </span>
        </div>
        <nav>
          {NAV.map((n) => (
            <span key={n.label} className={n.active ? 'item on' : 'item'}>
              <Icon name={n.icon} />
              {n.label}
            </span>
          ))}
        </nav>
        <div className="juris">
          <span className="j-label">Jurisdiction</span>
          <strong>NTR district</strong>
          <span className="j-sub">Andhra Pradesh · supervisory</span>
        </div>
        <span className="preview-note">Design preview · mock data</span>
      </aside>

      <main className="main">
        <div className="crumbs">
          <span>Events</span>
          <span className="sep">/</span>
          <span>admin-dsc-event</span>
          <span className="sep">/</span>
          <strong>Batches</strong>
        </div>

        <header className="event-head">
          <span className="date-block">
            <strong>Apr</strong>
            <span>2026</span>
          </span>
          <div className="id-block">
            <div className="title-row">
              <h1>admin-dsc-event</h1>
              <span className="pill ok">active</span>
            </div>
            <p>NTR district · 12 registrations · 6 batches</p>
          </div>
        </header>

        <div className="tabs" role="tablist" aria-label="Event sections">
          {TABS.map((t) => (
            <span key={t.label} className={t.active ? 'tab on' : 'tab'}>
              {t.label}
            </span>
          ))}
        </div>

        <div className="strip">
          <div className="mini">
            <span className="m-label">Batches</span>
            <strong>6</strong>
          </div>
          <div className="mini">
            <span className="m-label">Matches</span>
            <strong>{total}</strong>
          </div>
          <div className="mini">
            <span className="m-label">Decided</span>
            <strong>{decided}</strong>
          </div>
          <div className="mini">
            <span className="m-label">Live</span>
            <strong className={live > 0 ? 'live-n' : ''}>{live}</strong>
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
              <span className="sec-stat">4 approved registrations available · ownership stays with the event organizer</span>
            </div>
          </div>
          <div className="create-row">
            <span className="fake-input">Batch name (e.g. SILAT · Male · U-20)</span>
            <span className="fake-input short">Single elimination</span>
            <span className="btn primary">Create batch from approved</span>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Batches <span className="count-badge">6 batches</span></h2>
          </div>
          <div className="search-row">
            <span className="search">Search batches…</span>
            <span className="chip on">All</span>
            <span className="chip">In progress</span>
            <span className="chip">Live</span>
            <span className="chip">Completed</span>
          </div>
          {BATCHES.map((b) => {
            const st = batchStatus(b);
            const pct = b.total > 0 ? Math.round((b.decided / b.total) * 100) : 0;
            return (
              <div key={b.id} className="batch-row">
                <span className={`rail ${st.tone === 'ok' ? 'ok' : st.tone === 'info' ? 'live' : 'idle'}`} />
                <span className="tile sm violet"><Icon name="trophy" /></span>
                <div className="b-id">
                  <strong>{b.name}</strong>
                  <span className="b-meta">
                    <span className="bid">Batch · {b.id}</span>
                    <span>{b.total === 0 ? 'No matches drawn yet' : `${b.total} match${b.total === 1 ? '' : 'es'}`}</span>
                  </span>
                </div>
                <div className="b-progress">
                  <span className="b-count">{b.decided} / {b.total} decided</span>
                  <span className="bar-track slim">
                    <span className="bar-fill" style={{ width: `${pct}%` }} />
                  </span>
                </div>
                <span className={`pill ${st.tone}`}>{st.text}</span>
                <span className="manage-btn">Manage batch →</span>
              </div>
            );
          })}
        </section>
      </main>

      <style jsx>{`
        .page {
          display: flex;
          min-height: 100vh;
          background: #e9ebef;
          color: var(--color-ink);
          font-family: inherit;
        }
        .side {
          width: 232px;
          flex-shrink: 0;
          background: #101418;
          color: #cfd4da;
          display: flex;
          flex-direction: column;
          gap: 18px;
          padding: 20px 14px;
          position: sticky;
          top: 0;
          height: 100vh;
        }
        .brand {
          display: flex;
          gap: 10px;
          align-items: center;
          padding: 2px 6px;
        }
        .mark {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .brand-text {
          display: flex;
          flex-direction: column;
          line-height: 1.25;
        }
        .brand-text strong {
          font-size: 14.5px;
          color: #fff;
        }
        .brand-text span {
          font-size: 11.5px;
          color: #8b939e;
        }
        nav {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .item {
          display: flex;
          gap: 10px;
          align-items: center;
          padding: 9px 12px;
          border-radius: 9px;
          font-size: 13.5px;
          font-weight: 600;
          color: #9aa2ad;
        }
        .item.on {
          background: color-mix(in srgb, ${ACCENT} 18%, transparent);
          color: #fff;
          box-shadow: inset 3px 0 0 ${ACCENT};
        }
        .juris {
          margin-top: auto;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .j-label {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          color: #8b939e;
        }
        .juris strong {
          font-size: 14px;
          color: #fff;
        }
        .j-sub {
          font-size: 11.5px;
          color: #8b939e;
        }
        .preview-note {
          font-size: 11px;
          color: #6b737e;
          padding: 0 6px;
        }
        .main {
          flex: 1;
          min-width: 0;
          padding: 26px 30px 40px;
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
          background: #fff;
          border: 1px solid #dbe0e6;
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
        .tabs {
          display: flex;
          gap: 4px;
          border-bottom: 1.5px solid #dbe0e6;
          overflow-x: auto;
        }
        .tab {
          padding: 10px 14px;
          font-size: 14px;
          font-weight: 600;
          color: var(--color-muted);
          border-bottom: 3px solid transparent;
          margin-bottom: -1.5px;
          white-space: nowrap;
        }
        .tab.on {
          color: ${ACCENT};
          font-weight: 800;
          border-bottom-color: ${ACCENT};
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
          background: #fff;
          border: 1px solid #dbe0e6;
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
          background: #fff;
          border: 1px solid #dbe0e6;
          border-radius: 14px;
          padding: 18px 20px;
          box-shadow: 0 1px 2px rgba(16, 20, 24, 0.05);
        }
        .create-top {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 12px;
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
        .fake-input {
          flex: 1;
          border: 1px solid #dbe0e6;
          background: #f7f8fa;
          border-radius: 9px;
          padding: 8px 12px;
          font-size: 13.5px;
          color: var(--color-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .fake-input.short {
          flex: 0 0 190px;
        }
        .btn {
          font-size: 13.5px;
          font-weight: 700;
          border-radius: 9px;
          padding: 8px 16px;
          white-space: nowrap;
        }
        .btn.primary {
          background: var(--color-accent-blue);
          color: #fff;
          box-shadow: 0 1px 2px rgba(0, 145, 234, 0.4);
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
        .search {
          flex: 1;
          border: 1px solid #e4e7ec;
          background: #f7f8fa;
          border-radius: 9px;
          padding: 8px 12px;
          font-size: 13.5px;
          color: var(--color-muted);
        }
        .chip {
          border: 1px solid #e4e7ec;
          border-radius: 999px;
          padding: 6px 13px;
          font-size: 13px;
          font-weight: 600;
          color: var(--color-muted);
          white-space: nowrap;
        }
        .chip.on {
          background: #101418;
          color: #fff;
          border-color: #101418;
        }
        .batch-row {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 12px 10px;
          margin: 0 -10px;
          border-radius: 12px;
          border-bottom: 1px solid #eef0f3;
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
          color: ${ACCENT};
          border: 1px solid color-mix(in srgb, ${ACCENT} 35%, transparent);
          background: color-mix(in srgb, ${ACCENT} 8%, transparent);
          border-radius: 999px;
          padding: 7px 16px;
          white-space: nowrap;
          transition: background 120ms ease, transform 80ms ease;
        }
        .manage-btn:hover {
          background: color-mix(in srgb, ${ACCENT} 16%, transparent);
        }
        .manage-btn:active {
          transform: scale(0.96);
        }
        @media (max-width: 860px) {
          .side {
            width: 64px;
            padding: 16px 10px;
          }
          .brand-text, .item {
            font-size: 0;
            gap: 0;
            justify-content: center;
          }
          .item {
            padding: 10px;
          }
          .juris, .preview-note, .brand-text {
            display: none;
          }
          .main {
            padding: 20px 16px 32px;
          }
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
          .fake-input.short {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}
