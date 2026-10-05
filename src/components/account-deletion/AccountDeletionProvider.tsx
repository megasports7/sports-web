'use client';

/**
 * One shared copy of "is deletion scheduled for the signed-in user?", so the
 * banner at the top of every page and the Delete section on the Profile page
 * always agree, and one's Cancel updates the other.
 *
 * Mounted once in the root layout, inside AuthProvider. It reads
 * public.my_account_deletion() when a user is signed in and nothing otherwise.
 * Anything it cannot read stays `null`, which every screen treats as "show
 * nothing" (fail closed); the server refuses an unauthorised request regardless.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  accountDeletionApi,
  type CancelResult,
  type RequestResult,
} from '@/lib/api/accountDeletion.api';
import type { DeletionStatus } from '@/lib/accountDeletion/model';

interface AccountDeletionValue {
  /** null until known, when signed out, and whenever it could not be read. */
  status: DeletionStatus | null;
  /**
   * True only when the last read for THIS user failed, so the section can
   * offer a retry instead of showing nothing. While true, `status` is null.
   * The banner ignores this and keeps showing nothing (fail closed).
   */
  loadFailed: boolean;
  /** Re-read the status for the signed-in user (the section's Retry button). */
  refresh: () => Promise<void>;
  request: (input: { password: string; keepName: boolean }) => Promise<RequestResult>;
  cancel: () => Promise<CancelResult>;
}

// A refusal that means "the state on screen is stale": re-read it so the screen
// catches up (another tab already queued it, or the switch was turned off).
const STALE_REASONS = new Set(['already_scheduled', 'not_enabled', 'already_deleted']);

const AccountDeletionContext = createContext<AccountDeletionValue | undefined>(undefined);

export function AccountDeletionProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, user } = useAuth();
  // The email identifies whose status is held. Keying on it means a different
  // person signing in on the same tab can never be shown the previous person's
  // status while their own is loading.
  const userKey = isSignedIn && user ? user.email : null;

  const [held, setHeld] = useState<{ key: string; status: DeletionStatus | null } | null>(null);
  const status = held !== null && held.key === userKey ? held.status : null;
  // Keyed the same way: a failed read for one person must never show a retry
  // box (or hide one) for the next person on the same tab. api.status() only
  // returns null when the read failed, so null here means "could not tell".
  const [failedHeld, setFailedHeld] = useState<{ key: string; failed: boolean } | null>(null);
  const loadFailed = failedHeld !== null && failedHeld.key === userKey ? failedHeld.failed : false;

  useEffect(() => {
    if (userKey === null) return;
    let live = true;
    accountDeletionApi.status().then((next) => {
      if (!live) return;
      setHeld({ key: userKey, status: next });
      setFailedHeld({ key: userKey, failed: next === null });
    });
    return () => {
      live = false;
    };
  }, [userKey]);

  const refresh = useCallback(async () => {
    if (userKey === null) return;
    const next = await accountDeletionApi.status();
    setHeld({ key: userKey, status: next });
    setFailedHeld({ key: userKey, failed: next === null });
  }, [userKey]);

  const request = useCallback<AccountDeletionValue['request']>(
    async (input) => {
      const result = await accountDeletionApi.request(input);
      if (result.ok || (result.reason !== null && STALE_REASONS.has(result.reason))) {
        await refresh();
      }
      return result;
    },
    [refresh],
  );

  const cancel = useCallback<AccountDeletionValue['cancel']>(async () => {
    const result = await accountDeletionApi.cancel();
    if (result.ok) await refresh();
    return result;
  }, [refresh]);

  const value = useMemo(
    () => ({ status, loadFailed, refresh, request, cancel }),
    [status, loadFailed, refresh, request, cancel],
  );

  return <AccountDeletionContext.Provider value={value}>{children}</AccountDeletionContext.Provider>;
}

export function useAccountDeletion(): AccountDeletionValue {
  const ctx = useContext(AccountDeletionContext);
  if (!ctx) throw new Error('useAccountDeletion must be used within an AccountDeletionProvider');
  return ctx;
}
