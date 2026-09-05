'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { organizerApi } from '@/lib/api/organizer.api';
import { Card } from '@/lib/ui/Card';
import type { AttendanceList } from '@/lib/types';

const MODES = ['Enter', 'Leave', 'Lunch', 'Other'];

export default function CreateAttendanceListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [purpose, setPurpose] = useState('');
  const [mode, setMode] = useState(MODES[0]);
  const [uniqueOnly, setUniqueOnly] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [lists, setLists] = useState<AttendanceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  async function refreshLists() {
    const res = await organizerApi.getAttendanceLists(id);
    if (res.success && res.data) {
      setLists(res.data);
      setListError(null);
    } else {
      setListError(res.message || 'Could not load past lists');
    }
  }

  // Inlined directly (not via refreshLists()) -- calling a locally-defined
  // function that itself sets state from inside an effect body trips
  // react-hooks/set-state-in-effect; every other page in this app that
  // passes lint does its initial fetch inline like this, reserving the
  // named helper for post-submit refreshes triggered from event handlers.
  useEffect(() => {
    organizerApi
      .getAttendanceLists(id)
      .then((res) => {
        if (res.success && res.data) {
          setLists(res.data);
          setListError(null);
        } else {
          setListError(res.message || 'Could not load past lists');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!purpose.trim()) {
      setError('Purpose is required.');
      return;
    }

    setSubmitting(true);
    const res = await organizerApi.createAttendanceList({
      event_id: id,
      purpose: purpose.trim(),
      mode,
      unique_only: uniqueOnly,
    });
    setSubmitting(false);

    if (res.success) {
      setMessage('Attendance list created.');
      setPurpose('');
      setMode(MODES[0]);
      setUniqueOnly(true);
      refreshLists();
    } else {
      setError(res.message || 'Could not create attendance list');
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-ink">Create Attendance List</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-md border border-line bg-surface p-4">
        <label className="flex flex-col gap-1 text-sm text-ink">
          Purpose
          <input value={purpose} onChange={(e) => setPurpose(e.target.value)} className="rounded-md border border-line px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink">
          Mode
          <select value={mode} onChange={(e) => setMode(e.target.value)} className="rounded-md border border-line px-3 py-2">
            {MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={uniqueOnly} onChange={(e) => setUniqueOnly(e.target.checked)} />
          Unique scan per player
        </label>

        {error && <p className="text-corner-red">{error}</p>}
        {message && <p className="text-muted">{message}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-accent-green px-3 py-2 text-sm font-medium text-surface disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create list'}
        </button>
      </form>

      <h2 className="mb-3 mt-6 text-sm font-semibold text-muted">Past lists</h2>

      {loading ? (
        <p className="text-muted">Loading lists…</p>
      ) : (
        <>
          {listError && <p className="mb-3 text-corner-red">{listError}</p>}

          {lists.length === 0 ? (
            <p className="text-sm text-muted">No attendance lists yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {lists.map((l) => (
                <Card as="li" key={l.list_id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-ink">{l.purpose}</div>
                      <div className="text-sm text-muted">{l.mode}</div>
                      <div className="mt-1 text-xs font-medium text-muted">{l.scan_count ?? 0} scans</div>
                      {l.created_at && <div className="text-xs text-muted">{new Date(l.created_at).toLocaleDateString()}</div>}
                    </div>
                    <Link href={`/organizer/lists/${l.list_id}/scan`} className="shrink-0 rounded-md bg-accent-green px-3 py-1.5 text-xs font-semibold text-surface">
                      Scan
                    </Link>
                  </div>
                </Card>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
