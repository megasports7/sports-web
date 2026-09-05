'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { playerApi } from '@/lib/api/player.api';
import type { Event } from '@/lib/types';

export default function PlayerEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    playerApi
      .events()
      .then((res) => {
        if (res.success && res.data) setEvents(res.data);
        else setError(res.message || 'Could not load events');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading events…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold">Events</h1>
      {events.length === 0 ? (
        <p className="text-sm text-gray-500">No events available. Check back later.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((e) => {
            const registered = e.registration_status === 'approved' || e.registration_status === 'pending';
            return (
              <li key={e.event_id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{e.event_name}</div>
                    {(e.venue || e.location) && (
                      <div className="text-sm text-gray-500">{e.venue || e.location}</div>
                    )}
                    {e.event_date && (
                      <div className="text-xs text-gray-400">{new Date(e.event_date).toLocaleDateString()}</div>
                    )}
                    {e.event_category && (
                      <div className="mt-1 text-xs font-medium text-gray-600">
                        {e.event_category}
                        {e.age_category ? ` · ${e.age_category}` : ''}
                        {e.weight_category ? ` · ${e.weight_category}` : ''}
                      </div>
                    )}
                  </div>
                  {registered ? (
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                        e.registration_status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {e.registration_status === 'approved' ? 'Registered' : 'Pending'}
                    </span>
                  ) : (
                    <Link
                      href={`/player/events/${e.event_id}/register`}
                      className="shrink-0 rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Register
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
