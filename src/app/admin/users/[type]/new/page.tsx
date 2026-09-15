'use client';

/**
 * Direct close port of sports-mobile-main/src/screens/admin/AdminEditUser.tsx
 * (isNew branch). Role choices deliberately exclude 'admin' -- matching
 * mobile's own `roles` array exactly, so an admin can't spawn another admin
 * through this form.
 */
import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api/admin.api';

const ROLES = ['player', 'organizer', 'referee', 'associate'] as const;
type CreatableRole = (typeof ROLES)[number];

const TYPE_TO_ROLE: Record<string, CreatableRole> = {
  players: 'player',
  organizers: 'organizer',
  referees: 'referee',
  associates: 'associate',
};

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
function generatePassword(): string {
  let pwd = '';
  for (let i = 0; i < 10; i++) pwd += PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)];
  return pwd;
}

export default function NewAdminUserPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const router = useRouter();
  const defaultRole = TYPE_TO_ROLE[type] ?? 'player';

  const [role, setRole] = useState<CreatableRole>(defaultRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [generatedNotice, setGeneratedNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleGeneratePassword() {
    const pwd = generatePassword();
    setPassword(pwd);
    setConfirmPassword(pwd);
    setGeneratedNotice(false);
    navigator.clipboard?.writeText(pwd).then(
      () => setGeneratedNotice(true),
      () => setGeneratedNotice(false),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !password) {
      setError('Name, email and password are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const res = await adminApi.createUser({
      email: email.trim(),
      password,
      name: name.trim(),
      role,
      phone: phone.trim() || undefined,
      state: state.trim() || undefined,
      district: district.trim() || undefined,
    });
    setSubmitting(false);

    if (res.success) {
      router.push(`/admin/users/${type}`);
    } else {
      setError(res.message || 'Could not create user');
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold">Add new user</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-sm">
          Full name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
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
          Role
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => (
              <label
                key={r}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-center text-sm font-medium capitalize ${
                  role === r ? 'border-black bg-black text-white' : 'border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={r}
                  checked={role === r}
                  onChange={() => setRole(r)}
                  className="sr-only"
                />
                {r}
              </label>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <button
          type="button"
          onClick={handleGeneratePassword}
          className="self-start rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium"
        >
          Auto-generate password
        </button>
        {generatedNotice && <p className="text-xs text-gray-500">Copied to clipboard.</p>}

        <label className="flex flex-col gap-1 text-sm">
          Confirm password
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
            {submitting ? 'Creating…' : 'Create user'}
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
