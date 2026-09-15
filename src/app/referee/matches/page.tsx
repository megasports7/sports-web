'use client';

import { useEffect, useMemo, useState } from 'react';
import { refereeApi } from '@/lib/api/referee.api';
import type { RefereeMatch } from '@/lib/types';

type MatchFilter = 'all' | 'upcoming' | 'live' | 'completed';

const FILTERS: { key: MatchFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'live', label: 'Live' },
  { key: 'completed', label: 'Completed' },
];

/** Same bucketing convention as player/matches/page.tsx, so "upcoming/live/
 *  completed" means the same thing everywhere in the app. */
function bucketOf(m: RefereeMatch): Exclude<MatchFilter, 'all'> {
  const s = m.status?.toLowerCase();
  if (s === 'completed') return 'completed';
  if (s === 'in_progress' || s === 'live') return 'live';
  return 'upcoming';
}

/** A player slot with no real id renders as 'TBD' by referee.api.ts's own
 *  matches() mapping -- same detection mobile's RecordResult.tsx used
 *  (name === 'TBD' || name === 'BYE' || no id) to auto-select the other
 *  side as the winner and skip score entry entirely for a BYE match. */
function isEmptySlot(name: string | undefined, id: string | null | undefined): boolean {
  return name === 'TBD' || name === 'BYE' || !id;
}

/** Real fields only -- matches() doesn't join an event/batch name onto a
 *  match row, so this never invents one. round_number/match_number are the
 *  real columns available instead. Shared with the dashboard's own
 *  matchLabel -- kept as a local copy rather than a new shared module, same
 *  per-file convention every other role's pages already use for their own
 *  small display helpers. */
function matchLabel(m: RefereeMatch) {
  if (m.round_number) return `Round ${m.round_number}`;
  if (m.match_number) return `Match ${m.match_number}`;
  return 'Match';
}

/** Explicit year/month/day getters, not a toDateString() string compare --
 *  same approach player/matches/page.tsx's own formatWhen already proved
 *  out, reused here rather than re-derived. Both sides always evaluate in
 *  the browser's own local timezone (this is a 'use client' page, so
 *  there's no server-render timezone to reconcile), so "Today" means today
 *  for whoever is actually looking at the screen. */
