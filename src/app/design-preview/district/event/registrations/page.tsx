'use client';

/**
 * DESIGN PREVIEW ONLY — secretary event registrations workspace v1.
 * Frontend, mock data shaped like the real rows (SecretaryRegistration +
 * roster join for email/sport: id/player_name/status/created_at + email +
 * sport). No API imports, no auth reads, no backend wiring. Search, chips,
 * export, drawer and dialogs are visual only until wired to
 * review_registration + the existing xlsx pattern.
 *
 * Patterns adapted from Mobbin refs: Deel (action-required queue, status
 * pills, per-row approve/deny, export), Circle moderation (Inbox /
 * Approved / Rejected tabs with counts), Klaviyo (right-side detail
 * drawer with bottom actions).
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
  { label: 'Registrations', active: true },
  { label: 'Batches', active: false },
  { label: 'Certificates', active: false },
] as const;

/** Mock rows: 12 total (3 pending, 7 approved, 2 rejected); 6 shown. */
const ROWS = [
  { name: 'Demo Player 3', email: 'player3@test.com', sport: 'SILAT', date: 'Apr 12, 2026', status: 'pending' },
  { name: 'Demo Player 4', email: 'player4@test.com', sport: 'KARATE', date: 'Apr 12, 2026', status: 'pending' },
  { name: 'Demo Player 5', email: 'player5@test.com', sport: null, date: 'Apr 13, 2026', status: 'pending' },
  { name: 'Demo Player 1', email: 'player1@test.com', sport: 'SILAT', date: 'Apr 10, 2026', status: 'approved' },
  { name: 'Demo Player 2', email: 'player2@test.com', sport: 'SILAT', date: 'Apr 10, 2026', status: 'approved' },
  { name: 'QA Player', email: 'qaplayer@test.com', sport: 'SILAT', date: 'Apr 11, 2026', status: 'rejected' },
];

const SUMMARY = [
  { label: 'Total', value: '12', tint: 'neutral' },
  { label: 'Pending', value: '3', tint: 'amber' },
  { label: 'Approved', value: '7', tint: 'green' },
  { label: 'Rejected', value: '2', tint: 'red' },
] as const;

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
    case 'x':
      return (
        <svg {...common}><path d="M6 6l12 12" /><path d="M18 6 6 18" /></svg>
      );
    default:
      return null;
  }
}

export default function EventRegistrationsPreview() {
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
          <strong>Registrations</strong>
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
          {SUMMARY.map((s) => (
            <div key={s.label} className={`mini tint-${s.tint}`}>
              <span className="m-label">{s.label}</span>
              <strong>{s.value}</strong>
            </div>
          ))}
        </div>

        <div className="work">
          <section className="card">
            <div className="card-head">
              <h2>Registrations <span className="count-badge">12 registrations</span></h2>
              <span className="link-btn">Export registrations ↓</span>
            </div>
            <div className="search-row">
              <span className="search">Search players…</span>
              <span className="chip on">All (12)</span>
              <span className="chip">Pending (3)</span>
              <span className="chip">Approved (7)</span>
              <span className="chip">Rejected (2)</span>
            </div>
            <div className="table-head">
              <span>Player</span>
              <span>Sport</span>
              <span>Registered</span>
              <span>Status</span>
              <span className="th-action">Action</span>
            </div>
            {ROWS.map((r) => (
              <div key={r.email} className="reg-row">
                <div className="p-id">
                  <span className="avatar">{initials(r.name)}</span>
                  <div className="p-id-text">
                    <strong>{r.name}</strong>
                    <span>{r.email}</span>
                  </div>
                </div>
                <span>{r.sport ? <span className="cat">{r.sport}</span> : <span className="dash">—</span>}</span>
                <span className="r-date">{r.date}</span>
                <span>
                  <span className={`pill ${r.status === 'pending' ? 'warn' : r.status === 'approved' ? 'ok' : 'bad'}`}>
                    {r.status}
                  </span>
                </span>
                <span className="r-actions">
                  {r.status === 'pending' ? (
                    <>
                      <span className="btn solid">Approve</span>
                      <span className="btn ghost">Reject</span>
                      <span className="btn text">Review →</span>
                    </>
                  ) : r.status === 'approved' ? (
                    <>
                      <span className="done ok">Approved ✓</span>
                      <span className="btn text">Review →</span>
                    </>
                  ) : (
                    <>
                      <span className="done bad">Rejected</span>
                      <span className="btn ghost">Override</span>
                    </>
                  )}
                </span>
              </div>
            ))}
            <span className="show-all">Showing 6 of 12 — show all</span>
          </section>

          <aside className="drawer" aria-label="Registration review">
            <div className="drawer-head">
              <h2>Review registration</h2>
              <span className="drawer-x"><Icon name="x" /></span>
            </div>
            <div className="drawer-id">
              <span className="avatar lg">D3</span>
              <div>
                <strong>Demo Player 3</strong>
                <span>player3@test.com</span>
              </div>
              <span className="pill warn">pending</span>
            </div>
            <dl className="drawer-fields">
              <div><dt>Sport</dt><dd>SILAT</dd></div>
              <div><dt>Registered</dt><dd>Apr 12, 2026</dd></div>
              <div><dt>Event</dt><dd>admin-dsc-event</dd></div>
              <div><dt>Jurisdiction</dt><dd>NTR district</dd></div>
            </dl>
            <p className="drawer-note">Approving unlocks batch creation for this player. Rejection asks for confirmation.</p>
            <div className="drawer-actions">
              <span className="btn solid">Approve</span>
              <span className="btn danger">Reject…</span>
              <span className="btn ghost">Override…</span>
            </div>
          </aside>
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
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        @media (max-width: 1100px) {
          .strip {
            grid-template-columns: repeat(2, 1fr);
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
          background: #fff;
          border: 1px solid #dbe0e6;
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
          color: ${ACCENT};
          border: 1px solid color-mix(in srgb, ${ACCENT} 35%, transparent);
          background: color-mix(in srgb, ${ACCENT} 8%, transparent);
          border-radius: 999px;
          padding: 6px 14px;
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
          grid-template-columns: 2fr 1fr 1fr 0.9fr 1.6fr;
          gap: 10px;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: var(--color-muted);
          border-bottom: 1.5px solid #e4e7ec;
        }
        .reg-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 0.9fr 1.6fr;
          gap: 10px;
          align-items: center;
          padding: 12px;
          border-bottom: 1px solid #eef0f3;
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
        }
        .btn.solid {
          background: #101418;
          color: #fff;
        }
        .btn.ghost {
          border: 1px solid #dbe0e6;
          color: var(--color-muted);
        }
        .btn.danger {
          border: 1px solid #f3b7b7;
          color: #991b1b;
          background: #fff5f5;
        }
        .btn.text {
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
          margin-top: 10px;
          border: 1px solid #e4e7ec;
          border-radius: 10px;
          padding: 8px;
          font-size: 13px;
          font-weight: 700;
          text-align: center;
        }
        .drawer {
          background: #fff;
          border: 1px solid #dbe0e6;
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
          background: #f2f4f7;
          color: #5b6470;
          display: flex;
          align-items: center;
          justify-content: center;
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
