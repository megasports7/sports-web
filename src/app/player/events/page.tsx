'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { playerApi } from '@/lib/api/player.api';
import { Card } from '@/lib/ui/Card';
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

  if (loading) return <p className="text-muted">Loading events…</p>;
  if (error) return <p className="text-corner-red">{error}</p>;

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-ink">Events</h1>
      {events.length === 0 ? (
        <p className="text-sm text-muted">No events available. Check back later.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((e) => {
            const registered = e.registration_status === 'approved' || e.registration_status === 'pending';
            return (
              <Card as="li" key={e.event_id} accent={e.registration_status === 'approved' ? 'green' : e.registration_status === 'pending' ? 'pending' : 'none'}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-ink">{e.event_name}</div>
                    {(e.venue || e.location) && <div className="text-sm text-muted">{e.venue || e.location}</div>}
                    {e.event_date && (
                      <div className="text-xs text-muted">{new Date(e.event_date).toLocaleDateString()}</div>
                    )}
                    {e.event_category && (
                      <div className="mt-1 text-xs font-medium text-muted">
                        {e.event_category}
                        {e.age_category ? ` · ${e.age_category}` : ''}
                        {e.weight_category ? ` · ${e.weight_category}` : ''}
                      </div>
                    )}
                  </div>
                  {registered ? (
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-surface ${
                        e.registration_status === 'approved' ? 'bg-accent-green' : 'bg-status-pending'
                      }`}
                    >
                      {e.registration_status === 'approved' ? 'Registered' : 'Pending'}
                    </span>
                  ) : (
                    <Link
                      href={`/player/events/${e.event_id}/register`}
                      className="shrink-0 rounded-md bg-accent-blue px-3 py-1.5 text-xs font-semibold text-surface"
                    >
                      Register
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </ul>
      )}
    </div>
  );
}
