/**
 * Pure decisions behind the account-deletion screens: no React, no network and
 * no imports, so Node's own test runner can load this file directly
 * (tests/accountDeletion.model.test.mjs, `npm test`).
 *
 * Contract: sports-mobile-main/docs/ACCOUNT_DELETION_CONTRACT.md (§4.2-§4.5).
 *
 * Everything here fails CLOSED. Anything the server did not say clearly means
 * "do not show the Delete section". The server is the real gate (allow-list
 * lock, blockers, password re-check, grace period); this file only decides what
 * to draw and how to explain a refusal.
 */

/** Fixed inside the database function. Shown in copy only; a client cannot change it. */
export const GRACE_DAYS = 14;

export interface DeletionStatus {
  /** Deletion is switched on for this account (allow-list until go-live). */
  enabled: boolean;
  /** When the pending deletion runs, or null if none is scheduled. */
  scheduledFor: string | null;
  /** The keep-my-name choice made on the pending request. */
  keepName: boolean;
}

export type DeletionView = 'hidden' | 'request' | 'pending';

/**
 * Reads the result of `public.my_account_deletion()`: always exactly one row
 * (`enabled`, `scheduled_for`, `keep_name`), which PostgREST wraps in an array.
 * Returns null for anything that is not that shape, so the caller shows nothing.
 */
export function parseStatus(raw: unknown): DeletionStatus | null {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (row === null || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  // Strictly a boolean: "true", 1 and null must not switch the section on.
  if (typeof r.enabled !== 'boolean') return null;

  const scheduled = r.scheduled_for ?? null;
  if (scheduled !== null && (typeof scheduled !== 'string' || Number.isNaN(Date.parse(scheduled)))) {
    return null;
  }

  // keep_name is null whenever no request is pending (left join).
  const keep = r.keep_name ?? null;
  if (keep !== null && typeof keep !== 'boolean') return null;

  return { enabled: r.enabled, scheduledFor: scheduled, keepName: keep === true };
}

/**
 * Which state to draw. A scheduled deletion always shows the pending state,
 * even if `enabled` has since turned false (kill switch pulled after the
 * request was queued): Cancel is never gated, so it must stay reachable.
 */
export function viewOf(status: DeletionStatus | null): DeletionView {
  if (status === null) return 'hidden';
  if (status.scheduledFor !== null) return 'pending';
  return status.enabled ? 'request' : 'hidden';
}

export interface RequestFailure {
  /** HTTP status, or null when no response arrived (network error). */
  status: number | null;
  /** Machine-readable reason from the function's own envelope, if it sent one. */
  reason: string | null;
}

/**
 * Reads what `delete-my-account` answered. Refusals come as
 * `{ success: false, data: { reason }, message }`; platform errors (bad token)
 * and network failures carry no `data.reason`.
 */
export function failureFrom(status: number | null, body: unknown): RequestFailure {
  let reason: string | null = null;
  if (body !== null && typeof body === 'object') {
    const data = (body as { data?: unknown }).data;
    if (data !== null && typeof data === 'object') {
      const candidate = (data as { reason?: unknown }).reason;
      if (typeof candidate === 'string') reason = candidate;
    }
  }
  return { status, reason };
}

interface Described {
  text: string;
  /** Point the person at support: they cannot fix this themselves. */
  support: boolean;
}

const HANDOVER: Described = {
  text: 'You organise events on MegaSportsX. Contact support to transfer them first, then delete your account.',
  support: true,
};
const MISSING_DETAILS: Described = {
  text: 'We couldn’t find the details needed to confirm this request. Contact support.',
  support: true,
};

// Written here, never copied from the server's text, so what a person reads is
// decided in one reviewed place and a changed server message cannot leak through.
const BY_REASON: Record<string, Described> = {
  wrong_password: { text: 'That password is not correct. Check it and try again.', support: false },
  not_enabled: { text: 'Account deletion isn’t available for this account yet.', support: false },
  already_scheduled: { text: 'Deletion is already scheduled for this account.', support: false },
  already_deleted: { text: 'This account has already been deleted.', support: false },
  suspended: {
    text: 'Your account is suspended, so it can’t be deleted here. Contact support and we’ll handle the request.',
    support: true,
  },
  owns_events: HANDOVER,
  owns_batches: HANDOVER,
  owns_attendance_lists: HANDOVER,
  secretary_handover: {
    text: 'Secretary accounts need an administrator to hand over their duties first. Contact support.',
    support: true,
  },
  last_admin: {
    text: 'You’re the last administrator. Appoint another administrator first, then delete your account.',
    support: false,
  },
  admin_accounts: {
    text: 'Administrator accounts can’t be deleted here. Contact support to remove an admin account.',
    support: true,
  },
  no_profile: MISSING_DETAILS,
  no_email: MISSING_DETAILS,
};

/** Explains a refusal. A known reason wins; otherwise the HTTP status decides. */
export function describeFailure(failure: RequestFailure): Described {
  if (failure.reason !== null && Object.hasOwn(BY_REASON, failure.reason)) {
    return BY_REASON[failure.reason];
  }
  switch (failure.status) {
    case 401:
      return { text: 'Your session has expired. Sign in again, then try once more.', support: false };
    case 429:
      return { text: 'Too many attempts. Wait 15 minutes, then try again.', support: false };
    case 502:
      return { text: 'We couldn’t check your password just now. Try again in a minute.', support: false };
    case null:
      return { text: 'Couldn’t reach the server. Check your connection and try again.', support: false };
    default:
      return {
        text: 'Something went wrong on our side. Try again in a minute. If it keeps happening, contact support.',
        support: true,
      };
  }
}

/** "19 October 2026", in the viewer's time zone unless one is given (tests pin it). */
export function formatScheduledDate(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone,
  }).format(new Date(iso));
}
