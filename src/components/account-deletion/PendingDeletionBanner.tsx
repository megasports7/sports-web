'use client';

/**
 * Strip across the top of every page while a deletion is scheduled for the
 * signed-in user, with the date and a Cancel button (contract §4.4: the account
 * stays fully usable during the grace period, so this is the reminder).
 *
 * Rendered once from the root layout, so it covers every role. It shows nothing
 * unless the server reports a scheduled deletion for this account.
 */
import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { formatScheduledDate, viewOf } from '@/lib/accountDeletion/model';
import { useAccountDeletion } from './AccountDeletionProvider';
import styles from './AccountDeletion.module.css';

export function PendingDeletionBanner() {
  // Same key as the provider's held status. A different person signing in on
  // the same tab (or signing out) remounts the body below, so they can never
  // see the previous person's confirmation or error text. No effect needed.
  const { isSignedIn, user } = useAuth();
  const userKey = isSignedIn && user ? user.email : null;
  return <BannerBody key={userKey ?? 'signed-out'} />;
}

function BannerBody() {
  const { status, cancel } = useAccountDeletion();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Cancelling removes the banner, so confirm it with a short note that stays
  // until it is closed.
  const [cancelled, setCancelled] = useState(false);

  async function cancelDeletion() {
    setBusy(true);
    setError(null);
    const result = await cancel();
    setBusy(false);
    if (result.ok) setCancelled(true);
    else setError(result.text);
  }

  if (status !== null && viewOf(status) === 'pending' && status.scheduledFor !== null) {
    return (
      <div className={styles.banner}>
        <div className={styles.bannerInner}>
          <p className={styles.bannerText}>
            Your account is scheduled for deletion on <strong>{formatScheduledDate(status.scheduledFor)}</strong>. You
            can keep using MegaSportsX until then.
          </p>
          <button type="button" className={styles.bannerBtn} onClick={cancelDeletion} disabled={busy}>
            {busy ? 'Cancelling…' : 'Cancel deletion'}
          </button>
          {error && (
            <p role="alert" className={styles.bannerError}>
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (cancelled) {
    return (
      <div className={`${styles.banner} ${styles.bannerDone}`}>
        <div className={styles.bannerInner}>
          <p role="status" className={styles.bannerText}>
            Deletion cancelled. Your account will stay as it is.
          </p>
          <button type="button" className={styles.bannerBtn} onClick={() => setCancelled(false)}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return null;
}
