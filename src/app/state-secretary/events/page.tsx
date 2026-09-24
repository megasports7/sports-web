'use client';

import { PortalSectionPage } from '@/components/secretary/PortalSectionPage';
import { SecretaryEventsSection } from '@/components/secretary/SecretaryEventsSection';

export default function StateSecretaryEventsPage() {
  return (
    <PortalSectionPage kind="state_secretary" title="Events" bare>
      {({ perms, events, scope }) => (
        <SecretaryEventsSection
          events={events}
          basePath="/state-secretary"
          canMonitor={perms.includes('manage_registrations')}
          scopeLabel={scope?.label ?? 'state'}
          kind="state_secretary"
        />
      )}
    </PortalSectionPage>
  );
}
