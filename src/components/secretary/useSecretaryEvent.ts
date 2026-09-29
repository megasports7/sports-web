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
  type SecretaryPlayer,
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

export interface SecretaryPortalState {
  scope: SecretaryScope | null;
  perms: SecretaryPermission[];
  players: SecretaryPlayer[];
  events: SecretaryEvent[];
  loading: boolean;
  error: string | null;
}

/**
 * Portal-level loader for the dashboard / players / events pages: scope
 * first, then grants + roster + event list fan out. Section visibility is
 * convenience only -- RLS authorizes every row regardless.
 */
export function useSecretaryPortal(kind: SecretaryKind): SecretaryPortalState {
  const [scope, setScope] = useState<SecretaryScope | null>(null);
  const [perms, setPerms] = useState<SecretaryPermission[]>([]);
  const [players, setPlayers] = useState<SecretaryPlayer[]>([]);
  const [events, setEvents] = useState<SecretaryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    secretaryApi.scope().then((sRes) => {
      if (!sRes.success || !sRes.data) {
        setError(sRes.message || 'Could not load your scope — ask an admin to check the assignment.');
        setLoading(false);
        return;
      }
      const sc = sRes.data;
      setScope(sc);
      Promise.all([secretaryApi.myPermissions(), secretaryApi.roster(), secretaryApi.events(sc)]).then(
        ([pRes, rRes, eRes]) => {
          if (pRes.success && pRes.data) setPerms(pRes.data);
          if (rRes.success && rRes.data) setPlayers(rRes.data);
          else if (!rRes.success) setError(rRes.message || 'Could not load players');
          if (eRes.success && eRes.data) setEvents(eRes.data);
          else if (!eRes.success) setError(eRes.message || 'Could not load events');
          setLoading(false);
        },
      );
    });
  }, [kind]);

  return { scope, perms, players, events, loading, error };
}
