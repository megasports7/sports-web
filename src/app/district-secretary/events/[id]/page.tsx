'use client';

import { SecretaryEventPage, useEventId } from '@/components/secretary/SecretaryEventPage';

export default function DistrictSecretaryEventPage({ params }: { params: Promise<{ id: string }> }) {
  const eventId = useEventId(params);
  return <SecretaryEventPage kind="district_secretary" eventId={eventId} />;
}
