'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api/admin.api';
import type { AdminDashboardData } from '@/lib/types';

const MANAGE_LINKS = [
  { href: '/admin/users/players', label: 'Players', key: 'total_players' as const, suffix: 'registered' },
  { href: '/admin/users/organizers', label: 'Organizers', key: 'total_organizers' as const, suffix: 'registered' },
  { href: '/admin/users/referees', label: 'Referees', key: 'total_referees' as const, suffix: 'registered' },
  { href: '/admin/users/associates', label: 'Associates', key: 'total_associates' as const, suffix: 'district heads' },
];

function ShieldIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path
        d="M10 2.6 15.5 5v4.4c0 4-2.4 6.8-5.5 8-3.1-1.2-5.5-4-5.5-8V5L10 2.6Z"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <path d="m7.2 9.8 2 2 3.6-4" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
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
function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth={1.5} />
      <path d="M3 8h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}
function WhistleIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <circle cx="8" cy="12" r="4.6" stroke="currentColor" strokeWidth={1.5} />
      <path d="M11.5 8.5 16 4M14 4h3v3" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
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
function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path d="m4 10.5 3.5 3.5L16 5.5" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const STAT_TILES = [
  { label: 'Players', key: 'total_players' as const, icon: PeopleIcon, color: 'var(--color-accent-blue)' },
  { label: 'Organizers', key: 'total_organizers' as const, icon: ShieldIcon, color: 'var(--color-accent-violet)' },
  { label: 'Referees', key: 'total_referees' as const, icon: WhistleIcon, color: 'var(--color-gold)' },
  { label: 'Associates', key: 'total_associates' as const, icon: PinIcon, color: 'var(--color-accent-green)' },
  { label: 'Events', key: 'total_events' as const, icon: CalendarIcon, color: 'var(--color-corner-red)' },
];

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
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

  const recentEvents = data.recent_events?.slice(0, 5) ?? [];

  return (
    <div className="page">
      <div className="top-row">
        <div className="welcome-card">
          <span className="welcome-avatar">
            <ShieldIcon />
          </span>
          <div>
            <div className="welcome-name">Admin panel</div>
            <div className="welcome-email">Platform-wide overview</div>
          </div>
          <span className="role-badge">Administrator</span>
        </div>
      </div>

      <div>
        <p className="section-title">Platform stats</p>
        <div className="stats-row">
          {STAT_TILES.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="stat-tile">
                <div
                  className="stat-icon"
                  style={{ background: `color-mix(in srgb, ${s.color} 14%, transparent)`, color: s.color }}
                >
                  <Icon />
                </div>
                <div className="stat-value">{data[s.key]}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="section-title">Manage users</p>
        <div className="manage-list">
          {MANAGE_LINKS.map((m) => (
            <Link key={m.href} href={m.href} className="manage-row">
              <span className="manage-main">
                <span className="manage-title">{m.label}</span>
                <span className="manage-sub">
                  {data[m.key]} {m.suffix}
                </span>
              </span>
              <span className="go" aria-hidden="true">
                ›
              </span>
            </Link>
          ))}
        </div>
      </div>

      {data.recent_players.length > 0 && (
        <div>
          <p className="section-title">Recent players</p>
          <div className="people-list">
            {data.recent_players.slice(0, 5).map((p) => (
              <div className="person-row" key={p.id}>
                <span className="person-avatar">{initials(p.player_name || '?')}</span>
                <span className="person-main">
                  <span className="person-name">{p.player_name}</span>
                  <span className="person-sub">{p.email}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentEvents.length > 0 && (
        <div>
          <p className="section-title">Recent events</p>
          <div className="people-list">
            {recentEvents.map((e) => (
              <div className="person-row" key={e.event_id}>
                {e.event_date ? (
                  <span className="date-badge">
                    <span className="mon">
                      {new Date(e.event_date).toLocaleDateString(undefined, { month: 'short' })}
                    </span>
                    <span className="day">{new Date(e.event_date).getDate()}</span>
                  </span>
                ) : (
                  <span className="person-avatar">
                    <CalendarIcon />
                  </span>
                )}
                <span className="person-main">
                  <span className="person-name">{e.event_name}</span>
                  <span className="person-sub">{e.venue || e.location || 'No venue set'}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Static/decorative, matching mobile's AdminDashboard.tsx "Admin
          Powers" card -- not a functional widget there either. */}
      <div className="powers-card">
        <p className="section-title" style={{ marginBottom: 10 }}>
          Admin powers
        </p>
        <ul className="powers-list">
          <li>
            <CheckIcon />
            Edit or suspend accounts
          </li>
          <li>
            <CheckIcon />
            Monitor events &amp; matches
          </li>
          <li>
            <CheckIcon />
            Manage associate (district head) accounts
          </li>
          <li>
            <CheckIcon />
            Full CRUD on all user roles
          </li>
        </ul>
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
          background: linear-gradient(180deg, var(--color-corner-red), #ff7a59);
        }
        .welcome-avatar {
          width: 54px;
          height: 54px;
          border-radius: 16px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-corner-red), #ff7a59);
          color: #fff;
          box-shadow: 0 8px 16px -8px color-mix(in srgb, var(--color-corner-red) 55%, transparent);
        }
        .welcome-avatar :global(svg) {
          width: 26px;
          height: 26px;
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
        .role-badge {
          margin-left: auto;
          flex-shrink: 0;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--color-corner-red) 12%, transparent);
          color: #b23a20;
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
        @media (max-width: 720px) {
          .stats-row {
            grid-template-columns: repeat(2, 1fr);
          }
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

        .manage-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .manage-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 18px;
          padding: 12px 16px;
          text-decoration: none;
          color: inherit;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -12px rgba(22, 24, 29, 0.14);
          transition: box-shadow 0.15s ease, transform 0.15s ease;
        }
        .manage-row:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(22, 24, 29, 0.05), 0 14px 26px -12px rgba(22, 24, 29, 0.2);
        }
        .manage-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .manage-title {
          font-size: 15px;
          font-weight: 700;
        }
        .manage-sub {
          font-size: 12.5px;
          color: var(--color-muted);
        }
        .go {
          flex-shrink: 0;
          font-size: 20px;
          font-weight: 700;
          line-height: 1;
          color: #9aa0ac;
        }

        .people-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .person-row {
          display: flex;
          align-items: center;
          gap: 14px;
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 18px;
          padding: 13px 18px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -12px rgba(22, 24, 29, 0.14);
        }
        .person-avatar {
          width: 42px;
          height: 42px;
          border-radius: 13px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: color-mix(in srgb, var(--color-corner-red) 12%, transparent);
          color: #b23a20;
          font-weight: 800;
          font-size: 15px;
        }
        .person-avatar :global(svg) {
          width: 20px;
          height: 20px;
        }
        .person-main {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .person-name {
          font-size: 14.5px;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .person-sub {
          font-size: 12.5px;
          color: var(--color-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .date-badge {
          width: 42px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: color-mix(in srgb, var(--color-corner-red) 10%, transparent);
          border-radius: 13px;
          padding: 7px 0;
        }
        .date-badge .mon {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          color: #b23a20;
        }
        .date-badge .day {
          font-size: 17px;
          font-weight: 800;
          color: var(--color-ink);
          line-height: 1.1;
        }

        .powers-card {
          position: relative;
          overflow: hidden;
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 18px;
          padding: 18px 20px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -12px rgba(22, 24, 29, 0.14);
        }
        .powers-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(180deg, var(--color-corner-red), #ff7a59);
        }
        .powers-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .powers-list li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13.5px;
          font-weight: 600;
          color: #3a3d45;
        }
        .powers-list :global(svg) {
          width: 15px;
          height: 15px;
          flex-shrink: 0;
          color: #0a8a3f;
        }
      `}</style>
    </div>
  );
}
