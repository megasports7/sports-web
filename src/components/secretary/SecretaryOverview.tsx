'use client';

/**
 * Secretary portal dashboard (both portals): scope banner data + key
 * cards linking to Players / Events / Profile. Previously this page
 * rendered the full roster + event list inline (under the misleading
 * "Roster" tab), which buried navigation. Each card shows live counts
 * and the permission behind it; missing grants render a locked hint.
 * Section visibility is convenience only -- RLS enforces regardless.
 */
import Link from 'next/link';
import { useSecretaryPortal } from '@/components/secretary/useSecretaryEvent';
import type { SecretaryKind } from '@/lib/api/secretary.api';

export function SecretaryOverview({ kind, basePath }: { kind: SecretaryKind; basePath: string }) {
  const { scope, perms, players, events, loading, error } = useSecretaryPortal(kind);

  if (loading)
    return <p className="text-muted">Loading {kind === 'district_secretary' ? 'district' : 'state'} dashboard…</p>;
  if (error && !scope) return <p className="text-error">{error}</p>;

  const canViewPlayers = perms.includes('view_players');
  const canMonitor = perms.includes('manage_registrations');

  const cards = [
    {
      title: 'Players',
      href: `${basePath}/players`,
      desc: canViewPlayers ? `${players.length} players in your jurisdiction.` : 'Player roster.',
      locked: !canViewPlayers,
      lockHint: 'Needs view_players — ask an admin.',
    },
    {
      title: 'Events',
      href: `${basePath}/events`,
      desc: canMonitor ? `${events.length} events in scope.` : 'Events in your jurisdiction.',
      locked: !canMonitor,
      lockHint: 'Needs manage_registrations — ask an admin.',
    },
    {
      title: 'Profile',
      href: `${basePath}/profile`,
      desc: `${scope?.label ?? 'Your scope'} · ${perms.length} permission${perms.length === 1 ? '' : 's'}.`,
      locked: false,
      lockHint: '',
    },
  ];

  return (
    <div className="overview">
      <div className="head">
        <h1>{kind === 'district_secretary' ? 'District' : 'State'} dashboard</h1>
        <p>
          {scope ? `Viewing ${scope.label} scope.` : ''} Pick a section below — each page shows only what your admin
          permissions allow.
        </p>
      </div>
      {error && <p className="text-error">{error}</p>}
      <div className="hub">
        {cards.map((c) => (
          <Link key={c.title} href={c.href} className="hub-card">
            <strong>{c.title}</strong>
            <span>{c.desc}</span>
            {c.locked && <span className="locked">{c.lockHint}</span>}
          </Link>
        ))}
      </div>
      <style jsx>{`
        .overview {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .head h1 {
          font-size: 20px;
          font-weight: 800;
          margin: 0;
        }
        .head p {
          margin: 4px 0 0;
          font-size: 13.5px;
          color: var(--color-muted);
        }
        .hub {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
        }
        .hub-card {
          display: flex;
          flex-direction: column;
          gap: 4px;
          border: 1px solid var(--color-line);
          border-radius: 14px;
          padding: 16px 18px;
          background: var(--color-surface);
          text-decoration: none;
          color: var(--color-ink);
        }
        .hub-card strong {
          font-size: 15px;
        }
        .hub-card span {
          font-size: 12.5px;
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
