'use client';

/**
 * DESIGN PREVIEW ONLY — district secretary dashboard (frontend, mock data).
 * No API imports, no auth reads, no backend wiring. Buttons are visual
 * only until the approved design is connected to the real endpoints.
 * Shared bits (StatCard, StatusPill, SectionCard) live in
 * src/components/design-preview/ui.tsx for reuse across previews.
 */
import {
  PreviewShell,
  SectionCard,
  StatCard,
  StatusPill,
} from '@/components/design-preview/ui';

const EVENTS = [
  { name: 'admin-dsc-event', status: 'active', pending: 3, batches: 1, decided: '2/5' },
  { name: 'org3', status: 'active', pending: 0, batches: 1, decided: '3/4' },
];

const APPROVALS = [
  { player: 'Demo Player 3', email: 'player3@test.com', detail: 'TANDING · 10–50 kg', status: 'pending' },
  { player: 'Demo Player 4', email: 'player4@test.com', detail: 'TANDING · 10–50 kg', status: 'pending' },
  { player: 'Demo Player 5', email: 'player5@test.com', detail: 'KYOKUSHIN · open', status: 'pending' },
];

const RESULTS = [
  { match: 'Demo Player 1 vs Demo Player 3', meta: 'ram-se · R1 · M1', winner: 'Demo Player 1', status: 'completed' },
  { match: 'Demo Player 4 vs QA Player', meta: 'ram-se · R1 · M2', winner: null, status: 'in_progress' },
  { match: 'TBD vs TBD', meta: 'ram-se · Final', winner: null, status: 'scheduled' },
];

export default function DistrictDashboardPreview() {
  return (
    <PreviewShell
      roleLabel="District Secretary"
      scopeLabel="NTR district"
      accentVar="var(--color-role-district-secretary)"
      nav={['Dashboard', 'Players', 'Events', 'Profile']}
      active="Dashboard"
    >
      <div className="head">
        <div>
          <h1>District dashboard</h1>
          <p>NTR district · Andhra Pradesh — supervisory overview. Nothing here writes data in preview.</p>
        </div>
        <span className="scope-pill">NTR district</span>
      </div>

      <div className="stats">
        <StatCard label="Players in jurisdiction" value="6" hint="Across all sports" />
        <StatCard label="Events in scope" value="2" hint="Assigned to NTR" />
        <StatCard label="Pending approvals" value="3" hint="Needs review" alert />
        <StatCard label="Matches decided" value="5/9" hint="Across 2 batches" fraction={{ value: 5, total: 9 }} />
      </div>

      <div className="grid">
        <SectionCard title="Events in scope" actionLabel="View all">
          <div className="search-row">
            <span className="search">Search events…</span>
            <span className="chip on">All</span>
            <span className="chip">Active</span>
            <span className="chip">Pending review</span>
          </div>
          {EVENTS.map((e) => (
            <div key={e.name} className="event-row">
              <span className={`bar ${e.pending > 0 ? 'warn' : 'ok'}`} />
              <div className="event-main">
                <strong>{e.name}</strong>
                <span>
                  {e.batches} batch · {e.decided} decided · {e.pending} pending
                </span>
              </div>
              <StatusPill status={e.pending > 0 ? 'pending review' : e.status} />
            </div>
          ))}
        </SectionCard>

        <SectionCard title="Pending approvals" actionLabel="Review all">
          <table className="data-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Category</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {APPROVALS.map((a) => (
                <tr key={a.email}>
                  <td>
                    <strong>{a.player}</strong>
                    <span className="sub">{a.email}</span>
                  </td>
                  <td>{a.detail}</td>
                  <td>
                    <StatusPill status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>

      <SectionCard title="Recent results" actionLabel="Open matches">
        {RESULTS.map((r) => (
          <div key={r.match} className="result-row">
            <div>
              <strong>{r.match}</strong>
              <span className="sub">{r.meta}</span>
            </div>
            {r.winner ? (
              <span className="winner-line">
                Winner: <strong>{r.winner}</strong>
              </span>
            ) : (
              <StatusPill status={r.status} />
            )}
          </div>
        ))}
      </SectionCard>

      <style jsx>{`
        .head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .head h1 {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.3px;
          margin: 0;
        }
        .head p {
          margin: 4px 0 0;
          font-size: 13.5px;
          color: var(--color-muted);
        }
        .scope-pill {
          font-size: 12px;
          font-weight: 700;
          border-radius: 999px;
          padding: 4px 12px;
          background: color-mix(in srgb, var(--color-role-district-secretary) 12%, transparent);
          color: var(--color-role-district-secretary);
          white-space: nowrap;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 10px;
        }
        .grid {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 900px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
        .search-row {
          display: flex;
          gap: 6px;
          align-items: center;
          margin-bottom: 10px;
        }
        .search {
          flex: 1;
          border: 1px solid var(--color-line);
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 12.5px;
          color: var(--color-muted);
        }
        .chip {
          border: 1px solid var(--color-line);
          border-radius: 999px;
          padding: 4px 12px;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-muted);
          white-space: nowrap;
        }
        .chip.on {
          background: var(--color-ink);
          color: #fff;
          border-color: var(--color-ink);
        }
        .event-row {
          display: flex;
          gap: 10px;
          align-items: center;
          padding: 10px 4px;
          border-bottom: 1px solid var(--color-line);
        }
        .event-row:last-child {
          border-bottom: none;
        }
        .bar {
          width: 4px;
          align-self: stretch;
          border-radius: 4px;
          background: var(--color-line);
        }
        .bar.warn {
          background: var(--color-status-pending);
        }
        .bar.ok {
          background: var(--color-accent-green);
        }
        .event-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .event-main strong {
          font-size: 13.5px;
        }
        .event-main span {
          font-size: 12px;
          color: var(--color-muted);
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .data-table th {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          color: var(--color-muted);
          text-align: left;
          padding: 6px 8px;
          border-bottom: 1.5px solid var(--color-line);
        }
        .data-table td {
          padding: 8px;
          border-bottom: 1px solid var(--color-line);
          vertical-align: middle;
        }
        .data-table tbody tr:last-child td {
          border-bottom: none;
        }
        .sub {
          display: block;
          font-size: 11.5px;
          color: var(--color-muted);
          font-weight: 400;
        }
        .result-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 4px;
          border-bottom: 1px solid var(--color-line);
        }
        .result-row:last-child {
          border-bottom: none;
        }
        .result-row strong {
          font-size: 13.5px;
        }
        .winner-line {
          font-size: 12.5px;
          color: var(--color-muted);
        }
        .winner-line strong {
          color: #166534;
        }
      `}</style>
    </PreviewShell>
  );
}
