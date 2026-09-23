'use client';

/**
 * Step 1 of the event-page split: shared tab bar for the secretary event
 * section (both portals). Items are anchor links to the sections of the
 * single event page for now; step 2 swaps the hrefs to the split routes
 * (registrations / batches / certificates) without touching this component.
 * Tabs whose permission is missing are hidden -- the backend enforces
 * regardless; callers pass only the tabs the caller may see.
 */
import Link from 'next/link';

export interface EventNavItem {
  label: string;
  href: string;
}

/** Route hrefs for the split event section (step 2). */
export function eventNavItems(basePath: string, eventId: string): EventNavItem[] {
  return [
    { label: 'Overview', href: `${basePath}/events/${eventId}` },
    { label: 'Registrations', href: `${basePath}/events/${eventId}/registrations` },
    { label: 'Batches', href: `${basePath}/events/${eventId}/batches` },
    { label: 'Certificates', href: `${basePath}/events/${eventId}/certificates` },
  ];
}

export function EventNav({ items }: { items: EventNavItem[] }) {
  if (items.length === 0) return null;
  return (
    <nav className="event-nav" aria-label="Event sections">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className="event-nav-link">
          {item.label}
        </Link>
      ))}
      <style jsx>{`
        .event-nav {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .event-nav-link {
          border: 1px solid var(--color-line);
          border-radius: 999px;
          padding: 6px 14px;
          font-size: 12.5px;
          font-weight: 700;
          color: var(--color-ink);
          background: var(--color-surface);
          text-decoration: none;
        }
      `}</style>
    </nav>
  );
}
