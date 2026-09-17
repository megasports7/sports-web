'use client';

import { use, useEffect, useState, useSyncExternalStore } from 'react';
import { organizerApi } from '@/lib/api/organizer.api';
import type { Registration } from '@/lib/types';
import {
  downloadAllRegistrationsWorkbook,
  downloadWeightGroupWorkbook,
  getWeightRegistrationGroups,
  type WeightRegistrationGroup,
} from '@/lib/registrationExport';

const ALL_REGISTRATIONS_EXPORT_KEY = '__all-registrations__';
const MOBILE_WEIGHT_GROUP_LIMIT = 4;
const DESKTOP_WEIGHT_GROUP_LIMIT = 6;

function subscribeToWeightGroupBreakpoint(onStoreChange: () => void) {
  const query = window.matchMedia('(max-width: 640px)');
  query.addEventListener('change', onStoreChange);
  return () => query.removeEventListener('change', onStoreChange);
}

function getWeightGroupLimit() {
  return window.matchMedia('(max-width: 640px)').matches
    ? MOBILE_WEIGHT_GROUP_LIMIT
    : DESKTOP_WEIGHT_GROUP_LIMIT;
}

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

function formatWeight(value?: number | null): string {
  return value == null ? 'Not set' : `${Number(value)} kg`;
}

function hasWeightMismatch(r: Registration): boolean {
  return r.declared_weight_kg != null
    && r.verified_weight_kg != null
    && Number(r.declared_weight_kg) !== Number(r.verified_weight_kg);
}

