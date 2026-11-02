'use client';

/**
 * CONCEPT D — Events v2 (PROTOTYPE ONLY)
 * Route: /prototype-d/events · renders sample data, makes no backend calls.
 * Redesign pass: full "Season Clubhouse" soul, visibly distinct from the
 * plain production /player/events page —
 * navy band header (eyebrow + title + record stats + search baked in),
 * two-column main + "My season" side rail, date-tile event cards with
 * status rails, editorial section headings.
 * Preserves real fields/filters/actions: search, All/Open/Registered/
 * Pending chips with counts, event date, venue/location, category +
 * age/weight, player count, Register CTA, rejected re-register hint.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PROTOTYPE_NOTE } from '@/lib/prototype/data';
import {
  IconArrowRight,
  IconBout,
  IconCheck,
  IconClock,
  IconClose,
  IconEvents,
  IconMenu,
  IconPin,
  IconSignOut,
} from '@/lib/prototype/icons';
import type { Event } from '@/lib/types';

type EventFilter = 'all' | 'open' | 'registered' | 'pending';
type View = 'populated' | 'empty' | 'loading' | 'error';

const NAV_ITEMS = [
  { href: '/prototype-d', label: 'Dashboard' },
  { href: '/prototype-d/events', label: 'Events', active: true },
  { href: '/prototype-d/matches', label: 'Matches' },
  { href: '/player/certificates', label: 'Certificates' },
  { href: '/player/id-card', label: 'ID Card' },
  { href: '/player/profile', label: 'Profile' },
];

const FILTERS: { key: EventFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'registered', label: 'Registered' },
  { key: 'pending', label: 'Pending' },
];

function bucketOf(e: Event): Exclude<EventFilter, 'all'> {
  if (e.registration_status === 'approved') return 'registered';
  if (e.registration_status === 'pending') return 'pending';
  return 'open';
}

function dateTile(iso?: string): { day: string; mon: string } {
  if (!iso) return { day: '–', mon: 'TBC' };
  const [y, m, d] = iso.split('T')[0].split('-');
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return { day: String(Number(d)), mon: `${months[Number(m) - 1] ?? ''} ’${String(y).slice(2)}` };
}

/** Sample rows mirror the real Event shape; values illustrative only. */
const SAMPLE_EVENTS: Event[] = [
  {
    event_id: 'proto-ev-0001',
    event_name: 'Andhra Pradesh State Pencak Silat Championship',
    venue: 'Guntur Indoor Stadium',
    location: 'Guntur, Andhra Pradesh',
    event_date: '2026-10-18',
    event_category: 'Tanding · Senior Female',
    age_category: 'Senior',
    weight_category: '55–60 kg',
    registration_status: 'approved',
    player_count: 142,
    organizer_name: 'AP Pencak Silat Association',
  },
  {
    event_id: 'proto-ev-0002',
    event_name: 'Guntur District Open Tanding',
    venue: 'District Sports Complex',
    location: 'Guntur',
    event_date: '2026-10-25',
    event_category: 'Tanding · Senior Female',
    age_category: 'Senior',
    weight_category: '55–60 kg',
    registration_status: 'pending',
    player_count: 64,
  },
  {
    event_id: 'proto-ev-0003',
    event_name: 'Inter-Club Tanding Meet',
    venue: 'Vijayawada Combat Hall',
    location: 'Vijayawada',
    event_date: '2026-11-02',
    event_category: 'Tanding · Open Mat',
    registration_status: null,
    player_count: 48,
  },
  {
    event_id: 'proto-ev-0004',
    event_name: 'South Zone Seni Championship',
    venue: 'Gachibowli Stadium',
    location: 'Hyderabad',
    event_date: '2026-12-14',
    event_category: 'Seni · Tunggal Female',
    registration_status: 'rejected',
    player_count: 96,
  },
  {
    event_id: 'proto-ev-0005',
    event_name: 'Junior State Trials (U-17)',
    venue: 'Ongole Sports Academy',
    location: 'Ongole',
    event_date: '2027-01-09',
    event_category: 'Tanding · Junior',
    age_category: 'U-17',
    registration_status: null,
    player_count: 112,
  },
];

