'use client';

import { use } from 'react';
import { EventSubPage } from '@/components/secretary/EventSubPage';
import { RegistrationsSection } from '@/components/secretary/RegistrationsSection';

export default function DistrictSecretaryRegistrationsPage({ params }: { params: Promise<{ id: string }> }) {
  const eventId = use(params).id;
  return (
    <EventSubPage kind="district_secretary" eventId={eventId} title="Registrations">
      {(id, perms) => <RegistrationsSection eventId={id} canReview={perms.includes('verify_players')} />}
    </EventSubPage>
  );
}
