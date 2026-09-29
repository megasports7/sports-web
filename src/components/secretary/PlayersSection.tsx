'use client';

/**
 * Secretary Players section (both portals): approved roster design wired
 * to live data. Search + All/Complete/Needs-fix chips + show-more paging
 * (first 6, "Show all" reveals the rest) + xlsx export of the FULL
 * filtered list. Read-only; RLS decides every row.
 *
 * Field mapping (secretaryApi.roster -> profiles): name, email, phone,
 * sport, state, district. Complete = state AND district set.
 */
import { useMemo, useState } from 'react';
import type { SecretaryKind, SecretaryPlayer } from '@/lib/api/secretary.api';
import { downloadRosterWorkbook } from '@/lib/rosterExport';

const PAGE_SIZE = 6;

type Chip = 'all' | 'complete' | 'needsfix';

function Icon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  switch (name) {
    case 'users':
      return (
        <svg {...common}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" /><circle cx="17" cy="9" r="2.6" /><path d="M16 15.2c2.6.3 4.6 1.9 5.3 4.3" /></svg>
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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const isComplete = (p: SecretaryPlayer) => !!(p.state && p.district);

export function PlayersSection({
  players,
  scopeLabel,
  kind,
}: {
  players: SecretaryPlayer[];
  scopeLabel: string;
  kind: SecretaryKind;
}) {
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState<Chip>('all');
  const [expanded, setExpanded] = useState(false);
  const [exporting, setExporting] = useState(false);

  const roleLabel = kind === 'district_secretary' ? 'District Secretary' : 'State Secretary';
  const accentVar =
    kind === 'district_secretary' ? 'var(--color-role-district-secretary)' : 'var(--color-role-state-secretary)';

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter(
      (p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q),
    );
  }, [players, query]);

  const filtered = useMemo(() => {
    if (chip === 'complete') return searched.filter(isComplete);
    if (chip === 'needsfix') return searched.filter((p) => !isComplete(p));
    return searched;
  }, [searched, chip]);

  const visible = expanded ? filtered : filtered.slice(0, PAGE_SIZE);
  const complete = searched.filter(isComplete).length;
  const needsFix = searched.length - complete;

  async function handleExport() {
    setExporting(true);
    try {
      await downloadRosterWorkbook(filtered, scopeLabel);
    } finally {
      setExporting(false);
    }
  }

  function pick(c: Chip) {
    setChip(c);
    setExpanded(false);
  }

  return (
    <div className="players">
      <header className="head">
        <div>
          <span className="crumb">
            {roleLabel} · {scopeLabel}
          </span>
          <h1>Players</h1>
          <p>Roster under {scopeLabel} supervision — read-only. Location gaps stay visible so an admin can fix them.</p>
        </div>
        <span className="scope-pill">
          <span className="dot" />
          {scopeLabel}
        </span>
      </header>

      <div className="kpis">
        <div className="kpi tint-blue">
          <div className="kpi-top">
            <span className="k-label">Total players</span>
            <span className="tile sm blue"><Icon name="users" /></span>
          </div>
          <strong className="k-value">{searched.length}</strong>
          <span className="k-hint">In jurisdiction</span>
        </div>
        <div className="kpi tint-green">
          <div className="kpi-top">
            <span className="k-label">Location complete</span>
            <span className="tile sm green"><Icon name="check" /></span>
          </div>
          <strong className="k-value">{complete}</strong>
          <span className="k-hint">State + district set</span>
        </div>
        <div className={needsFix > 0 ? 'kpi alert' : 'kpi'}>
          <div className="kpi-top">
            <span className="k-label">Needs location fix</span>
            <span className="tile sm amber"><Icon name="clock" /></span>
          </div>
          <strong className={needsFix > 0 ? 'k-value alert' : 'k-value'}>{needsFix}</strong>
          <span className="k-hint">Invisible to scope match</span>
        </div>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>
            Roster <span className="count-badge">{filtered.length} player{filtered.length === 1 ? '' : 's'}</span>
          </h2>
          <button className="link-btn" onClick={handleExport} disabled={exporting || filtered.length === 0}>
            {exporting ? 'Exporting…' : 'Export'}
          </button>
        </div>
        <div className="search-row">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setExpanded(false);
            }}
            placeholder="Search name or email…"
            aria-label="Search players"
          />
          {(['all', 'complete', 'needsfix'] as const).map((c) => (
            <button key={c} onClick={() => pick(c)} className={chip === c ? 'chip on' : 'chip'}>
              {c === 'all' ? 'All' : c === 'complete' ? 'Complete' : 'Needs fix'}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <p className="text-muted">
            {players.length === 0
              ? 'No players in scope yet — either none are registered here or their State/District text doesn\u2019t match canonical master data (an admin can fix it).'
              : 'No players match this search or filter.'}
          </p>
        ) : (
          <>
            <div className="table-head">
              <span>Player</span>
              <span>Sport</span>
              <span>Phone</span>
              <span>Location</span>
            </div>
            {visible.map((p) => {
              const done = isComplete(p);
              return (
                <div key={p.id} className="player-row">
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
                    {done ? (
                      <span className="pill ok">{p.district} · {p.state}</span>
                    ) : (
                      <span className="pill warn">needs fix</span>
                    )}
                  </span>
                </div>
              );
            })}
            {!expanded && filtered.length > PAGE_SIZE && (
              <button className="show-all" onClick={() => setExpanded(true)}>
                Show all ({filtered.length})
              </button>
            )}
            {expanded && filtered.length > PAGE_SIZE && (
              <button className="show-all ghost" onClick={() => setExpanded(false)}>
                Show less
              </button>
            )}
          </>
        )}
      </section>

      <style jsx>{`
        .players {
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
          border-bottom: 1px solid var(--color-line);
          margin-bottom: 2px;
        }
        .crumb {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: ${accentVar};
        }
        .head h1 {
          margin: 4px 0 2px;
          font-size: 27px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .head p {
          margin: 0;
          font-size: 15px;
          color: var(--color-muted);
        }
        .scope-pill {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 14px;
          font-weight: 700;
          border-radius: 999px;
          padding: 7px 14px;
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          box-shadow: 0 1px 2px rgba(16, 20, 24, 0.06);
          white-space: nowrap;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${accentVar};
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
          background: var(--color-surface);
          border: 1px solid var(--color-line);
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
          width: 36px;
          height: 36px;
          border-radius: 10px;
        }
        .tile.blue { background: #e8effd; color: #2456c6; }
        .tile.amber { background: #fdf1de; color: #b26a00; }
        .tile.green { background: #e3f4e8; color: #177245; }
        .k-label {
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: var(--color-muted);
        }
        .k-value {
          font-size: 31px;
          font-weight: 800;
          letter-spacing: -0.6px;
          line-height: 1.15;
        }
        .k-value.alert {
          color: var(--color-corner-red);
        }
        .k-hint {
          font-size: 13.5px;
          color: var(--color-muted);
        }
        .card {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
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
          font-size: 16px;
          font-weight: 800;
          letter-spacing: -0.1px;
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
          font-size: 14px;
          font-weight: 700;
          color: ${accentVar};
          border: 1px solid color-mix(in srgb, ${accentVar} 35%, transparent);
          background: color-mix(in srgb, ${accentVar} 8%, transparent);
          border-radius: 999px;
          padding: 5px 13px;
          white-space: nowrap;
          font-family: inherit;
          cursor: pointer;
        }
        .link-btn:disabled {
          opacity: 0.5;
          cursor: default;
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
          font-size: 14.5px;
          font-family: inherit;
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
          grid-template-columns: 2fr 1fr 1.2fr 1.4fr;
          gap: 10px;
          padding: 8px 12px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: var(--color-muted);
          border-bottom: 1.5px solid var(--color-line);
        }
        .player-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1.2fr 1.4fr;
          gap: 10px;
          align-items: center;
          padding: 12px;
          border-bottom: 1px solid var(--color-line);
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
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #e8effd;
          color: #2456c6;
          font-size: 14px;
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
          font-size: 15.5px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .p-id-text span {
          font-size: 13.5px;
          color: var(--color-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .cat {
          font-size: 12.5px;
          font-weight: 700;
          color: #5b6470;
          background: #eef0f3;
          border-radius: 6px;
          padding: 3px 9px;
          white-space: nowrap;
        }
        .dash {
          color: #c9cfd7;
        }
        .p-phone {
          font-size: 14.5px;
          white-space: nowrap;
        }
        .p-loc .pill {
          font-size: 13px;
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
          width: 100%;
          margin-top: 10px;
          border: 1px solid var(--color-line);
          border-radius: 10px;
          padding: 8px;
          font-size: 14px;
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
        @media (max-width: 860px) {
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
