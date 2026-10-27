'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import styles from './DistrictSecretaryResponsive.module.css';

/** Mobile-only navigation. The desktop sidebar and auth implementation stay shared. */
export function DistrictSecretaryNavigation({ links, scopeLabel }: {
  links: { href: string; label: string; exact: boolean }[];
  scopeLabel: string;
}) {
  const { signOut } = useAuth();
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    dialog.current?.close();
  }, [pathname]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 861px)');
    const closeOnDesktop = () => { if (desktop.matches) dialog.current?.close(); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  return (
    <header className={styles.mobileHeader}>
      <button
        type="button"
        className={styles.menuButton}
        aria-label="Open district secretary menu"
        aria-haspopup="dialog"
        aria-controls="district-secretary-menu"
        aria-expanded={open}
        onClick={() => { dialog.current?.showModal(); setOpen(true); }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        Menu
      </button>
      <span className={styles.mobileTitle}>MegaSportsX<span>District Secretary</span></span>
      <button type="button" className={styles.logout} onClick={() => signOut()}>Sign out</button>
      <dialog
        ref={dialog}
        id="district-secretary-menu"
        className={styles.navigationDrawer}
        aria-labelledby="district-secretary-menu-title"
        onClose={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return;
          const targets = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]');
          const first = targets[0];
          const last = targets[targets.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}
      >
        <div className={styles.drawerContent}>
          <div className={styles.drawerHeading}>
            <h2 id="district-secretary-menu-title">District Secretary</h2>
            <button type="button" className={styles.menuButton} onClick={() => dialog.current?.close()} aria-label="Close menu">✕</button>
          </div>
          <nav aria-label="District Secretary navigation">
            {links.map((link) => {
              const active = pathname === link.href || (!link.exact && pathname.startsWith(`${link.href}/`));
              return (
                <Link key={link.href} href={link.href} aria-current={active ? 'page' : undefined} onClick={() => dialog.current?.close()}>
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <p className={styles.jurisdiction}>Jurisdiction<strong>{scopeLabel}</strong></p>
          <button type="button" className={styles.logout} onClick={() => signOut()}>Sign out</button>
        </div>
      </dialog>
    </header>
  );
}
