'use client';

/**
 * Shared shell for both secretary portals (plan v2 Step 6): nav + scope
 * banner + section gating off the live grant set. The two route trees
 * (district-secretary / state-secretary) are thin wrappers passing kind +
 * basePath; all logic lives here and in secretary.api.ts so the portals
 * cannot drift into two implementations.
 *
 * Section visibility is convenience only -- every read/review below is
 * authorized per statement by RLS (grant + jurisdiction), so hiding a
 * section never grants or denies anything by itself.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { SecretaryKind } from '@/lib/api/secretary.api';

export function SecretaryShell({
  kind,
  basePath,
  scopeLabel,
  accentVar,
  children,
}: {
  kind: SecretaryKind;
  basePath: string;
  scopeLabel: string;
  accentVar: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const links = [
    { href: basePath, label: 'Dashboard', exact: true },
    { href: `${basePath}/players`, label: 'Players', exact: false },
    { href: `${basePath}/events`, label: 'Events', exact: false },
    { href: `${basePath}/profile`, label: 'Profile', exact: false },
  ];
  const title = kind === 'district_secretary' ? 'District Secretary' : 'State Secretary';

  return (
    <div className="shell">
      <div className="scope-banner" role="status">
        <span>
          {title} — viewing {scopeLabel} scope. Supervisory access only; changes you are allowed to
          make are attributed to you.
        </span>
      </div>
      <nav className="nav">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={l.exact ? (pathname === l.href ? 'active' : '') : pathname.startsWith(l.href) ? 'active' : ''}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <main className="main">{children}</main>

      <style jsx>{`
        .shell {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }
        .scope-banner {
          background: color-mix(in srgb, ${accentVar} 10%, transparent);
          border-bottom: 1px solid color-mix(in srgb, ${accentVar} 25%, transparent);
          color: color-mix(in srgb, ${accentVar} 70%, #1a1d23);
          font-size: 13px;
          font-weight: 600;
          padding: 8px 36px;
        }
        .nav {
          display: flex;
          gap: 4px;
          padding: 8px 36px 0;
          border-bottom: 1px solid var(--color-line);
          background: var(--color-surface);
        }
        .nav a {
          padding: 8px 14px;
          font-size: 13.5px;
          font-weight: 600;
          color: var(--color-muted);
          border-bottom: 2px solid transparent;
          text-decoration: none;
        }
        .nav a.active {
          color: ${accentVar};
          border-bottom-color: ${accentVar};
        }
        .main {
          padding: 20px 36px 40px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-width: 1100px;
        }
      `}</style>
    </div>
  );
}
