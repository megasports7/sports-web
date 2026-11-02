'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { playerApi } from '@/lib/api/player.api';
import type { PlayerDashboardData } from '@/lib/types';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const NAV_LINKS = [
  { href: '/player', label: 'Dashboard' },
  { href: '/player/events', label: 'Events' },
  { href: '/player/matches', label: 'Matches' },
  { href: '/player/certificates', label: 'Certificates' },
  { href: '/player/id-card', label: 'ID Card' },
  { href: '/player/profile', label: 'Profile' },
] as const;

export default function PlayerDashboardPrototypeE() {
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

  if (loading) return <div className="pe-loading">Loading dashboard…</div>;
  if (error) return <div className="pe-error">{error}</div>;
  if (!data) return null;

  const { player, stats, upcoming_matches } = data;
  const idNumber =
    player.id_number || player.nsrd_id || (player.player_id ? `#${player.player_id}` : player.id.slice(0, 8));

  const rightMeta = player.id_valid_until
    ? { label: 'ID valid until', value: new Date(player.id_valid_until).toLocaleDateString() }
    : player.district || player.state
      ? { label: 'Location', value: [player.district, player.state].filter(Boolean).join(', ') }
      : null;

  return (
    <div className="pe">
      <header className="pe-nav">
        <div className="pe-nav-row">
          <Link href="/player" className="pe-brand">
            <span className="pe-mark">
              <svg viewBox="0 0 22 22" width="22" height="22">
                <path d="M11 2a9 9 0 0 1 0 18 9 9 0 0 0 0-18Z" fill="#C4453C" />
                <path d="M11 2a9 9 0 0 0 0 18 9 9 0 0 1 0-18Z" fill="#1C2B4A" />
              </svg>
            </span>
            MegaSportsX
          </Link>
          <span className="pe-prototype-tag">Prototype E</span>
          <nav className="pe-tabs">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="pe-tab">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="pe-main">
        <section className="pe-hero">
          <div className="pe-hero-left">
            <div className="pe-avatar">
              {player.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={player.photo} alt="" />
              ) : (
                <span>{initials(player.player_name)}</span>
              )}
            </div>
            <div className="pe-hero-info">
              <h1 className="pe-hero-name">{player.player_name}</h1>
              <p className="pe-hero-id">{idNumber}</p>
              {player.sport && <span className="pe-sport-badge">{player.sport}</span>}
            </div>
          </div>
          {rightMeta && (
            <div className="pe-hero-meta">
              <span className="pe-hero-meta-label">{rightMeta.label}</span>
              <span className="pe-hero-meta-value">{rightMeta.value}</span>
            </div>
          )}
        </section>

        <section className="pe-section">
          <h2 className="pe-section-title">Your stats</h2>
          <div className="pe-stats">
            <div className="pe-stat">
              <div className="pe-stat-icon pe-stat-icon--blue">
                <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
                  <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M3 8h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="pe-stat-value">{stats.events_count}</div>
              <div className="pe-stat-label">Events</div>
            </div>
            <div className="pe-stat">
              <div className="pe-stat-icon pe-stat-icon--gold">
                <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
                  <path d="M6 3h8v4a4 4 0 0 1-8 0V3Z" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M6 4H3.5A1.5 1.5 0 0 0 3 6.9L5 8.5M14 4h2.5A1.5 1.5 0 0 1 17 6.9L15 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M10 11v3M7.5 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="pe-stat-value pe-stat-value--gold">{stats.certificates.gold}</div>
              <div className="pe-stat-label">Gold</div>
            </div>
            <div className="pe-stat">
              <div className="pe-stat-icon pe-stat-icon--silver">
                <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
                  <circle cx="10" cy="12" r="4.6" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7.5 8 6 3h8l-1.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="pe-stat-value pe-stat-value--silver">{stats.certificates.silver}</div>
              <div className="pe-stat-label">Silver</div>
            </div>
            <div className="pe-stat">
              <div className="pe-stat-icon pe-stat-icon--bronze">
                <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
                  <circle cx="10" cy="12" r="4.6" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7.5 8 6 3h8l-1.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="pe-stat-value pe-stat-value--bronze">{stats.certificates.bronze}</div>
              <div className="pe-stat-label">Bronze</div>
            </div>
            <div className="pe-stat">
              <div className="pe-stat-icon pe-stat-icon--navy">
                <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
                  <path d="M10 12.5 5.5 17l1-5.3L3 8.2l5.4-.6L10 2.6l1.6 5 5.4.6-3.5 3.5 1 5.3Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="pe-stat-value pe-stat-value--navy">{stats.total_certs}</div>
              <div className="pe-stat-label">Total certs</div>
            </div>
          </div>
        </section>

        <section className="pe-section">
          <h2 className="pe-section-title">Upcoming matches</h2>
          {upcoming_matches.length === 0 ? (
            <p className="pe-empty">No upcoming matches scheduled.</p>
          ) : (
            <div className="pe-matches">
              {upcoming_matches.slice(0, 4).map((m) => {
                const when = m.scheduled_at || m.match_date;
                return (
                  <div className="pe-match" key={m.match_id}>
                    <div className="pe-match-header">
                      <span className="pe-match-event">{m.event_name || 'Event'}</span>
                      {when && <span className="pe-match-date">{new Date(when).toLocaleDateString()}</span>}
                    </div>
                    <div className="pe-match-body">
                      <div className="pe-match-side pe-match-side--you">
                        <span className="pe-match-dot pe-match-dot--red" />
                        <span className="pe-match-name">You</span>
                      </div>
                      <div className="pe-match-vs">VS</div>
                      <div className="pe-match-side pe-match-side--opp">
                        <span className="pe-match-name">{m.opponent_name || 'TBD'}</span>
                        <span className="pe-match-dot pe-match-dot--navy" />
                      </div>
                    </div>
                    {m.status && (
                      <div className="pe-match-footer">
                        <span className="pe-match-status">{m.status.replace(/_/g, ' ')}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="pe-section">
          <h2 className="pe-section-title">Quick actions</h2>
          <div className="pe-actions">
            <Link href="/player/events" className="pe-action">
              <span className="pe-action-icon pe-action-icon--blue">
                <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
                  <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M3 8h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <span className="pe-action-label">Events</span>
            </Link>
            <Link href="/player/matches" className="pe-action">
              <span className="pe-action-icon pe-action-icon--navy">
                <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
                  <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10 6.5V10l2.6 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <span className="pe-action-label">Matches</span>
            </Link>
            <Link href="/player/certificates" className="pe-action">
              <span className="pe-action-icon pe-action-icon--gold">
                <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
                  <path d="M10 12.5 5.5 17l1-5.3L3 8.2l5.4-.6L10 2.6l1.6 5 5.4.6-3.5 3.5 1 5.3Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="pe-action-label">Certificates</span>
            </Link>
            <Link href="/player/id-card" className="pe-action">
              <span className="pe-action-icon pe-action-icon--charcoal">
                <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
                  <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="7.5" cy="9" r="1.6" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M5.5 14c.4-1.7 1.5-2.5 2.7-2.5S10.4 12.3 11 14M13 8h2.2M13 10.5h2.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </span>
              <span className="pe-action-label">ID Card</span>
            </Link>
            <Link href="/player/profile" className="pe-action">
              <span className="pe-action-icon pe-action-icon--slate">
                <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
                  <circle cx="10" cy="7" r="3.2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M4 17c.6-4 3-6.2 6-6.2S15.4 13 16 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <span className="pe-action-label">Profile</span>
            </Link>
          </div>
        </section>
      </main>

      <style jsx>{`
        .pe {
          min-height: 100vh;
          background: #F6F4F0;
          font-family: var(--font-sans);
        }

        .pe-loading,
        .pe-error {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          font-size: 15px;
          color: #6b7280;
        }
        .pe-error {
          color: #c4453c;
        }

        /* ── Navigation ── */
        .pe-nav {
          background: #fff;
          border-bottom: 1px solid #e8e4de;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .pe-nav-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 32px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .pe-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 16px;
          color: #1c2b4a;
          text-decoration: none;
          flex-shrink: 0;
        }
        .pe-mark {
          display: flex;
          align-items: center;
        }
        .pe-prototype-tag {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          background: #fdf0e7;
          color: #c4453c;
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid #f0d5c8;
        }
        .pe-tabs {
          display: flex;
          align-items: center;
          gap: 2px;
          margin-left: auto;
        }
        .pe-tab {
          padding: 7px 12px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 600;
          color: #6b7280;
          text-decoration: none;
          white-space: nowrap;
        }
        .pe-tab:hover {
          background: #f6f4f0;
          color: #1c2b4a;
        }

        /* ── Main layout ── */
        .pe-main {
          max-width: 1100px;
          margin: 0 auto;
          padding: 28px 32px 48px;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        /* ── Hero / Player identity ── */
        .pe-hero {
          display: flex;
          align-items: center;
          gap: 20px;
          background: #1c2b4a;
          border-radius: 20px;
          padding: 28px 32px;
          color: #fff;
          position: relative;
          overflow: hidden;
        }
        .pe-hero::after {
          content: '';
          position: absolute;
          top: -40px;
          right: -40px;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.04);
        }
        .pe-hero-left {
          display: flex;
          align-items: center;
          gap: 18px;
          position: relative;
          z-index: 1;
        }
        .pe-avatar {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 700;
          flex-shrink: 0;
          overflow: hidden;
          border: 2px solid rgba(255, 255, 255, 0.15);
        }
        .pe-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .pe-hero-name {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.2px;
          margin: 0;
        }
        .pe-hero-id {
          font-family: var(--font-mono);
          font-size: 13px;
          color: rgba(255, 255, 255, 0.6);
          margin: 3px 0 0;
        }
        .pe-sport-badge {
          display: inline-block;
          margin-top: 8px;
          background: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.85);
          font-size: 12px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .pe-hero-meta {
          margin-left: auto;
          text-align: right;
          position: relative;
          z-index: 1;
          padding-left: 24px;
          border-left: 1px solid rgba(255, 255, 255, 0.12);
        }
        .pe-hero-meta-label {
          display: block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          color: rgba(255, 255, 255, 0.45);
          text-transform: uppercase;
        }
        .pe-hero-meta-value {
          display: block;
          font-size: 15px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.9);
          margin-top: 4px;
        }

        /* ── Sections ── */
        .pe-section {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .pe-section-title {
          font-size: 13px;
          font-weight: 700;
          color: #2d3748;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin: 0;
        }
        .pe-empty {
          font-size: 14px;
          color: #6b7280;
          padding: 16px 0;
        }

        /* ── Stats ── */
        .pe-stats {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
        }
        .pe-stat {
          background: #fff;
          border: 1px solid #e8e4de;
          border-radius: 16px;
          padding: 18px 12px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .pe-stat-icon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2px;
        }
        .pe-stat-icon--blue {
          background: #e8f0fa;
          color: #1c2b4a;
        }
        .pe-stat-icon--gold {
          background: #fdf3e0;
          color: #b8860b;
        }
        .pe-stat-icon--silver {
          background: #f0f1f3;
          color: #7c8794;
        }
        .pe-stat-icon--bronze {
          background: #f5ebe4;
          color: #b0662e;
        }
        .pe-stat-icon--navy {
          background: #e8eaf0;
          color: #1c2b4a;
        }
        .pe-stat-value {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.3px;
          color: #1c2b4a;
          line-height: 1.1;
        }
        .pe-stat-value--gold {
          color: #b8860b;
        }
        .pe-stat-value--silver {
          color: #7c8794;
        }
        .pe-stat-value--bronze {
          color: #b0662e;
        }
        .pe-stat-value--navy {
          color: #1c2b4a;
        }
        .pe-stat-label {
          font-size: 11px;
          color: #6b7280;
          font-weight: 600;
        }

        /* ── Matches ── */
        .pe-matches {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .pe-match {
          background: #fff;
          border: 1px solid #e8e4de;
          border-radius: 16px;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .pe-match-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .pe-match-event {
          font-size: 13px;
          font-weight: 700;
          color: #2d3748;
        }
        .pe-match-date {
          font-family: var(--font-mono);
          font-size: 12px;
          color: #6b7280;
        }
        .pe-match-body {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .pe-match-side {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }
        .pe-match-side--opp {
          justify-content: flex-end;
        }
        .pe-match-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .pe-match-dot--red {
          background: #c4453c;
        }
        .pe-match-dot--navy {
          background: #1c2b4a;
        }
        .pe-match-name {
          font-size: 16px;
          font-weight: 700;
          color: #1c2b4a;
        }
        .pe-match-side--you .pe-match-name {
          color: #c4453c;
        }
        .pe-match-vs {
          font-size: 11px;
          font-weight: 700;
          color: #6b7280;
          letter-spacing: 0.5px;
          flex-shrink: 0;
        }
        .pe-match-footer {
          display: flex;
          justify-content: flex-end;
        }
        .pe-match-status {
          font-size: 10px;
          font-weight: 700;
          text-transform: capitalize;
          color: #1c2b4a;
          background: #e8eaf0;
          padding: 3px 8px;
          border-radius: 6px;
        }

        /* ── Quick actions ── */
        .pe-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .pe-action {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          padding: 14px 18px;
          border-radius: 14px;
          background: #fff;
          border: 1px solid #e8e4de;
          min-width: 80px;
          transition: border-color 0.15s;
        }
        .pe-action:hover {
          border-color: #c4453c;
        }
        .pe-action-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pe-action-icon--blue {
          background: #e8f0fa;
          color: #1c2b4a;
        }
        .pe-action-icon--navy {
          background: #e8eaf0;
          color: #1c2b4a;
        }
        .pe-action-icon--gold {
          background: #fdf3e0;
          color: #b8860b;
        }
        .pe-action-icon--charcoal {
          background: #f0f1f3;
          color: #2d3748;
        }
        .pe-action-icon--slate {
          background: #f6f4f0;
          color: #6b7280;
        }
        .pe-action-label {
          font-size: 12px;
          font-weight: 600;
          color: #2d3748;
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .pe-nav-row {
            padding: 10px 16px;
            gap: 10px;
          }
          .pe-tabs {
            display: none;
          }
          .pe-main {
            padding: 20px 16px 40px;
            gap: 24px;
          }
          .pe-hero {
            flex-direction: column;
            align-items: flex-start;
            padding: 22px 20px;
            gap: 16px;
          }
          .pe-hero-meta {
            margin-left: 0;
            padding-left: 0;
            border-left: none;
            border-top: 1px solid rgba(255, 255, 255, 0.12);
            padding-top: 14px;
            text-align: left;
            width: 100%;
          }
          .pe-stats {
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
          }
          .pe-stat {
            padding: 14px 8px;
          }
          .pe-stat-value {
            font-size: 20px;
          }
          .pe-match-body {
            flex-direction: column;
            gap: 8px;
          }
          .pe-match-side--opp {
            justify-content: flex-start;
          }
          .pe-match-vs {
            display: none;
          }
          .pe-actions {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
          }
          .pe-action {
            padding: 12px 8px;
            min-width: unset;
          }
        }

        @media (max-width: 480px) {
          .pe-stats {
            grid-template-columns: repeat(2, 1fr);
          }
          .pe-actions {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
