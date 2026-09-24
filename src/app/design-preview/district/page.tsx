'use client';

/**
 * DESIGN PREVIEW ONLY — district secretary dashboard v2 (frontend, mock
 * data). No API imports, no auth reads, no backend wiring. Buttons and
 * links are visual only until the approved design is connected to the
 * real endpoints (SecretaryOverview keeps the same data shape).
 *
 * Patterns adapted from Mobbin refs: Eventbrite (icon rail + date-block
 * rows), Time2book (sidebar active pill + accent-bar cards), Shopify
 * (KPI strip, status pills), Calendly (approval queue).
 */
const ACCENT = 'var(--color-role-district-secretary)';

const NAV = [
  { label: 'Dashboard', active: true, icon: 'grid' },
  { label: 'Players', active: false, icon: 'users' },
  { label: 'Events', active: false, icon: 'trophy' },
  { label: 'Profile', active: false, icon: 'id' },
] as const;

const KPIS: { label: string; value: string; hint: string; icon: string; tint: string; alert?: boolean; bar?: number }[] = [
  { label: 'Players in jurisdiction', value: '6', hint: 'Across all sports', icon: 'users', tint: 'blue' },
  { label: 'Events in scope', value: '2', hint: 'Assigned to NTR', icon: 'trophy', tint: 'violet' },
  { label: 'Pending approvals', value: '3', hint: 'Needs review', icon: 'clock', tint: 'amber', alert: true },
  { label: 'Matches decided', value: '5 / 9', hint: 'Across 2 batches', icon: 'check', tint: 'green', bar: 56 },
];

const EVENTS = [
  { name: 'admin-dsc-event', date: 'Nov 2026', status: 'active', pending: 3, regs: 12, batches: 2, decided: '2/5' },
  { name: 'org3', date: 'Dec 2026', status: 'active', pending: 0, regs: 8, batches: 1, decided: '3/4' },
];

const APPROVALS = [
  { player: 'Demo Player 3', email: 'player3@test.com', cat: 'TANDING · 10–50 kg', initials: 'D3' },
  { player: 'Demo Player 4', email: 'player4@test.com', cat: 'TANDING · 10–50 kg', initials: 'D4' },
  { player: 'Demo Player 5', email: 'player5@test.com', cat: 'KYOKUSHIN · open', initials: 'D5' },
];

