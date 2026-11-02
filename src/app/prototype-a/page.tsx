'use client';

/**
 * CONCEPT A — "Premium Sports Platform" (PROTOTYPE ONLY)
 * Route: /prototype-a · renders sample data, makes no backend calls.
 * Light neutral canvas, deep-navy text, electric-blue primary action with a
 * restrained ember accent; refined profile header, six semantic stat tiles,
 * structured VS match cards, spacious responsive grid.
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  PROTOTYPE_NOTE,
  emptyUpcoming,
  formatMatchWhen,
  initialsOf,
  rightMeta,
  sampleDashboard,
  statusLabel,
} from '@/lib/prototype/data';
import {
  IconAward,
  IconArrowRight,
  IconBout,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconClose,
  IconEvents,
  IconIdCard,
  IconMedal,
  IconMenu,
  IconPin,
  IconProfile,
  IconSignOut,
  IconStar,
  IconTrophy,
} from '@/lib/prototype/icons';
import type { Match } from '@/lib/types';

const NAV_ITEMS = [
  { href: '/player', label: 'Dashboard', active: true },
  { href: '/player/events', label: 'Events' },
  { href: '/player/matches', label: 'Matches' },
  { href: '/player/certificates', label: 'Certificates' },
  { href: '/player/id-card', label: 'ID Card' },
  { href: '/player/profile', label: 'Profile' },
];

const ACTIONS: { href: string; label: string; Icon: typeof IconEvents }[] = [
  { href: '/player/events', label: 'Events', Icon: IconEvents },
  { href: '/player/matches', label: 'Matches', Icon: IconBout },
  { href: '/player/certificates', label: 'Certificates', Icon: IconAward },
  { href: '/player/id-card', label: 'ID Card', Icon: IconIdCard },
  { href: '/player/profile', label: 'Profile', Icon: IconProfile },
];

type View = 'populated' | 'empty' | 'loading' | 'error';
type Tone = 'blue' | 'gold' | 'silver' | 'bronze' | 'violet' | 'ink';

export default function ConceptAPage() {
  const [view, setView] = useState<View>('populated');
  const [frame, setFrame] = useState<'desktop' | 'mobile'>('desktop');
  const [menuOpen, setMenuOpen] = useState(false);

  const { player, stats } = sampleDashboard;
  const matches: Match[] = view === 'empty' ? emptyUpcoming : sampleDashboard.upcoming_matches;
  const meta = rightMeta(player);

  const tiles: { label: string; value: number; Icon: typeof IconEvents; tone: Tone }[] = [
    { label: 'Events', value: stats.events_count, Icon: IconEvents, tone: 'blue' },
    { label: 'Gold', value: stats.certificates.gold, Icon: IconTrophy, tone: 'gold' },
    { label: 'Silver', value: stats.certificates.silver, Icon: IconMedal, tone: 'silver' },
    { label: 'Bronze', value: stats.certificates.bronze, Icon: IconMedal, tone: 'bronze' },
    { label: 'Participation', value: stats.certificates.participation, Icon: IconStar, tone: 'violet' },
    { label: 'Total certificates', value: stats.total_certs, Icon: IconAward, tone: 'ink' },
  ];

  const certRows: { label: string; value: number; Icon: typeof IconEvents; tone: Tone }[] = [
    { label: 'Gold', value: stats.certificates.gold, Icon: IconTrophy, tone: 'gold' },
    { label: 'Silver', value: stats.certificates.silver, Icon: IconMedal, tone: 'silver' },
    { label: 'Bronze', value: stats.certificates.bronze, Icon: IconMedal, tone: 'bronze' },
    { label: 'Participation', value: stats.certificates.participation, Icon: IconStar, tone: 'violet' },
  ];

  return (
    <div className="shell" data-frame={frame}>
      {/* ---------- Header / navigation ---------- */}
      <nav className="nav" data-frame={frame}>
        <div className="nav-row">
          <Link href="/prototype-a" className="brand">
            <span className="brand-mark">
              <svg viewBox="0 0 22 22" width="22" height="22" aria-hidden="true">
                <path d="M11 2a9 9 0 0 1 0 18 9 9 0 0 0 0-18Z" fill="var(--color-corner-red)" />
                <path d="M11 2a9 9 0 0 0 0 18 9 9 0 0 1 0-18Z" fill="var(--a-primary)" />
              </svg>
            </span>
            <span className="brand-word">
              MegaSportsX<small>TOURNAMENT PLATFORM</small>
            </span>
          </Link>

          <div className="tabs">
            {NAV_ITEMS.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`tab ${n.active ? 'is-active' : ''}`}
                aria-current={n.active ? 'page' : undefined}
              >
                {n.label}
              </Link>
            ))}
          </div>

          <button className="signout">
            <IconSignOut size={16} />
            Sign out
          </button>

          <button className="menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu" aria-expanded={menuOpen}>
            {menuOpen ? <IconClose size={18} /> : <IconMenu size={18} />}
          </button>
        </div>

        {menuOpen && (
          <div className="mobile-menu">
            {NAV_ITEMS.map((n) => (
              <Link key={n.href} href={n.href} className={`m-tab ${n.active ? 'is-active' : ''}`} onClick={() => setMenuOpen(false)}>
                {n.label}
              </Link>
            ))}
            <button className="m-signout" onClick={() => setMenuOpen(false)}>
              <IconSignOut size={16} /> Sign out
            </button>
          </div>
        )}
      </nav>

      {/* ---------- Prototype toolbar ---------- */}
      <div className="toolbar">
        <div className="tb-group">
          <span className="tb-label">View</span>
          <button className={frame === 'desktop' ? 'tb on' : 'tb'} onClick={() => setFrame('desktop')}>Desktop</button>
          <button className={frame === 'mobile' ? 'tb on' : 'tb'} onClick={() => setFrame('mobile')}>Mobile</button>
        </div>
        <div className="tb-group">
          <span className="tb-label">State</span>
          {(['populated', 'empty', 'loading', 'error'] as View[]).map((v) => (
            <button key={v} className={view === v ? 'tb on' : 'tb'} onClick={() => setView(v)}>
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <span className="tb-note">
          Concept A · prototype only · sample data · nothing is sent to the backend
        </span>
      </div>

      {/* ---------- Viewport frame ---------- */}
      <div className="frame">
        <div className="page" data-loading={view === 'loading'}>
          {view === 'loading' ? (
            <div className="skeleton-wrap">
              <div className="sk sk-header" />
              <div className="sk-grid">
                {Array.from({ length: 6 }).map((_, i) => <div className="sk sk-tile" key={i} />)}
              </div>
              <div className="sk-grid">
                {Array.from({ length: 3 }).map((_, i) => <div className="sk sk-tile sk-match" key={i} />)}
              </div>
            </div>
          ) : (
            <>
              {/* ---------- Player identity ---------- */}
              <header className="identity">
                {player.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="avatar" src={player.photo} alt="" />
                ) : (
                  <div className="avatar" aria-hidden="true">{initialsOf(player.player_name)}</div>
                )}
                <div className="id-main">
                  <h1>{player.player_name}</h1>
                  <div className="id-sub">
                    {player.sport && (
                      <span className="sport">
                        <IconBout size={13} /> {player.sport}
                      </span>
                    )}
                    <span className="id-num">
                      {player.nsrd_id || (player.player_id ? `#${player.player_id}` : player.id.slice(0, 8))}
                    </span>
                  </div>
                </div>
                {meta && (
                  <div className="id-meta">
                    <span className="id-meta-label">{meta.label}</span>
                    <span className="id-meta-value">
                      <IconPin size={14} /> {meta.value}
                    </span>
                  </div>
                )}
              </header>

              <div className="grid">
                <div className="col-main">
                  {/* ---------- Statistics ---------- */}
                  <section>
                    <div className="sec-head">
                      <h2>Your statistics</h2>
                      <span className="sec-note">Tournament record to date</span>
                    </div>
                    <div className="tiles">
                      {tiles.map((t) => (
                        <div className="tile" key={t.label} data-tone={t.tone}>
                          <span className="tile-icon"><t.Icon size={18} /></span>
                          <span className="tile-value">{t.value}</span>
                          <span className="tile-label">{t.label}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* ---------- Quick actions ---------- */}
                  <section>
                    <div className="sec-head">
                      <h2>Quick actions</h2>
                    </div>
                    <div className="actions">
                      {ACTIONS.map((a) => (
                        <Link key={a.href} href={a.href} className="action">
                          <span className="action-icon"><a.Icon size={19} /></span>
                          <span className="action-label">{a.label}</span>
                        </Link>
                      ))}
                    </div>
                  </section>

                  {/* ---------- Upcoming matches ---------- */}
                  <section>
                    <div className="sec-head">
                      <h2>Upcoming matches</h2>
                      <Link href="/player/matches" className="sec-link">
                        All matches <IconChevronRight size={14} />
                      </Link>
                    </div>

                    {view === 'error' ? (
                      <div className="state state-error" role="alert">
                        <h3>Could not load your matches</h3>
                        <p>Something went wrong while fetching your bouts. This is a simulated error state.</p>
                        <button className="btn btn-ghost" onClick={() => setView('populated')}>Try again</button>
                      </div>
                    ) : matches.length === 0 ? (
                      <div className="state">
                        <span className="state-icon"><IconBout size={22} /></span>
                        <h3>No upcoming matches</h3>
                        <p>When an organizer schedules your bout, it shows up here with date, time and opponent.</p>
                        <Link href="/player/events" className="btn btn-primary">
                          Browse events <IconArrowRight size={16} />
                        </Link>
                      </div>
                    ) : (
                      <div className="matches">
                        {matches.map((m) => {
                          const when = formatMatchWhen(m);
                          return (
                            <article className="match" key={m.match_id} data-status={m.status}>
                              <div className="m-top">
                                <span className="m-event">{m.event_name || 'Event'}</span>
                                <span className="m-status">{statusLabel(m.status)}</span>
                              </div>
                              <div className="m-body">
                                <div className="m-side">
                                  <span className="m-side-name you">You</span>
                                  <span className="m-dot you" aria-hidden="true" />
                                </div>
                                <span className="m-vs">VS</span>
                                <div className="m-side right">
                                  <span className="m-dot opp" aria-hidden="true" />
                                  <span className="m-side-name">{m.opponent_name || 'TBD'}</span>
                                </div>
                              </div>
                              {when && (
                                <div className="m-foot">
                                  <IconClock size={14} />
                                  <span className="m-when">{when.date}{when.time ? ` · ${when.time}` : ''}</span>
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>

                {/* ---------- Side column ---------- */}
                <aside className="col-side">
                  <section className="panel">
                    <h2>Next steps</h2>
                    <Link href="/player/events" className="btn btn-primary btn-block">
                      Browse events <IconArrowRight size={16} />
                    </Link>
                    <Link href="/player/id-card" className="panel-row">
                      <span className="panel-row-icon"><IconIdCard size={17} /></span>
                      <span>
                        <strong>Open your ID card</strong>
                        <small>QR code for match-day check-in</small>
                      </span>
                      <IconChevronRight size={16} />
                    </Link>
                    <Link href="/player/profile" className="panel-row">
                      <span className="panel-row-icon"><IconProfile size={17} /></span>
                      <span>
                        <strong>Update your profile</strong>
                        <small>Declared weight, contact, ID details</small>
                      </span>
                      <IconChevronRight size={16} />
                    </Link>
                  </section>

                  <section className="panel">
                    <div className="sec-head">
                      <h2>Your certificates</h2>
                      <Link href="/player/certificates" className="sec-link">View all <IconChevronRight size={14} /></Link>
                    </div>
                    <ul className="cert-list">
                      {certRows.map((r) => (
                        <li key={r.label} data-tone={r.tone}>
                          <span className="cert-icon"><r.Icon size={16} /></span>
                          <span className="cert-label">{r.label}</span>
                          <span className="cert-value">{r.value}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="panel-foot">
                      <IconCheck size={14} /> {stats.total_certs} certificates earned in total
                    </p>
                  </section>
                </aside>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="proto-foot">{PROTOTYPE_NOTE}</p>

      <style jsx>{`
        .shell {
          --a-navy: #0E1B33;
          --a-primary: #0B63B8;
          --a-ember: #E8492D;
          --a-bg: #F5F7FA;
          --a-line: #E3E7ED;
          --a-text: #0E1B33;
          --a-muted: #5B6577;
          min-height: 100vh;
          background: var(--a-bg);
          color: var(--a-text);
        }

        /* ---------- Nav ---------- */
        .nav {
          position: sticky; top: 0; z-index: 30;
          background: var(--color-surface);
          border-bottom: 1px solid var(--a-line);
        }
        .nav-row { display: flex; align-items: center; gap: 6px; padding: 10px 28px; }
        :global(.brand) {
          display: inline-flex; align-items: center; gap: 9px; margin-right: 16px;
          text-decoration: none; color: var(--a-text); flex-shrink: 0;
        }
        .brand-mark { display: inline-flex; }
        .brand-word { font-size: 15px; font-weight: 800; line-height: 1.1; }
        .brand-word small {
          display: block; font-family: var(--font-mono); font-weight: 500;
          font-size: 8px; letter-spacing: 1.6px; color: var(--a-muted);
        }
        .tabs { display: flex; align-items: center; gap: 2px; flex-wrap: nowrap; overflow: hidden; }
        :global(.tab) {
          padding: 8px 13px; border-radius: 9px; text-decoration: none; white-space: nowrap;
          font-size: 14px; font-weight: 600; color: var(--a-muted);
        }
        :global(.tab:hover) { background: rgba(14, 27, 51, 0.05); color: var(--a-text); }
        :global(.tab.is-active) {
          color: var(--a-primary); background: color-mix(in srgb, var(--a-primary) 9%, transparent);
        }
        .signout {
          margin-left: auto; display: inline-flex; align-items: center; gap: 7px;
          font-family: inherit; font-size: 13.5px; font-weight: 600; color: var(--a-muted);
          background: none; border: none; border-radius: 9px; padding: 8px 10px; cursor: pointer;
        }
        .signout:hover { color: var(--a-ember); background: rgba(232, 73, 45, 0.07); }
        .menu-btn { display: none; }
        .mobile-menu { display: none; }
        .shell[data-frame='mobile'] :global(.tabs),
        .shell[data-frame='mobile'] .signout { display: none; }
        .shell[data-frame='mobile'] .menu-btn {
          display: inline-flex; margin-left: auto; align-items: center; justify-content: center;
          width: 38px; height: 38px; border-radius: 10px; cursor: pointer;
          border: 1.5px solid var(--a-line); background: var(--color-surface); color: var(--a-text);
        }
        .shell[data-frame='mobile'] .mobile-menu {
          display: flex; flex-direction: column; gap: 2px; padding: 8px 16px 14px;
          border-top: 1px solid var(--a-line);
        }
        :global(.m-tab) {
          padding: 11px 12px; border-radius: 10px; text-decoration: none;
          font-size: 14.5px; font-weight: 600; color: var(--a-muted);
        }
        :global(.m-tab.is-active) { color: var(--a-primary); background: color-mix(in srgb, var(--a-primary) 10%, transparent); }
        .m-signout {
          display: inline-flex; align-items: center; gap: 8px; margin-top: 6px; text-align: left;
          padding: 11px 12px; border: none; border-top: 1px solid var(--a-line); border-radius: 0;
          background: none; font-family: inherit; font-size: 14px; font-weight: 600; color: var(--a-muted); cursor: pointer;
        }

        /* ---------- Toolbar ---------- */
        .toolbar {
          display: flex; flex-wrap: wrap; align-items: center; gap: 8px 18px;
          padding: 10px 28px; background: #0E1B33; color: rgba(255, 255, 255, 0.72);
          font-size: 12px;
        }
        .tb-group { display: inline-flex; align-items: center; gap: 6px; }
        .tb-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; opacity: 0.7; }
        .tb {
          font-family: inherit; font-size: 11.5px; font-weight: 700; cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.22); background: none; color: inherit;
          border-radius: 999px; padding: 5px 11px;
        }
        .tb:hover { border-color: rgba(255, 255, 255, 0.5); }
        .tb.on { background: #fff; color: #0E1B33; border-color: #fff; }
        .tb-note { margin-left: auto; font-family: var(--font-mono); font-size: 10.5px; opacity: 0.65; }

        /* ---------- Page ---------- */
        .frame { padding: 28px; }
        .page { max-width: 1160px; margin: 0 auto; display: flex; flex-direction: column; gap: 22px; }
        .shell[data-frame='mobile'] .frame { padding: 16px; }
        .shell[data-frame='mobile'] .page { max-width: 430px; }

        /* ---------- Identity ---------- */
        .identity {
          display: flex; align-items: center; gap: 18px;
          background: var(--color-surface); border: 1px solid var(--a-line);
          border-left: 4px solid var(--a-primary);
          border-radius: 14px; padding: 18px 22px;
        }
        .avatar {
          width: 58px; height: 58px; border-radius: 14px; flex-shrink: 0; object-fit: cover;
          background: var(--a-navy); color: #fff; display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 19px; letter-spacing: 0.5px;
        }
        .id-main h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.3px; margin: 0 0 5px; }
        .id-sub { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .sport {
          display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 700;
          color: var(--a-primary); background: color-mix(in srgb, var(--a-primary) 9%, transparent);
          border-radius: 999px; padding: 4px 11px;
        }
        .id-num { font-family: var(--font-mono); font-size: 12.5px; color: var(--a-muted); }
        .id-meta { margin-left: auto; text-align: right; }
        .id-meta-label {
          display: block; font-family: var(--font-mono); font-size: 9.5px; font-weight: 700;
          letter-spacing: 1.4px; text-transform: uppercase; color: var(--a-muted);
        }
        .id-meta-value { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 700; margin-top: 3px; }

        /* ---------- Grid ---------- */
        .grid { display: grid; grid-template-columns: 1fr; gap: 22px; }
        .col-main, .col-side { display: flex; flex-direction: column; gap: 22px; min-width: 0; }
        @media (min-width: 1000px) {
          .grid { grid-template-columns: 1.7fr 1fr; }
        }
        .shell[data-frame='mobile'] .grid { grid-template-columns: 1fr; }

        .sec-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .sec-head h2 { font-size: 15px; font-weight: 800; margin: 0; letter-spacing: 0.1px; }
        .sec-note { font-size: 12px; color: var(--a-muted); }
        :global(.sec-link) {
          display: inline-flex; align-items: center; gap: 3px; text-decoration: none;
          font-size: 12.5px; font-weight: 700; color: var(--a-primary);
        }

        /* ---------- Stat tiles ---------- */
        .tiles { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        @media (min-width: 620px) { .tiles { grid-template-columns: repeat(3, 1fr); } }
        .tile {
          display: flex; flex-direction: column; gap: 6px;
          background: var(--color-surface); border: 1px solid var(--a-line);
          border-radius: 14px; padding: 14px 15px;
        }
        .tile-icon {
          width: 34px; height: 34px; border-radius: 10px; display: inline-flex;
          align-items: center; justify-content: center;
          background: color-mix(in srgb, var(--tone) 12%, transparent); color: var(--tone);
        }
        .tile[data-tone='blue'] { --tone: var(--a-primary); }
        .tile[data-tone='gold'] { --tone: var(--color-gold); }
        .tile[data-tone='silver'] { --tone: var(--color-silver); }
        .tile[data-tone='bronze'] { --tone: var(--color-bronze); }
        .tile[data-tone='violet'] { --tone: var(--color-accent-violet); }
        .tile[data-tone='ink'] { --tone: var(--a-navy); }
        .tile-value { font-size: 26px; font-weight: 800; letter-spacing: -0.6px; line-height: 1; }
        .tile-label { font-size: 11.5px; font-weight: 600; color: var(--a-muted); }

        /* ---------- Quick actions ---------- */
        .actions { display: flex; flex-wrap: wrap; gap: 8px; }
        :global(.action) {
          flex: 1 1 96px; display: flex; flex-direction: column; align-items: center; gap: 8px;
          text-decoration: none; background: var(--color-surface);
          border: 1px solid var(--a-line); border-radius: 12px; padding: 12px 8px;
          transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
        }
        :global(.action:hover) {
          border-color: var(--a-primary); transform: translateY(-1px);
          box-shadow: 0 10px 20px -14px rgba(11, 99, 184, 0.7);
        }
        .action-icon {
          width: 38px; height: 38px; border-radius: 11px; display: inline-flex;
          align-items: center; justify-content: center;
          background: color-mix(in srgb, var(--a-primary) 10%, transparent); color: var(--a-primary);
        }
        .action-label { font-size: 12px; font-weight: 700; color: var(--a-text); }

        /* ---------- Match cards ---------- */
        .matches { display: flex; flex-direction: column; gap: 10px; }
        .match {
          background: var(--color-surface); border: 1px solid var(--a-line);
          border-radius: 14px; padding: 14px 16px;
        }
        .m-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .m-event { font-size: 13px; font-weight: 700; color: var(--a-text); }
        .m-status {
          font-family: var(--font-mono); font-size: 9.5px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; border-radius: 999px; padding: 4px 9px;
          background: color-mix(in srgb, var(--a-primary) 10%, transparent); color: var(--a-primary);
        }
        .match[data-status='in_progress'] .m-status {
          background: color-mix(in srgb, var(--color-status-pending) 16%, transparent); color: #8a6a00;
        }
        .m-body { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; }
        .m-side { display: flex; align-items: center; gap: 9px; min-width: 0; }
        .m-side.right { justify-content: flex-end; }
        .m-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
        .m-dot.you { background: var(--a-ember); }
        .m-dot.opp { background: var(--a-primary); }
        .m-side-name { font-size: 15px; font-weight: 800; letter-spacing: -0.1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .m-side-name.you { color: var(--a-ember); }
        .m-vs { font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: var(--a-muted); }
        .m-foot {
          display: flex; align-items: center; gap: 7px; margin-top: 12px;
          padding-top: 10px; border-top: 1px dashed var(--a-line); color: var(--a-muted);
        }
        .m-when { font-family: var(--font-mono); font-size: 12px; }

        /* ---------- States ---------- */
        .state {
          display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px;
          background: var(--color-surface); border: 1px dashed var(--a-line);
          border-radius: 14px; padding: 32px 24px;
        }
        .state-icon {
          width: 46px; height: 46px; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center;
          background: color-mix(in srgb, var(--a-primary) 10%, transparent); color: var(--a-primary); margin-bottom: 4px;
        }
        .state h3 { font-size: 15px; font-weight: 800; margin: 0; }
        .state p { font-size: 13px; color: var(--a-muted); margin: 0 0 8px; max-width: 44ch; line-height: 1.55; }
        .state-error { border-style: solid; border-color: color-mix(in srgb, var(--a-ember) 40%, var(--a-line)); background: color-mix(in srgb, var(--a-ember) 5%, #fff); }
        .state-error h3 { color: #8f1d0e; }

        /* ---------- Buttons ---------- */
        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          font-family: inherit; font-size: 13.5px; font-weight: 800; text-decoration: none;
          border-radius: 10px; padding: 11px 16px; cursor: pointer; border: 1.5px solid transparent;
        }
        .btn-primary { background: var(--a-primary); color: #fff; }
        .btn-primary:hover { background: #09508f; }
        .btn-ghost { background: none; border-color: var(--a-line); color: var(--a-text); }
        .btn-ghost:hover { border-color: var(--a-muted); }
        .btn-block { width: 100%; margin-bottom: 12px; }

        /* ---------- Side panels ---------- */
        .panel {
          background: var(--color-surface); border: 1px solid var(--a-line);
          border-radius: 14px; padding: 18px;
        }
        .panel h2 { font-size: 14px; font-weight: 800; margin: 0 0 12px; }
        :global(.panel-row) {
          display: flex; align-items: center; gap: 11px; text-decoration: none; color: var(--a-text);
          border: 1px solid transparent; border-radius: 11px; padding: 9px 8px; margin: 0 -8px;
        }
        :global(.panel-row:hover) { background: rgba(14, 27, 51, 0.04); border-color: var(--a-line); }
        .panel-row strong { display: block; font-size: 13px; }
        .panel-row small { display: block; font-size: 11.5px; color: var(--a-muted); margin-top: 1px; }
        .panel-row-icon {
          width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; display: inline-flex;
          align-items: center; justify-content: center;
          background: color-mix(in srgb, var(--a-primary) 10%, transparent); color: var(--a-primary);
        }
        .cert-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
        .cert-list li { display: flex; align-items: center; gap: 11px; padding: 9px 0; border-bottom: 1px solid var(--a-line); --tone: var(--a-navy); }
        .cert-list li:last-child { border-bottom: none; }
        .cert-list li[data-tone='gold'] { --tone: var(--color-gold); }
        .cert-list li[data-tone='silver'] { --tone: var(--color-silver); }
        .cert-list li[data-tone='bronze'] { --tone: var(--color-bronze); }
        .cert-list li[data-tone='violet'] { --tone: var(--color-accent-violet); }
        .cert-icon { color: var(--tone); display: inline-flex; }
        .cert-label { font-size: 13px; font-weight: 600; }
        .cert-value { margin-left: auto; font-size: 15px; font-weight: 800; color: var(--tone); }
        .panel-foot {
          display: flex; align-items: center; gap: 7px; margin: 12px 0 0; padding-top: 12px;
          border-top: 1px solid var(--a-line); font-size: 12px; color: var(--a-muted);
        }

        /* ---------- Skeletons ---------- */
        .skeleton-wrap { display: flex; flex-direction: column; gap: 16px; }
        .sk { background: #E8ECF2; border-radius: 12px; animation: pulse 1.4s ease-in-out infinite; }
        .sk-header { height: 96px; border-radius: 14px; }
        .sk-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .sk-tile { height: 104px; }
        .sk-match { height: 128px; }
        .shell[data-frame='mobile'] .sk-grid { grid-template-columns: repeat(2, 1fr); }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }

        .proto-foot {
          max-width: 1160px; margin: 0 auto; padding: 0 28px 28px;
          font-family: var(--font-mono); font-size: 11px; color: var(--a-muted);
        }
      `}</style>
    </div>
  );
}
