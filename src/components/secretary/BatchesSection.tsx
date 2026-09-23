'use client';

/**
 * Split step 2: batches section (create card + batch list, moved from
 * EventDetail). The list derives from eventMatches batch groups -- no
 * batches-table read (secretaries hold no batches SELECT by design).
 * Each batch links to its own manage page showing only its matches/players.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { secretaryApi, type SecretaryRegistration } from '@/lib/api/secretary.api';
import { SecretaryStyles } from '@/components/secretary/SecretaryStyles';

export function BatchesSection({
  eventId,
  basePath,
  canManageBatches,
}: {
  eventId: string;
  basePath: string;
  canManageBatches: boolean;
}) {
  const [regs, setRegs] = useState<SecretaryRegistration[]>([]);
  const [matches, setMatches] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [batchName, setBatchName] = useState('');
  const [batchFormat, setBatchFormat] = useState('single_elimination');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([secretaryApi.registrations(eventId), secretaryApi.eventMatches(eventId)]).then(
      ([rRes, mRes]) => {
        if (rRes.success && rRes.data) setRegs(rRes.data);
        if (mRes.success && mRes.data) setMatches(mRes.data);
        if (!rRes.success) setError(rRes.message || 'Could not load registrations');
        else if (!mRes.success) setError(mRes.message || 'Could not load matches');
        else setError(null);
        setLoading(false);
      },
    );
  }, [eventId]);

  async function createBatch() {
    const name = batchName.trim();
    const playerIds = regs.filter((r) => r.status === 'approved').map((r) => r.player_id);
    if (!name) {
      setError('Enter a batch name first.');
      return;
    }
    if (playerIds.length < 1) {
      setError('Approve at least one registration before creating a batch.');
      return;
    }
    setCreating(true);
    const res = await secretaryApi.createBatch({
      event_id: eventId,
      batch_name: name,
      player_ids: playerIds,
      tournament_format: batchFormat,
    });
    setCreating(false);
    if (res.success) {
      setBatchName('');
      setError(null);
      const mRes = await secretaryApi.eventMatches(eventId);
      if (mRes.success && mRes.data) setMatches(mRes.data);
    } else {
      setError(res.message || 'Batch creation failed');
    }
  }

  if (loading) return <p className="text-muted">Loading batches…</p>;

  const groups = new Map<string, Record<string, unknown>[]>();
  for (const m of matches) {
    const key = (m.batch_id as string) ?? 'unknown';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }
  const approvedCount = regs.filter((r) => r.status === 'approved').length;

  return (
    <div className="batches">
      {error && <p className="text-error">{error}</p>}
      <div className="card">
        <h2>Create batch</h2>
        {!canManageBatches ? (
          <p className="text-muted">Batch creation needs the manage_batches permission — ask an admin.</p>
        ) : (
          <div className="batch-create">
            <input
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="Batch name (e.g. U-14 Boys)"
              aria-label="Batch name"
            />
            <select value={batchFormat} onChange={(e) => setBatchFormat(e.target.value)} aria-label="Format">
              <option value="single_elimination">Single elimination</option>
              <option value="round_robin">Round robin</option>
              <option value="double_elimination">Double elimination</option>
            </select>
            <button onClick={createBatch} disabled={creating}>
              {creating ? 'Creating…' : 'Create batch from approved'}
            </button>
            <p className="text-muted">
              {approvedCount} approved registration{approvedCount === 1 ? '' : 's'} available. Ownership stays with the
              event organizer.
            </p>
          </div>
        )}
      </div>
      <div className="card">
        <h2>Batches ({groups.size})</h2>
        {groups.size === 0 ? (
          <p className="text-muted">No batches yet — create one above.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Batch</th>
                <th>Matches</th>
                <th>Decided</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {Array.from(groups.entries()).map(([batchId, ms]) => {
                const name = (ms[0]?.batch_name as string) || `Batch ${batchId.slice(0, 8)}`;
                const decided = ms.filter((m) => String(m.status) === 'completed').length;
                return (
                  <tr key={batchId}>
                    <td>{name}</td>
                    <td>{ms.length}</td>
                    <td>
                      {decided}/{ms.length}
                    </td>
                    <td>
                      <Link href={`${basePath}/events/${eventId}/batches/${batchId}`}>Manage →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <SecretaryStyles />
    </div>
  );
}
