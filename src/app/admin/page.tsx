'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api/admin.api';
import type { AdminDashboardData } from '@/lib/types';

const MANAGE_LINKS = [
  { href: '/admin/users/players', label: 'Players', key: 'total_players' as const, suffix: 'registered' },
  { href: '/admin/users/organizers', label: 'Organizers', key: 'total_organizers' as const, suffix: 'registered' },
  { href: '/admin/users/referees', label: 'Referees', key: 'total_referees' as const, suffix: 'registered' },
  { href: '/admin/users/associates', label: 'Associates', key: 'total_associates' as const, suffix: 'district heads' },
];

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .dashboard()
      .then((res) => {
        if (res.success && res.data) setData(res.data);
        else setError(res.message || 'Could not load dashboard');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading dashboard…</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h1 className="text-lg font-bold">Admin panel</h1>
        <p className="text-sm text-gray-500">Platform-wide overview</p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-600">Platform stats</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: 'Players', value: data.total_players },
            { label: 'Organizers', value: data.total_organizers },
            { label: 'Referees', value: data.total_referees },
            { label: 'Associates', value: data.total_associates },
            { label: 'Events', value: data.total_events },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-gray-200 bg-white p-3 text-center">
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-600">Manage</h2>
        <ul className="flex flex-col gap-2">
          {MANAGE_LINKS.map((m) => (
            <li key={m.href}>
              <Link
                href={m.href}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 text-sm hover:bg-gray-50"
              >
                <span className="font-medium">{m.label}</span>
                <span className="text-gray-500">
                  {data[m.key]} {m.suffix}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {data.recent_players.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-600">Recent players</h2>
          <ul className="flex flex-col gap-2">
            {data.recent_players.slice(0, 5).map((p) => (
              <li key={p.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
                <div className="font-medium">{p.player_name}</div>
                <div className="text-xs text-gray-500">{p.email}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Static/decorative, matching mobile's AdminDashboard.tsx "Admin
          Powers" card exactly -- not a functional widget there either. */}
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-600">Admin powers</h2>
        <ul className="flex flex-col gap-1 text-sm text-gray-700">
          <li>✓ Edit or suspend accounts</li>
          <li>✓ Monitor events &amp; matches</li>
          <li>✓ Manage associate (district head) accounts</li>
          <li>✓ Full CRUD on all user roles</li>
        </ul>
      </section>
    </div>
  );
}
