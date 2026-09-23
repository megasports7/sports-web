'use client';

import { PortalSectionPage } from '@/components/secretary/PortalSectionPage';
import { RosterSection } from '@/components/secretary/RosterSection';

export default function StateSecretaryPlayersPage() {
  return (
    <PortalSectionPage kind="state_secretary" title="Players">
      {({ perms, players, loading, error }) =>
        perms.includes('view_players') ? (
          <RosterSection players={players} loading={loading} error={error} />
        ) : (
          <p className="text-muted">Needs the view_players permission — ask an admin.</p>
        )
      }
    </PortalSectionPage>
  );
}
