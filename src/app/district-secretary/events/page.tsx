'use client';

import { PortalSectionPage } from '@/components/secretary/PortalSectionPage';
import { SecretaryEventsSection } from '@/components/secretary/SecretaryEventsSection';

export default function DistrictSecretaryEventsPage() {
  return (
    <PortalSectionPage kind="district_secretary" title="Events">
      {({ perms, events }) => (
        <SecretaryEventsSection
          events={events}
          basePath="/district-secretary"
          canMonitor={perms.includes('manage_registrations')}
        />
      )}
    </PortalSectionPage>
  );
}
