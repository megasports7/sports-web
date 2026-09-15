'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { playerApi } from '@/lib/api/player.api';
import type { PlayerDashboardData } from '@/lib/types';

const QUICK_ACTIONS = [
  { href: '/player/events', label: 'Events', gradient: 'linear-gradient(135deg,var(--color-accent-blue),#00b8d9)' },
  {
    href: '/player/matches',
    label: 'Matches',
    gradient: 'linear-gradient(135deg,var(--color-accent-violet),var(--color-accent-blue))',
  },
  {
    href: '/player/certificates',
    label: 'Certificates',
    gradient: 'linear-gradient(135deg,#F0A500,var(--color-gold-tint))',
  },
  { href: '/player/id-card', label: 'ID Card', gradient: 'linear-gradient(135deg,#16205C,#3B4CCB)' },
  { href: '/player/profile', label: 'Profile', gradient: 'linear-gradient(135deg,var(--color-accent-blue),#5B6EE8)' },
] as const;

function ActionIcon({ label }: { label: (typeof QUICK_ACTIONS)[number]['label'] }) {
  switch (label) {
    case 'Events':
      return (
        <svg viewBox="0 0 20 20" fill="none">
          <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="#fff" strokeWidth={1.5} />
          <path d="M3 8h14M7 3v3M13 3v3" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
        </svg>
      );
    case 'Matches':
      return (
        <svg viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="6.5" stroke="#fff" strokeWidth={1.5} />
          <path d="M10 6.5V10l2.6 1.5" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
        </svg>
      );
    case 'Certificates':
      return (
        <svg viewBox="0 0 20 20" fill="none">
          <path
            d="M10 12.5 5.5 17l1-5.3L3 8.2l5.4-.6L10 2.6l1.6 5 5.4.6-3.5 3.5 1 5.3Z"
            stroke="#fff"
            strokeWidth={1.3}
            strokeLinejoin="round"
          />
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

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function PlayerDashboardPage() {
  const [data, setData] = useState<PlayerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    playerApi
      .dashboard()
      .then((res) => {
        if (res.success && res.data) setData(res.data);
        else setError(res.message || 'Could not load dashboard');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted">Loading dashboard…</p>;
  if (error) return <p className="text-corner-red">{error}</p>;
  if (!data) return null;

  const { player, stats, upcoming_matches } = data;

  const idNumber =
    player.id_number || player.nsrd_id || (player.player_id ? `#${player.player_id}` : player.id.slice(0, 8));

  // Real content only -- prefer the ID card's actual validity date; fall
  // back to location if that's not set, and simply omit the block rather
  // than invent a fact the profile doesn't have.
  const rightMeta = player.id_valid_until
    ? { label: 'ID valid until', value: new Date(player.id_valid_until).toLocaleDateString() }
    : player.district || player.state
      ? { label: 'Location', value: [player.district, player.state].filter(Boolean).join(', ') }
      : null;

  return (
    <div className="dash">
      <div className="id-card">
        {player.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.photo} alt="" className="avatar-photo" />
        ) : (
          <div className="avatar">{initials(player.player_name)}</div>
        )}
        <div className="id-info">
          <div className="id-name">{player.player_name}</div>
          <div className="id-number">{idNumber}</div>
          {player.sport && (
            <span className="sport-badge">
              <svg width="11" height="11" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 2.6 15.5 5v4.4c0 4-2.4 6.8-5.5 8-3.1-1.2-5.5-4-5.5-8V5L10 2.6Z"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinejoin="round"
                />
              </svg>
              {player.sport}
            </span>
          )}
        </div>
        {rightMeta && (
          <div className="id-meta">
            <span className="id-meta-label">{rightMeta.label}</span>
            <span className="id-meta-value">{rightMeta.value}</span>
          </div>
        )}
      </div>

      <section>
        <p className="section-title">Your stats</p>
        <div className="stats-row">
          <div className="stat-tile">
            <div className="stat-icon" style={{ background: 'color-mix(in srgb, var(--color-accent-blue) 14%, transparent)', color: 'var(--color-accent-blue)' }}>
              <svg viewBox="0 0 20 20" fill="none">
                <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth={1.5} />
                <path d="M3 8h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
              </svg>
            </div>
            <div className="stat-value">{stats.events_count}</div>
            <div className="stat-label">Events</div>
          </div>
          <div className="stat-tile">
            <div className="stat-icon" style={{ background: 'color-mix(in srgb, var(--color-gold-tint) 26%, transparent)', color: 'var(--color-gold)' }}>
              <svg viewBox="0 0 20 20" fill="none">
                <path d="M6 3h8v4a4 4 0 0 1-8 0V3Z" stroke="currentColor" strokeWidth={1.5} />
                <path
                  d="M6 4H3.5A1.5 1.5 0 0 0 3 6.9L5 8.5M14 4h2.5A1.5 1.5 0 0 1 17 6.9L15 8.5"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
                <path d="M10 11v3M7.5 17h5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
              </svg>
            </div>
            <div className="stat-value" style={{ color: 'var(--color-gold)' }}>
              {stats.certificates.gold}
            </div>
            <div className="stat-label">Gold</div>
          </div>
          <div className="stat-tile">
            <div className="stat-icon" style={{ background: 'color-mix(in srgb, var(--color-silver) 18%, transparent)', color: 'var(--color-silver)' }}>
              <svg viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="12" r="4.6" stroke="currentColor" strokeWidth={1.5} />
                <path d="M7.5 8 6 3h8l-1.5 5" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
              </svg>
            </div>
            <div className="stat-value" style={{ color: 'var(--color-silver)' }}>
              {stats.certificates.silver}
            </div>
            <div className="stat-label">Silver</div>
          </div>
          <div className="stat-tile">
            <div className="stat-icon" style={{ background: 'color-mix(in srgb, var(--color-bronze) 18%, transparent)', color: 'var(--color-bronze)' }}>
              <svg viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="12" r="4.6" stroke="currentColor" strokeWidth={1.5} />
                <path d="M7.5 8 6 3h8l-1.5 5" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
              </svg>
            </div>
            <div className="stat-value" style={{ color: 'var(--color-bronze)' }}>
              {stats.certificates.bronze}
            </div>
            <div className="stat-label">Bronze</div>
          </div>
          <div className="stat-tile">
            <div className="stat-icon" style={{ background: 'color-mix(in srgb, var(--color-accent-violet) 14%, transparent)', color: 'var(--color-accent-violet)' }}>
              <svg viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 12.5 5.5 17l1-5.3L3 8.2l5.4-.6L10 2.6l1.6 5 5.4.6-3.5 3.5 1 5.3Z"
                  stroke="currentColor"
                  strokeWidth={1.3}
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="stat-value" style={{ color: 'var(--color-accent-violet)' }}>
              {stats.total_certs}
            </div>
            <div className="stat-label">Total certs</div>
          </div>
        </div>
      </section>

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
        <p className="section-title">Upcoming matches</p>
        {upcoming_matches.length === 0 ? (
          <p className="text-sm text-muted">No upcoming matches.</p>
        ) : (
          upcoming_matches.slice(0, 3).map((m) => {
            const when = m.scheduled_at || m.match_date;
            return (
              <div className="match-card" key={m.match_id}>
                <div className="match-top">
                  <span className="match-event">
                    {m.event_name || 'Event'}
                    {m.status && <span className="match-status">{m.status.replace(/_/g, ' ')}</span>}
                  </span>
                  {when && <span className="match-when">{new Date(when).toLocaleDateString()}</span>}
                </div>
                <div className="match-vs">
                  <span className="side you">
                    <span className="corner-dot" style={{ background: 'var(--color-corner-red)' }} />
                    You
                  </span>
                  <span className="vs-mid">VS</span>
                  <span className="side opp">
                    <span className="corner-dot" style={{ background: 'var(--color-accent-blue)' }} />
                    {m.opponent_name || 'TBD'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </section>

      <Link href="/player/events" className="browse-link">
        Browse events →
      </Link>

      <style jsx>{`
        .dash {
          display: flex;
          flex-direction: column;
          gap: 26px;
        }

        .id-card {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          gap: 16px;
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 22px;
          padding: 18px 20px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -12px rgba(22, 24, 29, 0.14);
        }
        .id-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(180deg, var(--color-accent-blue), #00b8d9);
        }
        .avatar,
        .avatar-photo {
          width: 60px;
          height: 60px;
          border-radius: 18px;
          flex-shrink: 0;
          position: relative;
          z-index: 1;
          object-fit: cover;
        }
        .avatar {
          background: linear-gradient(135deg, var(--color-accent-blue), #00b8d9);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 700;
          font-size: 20px;
          letter-spacing: 0.4px;
          box-shadow: 0 8px 16px -8px color-mix(in srgb, var(--color-accent-blue) 55%, transparent);
        }
        .id-info {
          position: relative;
          z-index: 1;
        }
        .id-name {
          font-size: 19px;
          font-weight: 800;
          letter-spacing: 0.1px;
        }
        .id-number {
          font-family: var(--font-mono);
          font-size: 13.5px;
          color: var(--color-muted);
          margin-top: 2px;
        }
        .sport-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-top: 7px;
          background: color-mix(in srgb, var(--color-accent-blue) 12%, transparent);
          color: var(--color-accent-blue);
          font-size: 12.5px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
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

        .stats-row {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
        }
        @media (max-width: 640px) {
          .stats-row {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .stat-tile {
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 18px;
          padding: 14px 10px;
          text-align: center;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -12px rgba(22, 24, 29, 0.14);
        }
        .stat-icon {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          margin: 0 auto 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-icon :global(svg) {
          width: 18px;
          height: 18px;
        }
        .stat-value {
          font-size: 23px;
          font-weight: 800;
          letter-spacing: -0.3px;
          color: var(--color-ink);
        }
        .stat-label {
          font-size: 11.5px;
          color: var(--color-muted);
          font-weight: 600;
          margin-top: 2px;
        }

        .actions-row {
          display: flex;
          justify-content: space-between;
          gap: 6px;
          flex-wrap: wrap;
        }
        /* :global() required -- see PlayerNav.tsx's comment: styled-jsx
           can't auto-scope a className handed to next/link's <Link>. */
        :global(.action) {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          width: 19%;
          min-width: 64px;
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

        .match-card {
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 18px;
          padding: 14px 16px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -12px rgba(22, 24, 29, 0.14);
          margin-bottom: 10px;
        }
        .match-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
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
          color: var(--color-accent-blue);
          background: color-mix(in srgb, var(--color-accent-blue) 10%, transparent);
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
        }
        .side {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 15.5px;
          font-weight: 700;
        }
        .side.you {
          color: var(--color-corner-red);
        }
        .side.opp {
          color: var(--color-accent-blue);
          flex-direction: row-reverse;
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
        }

        :global(.browse-link) {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 14.5px;
          font-weight: 700;
          color: var(--color-accent-blue);
          text-decoration: none;
          align-self: flex-start;
        }
      `}</style>
    </div>
  );
}
