'use client';

/**
 * LOGIN PROTOTYPE v2 — split-screen premium sports direction.
 * Route: /login/prototype (reachable without session via proxy's /login* exclusion).
 * UI-ONLY: never calls signIn(). Submit runs real client-side validation, then
 * simulates latency and shows either a generic "Invalid credentials" demo error
 * (when the email contains "fail") or a "would call signIn(...)" demo success.
 * Real login stays untouched at /login.
 *
 * Confirmed from implementation (not assumed):
 * - 7 roles (ROLE_LABEL / ROLE_PATH in roleUi.tsx); signup only for
 *   player/organizer/referee (signup/page.tsx SIGNUP_ROLES).
 * - Web has NO forgot-password route (repo grep: only mobile's
 *   ForgotPassword screen references it) — so no forgot link is rendered.
 * - Generic "Invalid credentials" on role mismatch (AuthContext + proxy contract).
 */

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { ROLE_COLOR_VAR, ROLE_LABEL, ROLE_PATH, RoleIcon } from '@/lib/auth/roleUi';
import type { UserRole } from '@/lib/types';

const ROLES: { value: UserRole; blurb: string }[] = [
  { value: 'player', blurb: 'Register for events, track matches & certificates' },
  { value: 'organizer', blurb: 'Run events, batches & registrations' },
  { value: 'referee', blurb: 'Score matches on assigned batches' },
  { value: 'admin', blurb: 'Manage users & platform settings' },
  { value: 'associate', blurb: 'Mark attendance · login issued by Admin' },
  { value: 'district_secretary', blurb: 'Supervise events & players in your district' },
  { value: 'state_secretary', blurb: 'Supervise events & players across your state' },
];

const SHOW_SIGNUP_FOR: UserRole[] = ['player', 'organizer', 'referee'];

