'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { organizerApi } from '@/lib/api/organizer.api';
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

  if (loading) return <p className="text-gray-500">Loading dashboard…</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p className="text-red-600">Dashboard not found.</p>;

  const { organizer, stats, recent_events } = data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Welcome, {organizer.name}</h1>
          <p className="text-sm text-gray-500">{organizer.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Events" value={stats.total_events} />
        <StatTile label="Batches" value={stats.total_batches} />
        <StatTile label="Registrations" value={stats.total_registrations} />
        <StatTile label="Active today" value={stats.active_today ?? 0} />
      </div>

      <div className="flex gap-4 text-sm font-medium">
        <Link href="/organizer/events" className="underline">
          View all events
        </Link>
        <Link href="/organizer/events/new" className="underline">
          Create event
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-600">Recent events</h2>
        {recent_events.length === 0 ? (
          <p className="text-sm text-gray-500">No events yet. Create your first event to get started.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {recent_events.map((e) => (
              <li key={e.event_id} className="rounded-lg border border-gray-200 bg-white p-4">
                <Link href={`/organizer/events/${e.event_id}/registrations`} className="font-semibold underline">
                  {e.event_name}
                </Link>
                {(e.venue || e.location) && <div className="text-sm text-gray-500">{e.venue || e.location}</div>}
                {e.event_date && (
                  <div className="text-xs text-gray-400">{new Date(e.event_date).toLocaleDateString()}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}
