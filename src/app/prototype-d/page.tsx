'use client';

/**
 * CONCEPT D — "Season Clubhouse" (PROTOTYPE ONLY)
 * Route: /prototype-d · renders sample data, makes no backend calls.
 * The middle path between the plain production dashboard and the neon
 * Prototype C: warm-neutral canvas, deep-navy band, one restrained teal
 * accent (+ clay reserved for live status), bordered cards, editorial
 * headings, standings-style bout table, grouped schedule, progress rail.
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
  IconClock,
  IconClose,
  IconEvents,
  IconIdCard,
  IconMedal,
  IconMenu,
  IconPin,
  IconProfile,
  IconSignOut,
  IconTrophy,
} from '@/lib/prototype/icons';
import type { Match } from '@/lib/types';

const NAV_ITEMS = [
  { href: '/prototype-d', label: 'Dashboard', active: true },
  { href: '/prototype-d/events', label: 'Events' },
  { href: '/prototype-d/matches', label: 'Matches' },
  { href: '/player/certificates', label: 'Certificates' },
  { href: '/player/id-card', label: 'ID Card' },
  { href: '/player/profile', label: 'Profile' },
];

type View = 'populated' | 'empty' | 'loading' | 'error';

export default function ConceptDPage() {
  const [view, setView] = useState<View>('populated');
  const [frame, setFrame] = useState<'desktop' | 'mobile'>('desktop');
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const { player, stats } = sampleDashboard;
  const matches: Match[] = view === 'empty' ? emptyUpcoming : sampleDashboard.upcoming_matches;
  const next = matches[0];
  const rest = matches.slice(1);
  const nextWhen = next ? formatMatchWhen(next) : null;
  const meta = rightMeta(player);

  const seasonPct = Math.min(100, Math.round((stats.total_certs / Math.max(1, stats.events_count + 4)) * 100));
  const ringC = 2 * Math.PI * 30;

  const progressBars = [
    { label: 'Bouts entered', value: stats.events_count, max: 16 },
    { label: 'Podiums', value: stats.certificates.gold + stats.certificates.silver + stats.certificates.bronze, max: 12 },
    { label: 'Honours', value: stats.total_certs, max: 16 },
  ];

  const honours = [
    { label: 'Gold', value: stats.certificates.gold, Icon: IconTrophy },
    { label: 'Silver', value: stats.certificates.silver, Icon: IconMedal },
    { label: 'Bronze', value: stats.certificates.bronze, Icon: IconMedal },
    { label: 'Participation', value: stats.certificates.participation, Icon: IconAward },
  ];

  return (
    <div className="shell" data-frame={frame}>
      <nav className="nav">
        <div className="nav-row">
          <Link href="/prototype-d" className="brand">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 22 22" width="22" height="22">
                <rect x="1.5" y="1.5" width="19" height="19" rx="6" fill="none" stroke="#1C2534" strokeWidth="1.8" />
                <path d="M6.5 14.5 11 6.5l4.5 8" fill="none" stroke="#0F766E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="brand-word">
              MegaSportsX<small>Season clubhouse · D</small>
            </span>
          </Link>
          <div className="tabs">
            {NAV_ITEMS.map((n) => (
              <Link key={n.href} href={n.href} className={`tab ${n.active ? 'is-active' : ''}`}>
                {n.label}
              </Link>
            ))}
          </div>
          <button className="signout"><IconSignOut size={16} /> Sign out</button>
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
          </div>
        )}
      </nav>

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
        <span className="tb-note">Concept D · prototype only · sample data · nothing is sent to the backend</span>
      </div>

      <div className="frame">
        <div className="page">
          {view === 'loading' ? (
            <div className="sk-wrap"><div className="sk sk-band" /><div className="sk sk-cols" /><div className="sk sk-table" /></div>
          ) : (
            <>
              {/* Season band */}
              <section className="band">
                <div className="band-main">
                  <p className="eyebrow">Season 2026 · {player.sport || 'Tournament'}</p>
                  <h1>Welcome back, {player.player_name.split(' ')[0]}</h1>
                  <p className="band-sub">
                    {player.nsrd_id || `#${player.player_id ?? ''}`}
                    {meta ? ` · ${meta.label}: ${meta.value}` : ''}
                    {(player.district || player.state) && ` · ${[player.district, player.state].filter(Boolean).join(', ')}`}
                  </p>
                  <div className="band-stats">
                    <div className="b-stat"><strong>{stats.events_count}</strong><span>Entered</span></div>
                    <div className="b-stat"><strong>{stats.certificates.gold + stats.certificates.silver + stats.certificates.bronze}</strong><span>Podiums</span></div>
                    <div className="b-stat"><strong>{stats.total_certs}</strong><span>Honours</span></div>
                  </div>
                </div>
                <div className="band-ring" aria-label="Season progress">
                  <svg viewBox="0 0 76 76" width="96" height="96">
                    <circle cx="38" cy="38" r="30" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="8" />
                    <circle
                      cx="38" cy="38" r="30" fill="none" stroke="#5FB3AC" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${(seasonPct / 100) * ringC} ${ringC}`} transform="rotate(-90 38 38)"
                    />
                    <text x="38" y="43" textAnchor="middle" fontSize="17" fontWeight="800" fill="#fff">{seasonPct}%</text>
                  </svg>
                  <p>Season<br />complete</p>
                </div>
              </section>

              <div className="cols">
                <div className="col-main">
                  {/* Next bout */}
                  <section className="card featured">
                    <div className="card-head">
                      <h2><span className="live-dot" aria-hidden="true" /> Next bout</h2>
                      <Link href="/prototype-d/matches" className="c-link">Match details <IconArrowRight size={13} /></Link>
                    </div>
                    {view === 'error' ? (
                      <div className="state" role="alert">
                        <h3>Could not load your bouts</h3>
                        <p>Simulated error state — check your connection and retry.</p>
                        <button className="btn-primary" onClick={() => setView('populated')}>Try again</button>
                      </div>
                    ) : !next ? (
                      <div className="state">
                        <span className="state-icon"><IconBout size={20} /></span>
                        <h3>No bouts scheduled</h3>
                        <p>Your next matchup appears here as soon as an organizer schedules it.</p>
                        <Link href="/prototype-d/events" className="btn-primary">Browse events <IconArrowRight size={15} /></Link>
                      </div>
                    ) : (
                      <>
                        <p className="f-event">{next.event_name}</p>
                        <div className="f-vs">
                          <span className="f-side"><span className="f-tag you">You</span></span>
                          <span className="f-mid">vs</span>
                          <span className="f-side opp">{next.opponent_name || 'TBD'}</span>
                        </div>
                        <div className="f-meta">
                          <span className="pill"><IconClock size={13} /> {nextWhen ? `${nextWhen.date}${nextWhen.time ? ` · ${nextWhen.time}` : ''}` : 'Date TBC'}</span>
                          <span className="pill status">{statusLabel(next.status)}</span>
                          {player.sport && <span className="pill ghost"><IconBout size={13} /> {player.sport}</span>}
                        </div>
                      </>
                    )}
                  </section>

                  {/* Schedule tabs */}
                  <section className="card">
                    <div className="card-head">
                      <h2>Schedule</h2>
                      <div className="seg" role="tablist" aria-label="Schedule filter">
                        <button className={tab === 'upcoming' ? 'seg-btn on' : 'seg-btn'} onClick={() => setTab('upcoming')}>Upcoming</button>
                        <button className={tab === 'past' ? 'seg-btn on' : 'seg-btn'} onClick={() => setTab('past')}>Past</button>
                      </div>
                    </div>
                    {tab === 'past' ? (
                      <p className="empty-line">Past results live here once bouts are decided — sample prototype shows upcoming only.</p>
                    ) : rest.length === 0 ? (
                      <p className="empty-line">No other bouts scheduled.</p>
                    ) : (
                      <ul className="sched">
                        {rest.map((m) => {
                          const when = formatMatchWhen(m);
                          return (
                            <li key={m.match_id} className="sched-row">
                              <span className="sched-date"><strong>{when ? when.date.split(' ')[0] : 'TBC'}</strong><small>{when ? when.date.slice(when.date.indexOf(' ') + 1) : ''} {when?.time ? `· ${when.time}` : ''}</small></span>
                              <span className="sched-main"><strong>{m.event_name}</strong><small>You vs {m.opponent_name || 'TBD'}</small></span>
                              <span className="sched-status">{statusLabel(m.status)}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>

                  {/* Standings-style table */}
                  <section className="card">
                    <div className="card-head">
                      <h2>Competition record</h2>
                      <Link href="/player/certificates" className="c-link">Certificates <IconArrowRight size={13} /></Link>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr><th>Event</th><th>Opponent</th><th>Date</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                          {matches.length === 0 ? (
                            <tr><td colSpan={4} className="t-empty">No bouts yet — browse events to enter your first competition.</td></tr>
                          ) : matches.map((m) => {
                            const when = formatMatchWhen(m);
                            return (
                              <tr key={m.match_id} className={m.match_id === next?.match_id ? 'is-next' : ''}>
                                <td>{m.event_name || 'Event'}</td>
                                <td>{m.opponent_name || 'TBD'}</td>
                                <td className="mono">{when ? when.date : 'TBC'}</td>
                                <td><span className="t-status">{statusLabel(m.status)}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>

                <aside className="col-side">
                  {/* Profile */}
                  <section className="card profile">
                    {player.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="avatar" src={player.photo} alt="" />
                    ) : (
                      <div className="avatar" aria-hidden="true">{initialsOf(player.player_name)}</div>
                    )}
                    <h2>{player.player_name}</h2>
                    <p className="p-id mono">{player.nsrd_id || `#${player.player_id ?? ''}`}</p>
                    <div className="p-chips">
                      {player.sport && <span className="pill ghost"><IconBout size={12} /> {player.sport}</span>}
                      {(player.district || player.state) && (
                        <span className="pill ghost"><IconPin size={12} /> {[player.district, player.state].filter(Boolean).join(', ')}</span>
                      )}
                    </div>
                    <div className="p-actions">
                      <Link href="/player/id-card" className="btn-line"><IconIdCard size={15} /> ID card</Link>
                      <Link href="/player/profile" className="btn-line"><IconProfile size={15} /> Profile</Link>
                    </div>
                  </section>

                  {/* Progress */}
                  <section className="card">
                    <div className="card-head"><h2>Season progress</h2></div>
                    {progressBars.map((b) => (
                      <div className="bar-row" key={b.label}>
                        <div className="bar-top"><span>{b.label}</span><span className="mono">{b.value}</span></div>
                        <div className="bar"><span style={{ width: `${Math.min(100, (b.value / b.max) * 100)}%` }} /></div>
                      </div>
                    ))}
                    <Link href="/prototype-d/events" className="btn-primary btn-block"><IconEvents size={16} /> Browse events</Link>
                  </section>

                  {/* Honours */}
                  <section className="card">
                    <div className="card-head">
                      <h2>Honours</h2>
                      <Link href="/player/certificates" className="c-link">View all <IconArrowRight size={13} /></Link>
                    </div>
                    <ul className="honours">
                      {honours.map((h) => (
                        <li key={h.label}>
                          <span className="h-icon"><h.Icon size={15} /></span>
                          <span className="h-label">{h.label}</span>
                          <span className="h-val mono">{h.value}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="card-foot"><IconCheck size={13} /> {stats.total_certs} honours earned in total</p>
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
          --d-bg: #F3F0E9;
          --d-surface: #FFFFFF;
          --d-ink: #1C2534;
          --d-muted: #667085;
          --d-line: #E2DAC9;
          --d-accent: #0F766E;
          --d-accent-soft: rgba(15, 118, 110, 0.09);
          --d-clay: #C2410C;
          min-height: 100vh;
          background: var(--d-bg);
          color: var(--d-ink);
        }
        :global(a) { text-decoration: none; }
        :global(button) { font-family: inherit; }

        .nav { position: sticky; top: 0; z-index: 30; background: var(--d-surface); border-bottom: 1px solid var(--d-line); }
        .nav-row { display: flex; align-items: center; gap: 6px; padding: 10px 28px; }
        :global(.brand) { display: inline-flex; align-items: center; gap: 9px; margin-right: 16px; color: var(--d-ink); flex-shrink: 0; }
        .brand-mark { display: inline-flex; }
        .brand-word { font-size: 15px; font-weight: 800; letter-spacing: -0.2px; line-height: 1.1; }
        .brand-word small { display: block; font-size: 8px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--d-muted); }
        .tabs { display: flex; gap: 2px; overflow: hidden; }
        :global(.tab) { padding: 8px 13px; border-radius: 9px; font-size: 14px; font-weight: 600; color: var(--d-muted); white-space: nowrap; }
        :global(.tab:hover) { background: rgba(28,37,52,0.06); color: var(--d-ink); }
        :global(.tab.is-active) { color: var(--d-accent); background: var(--d-accent-soft); }
        .signout { margin-left: auto; display: inline-flex; align-items: center; gap: 7px; background: none; border: none; color: var(--d-muted); font-size: 13.5px; font-weight: 600; cursor: pointer; padding: 8px 10px; border-radius: 9px; }
        .signout:hover { color: var(--d-clay); background: rgba(194,65,12,0.07); }
        .menu-btn { display: none; }
        .mobile-menu { display: none; }
        .shell[data-frame='mobile'] :global(.tabs), .shell[data-frame='mobile'] .signout { display: none; }
        .shell[data-frame='mobile'] .menu-btn { display: inline-flex; margin-left: auto; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 10px; border: 1.5px solid var(--d-line); background: var(--d-surface); color: var(--d-ink); cursor: pointer; }
        .shell[data-frame='mobile'] .mobile-menu { display: flex; flex-direction: column; padding: 8px 16px 14px; border-top: 1px solid var(--d-line); }
        :global(.m-tab) { padding: 11px 12px; border-radius: 10px; color: var(--d-muted); font-weight: 600; }
        :global(.m-tab.is-active) { color: var(--d-accent); background: var(--d-accent-soft); }

        .toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 18px; padding: 10px 28px; background: var(--d-ink); color: rgba(255,255,255,0.75); font-size: 12px; }
        .tb-group { display: inline-flex; align-items: center; gap: 6px; }
        .tb-label { font-size: 10px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; opacity: 0.7; }
        .tb { font-size: 11.5px; font-weight: 700; cursor: pointer; border: 1px solid rgba(255,255,255,0.25); background: none; color: inherit; border-radius: 999px; padding: 5px 11px; }
        .tb.on { background: #fff; color: var(--d-ink); border-color: #fff; }
        .tb-note { margin-left: auto; font-size: 10.5px; opacity: 0.65; }

        .frame { padding: 24px 28px 0; }
        .page { max-width: 1160px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; }
        .shell[data-frame='mobile'] .frame { padding: 16px 16px 0; }
        .shell[data-frame='mobile'] .page { max-width: 430px; }

        .band { display: flex; gap: 20px; align-items: center; background: var(--d-ink); color: #fff; border-radius: 18px; padding: 26px 28px; border: 1px solid var(--d-ink); }
        .shell[data-frame='mobile'] .band { flex-direction: column; align-items: stretch; }
        .eyebrow { margin: 0 0 8px; font-size: 10.5px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #8FA7A4; }
        .band h1 { margin: 0; font-size: clamp(26px, 3.4vw, 36px); font-weight: 800; letter-spacing: -0.7px; }
        .band-sub { margin: 6px 0 0; font-size: 13px; color: rgba(255,255,255,0.68); }
        .band-stats { display: flex; gap: 22px; margin-top: 16px; }
        .b-stat strong { display: block; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .b-stat span { font-size: 10.5px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: rgba(255,255,255,0.6); }
        .band-ring { margin-left: auto; display: flex; align-items: center; gap: 14px; }
        .shell[data-frame='mobile'] .band-ring { margin-left: 0; }
        .band-ring p { margin: 0; font-size: 11px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: rgba(255,255,255,0.6); }

        .cols { display: grid; grid-template-columns: 1.65fr 1fr; gap: 18px; }
        .shell[data-frame='mobile'] .cols { grid-template-columns: 1fr; }
        .col-main, .col-side { display: flex; flex-direction: column; gap: 18px; min-width: 0; }

        .card { background: var(--d-surface); border: 1px solid var(--d-line); border-radius: 16px; padding: 20px; }
        .featured { border-left: 4px solid var(--d-accent); }
        .card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .card-head h2 { margin: 0; font-size: 13px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; display: inline-flex; align-items: center; gap: 8px; }
        .live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--d-clay); display: inline-block; }
        :global(.c-link) { display: inline-flex; align-items: center; gap: 3px; font-size: 12.5px; font-weight: 700; color: var(--d-accent); }
        .f-event { margin: 0; font-size: 13px; font-weight: 600; color: var(--d-muted); }
        .f-vs { display: flex; align-items: baseline; gap: 12px; margin: 8px 0 12px; flex-wrap: wrap; }
        .f-side { font-size: clamp(24px, 3vw, 32px); font-weight: 800; letter-spacing: -0.6px; }
        .f-tag { font-size: 12px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; background: var(--d-ink); color: #fff; border-radius: 7px; padding: 4px 9px; vertical-align: middle; margin-right: 8px; }
        .f-side.opp { color: var(--d-ink); }
        .f-mid { font-size: 13px; font-weight: 700; color: var(--d-muted); font-style: italic; }
        .f-meta { display: flex; gap: 8px; flex-wrap: wrap; }
        .pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 700; background: var(--d-accent-soft); color: var(--d-accent); border-radius: 999px; padding: 6px 12px; }
        .pill.status { background: rgba(194,65,12,0.09); color: var(--d-clay); text-transform: capitalize; }
        .pill.ghost { background: none; border: 1px solid var(--d-line); color: var(--d-muted); }
        .mono { font-family: var(--font-mono); }

        .seg { display: inline-flex; background: var(--d-bg); border: 1px solid var(--d-line); border-radius: 999px; padding: 3px; }
        .seg-btn { border: none; background: none; font-size: 12px; font-weight: 700; padding: 6px 13px; border-radius: 999px; cursor: pointer; color: var(--d-muted); }
        .seg-btn.on { background: var(--d-ink); color: #fff; }
        .sched { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
        .sched-row { display: grid; grid-template-columns: 108px 1fr auto; gap: 12px; align-items: center; padding: 12px 0; border-top: 1px solid var(--d-line); }
        .sched-row:first-child { border-top: none; padding-top: 0; }
        .sched-date { background: var(--d-bg); border: 1px solid var(--d-line); border-radius: 10px; padding: 7px 9px; text-align: center; }
        .sched-date strong { display: block; font-size: 15px; font-weight: 800; }
        .sched-date small { display: block; font-size: 10.5px; color: var(--d-muted); margin-top: 1px; }
        .sched-main strong { display: block; font-size: 13.5px; }
        .sched-main small { display: block; font-size: 12px; color: var(--d-muted); margin-top: 1px; }
        .sched-status { font-size: 10px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: var(--d-accent); border: 1px solid var(--d-line); border-radius: 999px; padding: 5px 10px; background: var(--d-accent-soft); }
        .empty-line { margin: 0; font-size: 13px; color: var(--d-muted); border: 1px dashed var(--d-line); border-radius: 12px; padding: 16px; }

        .table-wrap { overflow-x: auto; margin: 0 -20px; padding: 0 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 520px; }
        th { text-align: left; font-size: 10px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: var(--d-muted); padding: 8px 10px; border-bottom: 1px solid var(--d-line); }
        td { padding: 11px 10px; border-bottom: 1px solid var(--d-line); font-weight: 600; }
        tr:last-child td { border-bottom: none; }
        tr.is-next td:first-child { border-left: 3px solid var(--d-accent); padding-left: 7px; }
        .t-status { font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: var(--d-accent); background: var(--d-accent-soft); border-radius: 999px; padding: 4px 10px; }
        .t-empty { color: var(--d-muted); font-weight: 500; }

        .profile { text-align: left; }
        .avatar { width: 52px; height: 52px; border-radius: 14px; background: var(--d-ink); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 17px; margin-bottom: 10px; }
        .profile h2 { margin: 0; font-size: 18px; font-weight: 800; letter-spacing: -0.2px; }
        .p-id { margin: 3px 0 0; font-size: 12px; color: var(--d-muted); }
        .p-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
        .p-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 14px; }

        .btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: var(--d-accent); color: #fff; font-size: 13.5px; font-weight: 800; border-radius: 10px; padding: 11px 16px; border: none; cursor: pointer; text-decoration: none; }
        .btn-primary:hover { background: #0c5f59; }
        .btn-line { display: inline-flex; align-items: center; justify-content: center; gap: 7px; background: none; color: var(--d-ink); font-size: 12.5px; font-weight: 700; border-radius: 10px; padding: 10px 12px; border: 1.5px solid var(--d-line); text-decoration: none; }
        .btn-line:hover { border-color: var(--d-accent); color: var(--d-accent); }
        .btn-block { width: 100%; margin-top: 14px; }

        .bar-row { margin-bottom: 12px; }
        .bar-top { display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 700; margin-bottom: 6px; }
        .bar-top .mono { color: var(--d-accent); }
        .bar { height: 7px; border-radius: 999px; background: var(--d-bg); border: 1px solid var(--d-line); overflow: hidden; }
        .bar span { display: block; height: 100%; background: var(--d-accent); border-radius: 999px; }

        .honours { list-style: none; margin: 0; padding: 0; }
        .honours li { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--d-line); }
        .honours li:last-child { border-bottom: none; }
        .h-icon { width: 30px; height: 30px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center; background: var(--d-accent-soft); color: var(--d-accent); }
        .h-label { font-size: 13px; font-weight: 600; }
        .h-val { margin-left: auto; font-size: 15px; font-weight: 800; }
        .card-foot { display: flex; align-items: center; gap: 7px; margin: 12px 0 0; padding-top: 12px; border-top: 1px solid var(--d-line); font-size: 12px; color: var(--d-muted); }

        .state { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; border: 1px dashed var(--d-line); border-radius: 12px; padding: 28px 20px; }
        .state-icon { width: 44px; height: 44px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; background: var(--d-accent-soft); color: var(--d-accent); }
        .state h3 { margin: 0; font-size: 15px; font-weight: 800; }
        .state p { margin: 0 0 8px; font-size: 13px; color: var(--d-muted); max-width: 44ch; }

        .sk-wrap { display: flex; flex-direction: column; gap: 14px; }
        .sk { background: #E7E0D2; border-radius: 14px; animation: pulse 1.4s infinite; }
        .sk-band { height: 170px; } .sk-cols { height: 220px; } .sk-table { height: 160px; }
        @keyframes pulse { 50% { opacity: 0.55; } }
        .proto-foot { max-width: 1160px; margin: 0 auto; padding: 6px 0 28px; font-family: var(--font-mono); font-size: 11px; color: var(--d-muted); }
      `}</style>
    </div>
  );
}
