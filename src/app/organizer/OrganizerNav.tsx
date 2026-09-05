'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';

const LINKS = [
  { href: '/organizer', label: 'Dashboard' },
  { href: '/organizer/events', label: 'Events' },
  { href: '/organizer/id-card', label: 'ID Card' },
  { href: '/organizer/profile', label: 'Profile' },
];

export function OrganizerNav() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-line bg-surface px-4 py-2">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            pathname === link.href ? 'bg-accent-green text-surface' : 'text-ink hover:bg-bg'
          }`}
        >
          {link.label}
        </Link>
      ))}
      <button
        onClick={() => signOut()}
        className="ml-auto rounded-md px-3 py-1.5 text-sm font-medium text-muted hover:bg-bg"
      >
        Sign out
      </button>
    </nav>
  );
}
