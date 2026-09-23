'use client';

/**
 * DESIGN PREVIEW ONLY — district secretary Players page (frontend, mock
 * data). Same kit as the dashboard preview; nothing is wired to APIs.
 */
import {
  PreviewShell,
  SectionCard,
  StatCard,
} from '@/components/design-preview/ui';

const PLAYERS = [
  { name: 'Demo Player 3', email: 'player3@test.com', phone: '—', sport: '—', state: 'Andhra Pradesh', district: 'NTR' },
  { name: 'Demo Player 4', email: 'player4@test.com', phone: '98765 43210', sport: '—', state: 'Kerala', district: 'Ernakulam' },
  { name: 'Demo Player 5', email: 'player5@test.com', phone: '91234 56712', sport: '—', state: 'Andhra Pradesh', district: 'NTR' },
  { name: 'Guru Gopal', email: 'gg@test.com', phone: '91345 67890', sport: 'Cricket', state: 'Andhra Pradesh', district: 'NTR' },
  { name: 'Happy', email: 'hap@test.com', phone: '94561 23000', sport: '—', state: '—', district: 'NTR' },
  { name: 'QA Player', email: 'player@test.com', phone: '91234 00000', sport: '—', state: 'Andhra Pradesh', district: '—' },
  { name: 'Demo Player 6', email: 'player6@test.com', phone: '99887 76655', sport: 'Kabaddi', state: 'Andhra Pradesh', district: 'NTR' },
  { name: 'Demo Player 7', email: 'player7@test.com', phone: '—', sport: '—', state: 'Andhra Pradesh', district: 'NTR' },
  { name: 'Demo Player 8', email: 'player8@test.com', phone: '97766 55444', sport: 'Cricket', state: 'Telangana', district: 'Khammam' },
  { name: 'Demo Player 9', email: 'player9@test.com', phone: '96655 44333', sport: '—', state: '—', district: '—' },
];

export default function DistrictPlayersPreview() {
  const shown = PLAYERS.slice(0, 6);
  return (
    <PreviewShell
      roleLabel="District Secretary"
      scopeLabel="NTR district"
      accentVar="var(--color-role-district-secretary)"
      nav={['Dashboard', 'Players', 'Events', 'Profile']}
      active="Players"
    >
      <div className="head">
        <div>
          <h1>Players</h1>
          <p>In-jurisdiction roster · read-only. NTR district — 6 players.</p>
        </div>
        <span className="scope-pill">NTR district</span>
      </div>

      <div className="stats">
        <StatCard label="Total players" value="6" hint="In NTR jurisdiction" />
        <StatCard label="Location complete" value="4" hint="State + district set" />
        <StatCard label="Needs location fix" value="2" hint="Invisible to scope match" alert />
      </div>

      <SectionCard title="Roster" actionLabel="Export">
        <div className="search-row">
          <span className="search">Search name or email…</span>
          <span className="chip on">All</span>
          <span className="chip">Cricket</span>
          <span className="chip">Missing phone</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Sport</th>
              <th>State</th>
              <th>District</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.email}>
                <td>
                  <strong>{p.name}</strong>
                </td>
                <td>{p.email}</td>
                <td className={p.phone === '—' ? 'muted' : ''}>{p.phone}</td>
                <td className={p.sport === '—' ? 'muted' : ''}>{p.sport}</td>
                <td className={p.state === '—' ? 'muted' : ''}>{p.state}</td>
                <td className={p.district === '—' ? 'muted' : ''}>{p.district}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <span className="show-all">Show all ({PLAYERS.length}) → exports full list to Excel</span>
        <p className="foot">Showing 6 of {PLAYERS.length} · “—” means not set (admin can fix canonical State/District).</p>
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
        .data-table td.muted {
          color: #b7b3aa;
        }
        .show-all {
          display: block;
          margin-top: 10px;
          border: 1px solid var(--color-line);
          border-radius: 10px;
          padding: 8px;
          font-size: 13px;
          font-weight: 700;
          text-align: center;
        }
        .foot {
          margin: 10px 0 0;
          font-size: 12px;
          color: var(--color-muted);
        }
      `}</style>
    </PreviewShell>
  );
}
