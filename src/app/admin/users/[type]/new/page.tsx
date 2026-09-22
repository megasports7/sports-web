'use client';

/**
 * Direct close port of sports-mobile-main/src/screens/admin/AdminEditUser.tsx
 * (isNew branch). Role choices deliberately exclude 'admin' -- matching
 * mobile's own `roles` array exactly, so an admin can't spawn another admin
 * through this form.
 *
 * Secretary types (plan v2 Step 5): district-secretaries / state-secretaries
 * render a dedicated form -- role fixed by entry point, jurisdiction from
 * canonical State -> District dropdowns (never free text), and the
 * admin-ticked permission set (default: none). The Edge Function resolves
 * district_code server-side and rejects unknown values loudly.
 */
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api/admin.api';
import { SECRETARY_PERMISSIONS, type GeoDistrict, type GeoState, type SecretaryPermission } from '@/lib/types';

const ROLES = ['player', 'organizer', 'referee', 'associate'] as const;
type CreatableRole = (typeof ROLES)[number];

const TYPE_TO_ROLE: Record<string, CreatableRole> = {
  players: 'player',
  organizers: 'organizer',
  referees: 'referee',
  associates: 'associate',
};

function isSecretaryType(t: string): t is 'district-secretaries' | 'state-secretaries' {
  return t === 'district-secretaries' || t === 'state-secretaries';
}

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
function generatePassword(): string {
  let pwd = '';
  for (let i = 0; i < 10; i++) pwd += PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)];
  return pwd;
}

export default function NewAdminUserPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  if (isSecretaryType(type)) {
    return <NewSecretaryForm type={type} />;
  }
  return <NewStandardUserForm type={type} />;
}

function NewSecretaryForm({ type }: { type: 'district-secretaries' | 'state-secretaries' }) {
  const router = useRouter();
  const role = type === 'district-secretaries' ? 'district_secretary' : 'state_secretary';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [states, setStates] = useState<GeoState[]>([]);
  const [districts, setDistricts] = useState<GeoDistrict[]>([]);
  const [stateId, setStateId] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [generatedNotice, setGeneratedNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    adminApi.geoStates().then((res) => {
      if (res.success && res.data) setStates(res.data);
      else setError(res.message || 'Could not load states');
    });
  }, []);

  // District fetch lives in the select handler (not an effect) per the
  // repo's react-hooks/set-state-in-effect rule.
  async function handleStateChange(nextStateId: string) {
    setStateId(nextStateId);
    setDistrictCode('');
    if (!nextStateId) {
      setDistricts([]);
      return;
    }
    const res = await adminApi.geoDistricts(nextStateId);
    if (res.success && res.data) {
      setDistricts(res.data);
    } else {
      setError(res.message || 'Could not load districts');
    }
  }

  function togglePermission(p: string) {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
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
    const stateName = states.find((s) => s.id === stateId)?.name;
    if (!stateName) {
      setError('Select a state.');
      return;
    }
    if (role === 'district_secretary' && !districtCode) {
      setError('Select a district.');
      return;
    }

    setSubmitting(true);
    const res = await adminApi.createUser({
      email: email.trim(),
      password,
      name: name.trim(),
      role,
      phone: phone.trim() || undefined,
      state: stateName,
      district_code: role === 'district_secretary' ? districtCode : undefined,
      permissions: [...permissions] as SecretaryPermission[],
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
      <h1 className="mb-4 text-lg font-bold">
        Add {role === 'district_secretary' ? 'District Secretary' : 'State Secretary'}
      </h1>

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
            State (canonical)
            <select
              value={stateId}
              onChange={(e) => handleStateChange(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">Select state…</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          {role === 'district_secretary' ? (
            <label className="flex flex-col gap-1 text-sm">
              District (canonical — fixed jurisdiction)
              <select
                value={districtCode}
                onChange={(e) => setDistrictCode(e.target.value)}
                disabled={!stateId}
                className="rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-50"
              >
                <option value="">{stateId ? 'Select district…' : 'Select a state first'}</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="self-end pb-2 text-xs text-gray-500">
              Jurisdiction: the whole selected state. Cannot be changed by the secretary later.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Permissions (all OFF unless ticked)</span>
          {SECRETARY_PERMISSIONS.map((p) => (
            <label key={p} className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={permissions.has(p)}
                onChange={() => togglePermission(p)}
              />
              <span className="font-mono">{p}</span>
            </label>
          ))}
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
          onClick={() => {
            const pwd = generatePassword();
            setPassword(pwd);
            setConfirmPassword(pwd);
            setGeneratedNotice(false);
            navigator.clipboard?.writeText(pwd).then(
              () => setGeneratedNotice(true),
              () => setGeneratedNotice(false),
            );
          }}
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
            {submitting ? 'Creating…' : 'Create secretary'}
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

function NewStandardUserForm({ type }: { type: string }) {
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