function formatWhen(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const day = isToday ? 'Today' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `${day}, ${time}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function ScheduledIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth={1.6} />
      <path d="M3 8h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth={1.6} />
      <path d="M10 6.5V10l2.6 1.5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path d="m4 10.5 3.5 3.5L16 5.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const STATUS_META: Record<Exclude<MatchFilter, 'all'>, { label: string; icon: () => React.ReactElement }> = {
  upcoming: { label: 'Scheduled', icon: ScheduledIcon },
  live: { label: 'In progress', icon: ClockIcon },
  completed: { label: 'Completed', icon: CheckIcon },
};

export default function RefereeMatchesPage() {
  const [matches, setMatches] = useState<RefereeMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<MatchFilter>('all');

  const [openMatchId, setOpenMatchId] = useState<string | null>(null);
  const [winnerId, setWinnerId] = useState('');
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ matchId: string; text: string; error?: boolean } | null>(null);

  async function refresh() {
    const res = await refereeApi.matches();
    if (res.success && res.data) {
      setMatches(res.data);
      setError(null);
    } else {
      setError(res.message || 'Could not load matches');
    }
  }

  useEffect(() => {
    refereeApi
      .matches()
      .then((res) => {
        if (res.success && res.data) {
          setMatches(res.data);
          setError(null);
        } else {
          setError(res.message || 'Could not load matches');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c = { all: matches.length, upcoming: 0, live: 0, completed: 0 };
    for (const m of matches) c[bucketOf(m)]++;
    return c;
  }, [matches]);

  const awaitingResult = useMemo(() => matches.filter((m) => !m.winner_id && m.status !== 'completed').length, [matches]);

  const visible = useMemo(
    () => (filter === 'all' ? matches : matches.filter((m) => bucketOf(m) === filter)),
    [matches, filter],
  );

  function openPanel(match: RefereeMatch) {
    setOpenMatchId(match.match_id);
    setActionMessage(null);
    setScore1('');
    setScore2('');
    // Auto-select the non-empty side for a BYE match, matching mobile's
    // RecordResult.tsx exactly -- there's only one real player to pick.
    const bye1 = isEmptySlot(match.player1_name, match.player1_id);
    const bye2 = isEmptySlot(match.player2_name, match.player2_id);
    if (bye2 && match.player1_id) setWinnerId(match.player1_id);
    else if (bye1 && match.player2_id) setWinnerId(match.player2_id);
    else setWinnerId('');
  }

  function closePanel() {
    setOpenMatchId(null);
  }

  async function handleSubmit(match: RefereeMatch) {
    const bye1 = isEmptySlot(match.player1_name, match.player1_id);
    const bye2 = isEmptySlot(match.player2_name, match.player2_id);
    const hasBye = bye1 || bye2;

    if (!winnerId) {
      setActionMessage({ matchId: match.match_id, text: 'Select the match winner.', error: true });
      return;
    }
    if (!hasBye && (!score1 || !score2)) {
      setActionMessage({ matchId: match.match_id, text: 'Enter both scores.', error: true });
      return;
    }

    setSubmitting(true);
    const res = await refereeApi.recordResult(match.match_id, {
      winner_id: winnerId,
      player1_score: parseInt(score1) || 0,
      player2_score: parseInt(score2) || 0,
    });
    setSubmitting(false);

    if (res.success) {
      setActionMessage({ matchId: match.match_id, text: 'Result recorded.' });
      setOpenMatchId(null);
      refresh();
    } else {
      setActionMessage({ matchId: match.match_id, text: res.message || 'Failed to record result', error: true });
    }
  }

  if (loading) return <p className="text-muted">Loading matches…</p>;
  if (error) return <p className="text-corner-red">{error}</p>;

  return (
    <div className="page">
      <div className="head">
        <h1>My matches</h1>
        <p>
          <b>{counts.all}</b> match{counts.all === 1 ? '' : 'es'}
          {awaitingResult > 0 && (
            <>
              {' '}
              · <b>{awaitingResult}</b> awaiting a result
            </>
          )}
        </p>
      </div>

      {matches.length === 0 ? (
        <p className="text-sm text-muted">No matches assigned yet.</p>
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
                const when = formatWhen(m.scheduled_at);
                const canRecord = !m.winner_id && m.status !== 'completed';
                const isOpen = openMatchId === m.match_id;
                const bye1 = isEmptySlot(m.player1_name, m.player1_id);
                const bye2 = isEmptySlot(m.player2_name, m.player2_id);
                const hasScore = m.player1_score !== undefined && m.player2_score !== undefined;
                const isWinner1 = !!m.winner_id && m.winner_id === m.player1_id;
                const isWinner2 = !!m.winner_id && m.winner_id === m.player2_id;

                return (
                  <div className="match" data-bucket={bucket} key={m.match_id}>
                    <div className="match-top">
                      <span>
                        <span className="match-round">{matchLabel(m)}</span>
                        <span className={`status-pill ${bucket}`}>
                          <Icon />
                          {meta.label}
                        </span>
                      </span>
                      {when && <span className="match-when">{when}</span>}
                    </div>

                    <div className="vs-box">
                      <div className={`side p1 ${isWinner1 ? 'winner' : ''}`}>
                        <span className="side-avatar">{bye1 ? '—' : initials(m.player1_name || '?')}</span>
                        <span className="side-name">{bye1 ? 'BYE' : m.player1_name || 'TBD'}</span>
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
                      <div className={`side p2 ${isWinner2 ? 'winner' : ''}`}>
                        <span className="side-avatar">{bye2 ? '—' : initials(m.player2_name || '?')}</span>
                        <span className="side-name">{bye2 ? 'BYE' : m.player2_name || 'TBD'}</span>
                      </div>
                    </div>

                    {canRecord && (
                      <button type="button" className={`record-btn ${isOpen ? 'is-open' : ''}`} onClick={() => (isOpen ? closePanel() : openPanel(m))}>
                        {!isOpen && <CheckIcon />}
                        {isOpen ? 'Close' : 'Record result'}
                      </button>
                    )}

                    {isOpen && (
                      <div className="panel">
                        <div>
                          <div className="panel-label">{bye1 || bye2 ? 'Select winner — BYE, auto-selected' : 'Select winner'}</div>
                          <div className="winner-row">
                            <button
                              type="button"
                              className="winner-opt p1"
                              disabled={bye1}
                              aria-pressed={!!m.player1_id && winnerId === m.player1_id}
                              onClick={() => setWinnerId(m.player1_id ?? '')}
                            >
                              <span className="dot" />
                              {bye1 ? 'BYE' : m.player1_name || 'TBD'}
                            </button>
                            <button
                              type="button"
                              className="winner-opt p2"
                              disabled={bye2}
                              aria-pressed={!!m.player2_id && winnerId === m.player2_id}
                              onClick={() => setWinnerId(m.player2_id ?? '')}
                            >
                              <span className="dot" />
                              {bye2 ? 'BYE' : m.player2_name || 'TBD'}
                            </button>
                          </div>
                        </div>

                        {!(bye1 || bye2) && (
                          <div>
                            <div className="panel-label">Scores</div>
                            <div className="score-row">
                              <input
                                type="number"
                                placeholder={`${m.player1_name ?? 'Player 1'} score`}
                                value={score1}
                                onChange={(e) => setScore1(e.target.value)}
                              />
                              <input
                                type="number"
                                placeholder={`${m.player2_name ?? 'Player 2'} score`}
                                value={score2}
                                onChange={(e) => setScore2(e.target.value)}
                              />
                            </div>
                          </div>
                        )}

                        <div className="panel-actions">
                          <button type="button" className="submit-btn" onClick={() => handleSubmit(m)} disabled={submitting}>
                            {submitting ? 'Submitting…' : 'Submit result'}
                          </button>
                          <button type="button" className="cancel-btn" onClick={closePanel}>
                            Cancel
                          </button>
                        </div>

                        {actionMessage?.matchId === m.match_id && (
                          <p className={`panel-msg ${actionMessage.error ? 'err' : 'ok'}`}>{actionMessage.text}</p>
                        )}
                      </div>
                    )}
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
          color: var(--color-ink);
          transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
        }
        /* Soft tint, not a solid fill -- same treatment as the dashboard's
           stat icons, so the selected filter reads as a quiet highlight
           instead of a bold color block. */
        .chip[aria-pressed='true'] {
          background: color-mix(in srgb, var(--color-accent-indigo) 16%, transparent);
          border-color: transparent;
          color: var(--color-accent-indigo);
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
          border: 1px solid var(--color-line);
          border-radius: 18px;
          padding: 18px 20px 18px 23px;
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
          gap: 10px;
          flex-wrap: wrap;
        }
        .match-round {
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
        .status-pill :global(svg) {
          width: 11px;
          height: 11px;
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
          min-width: 0;
        }
        .side-avatar {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 16px;
          flex-shrink: 0;
        }
        .side.p1 .side-avatar {
          background: color-mix(in srgb, var(--color-corner-red) 14%, transparent);
          color: var(--color-corner-red);
        }
        .side.p2 .side-avatar {
          background: color-mix(in srgb, var(--color-accent-blue) 14%, transparent);
          color: var(--color-accent-blue);
        }
        .side-name {
          font-size: 13.5px;
          font-weight: 700;
          color: #3a3d45;
          text-align: center;
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .side.p1 .side-name {
          color: var(--color-corner-red);
        }
        .side.p2 .side-name {
          color: var(--color-accent-blue);
        }
        .side.winner .side-name::after {
          content: '✓ Winner';
          display: block;
          font-size: 10px;
          font-weight: 700;
          color: #0a8a3f;
          margin-top: 2px;
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

        /* Dark-blue-to-light-blue -- the same gradient pair already used
           elsewhere in this codebase (player's nav/avatar), matching the
           dashboard's own "Record result" button. */
        :global(.record-btn) {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          margin-top: 14px;
          border: none;
          border-radius: 12px;
          padding: 10px 0;
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          background: linear-gradient(120deg, var(--color-accent-blue), #00b8d9);
          box-shadow: 0 10px 20px -10px color-mix(in srgb, var(--color-accent-blue) 55%, transparent);
        }
        :global(.record-btn.is-open) {
          background: var(--color-bg);
          color: var(--color-ink);
          border: 1.5px solid var(--color-line);
          box-shadow: none;
        }
        .record-btn :global(svg) {
          width: 14px;
          height: 14px;
        }

        .panel {
          margin-top: 14px;
          border: 1px solid var(--color-line);
          background: var(--color-bg);
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .panel-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--color-muted);
          margin-bottom: 8px;
        }
        .winner-row {
          display: flex;
          gap: 8px;
        }
        :global(.winner-opt) {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1.5px solid var(--color-line);
          background: var(--color-surface);
          border-radius: 12px;
          padding: 10px 12px;
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          color: var(--color-ink);
          text-align: left;
        }
        :global(.winner-opt[disabled]) {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .winner-opt :global(.dot) {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        :global(.winner-opt.p1 .dot) {
          background: var(--color-corner-red);
        }
        :global(.winner-opt.p2 .dot) {
          background: var(--color-accent-blue);
        }
        :global(.winner-opt[aria-pressed='true']) {
          border-color: var(--color-accent-indigo);
          background: color-mix(in srgb, var(--color-accent-indigo) 10%, var(--color-surface));
          box-shadow: 0 0 0 1px var(--color-accent-indigo) inset;
        }
        .score-row {
          display: flex;
          gap: 8px;
        }
        .score-row :global(input) {
          width: 100%;
          border: 1.5px solid var(--color-line);
          background: var(--color-surface);
          border-radius: 12px;
          padding: 10px 12px;
          font-family: inherit;
          font-size: 14px;
          color: var(--color-ink);
        }
        .panel-actions {
          display: flex;
          gap: 8px;
        }
        /* background/text drawn from the same ink/bg pair so it stays
           readable regardless of theme -- see the design-review artifact's
           equivalent fix (a literal #fff broke here in dark-mode preview). */
        :global(.submit-btn) {
          flex: 1;
          border: none;
          border-radius: 12px;
          padding: 10px 0;
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 700;
          color: var(--color-bg);
          cursor: pointer;
          background: var(--color-ink);
        }
        :global(.submit-btn:disabled) {
          opacity: 0.5;
        }
        :global(.cancel-btn) {
          border: 1.5px solid var(--color-line);
          background: var(--color-surface);
          border-radius: 12px;
          padding: 10px 18px;
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 700;
          color: var(--color-ink);
          cursor: pointer;
        }
        .panel-msg {
          font-size: 12.5px;
          font-weight: 600;
          margin: 0;
        }
        .panel-msg.ok {
          color: #0a8a3f;
        }
        .panel-msg.err {
          color: var(--color-corner-red);
        }

        @media (max-width: 520px) {
          .vs-box {
            gap: 10px;
          }
          .side-name {
            font-size: 12px;
            max-width: 96px;
          }
          .winner-row {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
