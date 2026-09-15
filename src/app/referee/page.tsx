'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { refereeApi } from '@/lib/api/referee.api';
import type { RefereeDashboardData, RefereeMatch } from '@/lib/types';

const QUICK_ACTIONS = [
  {
    href: '/referee/matches',
    label: 'Matches',
    gradient: 'linear-gradient(135deg,var(--color-accent-indigo),var(--color-accent-blue))',
  },
  { href: '/referee/id-card', label: 'ID Card', gradient: 'linear-gradient(135deg,#16205C,var(--color-accent-indigo))' },
  { href: '/referee/profile', label: 'Profile', gradient: 'linear-gradient(135deg,var(--color-accent-blue),#5B6EE8)' },
] as const;

function ActionIcon({ label }: { label: (typeof QUICK_ACTIONS)[number]['label'] }) {
  switch (label) {
    case 'Matches':
      return (
        <svg viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="6.5" stroke="#fff" strokeWidth={1.5} />
          <path d="M10 6.5V10l2.6 1.5" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
        </svg>
      );
    case 'ID Card':
      return (
        <svg viewBox="0 0 20 20" fill="none">
          <rect x="3" y="4" width="14" height="12" rx="2" stroke="#fff" strokeWidth={1.5} />
          <circle cx="7.5" cy="9" r="1.6" stroke="#fff" strokeWidth={1.3} />
          <path
            d="M5.5 14c.4-1.7 1.5-2.5 2.7-2.5S10.4 12.3 11 14M13 8h2.2M13 10.5h2.2"
            stroke="#fff"
            strokeWidth={1.2}
            strokeLinecap="round"
          />
        </svg>
      );
    case 'Profile':
      return (
        <svg viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="7" r="3.2" stroke="#fff" strokeWidth={1.5} />
          <path d="M4 17c.6-4 3-6.2 6-6.2S15.4 13 16 17" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
        </svg>
      );
  }
}

function EventsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth={1.5} />
      <path d="M3 8h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}
function MatchesIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth={1.5} />
      <path d="M10 6.5V10l2.6 1.5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}
function TodayIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path
        d="M10 2.6 15.5 5v4.4c0 4-2.4 6.8-5.5 8-3.1-1.2-5.5-4-5.5-8V5L10 2.6Z"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </svg>
  );
}
function UpcomingIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path d="m5 12 4 4 6-9" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path d="M4 10.5 8 14l8-9" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Real fields only -- matches()/dashboard() don't join an event/batch name
 *  onto a match row, so this never invents one. round_number/match_number
 *  are the real columns available instead. */
function matchLabel(m: RefereeMatch) {
  if (m.round_number) return `Round ${m.round_number}`;
  if (m.match_number) return `Match ${m.match_number}`;
  return 'Match';
}

const STATUS_TINT: Record<string, string> = {
  scheduled: 'var(--color-muted)',
  in_progress: 'var(--color-accent-blue)',
};

