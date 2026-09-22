'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { organizerApi } from '@/lib/api/organizer.api';
import { useOrgParam, withOrg } from '@/lib/auth/orgContext';
import type { GeoDistrict, GeoState } from '@/lib/types';

export default function NewEventPage() {
  // Phase 4: preserve admin-in-organizer ?org= when returning to the list.
  const orgParam = useOrgParam();
  const router = useRouter();
  const [eventName, setEventName] = useState('');
  const [venue, setVenue] = useState('');
  // <input type="date"> instead of the mobile app's free-text date field --
  // a genuine, deliberate improvement (native date picker, guaranteed
  // ISO-format value), not a silent behavior change.
  const [eventDate, setEventDate] = useState('');
  const [description, setDescription] = useState('');
  const [bannerFile, setBannerFile] = useState<File | undefined>(undefined);
  // Step 8a: event location from canonical master data -- where the event
  // HAPPENS, not the organizer's home (cross-state organizing is legitimate,
  // so every state/district is selectable). Drives secretary scoping
  // downstream; FK integrity rejects anything outside master data.
  const [states, setStates] = useState<GeoState[]>([]);
  const [districts, setDistricts] = useState<GeoDistrict[]>([]);
  const [stateId, setStateId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    organizerApi.geoStates().then((res) => {
      if (res.success && res.data) setStates(res.data);
      else setError(res.message || 'Could not load states');
    });
  }, []);

  // District fetch lives in the select handler (not an effect) per the
  // repo's react-hooks/set-state-in-effect rule.
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

    if (!eventName.trim()) {
      setValidationError('Event name is required.');
      return;
    }
    if (!stateId || !districtId) {
      setValidationError('Select the state and district where the event takes place.');
      return;
    }
    setValidationError(null);

    setSubmitting(true);
    const res = await organizerApi.createEvent({
      event_name: eventName.trim(),
      venue: venue.trim() || undefined,
      event_date: eventDate || undefined,
      description: description.trim() || undefined,
      banner_image_file: bannerFile,
      state_id: stateId,
      district_id: districtId,
    });
    setSubmitting(false);

    if (res.success) {
      router.push(withOrg('/organizer/events', orgParam));
    } else {
      setError(res.message || 'Could not create event');
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-ink">New Event</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-md border border-line bg-surface p-4">
        <label className="flex flex-col gap-1 text-sm text-ink">
          Event name
          <input
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            className="rounded-md border border-line px-3 py-2"
          />
        </label>
        {validationError && <p className="text-corner-red">{validationError}</p>}

        <label className="flex flex-col gap-1 text-sm text-ink">
          Venue
          <input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
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

        <label className="flex flex-col gap-1 text-sm text-ink">
          Banner image
          <input type="file" accept="image/*" onChange={(e) => setBannerFile(e.target.files?.[0])} className="text-sm" />
        </label>

        {error && <p className="text-corner-red">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-accent-green px-3 py-2 text-sm font-medium text-surface disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create event'}
        </button>
      </form>
    </div>
  );
}
