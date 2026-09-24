'use client';

import { PortalSectionPage } from '@/components/secretary/PortalSectionPage';
import { PlayersSection } from '@/components/secretary/PlayersSection';

export default function StateSecretaryPlayersPage() {
  return (
    <PortalSectionPage kind="state_secretary" title="Players" bare>
      {({ perms, players, loading, scope, error }) => {
        if (loading) return <p className="text-muted">Loading players…</p>;
        if (error && players.length === 0) return <p className="text-error">{error}</p>;
        if (!perms.includes('view_players'))
          return <p className="text-muted">Needs the view_players permission — ask an admin.</p>;
        return <PlayersSection players={players} scopeLabel={scope?.label ?? 'state'} kind="state_secretary" />;
      }}
    </PortalSectionPage>
  );
}
