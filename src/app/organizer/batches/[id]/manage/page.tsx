'use client';

import { use, useEffect, useState } from 'react';
import { organizerApi } from '@/lib/api/organizer.api';
import { canDo, useOrganizerPermissions } from '@/lib/auth/useOrganizerPermissions';
import type { Batch, BatchPlayer, OrganizerMatch, Referee, StandingRow } from '@/lib/types';

type Panel = { matchId: string; type: 'record' | 'advance' | 'replace' };
type ActionMessage = { matchId: string; text: string; error?: boolean };

// bracket_side/bye_type arrive via batchMatches' select('*') but aren't on
// the shared OrganizerMatch type yet -- kept page-local so this change stays
// a single hunk (the pending type hunks elsewhere are another task's).
type MatchWithSide = OrganizerMatch & { bracket_side?: string | null; bye_type?: string | null };

type BracketSide = 'W' | 'L' | 'GF' | 'R';

function sideOf(match: OrganizerMatch): BracketSide {
  const s = (match as MatchWithSide).bracket_side;
  return s === 'L' || s === 'GF' || s === 'R' ? s : 'W';
}

const SIDE_TITLES: Record<BracketSide, string> = {
  W: 'Winners',
  L: 'Losers',
  GF: 'Grand final',
  R: 'Round',
};

const BYE_LABELS: Record<string, string> = {
  knockout: 'Bye',
  rest: 'Rest',
  placement: 'Placement',
};