export default function LoginPrototypePage() {
  const [role, setRole] = useState<UserRole>('player');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [simulated, setSimulated] = useState<null | { email: string; role: UserRole }>(null);

  // ---- Role dropdown (compact selector, full keyboard support) ----
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open ]);

  useEffect(() => {
    if (open) optionRefs.current[activeIdx]?.focus();
  }, [open, activeIdx]);

  function selectRole(value: UserRole, idx: number) {
    setRole(value);
    setActiveIdx(idx);
    setOpen(false);
    setAuthError(null);
    setSimulated(null);
    buttonRef.current?.focus();
  }

  function onButtonKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActiveIdx(ROLES.findIndex((r) => r.value === role));
      setOpen(true);
    }
  }

  function onOptionKey(e: KeyboardEvent, idx: number) {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((idx + 1) % ROLES.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((idx - 1 + ROLES.length) % ROLES.length);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectRole(ROLES[idx].value, idx);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  }

  // ---- Form ----
  function validate(): boolean {
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email.trim())) next.email = 'Enter a valid email address';
    if (!password) next.password = 'Password is required';
    else if (password.length < 4) next.password = 'Password must be at least 4 characters';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setSimulated(null);
    if (!validate()) return;
    setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      // Demo error path mirrors prod's deliberately generic message.
      if (/fail|unknown|error/i.test(email)) {
        setAuthError('Invalid credentials');
      } else {
        setSimulated({ email: email.trim(), role });
      }
    }, 900);
  }

  const selected = ROLES.find((r) => r.value === role)!;

  return (
    <div className="page" style={{ '--role-color': ROLE_COLOR_VAR[role] } as React.CSSProperties}>
      {/* ============ Brand side ============ */}
      <section className="brand" aria-label="About MegaSportsX">
        <svg className="court" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <g fill="none" stroke="#ffffff" strokeWidth="1.5">
            <rect x="120" y="90" width="360" height="620" />
            <line x1="120" y1="300" x2="480" y2="300" />
            <line x1="120" y1="500" x2="480" y2="500" />
            <line x1="300" y1="90" x2="300" y2="710" />
            <line x1="120" y1="395" x2="480" y2="395" strokeWidth="3" />
            <line x1="170" y1="90" x2="170" y2="710" opacity="0.55" />
            <line x1="430" y1="90" x2="430" y2="710" opacity="0.55" />
          </g>
        </svg>
        <div className="brand-glow" aria-hidden="true" />
        <div className="brand-inner">
          <span className="brandmark">
            <span className="brandmark-ball" aria-hidden="true" />
            <span className="brandmark-word">
              MegaSportsX<small>TOURNAMENT PLATFORM</small>
            </span>
          </span>
          <div className="brand-body">
            <p className="brand-eyebrow">TANDING · SENI</p>
            <h1>One account. Every corner of the tournament.</h1>
            <p className="brand-lede">
              Register for bouts, follow brackets, officiate matches and pull
              certificates — players, organizers, referees and officials sign in here.
            </p>
          </div>
          <div className="brand-meta">
            <span className="as-chip">
              <RoleIcon role={role} /> Signing in as {ROLE_LABEL[role]}
            </span>
          </div>
        </div>
      </section>

      {/* ============ Auth side ============ */}
      <main className="panel">
        <div className="panel-inner">
          <p className="proto-flag">
            PROTOTYPE — UI only, no backend call · <Link href="/login">Use real login</Link>
          </p>

          <h2>Welcome back</h2>
          <p className="lede">Sign in to manage your matches, brackets and certificates.</p>

          <div className="field">
            <span className="field-label" id="proto-role-label">I am signing in as</span>
            <div className="select" ref={rootRef}>
              <button
                ref={buttonRef}
                type="button"
                className="select-btn"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-labelledby="proto-role-label"
                onClick={() => {
                  setActiveIdx(ROLES.findIndex((r) => r.value === role));
                  setOpen((v) => !v);
                }}
                onKeyDown={onButtonKey}
              >
                <span className="select-current">
                  <RoleIcon role={role} />
                  <span>
                    <strong>{ROLE_LABEL[role]}</strong>
                    <small>{selected.blurb}</small>
                  </span>
                </span>
                <svg className={`chev ${open ? 'up' : ''}`} viewBox="0 0 16 16" aria-hidden="true">
                  <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {open && (
                <ul className="menu" role="listbox" aria-labelledby="proto-role-label" ref={undefined}>
                  {ROLES.map((r, idx) => (
                    <li key={r.value} role="option" aria-selected={role === r.value}>
                      <button
                        ref={(el) => { optionRefs.current[idx] = el; }}
                        type="button"
                        className="option"
                        data-active={role === r.value}
                        onClick={() => selectRole(r.value, idx)}
                        onKeyDown={(e) => onOptionKey(e, idx)}
                        tabIndex={-1}
                      >
                        <RoleIcon role={r.value} />
                        <span>
                          <strong>{ROLE_LABEL[r.value]}</strong>
                          <small>{r.blurb}</small>
                        </span>
                        {role === r.value && <span className="check" aria-hidden="true">✓</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="proto-email">Email</label>
              <input
                id="proto-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'proto-email-err' : undefined}
              />
              {errors.email && <p id="proto-email-err" className="field-error">{errors.email}</p>}
            </div>

            <div className="field">
              <label htmlFor="proto-password">Password</label>
              <div className="pw-wrap">
                <input
                  id="proto-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'proto-password-err' : undefined}
                />
                <button type="button" className="pw-toggle" onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
              {errors.password && <p id="proto-password-err" className="field-error">{errors.password}</p>}
            </div>

            {authError && (
              <p className="auth-error" role="alert">
                {authError}
                <span> Demo preview — nothing was sent. Tip: remove “fail” from the email to see the success state.</span>
              </p>
            )}

            <button type="submit" className="cta" disabled={submitting}>
              {submitting ? (
                <span className="loading"><span className="spinner" aria-hidden="true" />Signing in…</span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {simulated && (
            <div className="sim" role="status">
              <strong>Illustrative result — nothing was sent.</strong>
              <p>
                Would call <span className="mono">signIn({simulated.email}, ••••, {simulated.role})</span>
                {' '}then push <span className="mono">/{ROLE_PATH[simulated.role]}</span>.
              </p>
              <button type="button" className="sim-reset" onClick={() => setSimulated(null)}>Reset demo</button>
            </div>
          )}

          {SHOW_SIGNUP_FOR.includes(role) ? (
            <p className="helper">New to the platform? <Link href="/signup">Create an account</Link></p>
          ) : (
            <p className="helper muted">Use credentials shared by Admin.</p>
          )}

          <p className="helper small">
            <Link href="/privacy-policy">Privacy Policy</Link>
            <span aria-hidden="true"> · </span>
            <Link href="/account-deletion">Account &amp; data deletion</Link>
          </p>
        </div>
      </main>

      <style jsx>{`
        .page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr;
          background: var(--color-bg);
        }

        /* ---------- Brand side ---------- */
        .brand {
          position: relative;
          overflow: hidden;
          background: #0a1628;
          color: #fff;
          min-height: 380px;
          display: flex;
        }
        .court {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0.14;
        }
        .brand-glow {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(520px 340px at 18% 8%, rgba(0, 145, 234, 0.35), transparent 65%),
            radial-gradient(460px 380px at 88% 92%, rgba(232, 73, 45, 0.22), transparent 65%);
        }
        .brand-inner {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 28px;
          width: 100%;
          max-width: 560px;
          margin: 0 auto;
          padding: 28px 28px 32px;
        }
        .brandmark { display: inline-flex; align-items: center; gap: 11px; }
        .brandmark-ball {
          width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
          background: conic-gradient(from 210deg, var(--color-corner-red), #ff8a5c, var(--color-accent-blue), #0a1628, var(--color-corner-red));
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.16), 0 8px 24px rgba(0, 0, 0, 0.45);
        }
        .brandmark-word { font-weight: 800; font-size: 17px; letter-spacing: 0.2px; }
        .brandmark-word small {
          display: block; font-family: var(--font-mono); font-weight: 500;
          font-size: 9px; letter-spacing: 2px; color: rgba(255, 255, 255, 0.6);
        }
        .brand-eyebrow {
          font-family: var(--font-mono); font-size: 11px; font-weight: 700;
          letter-spacing: 2.4px; color: #ffb59d; margin: 0 0 12px;
          display: flex; align-items: center; gap: 10px;
        }
        .brand-eyebrow::before { content: ''; width: 26px; height: 2px; background: var(--color-corner-red); }
        .brand h1 {
          font-size: clamp(30px, 4.5vw, 50px);
          line-height: 1.06;
          letter-spacing: -1px;
          font-weight: 800;
          margin: 0 0 14px;
          text-wrap: balance;
        }
        .brand-lede {
          font-size: 15px; line-height: 1.6;
          color: rgba(255, 255, 255, 0.75);
          max-width: 42ch; margin: 0;
        }
        .brand-meta { display: flex; flex-wrap: wrap; gap: 10px; }
        .as-chip {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 12.5px; font-weight: 700;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: rgba(255, 255, 255, 0.08);
          border-radius: 999px; padding: 8px 14px 8px 10px;
          color: #fff;
        }
        .as-chip :global(svg) { width: 16px; height: 16px; color: var(--role-color); }

        /* ---------- Auth side ---------- */
        .panel { display: flex; justify-content: center; padding: 36px 24px 56px; }
        .panel-inner { width: 100%; max-width: 400px; margin: auto 0; }
        .proto-flag {
          font-family: var(--font-mono); font-size: 11px;
          background: #fff8e1; border: 1px solid #f0d97a; border-radius: 10px;
          padding: 8px 12px; margin: 0 0 22px; color: #6b5e00;
        }
        .proto-flag :global(a) { font-weight: 700; color: #6b5e00; }
        .panel h2 { font-size: 26px; font-weight: 800; letter-spacing: -0.4px; margin: 0 0 6px; }
        .lede { font-size: 13.5px; color: var(--color-muted); margin: 0 0 24px; line-height: 1.55; }

        .field { margin-bottom: 16px; }
        .field-label, .field label {
          display: block; font-size: 12.5px; font-weight: 700; color: #2b2e36; margin-bottom: 7px;
        }
        .field input {
          width: 100%; font-family: inherit; font-size: 14.5px; color: var(--color-ink);
          background: #fff; border: 1.5px solid var(--color-line);
          border-radius: 10px; padding: 12px 14px; outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .field input::placeholder { color: #9aa0ac; }
        .field input:hover { border-color: #cfccc5; }
        .field input:focus { border-color: var(--role-color); box-shadow: 0 0 0 3px color-mix(in srgb, var(--role-color) 18%, transparent); }
        .field input[aria-invalid='true'] { border-color: var(--color-corner-red); }
        .field-error { font-size: 12.5px; color: var(--color-corner-red); margin: 6px 0 0; }

        .pw-wrap { position: relative; }
        .pw-wrap input { padding-right: 72px; }
        .pw-toggle {
          position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          font-size: 11px; font-weight: 800; letter-spacing: 0.5px;
          color: var(--color-muted); padding: 8px 10px; border-radius: 8px;
        }
        .pw-toggle:hover { color: var(--color-ink); background: rgba(22, 24, 29, 0.05); }

        /* Role selector */
        .select { position: relative; }
        .select-btn {
          width: 100%; cursor: pointer; font-family: inherit; text-align: left;
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          background: #fff; border: 1.5px solid var(--color-line);
          border-radius: 10px; padding: 10px 12px 10px 14px;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .select-btn:hover { border-color: #cfccc5; }
        .select-btn:focus-visible { border-color: var(--role-color); box-shadow: 0 0 0 3px color-mix(in srgb, var(--role-color) 18%, transparent); }
        .select-current { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .select-current :global(svg) { width: 20px; height: 20px; color: var(--role-color); flex-shrink: 0; }
        .select-current strong, .option strong { display: block; font-size: 13.5px; }
        .select-current small, .option small { display: block; font-size: 11.5px; color: var(--color-muted); font-weight: 400; }
        .chev { width: 16px; height: 16px; flex-shrink: 0; color: var(--color-muted); transition: transform 0.15s ease; }
        .chev.up { transform: rotate(180deg); }
        .menu {
          position: absolute; z-index: 20; left: 0; right: 0; top: calc(100% + 6px);
          list-style: none; margin: 0; padding: 6px;
          background: #fff; border: 1px solid var(--color-line); border-radius: 12px;
          box-shadow: 0 18px 44px -16px rgba(22, 24, 29, 0.35);
          max-height: 320px; overflow: auto;
        }
        .option {
          width: 100%; cursor: pointer; font-family: inherit; text-align: left;
          display: flex; align-items: center; gap: 10px;
          border: none; background: none; border-radius: 8px; padding: 9px 10px;
        }
        .option :global(svg) { width: 20px; height: 20px; color: var(--color-muted); flex-shrink: 0; }
        .option:hover { background: rgba(22, 24, 29, 0.045); }
        .option:focus-visible { outline: 2px solid var(--color-accent-blue); outline-offset: -2px; }
        .option[data-active='true'] { background: color-mix(in srgb, var(--role-color) 9%, #fff); }
        .option[data-active='true'] :global(svg) { color: var(--role-color); }
        .check { margin-left: auto; font-weight: 800; color: var(--role-color); }

        .auth-error {
          font-size: 13px; font-weight: 700; color: #8f1d0e;
          background: #fdecea; border: 1px solid #f3b3ab;
          border-radius: 10px; padding: 10px 14px; margin: 0 0 14px;
        }
        .auth-error span { display: block; font-weight: 400; font-size: 12px; margin-top: 2px; }

        .cta {
          width: 100%; border: none; border-radius: 10px; padding: 13px;
          background: var(--color-ink); color: #fff;
          font-family: inherit; font-size: 14.5px; font-weight: 800; letter-spacing: 0.4px;
          cursor: pointer; transition: transform 0.05s ease, opacity 0.15s ease, background 0.15s ease;
        }
        .cta:hover:not(:disabled) { background: #000; }
        .cta:active:not(:disabled) { transform: translateY(1px); }
        .cta:disabled { opacity: 0.65; cursor: default; }
        .loading { display: inline-flex; align-items: center; gap: 10px; }
        .spinner {
          width: 15px; height: 15px; border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.35); border-top-color: #fff;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .sim {
          margin-top: 18px; background: #fff; border: 1.5px dashed var(--role-color);
          border-radius: 12px; padding: 14px 16px; font-size: 13px; line-height: 1.55;
        }
        .sim p { margin: 6px 0 10px; color: #3a3d45; }
        .mono { font-family: var(--font-mono); font-size: 12px; }
        .sim-reset {
          background: none; border: 1.5px solid var(--color-line); border-radius: 10px;
          padding: 7px 12px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer;
        }

        .helper { text-align: center; font-size: 13px; color: var(--color-muted); margin: 20px 0 0; }
        .helper :global(a) { color: var(--color-ink); font-weight: 800; }
        .helper.muted { font-size: 12.5px; }
        .helper.small { font-size: 12.5px; }

        /* ---------- Desktop split ---------- */
        @media (min-width: 1024px) {
          .page { grid-template-columns: 46% 54%; }
          .brand { min-height: 100vh; position: sticky; top: 0; height: 100vh; }
          .brand-inner { padding: 40px 48px 44px; }
          .panel { padding: 48px; }
        }
        @media (max-width: 1023px) {
          .brand { min-height: 0; }
          .brand h1 { font-size: clamp(26px, 6vw, 34px); }
          .brand-lede { font-size: 13.5px; }
        }
      `}</style>
    </div>
  );
}
