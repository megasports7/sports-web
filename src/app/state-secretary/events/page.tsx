'use client';

import { PortalSectionPage } from '@/components/secretary/PortalSectionPage';
import { SecretaryEventsSection } from '@/components/secretary/SecretaryEventsSection';

export default function StateSecretaryEventsPage() {
  return (
    <PortalSectionPage kind="state_secretary" title="Events">
      {({ perms, events }) => (
        <SecretaryEventsSection
          events={events}
          basePath="/state-secretary"
          canMonitor={perms.includes('manage_registrations')}
        />
      )}
    </PortalSectionPage>
  );
}