export default function ConceptDEventsPage() {
  const [view, setView] = useState<View>('populated');
  const [frame, setFrame] = useState<'desktop' | 'mobile'>('desktop');
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<EventFilter>('all');

  const events: Event[] = useMemo(() => (view === 'empty' ? [] : SAMPLE_EVENTS), [view]);

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

  const deadlines = useMemo(
    () =>
      [...events]
        .filter((e) => bucketOf(e) === 'open')
        .sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)))
        .slice(0, 2),
    [events],
  );

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
        <span className="tb-note">Concept D · Events v2 · prototype only · sample data</span>
      </div>

      <div className="frame">
        <div className="page">
          {view === 'loading' ? (
            <div className="sk-wrap"><div className="sk sk-band" /><div className="sk sk-cols" /></div>
          ) : view === 'error' ? (
            <div className="state" role="alert">
              <h2>Could not load events</h2>
              <p>Simulated error state — check your connection and retry.</p>
              <button className="btn-primary" onClick={() => setView('populated')}>Try again</button>
            </div>
          ) : (
            <>
              {/* Navy band header — the clearest break from production's plain white head */}
              <section className="band">
                <div className="band-top">
                  <div>
                    <p className="eyebrow">Season 2026 · Competition calendar</p>
                    <h1>Find your next event</h1>
                    <p className="band-sub">Pencak Silat · Andhra Pradesh circuit · entries close on match week</p>
                  </div>
                  <div className="band-stats">
                    <div className="b-stat"><strong>{counts.all}</strong><span>Events</span></div>
                    <div className="b-stat"><strong>{counts.registered}</strong><span>Registered</span></div>
                    <div className="b-stat"><strong>{counts.pending}</strong><span>Pending</span></div>
                  </div>
                </div>
                <div className="band-tools">
                  <div className="search">
                    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
                      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
                      <path d="m17 17-4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search by event or venue — try “Guntur”"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      aria-label="Search events"
                    />
                  </div>
                  <div className="band-chips" role="group" aria-label="Filter events">
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
                </div>
              </section>

              <div className="cols">
                <div className="col-main">
                  <div className="sec-head">
                    <h2>{filter === 'all' ? 'Available events' : `${FILTERS.find((f) => f.key === filter)?.label} events`}</h2>
                    <span className="sec-note">{visible.length} of {counts.all} shown</span>
                  </div>

                  {events.length === 0 ? (
                    <div className="state">
                      <span className="state-icon"><IconEvents size={20} /></span>
                      <h2>No events open yet</h2>
                      <p>Your organizer hasn&apos;t published any tournaments right now. Check back soon.</p>
                    </div>
                  ) : visible.length === 0 ? (
                    <p className="empty-line">No events match your search or filter.</p>
                  ) : (
                    <div className="list">
                      {visible.map((e) => {
                        const bucket = bucketOf(e);
                        const tile = dateTile(e.event_date);
                        return (
                          <article className="event" data-bucket={bucket} key={e.event_id}>
                            <div className="date-tile" aria-hidden="true">
                              <strong>{tile.day}</strong>
                              <small>{tile.mon}</small>
                            </div>
                            <div className="event-main">
                              <div className="event-title-row">
                                <p className="event-name">{e.event_name}</p>
                                {bucket === 'registered' && (
                                  <span className="status-pill approved"><IconCheck size={12} /> Registered</span>
                                )}
                                {bucket === 'pending' && (
                                  <span className="status-pill pending"><IconClock size={12} /> Pending</span>
                                )}
                                {bucket === 'open' && <span className="status-pill open"><IconBout size={12} /> Open</span>}
                              </div>
                              <div className="event-meta">
                                {(e.venue || e.location) && (
                                  <span><IconPin size={13} /> {e.venue || e.location}</span>
                                )}
                                {typeof e.player_count === 'number' && (
                                  <span className="mono">{e.player_count} players</span>
                                )}
                              </div>
                              {e.event_category && (
                                <p className="cat-row">
                                  <span className="cat-badge">{e.event_category}</span>
                                  {(e.age_category || e.weight_category) && (
                                    <span className="cat-sub"> · {[e.age_category, e.weight_category].filter(Boolean).join(' · ')}</span>
                                  )}
                                </p>
                              )}
                            </div>
                            <div className="event-action">
                              {bucket === 'open' ? (
                                <>
                                  <Link href="/prototype-d/events" className="cta" onClick={(ev) => ev.preventDefault()}>
                                    Register <IconArrowRight size={14} />
                                  </Link>
                                  {e.registration_status === 'rejected' && (
                                    <span className="reopen-hint">Last entry wasn&apos;t approved — you can register again</span>
                                  )}
                                </>
                              ) : (
                                <span className="action-note">
                                  {bucket === 'registered' ? 'Entry confirmed' : 'Awaiting organizer'}
                                </span>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Side rail — new vs production; mirrors dashboard's progress rail */}
                <aside className="col-side">
                  <section className="card">
                    <div className="card-head"><h2>My season</h2></div>
                    <div className="bar-row">
                      <div className="bar-top"><span>Registered</span><span className="mono">{counts.registered}</span></div>
                      <div className="bar"><span className="fill-reg" style={{ width: `${counts.all ? (counts.registered / counts.all) * 100 : 0}%` }} /></div>
                    </div>
                    <div className="bar-row">
                      <div className="bar-top"><span>Pending</span><span className="mono">{counts.pending}</span></div>
                      <div className="bar"><span className="fill-pen" style={{ width: `${counts.all ? (counts.pending / counts.all) * 100 : 0}%` }} /></div>
                    </div>
                    <div className="bar-row">
                      <div className="bar-top"><span>Still open</span><span className="mono">{counts.open}</span></div>
                      <div className="bar"><span className="fill-open" style={{ width: `${counts.all ? (counts.open / counts.all) * 100 : 0}%` }} /></div>
                    </div>
                    <Link href="/prototype-d" className="btn-line">Back to dashboard</Link>
                  </section>

                  <section className="card">
                    <div className="card-head"><h2>Closing soon</h2><span className="p-note">Match week</span></div>
                    {deadlines.length === 0 ? (
                      <p className="empty-line">Nothing open right now.</p>
                    ) : (
                      <ul className="deadlines">
                        {deadlines.map((d) => {
                          const t = dateTile(d.event_date);
                          return (
                            <li key={d.event_id}>
                              <span className="dl-date mono">{t.day} {t.mon}</span>
                              <span className="dl-name">{d.event_name}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    <Link href="/prototype-d/matches" className="card-link">View my matches <IconArrowRight size={13} /></Link>
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
          --d-bg: #F3F0E9; --d-surface: #FFFFFF; --d-ink: #1C2534; --d-muted: #667085;
          --d-line: #E2DAC9; --d-accent: #0F766E; --d-accent-soft: rgba(15,118,110,0.09);
          --d-clay: #C2410C; --d-green: #15803D;
          min-height: 100vh; background: var(--d-bg); color: var(--d-ink);
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
        .band-tools { display: flex; flex-wrap: wrap; gap: 10px; }
        .search { flex: 1 1 240px; display: flex; align-items: center; background: #fff; color: var(--d-muted); border-radius: 12px; }
        .search svg { margin-left: 12px; flex-shrink: 0; }
        .search input { border: none; outline: none; background: transparent; width: 100%; padding: 11px 12px; font-family: inherit; font-size: 13.5px; color: var(--d-ink); }
        .band-chips { display: flex; gap: 7px; flex-wrap: wrap; }
        .bchip { border: 1.5px solid rgba(255,255,255,0.35); background: none; color: #fff; border-radius: 999px; padding: 9px 15px; cursor: pointer; font-size: 12.5px; font-weight: 700; white-space: nowrap; }
        .bchip[aria-pressed='true'] { background: #fff; border-color: #fff; color: var(--d-ink); }

        .cols { display: grid; grid-template-columns: 1.65fr 1fr; gap: 18px; }
        .shell[data-frame='mobile'] .cols { grid-template-columns: 1fr; }
        .col-main, .col-side { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
        .sec-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
        .sec-head h2 { margin: 0; font-size: 13px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; }
        .sec-note { font-size: 12px; color: var(--d-muted); }
        .mono { font-family: var(--font-mono); }

        .list { display: flex; flex-direction: column; gap: 12px; }
        .event { display: grid; grid-template-columns: 64px 1fr auto; gap: 14px; align-items: start; background: var(--d-surface); border: 1px solid var(--d-line); border-left: 4px solid var(--d-line); border-radius: 16px; padding: 16px 18px; }
        .event[data-bucket='registered'] { border-left-color: var(--d-green); }
        .event[data-bucket='pending'] { border-left-color: var(--d-clay); }
        .event[data-bucket='open'] { border-left-color: var(--d-accent); }
        .shell[data-frame='mobile'] .event { grid-template-columns: 52px 1fr; }
        .shell[data-frame='mobile'] .event-action { grid-column: 2; text-align: left; }
        .date-tile { background: var(--d-bg); border: 1px solid var(--d-line); border-radius: 12px; text-align: center; padding: 8px 4px; }
        .date-tile strong { display: block; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; line-height: 1; }
        .date-tile small { display: block; font-family: var(--font-mono); font-size: 9.5px; font-weight: 700; color: var(--d-muted); margin-top: 3px; }
        .event-title-row { display: flex; align-items: flex-start; gap: 10px; }
        .event-name { font-size: 15.5px; font-weight: 800; letter-spacing: -0.1px; margin: 0; flex: 1; }
        .event-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 5px 14px; margin-top: 6px; }
        .event-meta span { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; color: var(--d-muted); }
        .cat-row { margin: 9px 0 0; }
        .cat-badge { display: inline-flex; align-items: center; background: var(--d-accent-soft); color: var(--d-accent); font-size: 11.5px; font-weight: 800; padding: 4px 10px; border-radius: 999px; }
        .cat-sub { font-size: 12px; color: var(--d-muted); }
        .event-action { text-align: right; }
        :global(.cta) { display: inline-flex; align-items: center; gap: 6px; border-radius: 10px; padding: 10px 16px; font-size: 13px; font-weight: 800; color: #fff; background: var(--d-accent); white-space: nowrap; }
        .action-note { font-size: 12px; font-weight: 700; color: var(--d-muted); }
        .status-pill { display: inline-flex; align-items: center; gap: 5px; border-radius: 999px; padding: 5px 11px; font-size: 11px; font-weight: 800; white-space: nowrap; flex-shrink: 0; }
        .status-pill.approved { background: rgba(21,128,61,0.1); color: var(--d-green); }
        .status-pill.pending { background: rgba(194,65,12,0.1); color: var(--d-clay); }
        .status-pill.open { background: var(--d-accent-soft); color: var(--d-accent); }
        .reopen-hint { display: block; margin-top: 6px; font-size: 11px; color: var(--d-muted); max-width: 170px; }

        .card { background: var(--d-surface); border: 1px solid var(--d-line); border-radius: 16px; padding: 20px; }
        .card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
        .card-head h2 { margin: 0; font-size: 13px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; }
        .p-note { font-size: 11px; font-weight: 800; background: var(--d-ink); color: #fff; border-radius: 999px; padding: 4px 10px; }
        .bar-row { margin-bottom: 12px; }
        .bar-top { display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 700; margin-bottom: 6px; }
        .bar-top .mono { color: var(--d-accent); }
        .bar { height: 7px; border-radius: 999px; background: var(--d-bg); border: 1px solid var(--d-line); overflow: hidden; }
        .bar span { display: block; height: 100%; border-radius: 999px; }
        .fill-reg { background: var(--d-green); } .fill-pen { background: var(--d-clay); } .fill-open { background: var(--d-accent); }
        :global(.btn-line) { display: inline-flex; align-items: center; justify-content: center; gap: 7px; background: none; color: var(--d-ink); font-size: 12.5px; font-weight: 700; border-radius: 10px; padding: 10px 12px; border: 1.5px solid var(--d-line); margin-top: 4px; width: 100%; }
        :global(.card-link) { display: inline-flex; align-items: center; gap: 4px; font-size: 12.5px; font-weight: 800; color: var(--d-accent); margin-top: 10px; }
        .deadlines { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
        .deadlines li { display: flex; gap: 10px; align-items: baseline; }
        .dl-date { font-size: 11.5px; font-weight: 700; color: var(--d-accent); white-space: nowrap; }
        .dl-name { font-size: 13px; font-weight: 600; }

        .empty-line { margin: 0; font-size: 13px; color: var(--d-muted); border: 1px dashed var(--d-line); border-radius: 12px; padding: 16px; background: var(--d-surface); }
        .state { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; background: var(--d-surface); border: 1px dashed var(--d-line); border-radius: 16px; padding: 44px 20px; }
        .state-icon { width: 46px; height: 46px; border-radius: 13px; display: inline-flex; align-items: center; justify-content: center; background: var(--d-accent-soft); color: var(--d-accent); }
        .state h2 { margin: 0; font-size: 16px; font-weight: 800; }
        .state p { margin: 0 0 8px; font-size: 13px; color: var(--d-muted); max-width: 44ch; }
        .btn-primary { display: inline-flex; align-items: center; gap: 8px; background: var(--d-accent); color: #fff; font-size: 13.5px; font-weight: 800; border-radius: 10px; padding: 11px 16px; border: none; cursor: pointer; }
        .sk-wrap { display: flex; flex-direction: column; gap: 12px; }
        .sk { background: #E7E0D2; border-radius: 14px; animation: pulse 1.4s infinite; }
        .sk-band { height: 190px; } .sk-cols { height: 260px; }
        @keyframes pulse { 50% { opacity: 0.55; } }
        .proto-foot { max-width: 1160px; margin: 0 auto; padding: 6px 0 28px; font-family: var(--font-mono); font-size: 11px; color: var(--d-muted); }
      `}</style>
    </div>
  );
}
