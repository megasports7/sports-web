'use client';

/**
 * Direct close port of sports-mobile-main/src/screens/admin/AdminEditUser.tsx
 * (edit branch). `id` is the real profiles.id uuid -- see admin.api.ts's
 * file header for why this, not legacy_id, is what admin management keys on
 * here (mobile's own equivalent is a live bug for self-signup accounts).
 * role/email are not editable through this form -- matching
 * admin-update-user's own ALLOWED_FIELDS exactly, not an omission.
 */
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api/admin.api';
import type { AdminUserRow } from '@/lib/types';

const STATUSES = ['active', 'inactive', 'suspended'] as const;

export default function EditAdminUserPage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = use(params);
  const router = useRouter();

  const [original, setOriginal] = useState<AdminUserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [status, setStatus] = useState('active');
  const [password, setPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    adminApi
      .getUserById(id)
      .then((res) => {
        if (res.success && res.data) {
          setOriginal(res.data);
          setName(res.data.name ?? '');
          setPhone(res.data.phone ?? '');
          setState(res.data.state ?? '');
          setDistrict(res.data.district ?? '');
          setStatus(res.data.status ?? 'active');
        } else {
          setLoadError(res.message || 'User not found');
        }
      })
      .catch(() => setLoadError('User not found'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (password && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    const res = await adminApi.updateUser(id, {
      name: name.trim(),
      phone: phone.trim() || undefined,
      state: state.trim() || undefined,
      district: district.trim() || undefined,
      status,
      password: password || undefined,
    });
    setSubmitting(false);

    if (res.success) {
      router.push(`/admin/users/${type}`);
    } else {
      setError(res.message || 'Could not update user');
    }
  }

  if (loading) return <p className="text-gray-500">Loading user…</p>;
  if (loadError || !original) return <p className="text-red-600">{loadError || 'User not found'}</p>;

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold">Edit {original.name}</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-sm">
          Full name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-gray-500">
          Email (not editable)
          <input
            value={original.email}
            disabled
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-400"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Phone
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            State
            <input
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            District
            <input
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
        </div>

        <div className="flex flex-col gap-1 text-sm">
          Status
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <label
                key={s}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-center text-sm font-medium capitalize ${
                  status === s ? 'border-black bg-black text-white' : 'border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value={s}
                  checked={status === s}
                  onChange={() => setStatus(s)}
                  className="sr-only"
                />
                {s}
              </label>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          New password (optional)
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to keep the current password"
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/admin/users/${type}`)}
            className="rounded-lg border px-3 py-2 text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
