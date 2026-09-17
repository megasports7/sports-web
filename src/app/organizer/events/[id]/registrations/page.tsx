'use client';

import { use, useEffect, useState } from 'react';
import { organizerApi } from '@/lib/api/organizer.api';
import type { Registration } from '@/lib/types';

/** TANDING rows carry event_category ('TANDING') + age_category +
 *  weight_category; SENI rows carry event_category ('SENI') + seni_category
 *  instead (see player/events/[id]/register/page.tsx, the source of these
 *  field values). */
function categoryLabel(r: Registration): string {
  if (r.event_category === 'SENI') {
    return r.seni_category || r.event_category || '-';
  }
  return [r.event_category, r.age_category, r.weight_category].filter(Boolean).join(' · ') || '-';
}

function StatusPill({ status }: { status: string }) {
  return <span className={`pill pill-${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

function Actions({
  r,
  busy,
  onApprove,
  onReject,
  onAttend,
  block,
}: {
  r: Registration;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onAttend: () => void;
  block?: boolean;
}) {
  return (
    <div className={`actions ${block ? 'actions-block' : ''}`}>
      <button className="btn-approve" disabled={busy || r.status === 'approved'} onClick={onApprove}>
        Approve
      </button>
      <button className="btn-reject" disabled={busy || r.status === 'rejected'} onClick={onReject}>
        Reject
      </button>
      {r.attendance_status !== 'present' && (
        <button className="btn-attend" disabled={busy} onClick={onAttend}>
          Mark attendance
        </button>
      )}
    </div>
  );
}

export default function OrganizerEventRegistrationsPage({ params }: { params: Promise<{ id: string }> }) {
  // id is the event's real uuid (the URL path param) -- NOT a number. Passed
  // through as a plain string end to end, per the Number(event_id)-on-a-uuid
  // bug already found elsewhere in this app.
  const { id } = use(params);

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [eventName, setEventName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<Registration | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overriding, setOverriding] = useState(false);

  async function refresh() {
    const res = await organizerApi.registrations(id);
    if (res.success && res.data) {
      setRegistrations(res.data);
      setLoadError(null);
    } else {
      setLoadError(res.message || 'Could not load registrations');
    }
  }

  // Inlined directly (not via refresh()) for the same react-hooks/
  // set-state-in-effect reason as lists/create/page.tsx -- refresh() stays
  // available for post-action refetches from event handlers. The event-name
  // lookup rides along in the same Promise.all rather than a second effect.
  useEffect(() => {
    Promise.all([organizerApi.registrations(id), organizerApi.event(id)])
      .then(([regsRes, eventRes]) => {
        if (regsRes.success && regsRes.data) {
          setRegistrations(regsRes.data);
          setLoadError(null);
        } else {
          setLoadError(regsRes.message || 'Could not load registrations');
        }
        if (eventRes.success && eventRes.data) setEventName(eventRes.data.event_name);
      })
      .finally(() => setLoading(false));
  }, [id]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }

  async function handleStatus(registrationId: string, status: 'approved' | 'rejected') {
    setBusyId(registrationId);
    const res = await organizerApi.updateRegistrationStatus(registrationId, status, id);
    setBusyId(null);
    if (res.success) {
      showToast(status === 'approved' ? 'Registration approved' : 'Registration rejected');
      refresh();
    } else {
      const msg = res.message || 'Update failed';
      // Phase 6: ineligible/pending requires override with reason
      if (status === 'approved' && /without override/i.test(msg)) {
        const reg = registrations.find((r) => r.registration_id === registrationId) || null;
        setOverrideTarget(reg);
        setOverrideReason('');
      }
      showToast(msg);
    }
  }

  async function handleOverride() {
    if (!overrideTarget) return;
    if (!overrideReason.trim()) {
      showToast('Override reason is required');
      return;
    }
    setOverriding(true);
    const res = await organizerApi.reviewRegistration(overrideTarget.registration_id, 'overridden', overrideReason.trim());
    setOverriding(false);
    if (res.success) {
      showToast('Registration overridden and approved');
      setOverrideTarget(null);
      setOverrideReason('');
      refresh();
    } else {
      showToast(res.message || 'Override failed');
    }
  }

  async function handleAttendance(registrationId: string) {
    setBusyId(registrationId);
    const res = await organizerApi.markAttendance(registrationId, id);
    setBusyId(null);
    if (res.success) {
      showToast('Attendance marked');
      refresh();
    } else {
      showToast(res.message || 'Could not mark attendance');
    }
  }

  if (loading) return <p className="text-muted">Loading registrations…</p>;
  if (loadError) return <p className="text-corner-red">{loadError}</p>;

  const approvedCount = registrations.filter((r) => r.status === 'approved').length;
  const pendingCount = registrations.filter((r) => r.status === 'pending' || !r.status).length;
  const rejectedCount = registrations.filter((r) => r.status === 'rejected').length;

  return (
    <div className="page">
      <div className="head">
        <h1>Registrations</h1>
        {eventName && <p className="event-name">{eventName}</p>}
        {registrations.length > 0 && (
          <p className="summary">
            {registrations.length} total · {approvedCount} approved · {pendingCount} pending · {rejectedCount} rejected
          </p>
        )}
      </div>

      {registrations.length === 0 ? (
        <p className="text-muted">No registrations yet.</p>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <colgroup>
                <col className="c-player" />
                <col className="c-cat" />
                <col className="c-status" />
                <col className="c-attend" />
                <col className="c-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Attendance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r) => {
                  const busy = busyId === r.registration_id;
                  return (
                    <tr key={r.registration_id}>
                      <td>
                        <div className="p-name">{r.player_name || 'Unknown'}</div>
                        {r.email && <div className="p-email">{r.email}</div>}
                      </td>
                      <td className="cat">{categoryLabel(r)}</td>
                      <td>
                        <StatusPill status={r.status || 'pending'} />
                      </td>
                      <td>{r.attendance_status === 'present' ? <StatusPill status="present" /> : <span className="dash">—</span>}</td>
                      <td>
                        <Actions
                          r={r}
                          busy={busy}
                          onApprove={() => handleStatus(r.registration_id, 'approved')}
                          onReject={() => handleStatus(r.registration_id, 'rejected')}
                          onAttend={() => handleAttendance(r.registration_id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="reg-cards">
            {registrations.map((r) => {
              const busy = busyId === r.registration_id;
              return (
                <div className="reg-card" key={r.registration_id}>
                  <div className="p-name">{r.player_name || 'Unknown'}</div>
                  {r.email && <div className="p-email">{r.email}</div>}
                  <div className="reg-card-meta">
                    <span className="cat">{categoryLabel(r)}</span>
                    <span className="pill-row">
                      <StatusPill status={r.status || 'pending'} />
                      {r.attendance_status === 'present' && <StatusPill status="present" />}
                    </span>
                  </div>
                  <Actions
                    r={r}
                    busy={busy}
                    block
                    onApprove={() => handleStatus(r.registration_id, 'approved')}
                    onReject={() => handleStatus(r.registration_id, 'rejected')}
                    onAttend={() => handleAttendance(r.registration_id)}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}

      {overrideTarget && (
        <div className="override-backdrop" onClick={() => setOverrideTarget(null)}>
          <div className="override-card" onClick={(e) => e.stopPropagation()}>
            <h3>Override eligibility</h3>
            <p className="override-player">
              {overrideTarget.player_name || 'Unknown'} — {categoryLabel(overrideTarget)}
            </p>
            <p className="override-note">This registration is ineligible or pending weight verification. Provide a reason to override and approve.</p>
            <textarea
              placeholder="Reason for override (required)"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              rows={3}
            />
            <div className="override-actions">
              <button className="btn-reject" onClick={() => setOverrideTarget(null)} disabled={overriding}>
                Cancel
              </button>
              <button className="btn-approve" onClick={handleOverride} disabled={overriding || !overrideReason.trim()}>
                {overriding ? 'Overriding…' : 'Confirm override'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .head h1 {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.3px;
          margin: 0;
        }
        .head .event-name {
          margin: 5px 0 0;
          font-size: 15px;
          color: var(--color-accent-green);
          font-weight: 700;
        }
        .head .summary {
          margin: 4px 0 0;
          font-size: 13px;
          color: #3a3d45;
        }

        .table-wrap {
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 18px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -14px rgba(22, 24, 29, 0.16);
          overflow: hidden;
        }
        table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          font-size: 13.5px;
        }
        col.c-player {
          width: 26%;
        }
        col.c-cat {
          width: 23%;
        }
        col.c-status {
          width: 12%;
        }
        col.c-attend {
          width: 12%;
        }
        col.c-actions {
          width: 27%;
        }
        thead th {
          text-align: left;
          font-size: 11.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          color: var(--color-muted);
          padding: 14px 18px;
          border-bottom: 1px solid var(--color-line);
        }
        tbody td {
          padding: 13px 18px;
          border-bottom: 1px solid var(--color-line);
          vertical-align: middle;
          overflow-wrap: anywhere;
        }
        tbody tr:last-child td {
          border-bottom: none;
        }
        tbody tr:hover {
          background: color-mix(in srgb, var(--color-accent-green) 3%, transparent);
        }
        .p-name {
          font-weight: 700;
          font-size: 14px;
        }
        .p-email {
          font-size: 12px;
          color: var(--color-muted);
          margin-top: 1px;
        }
        .cat {
          color: #3a3d45;
          font-weight: 500;
          font-size: 13px;
        }
        .dash {
          color: #c9c6bf;
        }

        :global(.pill) {
          display: inline-block;
          font-size: 11.5px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 999px;
          white-space: nowrap;
        }
        :global(.pill-approved) {
          background: color-mix(in srgb, var(--color-accent-green) 14%, transparent);
          color: #0a7a3d;
        }
        :global(.pill-pending) {
          background: color-mix(in srgb, var(--color-status-pending) 18%, transparent);
          color: #8a6a10;
        }
        :global(.pill-rejected) {
          background: color-mix(in srgb, var(--color-corner-red) 13%, transparent);
          color: #c23f26;
        }
        :global(.pill-present) {
          background: color-mix(in srgb, var(--color-accent-blue) 14%, transparent);
          color: #0072b0;
        }

        /* Buttons: solid-bordered, medium-light fills clearly deeper/richer
           than the pale status pills above (not the same tint at a
           glance), squarer corners than the pills' full capsule shape, a
           real shadow, and a scale-down + darken on press so both mouse
           clicks and phone taps get a genuine "something happened" moment. */
        :global(.actions) {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          max-width: 100%;
        }
        :global(.actions button) {
          border-radius: 9px;
          padding: 8px 14px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          border: 1.5px solid transparent;
          box-shadow: 0 1px 3px rgba(22, 24, 29, 0.12);
          transition: transform 0.08s ease, filter 0.1s ease, box-shadow 0.12s ease;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        :global(.btn-approve) {
          background: #7dcb9a;
          color: #0f5c33;
          border-color: #4fae73;
        }
        :global(.btn-reject) {
          background: #f3a688;
          color: #8a3018;
          border-color: #e8845e;
        }
        :global(.btn-attend) {
          background: #7fb8e0;
          color: #0d4a73;
          border-color: #4e96c9;
        }
        :global(.actions button:not(:disabled):hover) {
          filter: brightness(0.97);
          box-shadow: 0 3px 7px -2px rgba(22, 24, 29, 0.18);
          transform: translateY(-1px);
        }
        :global(.actions button:not(:disabled):active) {
          transform: scale(0.94) translateY(0);
          filter: brightness(0.93);
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.1);
          transition: transform 0.04s ease, filter 0.04s ease;
        }
        :global(.actions button:disabled) {
          background: #eeece7;
          color: #b3afa6;
          border-color: #eeece7;
          box-shadow: none;
          cursor: default;
        }

        .reg-cards {
          display: none;
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

        .override-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 60;
          padding: 16px;
        }
        .override-card {
          background: var(--color-surface);
          border-radius: 16px;
          padding: 20px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 12px 32px -12px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .override-card h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
        }
        .override-player {
          font-size: 13px;
          color: #3a3d45;
          margin: 0;
        }
        .override-note {
          font-size: 12px;
          color: var(--color-muted);
          margin: 0;
        }
        .override-card textarea {
          width: 100%;
          border: 1.5px solid var(--color-line);
          border-radius: 10px;
          padding: 10px;
          font-family: inherit;
          font-size: 13px;
          resize: vertical;
        }
        .override-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        @media (max-width: 640px) {
          .table-wrap {
            display: none;
          }
          .reg-cards {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .reg-card {
            background: var(--color-surface);
            border: 1px solid rgba(22, 24, 29, 0.05);
            border-radius: 16px;
            padding: 14px 16px;
            box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -14px rgba(22, 24, 29, 0.16);
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .reg-card-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            flex-wrap: wrap;
          }
          .pill-row {
            display: flex;
            gap: 6px;
          }
          :global(.actions-block) {
            flex-direction: column;
          }
          :global(.actions-block button) {
            width: 100%;
            padding: 10px;
          }
        }
      `}</style>
    </div>
  );
}
