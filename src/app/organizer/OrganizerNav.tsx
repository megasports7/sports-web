'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';

const LINKS = [
  { href: '/organizer', label: 'Dashboard' },
  { href: '/organizer/events', label: 'Events' },
  { href: '/organizer/id-card', label: 'ID Card' },
  { href: '/organizer/profile', label: 'Profile' },
];

function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" />
    </svg>
  );
}

export function OrganizerNav() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <nav className="nav">
      <div className="nav-row">
        <Link href="/organizer" className="brand">
          <span className="mark">
            <svg viewBox="0 0 22 22">
              <path d="M11 2a9 9 0 0 1 0 18 9 9 0 0 0 0-18Z" fill="var(--color-corner-red)" />
              <path d="M11 2a9 9 0 0 0 0 18 9 9 0 0 1 0-18Z" fill="var(--color-accent-green)" />
            </svg>
          </span>
          MegaSportsX
        </Link>

        <div className="tabs-desktop">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={`tab ${pathname === link.href ? 'active' : ''}`}>
              {link.label}
            </Link>
          ))}
        </div>

        <button onClick={() => signOut()} className="signout-desktop">
          Sign out
        </button>

        <button className="menu-btn" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {open && (
        <div className="mobile-menu">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`mobile-tab ${pathname === link.href ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="mobile-signout"
          >
            Sign out
          </button>
        </div>
      )}

      <style jsx>{`
        .nav {
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-line);
        }
        .nav-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 36px;
        }
        /* next/link renders a custom component, not a plain <a> -- styled-jsx
           only auto-scopes native DOM elements it can see directly in this
           file's JSX, so a className handed to <Link> never gets the scope
           attribute. :global() is required for every selector that targets
           a <Link>'s own className (as opposed to a native element nested
           inside one, like .mark below, which scopes normally). */
        :global(.brand) {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-right: 18px;
          font-weight: 700;
          font-size: 16px;
          color: var(--color-ink);
          text-decoration: none;
          flex-shrink: 0;
        }
        .mark {
          width: 22px;
          height: 22px;
          flex-shrink: 0;
        }
        .tabs-desktop {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: nowrap;
          overflow: hidden;
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
          background: linear-gradient(120deg, var(--color-accent-green), #00e676);
          color: #fff;
          box-shadow: 0 4px 10px -4px color-mix(in srgb, var(--color-accent-green) 50%, transparent);
        }
        .signout-desktop {
          margin-left: auto;
          font-size: 13.5px;
          font-weight: 600;
          color: var(--color-muted);
          padding: 7px 10px;
          background: none;
          border: none;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
        }

        .menu-btn {
          display: none;
          margin-left: auto;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1.5px solid var(--color-line);
          background: var(--color-surface);
          color: var(--color-ink);
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }
        .menu-btn svg {
          width: 18px;
          height: 18px;
        }

        .mobile-menu {
          display: none;
        }

        /* Below this, the tab row genuinely can't fit the brand, tabs, and
           sign-out without wrapping into a messy multi-row nav -- collapse
           into a hamburger + dropdown instead of letting it wrap. Same
           breakpoint as PlayerNav.tsx for a consistent feel across roles. */
        @media (max-width: 820px) {
          .tabs-desktop,
          .signout-desktop {
            display: none;
          }
          .menu-btn {
            display: flex;
          }
          .mobile-menu {
            display: flex;
            flex-direction: column;
            gap: 2px;
            padding: 8px 20px 14px;
            border-top: 1px solid var(--color-line);
          }
          :global(.mobile-tab) {
            padding: 11px 12px;
            border-radius: 10px;
            font-size: 14.5px;
            font-weight: 600;
            color: #3a3d45;
            text-decoration: none;
          }
          :global(.mobile-tab.active) {
            background: color-mix(in srgb, var(--color-accent-green) 10%, transparent);
            color: var(--color-accent-green);
          }
          .mobile-signout {
            margin-top: 6px;
            text-align: left;
            padding: 11px 12px;
            font-size: 14px;
            font-weight: 600;
            color: var(--color-muted);
            background: none;
            border: none;
            border-top: 1px solid var(--color-line);
            border-radius: 0;
            cursor: pointer;
            font-family: inherit;
          }
        }

        @media (max-width: 460px) {
          .nav-row {
            padding: 10px 16px;
          }
          :global(.brand) {
            font-size: 14.5px;
          }
        }
      `}</style>
    </nav>
  );
}
