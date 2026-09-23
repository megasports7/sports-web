'use client';

/**
 * Shared shell for the split secretary event subpages (step 2, both
 * portals): scope gate + title + tab nav once, section content per page.
 */
import { basePathFor, useSecretaryEvent } from '@/components/secretary/useSecretaryEvent';
import type { SecretaryKind } from '@/lib/api/secretary.api';
import { EventNav, eventNavItems } from '@/components/secretary/EventNav';
import type { SecretaryPermission } from '@/lib/types';

export function EventSubPage({
  kind,
  eventId,
  title,
  children,
}: {
  kind: SecretaryKind;
  eventId: string;
  title: string;
  children: (eventId: string, perms: SecretaryPermission[]) => React.ReactNode;
}) {
  const { event, perms, loading, error } = useSecretaryEvent(kind, eventId);

  if (loading) return <p className="text-muted">Loading event…</p>;
  if (!event) return <p className="text-error">{error ?? 'Event not in your scope.'}</p>;

  const base = basePathFor(kind);

  return (
    <div className="event-page">
      <h1>
        {event.event_name} — {title}
      </h1>
      <EventNav items={eventNavItems(base, eventId)} />
      {children(eventId, perms)}
      <style jsx>{`
        .event-page {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .event-page h1 {
          font-size: 20px;
          font-weight: 800;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
