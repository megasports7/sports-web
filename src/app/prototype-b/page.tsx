'use client';

/**
 * CONCEPT B — "Editorial Competition Hub" (PROTOTYPE ONLY)
 * Route: /prototype-b · renders sample data, makes no backend calls.
 * Dark competition-first canvas: prominent welcome/profile area, visually
 * emphasised NEXT BOUT hero, compact mono statistic strip, prioritised quick
 * actions, minimal remaining-bout rows.
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
  IconClose,
  IconClock,
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

type View = 'populated' | 'empty' | 'loading' | 'error';

export default function ConceptBPage() {
  const [view, setView] = useState<View>('populated');
  const [frame, setFrame] = useState<'desktop' | 'mobile'>('desktop');
  const [menuOpen, setMenuOpen] = useState(false);

  const { player, stats, upcoming_matches } = sampleDashboard;
  const matches: Match[] = view === 'empty' ? emptyUpcoming : upcoming_matches;
  const next = matches[0];
  const nextWhen = next ? formatMatchWhen(next) : null;
  const rest = matches.slice(1);
  const meta = rightMeta(player);

  const strip: { label: string; value: number; Icon: typeof IconEvents; tone: string }[] = [
    { label: 'Events', value: stats.events_count, Icon: IconEvents, tone: 'var(--b-primary)' },
    { label: 'Gold', value: stats.certificates.gold, Icon: IconTrophy, tone: '#F2C14E' },
    { label: 'Silver', value: stats.certificates.silver, Icon: IconMedal, tone: '#C3CBD6' },
    { label: 'Bronze', value: stats.certificates.bronze, Icon: IconMedal, tone: '#E0904F' },
    { label: 'Participation', value: stats.certificates.participation, Icon: IconStar, tone: '#A78BFA' },
    { label: 'Total certs', value: stats.total_certs, Icon: IconAward, tone: 'var(--b-text)' },
  ];

  return (
    <div className="shell" data-frame={frame}>
      {/* ---------- Header ---------- */}
      <nav className="nav">
        <div className="nav-row">
          <Link href="/prototype-b" className="brand">
            <span className="brand-mark">
              <svg viewBox="0 0 22 22" width="22" height="22" aria-hidden="true">
                <path d="M11 2a9 9 0 0 1 0 18 9 9 0 0 0 0-18Z" fill="var(--color-corner-red)" />
                <path d="M11 2a9 9 0 0 0 0 18 9 9 0 0 1 0-18Z" fill="var(--b-primary)" />
              </svg>
            </span>
            <span className="brand-word">
              MegaSportsX<small>TOURNAMENT PLATFORM</small>
            </span>
          </Link>

          <div className="tabs">
            {NAV_ITEMS.map((n) => (
              <Link key={n.href} href={n.href} className={`tab ${n.active ? 'is-active' : ''}`} aria-current={n.active ? 'page' : undefined}>
                {n.label}
              </Link>
            ))}
          </div>

          <button className="signout">
            <IconSignOut size={16} /> Sign out
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
        <span className="tb-note">Concept B · prototype only · sample data · nothing is sent to the backend</span>
      </div>

      <div className="frame">
        <div className="page">
          {view === 'loading' ? (
            <div className="skeleton-wrap">
              <div className="sk sk-hero" />
              <div className="sk sk-strip" />
              <div className="sk sk-rows" />
            </div>
          ) : (
            <>
              {/* ---------- Hero: welcome + featured next bout ---------- */}
              <section className="hero">
                <svg className="court" viewBox="0 0 720 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                  <g fill="none" stroke="#ffffff" strokeWidth="1.2">
                    <rect x="150" y="40" width="420" height="340" />
                    <line x1="150" y1="150" x2="570" y2="150" />
                    <line x1="150" y1="270" x2="570" y2="270" />
                    <line x1="360" y1="40" x2="360" y2="380" />
                    <line x1="150" y1="210" x2="570" y2="210" strokeWidth="2.4" />
                    <line x1="212" y1="40" x2="212" y2="380" opacity="0.5" />
                    <line x1="508" y1="40" x2="508" y2="380" opacity="0.5" />
                  </g>
                </svg>

                <div className="hero-inner">
                  {/* Welcome / profile */}
                  <div className="welcome">
                    {player.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="avatar" src={player.photo} alt="" />
                    ) : (
                      <div className="avatar" aria-hidden="true">{initialsOf(player.player_name)}</div>
                    )}
                    <p className="welcome-eyebrow">Welcome back</p>
                    <h1>{player.player_name}</h1>
                    <div className="welcome-meta">
                      {player.sport && (
                        <span className="chip">
                          <IconBout size={13} /> {player.sport}
                        </span>
                      )}
                      {meta && (
                        <span className="chip ghost">
                          <IconPin size={13} /> {meta.value}
                        </span>
                      )}
                      <span className="id-num">
                        {player.nsrd_id || (player.player_id ? `#${player.player_id}` : player.id.slice(0, 8))}
                      </span>
                    </div>
                  </div>

                  {/* Featured next bout */}
                  <article className="featured" data-empty={!next}>
                    <p className="featured-eyebrow">Next bout</p>
                    {view === 'error' ? (
                      <div className="featured-error" role="alert">
                        <h3>Could not load your bouts</h3>
                        <p>Something went wrong while fetching matches. Simulated error state.</p>
                        <button className="btn btn-ghost" onClick={() => setView('populated')}>Try again</button>
                      </div>
                    ) : !next ? (
                      <div className="featured-empty">
                        <h3>No bouts scheduled</h3>
                        <p>Your next matchup appears here as soon as an organizer schedules it.</p>
                        <Link href="/player/events" className="btn btn-primary">
                          Browse events <IconArrowRight size={16} />
                        </Link>
                      </div>
                    ) : (
                      <>
                        <p className="featured-event">{next.event_name || 'Event'}</p>
                        <div className="featured-vs">
                          <span className="f-side you">You</span>
                          <span className="f-vs">VS</span>
                          <span className="f-side opp">{next.opponent_name || 'TBD'}</span>
                        </div>
                        <div className="featured-meta">
                          <span className="f-status">{statusLabel(next.status)}</span>
                          {nextWhen && (
                            <span className="f-when">
                              <IconClock size={14} />
                              {nextWhen.date}{nextWhen.time ? ` · ${nextWhen.time}` : ''}
                            </span>
                          )}
                        </div>
                        <Link href="/player/matches" className="featured-link">
                          Match details <IconArrowRight size={15} />
                        </Link>
                      </>
                    )}
                  </article>
                </div>
              </section>

              {/* ---------- Compact statistics ---------- */}
              <section className="strip-sec">
                <div className="sec-head">
                  <h2>Record</h2>
                  <span className="sec-note">Registrations &amp; certificates to date</span>
                </div>
                <div className="strip">
                  {strip.map((s) => (
                    <div className="stat" key={s.label}>
                      <span className="stat-icon" style={{ color: s.tone }}><s.Icon size={16} /></span>
                      <span className="stat-value">{s.value}</span>
                      <span className="stat-label">{s.label}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* ---------- Prioritised quick actions ---------- */}
              <section>
                <div className="sec-head">
                  <h2>What next</h2>
                </div>
                <div className="actions">
                  <Link href="/player/events" className="btn btn-primary">
                    <IconEvents size={17} /> Browse events
                  </Link>
                  <Link href="/player/id-card" className="btn btn-ghost-dark">
                    <IconIdCard size={17} /> ID card
                  </Link>
                  <Link href="/player/profile" className="btn btn-ghost-dark">
                    <IconProfile size={17} /> Profile
                  </Link>
                </div>
              </section>

              {/* ---------- Remaining bouts ---------- */}
              <section>
                <div className="sec-head">
                  <h2>More bouts</h2>
                  <Link href="/player/matches" className="sec-link">
                    All matches <IconArrowRight size={14} />
                  </Link>
                </div>

                {rest.length === 0 ? (
                  <p className="more-empty">No other bouts scheduled.</p>
                ) : (
                  <div className="rows">
                    {rest.map((m) => {
                      const when = formatMatchWhen(m);
                      return (
                        <article className="row" key={m.match_id}>
                          <span className="row-when">
                            <IconClock size={13} />
                            {when ? when.date : 'Date TBC'}
                          </span>
                          <span className="row-event">{m.event_name || 'Event'}</span>
                          <span className="row-vs">
                            <span className="you">You</span> vs <span className="opp">{m.opponent_name || 'TBD'}</span>
                          </span>
                          <span className="row-status">{statusLabel(m.status)}</span>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* ---------- Achievements summary (real data) ---------- */}
              <section className="panel">
                <div className="sec-head">
                  <h2>Achievements</h2>
                  <Link href="/player/certificates" className="sec-link">
                    Certificates <IconArrowRight size={14} />
                  </Link>
                </div>
                <div className="ach">
                  <div className="ach-item" style={{ '--tone': '#F2C14E' } as React.CSSProperties}>
                    <IconTrophy size={20} />
                    <strong>{stats.certificates.gold}</strong>
                    <small>Gold</small>
                  </div>
                  <div className="ach-item" style={{ '--tone': '#C3CBD6' } as React.CSSProperties}>
                    <IconMedal size={20} />
                    <strong>{stats.certificates.silver}</strong>
                    <small>Silver</small>
                  </div>
                  <div className="ach-item" style={{ '--tone': '#E0904F' } as React.CSSProperties}>
                    <IconMedal size={20} />
                    <strong>{stats.certificates.bronze}</strong>
                    <small>Bronze</small>
                  </div>
                  <div className="ach-item" style={{ '--tone': '#A78BFA' } as React.CSSProperties}>
                    <IconStar size={20} />
                    <strong>{stats.certificates.participation}</strong>
                    <small>Participation</small>
                  </div>
                </div>
                <p className="panel-foot">
                  <IconCheck size={14} /> {stats.total_certs} certificates earned in total
                </p>
              </section>
            </>
          )}
        </div>
      </div>

      <p className="proto-foot">{PROTOTYPE_NOTE}</p>

      <style jsx>{`
        .shell {
          --b-bg: #0B1220;
          --b-surface: #121C2E;
          --b-line: rgba(255, 255, 255, 0.1);
          --b-text: #F3F6FA;
          --b-muted: #96A2B6;
          --b-primary: #38B6EA;
          --b-ember: #FF7A4D;
          min-height: 100vh;
          background: var(--b-bg);
          color: var(--b-text);
        }
        :global(a) { text-decoration: none; }
        :global(button) { font-family: inherit; }

        /* ---------- Nav ---------- */
        .nav { position: sticky; top: 0; z-index: 30; border-bottom: 1px solid var(--b-line); background: rgba(11, 18, 32, 0.92); backdrop-filter: blur(8px); }
        .nav-row { display: flex; align-items: center; gap: 6px; padding: 10px 28px; }
        :global(.brand) { display: inline-flex; align-items: center; gap: 9px; margin-right: 16px; color: var(--b-text); flex-shrink: 0; }
        .brand-mark { display: inline-flex; }
        .brand-word { font-size: 15px; font-weight: 800; line-height: 1.1; }
        .brand-word small { display: block; font-family: var(--font-mono); font-weight: 500; font-size: 8px; letter-spacing: 1.6px; color: var(--b-muted); }
        .tabs { display: flex; align-items: center; gap: 2px; flex-wrap: nowrap; overflow: hidden; }
        :global(.tab) { padding: 8px 13px; border-radius: 9px; white-space: nowrap; font-size: 14px; font-weight: 600; color: var(--b-muted); }
        :global(.tab:hover) { color: var(--b-text); background: rgba(255, 255, 255, 0.06); }
        :global(.tab.is-active) { color: var(--b-text); background: rgba(56, 182, 234, 0.14); }
        .signout {
          margin-left: auto; display: inline-flex; align-items: center; gap: 7px;
          font-size: 13.5px; font-weight: 600; color: var(--b-muted);
          background: none; border: none; border-radius: 9px; padding: 8px 10px; cursor: pointer;
        }
        .signout:hover { color: var(--b-ember); background: rgba(255, 122, 77, 0.1); }
        .menu-btn { display: none; }
        .mobile-menu { display: none; }
        .shell[data-frame='mobile'] :global(.tabs),
        .shell[data-frame='mobile'] .signout { display: none; }
        .shell[data-frame='mobile'] .menu-btn {
          display: inline-flex; margin-left: auto; align-items: center; justify-content: center;
          width: 38px; height: 38px; border-radius: 10px; cursor: pointer;
          border: 1px solid var(--b-line); background: var(--b-surface); color: var(--b-text);
        }
        .shell[data-frame='mobile'] .mobile-menu { display: flex; flex-direction: column; gap: 2px; padding: 8px 16px 14px; border-top: 1px solid var(--b-line); }
        :global(.m-tab) { padding: 11px 12px; border-radius: 10px; font-size: 14.5px; font-weight: 600; color: var(--b-muted); }
        :global(.m-tab.is-active) { color: var(--b-text); background: rgba(56, 182, 234, 0.14); }
        .m-signout {
          display: inline-flex; align-items: center; gap: 8px; margin-top: 6px; text-align: left;
          padding: 11px 12px; border: none; border-top: 1px solid var(--b-line); border-radius: 0;
          background: none; font-size: 14px; font-weight: 600; color: var(--b-muted); cursor: pointer;
        }

        /* ---------- Toolbar ---------- */
        .toolbar {
          display: flex; flex-wrap: wrap; align-items: center; gap: 8px 18px;
          padding: 10px 28px; border-bottom: 1px solid var(--b-line);
          background: rgba(255, 255, 255, 0.03); font-size: 12px; color: var(--b-muted);
        }
        .tb-group { display: inline-flex; align-items: center; gap: 6px; }
        .tb-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; opacity: 0.75; }
        .tb { font-size: 11.5px; font-weight: 700; cursor: pointer; border: 1px solid var(--b-line); background: none; color: inherit; border-radius: 999px; padding: 5px 11px; }
        .tb:hover { border-color: rgba(255, 255, 255, 0.4); }
        .tb.on { background: var(--b-text); color: #0B1220; border-color: var(--b-text); }
        .tb-note { margin-left: auto; font-family: var(--font-mono); font-size: 10.5px; opacity: 0.7; }

        /* ---------- Layout ---------- */
        .frame { padding: 26px 28px 0; }
        .page { max-width: 1160px; margin: 0 auto; display: flex; flex-direction: column; gap: 26px; }
        .shell[data-frame='mobile'] .frame { padding: 16px 16px 0; }
        .shell[data-frame='mobile'] .page { max-width: 430px; }

        /* ---------- Hero ---------- */
        .hero { position: relative; overflow: hidden; border: 1px solid var(--b-line); border-radius: 18px; background: linear-gradient(135deg, #14243D 0%, #0B1220 62%); }
        .court { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.1; }
        .hero-inner { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr; gap: 20px; padding: 26px; }
        @media (min-width: 1000px) { .hero-inner { grid-template-columns: 1fr 1fr; align-items: stretch; } }
        .shell[data-frame='mobile'] .hero-inner { grid-template-columns: 1fr; }

        .welcome { display: flex; flex-direction: column; gap: 8px; }
        .avatar {
          width: 56px; height: 56px; border-radius: 16px; object-fit: cover; margin-bottom: 6px;
          background: linear-gradient(140deg, var(--b-primary), #1B4F72); color: #04182B;
          display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 19px;
        }
        .welcome-eyebrow {
          margin: 0; font-family: var(--font-mono); font-size: 10.5px; font-weight: 700;
          letter-spacing: 2.4px; text-transform: uppercase; color: var(--b-ember);
        }
        .welcome h1 { margin: 0; font-size: clamp(30px, 4vw, 44px); font-weight: 800; letter-spacing: -1.2px; line-height: 1.02; }
        .welcome-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 4px; }
        .chip {
          display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 700;
          color: var(--b-primary); background: rgba(56, 182, 234, 0.12);
          border: 1px solid rgba(56, 182, 234, 0.28); border-radius: 999px; padding: 5px 12px;
        }
        .chip.ghost { color: var(--b-muted); background: none; border-color: var(--b-line); }
        .id-num { font-family: var(--font-mono); font-size: 12px; color: var(--b-muted); }

        /* ---------- Featured bout ---------- */
        .featured {
          position: relative; display: flex; flex-direction: column; gap: 10px;
          background: rgba(9, 15, 27, 0.72); border: 1px solid var(--b-line);
          border-left: 3px solid var(--b-ember); border-radius: 14px; padding: 22px 24px;
        }
        .featured[data-empty='true'] { border-left-color: var(--b-line); }
        .featured-eyebrow {
          margin: 0; font-family: var(--font-mono); font-size: 10px; font-weight: 700;
          letter-spacing: 2.4px; text-transform: uppercase; color: var(--b-ember);
        }
        .featured[data-empty='true'] .featured-eyebrow { color: var(--b-muted); }
        .featured-event { margin: 0; font-size: 13px; font-weight: 600; color: var(--b-muted); }
        .featured-vs { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
        .f-side { font-size: clamp(24px, 3vw, 34px); font-weight: 800; letter-spacing: -0.8px; line-height: 1.05; }
        .f-side.you { color: var(--b-ember); }
        .f-side.opp { color: var(--b-text); }
        .f-vs { font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: var(--b-muted); }
        .featured-meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 2px; }
        .f-status {
          font-family: var(--font-mono); font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: var(--b-primary);
          border: 1px solid rgba(56, 182, 234, 0.35); border-radius: 999px; padding: 4px 10px;
        }
        .f-when { display: inline-flex; align-items: center; gap: 7px; font-family: var(--font-mono); font-size: 12.5px; color: var(--b-muted); }
        .featured-link {
          display: inline-flex; align-items: center; gap: 7px; margin-top: 8px; align-self: flex-start;
          font-size: 13px; font-weight: 800; color: var(--b-primary);
          border-bottom: 1.5px solid rgba(56, 182, 234, 0.4); padding-bottom: 2px;
        }
        .featured-empty h3, .featured-error h3 { margin: 0; font-size: 18px; font-weight: 800; }
        .featured-empty p, .featured-error p { margin: 0 0 10px; font-size: 13px; color: var(--b-muted); line-height: 1.55; max-width: 40ch; }

        /* ---------- Sections ---------- */
        .sec-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .sec-head h2 { margin: 0; font-size: 13px; font-weight: 800; letter-spacing: 1.6px; text-transform: uppercase; }
        .sec-note { font-size: 12px; color: var(--b-muted); }
        :global(.sec-link) { display: inline-flex; align-items: center; gap: 3px; font-size: 12.5px; font-weight: 700; color: var(--b-primary); }

        /* ---------- Stat strip ---------- */
        .strip { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid var(--b-line); border-radius: 14px; background: var(--b-surface); }
        @media (min-width: 720px) { .strip { grid-template-columns: repeat(6, 1fr); } }
        .stat { display: flex; flex-direction: column; gap: 2px; padding: 14px 16px; border-right: 1px solid var(--b-line); border-bottom: 1px solid var(--b-line); }
        .stat-icon { display: inline-flex; margin-bottom: 4px; }
        .stat-value { font-family: var(--font-mono); font-size: 24px; font-weight: 700; letter-spacing: -0.5px; line-height: 1; }
        .stat-label { font-size: 10.5px; font-weight: 600; color: var(--b-muted); text-transform: uppercase; letter-spacing: 0.8px; }
        @media (min-width: 720px) {
          .stat:nth-child(3n) { border-right: none; }
          .stat:nth-child(n+4) { border-bottom: none; }
        }

        /* ---------- Buttons ---------- */
        .btn {
          display: inline-flex; align-items: center; gap: 9px; font-size: 13.5px; font-weight: 800;
          border-radius: 10px; padding: 12px 18px; cursor: pointer; border: 1.5px solid transparent;
        }
        .btn-primary { background: var(--b-primary); color: #04182B; }
        .btn-primary:hover { background: #4FC5F2; }
        .btn-ghost-dark { background: var(--b-surface); color: var(--b-text); border-color: var(--b-line); }
        .btn-ghost-dark:hover { border-color: var(--b-primary); color: var(--b-primary); }
        .btn-ghost { background: none; color: var(--b-text); border-color: var(--b-line); }
        .btn-ghost:hover { border-color: var(--b-muted); }
        .actions { display: flex; flex-wrap: wrap; gap: 10px; }

        /* ---------- Rows ---------- */
        .rows { display: flex; flex-direction: column; border: 1px solid var(--b-line); border-radius: 14px; background: var(--b-surface); overflow: hidden; }
        .row {
          display: grid; grid-template-columns: 1fr; gap: 4px;
          padding: 13px 16px; border-bottom: 1px solid var(--b-line);
        }
        .row:last-child { border-bottom: none; }
        @media (min-width: 760px) { .row { grid-template-columns: 150px 1fr 260px auto; align-items: center; gap: 14px; } }
        .row-when { display: inline-flex; align-items: center; gap: 7px; font-family: var(--font-mono); font-size: 12px; color: var(--b-muted); }
        .row-event { font-size: 13.5px; font-weight: 700; }
        .row-vs { font-size: 13px; color: var(--b-muted); }
        .row-vs .you { color: var(--b-ember); font-weight: 800; }
        .row-vs .opp { color: var(--b-text); font-weight: 700; }
        .row-status {
          font-family: var(--font-mono); font-size: 9.5px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; color: var(--b-primary); justify-self: start;
          border: 1px solid rgba(56, 182, 234, 0.35); border-radius: 999px; padding: 4px 10px;
        }
        .more-empty { margin: 0; font-size: 13px; color: var(--b-muted); padding: 18px 16px; border: 1px dashed var(--b-line); border-radius: 14px; }

        /* ---------- Achievements ---------- */
        .panel { border: 1px solid var(--b-line); border-radius: 14px; background: var(--b-surface); padding: 18px; }
        .ach { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        @media (min-width: 620px) { .ach { grid-template-columns: repeat(4, 1fr); } }
        .ach-item {
          display: flex; flex-direction: column; gap: 4px; padding: 14px;
          border: 1px solid var(--b-line); border-radius: 12px; color: var(--tone);
        }
        .ach-item strong { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; line-height: 1; }
        .ach-item small { font-size: 11px; font-weight: 600; color: var(--b-muted); }
        .panel-foot {
          display: flex; align-items: center; gap: 8px; margin: 14px 0 0; padding-top: 13px;
          border-top: 1px solid var(--b-line); font-size: 12px; color: var(--b-muted);
        }

        /* ---------- Skeletons ---------- */
        .skeleton-wrap { display: flex; flex-direction: column; gap: 18px; }
        .sk { background: #1B2637; border-radius: 14px; animation: pulse 1.4s ease-in-out infinite; }
        .sk-hero { height: 250px; }
        .sk-strip { height: 92px; }
        .sk-rows { height: 150px; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }

        .proto-foot {
          max-width: 1160px; margin: 0 auto; padding: 26px 28px 28px;
          font-family: var(--font-mono); font-size: 11px; color: var(--b-muted);
        }
      `}</style>
    </div>
  );
}
