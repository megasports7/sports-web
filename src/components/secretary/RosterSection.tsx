'use client';

/**
 * Shared roster table (both portals): in-jurisdiction players, read-only.
 * No attendance controls, no scope toggle -- the jurisdiction is fixed
 * server-side and RLS decides every row.
 */
import type { SecretaryPlayer } from '@/lib/api/secretary.api';

export function RosterSection({
  players,
  loading,
  error,
}: {
  players: SecretaryPlayer[];
  loading: boolean;
  error: string | null;
}) {
  if (loading) return <p className="text-muted">Loading players…</p>;
  if (error) return <p className="text-error">{error}</p>;

  return (
    <div className="card">
      <h2>Players ({players.length})</h2>
      {players.length === 0 ? (
        <p className="text-muted">
          No players in scope yet — either none are registered here or their
          State/District text doesn&apos;t match canonical master data (an admin can fix it).
        </p>
      ) : (
        <table className="roster-table">
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
            {players.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.email}</td>
                <td>{p.phone ?? '—'}</td>
                <td>{p.sport ?? '—'}</td>
                <td>{p.state ?? '—'}</td>
                <td>{p.district ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <style jsx>{`
        .card {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 14px;
          padding: 16px 18px;
        }
        .card h2 {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: #3a3d45;
          margin: 0 0 12px;
        }
        .roster-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
        }
        .roster-table th {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: var(--color-muted);
          text-align: left;
          padding: 6px 8px;
          border-bottom: 1.5px solid var(--color-line);
        }
        .roster-table td {
          padding: 9px 8px;
          border-bottom: 1px solid var(--color-line);
          color: var(--color-ink);
        }
        .roster-table tbody tr:last-child td {
          border-bottom: none;
        }
      `}</style>
    </div>
  );
}
