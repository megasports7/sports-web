'use client';

import { use } from 'react';
import { EventSubPage } from '@/components/secretary/EventSubPage';
import { CertificatesSection } from '@/components/secretary/CertificatesSection';

export default function StateSecretaryCertificatesPage({ params }: { params: Promise<{ id: string }> }) {
  const eventId = use(params).id;
  return (
    <EventSubPage kind="state_secretary" eventId={eventId} title="Certificates">
      {(id, perms) => <CertificatesSection eventId={id} canIssueCerts={perms.includes('certificate_ops')} />}
    </EventSubPage>
  );
}
