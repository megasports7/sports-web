'use client';

/**
 * Design-system nav, matching PlayerNav.tsx/OrganizerNav.tsx's pattern
 * exactly -- brand mark, gradient-pill active tab, sign-out. Referee's own
 * role accent is blue -- specifically the indigo-to-blue pairing
 * (var(--color-accent-indigo) -> var(--color-accent-blue)), a deeper pair
 * than player's own nav gradient (plain var(--color-accent-blue) ->
 * #00b8d9), so the two roles stay visually distinguishable despite both
 * living in the blue family. Landed here after iterating through violet
 * and green in design review -- the user's explicit call, not a default;
 * this was never decided in docs/M7_CONTRACT.md ("no 3rd accent color
 * decided yet").
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';

const LINKS = [
  { href: '/referee', label: 'Dashboard' },
  { href: '/referee/matches', label: 'Matches' },
  { href: '/referee/id-card', label: 'ID Card' },
  { href: '/referee/profile', label: 'Profile' },
];

export function RefereeNav() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <nav className="nav">
      <Link href="/referee" className="brand">
        <span className="mark">
          <svg viewBox="0 0 22 22">
            <path d="M11 2a9 9 0 0 1 0 18 9 9 0 0 0 0-18Z" fill="var(--color-corner-red)" />
            <path d="M11 2a9 9 0 0 0 0 18 9 9 0 0 1 0-18Z" fill="var(--color-accent-blue)" />
          </svg>
        </span>
        MegaSportsX
      </Link>

      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} className={`tab ${pathname === link.href ? 'active' : ''}`}>
          {link.label}
        </Link>
      ))}

      <button onClick={() => signOut()} className="signout">
        Sign out
      </button>

      <style jsx>{`
        .nav {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px;
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-line);
          padding: 10px 36px;
        }
        /* next/link renders a custom component, not a plain <a> -- styled-jsx
           only auto-scopes native DOM elements it can see directly in this
           file's JSX, so a className handed to <Link> never gets the scope
           attribute. :global() is required for every selector that targets
           a <Link>'s own className. Same convention as Player/OrganizerNav. */
        :global(.brand) {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-right: 14px;
          font-weight: 700;
          font-size: 16px;
          color: var(--color-ink);
          text-decoration: none;
        }
        .mark {
          width: 22px;
          height: 22px;
          flex-shrink: 0;
        }
        :global(.tab) {
          padding: 8px 14px;
          border-radius: 10px;
          font-size: 14.5px;
          font-weight: 600;
          color: #3a3d45;
          text-decoration: none;
          white-space: nowrap;
        }
        :global(.tab.active) {
          background: linear-gradient(120deg, var(--color-accent-indigo), var(--color-accent-blue));
          color: #fff;
          box-shadow: 0 4px 10px -4px color-mix(in srgb, var(--color-accent-indigo) 50%, transparent);
        }
        .signout {
          margin-left: auto;
          font-size: 13.5px;
          font-weight: 600;
          color: var(--color-muted);
          padding: 7px 10px;
          background: none;
          border: none;
          cursor: pointer;
          font-family: inherit;
        }
      `}</style>
    </nav>
  );
}
