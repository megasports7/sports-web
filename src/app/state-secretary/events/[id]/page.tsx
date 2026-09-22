'use client';

import { SecretaryEventPage, useEventId } from '@/components/secretary/SecretaryEventPage';

export default function StateSecretaryEventPage({ params }: { params: Promise<{ id: string }> }) {
  const eventId = useEventId(params);
  return <SecretaryEventPage kind="state_secretary" eventId={eventId} />;
}
