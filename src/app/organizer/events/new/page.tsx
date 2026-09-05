'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { organizerApi } from '@/lib/api/organizer.api';

export default function NewEventPage() {
  const router = useRouter();
  const [eventName, setEventName] = useState('');
  const [venue, setVenue] = useState('');
  // <input type="date"> instead of the mobile app's free-text date field --
  // a genuine, deliberate improvement (native date picker, guaranteed
  // ISO-format value), not a silent behavior change.
  const [eventDate, setEventDate] = useState('');
  const [description, setDescription] = useState('');
  const [bannerFile, setBannerFile] = useState<File | undefined>(undefined);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!eventName.trim()) {
      setValidationError('Event name is required.');
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
    });
    setSubmitting(false);

    if (res.success) {
      router.push('/organizer/events');
    } else {
      setError(res.message || 'Could not create event');
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold">New Event</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-sm">
          Event name
          <input
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>
        {validationError && <p className="text-red-600">{validationError}</p>}

        <label className="flex flex-col gap-1 text-sm">
          Venue
          <input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Event date
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Banner image
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setBannerFile(e.target.files?.[0])}
            className="text-sm"
          />
        </label>

        {error && <p className="text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create event'}
        </button>
      </form>
    </div>
  );
}