const RESULTS = [
  { match: 'Demo Player 1 vs Demo Player 3', meta: 'ram-se · Round 1 · Match 1', winner: 'Demo Player 1', live: false },
  { match: 'Demo Player 4 vs QA Player', meta: 'ram-se · Round 1 · Match 2', winner: null, live: true },
  { match: 'TBD vs TBD', meta: 'ram-se · Final', winner: null, live: false },
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

export default function DistrictDashboardPreviewV2() {
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
        <header className="head">
          <div>
            <span className="crumb">District Secretary · NTR</span>
            <h1>District dashboard</h1>
            <p>Events, approvals and results under NTR supervision.</p>
          </div>
          <span className="scope-pill">
            <span className="dot" />
            NTR district
          </span>
        </header>

        <div className="kpis">
          {KPIS.map((k) => (
            <div key={k.label} className={k.alert ? 'kpi alert' : `kpi tint-${k.tint}`}>
              <div className="kpi-top">
                <span className="k-label">{k.label}</span>
                <span className={`tile sm ${k.tint}`}>
                  <Icon name={k.icon} />
                </span>
              </div>
              <strong className={k.alert ? 'k-value alert' : 'k-value'}>{k.value}</strong>
              <span className="k-hint">{k.hint}</span>
              {typeof k.bar === 'number' && (
                <span className="bar-track">
                  <span className="bar-fill" style={{ width: `${k.bar}%` }} />
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="grid">
          <section className="card">
            <div className="card-head">
              <h2>Events in scope</h2>
              <span className="link-btn">View all</span>
            </div>
            <div className="search-row">
              <span className="search">Search events…</span>
              <span className="chip on">All</span>
              <span className="chip">Active</span>
              <span className="chip">Pending review</span>
            </div>
            {EVENTS.map((e) => (
              <div key={e.name} className="event-row">
                <span className={`rail ${e.pending > 0 ? 'warn' : 'ok'}`} />
                <span className="date-block">
                  <strong>{e.date.split(' ')[0]}</strong>
                  <span>{e.date.split(' ')[1]}</span>
                </span>
                <div className="event-main">
                  <strong>{e.name}</strong>
                  <span className="event-stats">
                    <span><strong>{e.regs}</strong> regs</span>
                    <span className="sep">·</span>
                    <span><strong>{e.batches}</strong> {e.batches === 1 ? 'batch' : 'batches'}</span>
                    <span className="sep">·</span>
                    <span><strong>{e.decided}</strong> decided</span>
                  </span>
                </div>
                {e.pending > 0 ? (
                  <span className="pill warn">{e.pending} pending</span>
                ) : (
                  <span className="pill ok">{e.status}</span>
                )}
                <span className="chev">→</span>
              </div>
            ))}
          </section>

          <section className="card action">
            <div className="card-head">
              <h2>
                Pending approvals <span className="count-badge">{APPROVALS.length} waiting</span>
              </h2>
              <span className="link-btn">Review all</span>
            </div>
            <div className="queue">
              {APPROVALS.map((a, i) => (
                <div key={a.email} className="approval-row">
                  <span className="queue-pos">#{i + 1}</span>
                  <span className="avatar ring">{a.initials}</span>
                  <div className="approval-main">
                    <strong>{a.player}</strong>
                    <span>{a.email}</span>
                    <span className="cat">{a.cat}</span>
                  </div>
                  <div className="approval-side">
                    <span className="actions">
                      <span className="btn ghost">Reject</span>
                      <span className="btn solid">Approve</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="queue-foot">Oldest first · approving writes to the live roster</p>
          </section>
        </div>

        <section className="card">
          <div className="card-head">
              <h2>Recent results</h2>
              <span className="link-btn">Open matches</span>
          </div>
          {RESULTS.map((r) => (
            <div key={r.match} className={r.winner ? 'result-row decided' : r.live ? 'result-row live' : 'result-row'}>
              <span className={r.live ? 'live-dot on' : r.winner ? 'live-dot done' : 'live-dot'} />
              <div className="result-main">
                <strong>{r.match}</strong>
                <span>{r.meta}</span>
              </div>
              {r.winner ? (
                <span className="winner">
                  <span className="trophy">✓</span> <strong>{r.winner}</strong>
                </span>
              ) : r.live ? (
                <span className="pill info">● live</span>
              ) : (
                <span className="pill mute">○ scheduled</span>
              )}
            </div>
          ))}
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
          gap: 16px;
        }
        .head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 14px;
          border-bottom: 1px solid #e4e7ec;
          margin-bottom: 2px;
        }
        .crumb {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: ${ACCENT};
        }
        .head h1 {
          margin: 4px 0 2px;
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .head p {
          margin: 0;
          font-size: 14px;
          color: var(--color-muted);
        }
        .scope-pill {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          font-weight: 700;
          border-radius: 999px;
          padding: 7px 14px;
          background: #fff;
          border: 1px solid var(--color-line);
          box-shadow: 0 1px 2px rgba(16, 20, 24, 0.06);
          white-space: nowrap;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${ACCENT};
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
          background: #fff;
          border: 1px solid #e4e7ec;
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
          width: 40px;
          height: 40px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .tile.sm {
          width: 34px;
          height: 34px;
          border-radius: 10px;
        }
        .tile.blue { background: #e8effd; color: #2456c6; }
        .tile.violet { background: #efe9fb; color: #6a3fb5; }
        .tile.amber { background: #fdf1de; color: #b26a00; }
        .tile.green { background: #e3f4e8; color: #177245; }
        .kpi-body {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }
        .k-label {
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: var(--color-muted);
        }
        .k-value {
          font-size: 30px;
          font-weight: 800;
          letter-spacing: -0.6px;
          line-height: 1.15;
        }
        .k-value.alert {
          color: var(--color-corner-red);
        }
        .k-hint {
          font-size: 12.5px;
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
          background: #fff;
          border: 1px solid #dbe0e6;
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
          font-size: 15px;
          font-weight: 800;
          letter-spacing: -0.1px;
        }
        .link {
          font-size: 13px;
          font-weight: 700;
          color: ${ACCENT};
        }
        .link-btn {
          font-size: 13px;
          font-weight: 700;
          color: ${ACCENT};
          border: 1px solid color-mix(in srgb, ${ACCENT} 35%, transparent);
          background: color-mix(in srgb, ${ACCENT} 8%, transparent);
          border-radius: 999px;
          padding: 5px 13px;
          white-space: nowrap;
        }
        .count-badge {
          font-size: 12px;
          font-weight: 700;
          color: #92580a;
          background: #fdf1de;
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
        .event-row {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 13px 10px;
          margin: 0 -10px;
          border-radius: 10px;
          border-bottom: 1px solid #eef0f3;
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
          width: 58px;
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
          font-size: 13.5px;
          text-transform: uppercase;
        }
        .date-block span {
          font-size: 12px;
          color: var(--color-muted);
        }
        .event-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .event-main strong {
          font-size: 15px;
        }
        .event-stats {
          display: flex;
          gap: 6px;
          align-items: baseline;
          font-size: 13px;
          color: var(--color-muted);
        }
        .event-stats strong {
          font-size: 13.5px;
          color: var(--color-ink);
        }
        .event-stats .sep {
          color: #c9cfd7;
        }
        .pill {
          font-size: 12px;
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
        .chev {
          color: #b6bcc5;
          font-size: 15px;
          font-weight: 700;
        }
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
          font-size: 11.5px;
          font-weight: 800;
          color: #9aa2ad;
          width: 26px;
          flex-shrink: 0;
          text-align: center;
        }
        .avatar.ring {
          box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--color-status-pending);
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
        .approval-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .approval-main strong {
          font-size: 14.5px;
        }
        .approval-main span {
          font-size: 12.5px;
          color: var(--color-muted);
        }
        .cat {
          display: inline-block;
          margin-top: 4px;
          font-size: 11.5px;
          font-weight: 700;
          color: #5b6470;
          background: #f2f4f7;
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
        .queue-foot {
          margin: 10px 0 0;
          font-size: 12px;
          color: var(--color-muted);
        }
        .actions {
          display: flex;
          gap: 6px;
        }
        .btn {
          font-size: 12.5px;
          font-weight: 700;
          border-radius: 8px;
          padding: 5px 12px;
          white-space: nowrap;
        }
        .btn.ghost {
          border: 1px solid #e4e7ec;
          color: var(--color-muted);
        }
        .btn.solid {
          background: #101418;
          color: #fff;
        }
        .result-row {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 13px 12px;
          margin: 0 -12px;
          border-radius: 12px;
          border-bottom: 1px solid #eef0f3;
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
        .result-main strong {
          font-size: 14.5px;
        }
        .result-main span {
          font-size: 12.5px;
          color: var(--color-muted);
        }
        .winner {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 13.5px;
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
        }
      `}</style>
    </div>
  );
}
