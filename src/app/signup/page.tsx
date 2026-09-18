'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { ROLE_COLOR_VAR, ROLE_LABEL, RoleIcon } from '@/lib/auth/roleUi';
import { playerApi } from '@/lib/api/player.api';
import type { UserRole } from '@/lib/types';

const SIGNUP_ROLES = ['player', 'organizer', 'referee'] as const;

function MailIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path
        stroke="currentColor"
        strokeWidth={1.5}
        d="M3 5.5h14v9a1.2 1.2 0 0 1-1.2 1.2H4.2A1.2 1.2 0 0 1 3 14.5v-9Z"
      />
      <path stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" d="m3.4 5.8 6.1 5 6.1-5" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <rect x="4.5" y="9" width="11" height="7.2" rx="1.6" stroke="currentColor" strokeWidth={1.5} />
      <path d="M6.8 9V6.6a3.2 3.2 0 0 1 6.4 0V9" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="7" r="3.2" stroke="currentColor" strokeWidth={1.5} />
      <path d="M4 17c.6-4 3-6.2 6-6.2S15.4 13 16 17" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path
        d="M6.5 3.5h2.6l1.2 3.4-1.7 1.3a8.6 8.6 0 0 0 3.2 3.2l1.3-1.7 3.4 1.2v2.6a1.5 1.5 0 0 1-1.6 1.5C9.6 15 5 10.4 5 5.1a1.5 1.5 0 0 1 1.5-1.6Z"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth={1.5} />
      <path d="M3 8h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path
        d="M10 2.6c-3 0-5.4 2.3-5.4 5.5 0 4 5.4 9.3 5.4 9.3s5.4-5.3 5.4-9.3c0-3.2-2.4-5.5-5.4-5.5Z"
        stroke="currentColor"
        strokeWidth={1.4}
      />
      <circle cx="10" cy="8" r="1.8" stroke="currentColor" strokeWidth={1.4} />
    </svg>
  );
}
function IdIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth={1.5} />
      <circle cx="7.5" cy="9" r="1.6" stroke="currentColor" strokeWidth={1.3} />
      <path
        d="M5.5 14c.4-1.7 1.5-2.5 2.7-2.5S10.4 12.3 11 14M13 8h2.2M13 10.5h2.2"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function SignupPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<UserRole>('player');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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

  const showExtras = role === 'player';

  return (
    <div className="page">
      <div className="hero">
        <svg className="hero-lines" viewBox="0 0 520 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <g fill="none" stroke="#fff" strokeWidth={1}>
            <line x1="70" y1="20" x2="70" y2="120" />
            <circle cx="70" cy="20" r="3" fill="#fff" stroke="none" />
            <circle cx="70" cy="70" r="3" fill="#fff" stroke="none" />
            <circle cx="70" cy="120" r="3" fill="#fff" stroke="none" />
            <line x1="70" y1="70" x2="120" y2="70" />
            <line x1="450" y1="40" x2="450" y2="160" />
            <circle cx="450" cy="40" r="3" fill="#fff" stroke="none" />
            <circle cx="450" cy="100" r="3" fill="#fff" stroke="none" />
            <circle cx="450" cy="160" r="3" fill="#fff" stroke="none" />
            <line x1="450" y1="100" x2="400" y2="100" />
            <line x1="250" y1="10" x2="250" y2="60" />
            <circle cx="250" cy="10" r="2.5" fill="#fff" stroke="none" />
            <circle cx="250" cy="60" r="2.5" fill="#fff" stroke="none" />
          </g>
        </svg>

        <div className="hero-inner">
          <div className="brand">
            <span className="brand-mark">
              <svg viewBox="0 0 34 34">
                <path d="M17 3a14 14 0 0 1 0 28 14 14 0 0 0 0-28Z" fill="var(--color-corner-red)" />
                <path d="M17 3a14 14 0 0 0 0 28 14 14 0 0 1 0-28Z" fill="var(--color-accent-blue)" />
              </svg>
            </span>
            <span className="brand-word">
              MegaSportsX
              <small>TOURNAMENT PLATFORM</small>
            </span>
          </div>

          <h1>Join the tournament.</h1>
          <p>
            Create your account once — register for bouts, track brackets, and pull certificates from the
            same platform your organizer and referees use.
          </p>

          <div className="category-row">
            <span className="category-pill">
              <span className="dot" style={{ background: 'var(--color-corner-red)' }} />
              TANDING
            </span>
            <span className="category-divider" />
            <span className="category-pill">
              <span className="dot" style={{ background: 'var(--color-accent-blue)' }} />
              SENI
            </span>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="card" style={{ '--role-color': ROLE_COLOR_VAR[role] } as React.CSSProperties}>
          <svg className="card-texture" viewBox="0 0 130 96" aria-hidden="true">
            <g fill="none" stroke="currentColor" strokeWidth={1}>
              <line x1="98" y1="12" x2="98" y2="62" />
              <circle cx="98" cy="12" r="2.5" fill="currentColor" stroke="none" />
              <circle cx="98" cy="37" r="2.5" fill="currentColor" stroke="none" />
              <circle cx="98" cy="62" r="2.5" fill="currentColor" stroke="none" />
              <line x1="98" y1="37" x2="118" y2="37" />
            </g>
          </svg>

          <div className="card-content">
            <div className="identity-row">
              <span className="role-badge">
                <RoleIcon role={role} />
              </span>
              <div>
                <p className="eyebrow">New account · {ROLE_LABEL[role]}</p>
                <h2>Create your account</h2>
              </div>
            </div>
            <p className="lede">One account for events, brackets, matches, and certificates.</p>

            <span className="field-label">I am signing up as</span>
            <div className="roles" role="group" aria-label="Choose your role">
              {SIGNUP_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  className="role-chip"
                  data-role={r}
                  aria-pressed={role === r}
                  onClick={() => setRole(r)}
                >
                  <RoleIcon role={r} />
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="field">
                <div className="input-wrap">
                  <UserIcon />
                  <input
                    type="text"
                    required
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
              <div className="field">
                <div className="input-wrap">
                  <MailIcon />
                  <input
                    type="email"
                    required
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="field">
                <div className="input-wrap">
                  <LockIcon />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" className="pw-toggle" onClick={() => setShowPassword((v) => !v)}>
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </div>

              {showExtras && (
                <div className="details-block">
                  <p className="details-title">Player details</p>
                  <div className="grid2">
                    <div className="field">
                      <div className="input-wrap">
                        <UserIcon />
                        <select
                          required
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          aria-label="Gender"
                        >
                          <option value="">Gender *</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                    </div>
                    <div className="field">
                      <div className="input-wrap">
                        <CalendarIcon />
                        <input
                          type="date"
                          required
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          aria-label="Date of birth"
                        />
                      </div>
                    </div>
                    <div className="field">
                      <div className="input-wrap">
                        <PhoneIcon />
                        <input
                          type="tel"
                          placeholder="Phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="field">
                      <div className="input-wrap">
                        <PinIcon />
                        <input
                          type="text"
                          placeholder="District"
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="field">
                    <div className="input-wrap">
                      <PhoneIcon />
                      <input
                        type="tel"
                        placeholder="Emergency contact number"
                        value={emergencyContact}
                        onChange={(e) => setEmergencyContact(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid2">
                    <div className="field">
                      <div className="input-wrap">
                        <IdIcon />
                        <input
                          type="text"
                          placeholder="NSRD ID"
                          value={nsrdId}
                          onChange={(e) => setNsrdId(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="field">
                      <div className="input-wrap">
                        <IdIcon />
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Aadhaar (12 digits)"
                          value={aadhaar}
                          onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, '').slice(0, 12))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {error && <p className="form-error">{error}</p>}
              {profileError && <p className="form-warn">{profileError}</p>}

              {!profileRetry ? (
                <button type="submit" className="cta" data-role={role} disabled={submitting}>
                  {submitting ? 'Creating account…' : 'Sign up'}
                </button>
              ) : (
                <button
                  type="button"
                  className="cta"
                  data-role={role}
                  disabled={submitting}
                  onClick={() => {
                    setSubmitting(true);
                    setProfileError(null);
                    runPostSignup()
                      .then((ok) => {
                        if (ok) router.push(`/${role}`);
                        else setProfileRetry(true);
                      })
                      .finally(() => setSubmitting(false));
                  }}
                >
                  {submitting ? 'Retrying…' : 'Retry saving profile'}
                </button>
              )}
            </form>

            <p className="helper">
              Already have an account?{' '}
              <Link href="/login" className="helper-link">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      <p className="roster-line">
        Every role starts here — <span className="mono">Player · Organizer · Referee</span> — one
        platform, tournament to certificate.
      </p>

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        /* ---------- Hero (identical system to sign-in) ---------- */
        .hero {
          position: relative;
          overflow: hidden;
          padding: 40px 20px 76px;
          background: linear-gradient(
            128deg,
            var(--color-corner-red) 0%,
            #c33b27 16%,
            var(--color-ink) 46%,
            #0f3557 66%,
            var(--color-accent-blue) 100%
          );
          text-align: center;
        }
        .hero-lines {
          position: absolute;
          inset: 0;
          opacity: 0.16;
          pointer-events: none;
        }
        .hero-inner {
          position: relative;
          z-index: 1;
          max-width: 520px;
          margin: 0 auto;
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 22px;
        }
        .brand-mark {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          position: relative;
          flex-shrink: 0;
          background: #fff;
        }
        .brand-mark svg {
          position: absolute;
          inset: 0;
        }
        .brand-word {
          color: #fff;
          font-weight: 700;
          font-size: 17px;
          letter-spacing: 0.2px;
        }
        .brand-word small {
          display: block;
          font-family: var(--font-mono);
          font-weight: 500;
          font-size: 9px;
          letter-spacing: 1.6px;
          color: rgba(255, 255, 255, 0.62);
          margin-top: 1px;
        }

        .hero h1 {
          color: #fff;
          font-size: clamp(26px, 5vw, 34px);
          font-weight: 700;
          line-height: 1.18;
          letter-spacing: -0.2px;
          margin: 0 0 10px;
          text-wrap: balance;
        }
        .hero p {
          color: rgba(255, 255, 255, 0.78);
          font-size: 14.5px;
          line-height: 1.55;
          max-width: 400px;
          margin: 0 auto 26px;
        }

        .category-row {
          display: inline-flex;
          align-items: center;
          gap: 0;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 999px;
          padding: 5px;
        }
        .category-pill {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.2px;
          color: #fff;
          padding: 7px 16px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .category-pill .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .category-divider {
          width: 1px;
          height: 16px;
          background: rgba(255, 255, 255, 0.25);
        }

        /* ---------- Content (identical system; wider card for the longer form) ---------- */
        .content {
          flex: 1;
          display: flex;
          justify-content: center;
          padding: 0 20px 56px;
          margin-top: -46px;
          position: relative;
          z-index: 2;
          background-color: var(--color-bg);
          background-repeat: repeat, no-repeat, no-repeat, no-repeat;
          background-size: 22px 22px, auto, auto, auto;
          background-image: radial-gradient(circle at 1px 1px, rgba(22, 24, 29, 0.05) 1px, transparent 0),
            radial-gradient(440px 260px at 10% -6%, color-mix(in srgb, var(--color-corner-red) 10%, transparent), transparent 62%),
            radial-gradient(440px 260px at 90% -2%, color-mix(in srgb, var(--color-accent-blue) 11%, transparent), transparent 62%),
            linear-gradient(180deg, rgba(13, 32, 54, 0.5) 0%, rgba(13, 32, 54, 0) 210px);
        }
        .card {
          --role-color: var(--color-accent-blue);
          position: relative;
          overflow: hidden;
          width: 100%;
          max-width: 560px;
          background-color: #fff;
          background-image: radial-gradient(
              280px 170px at 8% 0%,
              color-mix(in srgb, var(--role-color) 12%, transparent),
              transparent 72%
            ),
            linear-gradient(180deg, #fff 0%, #fcfbff 100%);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 26px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 12px 32px -12px rgba(22, 24, 29, 0.18);
          padding: 34px 28px 26px;
          transition: background-image 0.25s ease;
        }
        .card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 5px;
          background: linear-gradient(90deg, var(--color-corner-red) 0%, var(--color-ink) 50%, var(--color-accent-blue) 100%);
        }
        .card-texture {
          position: absolute;
          top: 0;
          right: 0;
          width: 130px;
          height: 96px;
          color: var(--color-ink);
          opacity: 0.05;
          z-index: 0;
          pointer-events: none;
        }
        .card-content {
          position: relative;
          z-index: 1;
        }

        .identity-row {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-bottom: 16px;
        }
        .role-badge {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: color-mix(in srgb, var(--role-color) 14%, #fff);
          border: 1px solid color-mix(in srgb, var(--role-color) 30%, transparent);
          color: var(--role-color);
          transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
        }
        .role-badge :global(svg) {
          width: 25px;
          height: 25px;
        }

        .eyebrow {
          font-family: var(--font-mono);
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 1.6px;
          color: color-mix(in srgb, var(--role-color) 70%, var(--color-muted));
          text-transform: uppercase;
          margin: 0 0 4px;
          transition: color 0.2s ease;
        }
        h2 {
          font-size: 21px;
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.2px;
        }
        .lede {
          font-size: 13.5px;
          color: var(--color-muted);
          margin: 0 0 22px;
          line-height: 1.5;
        }

        .field-label {
          font-size: 11.5px;
          font-weight: 600;
          color: #3a3d45;
          margin-bottom: 9px;
          display: block;
        }

        .roles {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 22px;
        }
        .role-chip {
          appearance: none;
          border: 1.5px solid var(--color-line);
          background: #fff;
          border-radius: 12px;
          padding: 8px 12px 8px 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: inherit;
          font-size: 12.5px;
          font-weight: 600;
          color: #3a3d45;
          transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
        }
        .role-chip :global(svg) {
          width: 15px;
          height: 15px;
          flex-shrink: 0;
        }
        .role-chip[data-role='player'] {
          background: color-mix(in srgb, var(--color-accent-blue) 9%, transparent);
          color: var(--color-accent-blue);
          border-color: color-mix(in srgb, var(--color-accent-blue) 20%, transparent);
        }
        .role-chip[data-role='organizer'] {
          background: color-mix(in srgb, var(--color-accent-green) 9%, transparent);
          color: var(--color-accent-green);
          border-color: color-mix(in srgb, var(--color-accent-green) 20%, transparent);
        }
        .role-chip[data-role='referee'] {
          background: color-mix(in srgb, var(--color-accent-indigo) 9%, transparent);
          color: var(--color-accent-indigo);
          border-color: color-mix(in srgb, var(--color-accent-indigo) 20%, transparent);
        }
        .role-chip[aria-pressed='true'] {
          color: #fff;
          border-color: transparent;
        }
        .role-chip[aria-pressed='true'][data-role='player'] {
          background: linear-gradient(120deg, var(--color-accent-blue), #00b8d9);
          box-shadow: 0 6px 14px -6px color-mix(in srgb, var(--color-accent-blue) 55%, transparent);
        }
        .role-chip[aria-pressed='true'][data-role='organizer'] {
          background: linear-gradient(120deg, var(--color-accent-green), #00e676);
          box-shadow: 0 6px 14px -6px color-mix(in srgb, var(--color-accent-green) 50%, transparent);
        }
        .role-chip[aria-pressed='true'][data-role='referee'] {
          background: linear-gradient(120deg, var(--color-accent-indigo), #5b6ee8);
          box-shadow: 0 6px 14px -6px color-mix(in srgb, var(--color-accent-indigo) 50%, transparent);
        }

        .field {
          margin-bottom: 14px;
        }
        .input-wrap {
          position: relative;
          display: flex;
          align-items: center;
          border: 1.5px solid color-mix(in srgb, var(--role-color) 20%, var(--color-line));
          border-radius: 14px;
          background: color-mix(in srgb, var(--role-color) 5%, #fff);
          transition: border-color 0.2s ease, box-shadow 0.15s ease, background 0.2s ease;
        }
        .input-wrap:focus-within {
          border-color: var(--role-color);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--role-color) 16%, transparent);
        }
        .input-wrap :global(svg) {
          width: 17px;
          height: 17px;
          margin-left: 13px;
          color: color-mix(in srgb, var(--role-color) 55%, var(--color-muted));
          flex-shrink: 0;
          transition: color 0.2s ease;
        }
        .input-wrap input,
        .input-wrap select {
          border: none;
          outline: none;
          background: transparent;
          width: 100%;
          padding: 12px 12px;
          font-family: inherit;
          font-size: 14px;
          color: var(--color-ink);
        }
        .input-wrap input::placeholder {
          color: #9aa0ac;
        }
        .input-wrap select:invalid {
          color: #9aa0ac;
        }
        .pw-toggle {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px 12px 6px 4px;
          color: color-mix(in srgb, var(--role-color) 55%, var(--color-muted));
          font-size: 11px;
          font-weight: 700;
          font-family: inherit;
          letter-spacing: 0.3px;
          transition: color 0.2s ease;
        }

        /* Player details: same card language, grouped intentionally. */
        .details-block {
          border: 1.5px dashed color-mix(in srgb, var(--role-color) 28%, var(--color-line));
          border-radius: 16px;
          padding: 16px 14px 2px;
          margin-bottom: 16px;
          background: color-mix(in srgb, var(--role-color) 3%, #fff);
        }
        .details-title {
          font-family: var(--font-mono);
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 1.6px;
          text-transform: uppercase;
          color: color-mix(in srgb, var(--role-color) 70%, var(--color-muted));
          margin: 0 0 12px;
        }
        .grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0 10px;
        }
        @media (max-width: 560px) {
          .grid2 {
            grid-template-columns: 1fr;
          }
        }

        .form-error {
          font-size: 12.5px;
          color: var(--color-corner-red);
          margin: 0 0 12px;
        }
        .form-warn {
          font-size: 12.5px;
          color: #93710f;
          margin: 0 0 12px;
        }

        .cta {
          width: 100%;
          border: none;
          border-radius: 14px;
          padding: 13px;
          color: #fff;
          font-family: inherit;
          font-size: 14.5px;
          font-weight: 700;
          letter-spacing: 0.2px;
          cursor: pointer;
          margin-top: 6px;
          background: var(--role-color);
          transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.05s ease;
        }
        .cta[data-role='player'] {
          background: linear-gradient(120deg, var(--color-accent-blue), #00b8d9);
          box-shadow: 0 10px 20px -10px color-mix(in srgb, var(--color-accent-blue) 60%, transparent);
        }
        .cta[data-role='organizer'] {
          background: linear-gradient(120deg, var(--color-accent-green), #00e676);
          box-shadow: 0 10px 20px -10px color-mix(in srgb, var(--color-accent-green) 55%, transparent);
        }
        .cta[data-role='referee'] {
          background: linear-gradient(120deg, var(--color-accent-indigo), #5b6ee8);
          box-shadow: 0 10px 20px -10px color-mix(in srgb, var(--color-accent-indigo) 55%, transparent);
        }
        .cta:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .cta:active:not(:disabled) {
          transform: translateY(1px);
        }

        .helper {
          text-align: center;
          margin-top: 16px;
          font-size: 12.5px;
          color: var(--color-muted);
        }
        .helper :global(a) {
          color: var(--color-ink);
          font-weight: 700;
          text-decoration: none;
          border-bottom: 1.5px solid var(--color-line);
        }
        .helper :global(a:hover) {
          border-color: var(--color-ink);
        }

        .roster-line {
          text-align: center;
          margin: 22px auto 0;
          max-width: 460px;
          font-size: 12px;
          color: var(--color-muted);
          padding: 0 20px 28px;
        }
        .roster-line :global(.mono) {
          font-family: var(--font-mono);
          color: #3a3d45;
          font-weight: 600;
        }

        @media (max-width: 560px) {
          .hero {
            padding: 32px 16px 68px;
          }
          .card {
            max-width: 416px;
            padding: 26px 20px 22px;
            border-radius: 22px;
          }
        }
      `}</style>
    </div>
  );
}
