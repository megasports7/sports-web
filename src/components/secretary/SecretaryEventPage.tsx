'use client';

/**
 * Event monitor page (both portals share this shape via per-role wrappers).
 * Step 1 of the split: scope/permission loading now comes from the shared
 * useSecretaryEvent hook; this page renders the EventNav tabs + an overview
 * hub of section cards, with the existing full EventDetail kept live below
 * until step 2 moves each section to its own route.
 */
import { basePathFor, useSecretaryEvent } from '@/components/secretary/useSecretaryEvent';
import type { SecretaryKind } from '@/lib/api/secretary.api';
import { EventNav } from '@/components/secretary/EventNav';
import { EventDetail } from '@/components/secretary/EventDetail';
import { use } from 'react';

export function SecretaryEventPage({ kind, eventId }: { kind: SecretaryKind; eventId: string }) {
  const { event, perms, loading, error } = useSecretaryEvent(kind, eventId);

  if (loading) return <p className="text-muted">Loading event…</p>;
  if (!event) return <p className="text-error">{error ?? 'Event not in your scope.'}</p>;

  const base = basePathFor(kind);
  const canReview = perms.includes('verify_players');
  const canManageBatches = perms.includes('manage_batches');
  const canManageMatches = perms.includes('manage_matches');
  const canIssueCerts = perms.includes('certificate_ops');

  const hub = [
    {
      label: 'Registrations',
      href: `${base}/events/${eventId}#registrations`,
      desc: 'Approve, reject, or override player registrations.',
      locked: !canReview,
      lockHint: 'Needs verify_players — ask an admin.',
    },
    {
      label: 'Batches',
      href: `${base}/events/${eventId}#batches`,
      desc: 'Create batches from approved registrations.',
      locked: !canManageBatches,
      lockHint: 'Needs manage_batches — ask an admin.',
    },
    {
      label: 'Matches',
      href: `${base}/events/${eventId}#matches`,
      desc: 'Start matches and declare winners, batch by batch.',
      locked: !canManageMatches,
      lockHint: 'Needs manage_matches — ask an admin.',
    },
    {
      label: 'Certificates',
      href: `${base}/events/${eventId}#certificates`,
      desc: 'Issue certificates for decided batches.',
      locked: !canIssueCerts,
      lockHint: 'Needs certificate_ops — ask an admin.',
    },
  ];

  return (
    <div className="event-page">
      <h1>{event.event_name}</h1>
      {error && <p className="text-error">{error}</p>}
      <EventNav items={hub.map((h) => ({ label: h.label, href: h.href }))} />
      <div className="hub">
        {hub.map((h) => (
          <a key={h.label} href={h.href} className="hub-card">
            <strong>{h.label}</strong>
            <span>{h.desc}</span>
            {h.locked && <span className="locked">{h.lockHint}</span>}
          </a>
        ))}
      </div>
      <EventDetail
        event={event}
        canReview={canReview}
        canManageBatches={canManageBatches}
        canManageMatches={canManageMatches}
        canIssueCerts={canIssueCerts}
      />
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
        .hub {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 10px;
        }
        .hub-card {
          display: flex;
          flex-direction: column;
          gap: 4px;
          border: 1px solid var(--color-line);
          border-radius: 14px;
          padding: 12px 14px;
          background: var(--color-surface);
          text-decoration: none;
          color: var(--color-ink);
        }
        .hub-card strong {
          font-size: 13.5px;
        }
        .hub-card span {
          font-size: 12px;
          color: var(--color-muted);
        }
        .hub-card .locked {
          color: #b42318;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}

export function useEventId(params: Promise<{ id: string }>): string {
  return use(params).id;
}
