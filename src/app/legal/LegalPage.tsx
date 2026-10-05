import Link from 'next/link';
import type { ReactNode } from 'react';
import { LEGAL } from '@/lib/legal';
import styles from './legal.module.css';

/** Shared chrome for the public (no-login) legal pages. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <p className={styles.brand}>{LEGAL.appName}</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.meta}>
            {LEGAL.appName} (Android package {LEGAL.appPackage}) &middot; Effective {LEGAL.effectiveDate}
          </p>
        </div>
      </header>
      <main className={styles.body}>
        {children}
        <p className={styles.footer}>
          <Link href="/privacy-policy">Privacy Policy</Link> &middot;{' '}
          <Link href="/account-deletion">Account &amp; data deletion</Link> &middot; Contact:{' '}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>
        </p>
      </main>
    </div>
  );
}

export { styles as legalStyles };
