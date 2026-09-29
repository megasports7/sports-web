'use client';

import { PortalSectionPage } from '@/components/secretary/PortalSectionPage';
import { SecretaryEventsSection } from '@/components/secretary/SecretaryEventsSection';

export default function DistrictSecretaryEventsPage() {
  return (
    <PortalSectionPage kind="district_secretary" title="Events" bare>
      {({ perms, events, scope }) => (
        <SecretaryEventsSection
          events={events}
          basePath="/district-secretary"
          canMonitor={perms.includes('manage_registrations')}
          scopeLabel={scope?.label ?? 'district'}
          kind="district_secretary"
        />
      )}
    </PortalSectionPage>
  );
}
