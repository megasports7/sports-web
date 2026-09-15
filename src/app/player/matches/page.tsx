'use client';

import { useEffect, useMemo, useState } from 'react';
import { playerApi } from '@/lib/api/player.api';
import type { Match } from '@/lib/types';

type MatchFilter = 'all' | 'upcoming' | 'live' | 'completed';

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

function formatWhen(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  return isToday ? 'Today' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="6.2" r="3.2" fill="currentColor" />
      <path
        d="M3.5 17c.6-4 3-6.2 6.5-6.2s5.9 2.2 6.5 6.2c.1.6-.4 1-1 1H4.5c-.6 0-1.1-.4-1-1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth={1.6} />
      <path d="M10 6.5V10l2.6 1.5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

function ScheduledIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth={1.6} />
      <path d="M3 8h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 20 20" fill="none">
      <path d="m4 10.5 3.5 3.5L16 5.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const STATUS_META: Record<Exclude<MatchFilter, 'all'>, { label: string; icon: () => React.ReactElement }> = {
  upcoming: { label: 'Scheduled', icon: ScheduledIcon },
  live: { label: 'In progress', icon: ClockIcon },
  completed: { label: 'Completed', icon: CheckIcon },
};

export default function PlayerMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<MatchFilter>('all');

  useEffect(() => {
    playerApi
      .matches()
      .then((res) => {
        if (res.success && res.data) setMatches(res.data);
        else setError(res.message || 'Could not load matches');
      })
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c = { all: matches.length, upcoming: 0, live: 0, completed: 0 };
    for (const m of matches) c[bucketOf(m)]++;
    return c;
  }, [matches]);

  const visible = useMemo(
    () => (filter === 'all' ? matches : matches.filter((m) => bucketOf(m) === filter)),
    [matches, filter],
  );

  if (loading) return <p className="text-muted">Loading matches…</p>;
  if (error) return <p className="text-corner-red">{error}</p>;

  return (
    <div className="page">
      <div className="head">
        <h1>My matches</h1>
        <p>
          <b>{counts.all}</b> match{counts.all === 1 ? '' : 'es'}
          {counts.completed > 0 && (
            <>
              {' '}
              · <b>{counts.completed}</b> completed
            </>
          )}
        </p>
      </div>

      {matches.length === 0 ? (
        <p className="text-sm text-muted">No matches yet — they&apos;ll appear here once you&apos;re scheduled.</p>
      ) : (
        <>
          <div className="chips" role="group" aria-label="Filter matches">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className="chip"
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
              >
                {f.label} · {counts[f.key]}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <p className="text-sm text-muted">No matches in this filter.</p>
          ) : (
            <div className="list">
              {visible.map((m) => {
                const bucket = bucketOf(m);
                const meta = STATUS_META[bucket];
                const Icon = meta.icon;
                const when = formatWhen(m.scheduled_at || m.match_date);
                const hasScore = m.player1_score !== undefined && m.player2_score !== undefined;

                return (
                  <div className="match" data-bucket={bucket} key={m.match_id}>
                    <div className="match-top">
                      <span>
                        <span className="match-event">{m.event_name || 'Event match'}</span>
                        <span className={`status-pill ${bucket}`}>
                          <Icon />
                          {meta.label}
                        </span>
                      </span>
                      {when && <span className="match-when">{when}</span>}
                    </div>

                    <div className="vs-box">
                      <div className="side you">
                        <span className="side-avatar">
                          <PersonIcon />
                        </span>
                        <span className="side-name">You</span>
                      </div>
                      <div className="score-center">
                        {hasScore ? (
                          <span className="score-value mono">
                            {m.player1_score}–{m.player2_score}
                          </span>
                        ) : (
                          <span className="score-vs">VS</span>
                        )}
                      </div>
                      <div className="side opp">
                        <span className="side-avatar">
                          <PersonIcon />
                        </span>
                        <span className="side-name">{m.opponent_name || 'TBD'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .head h1 {
          font-size: 23px;
          font-weight: 800;
          letter-spacing: -0.3px;
          margin: 0;
        }
        .head p {
          margin: 4px 0 0;
          font-size: 13.5px;
          color: var(--color-muted);
        }
        .head p :global(b) {
          color: var(--color-ink);
          font-weight: 700;
        }

        .chips {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
        }
        .chip {
          appearance: none;
          border: 1.5px solid var(--color-line);
          background: var(--color-surface);
          border-radius: 999px;
          padding: 9px 15px;
          cursor: pointer;
          font-family: inherit;
          font-size: 12.5px;
          font-weight: 600;
          color: #3a3d45;
          transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
        }
        .chip[aria-pressed='true'] {
          background: linear-gradient(120deg, var(--color-accent-blue), #00b8d9);
          border-color: transparent;
          color: #fff;
          box-shadow: 0 6px 14px -7px color-mix(in srgb, var(--color-accent-blue) 55%, transparent);
        }

        .list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .match {
          position: relative;
          overflow: hidden;
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 18px;
          padding: 18px 20px 16px 23px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -14px rgba(22, 24, 29, 0.16);
        }
        .match::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 3.5px;
          background: var(--color-line);
        }
        .match[data-bucket='upcoming']::before {
          background: var(--color-accent-blue);
        }
        .match[data-bucket='live']::before {
          background: var(--color-status-pending);
        }
        .match[data-bucket='completed']::before {
          background: var(--color-accent-green);
        }

        .match-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .match-event {
          font-size: 13px;
          font-weight: 700;
          color: var(--color-muted);
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .match-when {
          font-family: var(--font-mono);
          font-size: 12.5px;
          font-weight: 600;
          color: #3a3d45;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border-radius: 999px;
          padding: 5px 12px;
          font-size: 11.5px;
          font-weight: 700;
          margin-left: 10px;
        }
        .status-pill.upcoming {
          background: color-mix(in srgb, var(--color-accent-blue) 14%, transparent);
          color: #0074b8;
        }
        .status-pill.live {
          background: color-mix(in srgb, var(--color-status-pending) 20%, transparent);
          color: #93710f;
        }
        .status-pill.completed {
          background: color-mix(in srgb, var(--color-accent-green) 15%, transparent);
          color: #0a8a3f;
        }

        .vs-box {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 22px;
          padding: 6px 0 4px;
        }
        .side {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          flex: 1;
        }
        .side-avatar {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .side-avatar :global(svg) {
          width: 24px;
          height: 24px;
        }
        .side.you .side-avatar {
          background: color-mix(in srgb, var(--color-corner-red) 13%, transparent);
          color: var(--color-corner-red);
        }
        .side.opp .side-avatar {
          background: color-mix(in srgb, var(--color-accent-blue) 13%, transparent);
          color: var(--color-accent-blue);
        }
        .side-name {
          font-size: 13.5px;
          font-weight: 700;
          color: #3a3d45;
          text-align: center;
        }
        .side.you .side-name {
          color: var(--color-corner-red);
        }
        .side.opp .side-name {
          color: var(--color-accent-blue);
        }

        .score-center {
          flex-shrink: 0;
          text-align: center;
          min-width: 76px;
        }
        .score-value {
          font-size: 30px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .score-vs {
          font-size: 15px;
          font-weight: 800;
          color: var(--color-muted);
          letter-spacing: 0.5px;
        }

        @media (max-width: 520px) {
          .vs-box {
            gap: 10px;
          }
          .side-name {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}
