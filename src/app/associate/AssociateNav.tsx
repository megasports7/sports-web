'use client';

/**
 * Plain functional nav, matching player/organizer/referee/admin's own
 * starting point before the design-system pass (running separately -- see
 * docs/M7_CONTRACT.md). Two links only -- mirrors mobile's AssociateTabs.tsx
 * exactly (Attendance, Profile).
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';

const LINKS = [
  { href: '/associate', label: 'Attendance' },
  { href: '/associate/profile', label: 'Profile' },
];

export function AssociateNav() {
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
