'use client';

/**
 * Organizer/associate permission hook (checkbox program v1).
 *
 * CONVENIENCE ONLY -- never the security boundary. Returns the caller's own
 * live grant rows for hide/disable of actions; RLS + RPC gates authorize
 * every write regardless. `perms === null` means unknown (loading or read
 * failure, e.g. Step 1-4 migrations not yet applied): callers MUST render
 * actions as today (fail-open display) in that case. Works for both
 * organizer and associate roles -- rows are per-account, no inheritance.
 */
import { useEffect, useState } from 'react';
import { organizerApi } from '@/lib/api/organizer.api';
import type { OrganizerPermission } from '@/lib/types';

export function useOrganizerPermissions(): {
  perms: OrganizerPermission[] | null;
  loading: boolean;
} {
  const [perms, setPerms] = useState<OrganizerPermission[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    organizerApi
      .myPermissions()
      .then((res) => {
        if (!live) return;
        if (res.success && res.data) setPerms(res.data);
        else setPerms(null);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  return { perms, loading };
}

/** Convenience gate: unknown (null) counts as allowed -- fail-open display
 *  until the read resolves or when the permission store is unreachable. */
export function canDo(perms: OrganizerPermission[] | null, p: OrganizerPermission): boolean {
  if (perms === null) return true;
  return perms.includes(p);
}
