'use client';

import { use, useEffect, useState } from 'react';
import { organizerApi } from '@/lib/api/organizer.api';
import { Card } from '@/lib/ui/Card';
import { StatusBadge } from '@/lib/ui/StatusBadge';
import { BracketList, BracketRow } from '@/lib/ui/Bracket';
import type { Batch, BatchPlayer, OrganizerMatch, Referee } from '@/lib/types';

type Panel = { matchId: string; type: 'record' | 'advance' | 'replace' };
type ActionMessage = { matchId: string; text: string; error?: boolean };

const DOT_COLOR: Record<string, string> = {
  scheduled: 'bg-muted',
  in_progress: 'bg-accent-blue',
  completed: 'bg-accent-green',
};

export default function BatchManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [batch, setBatch] = useState<Batch | null>(null);
  const [matches, setMatches] = useState<OrganizerMatch[]>([]);
  const [players, setPlayers] = useState<BatchPlayer[]>([]);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedRefereeId, setSelectedRefereeId] = useState('');
  const [savingReferee, setSavingReferee] = useState(false);
  const [refereeMessage, setRefereeMessage] = useState<string | null>(null);

  const [panel, setPanel] = useState<Panel | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<ActionMessage | null>(null);

  const [recordWinnerId, setRecordWinnerId] = useState('');
  const [recordScore1, setRecordScore1] = useState('');
  const [recordScore2, setRecordScore2] = useState('');
  const [advanceWinnerId, setAdvanceWinnerId] = useState('');
  const [replaceOldId, setReplaceOldId] = useState('');
  const [replaceNewId, setReplaceNewId] = useState('');

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
      setLoading(false);
    });
  }, [id]);

  async function refreshMatches() {
    const res = await organizerApi.batchMatches(id);
    if (res.success && res.data) setMatches(res.data);
  }

  async function refreshBatch() {
    const res = await organizerApi.batchDetail(id);
    if (res.success && res.data) {
      setBatch(res.data);
      setSelectedRefereeId(res.data.referee_id ?? '');
    }
  }

  async function handleSaveReferee() {
    setSavingReferee(true);
    setRefereeMessage(null);
    const res = await organizerApi.assignReferee(id, selectedRefereeId || null);
    setSavingReferee(false);
    if (res.success) {
      setRefereeMessage('Referee updated.');
      refreshBatch();
    } else {
      setRefereeMessage(res.message || 'Could not update referee');
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
      setActionMessage({ matchId: match.match_id, text: 'Match started.' });
      refreshMatches();
    } else {
      setActionMessage({ matchId: match.match_id, text: res.message || 'Could not start match', error: true });
    }
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

  function winnerName(match: OrganizerMatch): string | null {
    if (!match.winner_id) return null;
    if (match.winner_id === match.player1_id) return match.player1_name ?? null;
    if (match.winner_id === match.player2_id) return match.player2_name ?? null;
    return null;
  }

  if (loading) return <p className="text-muted">Loading batch…</p>;
  if (error) return <p className="text-corner-red">{error}</p>;
  if (!batch) return <p className="text-corner-red">Batch not found.</p>;

  const rounds = Array.from(new Set(matches.map((m) => m.round_number ?? 0))).sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold text-ink">{batch.batch_name}</h1>
        {batch.category && <p className="text-sm text-muted">{batch.category}</p>}
      </div>

      <Card>
        <h2 className="mb-2 text-sm font-semibold text-muted">Referee</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedRefereeId}
            onChange={(e) => setSelectedRefereeId(e.target.value)}
            className="rounded-md border border-line px-3 py-2 text-sm"
          >
            <option value="">Unassigned</option>
            {referees.map((r) => (
              <option key={r.referee_id} value={r.referee_id}>
                {r.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleSaveReferee}
            disabled={savingReferee}
            className="rounded-md bg-accent-green px-3 py-2 text-sm font-medium text-surface disabled:opacity-50"
          >
            {savingReferee ? 'Saving…' : 'Save'}
          </button>
        </div>
        {refereeMessage && <p className="mt-2 text-sm text-muted">{refereeMessage}</p>}
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted">Matches</h2>
        {matches.length === 0 ? (
          <p className="text-sm text-muted">No matches yet.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {rounds.map((round) => (
              <Card key={round}>
                <h3 className="mb-3 text-xs font-semibold uppercase text-muted">Round {round}</h3>
                <BracketList>
                  {matches
                    .filter((m) => (m.round_number ?? 0) === round)
                    .map((match, i) => {
                      const canStart = match.status === 'scheduled' && !!match.player1_id && !!match.player2_id;
                      const canRecord = match.status === 'scheduled' || match.status === 'in_progress';
                      const canReopen = match.status === 'completed';
                      const canAdvance = match.status !== 'completed';
                      const canReplace = match.status !== 'completed';
                      const eligibleReplacements = players.filter(
                        (p) => p.player_id !== match.player1_id && p.player_id !== match.player2_id,
                      );
                      const w = winnerName(match);
                      const isPanelHere = panel?.matchId === match.match_id;

                      return (
                        <div key={match.match_id} className="flex flex-col gap-2">
                          <BracketRow number={i + 1} dotColor={DOT_COLOR[match.status ?? ''] ?? 'bg-muted'}>
                            <div className="flex flex-1 items-center justify-between gap-3 text-sm">
                              <span className="font-medium text-ink">
                                {match.player1_name ?? 'TBD'}
                                {match.player1_score !== undefined && match.player2_score !== undefined && (
                                  <span className="ml-2 font-mono text-xs font-bold text-ink">
                                    {match.player1_score}–{match.player2_score}
                                  </span>
                                )}
                                <span className="mx-2 text-xs text-muted">vs</span>
                                {match.player2_name ?? 'TBD'}
                              </span>
                              <StatusBadge status={match.status ?? 'scheduled'} />
                            </div>
                          </BracketRow>
                          {w && <div className="pl-7 text-xs text-muted">Winner: {w}</div>}

                          <div className="flex flex-wrap gap-2 pl-7">
                            {canStart && (
                              <button onClick={() => handleStart(match)} disabled={busy} className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50">
                                Start
                              </button>
                            )}
                            {canRecord && (
                              <button
                                onClick={() => (isPanelHere && panel?.type === 'record' ? closePanel() : openPanel(match.match_id, 'record'))}
                                disabled={busy}
                                className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
                              >
                                Record result
                              </button>
                            )}
                            {canReopen && (
                              <button onClick={() => handleReopen(match)} disabled={busy} className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50">
                                Reopen
                              </button>
                            )}
                            {canAdvance && (
                              <button
                                onClick={() => (isPanelHere && panel?.type === 'advance' ? closePanel() : openPanel(match.match_id, 'advance'))}
                                disabled={busy}
                                className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
                              >
                                Force advance
                              </button>
                            )}
                            {canReplace && (
                              <button
                                onClick={() => (isPanelHere && panel?.type === 'replace' ? closePanel() : openPanel(match.match_id, 'replace'))}
                                disabled={busy}
                                className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
                              >
                                Replace participant
                              </button>
                            )}
                          </div>

                          {isPanelHere && panel?.type === 'record' && (
                            <div className="ml-7 flex flex-col gap-2 rounded-md border border-line bg-bg p-3">
                              <div className="flex flex-col gap-1 text-sm text-ink">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`record-winner-${match.match_id}`}
                                    checked={!!match.player1_id && recordWinnerId === match.player1_id}
                                    onChange={() => setRecordWinnerId(match.player1_id ?? '')}
                                  />
                                  {match.player1_name ?? 'TBD'}
                                </label>
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`record-winner-${match.match_id}`}
                                    checked={!!match.player2_id && recordWinnerId === match.player2_id}
                                    onChange={() => setRecordWinnerId(match.player2_id ?? '')}
                                  />
                                  {match.player2_name ?? 'TBD'}
                                </label>
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  placeholder="Player 1 score"
                                  value={recordScore1}
                                  onChange={(e) => setRecordScore1(e.target.value)}
                                  className="w-full rounded-md border border-line px-3 py-2 font-mono text-sm"
                                />
                                <input
                                  type="number"
                                  placeholder="Player 2 score"
                                  value={recordScore2}
                                  onChange={(e) => setRecordScore2(e.target.value)}
                                  className="w-full rounded-md border border-line px-3 py-2 font-mono text-sm"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => submitRecord(match)} disabled={busy} className="rounded-md bg-accent-green px-3 py-2 text-sm font-medium text-surface disabled:opacity-50">
                                  Submit
                                </button>
                                <button onClick={closePanel} className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {isPanelHere && panel?.type === 'advance' && (
                            <div className="ml-7 flex flex-col gap-2 rounded-md border border-line bg-bg p-3">
                              <div className="flex flex-col gap-1 text-sm text-ink">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`advance-winner-${match.match_id}`}
                                    checked={!!match.player1_id && advanceWinnerId === match.player1_id}
                                    onChange={() => setAdvanceWinnerId(match.player1_id ?? '')}
                                  />
                                  {match.player1_name ?? 'TBD'}
                                </label>
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`advance-winner-${match.match_id}`}
                                    checked={!!match.player2_id && advanceWinnerId === match.player2_id}
                                    onChange={() => setAdvanceWinnerId(match.player2_id ?? '')}
                                  />
                                  {match.player2_name ?? 'TBD'}
                                </label>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => submitAdvance(match)} disabled={busy} className="rounded-md bg-accent-green px-3 py-2 text-sm font-medium text-surface disabled:opacity-50">
                                  Confirm
                                </button>
                                <button onClick={closePanel} className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {isPanelHere && panel?.type === 'replace' && (
                            <div className="ml-7 flex flex-col gap-2 rounded-md border border-line bg-bg p-3">
                              <div className="flex flex-col gap-1 text-sm text-ink">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`replace-old-${match.match_id}`}
                                    checked={!!match.player1_id && replaceOldId === match.player1_id}
                                    onChange={() => setReplaceOldId(match.player1_id ?? '')}
                                  />
                                  Replace {match.player1_name ?? 'TBD'}
                                </label>
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`replace-old-${match.match_id}`}
                                    checked={!!match.player2_id && replaceOldId === match.player2_id}
                                    onChange={() => setReplaceOldId(match.player2_id ?? '')}
                                  />
                                  Replace {match.player2_name ?? 'TBD'}
                                </label>
                              </div>
                              <select
                                value={replaceNewId}
                                onChange={(e) => setReplaceNewId(e.target.value)}
                                className="rounded-md border border-line px-3 py-2 text-sm"
                              >
                                <option value="">Select replacement</option>
                                {eligibleReplacements.map((p) => (
                                  <option key={p.player_id} value={p.player_id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                              <div className="flex gap-2">
                                <button onClick={() => submitReplace(match)} disabled={busy} className="rounded-md bg-accent-green px-3 py-2 text-sm font-medium text-surface disabled:opacity-50">
                                  Confirm
                                </button>
                                <button onClick={closePanel} className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {actionMessage?.matchId === match.match_id && (
                            <p className={`ml-7 text-sm ${actionMessage.error ? 'text-corner-red' : 'text-muted'}`}>{actionMessage.text}</p>
                          )}
                        </div>
                      );
                    })}
                </BracketList>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
