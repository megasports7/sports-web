'use client';

import { use } from 'react';
import { EventSubPage } from '@/components/secretary/EventSubPage';
import { SecretaryBatchCreateSection } from '@/components/secretary/SecretaryBatchCreateSection';
import { basePathFor } from '@/components/secretary/useSecretaryEvent';

export default function DistrictSecretaryBatchCreatePage({ params }: { params: Promise<{ id: string }> }) {
  const eventId = use(params).id;
  const base = basePathFor('district_secretary');
  return (
    <EventSubPage kind="district_secretary" eventId={eventId} title="Create batch" bare>
      {(id, perms, event, scopeLabel) => (
        <SecretaryBatchCreateSection
          eventId={id}
          basePath={base}
          canManageBatches={perms.includes('manage_batches')}
          kind="district_secretary"
          event={event}
          scopeLabel={scopeLabel}
        />
      )}
    </EventSubPage>
  );
}
