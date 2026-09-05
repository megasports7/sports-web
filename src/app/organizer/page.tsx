'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { organizerApi } from '@/lib/api/organizer.api';
import { Card } from '@/lib/ui/Card';
import { StatTile } from '@/lib/ui/StatTile';
import type { OrganizerDashboardData } from '@/lib/types';

export default function OrganizerHome() {
  const [data, setData] = useState<OrganizerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    organizerApi
      .dashboard()
      .then((res) => {
        if (res.success && res.data) setData(res.data);
        else setError(res.message || 'Could not load dashboard');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted">Loading dashboard…</p>;
  if (error) return <p className="text-corner-red">{error}</p>;
  if (!data) return <p className="text-corner-red">Dashboard not found.</p>;

  const { organizer, stats, recent_events } = data;

  return (
    <div className="flex flex-col gap-6">
      <Card accent="green">
        <h1 className="text-lg font-bold text-ink">Welcome, {organizer.name}</h1>
        <p className="text-sm text-muted">{organizer.email}</p>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile value={stats.total_events} label="Events" accent="green" />
        <StatTile value={stats.total_batches} label="Batches" accent="blue" />
        <StatTile value={stats.total_registrations} label="Registrations" accent="none" />
        <StatTile value={stats.active_today ?? 0} label="Active today" accent="pending" />
      </div>

      <div className="flex gap-4 text-sm font-medium">
        <Link href="/organizer/events" className="text-accent-green underline">
          View all events
        </Link>
        <Link href="/organizer/events/new" className="text-accent-green underline">
          Create event
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted">Recent events</h2>
        {recent_events.length === 0 ? (
          <p className="text-sm text-muted">No events yet. Create your first event to get started.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {recent_events.map((e) => (
              <Card as="li" key={e.event_id}>
                <Link href={`/organizer/events/${e.event_id}/registrations`} className="font-semibold text-ink underline">
                  {e.event_name}
                </Link>
                {(e.venue || e.location) && <div className="text-sm text-muted">{e.venue || e.location}</div>}
                {e.event_date && <div className="text-xs text-muted">{new Date(e.event_date).toLocaleDateString()}</div>}
              </Card>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
