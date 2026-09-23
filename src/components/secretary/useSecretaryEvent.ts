'use client';

/**
 * Step 1 of the event-page split: shared plumbing for every secretary
 * event subpage (both portals). Loads scope, checks this event is in
 * scope (out-of-scope ids render "not in scope" instead of leaking
 * existence), and loads the permission set once. Previously inline in
 * SecretaryEventPage; extracted so overview / registrations / batches /
 * batch-manage / certificates all share one loader instead of five copies.
 */
import { useEffect, useState } from 'react';
import {
  secretaryApi,
  type SecretaryEvent,
  type SecretaryKind,
  type SecretaryScope,
} from '@/lib/api/secretary.api';
import type { SecretaryPermission } from '@/lib/types';

export interface SecretaryEventState {
  scope: SecretaryScope | null;
  event: SecretaryEvent | null;
  perms: SecretaryPermission[];
  loading: boolean;
  error: string | null;
}

export function basePathFor(kind: SecretaryKind): string {
  return kind === 'district_secretary' ? '/district-secretary' : '/state-secretary';
}

export function useSecretaryEvent(kind: SecretaryKind, eventId: string): SecretaryEventState {
  const [scope, setScope] = useState<SecretaryScope | null>(null);
  const [event, setEvent] = useState<SecretaryEvent | null>(null);
  const [perms, setPerms] = useState<SecretaryPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    secretaryApi.scope().then((sRes) => {
      if (!sRes.success || !sRes.data || sRes.data.kind !== kind) {
        setError('Could not load your scope.');
        setLoading(false);
        return;
      }
      const sc = sRes.data;
      setScope(sc);
      Promise.all([secretaryApi.events(sc), secretaryApi.myPermissions()]).then(([eRes, pRes]) => {
        const found = (eRes.data ?? []).find((e) => e.event_id === eventId) ?? null;
        setEvent(found);
        if (!found) setError('Event not in your scope.');
        else setError(null);
        if (pRes.success && pRes.data) setPerms(pRes.data);
        setLoading(false);
      });
    });
  }, [eventId, kind]);

  return { scope, event, perms, loading, error };
}
