'use client';

import { use } from 'react';
import { EventSubPage } from '@/components/secretary/EventSubPage';
import { BatchManageSection } from '@/components/secretary/BatchManageSection';

export default function DistrictSecretaryBatchManagePage({
  params,
}: {
  params: Promise<{ id: string; batchId: string }>;
}) {
  const { id: eventId, batchId } = use(params);
  return (
    <EventSubPage kind="district_secretary" eventId={eventId} title="Batch">
      {(id, perms) => (
        <BatchManageSection eventId={id} batchId={batchId} canManageMatches={perms.includes('manage_matches')} />
      )}
    </EventSubPage>
  );
}