export default function RefereeDashboardPage() {
  const [data, setData] = useState<RefereeDashboardData | null>(null);
  const [todayMatches, setTodayMatches] = useState<RefereeMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([refereeApi.dashboard(), refereeApi.matches()])
      .then(([dashRes, matchesRes]) => {
        if (dashRes.success && dashRes.data) setData(dashRes.data);
        else setError(dashRes.message || 'Could not load dashboard');

        if (matchesRes.success && matchesRes.data) {
          const todayKey = new Date().toDateString();
          setTodayMatches(
            matchesRes.data
              .filter(
                (m) => m.scheduled_at && new Date(m.scheduled_at).toDateString() === todayKey && m.status !== 'completed',
              )
              .slice(0, 3),
          );
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted">Loading dashboard…</p>;
  if (error) return <p className="text-corner-red">{error}</p>;
  if (!data) return null;

  const { referee, stats, assigned_events } = data;

  // Real content only -- district/state is the same fallback player's own
  // dashboard uses when there's no more specific fact to show.
  const rightMeta =
    referee.district || referee.state
      ? { label: 'Location', value: [referee.district, referee.state].filter(Boolean).join(', ') }
      : null;

  return (
    <div className="dash">
      <div className="top-row">
        <div className="welcome-card">
          {referee.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={referee.photo} alt="" className="avatar-photo" />
          ) : (
            <div className="avatar">{initials(referee.name)}</div>
          )}
          <div>
            <div className="welcome-name">
              Welcome, {referee.name}
              {todayMatches.length > 0 && (
                <span className="duty-chip">
                  <svg viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth={1.6} />
                    <path d="M10 6v4l2.4 1.4" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
                  </svg>
                  On duty today
                </span>
              )}
            </div>
            <div className="welcome-email">{referee.email}</div>
          </div>
          {rightMeta && (
            <div className="id-meta">
              <span className="id-meta-label">{rightMeta.label}</span>
              <span className="id-meta-value">{rightMeta.value}</span>
            </div>
          )}
        </div>
      </div>

      <section>
        <p className="section-title">Quick actions</p>
        <div className="actions-row">
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.href} href={a.href} className="action">
              <span className="action-icon" style={{ background: a.gradient }}>
                <ActionIcon label={a.label} />
              </span>
              <span className="action-label">{a.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <p className="section-title">Your stats</p>
        <div className="stats-row">
          <div className="stat-tile">
            <div
              className="stat-icon"
              style={{ background: 'color-mix(in srgb, #16205C 14%, transparent)', color: '#16205C' }}
            >
              <EventsIcon />
            </div>
            <div className="stat-value">{stats.events_assigned}</div>
            <div className="stat-label">Events</div>
          </div>
          <div className="stat-tile">
            <div
              className="stat-icon"
              style={{ background: 'color-mix(in srgb, var(--color-accent-blue) 14%, transparent)', color: 'var(--color-accent-blue)' }}
            >
              <MatchesIcon />
            </div>
            <div className="stat-value">{stats.matches_total}</div>
            <div className="stat-label">Total matches</div>
          </div>
          <div className="stat-tile">
            <div
              className="stat-icon"
              style={{ background: 'color-mix(in srgb, var(--color-status-pending) 20%, transparent)', color: '#93710f' }}
            >
              <TodayIcon />
            </div>
            <div className="stat-value">{stats.matches_today}</div>
            <div className="stat-label">Today</div>
          </div>
          <div className="stat-tile">
            <div
              className="stat-icon"
              style={{ background: 'color-mix(in srgb, var(--color-accent-indigo) 14%, transparent)', color: 'var(--color-accent-indigo)' }}
            >
              <UpcomingIcon />
            </div>
            <div className="stat-value">{stats.upcoming}</div>
            <div className="stat-label">Upcoming</div>
          </div>
        </div>
      </section>

      {todayMatches.length > 0 && (
        <Link href="/referee/matches" className="attention">
          <span className="attention-icon">
            <TodayIcon />
          </span>
          <span className="attention-text">
            <b>
              {todayMatches.length} match{todayMatches.length === 1 ? '' : 'es'}
            </b>{' '}
            scheduled today.
          </span>
          <span className="attention-link">Go to Matches →</span>
        </Link>
      )}

      {todayMatches.length > 0 && (
        <section>
          <p className="section-title">Today&apos;s matches</p>
          <div className="matches-list">
            {todayMatches.map((m) => {
              const tint = (m.status && STATUS_TINT[m.status]) || 'var(--color-muted)';
              return (
                <div className="match-card" key={m.match_id}>
                  <div className="match-top">
                    <span className="match-event">
                      {matchLabel(m)}
                      {m.status && (
                        <span
                          className="match-status"
                          style={{ color: tint, background: `color-mix(in srgb, ${tint} 12%, transparent)` }}
                        >
                          {m.status.replace(/_/g, ' ')}
                        </span>
                      )}
                    </span>
                    {m.scheduled_at && (
                      <span className="match-when">
                        {new Date(m.scheduled_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <div className="match-vs">
                    <span className="side p1">
                      <span className="corner-dot" style={{ background: 'var(--color-corner-red)' }} />
                      <span className="name">{m.player1_name || 'TBD'}</span>
                    </span>
                    <span className="vs-mid">VS</span>
                    <span className="side p2">
                      <span className="corner-dot" style={{ background: 'var(--color-accent-blue)' }} />
                      <span className="name">{m.player2_name || 'TBD'}</span>
                    </span>
                  </div>
                  <Link href="/referee/matches" className="record-btn">
                    <CheckIcon />
                    Record result
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <p className="section-title">Assigned events</p>
        {assigned_events.length === 0 ? (
          <p className="text-sm text-muted">No events assigned yet.</p>
        ) : (
          <div className="events-list">
            {assigned_events.map((e) => (
              <div key={e.event_id} className="event-row">
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
              </div>
            ))}
          </div>
        )}
      </section>

      <Link href="/referee/matches" className="browse-link">
        View my matches →
      </Link>

      <style jsx>{`
        .dash {
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
          border: 1px solid var(--color-line);
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
          background: linear-gradient(180deg, var(--color-accent-indigo), var(--color-accent-blue));
        }
        .avatar,
        .avatar-photo {
          width: 54px;
          height: 54px;
          border-radius: 16px;
          flex-shrink: 0;
          position: relative;
          z-index: 1;
          object-fit: cover;
        }
        .avatar {
          background: linear-gradient(135deg, var(--color-accent-indigo), var(--color-accent-blue));
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 800;
          font-size: 19px;
          box-shadow: 0 8px 16px -8px color-mix(in srgb, var(--color-accent-indigo) 55%, transparent);
        }
        .welcome-name {
          position: relative;
          z-index: 1;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.2px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .welcome-email {
          position: relative;
          z-index: 1;
          font-size: 12.5px;
          color: var(--color-muted);
          margin-top: 2px;
        }
        .duty-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: color-mix(in srgb, var(--color-status-pending) 18%, transparent);
          color: #7a5e10;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 999px;
        }
        .duty-chip svg {
          width: 10px;
          height: 10px;
        }
        .id-meta {
          margin-left: auto;
          text-align: right;
          position: relative;
          z-index: 1;
          padding-left: 20px;
          border-left: 1px solid var(--color-line);
        }
        .id-meta-label {
          display: block;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 1px;
          color: var(--color-muted);
          text-transform: uppercase;
        }
        .id-meta-value {
          display: block;
          font-size: 15.5px;
          font-weight: 700;
          color: #3a3d45;
          margin-top: 4px;
        }

        .section-title {
          font-size: 14px;
          font-weight: 700;
          color: #3a3d45;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin: 0 0 12px;
        }

        .actions-row {
          display: flex;
          justify-content: flex-start;
          gap: 22px;
          flex-wrap: wrap;
        }
        :global(.action) {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          width: 76px;
          text-decoration: none;
        }
        .action-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 18px -10px rgba(22, 24, 29, 0.35);
        }
        .action-icon :global(svg) {
          width: 22px;
          height: 22px;
        }
        .action-label {
          font-size: 12px;
          font-weight: 600;
          color: #3a3d45;
          text-align: center;
        }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        @media (max-width: 640px) {
          .stats-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .stat-tile {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
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
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.4px;
          color: var(--color-ink);
          line-height: 1.1;
        }
        .stat-label {
          font-size: 12.5px;
          color: var(--color-muted);
          font-weight: 700;
          margin-top: 4px;
        }

        :global(.attention) {
          display: flex;
          align-items: center;
          gap: 14px;
          background: var(--color-surface);
          border: 1px solid var(--color-line);
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
          background: color-mix(in srgb, var(--color-status-pending) 20%, transparent);
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
          color: var(--color-accent-indigo);
          white-space: nowrap;
        }

        .matches-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .match-card {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 18px;
          padding: 14px 16px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -12px rgba(22, 24, 29, 0.14);
        }
        .match-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
          gap: 10px;
          flex-wrap: wrap;
        }
        .match-event {
          font-size: 13.5px;
          font-weight: 700;
          color: #3a3d45;
        }
        .match-status {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          text-transform: capitalize;
          padding: 2px 7px;
          border-radius: 6px;
          margin-left: 8px;
        }
        .match-when {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--color-muted);
        }
        .match-vs {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }
        .side {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 15px;
          font-weight: 700;
          min-width: 0;
        }
        .side .name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .side.p1 {
          color: var(--color-corner-red);
        }
        .side.p2 {
          color: var(--color-accent-blue);
          flex-direction: row-reverse;
          text-align: right;
        }
        .corner-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .vs-mid {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--color-muted);
          letter-spacing: 0.5px;
          flex-shrink: 0;
        }
        :global(.record-btn) {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          border: none;
          border-radius: 12px;
          padding: 9px 0;
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          text-decoration: none;
          background: linear-gradient(120deg, var(--color-accent-blue), #00b8d9);
          box-shadow: 0 10px 20px -10px color-mix(in srgb, var(--color-accent-blue) 55%, transparent);
        }
        .record-btn :global(svg) {
          width: 14px;
          height: 14px;
        }

        .events-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .event-row {
          display: flex;
          align-items: center;
          gap: 14px;
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 16px;
          padding: 13px 16px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 8px 18px -12px rgba(22, 24, 29, 0.14);
        }
        .date-badge {
          flex-shrink: 0;
          width: 46px;
          text-align: center;
          background: color-mix(in srgb, var(--color-accent-indigo) 12%, transparent);
          border-radius: 11px;
          padding: 6px 0;
        }
        .date-badge .mon {
          display: block;
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: var(--color-accent-indigo);
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
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        :global(.browse-link) {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 14.5px;
          font-weight: 700;
          color: var(--color-accent-indigo);
          text-decoration: none;
          align-self: flex-start;
        }
      `}</style>
    </div>
  );
}
