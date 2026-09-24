'use client';

/**
 * DESIGN PREVIEW ONLY — district secretary Players page v2 (frontend, mock
 * data shaped like the real SecretaryPlayer rows). No API imports, no auth
 * reads, no backend wiring. Search/filter/export controls are visual only
 * until the approved design is connected to PlayersSection's real data.
 *
 * Patterns adapted from Mobbin refs: Workable (directory rows with avatar
 * + contact lines), Calendly (org-directory table + export), Klaviyo
 * (stat header + clean table). Same chrome as the approved dashboard.
 */
const ACCENT = 'var(--color-role-district-secretary)';

const NAV = [
  { label: 'Dashboard', active: false, icon: 'grid' },
  { label: 'Players', active: true, icon: 'users' },
  { label: 'Events', active: false, icon: 'trophy' },
  { label: 'Profile', active: false, icon: 'id' },
] as const;

/** Mock rows mirror SecretaryPlayer: id/name/email/phone/sport/state/district. */
const PLAYERS = [
  { name: 'Demo Player 1', email: 'player1@test.com', phone: '+91 90000 11111', sport: 'SILAT', state: 'Andhra Pradesh', district: 'NTR' },
  { name: 'Demo Player 2', email: 'player2@test.com', phone: '+91 90000 22222', sport: 'SILAT', state: 'Andhra Pradesh', district: 'NTR' },
  { name: 'Demo Player 3', email: 'player3@test.com', phone: null, sport: 'KARATE', state: 'Andhra Pradesh', district: 'NTR' },
  { name: 'Demo Player 4', email: 'player4@test.com', phone: '+91 90000 44444', sport: null, state: 'kerala', district: 'admin@test.com' },
  { name: 'Demo Player 5', email: 'player5@test.com', phone: null, sport: null, state: null, district: null },
  { name: 'QA Player', email: 'qaplayer@test.com', phone: '+91 90000 66666', sport: 'SILAT', state: 'Andhra Pradesh', district: 'NTR' },
];

const KPIS: { label: string; value: string; hint: string; icon: string; tint: string; alert?: boolean }[] = [
  { label: 'Total players', value: '6', hint: 'In NTR jurisdiction', icon: 'users', tint: 'blue' },
  { label: 'Location complete', value: '4', hint: 'State + district set', icon: 'check', tint: 'green' },
  { label: 'Needs location fix', value: '2', hint: 'Invisible to scope match', icon: 'clock', tint: 'amber', alert: true },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

export default function DistrictPlayersPreviewV2() {
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
            <h1>Players</h1>
            <p>Roster under NTR supervision — read-only. Location gaps stay visible so an admin can fix them.</p>
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
            </div>
          ))}
        </div>

        <section className="card">
          <div className="card-head">
            <h2>Roster <span className="count-badge">6 players</span></h2>
            <span className="link-btn">Export</span>
          </div>
          <div className="search-row">
            <span className="search">Search name or email…</span>
            <span className="chip on">All</span>
            <span className="chip">Complete</span>
            <span className="chip">Needs fix</span>
          </div>
          <div className="table-head">
            <span>Player</span>
            <span>Sport</span>
            <span>Phone</span>
            <span>Location</span>
          </div>
          {PLAYERS.map((p) => {
            const complete = !!(p.state && p.district);
            return (
              <div key={p.email} className="player-row">
                <div className="p-id">
                  <span className="avatar">{initials(p.name)}</span>
                  <div className="p-id-text">
                    <strong>{p.name}</strong>
                    <span>{p.email}</span>
                  </div>
                </div>
                <span className="p-sport">{p.sport ? <span className="cat">{p.sport}</span> : <span className="dash">—</span>}</span>
                <span className="p-phone">{p.phone ?? <span className="dash">—</span>}</span>
                <span className="p-loc">
                  {complete ? (
                    <span className="pill ok">{p.district} · {p.state}</span>
                  ) : (
                    <span className="pill warn">needs fix</span>
                  )}
                </span>
              </div>
            );
          })}
          <span className="show-all">Show all (6)</span>
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
          border-bottom: 1px solid #dbe0e6;
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
          border: 1px solid #dbe0e6;
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
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        @media (max-width: 1100px) {
          .kpis {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .kpi {
          background: #fff;
          border: 1px solid #dbe0e6;
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
          width: 34px;
          height: 34px;
          border-radius: 10px;
        }
        .tile.blue { background: #e8effd; color: #2456c6; }
        .tile.amber { background: #fdf1de; color: #b26a00; }
        .tile.green { background: #e3f4e8; color: #177245; }
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
        .card {
          background: #fff;
          border: 1px solid #dbe0e6;
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
          font-size: 15px;
          font-weight: 800;
          letter-spacing: -0.1px;
        }
        .count-badge {
          font-size: 12px;
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
          color: ${ACCENT};
          border: 1px solid color-mix(in srgb, ${ACCENT} 35%, transparent);
          background: color-mix(in srgb, ${ACCENT} 8%, transparent);
          border-radius: 999px;
          padding: 5px 13px;
          white-space: nowrap;
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
        .table-head {
          display: grid;
          grid-template-columns: 2fr 1fr 1.2fr 1.4fr;
          gap: 10px;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: var(--color-muted);
          border-bottom: 1.5px solid #e4e7ec;
        }
        .player-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1.2fr 1.4fr;
          gap: 10px;
          align-items: center;
          padding: 12px;
          border-bottom: 1px solid #eef0f3;
          border-radius: 10px;
        }
        .player-row:last-of-type {
          border-bottom: none;
        }
        .player-row:hover {
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
        .p-phone {
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
        .show-all {
          display: block;
          margin-top: 10px;
          border: 1px solid #e4e7ec;
          border-radius: 10px;
          padding: 8px;
          font-size: 13px;
          font-weight: 700;
          text-align: center;
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
          .table-head {
            display: none;
          }
          .player-row {
            grid-template-columns: 1fr;
            gap: 6px;
          }
        }
      `}</style>
    </div>
  );
}
