'use client';

/**
 * Shared shell for both secretary portals: approved sidebar chrome
 * (MegaSportsX brand, icon nav, jurisdiction card) around the page.
 * The two route trees (district-secretary / state-secretary) are thin
 * wrappers passing kind + basePath; all logic lives here and in
 * secretary.api.ts so the portals cannot drift into two implementations.
 *
 * Section visibility is convenience only -- every read/review below is
 * authorized per statement by RLS (grant + jurisdiction), so hiding a
 * section never grants or denies anything by itself.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import type { SecretaryKind } from '@/lib/api/secretary.api';

function NavIcon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  switch (name) {
    case 'grid':
      return (
        <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
      );
    case 'users':
      return (
        <svg {...common}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" /><circle cx="17" cy="9" r="2.6" /><path d="M16 15.2c2.6.3 4.6 1.9 5.3 4.3" /></svg>
      );
    case 'trophy':
      return (
        <svg {...common}><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 5H4.5a.5.5 0 0 0-.5.5C4 8 6 10 8.2 10" /><path d="M16 5h3.5a.5.5 0 0 1 .5.5C20 8 18 10 15.8 10" /><path d="M12 13v4" /><path d="M8.5 20.5h7" /><path d="M10 17h4" /></svg>
      );
    case 'id':
      return (
        <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="11" r="2" /><path d="M5.5 16.5c.6-1.8 1.7-2.7 3-2.7s2.4.9 3 2.7" /><path d="M14 9.5h4.5" /><path d="M14 13h4.5" /></svg>
      );
    default:
      return null;
  }
}

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
  const { signOut } = useAuth();
  const norm = pathname.replace(/\/+$/, '') || '/';
  const links = [
    { href: basePath, label: 'Dashboard', exact: true, icon: 'grid' },
    { href: `${basePath}/players`, label: 'Players', exact: false, icon: 'users' },
    { href: `${basePath}/events`, label: 'Events', exact: false, icon: 'trophy' },
    { href: `${basePath}/profile`, label: 'Profile', exact: false, icon: 'id' },
  ];
  const title = kind === 'district_secretary' ? 'District Secretary' : 'State Secretary';

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <span className="mark">
            <svg width="30" height="30" viewBox="0 0 22 22">
              <path d="M11 2a9 9 0 0 1 0 18 9 9 0 0 0 0-18Z" fill="var(--color-corner-red)" />
              <path d="M11 2a9 9 0 0 0 0 18 9 9 0 0 1 0-18Z" fill="var(--color-accent-green)" />
            </svg>
          </span>
          <span className="brand-text">
            <strong>MegaSportsX</strong>
            <span>{title}</span>
          </span>
        </div>
        <nav>
          {links.map((l) => {
            const on = l.exact ? norm === l.href : norm === l.href || norm.startsWith(`${l.href}/`);
            return (
              <Link key={l.href} href={l.href} className={on ? 'item on' : 'item'}>
                <NavIcon name={l.icon} />
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="juris">
          <span className="j-label">Jurisdiction</span>
          <strong>{scopeLabel}</strong>
          <span className="j-sub">{title} · supervisory</span>
        </div>
        <button onClick={() => signOut()} className="signout">
          Sign out
        </button>
      </aside>
      <main className="main">{children}</main>

      <style jsx>{`
        .shell {
          display: flex;
          min-height: 100vh;
          background: #e9ebef;
        }
        .side {
          width: 232px;
          flex-shrink: 0;
          background: #101418;
          color: #cfd4da;
          display: flex;
          flex-direction: column;
          gap: 18px;
          padding: 20px 14px;
          position: sticky;
          top: 0;
          height: 100vh;
        }
        .brand {
          display: flex;
          gap: 10px;
          align-items: center;
          justify-content: flex-start;
          text-align: left;
          padding: 2px 6px;
        }
        .mark {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .brand-text {
          display: flex;
          flex-direction: column;
          line-height: 1.25;
        }
        .brand-text strong {
          font-size: 14.5px;
          color: #fff;
        }
        .brand-text span {
          font-size: 11.5px;
          color: #8b939e;
        }
        nav {
          display: flex;
          flex-direction: column;
          gap: 2px;
          align-items: stretch;
        }
        .shell :global(.item) {
          display: flex;
          gap: 10px;
          align-items: center;
          justify-content: flex-start;
          text-align: left;
          line-height: 1.5;
          padding: 9px 12px;
          border-radius: 9px;
          font-size: 13.5px;
          font-weight: 600;
          color: #9aa2ad;
          text-decoration: none;
          transition: background 120ms ease, color 120ms ease;
        }
        .shell :global(.item) svg {
          flex-shrink: 0;
          display: block;
        }
        .shell :global(.item):hover {
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
        }
        .shell :global(.item):active {
          background: rgba(255, 255, 255, 0.11);
        }
        .shell :global(.item.on) {
          background: color-mix(in srgb, ${accentVar} 18%, transparent);
          color: #fff;
          box-shadow: inset 3px 0 0 ${accentVar};
        }
        .shell :global(.item.on):hover {
          background: color-mix(in srgb, ${accentVar} 26%, transparent);
        }
        .juris {
          margin-top: auto;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .j-label {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          color: #8b939e;
        }
        .juris strong {
          font-size: 14px;
          color: #fff;
        }
        .j-sub {
          font-size: 11.5px;
          color: #8b939e;
        }
        .signout {
          padding: 9px 12px;
          font-size: 13.5px;
          font-weight: 600;
          color: #9aa2ad;
          background: none;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 9px;
          cursor: pointer;
          font-family: inherit;
          text-align: left;
        }
        .main {
          flex: 1;
          min-width: 0;
          padding: 26px 30px 40px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        @media (max-width: 860px) {
          .side {
            width: 64px;
            padding: 16px 10px;
          }
          .brand-text, .item {
            font-size: 0;
            gap: 0;
            justify-content: center;
          }
          .item {
            padding: 10px;
          }
          .juris, .signout, .brand-text {
            display: none;
          }
          .main {
            padding: 20px 16px 32px;
          }
        }
      `}</style>
    </div>
  );
}
