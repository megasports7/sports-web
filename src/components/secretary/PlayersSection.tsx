'use client';

/**
 * Secretary Players section (both portals): search + roster table with
 * show-more paging (first 6, "Show all" reveals the rest) + xlsx export
 * of the FULL list. Read-only; RLS decides every row.
 */
import { useMemo, useState } from 'react';
import type { SecretaryPlayer } from '@/lib/api/secretary.api';
import { downloadRosterWorkbook } from '@/lib/rosterExport';
import { SecretaryStyles } from '@/components/secretary/SecretaryStyles';

const PAGE_SIZE = 6;

export function PlayersSection({
  players,
  scopeLabel,
}: {
  players: SecretaryPlayer[];
  scopeLabel: string;
}) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [exporting, setExporting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter(
      (p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q),
    );
  }, [players, query]);

  const visible = expanded ? filtered : filtered.slice(0, PAGE_SIZE);
  const complete = filtered.filter((p) => p.state && p.district).length;
  const needsFix = filtered.length - complete;

  async function handleExport() {
    setExporting(true);
    try {
      await downloadRosterWorkbook(filtered, scopeLabel);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="players">
      <div className="stats">
        <div className="stat">
          <span className="s-label">Total players</span>
          <strong className="s-value">{filtered.length}</strong>
          <span className="s-hint">In jurisdiction</span>
        </div>
        <div className="stat">
          <span className="s-label">Location complete</span>
          <strong className="s-value">{complete}</strong>
          <span className="s-hint">State + district set</span>
        </div>
        <div className="stat">
          <span className="s-label">Needs location fix</span>
          <strong className="s-value alert">{needsFix}</strong>
          <span className="s-hint">Invisible to scope match</span>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>
            Roster ({visible.length}/{filtered.length})
          </h2>
          <button className="export-btn" onClick={handleExport} disabled={exporting || filtered.length === 0}>
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
        </div>
        {filtered.length === 0 ? (
          <p className="text-muted">
            {players.length === 0
              ? 'No players in scope yet — either none are registered here or their State/District text doesn\u2019t match canonical master data (an admin can fix it).'
              : 'No players match this search.'}
          </p>
        ) : (
          <>
            <div className="table-scroll">
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
                {visible.map((p) => (
                  <tr key={p.id}>
                    <td className="nowrap">{p.name}</td>
                    <td className="email">{p.email}</td>
                    <td className={p.phone ? 'nowrap' : 'muted nowrap'}>{p.phone ?? '—'}</td>
                    <td className={p.sport ? '' : 'muted'}>{p.sport ?? '—'}</td>
                    <td className={p.state ? '' : 'muted'}>{p.state ?? '—'}</td>
                    <td className={p.district ? '' : 'muted'}>{p.district ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
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
      </div>
      <SecretaryStyles />
      <style jsx>{`
        .players {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 10px;
        }
        .stat {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 14px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .s-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: var(--color-muted);
        }
        .s-value {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .s-value.alert {
          color: var(--color-corner-red);
        }
        .s-hint {
          font-size: 12px;
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
        }
        .export-btn {
          border: 1px solid var(--color-line);
          border-radius: 8px;
          padding: 6px 14px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          background: var(--color-ink);
          color: #fff;
          font-family: inherit;
        }
        .export-btn:disabled {
          opacity: 0.5;
        }
        .search-row input {
          width: 100%;
          border: 1px solid var(--color-line);
          border-radius: 8px;
          padding: 7px 10px;
          font-size: 13px;
          font-family: inherit;
          margin-bottom: 10px;
        }
        .data-table td.muted {
          color: #b7b3aa;
        }
        .table-scroll {
          overflow-x: auto;
          margin: 0 -4px;
          padding: 0 4px;
        }
        .table-scroll .data-table {
          min-width: 760px;
        }
        .data-table td.email {
          overflow-wrap: anywhere;
        }
        .data-table td.nowrap {
          white-space: nowrap;
        }
        .show-all {
          margin-top: 10px;
          width: 100%;
          border: 1px solid var(--color-line);
          border-radius: 10px;
          padding: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          background: var(--color-surface);
          color: var(--color-ink);
          font-family: inherit;
        }
        .show-all.ghost {
          background: transparent;
          color: var(--color-muted);
        }
      `}</style>
    </div>
  );
}
