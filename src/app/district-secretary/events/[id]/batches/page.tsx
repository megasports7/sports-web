'use client';

import { use } from 'react';
import { EventSubPage } from '@/components/secretary/EventSubPage';
import { BatchesSection } from '@/components/secretary/BatchesSection';
import { basePathFor } from '@/components/secretary/useSecretaryEvent';

export default function DistrictSecretaryBatchesPage({ params }: { params: Promise<{ id: string }> }) {
  const eventId = use(params).id;
  const base = basePathFor('district_secretary');
  return (
    <EventSubPage kind="district_secretary" eventId={eventId} title="Batches">
      {(id, perms) => (
        <BatchesSection eventId={id} basePath={base} canManageBatches={perms.includes('manage_batches')} />
      )}
    </EventSubPage>
  );
}
