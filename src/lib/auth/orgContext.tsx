'use client';

/**
 * Phase 4 (admin-in-organizer-context) — context plumbing.
 *
 * OrgContextHost (mounted once in the organizer layout) derives the active
 * organizer context from ?org=<uuid> and pushes it into two places:
 *   1. organizerApi.setOrgContextUid() -- read/operation scoping for the
 *      existing organizer service layer (self-identity profile/photo calls
 *      are excluded inside organizer.api.ts and keep using the real uid).
 *   2. The module-level org-param store below, so OrganizerNav can preserve
 *      ?org= across in-dashboard navigation without every link parsing it.
 *
 * Rules (context is navigation-only, never authorization):
 * - Active ONLY when signed-in role is admin AND ?org= is uuid-shaped AND
 *   the profile it points at has role 'organizer' AND the current path is
 *   not a self-identity page (/organizer/profile, /organizer/id-card).
 * - Anything else -> override cleared; admins without a valid context see
 *   their own (empty) scope exactly as before.
 * - Authorization stays in RLS + RPC ownership checks; actor identity stays
 *   server-stamped from auth.uid(). A forged ?org= yields no access.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { setOrgContextUid } from '@/lib/api/organizer.api';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SELF_PAGES = ['/organizer/profile', '/organizer/id-card'];

let currentOrgParam: string | null = null;
const listeners = new Set<() => void>();

export function setOrgContextParam(v: string | null) {
  if (currentOrgParam === v) return;
  currentOrgParam = v;
  listeners.forEach((fn) => fn());
}

export function useOrgParam(): string | null {
  return useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => {
        listeners.delete(notify);
      };
    },
    () => currentOrgParam,
    // Server snapshot: no context during prerender; the host hydrates it.
    () => null,
  );
}

/** Append ?org= to an in-dashboard href when a context is active; identity otherwise. */
export function withOrg(href: string, org: string | null): string {
  return org ? `${href}?org=${org}` : href;
}

type Mode = 'off' | 'on' | 'invalid';

type Decision = 'off' | 'invalid' | 'fetch';

interface Verification {
  org: string;
  ok: boolean;
  name: string | null;
}

export function OrgContextHost() {
  const params = useSearchParams();
  const pathname = usePathname();
  const { user } = useAuth();
  // Async verification result only; everything else derives during render
  // (the repo's react-hooks/set-state-in-effect rule forbids synchronous
  // setState inside effect bodies -- cf. the admin list page pattern).
  const [verification, setVerification] = useState<Verification | null>(null);

  const org = params.get('org');
  const role = user?.role;

  // Sync part of the decision, computed during render (not state).
  let decision: Decision = 'off';
  if (role === 'admin' && org) {
    if (!UUID_RE.test(org)) decision = 'invalid';
    else if (SELF_PAGES.some((p) => (pathname ?? '').startsWith(p))) decision = 'off';
    else decision = 'fetch';
  }

  // Optimistic scoping, applied synchronously during render (idempotent
  // module writes, not React state). This closes the first-load race where
  // pages fetch before the async verification below resolves: with the
  // override already in place, the first fetch is correctly scoped. Safe
  // because every read/write is still authorized fail-closed by RLS + RPC
  // ownership checks -- a forged ?org= only ever yields empty/denied, and
  // the verification effect clears the override when the target is not an
  // organizer.
  if (decision === 'fetch' && org) {
    setOrgContextUid(org);
    setOrgContextParam(org);
  } else {
    setOrgContextUid(null);
    setOrgContextParam(null);
  }

  useEffect(() => {
    // Verification only confirms (banner) or revokes (fail closed) the
    // optimistic scope above; React state is touched in the async callback.
    if (decision !== 'fetch' || !org) return;
    let cancelled = false;
    createClient()
      .from('profiles')
      .select('name, role')
      .eq('id', org)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        // Points at a non-organizer, a missing profile, or an unreadable
        // row: revoke the optimistic scope, explicit notice, fail closed.
        const ok = data?.role === 'organizer';
        if (!ok) {
          setOrgContextUid(null);
          setOrgContextParam(null);
        }
        setVerification({ org, ok, name: ok ? ((data?.name as string) ?? null) : null });
      });
    return () => {
      cancelled = true;
    };
  }, [decision, org]);

  // Hygiene: never let a scope outlive the dashboard (e.g. navigating to a
  // non-organizer area unmounts the host; the next mount re-derives).
  useEffect(
    () => () => {
      setOrgContextUid(null);
      setOrgContextParam(null);
    },
    [],
  );

  // Stale verifications (previous ?org=) are ignored by id comparison, so
  // no reset-setState is needed when the param changes.
  const verified = decision === 'fetch' && verification && verification.org === org ? verification : null;
  const mode: Mode = decision === 'invalid' ? 'invalid' : !verified ? 'off' : verified.ok ? 'on' : 'invalid';
  const orgName = verified?.ok ? verified.name : null;

  if (mode === 'off') return null;

  return (
    <div
      role="status"
      style={{
        background: mode === 'on' ? '#fef2f2' : '#f3f4f6',
        borderBottom: `1px solid ${mode === 'on' ? '#fecaca' : '#e5e7eb'}`,
        color: mode === 'on' ? '#991b1b' : '#4b5563',
        fontSize: 13,
        fontWeight: 600,
        padding: '8px 36px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      {mode === 'on' ? (
        <>
          <span>
            Admin view — acting in {orgName ?? 'this organizer'}&apos;s context. Changes you make are attributed
            to you (admin).
          </span>
          <Link href="/admin" style={{ color: '#1d4ed8', textDecoration: 'underline' }}>
            Back to admin
          </Link>
        </>
      ) : (
        <span>Invalid organizer context (?org=) — showing your own dashboard scope.</span>
      )}
    </div>
  );
}
