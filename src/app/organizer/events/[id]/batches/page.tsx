'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { organizerApi } from '@/lib/api/organizer.api';
import { Card } from '@/lib/ui/Card';
import type { Batch, Referee } from '@/lib/types';

export default function EventBatchesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [batches, setBatches] = useState<Batch[]>([]);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const loadBatches = useCallback(async () => {
    const res = await organizerApi.eventBatches(id);
    if (res.success && res.data) {
      setBatches(res.data);
    } else {
      setError(res.message || 'Could not load batches');
    }
  }, [id]);

  useEffect(() => {
    Promise.all([organizerApi.eventBatches(id), organizerApi.referees()])
      .then(([batchesRes, refereesRes]) => {
        if (batchesRes.success && batchesRes.data) setBatches(batchesRes.data);
        else setError(batchesRes.message || 'Could not load batches');

        if (refereesRes.success && refereesRes.data) setReferees(refereesRes.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAssign(batchId: string, refereeId: string) {
    setAssigningId(batchId);
    setError(null);
    setMessage(null);
    const res = await organizerApi.assignReferee(batchId, refereeId || null);
    if (res.success) {
      setMessage('Referee updated.');
      await loadBatches();
    } else {
      setError(res.message || 'Could not update referee');
    }
    setAssigningId(null);
  }

  if (loading) return <p className="text-muted">Loading batches…</p>;

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-ink">Batches</h1>

      <div className="mb-4 flex gap-4 text-sm">
        <Link href={`/organizer/events/${id}/batches/create`} className="font-medium text-accent-green underline">
          + Create batch
        </Link>
        <Link href={`/organizer/events/${id}/batches/certificates`} className="font-medium text-accent-green underline">
          View certificates
        </Link>
      </div>

      {error && <p className="mb-3 text-corner-red">{error}</p>}
      {message && <p className="mb-3 text-muted">{message}</p>}

      {batches.length === 0 ? (
        <p className="text-sm text-muted">No batches yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {batches.map((b) => (
            <Card as="li" key={b.batch_id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-ink">{b.batch_name}</div>
                  {b.batch_label && <div className="text-sm text-muted">{b.batch_label}</div>}
                  <div className="text-xs text-muted">{b.player_count ?? 0} players</div>
                </div>
                <Link href={`/organizer/batches/${b.batch_id}/manage`} className="shrink-0 text-sm font-medium text-accent-green underline">
                  Manage
                </Link>
              </div>

              <label className="mt-3 flex flex-col gap-1 text-sm text-ink">
                Referee ({b.referee_name || 'Unassigned'})
                <select
                  value={b.referee_id ?? ''}
                  disabled={assigningId === b.batch_id}
                  onChange={(e) => handleAssign(b.batch_id, e.target.value)}
                  className="rounded-md border border-line px-3 py-2 disabled:opacity-50"
                >
                  <option value="">Unassigned</option>
                  {referees.map((r) => (
                    <option key={r.referee_id} value={r.referee_id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
