'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { organizerApi } from '@/lib/api/organizer.api';
import type { AttendanceList, Event, OrganizerDashboardData } from '@/lib/types';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth={1.5} />
      <path d="M3 8h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
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
function PeopleIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <circle cx="7" cy="6.5" r="2.6" stroke="currentColor" strokeWidth={1.5} />
      <circle cx="14" cy="7.5" r="2.1" stroke="currentColor" strokeWidth={1.5} />
      <path
        d="M2.5 16c.5-3.4 2.3-5 4.5-5s4 1.6 4.5 5M12.5 16c.4-2.6 1.6-4 3.5-4s2.9 1.4 3.3 4"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth={1.6} />
      <path d="M10 6.5V10l2.6 1.5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
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
function ListIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path d="M4 5.5h9M4 10h9M4 14.5h5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      <circle cx="16" cy="14.5" r="1.4" fill="currentColor" />
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path d="M11 2 4 11h5l-1 7 7-9h-5l1-7Z" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" />
    </svg>
  );
}

export default function OrganizerHome() {
  const router = useRouter();
  const [data, setData] = useState<OrganizerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Attendance lists have no cross-event fetch of their own (getAttendanceLists
  // takes one eventId at a time -- same as mobile, which never needed an
  // aggregate view either). Built here by querying it once per recent event
  // and merging on the client, not by adding a new backend endpoint.
  const [recentLists, setRecentLists] = useState<(AttendanceList & { event_name?: string })[]>([]);
  const [listsLoading, setListsLoading] = useState(true);

  // Rapid mode picker needs every event, not just the 5 "recent" ones the
  // dashboard payload carries -- an organizer running rapid mode for an
  // older still-open event shouldn't find it missing from the dropdown.
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [rapidEventId, setRapidEventId] = useState('');

  useEffect(() => {
    organizerApi
      .dashboard()
      .then(async (res) => {
        if (!res.success || !res.data) {
          setError(res.message || 'Could not load dashboard');
          return;
        }
        setData(res.data);

        const perEventLists = await Promise.all(
          res.data.recent_events.map((e) =>
            organizerApi.getAttendanceLists(e.event_id).then((r) => (r.success && r.data ? r.data.map((l) => ({ ...l, event_name: e.event_name })) : [])),
          ),
        );
        setRecentLists(
          perEventLists
            .flat()
            .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
            .slice(0, 5),
        );
        setListsLoading(false);
      })
      .finally(() => setLoading(false));

    organizerApi.events().then((res) => {
      if (res.success && res.data) {
        setAllEvents(res.data);
        if (res.data[0]) setRapidEventId(res.data[0].event_id);
      }
    });
  }, []);

  function handleStartRapid() {
    if (rapidEventId) router.push(`/organizer/events/${rapidEventId}/rapid-mode`);
  }

  if (loading) return <p className="text-muted">Loading dashboard…</p>;
  if (error) return <p className="text-corner-red">{error}</p>;
  if (!data) return <p className="text-corner-red">Dashboard not found.</p>;

  const { organizer, stats, recent_events } = data;
  const pending = stats.pending_registrations ?? 0;

  return (
    <div className="page">
      <div className="top-row">
        <div className="welcome-card">
          <span className="welcome-avatar">{initials(organizer.name)}</span>
          <div>
            <div className="welcome-name">Welcome, {organizer.name}</div>
            <div className="welcome-email">{organizer.email}</div>
          </div>
        </div>
        <Link href="/organizer/events/new" className="create-cta">
          <PlusIcon />
          Create event
        </Link>
      </div>

      <div>
        <p className="section-title">Overview</p>
        <div className="stats-row">
          <div className="stat-tile">
            <div className="stat-icon" style={{ background: 'color-mix(in srgb, var(--color-accent-green) 14%, transparent)', color: 'var(--color-accent-green)' }}>
              <CalendarIcon />
            </div>
            <div className="stat-value">{stats.total_events}</div>
            <div className="stat-label">Events</div>
          </div>
          <div className="stat-tile">
            <div className="stat-icon" style={{ background: 'color-mix(in srgb, var(--color-accent-blue) 14%, transparent)', color: 'var(--color-accent-blue)' }}>
              <BatchIcon />
            </div>
            <div className="stat-value">{stats.total_batches}</div>
            <div className="stat-label">Batches</div>
          </div>
          <div className="stat-tile">
            <div className="stat-icon" style={{ background: 'color-mix(in srgb, var(--color-accent-violet) 14%, transparent)', color: 'var(--color-accent-violet)' }}>
              <PeopleIcon />
            </div>
            <div className="stat-value">{stats.total_registrations}</div>
            <div className="stat-label">Registrations</div>
          </div>
          <div className="stat-tile">
            <div className="stat-icon" style={{ background: 'color-mix(in srgb, var(--color-status-pending) 20%, transparent)', color: '#93710f' }}>
              <ClockIcon />
            </div>
            <div className="stat-value">{stats.active_today ?? 0}</div>
            <div className="stat-label">Active today</div>
          </div>
        </div>
      </div>

      {pending > 0 && (
        <Link href="/organizer/events" className="attention">
          <span className="attention-icon">
            <ClockIcon />
          </span>
          <span className="attention-text">
            <b>
              {pending} registration{pending === 1 ? '' : 's'}
            </b>{' '}
            waiting on your approval.
          </span>
          <span className="attention-link">Review →</span>
        </Link>
      )}

      <div>
        <div className="list-head">
          <p className="section-title" style={{ margin: 0 }}>
            Recent events
          </p>
          <Link href="/organizer/events" className="view-all">
            View all →
          </Link>
        </div>

        {recent_events.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">
              <CalendarIcon />
            </div>
            <h2>No events yet</h2>
            <p>Create your first event to start taking registrations.</p>
            <Link href="/organizer/events/new" className="create-cta">
              <PlusIcon />
              Create event
            </Link>
          </div>
        ) : (
          <div className="events-list">
            {recent_events.map((e) => (
              <Link key={e.event_id} href={`/organizer/events/${e.event_id}/registrations`} className="event-row">
                {e.event_date && (
                  <span className="date-badge">
                    <span className="mon">{new Date(e.event_date).toLocaleDateString(undefined, { month: 'short' })}</span>
                    <span className="day">{new Date(e.event_date).getDate()}</span>
                  </span>
                )}
                <span className="event-main">
                  <span className="event-title">{e.event_name}</span>
                  <span className="event-sub">{e.venue || e.location || 'No venue set'}</span>
                </span>
                <span className="event-count">
                  <span className="n">{e.player_count ?? 0}</span>
                  <span className="l">Registered</span>
                </span>
                <span className="chevron">
                  <ChevronIcon />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="section-title">Quick tools</p>
        <div className="tools-grid">
          <div className="tool-card">
            <div className="tool-head">
              <span className="tool-icon" style={{ background: 'color-mix(in srgb, var(--color-accent-violet) 14%, transparent)', color: 'var(--color-accent-violet)' }}>
                <ListIcon />
              </span>
              <span className="tool-title">Attendance lists</span>
            </div>

            {listsLoading ? (
              <p className="tool-empty">Loading…</p>
            ) : recentLists.length === 0 ? (
              <p className="tool-empty">No attendance lists yet.</p>
            ) : (
              recentLists.map((l) => (
                <Link key={l.list_id} href={`/organizer/lists/${l.list_id}/scan`} className="tool-row">
                  <span className="tool-row-title">{l.purpose || l.mode || 'Attendance list'}</span>
                  <span className="tool-row-meta">{l.event_name}</span>
                </Link>
              ))
            )}
          </div>

          <div className="tool-card">
            <div className="tool-head">
              <span className="tool-icon" style={{ background: 'color-mix(in srgb, var(--color-accent-green) 14%, transparent)', color: 'var(--color-accent-green)' }}>
                <BoltIcon />
              </span>
              <span className="tool-title">Rapid mode</span>
            </div>
            <p className="tool-desc">Live bracket conducting for one event at a time — pick which.</p>

            {allEvents.length === 0 ? (
              <p className="tool-empty">Create an event first.</p>
            ) : (
              <>
                <select className="tool-select" value={rapidEventId} onChange={(e) => setRapidEventId(e.target.value)}>
                  {allEvents.map((e) => (
                    <option key={e.event_id} value={e.event_id}>
                      {e.event_name}
                    </option>
                  ))}
                </select>
                <button className="tool-start" onClick={handleStartRapid}>
                  Start rapid mode
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 26px;
        }

        .top-row {
          display: flex;
          align-items: stretch;
          gap: 14px;
          flex-wrap: wrap;
        }
        .welcome-card {
          flex: 1;
          min-width: 260px;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          gap: 16px;
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 22px;
          padding: 18px 22px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -12px rgba(22, 24, 29, 0.14);
        }
        .welcome-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(180deg, var(--color-accent-green), #00e676);
        }
        .welcome-avatar {
          width: 54px;
          height: 54px;
          border-radius: 16px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-accent-green), #00e676);
          color: #fff;
          font-weight: 800;
          font-size: 19px;
          box-shadow: 0 8px 16px -8px color-mix(in srgb, var(--color-accent-green) 55%, transparent);
        }
        .welcome-name {
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.2px;
        }
        .welcome-email {
          font-size: 12.5px;
          color: var(--color-muted);
          margin-top: 2px;
        }
        :global(.create-cta) {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
          border: none;
          border-radius: 18px;
          padding: 0 26px;
          font-size: 14.5px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          text-decoration: none;
          background: linear-gradient(120deg, var(--color-accent-green), #00e676);
          box-shadow: 0 12px 24px -10px color-mix(in srgb, var(--color-accent-green) 55%, transparent);
          transition: transform 0.1s ease;
        }
        :global(.create-cta:active) {
          transform: translateY(1px);
        }
        :global(.create-cta svg) {
          width: 17px;
          height: 17px;
        }

        .section-title {
          font-size: 14px;
          font-weight: 700;
          color: #3a3d45;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin: 0 0 12px;
        }
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        .stat-tile {
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 18px;
          padding: 16px 14px;
          text-align: center;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -12px rgba(22, 24, 29, 0.14);
        }
        .stat-icon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          margin: 0 auto 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-icon :global(svg) {
          width: 18px;
          height: 18px;
        }
        .stat-value {
          font-size: 30px;
          font-weight: 800;
          letter-spacing: -0.4px;
          color: var(--color-ink);
          line-height: 1.1;
        }
        .stat-label {
          font-size: 13px;
          color: #3a3d45;
          font-weight: 700;
          margin-top: 4px;
        }

        :global(.attention) {
          display: flex;
          align-items: center;
          gap: 14px;
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 18px;
          padding: 15px 18px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -12px rgba(22, 24, 29, 0.14);
          text-decoration: none;
          color: inherit;
          transition: box-shadow 0.15s ease, transform 0.15s ease;
        }
        :global(.attention:hover) {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(22, 24, 29, 0.05), 0 14px 26px -12px rgba(22, 24, 29, 0.2);
        }
        .attention-icon {
          width: 38px;
          height: 38px;
          border-radius: 11px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: color-mix(in srgb, var(--color-status-pending) 18%, transparent);
          color: #93710f;
        }
        .attention-icon :global(svg) {
          width: 18px;
          height: 18px;
        }
        .attention-text {
          flex: 1;
          font-size: 13.5px;
        }
        .attention-link {
          flex-shrink: 0;
          font-size: 13px;
          font-weight: 700;
          color: var(--color-accent-green);
          white-space: nowrap;
        }

        .list-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        :global(.view-all) {
          font-size: 13px;
          font-weight: 700;
          color: var(--color-accent-green);
          text-decoration: none;
        }
        .events-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        :global(.event-row) {
          display: flex;
          align-items: center;
          gap: 14px;
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 16px;
          padding: 13px 16px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 8px 18px -12px rgba(22, 24, 29, 0.14);
          text-decoration: none;
          color: inherit;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        :global(.event-row:hover) {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(22, 24, 29, 0.05), 0 12px 22px -12px rgba(22, 24, 29, 0.2);
        }
        .date-badge {
          flex-shrink: 0;
          width: 46px;
          text-align: center;
          background: color-mix(in srgb, var(--color-accent-green) 10%, transparent);
          border-radius: 11px;
          padding: 6px 0;
        }
        .date-badge .mon {
          display: block;
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: var(--color-accent-green);
        }
        .date-badge .day {
          display: block;
          font-size: 17px;
          font-weight: 800;
          color: var(--color-ink);
          font-family: var(--font-mono);
        }
        .event-main {
          flex: 1;
          min-width: 0;
        }
        .event-title {
          font-size: 14.5px;
          font-weight: 700;
        }
        .event-sub {
          display: block;
          font-size: 13px;
          color: #3a3d45;
          font-weight: 600;
          margin-top: 2px;
        }
        .event-count {
          flex-shrink: 0;
          text-align: right;
        }
        .event-count .n {
          display: block;
          font-size: 16px;
          font-weight: 800;
          font-family: var(--font-mono);
        }
        .event-count .l {
          display: block;
          font-size: 10px;
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
          width: 16px;
          height: 16px;
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
          font-size: 15.5px;
          font-weight: 700;
          margin: 0 0 5px;
        }
        .empty p {
          font-size: 13px;
          color: var(--color-muted);
          margin: 0 0 16px;
        }

        .tools-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
          max-width: 700px;
        }
        .tool-card {
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 18px;
          padding: 16px 18px 18px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -14px rgba(22, 24, 29, 0.16);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .tool-head {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 6px;
        }
        .tool-icon {
          width: 30px;
          height: 30px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .tool-icon :global(svg) {
          width: 15px;
          height: 15px;
        }
        .tool-title {
          font-size: 14px;
          font-weight: 700;
        }
        .tool-desc {
          font-size: 12px;
          color: var(--color-muted);
          margin: -2px 0 6px;
          line-height: 1.5;
        }
        :global(.tool-row) {
          display: flex;
          flex-direction: column;
          gap: 1px;
          padding: 8px 0;
          border-bottom: 1px solid var(--color-line);
          text-decoration: none;
          color: inherit;
        }
        :global(.tool-row:last-of-type) {
          border-bottom: none;
        }
        .tool-row-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--color-ink);
        }
        .tool-row-meta {
          font-size: 11.5px;
          color: var(--color-muted);
          font-weight: 500;
        }
        .tool-empty {
          font-size: 12.5px;
          color: var(--color-muted);
          padding: 6px 0;
          margin: 0;
        }
        .tool-select {
          width: 100%;
          border: 1.5px solid var(--color-line);
          border-radius: 10px;
          padding: 9px 10px;
          font-size: 13px;
          font-family: inherit;
          color: var(--color-ink);
          background: var(--color-surface);
        }
        .tool-start {
          margin-top: 8px;
          border: none;
          border-radius: 10px;
          padding: 10px;
          font-size: 13.5px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          background: linear-gradient(120deg, var(--color-accent-green), #00e676);
          font-family: inherit;
        }

        @media (max-width: 640px) {
          .stats-row {
            grid-template-columns: repeat(2, 1fr);
          }
          .top-row {
            flex-direction: column;
          }
          :global(.create-cta) {
            align-self: stretch;
            justify-content: center;
            padding: 13px;
          }
        }
        @media (max-width: 900px) {
          .tools-grid {
            grid-template-columns: 1fr;
            max-width: none;
          }
        }
      `}</style>
    </div>
  );
}
