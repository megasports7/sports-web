'use client';

/**
 * Shared event-list section for the secretary portal pages (dashboard
 * preview + dedicated Events page). Links into the split event routes.
 */
import Link from 'next/link';
import type { SecretaryEvent } from '@/lib/api/secretary.api';

export function SecretaryEventsSection({
  events,
  basePath,
  canMonitor,
}: {
  events: SecretaryEvent[];
  basePath: string;
  canMonitor: boolean;
}) {
  if (!canMonitor) {
    return (
      <div className="card">
        <h2>Events</h2>
        <p className="text-muted">Needs the manage_registrations permission — ask an admin.</p>
      </div>
    );
  }
  return (
    <div className="card">
      <h2>Events in scope ({events.length})</h2>
      {events.length === 0 ? (
        <p className="text-muted">No events assigned to this jurisdiction yet — an admin assigns event geography.</p>
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
