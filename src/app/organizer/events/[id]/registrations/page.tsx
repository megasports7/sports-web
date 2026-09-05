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

function statusBadgeClass(status?: string): string {
  if (status === 'approved') return 'bg-green-100 text-green-700';
  if (status === 'rejected') return 'bg-red-100 text-red-700';
  return 'bg-amber-100 text-amber-700';
}

export default function OrganizerEventRegistrationsPage({ params }: { params: Promise<{ id: string }> }) {
  // id is the event's real uuid (the URL path param) -- NOT a number. Passed
  // through as a plain string end to end, per the Number(event_id)-on-a-uuid
  // bug already found elsewhere in this app.
  const { id } = use(params);

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

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
  // available for post-action refetches from event handlers.
  useEffect(() => {
    organizerApi
      .registrations(id)
      .then((res) => {
        if (res.success && res.data) {
          setRegistrations(res.data);
          setLoadError(null);
        } else {
          setLoadError(res.message || 'Could not load registrations');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStatus(registrationId: string, status: 'approved' | 'rejected') {
    setBusyId(registrationId);
    setActionMessage(null);
    const res = await organizerApi.updateRegistrationStatus(registrationId, status, id);
    setBusyId(null);
    if (res.success) {
      setActionMessage(status === 'approved' ? 'Registration approved.' : 'Registration rejected.');
      refresh();
    } else {
      setActionMessage(res.message || 'Update failed');
    }
  }

  async function handleAttendance(registrationId: string) {
    setBusyId(registrationId);
    setActionMessage(null);
    const res = await organizerApi.markAttendance(registrationId, id);
    setBusyId(null);
    if (res.success) {
      setActionMessage('Attendance marked.');
      refresh();
    } else {
      setActionMessage(res.message || 'Could not mark attendance');
    }
  }

  if (loading) return <p className="text-gray-500">Loading registrations…</p>;
  if (loadError) return <p className="text-red-600">{loadError}</p>;

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold">Registrations</h1>

      {actionMessage && <p className="mb-3 text-sm text-gray-600">{actionMessage}</p>}

      {registrations.length === 0 ? (
        <p className="text-sm text-gray-500">No registrations yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="px-4 py-2 font-medium">Player</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Attendance</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => {
                const busy = busyId === r.registration_id;
                return (
                  <tr key={r.registration_id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2">
                      <div className="font-medium">{r.player_name || 'Unknown'}</div>
                      {r.email && <div className="text-xs text-gray-400">{r.email}</div>}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{categoryLabel(r)}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(r.status)}`}>
                        {r.status || 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {r.attendance_status === 'present' && (
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                          present
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleStatus(r.registration_id, 'approved')}
                          disabled={busy || r.status === 'approved'}
                          className="rounded-lg border px-2 py-1 text-xs font-medium disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatus(r.registration_id, 'rejected')}
                          disabled={busy || r.status === 'rejected'}
                          className="rounded-lg border px-2 py-1 text-xs font-medium disabled:opacity-50"
                        >
                          Reject
                        </button>
                        {r.attendance_status !== 'present' && (
                          <button
                            onClick={() => handleAttendance(r.registration_id)}
                            disabled={busy}
                            className="rounded-lg border px-2 py-1 text-xs font-medium disabled:opacity-50"
                          >
                            Mark attendance
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
