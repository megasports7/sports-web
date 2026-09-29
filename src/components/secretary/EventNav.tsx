'use client';

/**
 * Shared tab bar for the secretary event section (both portals): Overview
 * / Registrations / Batches / Certificates in the approved event-detail
 * design language (underline tabs, accent active state, count badges).
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

export function EventNav({
  items,
  activeHref,
  counts,
  accentVar,
}: {
  items: EventNavItem[];
  activeHref: string;
  counts?: Record<string, string>;
  accentVar: string;
}) {
  if (items.length === 0) return null;
  const norm = (h: string) => h.replace(/\/+$/, '') || '/';
  const active = norm(activeHref);
  return (
    <nav className="event-nav" aria-label="Event sections">
      {items.map((item) => {
        const on = norm(item.href) === active;
        return (
          <Link key={item.href} href={item.href} className={on ? 'tab on' : 'tab'} aria-current={on ? 'page' : undefined}>
            {item.label}
            {counts?.[item.href] != null && <span className="tab-count">{counts[item.href]}</span>}
          </Link>
        );
      })}
      <style jsx>{`
        .event-nav {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 2px;
        }
        .event-nav :global(.tab) {
          display: inline-flex;
          gap: 7px;
          align-items: center;
          padding: 8px 16px;
          font-size: 13.5px;
          font-weight: 700;
          color: var(--color-muted);
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 999px;
          white-space: nowrap;
          text-decoration: none;
          transition: background 120ms ease, color 120ms ease, border-color 120ms ease, transform 80ms ease;
        }
        .event-nav :global(.tab):hover {
          color: var(--color-ink);
          border-color: #c8cfd8;
          background: #f7f8fa;
        }
        .event-nav :global(.tab):active {
          transform: scale(0.96);
        }
        .event-nav :global(.tab.on) {
          color: #fff;
          background: ${accentVar};
          border-color: ${accentVar};
          box-shadow: 0 1px 3px rgba(16, 20, 24, 0.25);
        }
        .event-nav :global(.tab.on):hover {
          background: ${accentVar};
          color: #fff;
        }
        .tab-count {
          font-size: 12px;
          font-weight: 700;
          background: #eef0f3;
          color: #5b6470;
          border-radius: 999px;
          padding: 2px 9px;
        }
        .event-nav :global(.tab.on) .tab-count {
          background: rgba(255, 255, 255, 0.22);
          color: #fff;
        }
      `}</style>
    </nav>
  );
}
