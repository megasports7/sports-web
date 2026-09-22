'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { organizerApi } from '@/lib/api/organizer.api';
import { useOrgParam, withOrg } from '@/lib/auth/orgContext';
import type { Event } from '@/lib/types';

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth={1.5} />
      <path d="M3 8h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path d="m8 5 5 5-5 5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function BatchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <rect x="3" y="3" width="6" height="6" rx="1.3" stroke="currentColor" strokeWidth={1.5} />
      <rect x="11" y="3" width="6" height="6" rx="1.3" stroke="currentColor" strokeWidth={1.5} />
      <rect x="3" y="11" width="6" height="6" rx="1.3" stroke="currentColor" strokeWidth={1.5} />
      <rect x="11" y="11" width="6" height="6" rx="1.3" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}
function ScanIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path
        d="M4 7V5a1 1 0 0 1 1-1h2M16 7V5a1 1 0 0 0-1-1h-2M4 13v2a1 1 0 0 0 1 1h2M16 13v2a1 1 0 0 1-1 1h-2"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}
function CategoryIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3.5 4.5h7l6 6-6 6-7-7v-5Z" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx="7" cy="8" r="1" fill="currentColor" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="2.4" stroke="currentColor" strokeWidth={1.5} />
      <path
        d="M10 2.8v2M10 15.2v2M2.8 10h2M15.2 10h2M5 5l1.4 1.4M13.6 13.6 15 15M15 5l-1.4 1.4M6.4 13.6 5 15"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function OrganizerEventsPage() {
  // Phase 4: preserve admin-in-organizer ?org= across drill-down links.
  const orgParam = useOrgParam();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    organizerApi
      .events()
      .then((res) => {
        if (res.success && res.data) setEvents(res.data);
        else setError(res.message || 'Could not load events');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted">Loading events…</p>;
  if (error) return <p className="text-corner-red">{error}</p>;

  return (
    <div className="page">
      <div className="head-row">
        <div>
          <h1>Events</h1>
          <p>Manage registrations and attendance scanning for each event.</p>
        </div>
        <Link href={withOrg('/organizer/events/new', orgParam)} className="create-cta">
          <PlusIcon />
          Create event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">
            <CalendarIcon />
          </div>
          <h2>No events yet</h2>
          <p>Create your first event to start taking registrations.</p>
          <Link href={withOrg('/organizer/events/new', orgParam)} className="create-cta">
            <PlusIcon />
            Create event
          </Link>
        </div>
      ) : (
        <div className="events-list">
          {events.map((e) => (
            <div className="event-card" key={e.event_id}>
              <Link href={withOrg(`/organizer/events/${e.event_id}/registrations`, orgParam)} className="event-main">
                {e.event_date && (
                  <span className="date-badge">
                    <span className="mon">{new Date(e.event_date).toLocaleDateString(undefined, { month: 'short' })}</span>
                    <span className="day">{new Date(e.event_date).getDate()}</span>
                  </span>
                )}
                <span className="event-info">
                  <span className="event-title">{e.event_name}</span>
                  <span className="event-sub">{e.venue || e.location || 'No venue set'}</span>
                </span>
                <span className="event-count">
                  <span className={`n ${e.player_count ? '' : 'zero'}`}>{e.player_count ?? 0}</span>
                  <span className="l">Registered</span>
                </span>
                <span className="chevron">
                  <ChevronIcon />
                </span>
              </Link>

              <div className="event-actions">
                <Link href={withOrg(`/organizer/events/${e.event_id}/batches`, orgParam)} className="chip">
                  <BatchIcon />
                  Batches
                </Link>
                <Link href={withOrg(`/organizer/events/${e.event_id}/scan-attendance`, orgParam)} className="chip">
                  <ScanIcon />
                  Scan attendance
                </Link>
                <Link href={withOrg(`/organizer/events/${e.event_id}/categories`, orgParam)} className="chip">
                  <CategoryIcon />
                  Configure categories
                </Link>
                <Link href={withOrg(`/organizer/events/${e.event_id}/settings`, orgParam)} className="chip">
                  <SettingsIcon />
                  Settings
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .head-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .head-row h1 {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.3px;
          margin: 0;
        }
        .head-row p {
          margin: 5px 0 0;
          font-size: 15px;
          color: #3a3d45;
          max-width: 52ch;
        }
        :global(.create-cta) {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
          border: none;
          border-radius: 14px;
          padding: 13px 24px;
          font-size: 14.5px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          text-decoration: none;
          background: linear-gradient(120deg, var(--color-accent-green), #00e676);
          box-shadow: 0 12px 24px -10px color-mix(in srgb, var(--color-accent-green) 55%, transparent);
        }
        :global(.create-cta svg) {
          width: 17px;
          height: 17px;
        }

        .events-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .event-card {
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 18px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -14px rgba(22, 24, 29, 0.16);
          overflow: hidden;
        }
        :global(.event-main) {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 18px;
          text-decoration: none;
          color: inherit;
          transition: background 0.15s ease;
        }
        :global(.event-main:hover) {
          background: color-mix(in srgb, var(--color-accent-green) 4%, transparent);
        }
        .date-badge {
          flex-shrink: 0;
          width: 50px;
          text-align: center;
          background: color-mix(in srgb, var(--color-accent-green) 10%, transparent);
          border-radius: 12px;
          padding: 7px 0;
        }
        .date-badge .mon {
          display: block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: var(--color-accent-green);
        }
        .date-badge .day {
          display: block;
          font-size: 18px;
          font-weight: 800;
          color: var(--color-ink);
          font-family: var(--font-mono);
        }
        .event-info {
          flex: 1;
          min-width: 0;
        }
        .event-title {
          font-size: 16px;
          font-weight: 700;
          display: block;
        }
        .event-sub {
          display: block;
          font-size: 13.5px;
          color: #3a3d45;
          font-weight: 500;
          margin-top: 3px;
        }
        .event-count {
          flex-shrink: 0;
          text-align: right;
        }
        .event-count .n {
          display: block;
          font-size: 18px;
          font-weight: 800;
          font-family: var(--font-mono);
        }
        .event-count .n.zero {
          color: #b7b3aa;
        }
        .event-count .l {
          display: block;
          font-size: 10.5px;
          color: var(--color-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .chevron {
          flex-shrink: 0;
          color: #c9c6bf;
        }
        .chevron :global(svg) {
          width: 17px;
          height: 17px;
          display: block;
        }

        .event-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 12px 18px 16px;
          border-top: 1px solid var(--color-line);
        }
        :global(.chip) {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 13px;
          border-radius: 10px;
          background: var(--color-bg);
          border: 1px solid var(--color-line);
          font-size: 13px;
          font-weight: 600;
          color: #3a3d45;
          text-decoration: none;
          transition: border-color 0.15s ease, color 0.15s ease;
        }
        :global(.chip:hover) {
          border-color: var(--color-accent-green);
          color: var(--color-accent-green);
        }
        :global(.chip svg) {
          width: 14px;
          height: 14px;
          flex-shrink: 0;
        }

        .empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 50px 20px;
          background: var(--color-surface);
          border: 1px dashed var(--color-line);
          border-radius: 18px;
          gap: 4px;
        }
        .empty-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: color-mix(in srgb, var(--color-accent-green) 12%, transparent);
          color: var(--color-accent-green);
        }
        .empty-icon :global(svg) {
          width: 26px;
          height: 26px;
        }
        .empty h2 {
          font-size: 16.5px;
          font-weight: 700;
          margin: 0 0 6px;
        }
        .empty p {
          font-size: 14px;
          color: #3a3d45;
          margin: 0 0 18px;
        }

        @media (max-width: 640px) {
          .head-row {
            flex-direction: column;
            align-items: stretch;
          }
          :global(.create-cta) {
            justify-content: center;
          }

          /* Long Silat event names ("Maharashtra State Pencak Silat
             Championship 2026") were wrapping to 4-5 lines next to the date
             badge and count, ballooning card height. Clamp instead of
             letting it run on -- desktop keeps the full title. */
          :global(.event-main) {
            gap: 12px;
            padding: 14px 14px;
          }
          .date-badge {
            width: 42px;
            padding: 6px 0;
          }
          .date-badge .day {
            font-size: 16px;
          }
          .event-title {
            font-size: 14.5px;
            line-height: 1.3;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .event-sub {
            font-size: 12px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .event-count {
            padding-left: 2px;
          }
          .event-count .n {
            font-size: 15px;
          }
          .event-count .l {
            font-size: 9px;
          }
        }
      `}</style>
    </div>
  );
}
