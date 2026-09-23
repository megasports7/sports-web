'use client';

import { PortalSectionPage } from '@/components/secretary/PortalSectionPage';
import { PlayersSection } from '@/components/secretary/PlayersSection';

export default function StateSecretaryPlayersPage() {
  return (
    <PortalSectionPage kind="state_secretary" title="Players">
      {({ perms, players, loading, scope }) => {
        if (loading) return <p className="text-muted">Loading players…</p>;
        if (!perms.includes('view_players'))
          return <p className="text-muted">Needs the view_players permission — ask an admin.</p>;
        return <PlayersSection players={players} scopeLabel={scope?.label ?? 'state'} />;
      }}
    </PortalSectionPage>
  );
}
