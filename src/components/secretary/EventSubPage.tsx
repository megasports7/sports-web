'use client';

/**
 * Shared shell for the split secretary event subpages (step 2, both
 * portals): scope gate + title + tab nav once, section content per page.
 */
import { basePathFor, useSecretaryEvent } from '@/components/secretary/useSecretaryEvent';
import type { SecretaryKind } from '@/lib/api/secretary.api';
import { EventNav, eventNavItems } from '@/components/secretary/EventNav';
import { usePathname } from 'next/navigation';
import type { SecretaryPermission } from '@/lib/types';

const ACCENT: Record<SecretaryKind, string> = {
  district_secretary: 'var(--color-role-district-secretary)',
  state_secretary: 'var(--color-role-state-secretary)',
};

export function EventSubPage({
  kind,
  eventId,
  title,
  bare,
  children,
}: {
  kind: SecretaryKind;
  eventId: string;
  title: string;
  /** Skip the built-in title+tabs when the section renders its own approved header. */
  bare?: boolean;
  children: (
    eventId: string,
    perms: SecretaryPermission[],
    event: NonNullable<ReturnType<typeof useSecretaryEvent>['event']>,
    scopeLabel: string,
  ) => React.ReactNode;
}) {
  const { scope, event, perms, loading, error } = useSecretaryEvent(kind, eventId);
  const pathname = usePathname();

  if (loading) return <p className="text-muted">Loading event…</p>;
  if (!event) return <p className="text-error">{error ?? 'Event not in your scope.'}</p>;

  const base = basePathFor(kind);

  if (bare) {
    return <div className="event-page">{children(eventId, perms, event, scope?.label ?? '')}</div>;
  }

  return (
    <div className="event-page">
      <h1>
        {event.event_name} — {title}
      </h1>
      <EventNav items={eventNavItems(base, eventId)} activeHref={pathname} accentVar={ACCENT[kind]} />
      {children(eventId, perms, event, scope?.label ?? '')}
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
