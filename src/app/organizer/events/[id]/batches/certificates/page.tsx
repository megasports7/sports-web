'use client';

import { use, useEffect, useState } from 'react';
import { organizerApi } from '@/lib/api/organizer.api';
import type { Batch } from '@/lib/types';

export default function OrganizerCertificatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);

  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [batchesError, setBatchesError] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState('');

  const [certificates, setCertificates] = useState<Record<string, unknown>[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [certsError, setCertsError] = useState<string | null>(null);

  const [viewBusyId, setViewBusyId] = useState<string | null>(null);
  const [viewMessage, setViewMessage] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);

  useEffect(() => {
    organizerApi
      .eventBatches(eventId)
      .then((res) => {
        if (res.success && res.data) setBatches(res.data);
        else setBatchesError(res.message || 'Could not load batches');
      })
      .finally(() => setLoadingBatches(false));
  }, [eventId]);

  // No synchronous setState anywhere in this effect body (not even
  // setLoadingCerts(true) before the fetch starts) -- react-hooks/
  // set-state-in-effect flags that regardless of indirection. Trade-off
  // accepted: switching batches shows the previous batch's list/empty-state
  // until the new one resolves, rather than a "Loading…" interstitial --
  // consistent with this phase's no-design-polish scope.
  useEffect(() => {
    if (!selectedBatchId) return;
    organizerApi
      .getCertificates(eventId, selectedBatchId)
      .then((res) => {
        if (res.success && res.data) {
          setCertificates(res.data);
          setCertsError(null);
        } else {
          setCertsError(res.message || 'Could not load certificates');
        }
      })
      .finally(() => setLoadingCerts(false));
  }, [eventId, selectedBatchId]);

  async function handleView(cert: Record<string, unknown>) {
    const rawId = cert.cert_id ?? cert.certificate_id;
    if (!rawId) return;
    const certId = String(rawId);
    setViewBusyId(certId);
    setViewMessage(null);
    const res = await organizerApi.mintCertificateUrl(certId);
    setViewBusyId(null);
    if (res.success && res.data) {
      window.open(res.data.url, '_blank', 'noopener,noreferrer');
    } else {
      setViewMessage(res.message || 'Could not open certificate');
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenerateMessage(null);
    const res = await organizerApi.generateCertificates();
    setGenerating(false);
    setGenerateMessage(res.message || (res.success ? 'Done.' : 'Could not generate certificates.'));
  }

  if (loadingBatches) return <p className="text-gray-500">Loading batches…</p>;

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold">Certificates</h1>

      {batchesError ? (
        <p className="mb-4 text-red-600">{batchesError}</p>
      ) : batches.length === 0 ? (
        <p className="mb-4 text-sm text-gray-500">No batches for this event yet.</p>
      ) : (
        <div className="mb-4 flex flex-col gap-1">
          <label htmlFor="batch-select" className="text-sm font-medium text-gray-600">
            Batch
          </label>
          <select
            id="batch-select"
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="">Select a batch…</option>
            {batches.map((b) => (
              <option key={b.batch_id} value={b.batch_id}>
                {b.batch_name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-4">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          {generating ? 'Generating…' : 'Generate certificates'}
        </button>
        {generateMessage && <p className="mt-2 text-sm text-gray-600">{generateMessage}</p>}
      </div>

      {selectedBatchId &&
        (loadingCerts ? (
          <p className="text-gray-500">Loading certificates…</p>
        ) : certsError ? (
          <p className="text-red-600">{certsError}</p>
        ) : certificates.length === 0 ? (
          <p className="text-sm text-gray-500">No certificates for this batch yet.</p>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {certificates.map((c) => {
                const certId = String(c.cert_id ?? c.certificate_id ?? '');
                const playerName = (c.player_name as string) || 'Unknown player';
                const levelOrPosition =
                  (c.level as string) || (c.position as string) || (c.certificate_type as string) || '-';
                return (
                  <li key={certId} className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">{playerName}</div>
                        <div className="text-xs uppercase text-gray-500">{levelOrPosition}</div>
                      </div>
                      <button
                        onClick={() => handleView(c)}
                        disabled={viewBusyId === certId}
                        className="shrink-0 rounded-lg border px-2 py-1 text-xs font-medium disabled:opacity-50"
                      >
                        View
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {viewMessage && <p className="mt-3 text-sm text-gray-600">{viewMessage}</p>}
          </>
        ))}
    </div>
  );
}
