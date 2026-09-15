'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { playerApi } from '@/lib/api/player.api';
import type { Event } from '@/lib/types';

type EventFilter = 'all' | 'open' | 'registered' | 'pending';

const FILTERS: { key: EventFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'registered', label: 'Registered' },
  { key: 'pending', label: 'Pending' },
];

// Same three buckets the demo used: 'approved'/'pending' read straight off
// the row, everything else (including 'rejected', which the API already
// lets you register again for) counts as still-open.
function bucketOf(e: Event): Exclude<EventFilter, 'all'> {
  if (e.registration_status === 'approved') return 'registered';
  if (e.registration_status === 'pending') return 'pending';
  return 'open';
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth={1.5} />
      <path d="M3 8h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path
        d="M10 2.6c-3 0-5.4 2.3-5.4 5.5 0 4 5.4 9.3 5.4 9.3s5.4-5.3 5.4-9.3c0-3.2-2.4-5.5-5.4-5.5Z"
        stroke="currentColor"
        strokeWidth={1.4}
      />
      <circle cx="10" cy="8" r="1.8" stroke="currentColor" strokeWidth={1.4} />
    </svg>
  );
}

function CategoryIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path
        d="M10 2.6 15.5 5v4.4c0 4-2.4 6.8-5.5 8-3.1-1.2-5.5-4-5.5-8V5L10 2.6Z"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PlayerEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<EventFilter>('all');

  useEffect(() => {
    playerApi
      .events()
      .then((res) => {
        if (res.success && res.data) setEvents(res.data);
        else setError(res.message || 'Could not load events');
      })
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c = { all: events.length, open: 0, registered: 0, pending: 0 };
    for (const e of events) c[bucketOf(e)]++;
    return c;
  }, [events]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (filter !== 'all' && bucketOf(e) !== filter) return false;
      if (!q) return true;
      return (
        e.event_name.toLowerCase().includes(q) ||
        (e.venue || '').toLowerCase().includes(q) ||
        (e.location || '').toLowerCase().includes(q)
      );
    });
  }, [events, search, filter]);

  if (loading) return <p className="text-muted">Loading events…</p>;
  if (error) return <p className="text-corner-red">{error}</p>;

  return (
    <div className="page">
      <div className="head">
        <div>
          <h1>Events</h1>
          <p>
            <b>{counts.all}</b> event{counts.all === 1 ? '' : 's'}
            {counts.registered > 0 && (
              <>
                {' '}
                · you&apos;re registered for <b>{counts.registered}</b>
              </>
            )}
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">
            <CalendarIcon />
          </div>
          <h2>No events open yet</h2>
          <p>Your organizer hasn&apos;t published any tournaments right now. Check back soon.</p>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <div className="search">
              <svg viewBox="0 0 20 20" fill="none">
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth={1.6} />
                <path d="m17 17-4-4" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Search by event or venue"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="chips" role="group" aria-label="Filter events">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className="chip"
                  aria-pressed={filter === f.key}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label} · {counts[f.key]}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="text-sm text-muted">No events match your search or filter.</p>
          ) : (
            <div className="list">
              {visible.map((e) => {
                const bucket = bucketOf(e);
                return (
                  <div className="event" data-bucket={bucket} key={e.event_id}>
                    <div className="event-main">
                      <p className="event-name">{e.event_name}</p>
                      <div className="event-meta">
                        {e.event_date && (
                          <span className="when">
                            <CalendarIcon />
                            {new Date(e.event_date).toLocaleDateString(undefined, {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                        {(e.venue || e.location) && (
                          <span>
                            <PinIcon />
                            {e.venue || e.location}
                          </span>
                        )}
                      </div>
                      {e.event_category && (
                        <>
                          <span className="cat-badge">
                            <CategoryIcon />
                            {e.event_category}
                          </span>
                          {(e.age_category || e.weight_category) && (
                            <span className="cat-sub">
                              {' '}
                              · {[e.age_category, e.weight_category].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    <div className="event-action">
                      {bucket === 'registered' && (
                        <span className="status-pill approved">
                          <svg viewBox="0 0 20 20" fill="none">
                            <path
                              d="m4 10.5 3.5 3.5L16 5.5"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          Registered
                        </span>
                      )}
                      {bucket === 'pending' && (
                        <span className="status-pill pending">
                          <svg viewBox="0 0 20 20" fill="none">
                            <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth={1.6} />
                            <path d="M10 6.5V10l2.6 1.5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
                          </svg>
                          Pending
                        </span>
                      )}
                      {bucket === 'open' && (
                        <>
                          <Link href={`/player/events/${e.event_id}/register`} className="cta">
                            Register
                          </Link>
                          {e.registration_status === 'rejected' && (
                            <span className="reopen-hint">Last entry wasn&apos;t approved — you can register again</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .head h1 {
          font-size: 23px;
          font-weight: 800;
          letter-spacing: -0.3px;
          margin: 0;
        }
        .head p {
          margin: 4px 0 0;
          font-size: 13.5px;
          color: var(--color-muted);
        }
        .head p b {
          color: var(--color-ink);
          font-weight: 700;
        }

        .toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .search {
          position: relative;
          display: flex;
          align-items: center;
          flex: 1 1 220px;
          border: 1.5px solid var(--color-line);
          border-radius: 14px;
          background: var(--color-surface);
          transition: border-color 0.2s ease, box-shadow 0.15s ease;
        }
        .search:focus-within {
          border-color: var(--color-accent-blue);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent-blue) 14%, transparent);
        }
        .search :global(svg) {
          width: 16px;
          height: 16px;
          margin-left: 13px;
          color: var(--color-muted);
          flex-shrink: 0;
        }
        .search input {
          border: none;
          outline: none;
          background: transparent;
          width: 100%;
          padding: 10px 12px;
          font-family: inherit;
          font-size: 13.5px;
          color: var(--color-ink);
        }
        .search input::placeholder {
          color: #9aa0ac;
        }

        .chips {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
        }
        .chip {
          appearance: none;
          border: 1.5px solid var(--color-line);
          background: var(--color-surface);
          border-radius: 999px;
          padding: 9px 15px;
          cursor: pointer;
          font-family: inherit;
          font-size: 12.5px;
          font-weight: 600;
          color: #3a3d45;
          transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
          white-space: nowrap;
        }
        .chip[aria-pressed='true'] {
          background: linear-gradient(120deg, var(--color-accent-blue), #00b8d9);
          border-color: transparent;
          color: #fff;
          box-shadow: 0 6px 14px -7px color-mix(in srgb, var(--color-accent-blue) 55%, transparent);
        }

        .list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .event {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 18px;
          padding: 16px 18px 16px 21px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -14px rgba(22, 24, 29, 0.16);
        }
        .event::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 3.5px;
          background: var(--color-line);
        }
        .event[data-bucket='registered']::before {
          background: var(--color-accent-green);
        }
        .event[data-bucket='pending']::before {
          background: var(--color-status-pending);
        }

        .event-main {
          min-width: 0;
        }
        .event-name {
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.1px;
          margin: 0 0 6px;
        }
        .event-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 5px 14px;
          margin-bottom: 9px;
        }
        .event-meta span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12.5px;
          color: var(--color-muted);
        }
        .event-meta :global(svg) {
          width: 13px;
          height: 13px;
          flex-shrink: 0;
          color: #9aa0ac;
        }
        .event-meta .when {
          font-family: var(--font-mono);
          font-weight: 600;
          color: #3a3d45;
        }
        .event-meta .when :global(svg) {
          color: var(--color-accent-blue);
        }

        .cat-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: color-mix(in srgb, var(--color-accent-violet) 11%, transparent);
          color: var(--color-accent-violet);
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.2px;
          padding: 4px 10px;
          border-radius: 999px;
        }
        .cat-badge :global(svg) {
          width: 11px;
          height: 11px;
        }
        .cat-sub {
          font-size: 12px;
          color: var(--color-muted);
        }

        .event-action {
          flex-shrink: 0;
          text-align: right;
        }
        :global(.cta) {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: none;
          border-radius: 11px;
          padding: 9px 16px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          background: linear-gradient(120deg, var(--color-accent-blue), #00b8d9);
          box-shadow: 0 8px 16px -8px color-mix(in srgb, var(--color-accent-blue) 55%, transparent);
          cursor: pointer;
          white-space: nowrap;
          text-decoration: none;
        }
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border-radius: 999px;
          padding: 6px 13px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }
        .status-pill.approved {
          background: color-mix(in srgb, var(--color-accent-green) 15%, transparent);
          color: #0a8a3f;
        }
        .status-pill.pending {
          background: color-mix(in srgb, var(--color-status-pending) 18%, transparent);
          color: #93710f;
        }
        .status-pill :global(svg) {
          width: 12px;
          height: 12px;
        }
        .reopen-hint {
          display: block;
          margin-top: 6px;
          font-size: 11px;
          color: var(--color-muted);
          max-width: 128px;
        }

        .empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 64px 20px 40px;
        }
        .empty-icon {
          width: 62px;
          height: 62px;
          border-radius: 18px;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: color-mix(in srgb, var(--color-accent-blue) 12%, transparent);
          color: var(--color-accent-blue);
        }
        .empty-icon :global(svg) {
          width: 28px;
          height: 28px;
        }
        .empty h2 {
          font-size: 17px;
          font-weight: 700;
          margin: 0 0 6px;
        }
        .empty p {
          font-size: 13.5px;
          color: var(--color-muted);
          max-width: 300px;
          margin: 0;
          line-height: 1.55;
        }
      `}</style>
    </div>
  );
}
