'use client';

/**
 * Direct close port of sports-mobile-main/src/screens/admin/AdminUserList.tsx
 * -- one reusable list view for all four roster types, matching mobile's own
 * single-component-reused-across-tabs pattern (AdminTabs.tsx). `type` picks
 * which adminApi function backs it.
 *
 * Suspend, not delete: adminApi.deleteUser() sets status='suspended' via the
 * admin-update-user Edge Function -- same as mobile, and named "Suspend"
 * here rather than "Delete" so the UI doesn't promise something it doesn't
 * do (mobile's own button says "Delete" but its confirm/success copy and
 * behavior are pure deactivation; not repeating that mismatch here).
 */
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api/admin.api';
import type { AdminUserRow } from '@/lib/types';

type ListType = 'players' | 'organizers' | 'referees' | 'associates';

const CONFIG: Record<ListType, { title: string; singularRole: string }> = {
  players: { title: 'Players', singularRole: 'player' },
  organizers: { title: 'Organizers', singularRole: 'organizer' },
  referees: { title: 'Referees', singularRole: 'referee' },
  associates: { title: 'Associates', singularRole: 'associate' },
};

function isListType(v: string): v is ListType {
  return Object.prototype.hasOwnProperty.call(CONFIG, v);
}

export default function AdminUserListPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const valid = isListType(type);

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  async function refresh() {
    if (!valid) return;
    if (type === 'players') {
      const res = await adminApi.players();
      if (res.success && res.data) {
        setUsers(
          res.data.map((p) => ({
            id: p.id,
            name: p.player_name,
            email: p.email,
            phone: p.phone,
            state: p.state,
            district: p.district,
            status: p.status,
          })),
        );
        setError(null);
      } else setError(res.message || 'Could not load players');
    } else if (type === 'organizers') {
      const res = await adminApi.organizers();
      if (res.success && res.data) {
        setUsers(
          res.data.map((o) => ({
            id: o.id,
            name: o.name,
            email: o.email,
            phone: o.phone,
            state: o.state,
            district: o.district,
            status: o.status,
          })),
        );
        setError(null);
      } else setError(res.message || 'Could not load organizers');
    } else if (type === 'referees') {
      const res = await adminApi.referees();
      if (res.success && res.data) {
        setUsers(
          res.data.map((r) => ({
            id: r.referee_id,
            name: r.name,
            email: r.email ?? '',
            phone: r.phone,
            state: r.state,
            district: r.district,
            status: r.status,
          })),
        );
        setError(null);
      } else setError(res.message || 'Could not load referees');
    } else {
      const res = await adminApi.associates();
      if (res.success && res.data) {
        setUsers(
          res.data.map((a) => ({
            id: a.id,
            name: a.name,
            email: a.email,
            phone: a.phone,
            state: a.state,
            district: a.district,
            status: a.status,
          })),
        );
        setError(null);
      } else setError(res.message || 'Could not load associates');
    }
  }

  // Inlined rather than calling refresh() -- react-hooks/set-state-in-effect
  // flags setState reached via ANY named function call from an effect body,
  // sync or async, not just a literal synchronous call (confirmed the hard
  // way across every prior *.api.ts page in this project). refresh() above
  // stays for the post-suspend re-fetch, which isn't inside an effect.
  useEffect(() => {
    if (!valid) return;
    if (type === 'players') {
      adminApi
        .players()
        .then((res) => {
          if (res.success && res.data) {
            setUsers(
              res.data.map((p) => ({
                id: p.id,
                name: p.player_name,
                email: p.email,
                phone: p.phone,
                state: p.state,
                district: p.district,
                status: p.status,
              })),
            );
            setError(null);
          } else {
            setError(res.message || 'Could not load players');
          }
        })
        .finally(() => setLoading(false));
    } else if (type === 'organizers') {
      adminApi
        .organizers()
        .then((res) => {
          if (res.success && res.data) {
            setUsers(
              res.data.map((o) => ({
                id: o.id,
                name: o.name,
                email: o.email,
                phone: o.phone,
                state: o.state,
                district: o.district,
                status: o.status,
              })),
            );
            setError(null);
          } else {
            setError(res.message || 'Could not load organizers');
          }
        })
        .finally(() => setLoading(false));
    } else if (type === 'referees') {
      adminApi
        .referees()
        .then((res) => {
          if (res.success && res.data) {
            setUsers(
              res.data.map((r) => ({
                id: r.referee_id,
                name: r.name,
                email: r.email ?? '',
                phone: r.phone,
                state: r.state,
                district: r.district,
                status: r.status,
              })),
            );
            setError(null);
          } else {
            setError(res.message || 'Could not load referees');
          }
        })
        .finally(() => setLoading(false));
    } else {
      adminApi
        .associates()
        .then((res) => {
          if (res.success && res.data) {
            setUsers(
              res.data.map((a) => ({
                id: a.id,
                name: a.name,
                email: a.email,
                phone: a.phone,
                state: a.state,
                district: a.district,
                status: a.status,
              })),
            );
            setError(null);
          } else {
            setError(res.message || 'Could not load associates');
          }
        })
        .finally(() => setLoading(false));
    }
  }, [type, valid]);

  async function handleSuspend(row: AdminUserRow) {
    if (!window.confirm(`Suspend "${row.name}"? They will no longer be able to sign in.`)) return;
    const res = await adminApi.deleteUser(row.id);
    if (res.success) {
      setActionMessage(`${row.name} has been suspended.`);
      refresh();
    } else {
      setActionMessage(res.message || 'Suspend failed');
    }
  }

  if (!valid) return <p className="text-red-600">Unknown list &quot;{type}&quot;.</p>;
  const config = CONFIG[type];

  if (loading) return <p className="text-gray-500">Loading {config.title.toLowerCase()}…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{config.title}</h1>
        <Link
          href={`/admin/users/${type}/new`}
          className="rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white"
        >
          + Add {config.singularRole}
        </Link>
      </div>

      {actionMessage && <p className="text-sm text-gray-600">{actionMessage}</p>}

      {users.length === 0 ? (
        <p className="text-sm text-gray-500">No {config.title.toLowerCase()} registered yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{u.name}</div>
                <div className="truncate text-xs text-gray-500">{u.email}</div>
                {u.phone && <div className="text-xs text-gray-400">{u.phone}</div>}
                {u.status && u.status !== 'active' && (
                  <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {u.status}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                {/* Phase 4: admin-in-organizer-context entry. Opens the
                    organizer's own dashboard scoped to this organizer
                    (?org=); the admin's role never changes. */}
                {type === 'organizers' && (
                  <Link
                    href={`/organizer?org=${u.id}`}
                    className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700"
                  >
                    Dashboard
                  </Link>
                )}
                <Link
                  href={`/admin/users/${type}/${u.id}/edit`}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleSuspend(u)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600"
                >
                  Suspend
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
