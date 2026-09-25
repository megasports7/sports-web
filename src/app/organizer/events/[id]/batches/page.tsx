'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { organizerApi } from '@/lib/api/organizer.api';
import { useOrgParam, withOrg } from '@/lib/auth/orgContext';
import { canDo, useOrganizerPermissions } from '@/lib/auth/useOrganizerPermissions';
import type { Batch, Referee } from '@/lib/types';

export default function EventBatchesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // Phase 4: preserve admin-in-organizer ?org= across drill-down links.
  const orgParam = useOrgParam();
  // Convenience-only: batches_update_owner authorizes referee assignment.
  const { perms } = useOrganizerPermissions();
  const canManageBatches = canDo(perms, 'manage_batches');

  const [batches, setBatches] = useState<Batch[]>([]);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [eventName, setEventName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  // Referee picks no longer save on change -- the dropdown alone read as
  // "did that just save or not?". Held here until Confirm is pressed, keyed
  // by batch id; falls back to the batch's own saved referee_id whenever
  // there's no pending edit for it.
  const [pendingRef, setPendingRef] = useState<Record<string, string>>({});

  // Bracket-engine short labels (M1/M3 columns arrive via select('*')).
  const FORMAT_LABELS: Record<string, string> = {
    single_elimination: 'Single elim',
    double_elimination: 'Double elim',
    round_robin: 'Round robin',
  };

  const loadBatches = useCallback(async () => {
    const res = await organizerApi.eventBatches(id);
    if (res.success && res.data) {
      setBatches(res.data);
    } else {
      setError(res.message || 'Could not load batches');
    }
  }, [id]);

  useEffect(() => {
    Promise.all([organizerApi.eventBatches(id), organizerApi.referees(), organizerApi.event(id)])
      .then(([batchesRes, refereesRes, eventRes]) => {
        if (batchesRes.success && batchesRes.data) setBatches(batchesRes.data);
        else setError(batchesRes.message || 'Could not load batches');

        if (refereesRes.success && refereesRes.data) setReferees(refereesRes.data);
        if (eventRes.success && eventRes.data) setEventName(eventRes.data.event_name);
      })
      .finally(() => setLoading(false));
  }, [id]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }

  function refereeValue(b: Batch): string {
    return pendingRef[b.batch_id] ?? (b.referee_id ?? '');
  }

  function refereeChanged(b: Batch): boolean {
    return refereeValue(b) !== (b.referee_id ?? '');
  }

  async function handleConfirmReferee(batchId: string, refereeId: string) {
    setAssigningId(batchId);
    const res = await organizerApi.assignReferee(batchId, refereeId || null);
    setAssigningId(null);
    if (res.success) {
      showToast('Referee confirmed');
      setPendingRef((prev) => {
        const next = { ...prev };
        delete next[batchId];
        return next;
      });
      await loadBatches();
    } else {
      showToast(res.message || 'Could not update referee');
    }
  }

  if (loading) return <p className="text-muted">Loading batches…</p>;
  if (error) return <p className="text-corner-red">{error}</p>;

  return (
    <div className="page">
      <div className="head-row">
        <div>
          <h1>Batches</h1>
          {eventName && <p className="event-name">{eventName}</p>}
        </div>
        <div className="head-actions">
          <Link href={withOrg(`/organizer/events/${id}/batches/certificates`, orgParam)} className="btn-secondary">
            View certificates
          </Link>
          {canManageBatches ? (
            <Link href={withOrg(`/organizer/events/${id}/batches/create`, orgParam)} className="btn-primary">
              + Create batch
            </Link>
          ) : (
            <span className="btn-primary" aria-disabled="true" title="Needs the manage_batches permission — ask an admin.">
              + Create batch
            </span>
          )}
        </div>
      </div>
      {!canManageBatches && (
        <p className="text-muted">Batch creation and referee assignment are disabled for this account — ask an admin for manage_batches.</p>
      )}

      {batches.length === 0 ? (
        <div className="empty">
          <h2>No batches yet</h2>
          <p>{canManageBatches ? 'Create a batch to start building the bracket.' : 'No batches yet.'}</p>
          {canManageBatches && (
            <Link href={withOrg(`/organizer/events/${id}/batches/create`, orgParam)} className="btn-primary">
              + Create batch
            </Link>
          )}
        </div>
      ) : (
        <div className="batches-list">
          {batches.map((b) => (
            <div className="batch-card" key={b.batch_id}>
              <div className="batch-main">
                <div className="batch-info">
                  <span className="batch-name">{b.batch_name}</span>
                  {b.batch_label && <span className="batch-cat">{b.batch_label}</span>}
                  {b.tournament_format && (
                    <span
                      className="batch-format"
                      title={b.bye_method && b.bye_method !== 'random' ? `Byes: ${b.bye_method}` : undefined}
                    >
                      {FORMAT_LABELS[b.tournament_format] ?? b.tournament_format}
                    </span>
                  )}
                </div>
                <div className="batch-count">
                  <span className="n">{b.player_count ?? 0}</span>
                  <span className="l">Players</span>
                </div>
                <Link href={withOrg(`/organizer/batches/${b.batch_id}/manage`, orgParam)} className="btn-manage">
                  Manage
                </Link>
              </div>

              <div className="batch-referee">
                <label>
                  <span className="ref-label">Referee {!b.referee_name && <em>(Unassigned)</em>}</span>
                </label>
                <div className="ref-row">
                  <select
                    value={refereeValue(b)}
                    disabled={assigningId === b.batch_id}
                    onChange={(e) => setPendingRef((prev) => ({ ...prev, [b.batch_id]: e.target.value }))}
                  >
                    <option value="">Unassigned</option>
                    {referees.map((r) => (
                      <option key={r.referee_id} value={r.referee_id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn-confirm"
                    disabled={!refereeChanged(b) || assigningId === b.batch_id || !canManageBatches}
                    title={canManageBatches ? undefined : 'Needs the manage_batches permission — ask an admin.'}
                    onClick={() => handleConfirmReferee(b.batch_id, refereeValue(b))}
                  >
                    {assigningId === b.batch_id ? 'Saving…' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .head-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .head-row h1 {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.3px;
          margin: 0;
        }
        .head-row .event-name {
          margin: 5px 0 0;
          font-size: 15px;
          color: var(--color-accent-green);
          font-weight: 700;
        }
        .head-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        :global(.btn-primary),
        :global(.btn-secondary),
        :global(.btn-manage) {
          transition: transform 0.08s ease, filter 0.1s ease, box-shadow 0.12s ease, background 0.12s ease;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        :global(.btn-primary) {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: none;
          border-radius: 13px;
          padding: 11px 20px;
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          text-decoration: none;
          background: linear-gradient(120deg, var(--color-accent-green), #00e676);
          box-shadow: 0 10px 20px -10px color-mix(in srgb, var(--color-accent-green) 55%, transparent);
        }
        :global(.btn-primary:hover) {
          filter: brightness(1.05);
          box-shadow: 0 12px 22px -8px color-mix(in srgb, var(--color-accent-green) 60%, transparent);
          transform: translateY(-1px);
        }
        :global(.btn-primary:active) {
          transform: scale(0.96) translateY(0);
          filter: brightness(0.94);
          box-shadow: 0 4px 10px -6px color-mix(in srgb, var(--color-accent-green) 50%, transparent);
          transition: transform 0.04s ease, filter 0.04s ease;
        }
        :global(.btn-secondary) {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1.5px solid var(--color-line);
          border-radius: 13px;
          padding: 11px 20px;
          font-size: 14px;
          font-weight: 700;
          color: #3a3d45;
          cursor: pointer;
          text-decoration: none;
          background: var(--color-surface);
        }
        :global(.btn-secondary:hover) {
          background: var(--color-bg);
          border-color: #c9c6bf;
        }
        :global(.btn-secondary:active) {
          transform: scale(0.96);
          background: #efece6;
          transition: transform 0.04s ease;
        }

        .batches-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .batch-card {
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 18px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -14px rgba(22, 24, 29, 0.16);
          overflow: hidden;
        }
        .batch-main {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 18px;
        }
        .batch-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .batch-name {
          font-size: 15.5px;
          font-weight: 700;
        }
        .batch-cat {
          font-size: 13px;
          color: #3a3d45;
          font-weight: 500;
        }
        .batch-format {
          align-self: flex-start;
          margin-top: 3px;
          border-radius: 999px;
          padding: 3px 9px;
          font-size: 11px;
          font-weight: 800;
          color: #3a3d45;
          background: color-mix(in srgb, var(--color-accent-green) 12%, white);
        }
        .batch-count {
          flex-shrink: 0;
          text-align: right;
        }
        .batch-count .n {
          display: block;
          font-size: 17px;
          font-weight: 800;
          font-family: var(--font-mono);
        }
        .batch-count .l {
          display: block;
          font-size: 10px;
          color: var(--color-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        :global(.btn-manage) {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          cursor: pointer;
          border: none;
          border-radius: 11px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          text-decoration: none;
          background: linear-gradient(120deg, var(--color-accent-green), #00e676);
          box-shadow: 0 6px 14px -8px color-mix(in srgb, var(--color-accent-green) 55%, transparent);
        }
        :global(.btn-manage:hover) {
          filter: brightness(1.05);
          box-shadow: 0 8px 16px -6px color-mix(in srgb, var(--color-accent-green) 60%, transparent);
          transform: translateY(-1px);
        }
        :global(.btn-manage:active) {
          transform: scale(0.94) translateY(0);
          filter: brightness(0.92);
          box-shadow: 0 2px 6px -4px color-mix(in srgb, var(--color-accent-green) 50%, transparent);
          transition: transform 0.04s ease, filter 0.04s ease;
        }

        .batch-referee {
          padding: 12px 18px 16px;
          border-top: 1px solid var(--color-line);
        }
        .batch-referee label {
          display: block;
          font-size: 12.5px;
          color: #3a3d45;
          font-weight: 600;
          margin-bottom: 6px;
        }
        .ref-label em {
          color: var(--color-muted);
          font-weight: 500;
          font-style: normal;
        }
        .ref-row {
          display: flex;
          gap: 8px;
          max-width: 380px;
          width: 100%;
        }
        .batch-referee select {
          flex: 1;
          min-width: 0;
          border: 1.5px solid var(--color-line);
          border-radius: 10px;
          padding: 8px 10px;
          font-size: 13.5px;
          font-family: inherit;
          color: var(--color-ink);
          background: var(--color-surface);
        }
        .btn-confirm {
          flex-shrink: 0;
          border: none;
          border-radius: 10px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          font-family: inherit;
          background: linear-gradient(120deg, var(--color-accent-green), #00e676);
          box-shadow: 0 4px 10px -6px color-mix(in srgb, var(--color-accent-green) 50%, transparent);
          transition: transform 0.08s ease, filter 0.1s ease;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .btn-confirm:hover:not(:disabled) {
          filter: brightness(1.05);
        }
        .btn-confirm:active:not(:disabled) {
          transform: scale(0.94);
          filter: brightness(0.92);
          transition: transform 0.04s ease;
        }
        .btn-confirm:disabled {
          background: #eeece7;
          color: #b3afa6;
          box-shadow: none;
          cursor: default;
        }

        .empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 50px 20px;
          background: var(--color-surface);
          border: 1px dashed var(--color-line);
          border-radius: 18px;
          gap: 4px;
        }
        .empty h2 {
          font-size: 16.5px;
          font-weight: 700;
          margin: 0 0 6px;
        }
        .empty p {
          font-size: 14px;
          color: #3a3d45;
          margin: 0 0 18px;
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

        @media (max-width: 640px) {
          .head-row {
            flex-direction: column;
            align-items: stretch;
          }
          .head-actions {
            flex-direction: column;
          }
          :global(.btn-primary),
          :global(.btn-secondary) {
            justify-content: center;
          }
          .batch-main {
            flex-wrap: wrap;
          }
          .batch-info {
            order: 1;
            width: 100%;
          }
          .batch-count {
            order: 2;
          }
          :global(.btn-manage) {
            order: 3;
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
