'use client';

/**
 * Event monitor page (both portals share this shape via per-role wrappers):
 * loads the event header through secretaryApi.events(scope) so an out-of-scope
 * id renders "not in scope" instead of leaking existence, then renders the
 * shared EventDetail (registrations + review + results + certificates).
 */
import { use, useEffect, useState } from 'react';
import {
  secretaryApi,
  type SecretaryEvent,
  type SecretaryKind,
} from '@/lib/api/secretary.api';
import type { SecretaryPermission } from '@/lib/types';
import { EventDetail } from '@/components/secretary/EventDetail';

export function SecretaryEventPage({ kind, eventId }: { kind: SecretaryKind; eventId: string }) {
  const [event, setEvent] = useState<SecretaryEvent | null>(null);
  const [canReview, setCanReview] = useState(false);
  const [canManageBatches, setCanManageBatches] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    secretaryApi.scope().then((sRes) => {
      if (!sRes.success || !sRes.data || sRes.data.kind !== kind) {
        setError('Could not load your scope.');
        setLoading(false);
        return;
      }
      Promise.all([secretaryApi.events(sRes.data), secretaryApi.myPermissions()]).then(
        ([eRes, pRes]) => {
          const found = (eRes.data ?? []).find((e) => e.event_id === eventId) ?? null;
          setEvent(found);
          if (!found) setError('Event not in your scope.');
          else setError(null);
          if (pRes.success && pRes.data) {
            const perms = pRes.data as SecretaryPermission[];
            setCanReview(perms.includes('verify_players'));
            setCanManageBatches(perms.includes('manage_batches'));
          }
          setLoading(false);
        },
      );
    });
  }, [eventId, kind]);

  if (loading) return <p className="text-muted">Loading event…</p>;
  if (!event) return <p className="text-error">{error ?? 'Event not in your scope.'}</p>;
  return <EventDetail event={event} canReview={canReview} canManageBatches={canManageBatches} />;
}

export function useEventId(params: Promise<{ id: string }>): string {
  return use(params).id;
}
