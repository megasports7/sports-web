'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { playerApi } from '@/lib/api/player.api';
import type { UserRole } from '@/lib/types';

export default function SignupPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<UserRole>('player');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Extra player-profile fields. Collected at signup but stored only AFTER
  // the account exists: ordinary columns via profiles PATCH, Aadhaar via the
  // restricted player_sensitive_ids table (never part of profiles -- see
  // playerApi.saveSensitiveIds). Organizer/referee signups don't see these.
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [nsrdId, setNsrdId] = useState('');
  const [aadhaar, setAadhaar] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileRetry, setProfileRetry] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function validateExtras(): string | null {
    if (role !== 'player') return null;
    if (gender !== 'male' && gender !== 'female') return 'Select a gender.';
    if (!dob) return 'Enter your date of birth.';
    const dobDate = new Date(`${dob}T00:00:00`);
    if (Number.isNaN(dobDate.getTime()) || dobDate >= new Date()) {
      return 'Enter a valid past date of birth.';
    }
    if (aadhaar && !/^\d{12}$/.test(aadhaar.trim())) {
      return 'Aadhaar must be exactly 12 digits, or left blank.';
    }
    return null;
  }

  // Step 2 of signup: persist the extra fields. The account already exists
  // at this point, so a failure here is retryable without re-signing-up --
  // and the profile stays editable later, so this never strands the user.
  async function runPostSignup(): Promise<boolean> {
    if (role !== 'player') return true;
    setProfileError(null);
    const profileRes = await playerApi.updateProfile({
      gender,
      dob,
      phone: phone.trim() || undefined,
      district: district.trim() || undefined,
      emergency_contact: emergencyContact.trim() || undefined,
      nsrd_id: nsrdId.trim() || undefined,
    });
    if (!profileRes.success) {
      setProfileError(profileRes.message || 'Could not save profile details.');
      setProfileRetry(true);
      return false;
    }
    // Aadhaar is best-effort by contract (mobile parity): a failure here
    // warns but never blocks the new account.
    if (aadhaar.trim()) {
      const idRes = await playerApi.saveSensitiveIds(aadhaar.trim());
      if (!idRes.success) {
        setProfileError('Account created, but Aadhaar could not be saved. You can add it later from your profile.');
      }
    }
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setProfileError(null);
    setProfileRetry(false);
    const extrasError = validateExtras();
    if (extrasError) {
      setError(extrasError);
      return;
    }
    setSubmitting(true);
    try {
      await signUp({ name, email, password, role });
      const ok = await runPostSignup();
      if (!ok) return;
      router.push(`/${role}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRetryProfile() {
    setSubmitting(true);
    setProfileError(null);
    try {
      const ok = await runPostSignup();
      if (ok) router.push(`/${role}`);
      else setProfileRetry(true);
    } finally {
      setSubmitting(false);
    }
  }

  const showExtras = role === 'player';

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-bold">Create account</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <fieldset className="flex gap-2">
          {(['player', 'organizer', 'referee'] as const).map((r) => (
            <label
              key={r}
              className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium capitalize ${
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
        </fieldset>

        <input
          type="text"
          required
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2"
        />
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2"
        />

        {showExtras && (
          <fieldset className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <legend className="px-1 text-sm font-semibold text-gray-700">Player details</legend>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                Gender *
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Date of birth *
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                Phone
                <input
                  type="tel"
                  placeholder="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                District
                <input
                  type="text"
                  placeholder="District"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              Emergency contact
              <input
                type="tel"
                placeholder="Emergency contact number"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                NSRD ID
                <input
                  type="text"
                  placeholder="NSRD ID"
                  value={nsrdId}
                  onChange={(e) => setNsrdId(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Aadhaar (12 digits)
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Aadhaar"
                  value={aadhaar}
                  onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                />
              </label>
            </div>
          </fieldset>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {profileError && <p className="text-sm text-amber-700">{profileError}</p>}

        {!profileRetry ? (
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-black px-3 py-2 font-medium text-white disabled:opacity-50"
          >
            {submitting ? 'Creating account…' : 'Sign up'}
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting}
            onClick={handleRetryProfile}
            className="rounded-lg bg-black px-3 py-2 font-medium text-white disabled:opacity-50"
          >
            {submitting ? 'Retrying…' : 'Retry saving profile'}
          </button>
        )}
      </form>

      <p className="text-center text-sm text-gray-600">
        Already have an account? <a href="/login" className="font-medium underline">Sign in</a>
      </p>
    </main>
  );
}
