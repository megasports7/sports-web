'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { organizerApi } from '@/lib/api/organizer.api';
import type { Event } from '@/lib/types';

export default function OrganizerEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    organizerApi
      .events()
      .then((res) => {
        if (res.success && res.data) setEvents(res.data);
        else setError(res.message || 'Could not load events');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading events…</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">Events</h1>
        <Link href="/organizer/events/new" className="text-sm font-medium underline">
          + Create event
        </Link>
      </div>

      {error && <p className="mb-3 text-red-600">{error}</p>}

      {events.length === 0 ? (
        <p className="text-sm text-gray-500">No events yet. Create your first event to get started.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((e) => (
            <li key={e.event_id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="font-semibold">{e.event_name}</div>
              {(e.venue || e.location) && (
                <div className="text-sm text-gray-500">{e.venue || e.location}</div>
              )}
              {e.event_date && (
                <div className="text-xs text-gray-400">{new Date(e.event_date).toLocaleDateString()}</div>
              )}
              <div className="mt-1 text-xs font-medium text-gray-600">
                {e.player_count ?? 0} player{e.player_count === 1 ? '' : 's'} registered
              </div>

              <div className="mt-3 flex flex-wrap gap-4 text-sm font-medium">
                <Link href={`/organizer/events/${e.event_id}/registrations`} className="underline">
                  Registrations
                </Link>
                <Link href={`/organizer/events/${e.event_id}/batches`} className="underline">
                  Batches
                </Link>
                <Link href={`/organizer/events/${e.event_id}/lists/create`} className="underline">
                  Attendance lists
                </Link>
                <Link href={`/organizer/events/${e.event_id}/scan-attendance`} className="underline">
                  Scan attendance
                </Link>
                <Link href={`/organizer/events/${e.event_id}/rapid-mode`} className="underline">
                  Rapid mode
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
