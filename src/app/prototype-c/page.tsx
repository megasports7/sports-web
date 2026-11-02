'use client';

/**
 * CONCEPT C — "Matchday Poster / Ticket Stub" (PROTOTYPE ONLY)
 * Route: /prototype-c · renders sample data, makes no backend calls.
 * Deliberately different from A (light premium grid) and B (dark editorial):
 * cream paper canvas, giant condensed matchday typography, ticket-stub next
 * bout, scoreboard stat strip, league ladder + stamp-badge trophy cabinet.
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
  { href: '/player', label: 'Dashboard', active: true },
  { href: '/player/events', label: 'Events' },
  { href: '/player/matches', label: 'Matches' },
  { href: '/player/certificates', label: 'Certificates' },
  { href: '/player/id-card', label: 'ID Card' },
  { href: '/player/profile', label: 'Profile' },
];

type View = 'populated' | 'empty' | 'loading' | 'error';

const QUICK: { href: string; label: string }[] = [
  { href: '/player/events', label: 'Find a bout' },
  { href: '/player/id-card', label: 'ID card' },
  { href: '/player/profile', label: 'Profile' },
];

export default function ConceptCPage() {
  const [view, setView] = useState<View>('populated');
  const [frame, setFrame] = useState<'desktop' | 'mobile'>('desktop');
  const [menuOpen, setMenuOpen] = useState(false);

  const { player, stats } = sampleDashboard;
  const matches: Match[] = view === 'empty' ? emptyUpcoming : sampleDashboard.upcoming_matches;
  const next = matches[0];
  const rest = matches.slice(1);
  const nextWhen = next ? formatMatchWhen(next) : null;
  const meta = rightMeta(player);

  const board: { label: string; value: number }[] = [
    { label: 'Bouts entered', value: stats.events_count },
    { label: 'Gold', value: stats.certificates.gold },
    { label: 'Silver', value: stats.certificates.silver },
    { label: 'Bronze', value: stats.certificates.bronze },
    { label: 'Total honours', value: stats.total_certs },
  ];

  const stamps: { label: string; value: number; tone: string }[] = [
    { label: 'Gold', value: stats.certificates.gold, tone: '#B8860B' },
    { label: 'Silver', value: stats.certificates.silver, tone: '#6B7280' },
    { label: 'Bronze', value: stats.certificates.bronze, tone: '#B45309' },
    { label: 'Finisher', value: stats.certificates.participation, tone: '#131110' },
  ];

  // League-ladder rows (sample-only): player sits mid-table like Duolingo/Brilliant.
  const ladder = [
    { name: 'Manjula Devi', xp: '312 pts', rank: 4 },
    { name: 'Sneha Rao', xp: '298 pts', rank: 5 },
    { name: `${player.player_name} (you)`, xp: `${stats.total_certs * 24} pts`, rank: 6, you: true },
    { name: 'TBD Challenger', xp: '240 pts', rank: 7 },
    { name: 'Open Mat Qualifier', xp: '211 pts', rank: 8 },
  ];

  return (
    <div className="shell" data-frame={frame}>
      <nav className="nav">
        <div className="nav-row">
          <Link href="/prototype-c" className="brand">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 22 22" width="22" height="22">
                <rect x="1.5" y="1.5" width="19" height="19" rx="5" fill="#D7F525" />
                <path d="M6.5 14.5 11 6l4.5 8.5" stroke="#141110" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="11" cy="15.5" r="1.3" fill="#E8492D" />
              </svg>
            </span>
            <span className="brand-word">
              MegaSportsX<small>Matchday prototype C</small>
            </span>
          </Link>
          <div className="tabs">
            {NAV_ITEMS.map((n) => (
              <Link key={n.href} href={n.href} className={`tab ${n.active ? 'is-active' : ''}`}>
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
        <span className="tb-note">Concept C · prototype only · sample data · nothing is sent to the backend</span>
      </div>

      <div className="frame">
        <div className="page">
          {view === 'loading' ? (
            <div className="sk-wrap">
              <div className="sk sk-poster" />
              <div className="sk sk-ticket" />
              <div className="sk sk-cols" />
            </div>
          ) : (
            <>
              {/* Poster hero */}
              <section className="poster">
                <p className="poster-kicker">
                  <IconBout size={14} /> {player.sport || 'Tournament'} · Season 2026 · Matchday 03
                </p>
                <h1 className="poster-title">
                  Ready for
                  <span className="poster-accent"> fight night</span>
                </h1>
                <div className="poster-athlete">
                  {player.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="poster-avatar" src={player.photo} alt="" />
                  ) : (
                    <div className="poster-avatar" aria-hidden="true">{initialsOf(player.player_name)}</div>
                  )}
                  <div>
                    <p className="poster-name">{player.player_name}</p>
                    <p className="poster-sub">
                      {player.nsrd_id || `#${player.player_id ?? ''}`}
                      {meta ? ` · ${meta.value}` : ''}
                    </p>
                  </div>
                  <div className="poster-chips">
                    <span className="p-chip volt">
                      <IconPin size={13} /> {player.district || player.state || 'India'}
                    </span>
                    <span className="p-chip">
                      <IconMedal size={13} /> {stats.total_certs} honours
                    </span>
                  </div>
                </div>
              </section>

              {/* Scoreboard strip */}
              <section className="board" aria-label="Tournament record">
                <div className="board-head">
                  <span className="board-live"><span className="dot" /> Season record</span>
                  <span className="board-q">Q1–Q4 · all bouts</span>
                </div>
                <div className="board-cells">
                  {board.map((b) => (
                    <div className="cell" key={b.label}>
                      <span className="cell-val">{b.value}</span>
                      <span className="cell-lab">{b.label}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Ticket stub next bout */}
              <section className="ticket" data-empty={!next || view === 'error'}>
                <div className="stub-main">
                  <p className="stub-eyebrow">Next bout · Gate A</p>
                  {view === 'error' ? (
                    <div role="alert" className="stub-state">
                      <h2>Could not load your bouts</h2>
                      <p>Simulated error state — check connection and retry.</p>
                      <button className="btn-ink" onClick={() => setView('populated')}>Try again</button>
                    </div>
                  ) : !next ? (
                    <div className="stub-state">
                      <h2>No bouts scheduled</h2>
                      <p>Your ticket prints here as soon as an organizer schedules you.</p>
                      <Link href="/player/events" className="btn-volt">Browse events <IconArrowRight size={15} /></Link>
                    </div>
                  ) : (
                    <>
                      <p className="stub-event">{next.event_name}</p>
                      <div className="stub-vs">
                        <span className="vs-you">You</span>
                        <span className="vs-sep">VS</span>
                        <span className="vs-opp">{next.opponent_name || 'TBD'}</span>
                      </div>
                      <div className="stub-meta">
                        <span className="s-pill"><IconClock size={13} /> {nextWhen ? `${nextWhen.date}${nextWhen.time ? ` · ${nextWhen.time}` : ''}` : 'Date TBC'}</span>
                        <span className="s-pill hot">{statusLabel(next.status)}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="stub-perf" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /></div>
                <div className="stub-side">
                  <p className="side-label">Admit one</p>
                  <p className="side-id">{player.nsrd_id || `#${player.player_id ?? '1042'}`}</p>
                  <Link href="/player/matches" className="btn-ink">Match details <IconArrowRight size={15} /></Link>
                  <div className="side-actions">
                    {QUICK.map((q) => (
                      <Link key={q.href} href={q.href} className="side-link">{q.label}</Link>
                    ))}
                  </div>
                </div>
              </section>

              <div className="cols">
                {/* Schedule */}
                <section className="panel">
                  <div className="panel-head">
                    <h2> bout schedule</h2>
                    <Link href="/player/matches" className="p-link">All matches <IconArrowRight size={13} /></Link>
                  </div>
                  {rest.length === 0 ? (
                    <p className="empty-line">No other bouts scheduled.</p>
                  ) : (
                    <ul className="sched">
                      {rest.map((m) => {
                        const when = formatMatchWhen(m);
                        return (
                          <li key={m.match_id} className="sched-row">
                            <span className="sched-date">{when ? when.date : 'TBC'}</span>
                            <span className="sched-main">
                              <strong>{m.event_name}</strong>
                              <small>You vs {m.opponent_name || 'TBD'} · {statusLabel(m.status)}</small>
                            </span>
                            <span className="sched-time">{when?.time || '--:--'}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div className="quick-row">
                    <Link href="/player/events" className="btn-volt"><IconEvents size={16} /> Browse events</Link>
                    <Link href="/player/id-card" className="btn-line"><IconIdCard size={16} /> ID card</Link>
                    <Link href="/player/profile" className="btn-line"><IconProfile size={16} /> Profile</Link>
                  </div>
                </section>

                {/* Ladder + trophies */}
                <aside className="side-col">
                  <section className="panel ladder">
                    <div className="panel-head">
                      <h2>League ladder</h2>
                      <span className="p-note">Top 6 advance</span>
                    </div>
                    <ul>
                      {ladder.map((r) => (
                        <li key={r.rank} className={r.you ? 'l-row you' : 'l-row'}>
                          <span className="l-rank">{r.rank}</span>
                          <span className="l-name">{r.name}</span>
                          <span className="l-xp">{r.xp}</span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="panel cabinet">
                    <div className="panel-head">
                      <h2>Trophy cabinet</h2>
                      <Link href="/player/certificates" className="p-link">Certificates <IconArrowRight size={13} /></Link>
                    </div>
                    <div className="stamps">
                      {stamps.map((s) => (
                        <div className="stamp" key={s.label} style={{ '--tone': s.tone } as React.CSSProperties}>
                          <span className="stamp-seal"><IconTrophy size={18} /></span>
                          <strong>{s.value}</strong>
                          <small>{s.label}</small>
                        </div>
                      ))}
                    </div>
                    <p className="cab-foot"><IconCheck size={13} /> {stats.total_certs} certificates earned · <IconAward size={13} /> {stats.events_count} events entered</p>
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
          --c-paper: #FAF4E8;
          --c-ink: #141110;
          --c-volt: #D7F525;
          --c-red: #E8492D;
          --c-line: #E4D9C3;
          --c-card: #FFFDF7;
          --c-muted: #6E6455;
          min-height: 100vh;
          background:
            repeating-linear-gradient(0deg, rgba(20,17,16,0.025) 0 1px, transparent 1px 28px),
            var(--c-paper);
          color: var(--c-ink);
        }
        :global(a) { text-decoration: none; }
        :global(button) { font-family: inherit; }

        .nav { position: sticky; top: 0; z-index: 30; background: var(--c-ink); color: #fff; }
        .nav-row { display: flex; align-items: center; gap: 6px; padding: 10px 28px; }
        :global(.brand) { display: inline-flex; align-items: center; gap: 9px; margin-right: 16px; color: #fff; flex-shrink: 0; }
        .brand-mark { display: inline-flex; }
        .brand-word { font-size: 15px; font-weight: 900; letter-spacing: -0.2px; line-height: 1.1; text-transform: uppercase; }
        .brand-word small { display: block; font-size: 8px; font-weight: 700; letter-spacing: 1.6px; color: var(--c-volt); }
        .tabs { display: flex; gap: 2px; overflow: hidden; }
        :global(.tab) { padding: 8px 13px; border-radius: 999px; font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.65); white-space: nowrap; }
        :global(.tab:hover) { color: #fff; background: rgba(255,255,255,0.1); }
        :global(.tab.is-active) { color: var(--c-ink); background: var(--c-volt); }
        .signout { margin-left: auto; display: inline-flex; align-items: center; gap: 7px; background: none; border: none; color: rgba(255,255,255,0.7); font-size: 13.5px; font-weight: 600; cursor: pointer; padding: 8px 10px; border-radius: 9px; }
        .signout:hover { color: var(--c-volt); }
        .menu-btn { display: none; }
        .mobile-menu { display: none; }
        .shell[data-frame='mobile'] :global(.tabs), .shell[data-frame='mobile'] .signout { display: none; }
        .shell[data-frame='mobile'] .menu-btn { display: inline-flex; margin-left: auto; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2); background: none; color: #fff; cursor: pointer; }
        .shell[data-frame='mobile'] .mobile-menu { display: flex; flex-direction: column; padding: 8px 16px 14px; border-top: 1px solid rgba(255,255,255,0.12); }
        :global(.m-tab) { padding: 11px 12px; border-radius: 10px; color: rgba(255,255,255,0.75); font-weight: 600; }

        .toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 18px; padding: 10px 28px; background: var(--c-volt); color: var(--c-ink); font-size: 12px; border-bottom: 2px solid var(--c-ink); }
        .tb-group { display: inline-flex; align-items: center; gap: 6px; }
        .tb-label { font-size: 10px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; }
        .tb { font-size: 11.5px; font-weight: 800; cursor: pointer; border: 1.5px solid var(--c-ink); background: none; color: inherit; border-radius: 999px; padding: 5px 11px; }
        .tb.on { background: var(--c-ink); color: var(--c-volt); }
        .tb-note { margin-left: auto; font-size: 10.5px; font-weight: 600; }

        .frame { padding: 26px 28px 0; }
        .page { max-width: 1160px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; }
        .shell[data-frame='mobile'] .frame { padding: 16px 16px 0; }
        .shell[data-frame='mobile'] .page { max-width: 430px; }

        .poster { background: var(--c-ink); color: #fff; border-radius: 20px; padding: 28px; position: relative; overflow: hidden; border: 2px solid var(--c-ink); }
        .poster::after { content: 'C-03'; position: absolute; right: 14px; bottom: -18px; font-size: 120px; font-weight: 900; letter-spacing: -6px; color: rgba(255,255,255,0.06); }
        .poster-kicker { margin: 0 0 10px; display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: var(--c-volt); }
        .poster-title { margin: 0; font-size: clamp(42px, 6vw, 76px); font-weight: 900; letter-spacing: -0.04em; line-height: 0.9; text-transform: uppercase; }
        .poster-accent { color: var(--c-volt); }
        .poster-athlete { display: flex; align-items: center; gap: 14px; margin-top: 20px; padding-top: 18px; border-top: 1px dashed rgba(255,255,255,0.25); flex-wrap: wrap; }
        .poster-avatar { width: 54px; height: 54px; border-radius: 50%; background: var(--c-volt); color: var(--c-ink); display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 18px; border: 2px solid #fff; }
        .poster-name { margin: 0; font-size: 19px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.2px; }
        .poster-sub { margin: 2px 0 0; font-family: var(--font-mono); font-size: 12px; color: rgba(255,255,255,0.65); }
        .poster-chips { margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap; }
        .p-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 800; border: 1.5px solid rgba(255,255,255,0.3); border-radius: 999px; padding: 6px 12px; }
        .p-chip.volt { background: var(--c-volt); color: var(--c-ink); border-color: var(--c-volt); }

        .board { background: var(--c-card); border: 2px solid var(--c-ink); border-radius: 16px; overflow: hidden; }
        .board-head { display: flex; justify-content: space-between; align-items: center; background: var(--c-ink); color: #fff; padding: 9px 16px; font-size: 11px; font-weight: 800; letter-spacing: 1.6px; text-transform: uppercase; }
        .board-live { display: inline-flex; align-items: center; gap: 8px; }
        .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--c-red); animation: blink 1.4s infinite; }
        @keyframes blink { 50% { opacity: 0.3; } }
        .board-q { color: var(--c-volt); font-family: var(--font-mono); }
        .board-cells { display: grid; grid-template-columns: repeat(5, 1fr); }
        .shell[data-frame='mobile'] .board-cells { grid-template-columns: repeat(2, 1fr); }
        .cell { padding: 14px 12px; text-align: center; border-right: 1.5px solid var(--c-ink); }
        .cell:last-child { border-right: none; }
        .shell[data-frame='mobile'] .cell { border-bottom: 1.5px solid var(--c-ink); }
        .cell-val { display: block; font-size: 30px; font-weight: 900; letter-spacing: -1px; line-height: 1; }
        .cell-lab { display: block; margin-top: 4px; font-size: 10px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: var(--c-muted); }

        .ticket { display: grid; grid-template-columns: 1.6fr auto 1fr; background: var(--c-volt); border: 2px solid var(--c-ink); border-radius: 18px; overflow: hidden; }
        .shell[data-frame='mobile'] .ticket { grid-template-columns: 1fr; }
        .stub-main { padding: 22px; }
        .stub-eyebrow { margin: 0 0 8px; font-size: 11px; font-weight: 900; letter-spacing: 2.2px; text-transform: uppercase; }
        .stub-event { margin: 0; font-size: 13px; font-weight: 700; }
        .stub-vs { display: flex; align-items: baseline; gap: 12px; margin: 8px 0 14px; flex-wrap: wrap; }
        .vs-you { font-size: clamp(28px, 4vw, 44px); font-weight: 900; text-transform: uppercase; letter-spacing: -1.5px; background: var(--c-ink); color: var(--c-volt); padding: 2px 12px; border-radius: 10px; }
        .vs-sep { font-family: var(--font-mono); font-weight: 700; font-size: 14px; }
        .vs-opp { font-size: clamp(28px, 4vw, 44px); font-weight: 900; text-transform: uppercase; letter-spacing: -1.5px; }
        .stub-meta { display: flex; gap: 8px; flex-wrap: wrap; }
        .s-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 800; background: #fff; border: 1.5px solid var(--c-ink); border-radius: 999px; padding: 6px 12px; }
        .s-pill.hot { background: var(--c-red); color: #fff; text-transform: capitalize; }
        .stub-perf { display: flex; flex-direction: column; justify-content: space-around; align-items: center; padding: 12px 4px; border-left: 2px dashed var(--c-ink); border-right: 2px dashed var(--c-ink); }
        .shell[data-frame='mobile'] .stub-perf { flex-direction: row; border: none; border-top: 2px dashed var(--c-ink); border-bottom: 2px dashed var(--c-ink); padding: 4px 12px; }
        .stub-perf span { width: 8px; height: 8px; border-radius: 50%; background: var(--c-paper); border: 1.5px solid var(--c-ink); }
        .stub-side { background: var(--c-ink); color: #fff; padding: 20px; display: flex; flex-direction: column; gap: 10px; }
        .side-label { margin: 0; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: var(--c-volt); }
        .side-id { margin: 0; font-family: var(--font-mono); font-size: 14px; }
        .side-actions { display: flex; gap: 12px; margin-top: 6px; flex-wrap: wrap; }
        .side-link { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.75); text-decoration: underline; text-underline-offset: 3px; }
        .stub-state h2 { margin: 0 0 6px; font-size: 26px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; }
        .stub-state p { margin: 0 0 12px; font-size: 13.5px; font-weight: 600; }

        .btn-volt { display: inline-flex; align-items: center; gap: 8px; background: var(--c-ink); color: var(--c-volt); font-size: 13.5px; font-weight: 900; border-radius: 12px; padding: 12px 16px; border: 2px solid var(--c-ink); cursor: pointer; }
        .btn-ink { display: inline-flex; align-items: center; gap: 8px; background: #fff; color: var(--c-ink); font-size: 13.5px; font-weight: 900; border-radius: 12px; padding: 11px 15px; border: 2px solid #fff; cursor: pointer; align-self: flex-start; }
        .btn-line { display: inline-flex; align-items: center; gap: 8px; background: none; color: var(--c-ink); font-size: 13px; font-weight: 800; border-radius: 12px; padding: 11px 15px; border: 2px solid var(--c-ink); }

        .cols { display: grid; grid-template-columns: 1.5fr 1fr; gap: 18px; }
        .shell[data-frame='mobile'] .cols { grid-template-columns: 1fr; }
        .panel { background: var(--c-card); border: 2px solid var(--c-ink); border-radius: 16px; padding: 18px; }
        .panel-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
        .panel-head h2 { margin: 0; font-size: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.2px; }
        :global(.p-link) { display: inline-flex; align-items: center; gap: 3px; font-size: 12.5px; font-weight: 800; color: var(--c-ink); text-decoration: underline; text-underline-offset: 3px; }
        .p-note { font-size: 11px; font-weight: 800; background: var(--c-ink); color: var(--c-volt); border-radius: 999px; padding: 4px 10px; }
        .sched { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
        .sched-row { display: grid; grid-template-columns: 92px 1fr auto; gap: 12px; align-items: center; padding: 12px 0; border-top: 1.5px solid var(--c-line); }
        .sched-date { font-family: var(--font-mono); font-size: 11.5px; font-weight: 700; background: var(--c-paper); border: 1.5px solid var(--c-ink); border-radius: 8px; padding: 5px 8px; text-align: center; }
        .sched-main strong { display: block; font-size: 13.5px; }
        .sched-main small { display: block; font-size: 11.5px; color: var(--c-muted); margin-top: 2px; }
        .sched-time { font-family: var(--font-mono); font-size: 13px; font-weight: 700; }
        .empty-line { font-size: 13px; color: var(--c-muted); border: 1.5px dashed var(--c-line); border-radius: 12px; padding: 16px; margin: 0; }
        .quick-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }

        .side-col { display: flex; flex-direction: column; gap: 18px; }
        .l-row { display: grid; grid-template-columns: 26px 1fr auto; gap: 10px; align-items: center; padding: 9px 10px; border-radius: 10px; font-size: 13px; }
        .ladder ul { list-style: none; margin: 0; padding: 0; }
        .l-rank { font-family: var(--font-mono); font-weight: 700; color: var(--c-muted); }
        .l-name { font-weight: 700; }
        .l-xp { font-family: var(--font-mono); font-size: 12px; }
        .l-row.you { background: var(--c-ink); color: #fff; }
        .l-row.you .l-rank { color: var(--c-volt); }
        .l-row.you .l-xp { color: var(--c-volt); }

        .stamps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .shell[data-frame='mobile'] .stamps { grid-template-columns: repeat(2, 1fr); }
        .stamp { display: flex; flex-direction: column; align-items: center; gap: 3px; border: 2px dashed var(--tone); border-radius: 50%; aspect-ratio: 1; justify-content: center; text-align: center; padding: 8px; color: var(--tone); }
        .stamp-seal { display: inline-flex; }
        .stamp strong { font-size: 20px; font-weight: 900; line-height: 1; }
        .stamp small { font-size: 9.5px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
        .cab-foot { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--c-muted); margin: 12px 0 0; flex-wrap: wrap; }

        .sk-wrap { display: flex; flex-direction: column; gap: 14px; }
        .sk { background: #E7DEC9; border-radius: 16px; animation: pulse 1.4s infinite; border: 2px solid var(--c-line); }
        .sk-poster { height: 190px; } .sk-ticket { height: 170px; } .sk-cols { height: 220px; }
        @keyframes pulse { 50% { opacity: 0.55; } }
        .proto-foot { max-width: 1160px; margin: 0 auto; padding: 6px 0 28px; font-family: var(--font-mono); font-size: 11px; color: var(--c-muted); }
      `}</style>
    </div>
  );
}
