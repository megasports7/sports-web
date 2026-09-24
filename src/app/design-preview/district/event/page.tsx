'use client';

/**
 * DESIGN PREVIEW ONLY — secretary event detail (overview hub) v1.
 * Frontend, mock data shaped like the real SecretaryEvent + per-event
 * stats. No API imports, no auth reads, no backend wiring. Tabs and
 * buttons are visual only until the approved design is connected to the
 * existing routes (overview / registrations / batches / certificates).
 *
 * Patterns adapted from Mobbin refs: Luma (breadcrumb + title + underline
 * tabs + status cards), Eventbrite manage-event (summary card, stat tiles,
 * quick actions, deliberate empty state), Klaviyo (underline active tab).
 */
const ACCENT = 'var(--color-role-district-secretary)';

const NAV = [
  { label: 'Dashboard', active: false, icon: 'grid' },
  { label: 'Players', active: false, icon: 'users' },
  { label: 'Events', active: true, icon: 'trophy' },
  { label: 'Profile', active: false, icon: 'id' },
] as const;

const TABS = [
  { label: 'Overview', active: true, count: null },
  { label: 'Registrations', active: false, count: '12' },
  { label: 'Batches', active: false, count: '6' },
  { label: 'Certificates', active: false, count: null },
] as const;

const SECTIONS = [
  {
    title: 'Registrations', icon: 'users', tint: 'blue',
    stat: '12 registered', state: '3 need review', stateTone: 'warn',
    desc: 'Approve, reject, or override player registrations.',
    action: 'Open registrations', locked: false,
  },
  {
    title: 'Batches', icon: 'grid', tint: 'violet',
    stat: '6 batches', state: '4 in progress', stateTone: 'info',
    desc: 'Create batches from approved registrations; open a batch for its matches.',
    action: 'Open batches', locked: false,
  },
  {
    title: 'Matches', icon: 'trophy', tint: 'green',
    stat: '9 / 15 decided', state: '2 live now', stateTone: 'info',
    desc: 'Start matches and declare winners, batch by batch.',
    action: 'Open matches', locked: false, bar: 60,
  },
  {
    title: 'Certificates', icon: 'award', tint: 'amber',
    stat: '2 batches ready', state: 'Needs certificate_ops', stateTone: 'lock',
    desc: 'Issue certificates for decided batches.',
    action: 'Open certificates', locked: true,
  },
];

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

export default function EventDetailPreview() {
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
          <strong>org3</strong>
        </div>

        <header className="event-head">
          <span className="date-block">
            <strong>Apr</strong>
            <span>2026</span>
          </span>
          <div className="id-block">
            <div className="title-row">
              <h1>org3</h1>
              <span className="pill ok">active</span>
            </div>
            <p>NTR district · 12 registrations · 6 batches · SILAT</p>
          </div>
          <div className="head-actions">
            <span className="btn primary">Open registrations</span>
            <span className="btn ghost">Back to events</span>
          </div>
        </header>

        <div className="tabs" role="tablist" aria-label="Event sections">
          {TABS.map((t) => (
            <span key={t.label} className={t.active ? 'tab on' : 'tab'}>
              {t.label}
              {t.count && <span className="tab-count">{t.count}</span>}
            </span>
          ))}
        </div>

        <section className="card progress">
          <div className="progress-top">
            <h2>Event progress</h2>
            <strong>9 / 15 matches decided</strong>
          </div>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: '60%' }} />
          </span>
          <p>2 matches live · 4 batches in progress · 3 registrations need review</p>
        </section>

        <section className="card attention">
          <span className="tile sm amber"><Icon name="users" /></span>
          <div className="attention-main">
            <strong>3 registrations need review</strong>
            <span>Oldest waiting since Apr 12 — approving unlocks batch creation.</span>
          </div>
          <span className="btn dark">Review now</span>
        </section>

        <div className="grid">
          {SECTIONS.map((s) => (
            <section key={s.title} className={s.locked ? 'card sec locked' : 'card sec'}>
              <div className="sec-top">
                <span className={`tile sm ${s.tint}`}><Icon name={s.icon} /></span>
                <div>
                  <h2>{s.title}</h2>
                  <span className="sec-stat">{s.stat}</span>
                </div>
              </div>
              <p>{s.desc}</p>
              {typeof s.bar === 'number' && (
                <span className="bar-track slim">
                  <span className="bar-fill" style={{ width: `${s.bar}%` }} />
                </span>
              )}
              <div className="sec-foot">
                <span className={`pill ${s.stateTone === 'warn' ? 'warn' : s.stateTone === 'info' ? 'info' : s.stateTone === 'lock' ? 'mute' : 'ok'}`}>
                  {s.state}
                </span>
                <span className={s.locked ? 'open-link muted' : 'open-link'}>
                  {s.action} <Icon name="arrow" />
                </span>
              </div>
            </section>
          ))}
        </div>
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
          gap: 14px;
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
        .btn.ghost {
          border: 1px solid #dbe0e6;
          color: var(--color-muted);
        }
        .btn.dark {
          background: #101418;
          color: #fff;
        }
        .tabs {
          display: flex;
          gap: 4px;
          border-bottom: 1.5px solid #dbe0e6;
          overflow-x: auto;
        }
        .tab {
          display: flex;
          gap: 7px;
          align-items: center;
          padding: 10px 14px;
          font-size: 14px;
          font-weight: 600;
          color: var(--color-muted);
          border-bottom: 3px solid transparent;
          margin-bottom: -1.5px;
          white-space: nowrap;
        }
        .tab:hover {
          color: var(--color-ink);
          background: rgba(255, 255, 255, 0.6);
        }
        .tab.on {
          color: ${ACCENT};
          font-weight: 800;
          border-bottom-color: ${ACCENT};
        }
        .tab-count {
          font-size: 12px;
          font-weight: 700;
          background: #eef0f3;
          color: #5b6470;
          border-radius: 999px;
          padding: 2px 9px;
        }
        .tab.on .tab-count {
          background: color-mix(in srgb, ${ACCENT} 12%, transparent);
          color: ${ACCENT};
        }
        .card {
          background: #fff;
          border: 1px solid #dbe0e6;
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
        .open-link {
          display: flex;
          gap: 6px;
          align-items: center;
          font-size: 13.5px;
          font-weight: 700;
          color: var(--color-accent-blue);
        }
        .open-link.muted {
          color: #9aa2ad;
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
          .event-head {
            flex-wrap: wrap;
          }
          .head-actions {
            width: 100%;
          }
          .head-actions .btn {
            flex: 1;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
