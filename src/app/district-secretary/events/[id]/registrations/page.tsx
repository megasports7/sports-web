'use client';

import { use } from 'react';
import { EventSubPage } from '@/components/secretary/EventSubPage';
import { RegistrationsSection } from '@/components/secretary/RegistrationsSection';
import { basePathFor } from '@/components/secretary/useSecretaryEvent';

export default function DistrictSecretaryRegistrationsPage({ params }: { params: Promise<{ id: string }> }) {
  const eventId = use(params).id;
  const base = basePathFor('district_secretary');
  return (
    <EventSubPage kind="district_secretary" eventId={eventId} title="Registrations" bare>
      {(id, perms, event, scopeLabel) => (
        <RegistrationsSection
          eventId={id}
          basePath={base}
          canReview={perms.includes('verify_players')}
          kind="district_secretary"
          event={event}
          scopeLabel={scopeLabel}
        />
      )}
    </EventSubPage>
  );
}
