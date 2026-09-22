'use client';

/**
 * Step 8b: event settings -- correction path for details + canonical
 * geography. Same State -> District dropdowns as creation, preloaded from
 * the event's current FKs. Doubles as the deliberate backfill tool for
 * pre-geo events: every assignment is an explicit organizer/admin decision
 * (admins reach this via ?org=), never a script. Owner-scoped through
 * organizerApi.updateEvent (eq organizer_id + RLS).
 */
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { organizerApi } from '@/lib/api/organizer.api';
import { useOrgParam, withOrg } from '@/lib/auth/orgContext';
import type { GeoDistrict, GeoState } from '@/lib/types';

export default function EventSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const orgParam = useOrgParam();
  const router = useRouter();

  const [eventName, setEventName] = useState('');
  const [venue, setVenue] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [description, setDescription] = useState('');
  const [states, setStates] = useState<GeoState[]>([]);
  const [districts, setDistricts] = useState<GeoDistrict[]>([]);
  const [stateId, setStateId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([organizerApi.event(id), organizerApi.geoStates()]).then(([eRes, sRes]) => {
      if (sRes.success && sRes.data) setStates(sRes.data);
      if (!eRes.success || !eRes.data) {
        setError(eRes.message || 'Event not found');
        setLoading(false);
        return;
      }
      const e = eRes.data;
      setEventName(e.event_name ?? '');
      setVenue((e.location as string) ?? e.venue ?? '');
      setEventDate((e.event_date ?? '').slice(0, 10));
      setDescription(e.description ?? '');
      const sid = (e.state_id as string | null) ?? '';
      const did = (e.district_id as string | null) ?? '';
      setStateId(sid);
      setDistrictId(did);
      if (sid) {
        organizerApi.geoDistricts(sid).then((dRes) => {
          if (dRes.success && dRes.data) setDistricts(dRes.data);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, [id]);

  async function handleStateChange(nextStateId: string) {
    setStateId(nextStateId);
    setDistrictId('');
    if (!nextStateId) {
      setDistricts([]);
      return;
    }
    const res = await organizerApi.geoDistricts(nextStateId);
    if (res.success && res.data) setDistricts(res.data);
    else setError(res.message || 'Could not load districts');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!eventName.trim()) {
      setError('Event name is required.');
      return;
    }
    if (!stateId || !districtId) {
      setError('Select the state and district where the event takes place.');
      return;
    }
    setSaving(true);
    const res = await organizerApi.updateEvent(id, {
      event_name: eventName.trim(),
      venue: venue.trim(),
      event_date: eventDate || null,
      description: description.trim() || null,
      state_id: stateId,
      district_id: districtId,
    });
    setSaving(false);
    if (res.success) {
      setMessage('Saved. Secretaries of this jurisdiction can now see this event.');
    } else {
      setError(res.message || 'Could not save event');
    }
  }

  if (loading) return <p className="text-muted">Loading event…</p>;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => router.push(withOrg('/organizer/events', orgParam))} className="back-link">
          ← Events
        </button>
        <h1 className="text-lg font-bold text-ink">Event settings</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-md border border-line bg-surface p-4">
        <label className="flex flex-col gap-1 text-sm text-ink">
          Event name
          <input
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            className="rounded-md border border-line px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink">
          Venue
          <input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="rounded-md border border-line px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink">
          Event date
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="rounded-md border border-line px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="rounded-md border border-line px-3 py-2"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm text-ink">
            Event state
            <select
              value={stateId}
              onChange={(e) => handleStateChange(e.target.value)}
              className="rounded-md border border-line px-3 py-2"
            >
              <option value="">Select state…</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink">
            Event district
            <select
              value={districtId}
              onChange={(e) => setDistrictId(e.target.value)}
              disabled={!stateId}
              className="rounded-md border border-line px-3 py-2 disabled:opacity-50"
            >
              <option value="">{stateId ? 'Select district…' : 'Select a state first'}</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="text-corner-red">{error}</p>}
        {message && <p className="text-sm font-medium text-green-700">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-accent-green px-3 py-2 text-sm font-medium text-surface disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>

      <style jsx>{`
        .back-link {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-muted);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }
      `}</style>
    </div>
  );
}
