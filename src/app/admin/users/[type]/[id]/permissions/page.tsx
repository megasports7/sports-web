'use client';

/**
 * Secretary permissions editor (plan v2 Step 5). Admin-only page listing the
 * 11 canonical permission keys as checkboxes reflecting the live grant rows,
 * plus the secretary's fixed jurisdiction (read-only here -- jurisdiction is
 * managed at creation / via the edit page, never by permission toggles).
 *
 * Save replaces the grant set wholesale (delete-then-insert in
 * adminApi.setSecretaryPermissions, RLS-enforced admin-only). Revoke takes
 * effect on the secretary's next statement -- RLS reads grants live, no
 * session refresh needed.
 */
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api/admin.api';
import { SECRETARY_PERMISSIONS, type SecretaryPermission } from '@/lib/types';

const DESCRIPTIONS: Record<SecretaryPermission, string> = {
  view_players: 'View players inside jurisdiction (roster).',
  verify_players: 'Approve / reject / override registrations in scope.',
  manage_registrations: 'Monitor registrations, results, certificates, attendance (read-only).',
  manage_events: 'Edit details of in-scope events (no create / delete).',
  create_events: 'FLAGGED default OFF — create events inside jurisdiction.',
  delete_events: 'FLAGGED default OFF — delete events inside jurisdiction.',
  manage_batches: 'FLAGGED default OFF — batch management.',
  manage_matches: 'FLAGGED default OFF — match management.',
  attendance_ops: 'FLAGGED default OFF — attendance operations (needs schema decision).',
  referee_mgmt: 'FLAGGED default OFF — referee assignment.',
  certificate_ops: 'FLAGGED default OFF — certificate issuance.',
};

export default function SecretaryPermissionsPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = use(params);
  const router = useRouter();
  const valid =
    (type === 'district-secretaries' || type === 'state-secretaries') &&
    /^[0-9a-f-]{36}$/i.test(id);

  const [name, setName] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [checked, setChecked] = useState<Set<SecretaryPermission>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!valid) return;
    (async () => {
      const [userRes, permRes] = await Promise.all([
        adminApi.getUserById(id),
        adminApi.secretaryPermissions(id),
      ]);
      if (userRes.success && userRes.data) {
        setName(userRes.data.name);
        setJurisdiction(
          [userRes.data.state, userRes.data.district].filter(Boolean).join(' / ') || '—',
        );
      }
      if (permRes.success && permRes.data) {
        setChecked(new Set(permRes.data));
        setError(null);
      } else {
        setError(permRes.message || 'Could not load permissions');
      }
      setLoading(false);
    })();
  }, [id, valid]);

  function toggle(p: SecretaryPermission) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const res = await adminApi.setSecretaryPermissions(id, [...checked]);
    setSaving(false);
    if (res.success) {
      setMessage('Permissions saved. Revoked capabilities stop working on the next request.');
    } else {
      setError(res.message || 'Could not save permissions');
    }
  }

  if (!valid) return <p className="text-red-600">Unknown secretary.</p>;
  if (loading) return <p className="text-gray-500">Loading permissions…</p>;

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Link href={`/admin/users/${type}`} className="text-sm text-blue-700 underline">
        ← Back to {type === 'district-secretaries' ? 'District Secretaries' : 'State Secretaries'}
      </Link>
      <div>
        <h1 className="text-lg font-bold">Permissions — {name || id}</h1>
        <p className="text-sm text-gray-500">Jurisdiction (fixed, not editable here): {jurisdiction}</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}

      <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4">
        {SECRETARY_PERMISSIONS.map((p) => (
          <label key={p} className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={checked.has(p)}
              onChange={() => toggle(p)}
              className="mt-1"
            />
            <span>
              <span className="font-mono font-medium">{p}</span>
              <span className="block text-xs text-gray-500">{DESCRIPTIONS[p]}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save permissions'}
        </button>
        <button
          onClick={() => router.push(`/admin/users/${type}`)}
          className="rounded-lg border px-4 py-2 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