export default function BatchManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // Convenience-only: match RPCs + batches_update_owner authorize server-side.
  // canConduct gates start/record/reopen/force-advance/replace (manage_matches);
  // canAssignRef gates referee assignment (manage_batches per Step 0).
  const { perms } = useOrganizerPermissions();
  const canConduct = canDo(perms, 'manage_matches');
  const canAssignRef = canDo(perms, 'manage_batches');

  const [batch, setBatch] = useState<Batch | null>(null);
  const [matches, setMatches] = useState<OrganizerMatch[]>([]);
  const [players, setPlayers] = useState<BatchPlayer[]>([]);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedRefereeId, setSelectedRefereeId] = useState('');
  const [savingReferee, setSavingReferee] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [panel, setPanel] = useState<Panel | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<ActionMessage | null>(null);

  const [recordWinnerId, setRecordWinnerId] = useState('');
  const [recordScore1, setRecordScore1] = useState('');
  const [recordScore2, setRecordScore2] = useState('');
  const [advanceWinnerId, setAdvanceWinnerId] = useState('');
  const [replaceOldId, setReplaceOldId] = useState('');
  const [replaceNewId, setReplaceNewId] = useState('');

  // Match-timer state. The persisted base is the match row's updated_at at
  // the scheduled -> in_progress transition (returned by start_match as
  // started_at; matches has no started_at column and none was added).
  // timerBase pins the base locally so a post-start refetch can't shift the
  // display; frozenElapsed preserves the visible time after the organizer
  // stops the timer by clicking it. pageLoadedAt is only the fallback base
  // for in-progress rows that carry no updated_at (never updated since
  // creation) — they count from page load rather than showing a stuck clock.
  const [timerBase, setTimerBase] = useState<Record<string, number>>({});
  const [frozenElapsed, setFrozenElapsed] = useState<Record<string, number>>({});
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [pageLoadedAt] = useState(() => Date.now());

  // Inlined directly in the effect body -- calling ANY locally-defined
  // function that sets state (even after an await) from inside useEffect
  // trips react-hooks/set-state-in-effect, regardless of declaration order.
  // loadAll had exactly one caller (this effect), so there's no reuse to
  // preserve; refreshMatches below stays separate for the post-action
  // refetch case.
  useEffect(() => {
    Promise.all([
      organizerApi.batchDetail(id),
      organizerApi.batchMatches(id),
      organizerApi.batchPlayers(id),
      organizerApi.referees(),
    ]).then(([b, m, p, r]) => {
      if (b.success && b.data) {
        setBatch(b.data);
        setSelectedRefereeId(b.data.referee_id ?? '');
      } else {
        setError(b.message || 'Could not load batch');
      }
      if (m.success && m.data) setMatches(m.data);
      if (p.success && p.data) setPlayers(p.data);
      if (r.success && r.data) setReferees(r.data);
      // Standings live in rr_standings (view returns [] for non-RR), so only
      // round-robin batches pay for the extra query.
      if (b.success && b.data?.tournament_format === 'round_robin') {
        organizerApi.batchStandings(id).then((s) => {
          if (s.success && s.data) setStandings(s.data);
        });
      }
      setLoading(false);
    });
  }, [id]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }

  // One shared 1s tick while any timer is running — not one interval per
  // match. Stops entirely once every timer is stopped/frozen.
  const anyTimerRunning = matches.some((m) => m.status === 'in_progress' && frozenElapsed[m.match_id] === undefined);
  useEffect(() => {
    if (!anyTimerRunning) return;
    const t = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [anyTimerRunning]);

  function timerBaseMs(match: OrganizerMatch): number {
    const local = timerBase[match.match_id];
    if (local !== undefined) return local;
    if (match.updated_at) {
      const parsed = Date.parse(match.updated_at);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return pageLoadedAt;
  }

  function elapsedMs(match: OrganizerMatch): number {
    const frozen = frozenElapsed[match.match_id];
    if (frozen !== undefined) return frozen;
    return Math.max(0, nowMs - timerBaseMs(match));
  }

  function formatHHMMSS(totalMs: number): string {
    const totalSeconds = Math.floor(totalMs / 1000);
    const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const ss = String(totalSeconds % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  async function refreshMatches() {
    const res = await organizerApi.batchMatches(id);
    if (res.success && res.data) setMatches(res.data);
    // Every record/reopen/advance/replace flows through here, so the RR
    // table stays fresh without its own refresh plumbing.
    if (batch?.tournament_format === 'round_robin') {
      const st = await organizerApi.batchStandings(id);
      if (st.success && st.data) setStandings(st.data);
    }
  }

  async function refreshBatch() {
    const res = await organizerApi.batchDetail(id);
    if (res.success && res.data) {
      setBatch(res.data);
      setSelectedRefereeId(res.data.referee_id ?? '');
    }
  }

  async function handleConfirmReferee() {
    setSavingReferee(true);
    const res = await organizerApi.assignReferee(id, selectedRefereeId || null);
    setSavingReferee(false);
    if (res.success) {
      showToast('Referee confirmed');
      refreshBatch();
    } else {
      showToast(res.message || 'Could not update referee');
    }
  }

  function openPanel(matchId: string, type: Panel['type']) {
    setPanel({ matchId, type });
    setActionMessage(null);
    setRecordWinnerId('');
    setRecordScore1('');
    setRecordScore2('');
    setAdvanceWinnerId('');
    setReplaceOldId('');
    setReplaceNewId('');
  }

  function closePanel() {
    setPanel(null);
  }

  async function handleStart(match: OrganizerMatch) {
    setBusy(true);
    setActionMessage(null);
    const res = await organizerApi.startConducting(id, match.match_id);
    setBusy(false);
    if (res.success) {
      // Pin the server-returned transition stamp as the timer base so the
      // display is anchored to persisted match state, not to local click
      // time; refreshMatches then flips the row to in_progress, which swaps
      // the Start button for the running timer below.
      const parsed = res.data?.started_at ? Date.parse(res.data.started_at) : NaN;
      // nowMs (not Date.now(): the purity lint forbids impure calls in
      // component scope) — equals the click time here because the tick
      // updates it every second while any timer runs, and elapsed is 0
      // at start regardless of small staleness when none runs.
      const base = Number.isNaN(parsed) ? nowMs : parsed;
      setTimerBase((prev) => ({ ...prev, [match.match_id]: base }));
      setFrozenElapsed((prev) => {
        if (prev[match.match_id] === undefined) return prev;
        const next = { ...prev };
        delete next[match.match_id];
        return next;
      });
      setNowMs(base);
      setActionMessage({ matchId: match.match_id, text: 'Match started.' });
      refreshMatches();
    } else {
      setActionMessage({ matchId: match.match_id, text: res.message || 'Could not start match', error: true });
    }
  }

  // Clicking the running timer stops it locally and preserves the elapsed
  // time on screen. No server write: match state already transitioned to
  // in_progress at Start; stopping the display clock is presentation-only.
  function handleStopTimer(match: OrganizerMatch) {
    const elapsed = Math.max(0, nowMs - timerBaseMs(match));
    setFrozenElapsed((prev) => ({ ...prev, [match.match_id]: elapsed }));
  }

  async function handleReopen(match: OrganizerMatch) {
    if (!window.confirm('Reopen this completed match?')) return;
    setBusy(true);
    setActionMessage(null);
    const res = await organizerApi.reopenMatch(id, match.match_id);
    setBusy(false);
    if (res.success) {
      setActionMessage({ matchId: match.match_id, text: 'Match reopened.' });
      refreshMatches();
    } else {
      setActionMessage({ matchId: match.match_id, text: res.message || 'Could not reopen match', error: true });
    }
  }

  async function submitRecord(match: OrganizerMatch) {
    if (!recordWinnerId) {
      setActionMessage({ matchId: match.match_id, text: 'Select a winner first.', error: true });
      return;
    }
    setBusy(true);
    const res = await organizerApi.recordMatchResult(id, match.match_id, {
      winner_id: recordWinnerId,
      player1_score: recordScore1 !== '' ? Number(recordScore1) : undefined,
      player2_score: recordScore2 !== '' ? Number(recordScore2) : undefined,
    });
    setBusy(false);
    if (res.success) {
      setActionMessage({ matchId: match.match_id, text: 'Result recorded.' });
      setPanel(null);
      refreshMatches();
    } else {
      setActionMessage({ matchId: match.match_id, text: res.message || 'Could not record result', error: true });
    }
  }

  async function submitAdvance(match: OrganizerMatch) {
    if (!advanceWinnerId) {
      setActionMessage({ matchId: match.match_id, text: 'Select a winner first.', error: true });
      return;
    }
    setBusy(true);
    const res = await organizerApi.forceAdvanceMatch(id, match.match_id, advanceWinnerId);
    setBusy(false);
    if (res.success) {
      setActionMessage({ matchId: match.match_id, text: 'Match advanced.' });
      setPanel(null);
      refreshMatches();
    } else {
      setActionMessage({ matchId: match.match_id, text: res.message || 'Could not force advance', error: true });
    }
  }

  async function submitReplace(match: OrganizerMatch) {
    if (!replaceOldId || !replaceNewId) {
      setActionMessage({ matchId: match.match_id, text: 'Select who to replace and a replacement.', error: true });
      return;
    }
    setBusy(true);
    const res = await organizerApi.replaceParticipant(id, match.match_id, replaceOldId, replaceNewId);
    setBusy(false);
    if (res.success) {
      setActionMessage({ matchId: match.match_id, text: 'Participant replaced.' });
      setPanel(null);
      refreshMatches();
    } else {
      setActionMessage({ matchId: match.match_id, text: res.message || 'Could not replace participant', error: true });
    }
  }

  function playerName(playerId: string): string {
    return players.find((p) => p.player_id === playerId)?.name ?? 'Unknown';
  }

  function winnerName(match: OrganizerMatch): string | null {
    if (!match.winner_id) return null;
    if (match.winner_id === match.player1_id) return match.player1_name ?? null;
    if (match.winner_id === match.player2_id) return match.player2_name ?? null;
    return null;
  }

  if (loading) return <p className="text-muted">Loading batch…</p>;
  if (error) return <p className="text-corner-red">{error}</p>;
  if (!batch) return <p className="text-corner-red">Batch not found.</p>;

  const refereeChanged = selectedRefereeId !== (batch.referee_id ?? '');

  // Bracket-side grouping (Step 9): single-side batches (every SE/RR batch)
  // render exactly as before; multi-side (DE) batches get Winners / Losers /
  // Grand-final sections, each with its own round cards.
  const SIDE_ORDER: BracketSide[] = ['W', 'L', 'GF', 'R'];
  const sidesInUse = SIDE_ORDER.filter((s) => matches.some((m) => sideOf(m) === s));
  const singleSide = sidesInUse.length <= 1;
  const defaultSide: BracketSide = sidesInUse[0] ?? 'W';
  const roundsFor = (side: BracketSide) =>
    Array.from(new Set(matches.filter((m) => sideOf(m) === side).map((m) => m.round_number ?? 0))).sort((a, b) => a - b);
  const bracketSections = (singleSide ? [defaultSide] : sidesInUse).map((side) => ({
    side,
    rounds: roundsFor(side),
  }));
  function roundTitle(side: BracketSide, round: number): string {
    if (singleSide) return `Round ${round}`;
    if (side === 'GF') return 'Grand final';
    return `${SIDE_TITLES[side]} — Round ${round}`;
  }

  return (
    <div className="page">
      <div className="head">
        <h1>{batch.batch_name}</h1>
        {batch.category && <p>{batch.category}</p>}
        {batch.tournament_format && batch.tournament_format !== 'single_elimination' && (
          <p className="format-line">
            <span className="format-pill">
              {batch.tournament_format === 'double_elimination' ? 'Double elimination' : 'Round robin'}
            </span>
            {batch.bye_method && batch.bye_method !== 'random' && <span className="format-note"> · byes: {batch.bye_method}</span>}
            {batch.tournament_format === 'double_elimination' && (
              <span className="format-note"> · reset {batch.grand_final_reset === false ? 'off' : 'on'}</span>
            )}
          </p>
        )}
      </div>

      {(!canConduct || !canAssignRef) && (
        <p className="text-muted">
          {!canConduct && !canAssignRef
            ? 'Match controls and referee assignment are disabled for this account — ask an admin for manage_matches / manage_batches.'
            : !canConduct
              ? 'Match controls are disabled for this account — ask an admin for manage_matches.'
              : 'Referee assignment is disabled for this account — ask an admin for manage_batches.'}
        </p>
      )}
      <div className="card">
        <h2>Referee</h2>
        <div className="ref-row">
          <select value={selectedRefereeId} onChange={(e) => setSelectedRefereeId(e.target.value)}>
            <option value="">Unassigned</option>
            {referees.map((r) => (
              <option key={r.referee_id} value={r.referee_id}>
                {r.name}
              </option>
            ))}
          </select>
          <button className="btn-confirm" onClick={handleConfirmReferee} disabled={!refereeChanged || savingReferee || !canAssignRef} title={canAssignRef ? undefined : 'Needs the manage_batches permission — ask an admin.'}>
            {savingReferee ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>

      {batch.tournament_format === 'round_robin' && (
        <div className="card">
          <h2>Standings</h2>
          {standings.length === 0 ? (
            <p className="text-muted">No decided matches yet — the table fills in as results are recorded.</p>
          ) : (
            <table className="standings-table">
              <thead>
                <tr>
                  <th className="num">#</th>
                  <th>Player</th>
                  <th className="num">P</th>
                  <th className="num">W</th>
                  <th className="num">L</th>
                  <th className="num">Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row, i) => (
                  <tr key={row.player_id} className={i === 0 && row.played > 0 ? 'leader' : ''}>
                    <td className="num">{i + 1}</td>
                    <td>{playerName(row.player_id)}</td>
                    <td className="num">{row.played}</td>
                    <td className="num">{row.wins}</td>
                    <td className="num">{row.losses}</td>
                    <td className="num pts">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="standings-note">Win = 3 pts · decided matches only · level points stay level (no tie-break).</p>
        </div>
      )}

      {matches.length === 0 ? (
        <p className="text-muted">No matches yet.</p>
      ) : (
        bracketSections.map((section) => (
          <div key={section.side}>
            {!singleSide && <p className="side-title">{SIDE_TITLES[section.side]}</p>}
            {section.rounds.map((round) => (
              <div className="card round-card" key={`${section.side}-${round}`}>
                <p className="round-title">{roundTitle(section.side, round)}</p>
                <div className="bracket">
                  {matches
                    .filter((m) => sideOf(m) === section.side && (m.round_number ?? 0) === round)
                    .map((match, i) => {
                  const canStart = match.status === 'scheduled' && !!match.player1_id && !!match.player2_id;
                  const showTimer = match.status === 'in_progress';
                  const timerStopped = frozenElapsed[match.match_id] !== undefined;
                  const timerLabel = showTimer ? formatHHMMSS(elapsedMs(match)) : '';
                  const canRecord = match.status === 'scheduled' || match.status === 'in_progress';
                  const canReopen = match.status === 'completed';
                  const canAdvance = match.status !== 'completed';
                  const canReplace = match.status !== 'completed';
                  const eligibleReplacements = players.filter((p) => p.player_id !== match.player1_id && p.player_id !== match.player2_id);
                  const w = winnerName(match);
                  const isPanelHere = panel?.matchId === match.match_id;
                  const status = match.status ?? 'scheduled';
                  const byeType = (match as MatchWithSide).bye_type ?? null;

                  return (
                    <div className="match" key={match.match_id}>
                      <span className={`match-num ${status === 'in_progress' ? 'dot-live' : status === 'completed' ? 'dot-done' : ''}`}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="match-row">
                        <span className="match-players">
                          {match.player1_name ?? 'TBD'}
                          {match.player1_score !== undefined && match.player2_score !== undefined && (
                            <span className="score">
                              {match.player1_score}–{match.player2_score}
                            </span>
                          )}
                          <span className="vs">vs</span>
                          {match.player2_name ?? 'TBD'}
                        </span>
                        <span className={`pill pill-${status}`}>{status === 'in_progress' ? 'In progress' : status.charAt(0).toUpperCase() + status.slice(1)}</span>
                        {byeType && <span className="bye-tag">{BYE_LABELS[byeType] ?? byeType}</span>}
                      </div>
                      {w && <div className="winner-note">Winner: {w}</div>}

                      <div className="actions">
                        {canStart && (
                          <button className="btn-action-primary" onClick={() => handleStart(match)} disabled={busy || !canConduct} title={canConduct ? undefined : 'Needs the manage_matches permission — ask an admin.'}>
                            Start
                          </button>
                        )}
                        {showTimer &&
                          (timerStopped ? (
                            <span className="btn-action-primary timer timer-stopped" role="timer" aria-label={`Match timer stopped at ${timerLabel}`}>
                              {timerLabel}
                            </span>
                          ) : (
                            <button
                              className="btn-action-primary timer"
                              onClick={() => handleStopTimer(match)}
                              title="Stop timer"
                              aria-label={`Match timer running: ${timerLabel}. Activate to stop.`}
                            >
                              {timerLabel}
                            </button>
                          ))}
                        {canRecord && (
                          <button
                            className="btn-action-primary"
                            onClick={() => (isPanelHere && panel?.type === 'record' ? closePanel() : openPanel(match.match_id, 'record'))}
                            disabled={busy || !canConduct}
                            title={canConduct ? undefined : 'Needs the manage_matches permission — ask an admin.'}
                          >
                            Record result
                          </button>
                        )}
                        {canReopen && (
                          <button className="chip" onClick={() => handleReopen(match)} disabled={busy || !canConduct} title={canConduct ? undefined : 'Needs the manage_matches permission — ask an admin.'}>
                            Reopen
                          </button>
                        )}
                        {canAdvance && (
                          <button
                            className="chip"
                            onClick={() => (isPanelHere && panel?.type === 'advance' ? closePanel() : openPanel(match.match_id, 'advance'))}
                            disabled={busy || !canConduct}
                            title={canConduct ? undefined : 'Needs the manage_matches permission — ask an admin.'}
                          >
                            Force advance
                          </button>
                        )}
                        {canReplace && (
                          <button
                            className="chip"
                            onClick={() => (isPanelHere && panel?.type === 'replace' ? closePanel() : openPanel(match.match_id, 'replace'))}
                            disabled={busy || !canConduct}
                            title={canConduct ? undefined : 'Needs the manage_matches permission — ask an admin.'}
                          >
                            Replace participant
                          </button>
                        )}
                      </div>

                      {isPanelHere && panel?.type === 'record' && (
                        <div className="panel">
                          <div className="player-score-row">
                            <label className="radio-row">
                              <input
                                type="radio"
                                name={`record-winner-${match.match_id}`}
                                checked={!!match.player1_id && recordWinnerId === match.player1_id}
                                onChange={() => setRecordWinnerId(match.player1_id ?? '')}
                              />
                              {match.player1_name ?? 'TBD'}
                            </label>
                            <input
                              type="number"
                              className="score-input"
                              placeholder="Score"
                              value={recordScore1}
                              onChange={(e) => setRecordScore1(e.target.value)}
                            />
                          </div>
                          <div className="player-score-row">
                            <label className="radio-row">
                              <input
                                type="radio"
                                name={`record-winner-${match.match_id}`}
                                checked={!!match.player2_id && recordWinnerId === match.player2_id}
                                onChange={() => setRecordWinnerId(match.player2_id ?? '')}
                              />
                              {match.player2_name ?? 'TBD'}
                            </label>
                            <input
                              type="number"
                              className="score-input"
                              placeholder="Score"
                              value={recordScore2}
                              onChange={(e) => setRecordScore2(e.target.value)}
                            />
                          </div>
                          <div className="panel-actions">
                            <button className="btn-submit" onClick={() => submitRecord(match)} disabled={busy || !canConduct}>
                              Submit
                            </button>
                            <button className="btn-cancel" onClick={closePanel}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {isPanelHere && panel?.type === 'advance' && (
                        <div className="panel">
                          <label className="radio-row">
                            <input
                              type="radio"
                              name={`advance-winner-${match.match_id}`}
                              checked={!!match.player1_id && advanceWinnerId === match.player1_id}
                              onChange={() => setAdvanceWinnerId(match.player1_id ?? '')}
                            />
                            {match.player1_name ?? 'TBD'}
                          </label>
                          <label className="radio-row">
                            <input
                              type="radio"
                              name={`advance-winner-${match.match_id}`}
                              checked={!!match.player2_id && advanceWinnerId === match.player2_id}
                              onChange={() => setAdvanceWinnerId(match.player2_id ?? '')}
                            />
                            {match.player2_name ?? 'TBD'}
                          </label>
                          <div className="panel-actions">
                            <button className="btn-submit" onClick={() => submitAdvance(match)} disabled={busy || !canConduct}>
                              Confirm
                            </button>
                            <button className="btn-cancel" onClick={closePanel}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {isPanelHere && panel?.type === 'replace' && (
                        <div className="panel">
                          <label className="radio-row">
                            <input
                              type="radio"
                              name={`replace-old-${match.match_id}`}
                              checked={!!match.player1_id && replaceOldId === match.player1_id}
                              onChange={() => setReplaceOldId(match.player1_id ?? '')}
                            />
                            Replace {match.player1_name ?? 'TBD'}
                          </label>
                          <label className="radio-row">
                            <input
                              type="radio"
                              name={`replace-old-${match.match_id}`}
                              checked={!!match.player2_id && replaceOldId === match.player2_id}
                              onChange={() => setReplaceOldId(match.player2_id ?? '')}
                            />
                            Replace {match.player2_name ?? 'TBD'}
                          </label>
                          <select className="replace-select" value={replaceNewId} onChange={(e) => setReplaceNewId(e.target.value)}>
                            <option value="">Select replacement</option>
                            {eligibleReplacements.map((p) => (
                              <option key={p.player_id} value={p.player_id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <div className="panel-actions">
                            <button className="btn-submit" onClick={() => submitReplace(match)} disabled={busy || !canConduct}>
                              Confirm
                            </button>
                            <button className="btn-cancel" onClick={closePanel}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {actionMessage?.matchId === match.match_id && <p className={`msg ${actionMessage.error ? 'err' : 'ok'}`}>{actionMessage.text}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))
    )}

      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .page {
          max-width: 840px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .head h1 {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.3px;
          margin: 0;
        }
        .head p {
          margin: 5px 0 0;
          font-size: 14px;
          color: var(--color-accent-green);
          font-weight: 700;
        }
        .head .format-line {
          color: #3a3d45;
          font-size: 12.5px;
          font-weight: 600;
        }
        .format-pill {
          display: inline-block;
          border-radius: 999px;
          padding: 3px 9px;
          font-size: 11px;
          font-weight: 800;
          color: #3a3d45;
          background: color-mix(in srgb, var(--color-accent-green) 12%, white);
        }
        .format-note {
          font-weight: 600;
        }

        .card {
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 18px;
          padding: 18px 20px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -14px rgba(22, 24, 29, 0.16);
        }
        .card h2 {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: #3a3d45;
          margin: 0 0 12px;
        }
        .standings-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
        }
        .standings-table th {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: var(--color-muted);
          text-align: left;
          padding: 6px 8px;
          border-bottom: 1.5px solid var(--color-line);
        }
        .standings-table td {
          padding: 9px 8px;
          border-bottom: 1px solid var(--color-line);
          color: var(--color-ink);
        }
        .standings-table tbody tr:last-child td {
          border-bottom: none;
        }
        .standings-table .num {
          text-align: right;
          font-variant-numeric: tabular-nums;
          font-family: var(--font-mono);
          width: 44px;
        }
        .standings-table th:first-child,
        .standings-table td:first-child {
          width: 34px;
        }
        .standings-table tbody tr.leader td {
          background: color-mix(in srgb, var(--color-accent-green) 8%, transparent);
          font-weight: 700;
        }
        .standings-table td.pts {
          font-weight: 800;
        }
        .standings-note {
          margin: 10px 0 0;
          font-size: 12px;
          color: var(--color-muted);
        }

        .ref-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          max-width: 420px;
        }
        .ref-row select {
          flex: 1;
          min-width: 160px;
          border: 1.5px solid var(--color-line);
          border-radius: 10px;
          padding: 9px 10px;
          font-size: 13.5px;
          font-family: inherit;
          color: var(--color-ink);
          background: var(--color-surface);
        }
        .btn-confirm {
          flex-shrink: 0;
          border: none;
          border-radius: 10px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          font-family: inherit;
          background: linear-gradient(120deg, var(--color-accent-green), #00e676);
          box-shadow: 0 4px 10px -6px color-mix(in srgb, var(--color-accent-green) 50%, transparent);
        }
        .btn-confirm:disabled {
          background: #eeece7;
          color: #b3afa6;
          box-shadow: none;
          cursor: default;
        }

        .round-title {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: var(--color-muted);
          margin: 0 0 14px;
        }
        .side-title {
          font-size: 15px;
          font-weight: 800;
          letter-spacing: -0.2px;
          color: var(--color-ink);
          margin: 6px 0 2px;
        }
        .bye-tag {
          display: inline-block;
          border-radius: 999px;
          padding: 2px 8px;
          font-size: 10.5px;
          font-weight: 800;
          color: #8a6a10;
          background: color-mix(in srgb, var(--color-status-pending) 14%, transparent);
          border: 1px solid color-mix(in srgb, var(--color-status-pending) 32%, transparent);
        }
        .bracket {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 18px;
          padding-left: 22px;
        }
        .bracket::before {
          content: '';
          position: absolute;
          left: 7px;
          top: 6px;
          bottom: 24px;
          width: 1px;
          background: var(--color-line);
        }
        .match {
          position: relative;
        }
        .match-num {
          position: absolute;
          left: -22px;
          top: 1px;
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background: var(--color-surface);
          border: 1.5px solid var(--color-line);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          font-weight: 700;
          color: var(--color-muted);
          font-family: var(--font-mono);
        }
        .match-num.dot-live {
          border-color: var(--color-accent-blue);
          color: var(--color-accent-blue);
        }
        .match-num.dot-done {
          border-color: var(--color-accent-green);
          color: var(--color-accent-green);
          background: color-mix(in srgb, var(--color-accent-green) 10%, transparent);
        }
        .match-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .match-players {
          font-size: 14px;
          font-weight: 600;
        }
        .match-players .score {
          font-family: var(--font-mono);
          font-weight: 800;
          margin: 0 6px;
        }
        .match-players .vs {
          color: var(--color-muted);
          font-weight: 500;
          margin: 0 6px;
          font-size: 12.5px;
        }
        .pill {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .pill-scheduled {
          background: color-mix(in srgb, var(--color-muted) 16%, transparent);
          color: var(--color-muted);
        }
        .pill-in_progress {
          background: color-mix(in srgb, var(--color-accent-blue) 14%, transparent);
          color: #0072b0;
        }
        .pill-completed {
          background: color-mix(in srgb, var(--color-accent-green) 14%, transparent);
          color: #0a7a3d;
        }
        .winner-note {
          font-size: 12px;
          color: var(--color-muted);
          margin-top: 4px;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 8px;
        }
        .btn-action-primary {
          border: none;
          border-radius: 9px;
          padding: 7px 14px;
          font-size: 12px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          font-family: inherit;
          background: linear-gradient(120deg, var(--color-accent-green), #00e676);
          box-shadow: 0 3px 8px -4px color-mix(in srgb, var(--color-accent-green) 50%, transparent);
        }
        .btn-action-primary:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .btn-action-primary.timer {
          display: inline-block;
          text-align: center;
          font-family: var(--font-mono);
          font-variant-numeric: tabular-nums;
          min-width: 96px;
          letter-spacing: 0.5px;
        }
        button.btn-action-primary.timer:hover {
          filter: brightness(0.96);
        }
        button.btn-action-primary.timer:active {
          transform: translateY(1px);
        }
        span.btn-action-primary.timer-stopped {
          cursor: default;
        }
        .chip {
          border: 1.5px solid var(--color-line);
          background: var(--color-bg);
          border-radius: 9px;
          padding: 7px 13px;
          font-size: 12px;
          font-weight: 600;
          color: #3a3d45;
          cursor: pointer;
          font-family: inherit;
        }
        .chip:hover:not(:disabled) {
          border-color: var(--color-accent-green);
          color: var(--color-accent-green);
        }
        .chip:disabled {
          opacity: 0.6;
          cursor: default;
        }

        .panel {
          margin-top: 10px;
          background: var(--color-bg);
          border: 1px solid var(--color-line);
          border-radius: 12px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .radio-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
        }
        .radio-row input {
          accent-color: var(--color-accent-green);
          width: 15px;
          height: 15px;
          flex-shrink: 0;
        }
        .player-score-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }
        .player-score-row .radio-row {
          flex: 1;
          min-width: 0;
        }
        .score-input {
          width: 80px;
          flex-shrink: 0;
          border: 1.5px solid var(--color-line);
          border-radius: 9px;
          padding: 7px 9px;
          font-family: var(--font-mono);
          font-size: 13px;
          text-align: center;
        }
        .replace-select {
          border: 1.5px solid var(--color-line);
          border-radius: 9px;
          padding: 7px 9px;
          font-size: 13px;
          font-family: inherit;
          background: var(--color-surface);
        }
        .panel-actions {
          display: flex;
          gap: 8px;
        }
        .btn-submit {
          border: none;
          border-radius: 9px;
          padding: 8px 16px;
          font-size: 12.5px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          font-family: inherit;
          background: linear-gradient(120deg, var(--color-accent-green), #00e676);
        }
        .btn-submit:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .btn-cancel {
          border: 1.5px solid var(--color-line);
          background: var(--color-surface);
          border-radius: 9px;
          padding: 8px 16px;
          font-size: 12.5px;
          font-weight: 700;
          color: #3a3d45;
          cursor: pointer;
          font-family: inherit;
        }
        .msg {
          font-size: 12px;
          margin-top: 6px;
        }
        .msg.ok {
          color: var(--color-muted);
        }
        .msg.err {
          color: var(--color-corner-red);
        }

        .toast {
          position: fixed;
          left: 50%;
          bottom: 26px;
          transform: translateX(-50%);
          background: var(--color-ink);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          padding: 11px 18px;
          border-radius: 12px;
          box-shadow: 0 12px 28px -10px rgba(0, 0, 0, 0.4);
          z-index: 50;
        }

        @media (max-width: 600px) {
          .page {
            gap: 16px;
          }
        }
      `}</style>
    </div>
  );
}