function WeightSummary({ r }: { r: Registration }) {
  return (
    <div className="weight-summary">
      <span>Declared: {formatWeight(r.declared_weight_kg)}</span>
      <span>Verified: {formatWeight(r.verified_weight_kg)}</span>
      {r.weight_verified_at ? (
        <span>By {r.weight_verified_by_name || 'Organizer'} · {new Date(r.weight_verified_at).toLocaleDateString()}</span>
      ) : (
        <span className="weight-pending">Awaiting verification</span>
      )}
      {hasWeightMismatch(r) && <span className="weight-mismatch">Declared and verified weights differ</span>}
    </div>
  );
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
  onVerify,
  block,
}: {
  r: Registration;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onAttend: () => void;
  onVerify: () => void;
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
      <button className="btn-verify" disabled={busy || !r.player_uuid || r.status === 'rejected'} onClick={onVerify}>
        Verify weight
      </button>
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
  const [exportingGroupKey, setExportingGroupKey] = useState<string | null>(null);
  const [showAllWeightGroups, setShowAllWeightGroups] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [weightVerificationTarget, setWeightVerificationTarget] = useState<Registration | null>(null);
  const [verifiedWeightText, setVerifiedWeightText] = useState('');
  const [weightCorrectionReason, setWeightCorrectionReason] = useState('');
  const [verifyingWeight, setVerifyingWeight] = useState(false);
  const weightGroupLimit = useSyncExternalStore(
    subscribeToWeightGroupBreakpoint,
    getWeightGroupLimit,
    () => DESKTOP_WEIGHT_GROUP_LIMIT,
  );

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
      showToast(res.message || 'Update failed');
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

  function openWeightVerification(registration: Registration) {
    if (!registration.player_uuid) {
      showToast('This registration has no player profile identifier. Refresh and try again.');
      return;
    }
    setWeightVerificationTarget(registration);
    setVerifiedWeightText(registration.verified_weight_kg?.toString() || registration.declared_weight_kg?.toString() || '');
    setWeightCorrectionReason('');
  }

  async function handleVerifyWeight() {
    if (!weightVerificationTarget?.player_uuid) return;
    const weight = Number(verifiedWeightText.trim());
    if (!Number.isFinite(weight) || weight <= 0 || weight > 500) {
      showToast('Enter a weight greater than 0 and no more than 500 kg');
      return;
    }
    const isCorrection = weightVerificationTarget.verified_weight_kg != null
      && Number(weightVerificationTarget.verified_weight_kg) !== weight;
    const correctionReason = weightCorrectionReason.trim();
    if (isCorrection && !correctionReason) {
      showToast('Enter a reason when correcting an already verified weight');
      return;
    }

    setVerifyingWeight(true);
    const res = await organizerApi.verifyPlayerWeight(
      id,
      weightVerificationTarget.player_uuid,
      weight,
      correctionReason || null,
    );
    setVerifyingWeight(false);
    if (!res.success) {
      showToast(res.message || 'Could not verify player weight');
      return;
    }
    setWeightVerificationTarget(null);
    setVerifiedWeightText('');
    setWeightCorrectionReason('');
    showToast('Weight verified and audit record saved');
    refresh();
  }

  async function handleDownloadWeightGroup(group: WeightRegistrationGroup) {
    if (exportingGroupKey) return;
    setExportingGroupKey(group.key);
    try {
      await downloadWeightGroupWorkbook(eventName || 'Event', group);
      showToast(`${group.ageCategory} · ${group.weightCategory} Excel downloaded`);
    } catch (error) {
      console.error('Weight-group export failed:', error);
      showToast('Could not create the Excel file');
    } finally {
      setExportingGroupKey(null);
    }
  }

  async function handleDownloadAllRegistrations() {
    if (exportingGroupKey) return;
    setExportingGroupKey(ALL_REGISTRATIONS_EXPORT_KEY);
    try {
      await downloadAllRegistrationsWorkbook(eventName || 'Event', registrations);
      showToast(`${registrations.length} registration${registrations.length === 1 ? '' : 's'} downloaded`);
    } catch (error) {
      console.error('All-registrations export failed:', error);
      showToast('Could not create the Excel file');
    } finally {
      setExportingGroupKey(null);
    }
  }

  if (loading) return <p className="text-muted">Loading registrations…</p>;
  if (loadError) return <p className="text-corner-red">{loadError}</p>;

  const approvedCount = registrations.filter((r) => r.status === 'approved').length;
  const pendingCount = registrations.filter((r) => r.status === 'pending' || !r.status).length;
  const rejectedCount = registrations.filter((r) => r.status === 'rejected').length;
  const weightGroups = getWeightRegistrationGroups(registrations);
  const visibleWeightGroups = showAllWeightGroups ? weightGroups : weightGroups.slice(0, weightGroupLimit);
  const hiddenWeightGroupCount = Math.max(0, weightGroups.length - weightGroupLimit);

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
          <section className="export-panel" aria-label="Download event registrations">
            <h2>Exports</h2>
            <button
              className="export-all"
              disabled={Boolean(exportingGroupKey)}
              onClick={handleDownloadAllRegistrations}
            >
              <span>
                <strong>All registrations</strong>
                <small>
                  {exportingGroupKey === ALL_REGISTRATIONS_EXPORT_KEY
                    ? 'Preparing Excel…'
                    : `${registrations.length} player${registrations.length === 1 ? '' : 's'} · Download`}
                </small>
              </span>
              <span className="download-icon" aria-hidden="true">↓</span>
            </button>
            {weightGroups.length > 0 && (
              <div className="weight-export-section">
                <div className="weight-export-heading">
                  <h3>TANDING by weight group</h3>
                  <span>{weightGroups.length} group{weightGroups.length === 1 ? '' : 's'}</span>
                </div>
                <div className="export-groups">
                  {visibleWeightGroups.map((group) => {
                    const exporting = exportingGroupKey === group.key;
                    return (
                      <button
                        key={group.key}
                        className="export-group"
                        disabled={Boolean(exportingGroupKey)}
                        onClick={() => handleDownloadWeightGroup(group)}
                      >
                        <span className="export-age">{group.ageCategory}</span>
                        <strong>{group.weightCategory}</strong>
                        <span className="export-count">{group.registrations.length} player{group.registrations.length === 1 ? '' : 's'}</span>
                        <span className="export-download">{exporting ? 'Preparing Excel…' : 'Download ↓'}</span>
                      </button>
                    );
                  })}
                </div>
                {(hiddenWeightGroupCount > 0 || showAllWeightGroups) && (
                  <button
                    className="export-toggle"
                    onClick={() => setShowAllWeightGroups((expanded) => !expanded)}
                    aria-expanded={showAllWeightGroups}
                  >
                    {showAllWeightGroups ? 'Show fewer weight groups' : `Show all ${weightGroups.length} weight groups`}
                  </button>
                )}
              </div>
            )}
          </section>

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
                        <WeightSummary r={r} />
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
                          onVerify={() => openWeightVerification(r)}
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
                  <WeightSummary r={r} />
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
                    onVerify={() => openWeightVerification(r)}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}

      {toast && <div className="toast">{toast}</div>}

      {weightVerificationTarget && (
        <div className="weight-dialog-backdrop" role="presentation">
          <section className="weight-dialog" role="dialog" aria-modal="true" aria-labelledby="weight-dialog-title">
            <h2 id="weight-dialog-title">Verify player weight</h2>
            <p className="weight-dialog-player">{weightVerificationTarget.player_name || 'Player'}</p>
            <p>Declared: {formatWeight(weightVerificationTarget.declared_weight_kg)}</p>
            <p>Last verified: {formatWeight(weightVerificationTarget.verified_weight_kg)}</p>
            <label htmlFor="verified-weight-input">Measured weight (kg)</label>
            <input
              id="verified-weight-input"
              type="number"
              min="0.01"
              max="500"
              step="0.01"
              inputMode="decimal"
              autoFocus
              value={verifiedWeightText}
              onChange={(event) => setVerifiedWeightText(event.target.value)}
              disabled={verifyingWeight}
            />
            {weightVerificationTarget.verified_weight_kg != null
              && Number(weightVerificationTarget.verified_weight_kg) !== Number(verifiedWeightText) && (
              <>
                <label htmlFor="weight-correction-reason">Reason for correction</label>
                <textarea
                  id="weight-correction-reason"
                  value={weightCorrectionReason}
                  onChange={(event) => setWeightCorrectionReason(event.target.value)}
                  placeholder="Required when changing an existing verified weight"
                  disabled={verifyingWeight}
                  maxLength={500}
                />
              </>
            )}
            <p className="weight-dialog-hint">Saving updates the player&apos;s latest verified weight and writes an immutable audit record tied to this event.</p>
            <div className="weight-dialog-actions">
              <button disabled={verifyingWeight} onClick={() => setWeightVerificationTarget(null)}>Cancel</button>
              <button className="confirm" disabled={verifyingWeight} onClick={handleVerifyWeight}>
                {verifyingWeight ? 'Saving…' : 'Save verified weight'}
              </button>
            </div>
          </section>
        </div>
      )}

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

        .export-panel {
          padding: 16px;
          border: 1px solid var(--color-line);
          border-radius: 12px;
          background: var(--color-surface);
        }
        .export-panel h2 {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: -0.2px;
        }
        .export-all {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-top: 12px;
          padding: 12px 14px;
          border: 1px solid var(--color-accent-green);
          border-radius: 9px;
          background: var(--color-accent-green);
          color: #fff;
          font-family: inherit;
          text-align: left;
          cursor: pointer;
          box-shadow: 0 4px 10px -7px color-mix(in srgb, var(--color-accent-green) 88%, transparent);
          transition: transform 0.08s ease, filter 0.12s ease;
        }
        .export-all:not(:disabled):hover {
          filter: brightness(0.95);
          transform: translateY(-1px);
        }
        .export-all:not(:disabled):active {
          transform: scale(0.98);
        }
        .export-all:disabled {
          opacity: 0.58;
          cursor: default;
        }
        .export-all strong {
          display: block;
          font-size: 14px;
        }
        .export-all small {
          display: block;
          margin-top: 2px;
          font-size: 11px;
          font-weight: 600;
          opacity: 0.88;
        }
        .download-icon {
          flex-shrink: 0;
          font-size: 20px;
          font-weight: 700;
        }
        .weight-export-section {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--color-line);
        }
        .weight-export-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .weight-export-heading h3 {
          margin: 0;
          font-size: 12px;
          font-weight: 700;
        }
        .weight-export-heading > span {
          color: var(--color-muted);
          font-size: 11px;
          font-weight: 600;
        }
        .export-groups {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 9px;
          margin-top: 12px;
        }
        .export-group {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          min-height: 112px;
          padding: 12px;
          border: 1px solid var(--color-line);
          border-radius: 9px;
          background: var(--color-surface);
          color: var(--color-ink);
          font-family: inherit;
          text-align: left;
          cursor: pointer;
          transition: transform 0.08s ease, box-shadow 0.12s ease, border-color 0.12s ease;
        }
        .export-group:not(:disabled):hover {
          transform: translateY(-1px);
          border-color: var(--color-accent-green);
          box-shadow: 0 5px 12px -8px color-mix(in srgb, var(--color-accent-green) 70%, transparent);
        }
        .export-group:not(:disabled):active {
          transform: scale(0.97);
        }
        .export-group:disabled {
          opacity: 0.58;
          cursor: default;
        }
        .export-group strong {
          margin-top: 4px;
          font-size: 14px;
        }
        .export-count {
          margin-top: auto;
          padding-top: 12px;
          color: var(--color-muted);
          font-size: 11px;
          font-weight: 600;
        }
        .export-download {
          margin-top: 4px;
          color: var(--color-accent-green);
          font-size: 11px;
          font-weight: 700;
        }
        .export-age {
          color: var(--color-muted);
          font-size: 11px;
          font-weight: 600;
        }
        .export-toggle {
          margin-top: 12px;
          padding: 0;
          border: 0;
          background: none;
          color: var(--color-accent-green);
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
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
        .weight-summary {
          display: flex;
          flex-wrap: wrap;
          gap: 3px 8px;
          margin-top: 6px;
          color: var(--color-muted);
          font-size: 11px;
          line-height: 1.35;
        }
        .weight-summary span:not(:last-child)::after {
          content: '·';
          margin-left: 8px;
          color: #c9c6bf;
        }
        .weight-summary .weight-pending {
          color: #9a6700;
          font-weight: 700;
        }
        .weight-summary .weight-mismatch {
          color: #b42318;
          font-weight: 700;
          flex-basis: 100%;
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
        :global(.btn-verify) {
          background: #c7b8eb;
          color: #493270;
          border-color: #a58bd7;
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
        .weight-dialog-backdrop {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(22, 24, 29, 0.48);
        }
        .weight-dialog {
          width: min(100%, 420px);
          border-radius: 18px;
          padding: 22px;
          background: var(--color-surface);
          box-shadow: 0 24px 60px -20px rgba(0, 0, 0, 0.48);
        }
        .weight-dialog h2 {
          margin: 0;
          color: var(--color-ink);
          font-size: 19px;
          font-weight: 800;
        }
        .weight-dialog p {
          margin: 7px 0 0;
          color: var(--color-muted);
          font-size: 12.5px;
          line-height: 1.45;
        }
        .weight-dialog .weight-dialog-player {
          color: var(--color-accent-green);
          font-weight: 800;
        }
        .weight-dialog label {
          display: block;
          margin-top: 18px;
          color: #3a3d45;
          font-size: 12.5px;
          font-weight: 700;
        }
        .weight-dialog input {
          box-sizing: border-box;
          width: 100%;
          margin-top: 7px;
          padding: 10px 11px;
          border: 1.5px solid var(--color-line);
          border-radius: 10px;
          color: var(--color-ink);
          font: inherit;
          font-weight: 600;
        }
        .weight-dialog input:focus {
          outline: none;
          border-color: var(--color-accent-green);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent-green) 14%, transparent);
        }
        .weight-dialog textarea {
          box-sizing: border-box;
          width: 100%;
          min-height: 80px;
          margin-top: 7px;
          padding: 10px 11px;
          resize: vertical;
          border: 1.5px solid var(--color-line);
          border-radius: 9px;
          color: var(--color-ink);
          font: inherit;
        }
        .weight-dialog textarea:focus {
          outline: none;
          border-color: var(--color-accent-green);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent-green) 14%, transparent);
        }
        .weight-dialog .weight-dialog-hint {
          font-size: 11.5px;
        }
        .weight-dialog-actions {
          display: flex;
          gap: 10px;
          margin-top: 18px;
        }
        .weight-dialog-actions button {
          flex: 1;
          border: 1.5px solid var(--color-line);
          border-radius: 10px;
          padding: 10px 12px;
          background: var(--color-surface);
          color: #3a3d45;
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          font-weight: 700;
        }
        .weight-dialog-actions button.confirm {
          flex: 1.7;
          border-color: var(--color-accent-green);
          background: var(--color-accent-green);
          color: #fff;
        }
        .weight-dialog-actions button:disabled {
          cursor: default;
          opacity: 0.6;
        }

        @media (max-width: 640px) {
          .export-panel {
            padding: 16px;
          }
          .export-groups {
            grid-template-columns: 1fr;
          }
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
