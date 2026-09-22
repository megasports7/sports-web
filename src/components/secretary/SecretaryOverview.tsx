'use client';

/**
 * Shared overview page (both portals): scope + grants load first, then the
 * roster (view_players) and event monitor list (manage_registrations) render
 * only for held grants. Missing grants render an ask-an-admin note, not an
 * error -- the backend is what enforces, and it does so silently by
 * returning no rows.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  secretaryApi,
  type SecretaryEvent,
  type SecretaryKind,
  type SecretaryPlayer,
  type SecretaryScope,
} from '@/lib/api/secretary.api';
import type { SecretaryPermission } from '@/lib/types';
import { RosterSection } from './RosterSection';

export function SecretaryOverview({
  kind,
  basePath,
}: {
  kind: SecretaryKind;
  basePath: string;
}) {
  const [scope, setScope] = useState<SecretaryScope | null>(null);
  const [perms, setPerms] = useState<SecretaryPermission[]>([]);
  const [players, setPlayers] = useState<SecretaryPlayer[]>([]);
  const [events, setEvents] = useState<SecretaryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // One sequential load (scope first, everything else fans out) -- written
  // inline, not via a named refresh(), per the repo's set-state-in-effect rule.
  useEffect(() => {
    secretaryApi.scope().then((sRes) => {
      if (!sRes.success || !sRes.data) {
        setError(sRes.message || 'Could not load your scope — ask an admin to check the assignment.');
        setLoading(false);
        return;
      }
      const sc = sRes.data;
      setScope(sc);
      Promise.all([secretaryApi.myPermissions(), secretaryApi.roster(), secretaryApi.events(sc)]).then(
        ([pRes, rRes, eRes]) => {
          if (pRes.success && pRes.data) setPerms(pRes.data);
          if (rRes.success && rRes.data) setPlayers(rRes.data);
          else if (!rRes.success) setError(rRes.message || 'Could not load players');
          if (eRes.success && eRes.data) setEvents(eRes.data);
          else if (!eRes.success) setError(eRes.message || 'Could not load events');
          setLoading(false);
        },
      );
    });
  }, [kind]);

  if (loading) return <p className="text-muted">Loading {kind === 'district_secretary' ? 'district' : 'state'} overview…</p>;
  if (error && !scope) return <p className="text-error">{error}</p>;

  const canViewPlayers = perms.includes('view_players');
  const canMonitor = perms.includes('manage_registrations');

  return (
    <div className="overview">
      {error && <p className="text-error">{error}</p>}
      {canViewPlayers ? (
        <RosterSection players={players} loading={false} error={null} />
      ) : (
        <div className="card">
          <h2>Players</h2>
          <p className="text-muted">Needs the view_players permission — ask an admin.</p>
        </div>
      )}
      {canMonitor ? (
        <div className="card">
          <h2>Events in scope ({events.length})</h2>
          {events.length === 0 ? (
            <p className="text-muted">
              No events assigned to this jurisdiction yet — an admin assigns event geography.
            </p>
          ) : (
            <ul className="event-list">
              {events.map((e) => (
                <li key={e.event_id}>
                  <Link href={`${basePath}/events/${e.event_id}`}>{e.event_name}</Link>
                  {e.status && e.status !== 'active' && <span className="pill">{e.status}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="card">
          <h2>Events</h2>
          <p className="text-muted">Needs the manage_registrations permission — ask an admin.</p>
        </div>
      )}

      <style jsx>{`
        .overview {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
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
        .event-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
        }
        .event-list li {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 4px;
          border-bottom: 1px solid var(--color-line);
          font-size: 14px;
        }
        .event-list li:last-child {
          border-bottom: none;
        }
        .event-list a {
          font-weight: 600;
          color: var(--color-ink);
        }
        .pill {
          font-size: 11px;
          font-weight: 700;
          border-radius: 999px;
          padding: 2px 10px;
          background: var(--color-line);
          color: var(--color-muted);
        }
      `}</style>
    </div>
  );
}
