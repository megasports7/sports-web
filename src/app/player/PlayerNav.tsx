'use client';

/**
 * Plain functional nav for v1 -- per docs/M7_CONTRACT.md's Phase 2 timing
 * decision, the real visual design pass (mobile's palette/icons adapted to
 * web) is deliberately deferred until the backend side is proven working.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';

const LINKS = [
  { href: '/player', label: 'Dashboard' },
  { href: '/player/events', label: 'Events' },
  { href: '/player/matches', label: 'Matches' },
  { href: '/player/certificates', label: 'Certificates' },
  { href: '/player/id-card', label: 'ID Card' },
  { href: '/player/profile', label: 'Profile' },
];

export function PlayerNav() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-white px-4 py-2">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            pathname === link.href ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          {link.label}
        </Link>
      ))}
      <button
        onClick={() => signOut()}
        className="ml-auto rounded-md px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100"
      >
        Sign out
      </button>
    </nav>
  );
}
