'use client';

/**
 * CONCEPT D — Matches v3 (PROTOTYPE ONLY)
 * Route: /prototype-d/matches · renders sample data, makes no backend calls.
 * Redesign pass: full "Season Clubhouse" soul with proper information hierarchy —
 * tournament header with status badge, side-by-side competitors with centered VS,
 * separated metadata fields (date / time / countdown), distinct layouts for
 * live / scheduled / completed, and a tighter grid relationship between the
 * match list, record summary, and next-bout panel.
 * Preserves real fields/filters: All/Upcoming/Live/Completed chips with
 * counts, event name, status, scheduled date/time, You-vs-opponent,
 * player1_score–player2_score when decided.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PROTOTYPE_NOTE, formatMatchWhen, sampleDashboard, samplePastMatches } from '@/lib/prototype/data';
import {
  IconArrowRight,
  IconClose,
  IconClock,
  IconEvents,
  IconMenu,
  IconSignOut,
} from '@/lib/prototype/icons';
import type { Match } from '@/lib/types';

type MatchFilter = 'all' | 'upcoming' | 'live' | 'completed';
type View = 'populated' | 'empty' | 'loading' | 'error';

const NAV_ITEMS = [
  { href: '/prototype-d', label: 'Dashboard' },
  { href: '/prototype-d/events', label: 'Events' },
  { href: '/prototype-d/matches', label: 'Matches', active: true },
  { href: '/player/certificates', label: 'Certificates' },
  { href: '/player/id-card', label: 'ID Card' },
  { href: '/player/profile', label: 'Profile' },
];

const FILTERS: { key: MatchFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'live', label: 'Live' },
  { key: 'completed', label: 'Completed' },
];

function bucketOf(m: Match): Exclude<MatchFilter, 'all'> {
  const s = m.status?.toLowerCase();
  if (s === 'completed') return 'completed';
  if (s === 'in_progress' || s === 'live') return 'live';
  return 'upcoming';
}

const STATUS_LABEL: Record<Exclude<MatchFilter, 'all'>, string> = {
  upcoming: 'Scheduled',
  live: 'In progress',
  completed: 'Completed',
};

function dayChip(m: Match): string | null {
  const day = (m.scheduled_at || m.match_date || '').split('T')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  if (bucketOf(m) === 'completed') return 'Final';
  const [y, mo, d] = day.split('-').map(Number);
  const now = new Date();
  const diff = Math.round(
    (Date.UTC(y, mo - 1, d) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000,
  );
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff > 1) return `In ${diff} days`;
  return `${Math.abs(diff)}d ago`;
}

const BASE_MATCHES: Match[] = [...sampleDashboard.upcoming_matches, ...samplePastMatches];

function PersonGlyph() {
  return (
    <svg width={18} height={18} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="6.4" r="3" fill="currentColor" />
      <path
        d="M3.6 16.6c.6-3.8 2.9-5.9 6.4-5.9s5.8 2.1 6.4 5.9c.1.6-.4 1-1 1H4.6c-.6 0-1.1-.4-1-1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function MetaField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <span className="meta-field">
      <span className="meta-icon" aria-hidden="true">{icon}</span>
      <span className="meta-text">
        <span className="meta-label">{label}</span>
        <span className="meta-value mono">{value}</span>
      </span>
    </span>
  );
}

function BoutCard({ m, featured = false }: { m: Match; featured?: boolean }) {
  const bucket = bucketOf(m);
  const when = formatMatchWhen(m);
  const hasScore = m.player1_score !== undefined && m.player2_score !== undefined;
  const chip = dayChip(m);
  const youWon = hasScore && (m.player1_score ?? 0) > (m.player2_score ?? 0);
  const oppWon = hasScore && (m.player2_score ?? 0) > (m.player1_score ?? 0);

  return (
    <article className={`match-card ${featured ? 'is-featured' : ''} bucket-${bucket}`} data-bucket={bucket}>
      <header className="mc-header">
        <h3 className="mc-event" title={m.event_name || 'Event match'}>
          {m.event_name || 'Event match'}
        </h3>
        <span className={`status-pill ${bucket}`}>
          {bucket === 'live' && <span className="live-dot" aria-hidden="true" />}
          {STATUS_LABEL[bucket]}
        </span>
      </header>

      <div className="mc-versus">
        <div className="mc-side mc-you">
          <span className="mc-avatar mc-avatar-you" aria-hidden="true"><PersonGlyph /></span>
          <span className="mc-name">You</span>
        </div>
        <div className="mc-mid">
          {hasScore ? (
            <span className="mc-score mono">
              <span className={youWon ? 'score-win' : 'score-lose'}>{m.player1_score}</span>
              <span className="score-sep">–</span>
              <span className={oppWon ? 'score-win' : 'score-lose'}>{m.player2_score}</span>
            </span>
          ) : (
            <span className="mc-vs">VS</span>
          )}
        </div>
        <div className="mc-side mc-opp">
          <span className={`mc-name${m.opponent_name ? '' : ' is-tbd'}`} title={m.opponent_name || 'TBD'}>
            {m.opponent_name || 'TBD'}
          </span>
          <span className="mc-avatar mc-avatar-opp" aria-hidden="true"><PersonGlyph /></span>
        </div>
      </div>

      {hasScore && (
        <p className={`mc-result ${youWon ? 'result-win' : 'result-loss'}`}>
          {youWon ? 'You won' : oppWon ? 'You lost' : 'Draw'}
        </p>
      )}

      <footer className="mc-meta">
        <MetaField icon={<IconClock size={13} />} label="Date" value={when?.date || 'TBC'} />
        {when?.time && <MetaField icon={<IconClock size={13} />} label="Time" value={when.time} />}
        {chip && <MetaField icon={<IconEvents size={13} />} label="Countdown" value={chip} />}
      </footer>
    </article>
  );
}

export default function ConceptDMatchesPage() {
  const [view, setView] = useState<View>('populated');
  const [frame, setFrame] = useState<'desktop' | 'mobile'>('desktop');
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState<MatchFilter>('all');

  const matches: Match[] = useMemo(() => (view === 'empty' ? [] : BASE_MATCHES), [view]);

  const counts = useMemo(() => {
    const c = { all: matches.length, upcoming: 0, live: 0, completed: 0 };
    for (const m of matches) c[bucketOf(m)]++;
    return c;
  }, [matches]);

  const record = useMemo(() => {
    let w = 0;
    let l = 0;
    for (const m of matches) {
      if (bucketOf(m) !== 'completed') continue;
      if (m.player1_score === undefined || m.player2_score === undefined) continue;
      if (m.player1_score > m.player2_score) w++;
      else if (m.player1_score < m.player2_score) l++;
    }
    return { w, l };
  }, [matches]);

  const groups = useMemo(
    () => ({
      upcoming: matches.filter((m) => bucketOf(m) === 'upcoming'),
      live: matches.filter((m) => bucketOf(m) === 'live'),
      completed: matches.filter((m) => bucketOf(m) === 'completed'),
    }),
    [matches],
  );

  const visible = useMemo(
    () => (filter === 'all' ? matches : matches.filter((m) => bucketOf(m) === filter)),
    [matches, filter],
  );

  const next = groups.upcoming[0] ?? matches[0];
  const nextWhen = next ? formatMatchWhen(next) : null;

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
            <span className="brand-word">MegaSportsX<small>Season clubhouse · D</small></span>
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
        <span className="tb-note">Concept D · Matches v3 · prototype only · sample data</span>
      </div>

      <div className="frame">
        <div className="page">
          {view === 'loading' ? (
            <div className="sk-wrap"><div className="sk sk-band" /><div className="sk sk-cols" /></div>
          ) : view === 'error' ? (
            <div className="state" role="alert">
              <h2>Could not load matches</h2>
              <p>Simulated error state — check your connection and retry.</p>
              <button className="btn-primary" onClick={() => setView('populated')}>Try again</button>
            </div>
          ) : (
            <>
              <section className="band">
                <div className="band-top">
                  <div>
                    <p className="eyebrow">Competition · Season 2026</p>
                    <h1>My matches</h1>
                    <p className="band-sub">
                      {next ? `Next: You vs ${next.opponent_name || 'TBD'}${nextWhen ? ` · ${nextWhen.date}` : ''}` : 'No bouts scheduled yet'}
                    </p>
                  </div>
                  <div className="band-stats">
                    <div className="b-stat"><strong>{counts.all}</strong><span>Bouts</span></div>
                    <div className="b-stat"><strong>{counts.live}</strong><span>Live</span></div>
                    <div className="b-stat"><strong>{record.w}–{record.l}</strong><span>Record</span></div>
                  </div>
                </div>
                <div className="band-chips" role="group" aria-label="Filter matches">
                  {FILTERS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      className="bchip"
                      aria-pressed={filter === f.key}
                      onClick={() => setFilter(f.key)}
                    >
                      {f.label} · {counts[f.key]}
                    </button>
                  ))}
                </div>
              </section>

              <div className="cols">
                <div className="col-main">
                  {matches.length === 0 ? (
                    <p className="empty-line">No matches yet — they&apos;ll appear here once you&apos;re scheduled.</p>
                  ) : filter !== 'all' ? (
                    <>
                      <div className="sec-head">
                        <h2>{FILTERS.find((f) => f.key === filter)?.label} bouts</h2>
                        <span className="sec-note">{visible.length} shown</span>
                      </div>
                      <div className="list">
                        {visible.length === 0 ? (
                          <p className="empty-line">No matches in this filter.</p>
                        ) : (
                          visible.map((m) => <BoutCard key={m.match_id} m={m} />)
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {groups.live.length > 0 && (
                        <section className="group" data-group="live">
                          <div className="group-banner">
                            <h2><span className="live-dot" aria-hidden="true" /> Live now</h2>
                            <span className="group-count">{groups.live.length} bout{groups.live.length === 1 ? '' : 's'}</span>
                          </div>
                          <div className="group-body">
                            {groups.live.map((m) => <BoutCard key={m.match_id} m={m} featured />)}
                          </div>
                        </section>
                      )}
                      <section className="group" data-group="upcoming">
                        <div className="group-banner">
                          <h2>Up next</h2>
                          <span className="group-count">{groups.upcoming.length} scheduled</span>
                        </div>
                        <div className="group-body">
                          {groups.upcoming.length === 0 ? (
                            <p className="empty-line">Nothing scheduled — browse events to enter your next competition.</p>
                          ) : (
                            groups.upcoming.map((m) => <BoutCard key={m.match_id} m={m} />)
                          )}
                        </div>
                      </section>
                      <section className="group" data-group="completed">
                        <div className="group-banner">
                          <h2>Decided</h2>
                          <span className="group-count">Record {record.w}–{record.l}</span>
                        </div>
                        <div className="group-body">
                          {groups.completed.length === 0 ? (
                            <p className="empty-line">No decided bouts yet.</p>
                          ) : (
                            groups.completed.map((m) => <BoutCard key={m.match_id} m={m} />)
                          )}
                        </div>
                      </section>
                    </>
                  )}
                  <Link href="/prototype-d/events" className="browse">
                    Browse events <IconArrowRight size={14} />
                  </Link>
                </div>

                <aside className="col-side">
                  <section className="card record">
                    <div className="card-head"><h2>Record</h2><span className="p-note mono">{record.w}–{record.l}</span></div>
                    <div className="wl">
                      <div className="wl-row"><span>Wins</span><strong className="mono">{record.w}</strong></div>
                      <div className="bar"><span className="fill-win" style={{ width: `${record.w + record.l ? (record.w / (record.w + record.l)) * 100 : 0}%` }} /></div>
                      <div className="wl-row"><span>Losses</span><strong className="mono">{record.l}</strong></div>
                      <div className="bar"><span className="fill-loss" style={{ width: `${record.w + record.l ? (record.l / (record.w + record.l)) * 100 : 0}%` }} /></div>
                    </div>
                    <p className="card-foot">{counts.live} live · {counts.upcoming} upcoming · {counts.completed} decided</p>
                  </section>

                  <section className="card">
                    <div className="card-head"><h2>Next bout</h2></div>
                    {next ? (
                      <>
                        <p className="next-event">{next.event_name}</p>
                        <p className="next-vs">You <em>vs</em> {next.opponent_name || 'TBD'}</p>
                        <p className="next-when mono">{nextWhen ? `${nextWhen.date}${nextWhen.time ? ` · ${nextWhen.time}` : ''}` : 'Date TBC'}</p>
                      </>
                    ) : (
                      <p className="empty-line">No bouts scheduled.</p>
                    )}
                    <Link href="/prototype-d" className="card-link">Back to dashboard <IconArrowRight size={13} /></Link>
                  </section>
                </aside>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="proto-foot">{PROTOTYPE_NOTE}</p>

      <style key="matches-v3">{`
        .shell {
          --d-bg: #F3F0E9; --d-surface: #FFFFFF; --d-ink: #1C2534; --d-muted: #667085;
          --d-line: #E2DAC9; --d-accent: #0F766E; --d-accent-soft: rgba(15,118,110,0.09);
          --d-clay: #C2410C; --d-green: #15803D;
          min-height: 100vh; background: var(--d-bg); color: var(--d-ink);
        }
        .shell a { text-decoration: none; }
        .shell button { font-family: inherit; }
        .nav { position: sticky; top: 0; z-index: 30; background: var(--d-surface); border-bottom: 1px solid var(--d-line); }
        .nav-row { display: flex; align-items: center; gap: 6px; padding: 10px 28px; }
        .brand { display: inline-flex; align-items: center; gap: 9px; margin-right: 16px; color: var(--d-ink); flex-shrink: 0; }
        .brand-mark { display: inline-flex; }
        .brand-word { font-size: 15px; font-weight: 800; letter-spacing: -0.2px; line-height: 1.1; }
        .brand-word small { display: block; font-size: 8px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--d-muted); }
        .tabs { display: flex; gap: 2px; overflow: hidden; }
        .tab { padding: 8px 13px; border-radius: 9px; font-size: 14px; font-weight: 600; color: var(--d-muted); white-space: nowrap; }
        .tab:hover { background: rgba(28,37,52,0.06); color: var(--d-ink); }
        .tab.is-active { color: var(--d-accent); background: var(--d-accent-soft); }
        .signout { margin-left: auto; display: inline-flex; align-items: center; gap: 7px; background: none; border: none; color: var(--d-muted); font-size: 13.5px; font-weight: 600; cursor: pointer; padding: 8px 10px; border-radius: 9px; }
        .menu-btn { display: none; }
        .mobile-menu { display: none; }
        .shell[data-frame='mobile'] .tabs, .shell[data-frame='mobile'] .signout { display: none; }
        .shell[data-frame='mobile'] .menu-btn { display: inline-flex; margin-left: auto; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 10px; border: 1.5px solid var(--d-line); background: var(--d-surface); color: var(--d-ink); cursor: pointer; }
        .shell[data-frame='mobile'] .mobile-menu { display: flex; flex-direction: column; padding: 8px 16px 14px; border-top: 1px solid var(--d-line); }
        .m-tab { padding: 11px 12px; border-radius: 10px; color: var(--d-muted); font-weight: 600; }
        .m-tab.is-active { color: var(--d-accent); background: var(--d-accent-soft); }
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
        .mono { font-family: var(--font-mono); }

        .band { background: var(--d-ink); color: #fff; border-radius: 18px; padding: 26px 28px; display: flex; flex-direction: column; gap: 18px; }
        .band-top { display: flex; gap: 20px; align-items: flex-start; }
        .shell[data-frame='mobile'] .band-top { flex-direction: column; }
        .eyebrow { margin: 0 0 8px; font-size: 10.5px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #8FA7A4; }
        .band h1 { margin: 0; font-size: clamp(26px, 3.4vw, 36px); font-weight: 800; letter-spacing: -0.7px; }
        .band-sub { margin: 6px 0 0; font-size: 13px; color: rgba(255,255,255,0.68); }
        .band-stats { margin-left: auto; display: flex; gap: 24px; }
        .shell[data-frame='mobile'] .band-stats { margin-left: 0; }
        .b-stat strong { display: block; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
        .b-stat span { font-size: 10px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; color: rgba(255,255,255,0.6); }
        .band-chips { display: flex; gap: 7px; flex-wrap: wrap; }
        .bchip { border: 1.5px solid rgba(255,255,255,0.35); background: none; color: #fff; border-radius: 999px; padding: 9px 15px; cursor: pointer; font-size: 12.5px; font-weight: 700; white-space: nowrap; }
        .bchip[aria-pressed='true'] { background: #fff; border-color: #fff; color: var(--d-ink); }

        .cols { display: grid; grid-template-columns: 1.75fr 1fr; gap: 18px; }
        .shell[data-frame='mobile'] .cols { grid-template-columns: 1fr; }
        .col-main { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
        .col-main section { display: flex; flex-direction: column; gap: 12px; }
        .col-side { display: flex; flex-direction: column; gap: 18px; }
        .sec-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
        .sec-head h2 { margin: 0; font-size: 13px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; display: inline-flex; align-items: center; gap: 8px; }
        .live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--d-clay); display: inline-block; }
        .sec-note { font-size: 12px; color: var(--d-muted); }

        .group { border: 1px solid var(--d-line); border-radius: 18px; overflow: hidden; background: var(--d-bg); }
        .group-banner { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 18px; border-bottom: 1px solid var(--d-line); }
        .group-banner h2 { margin: 0; font-size: 13px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; display: inline-flex; align-items: center; gap: 8px; }
        .group-count { font-size: 11px; font-weight: 800; letter-spacing: 0.6px; border-radius: 999px; padding: 5px 12px; white-space: nowrap; }
        .group[data-group='live'] .group-banner { background: rgba(194,65,12,0.12); }
        .group[data-group='live'] .group-count { background: var(--d-clay); color: #fff; }
        .group[data-group='upcoming'] .group-banner { background: var(--d-accent-soft); }
        .group[data-group='upcoming'] .group-count { background: var(--d-accent); color: #fff; }
        .group[data-group='completed'] .group-banner { background: rgba(28,37,52,0.07); }
        .group[data-group='completed'] .group-count { background: var(--d-ink); color: #fff; }
        .group-body { display: flex; flex-direction: column; gap: 14px; padding: 14px; background: transparent; }

        .list { display: flex; flex-direction: column; gap: 12px; }

        .match-card {
          background: var(--d-surface);
          border: 1px solid var(--d-line);
          border-left: 4px solid var(--d-line);
          border-radius: 16px;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .match-card.bucket-upcoming { border-left-color: var(--d-accent); }
        .match-card.bucket-live { border-left-color: var(--d-clay); }
        .match-card.bucket-completed { border-left-color: var(--d-green); }
        .match-card.is-featured { border-color: var(--d-clay); box-shadow: 0 0 0 1px var(--d-clay); }

        .mc-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .mc-event { margin: 0; font-size: 16px; font-weight: 800; letter-spacing: -0.2px; color: var(--d-ink); line-height: 1.3; flex: 1; min-width: 0; }
        .status-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; border-radius: 999px; padding: 5px 12px; white-space: nowrap; flex-shrink: 0; }
        .status-pill.upcoming { background: var(--d-accent-soft); color: var(--d-accent); }
        .status-pill.live { background: rgba(194,65,12,0.12); color: var(--d-clay); }
        .status-pill.completed { background: rgba(21,128,61,0.1); color: var(--d-green); }

        .mc-versus { display: flex; align-items: center; gap: 12px; }
        .mc-side { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
        .mc-opp { justify-content: flex-end; text-align: right; }
        .mc-avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; }
        .mc-avatar-you { background: var(--d-ink); color: #fff; }
        .mc-avatar-opp { background: var(--d-accent-soft); color: var(--d-accent); border: 1.5px solid var(--d-line); }
        .mc-name { font-size: 15px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mc-name.is-tbd { color: var(--d-muted); font-weight: 600; font-style: italic; }
        .mc-mid { display: flex; align-items: center; justify-content: center; min-width: 64px; flex-shrink: 0; }
        .mc-vs { font-size: 12px; font-weight: 800; letter-spacing: 1px; color: var(--d-muted); background: var(--d-bg); border: 1px solid var(--d-line); border-radius: 8px; padding: 4px 10px; }
        .mc-score { display: inline-flex; align-items: baseline; gap: 4px; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; line-height: 1; }
        .score-win { color: var(--d-green); }
        .score-lose { color: var(--d-muted); }
        .score-sep { color: var(--d-muted); font-size: 20px; font-weight: 600; }

        .mc-result { margin: 0; font-size: 12px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; }
        .result-win { color: var(--d-green); }
        .result-loss { color: var(--d-clay); }

        .mc-meta { display: flex; align-items: center; gap: 0; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid var(--d-line); }
        .meta-field { display: inline-flex; align-items: center; gap: 7px; padding-right: 14px; margin-right: 14px; border-right: 1px solid var(--d-line); }
        .meta-field:last-child { border-right: none; margin-right: 0; padding-right: 0; }
        .meta-icon { display: inline-flex; color: var(--d-muted); }
        .meta-text { display: flex; flex-direction: column; gap: 1px; }
        .meta-label { font-size: 9px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: var(--d-muted); }
        .meta-value { font-size: 12.5px; font-weight: 700; color: var(--d-ink); }

        .card { background: var(--d-surface); border: 1px solid var(--d-line); border-radius: 16px; padding: 20px; }
        .card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
        .card-head h2 { margin: 0; font-size: 13px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; }
        .p-note { font-size: 12px; font-weight: 800; background: var(--d-ink); color: #fff; border-radius: 999px; padding: 4px 11px; }
        .wl-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; margin: 10px 0 6px; }
        .bar { height: 7px; border-radius: 999px; background: var(--d-bg); border: 1px solid var(--d-line); overflow: hidden; }
        .bar span { display: block; height: 100%; border-radius: 999px; }
        .fill-win { background: var(--d-green); } .fill-loss { background: var(--d-clay); }
        .card-foot { margin: 12px 0 0; padding-top: 12px; border-top: 1px solid var(--d-line); font-size: 12px; color: var(--d-muted); }
        .next-event { margin: 0; font-size: 13px; font-weight: 600; color: var(--d-muted); }
        .next-vs { margin: 6px 0 0; font-size: 17px; font-weight: 800; }
        .next-vs em { font-style: italic; font-weight: 600; color: var(--d-muted); font-size: 13px; margin: 0 6px; }
        .next-when { margin: 6px 0 0; font-size: 12px; color: var(--d-muted); }
        .card-link { display: inline-flex; align-items: center; gap: 4px; font-size: 12.5px; font-weight: 800; color: var(--d-accent); margin-top: 12px; }
        .browse { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 800; color: var(--d-accent); align-self: flex-start; }

        .empty-line { margin: 0; font-size: 13px; color: var(--d-muted); border: 1px dashed var(--d-line); border-radius: 12px; padding: 16px; background: var(--d-surface); }
        .state { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; background: var(--d-surface); border: 1px dashed var(--d-line); border-radius: 16px; padding: 44px 20px; }
        .state h2 { margin: 0; font-size: 16px; font-weight: 800; }
        .state p { margin: 0 0 8px; font-size: 13px; color: var(--d-muted); max-width: 44ch; }
        .btn-primary { display: inline-flex; align-items: center; gap: 8px; background: var(--d-accent); color: #fff; font-size: 13.5px; font-weight: 800; border-radius: 10px; padding: 11px 16px; border: none; cursor: pointer; }
        .sk-wrap { display: flex; flex-direction: column; gap: 12px; }
        .sk { background: #E7E0D2; border-radius: 14px; animation: pulse 1.4s infinite; }
        .sk-band { height: 190px; } .sk-cols { height: 260px; }
        @keyframes pulse { 50% { opacity: 0.55; } }
        .proto-foot { max-width: 1160px; margin: 0 auto; padding: 6px 0 28px; font-family: var(--font-mono); font-size: 11px; color: var(--d-muted); }

        @media (max-width: 520px) {
          .mc-versus { gap: 8px; }
          .mc-mid { min-width: 48px; }
          .mc-name { font-size: 13.5px; }
          .mc-avatar { width: 34px; height: 34px; }
          .mc-event { font-size: 14px; }
          .mc-score { font-size: 22px; }
          .score-sep { font-size: 16px; }
          .meta-field { padding-right: 10px; margin-right: 10px; }
        }
      `}</style>
    </div>
  );
}
