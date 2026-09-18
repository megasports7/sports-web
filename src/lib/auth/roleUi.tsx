/**
 * Shared role UI for the auth pages (login + signup): labels, per-role
 * design-token colors, and one icon per role tied to what the role does.
 * Extracted verbatim from login/page.tsx so both pages render from one
 * source of truth instead of drifting duplicates. `currentColor` icons
 * follow the parent chip/badge color -- no CSS class needed, which also
 * sidesteps styled-jsx's scoping.
 */
import type { UserRole } from '@/lib/types';

export const ROLE_LABEL: Record<UserRole, string> = {
  player: 'Player',
  organizer: 'Organizer',
  referee: 'Referee',
  admin: 'Admin',
  associate: 'Associate',
};

// Each role's --role-color is a var() reference into the app's shared design
// tokens (globals.css), not a re-hardcoded hex -- one source of truth.
export const ROLE_COLOR_VAR: Record<UserRole, string> = {
  player: 'var(--color-accent-blue)',
  organizer: 'var(--color-accent-green)',
  referee: 'var(--color-accent-indigo)',
  admin: 'var(--color-role-admin)',
  associate: 'var(--color-accent-violet)',
};

export function RoleIcon({ role }: { role: UserRole }) {
  switch (role) {
    case 'player':
      return (
        <svg viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="6.2" r="3.2" fill="currentColor" />
          <path
            d="M3.5 17c.6-4 3-6.2 6.5-6.2s5.9 2.2 6.5 6.2c.1.6-.4 1-1 1H4.5c-.6 0-1.1-.4-1-1Z"
            fill="currentColor"
          />
        </svg>
      );
    case 'organizer':
      return (
        <svg viewBox="0 0 20 20" fill="none">
          <path
            d="M4 3.5v13M4 4l9 2.2-2.4 3.3L13 12.8 4 15"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'referee':
      return (
        <svg viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="11" r="5.4" stroke="currentColor" strokeWidth={1.5} />
          <path
            d="M10 8.2V11l2.2 1.3M8.6 2.6h2.8M14 4.6l1 1"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </svg>
      );
    case 'admin':
      return (
        <svg viewBox="0 0 20 20" fill="none">
          <path
            d="M10 2.6 15.5 5v4.4c0 4-2.4 6.8-5.5 8-3.1-1.2-5.5-4-5.5-8V5L10 2.6Z"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'associate':
      return (
        <svg viewBox="0 0 20 20" fill="none">
          <rect x="4.5" y="3.6" width="11" height="13.4" rx="1.6" stroke="currentColor" strokeWidth={1.5} />
          <rect x="7.5" y="2.4" width="5" height="2.6" rx="1" fill="currentColor" />
          <path d="M7 9.6h6M7 12.6h6M7 15h4" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
        </svg>
      );
  }
}
