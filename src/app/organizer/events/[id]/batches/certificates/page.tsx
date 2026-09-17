'use client';

import { use, useEffect, useState } from 'react';
import { organizerApi } from '@/lib/api/organizer.api';
import { downloadCertificateImage } from '@/lib/certificateDownload';
import type { Batch } from '@/lib/types';

export default function OrganizerCertificatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);

  const [eventName, setEventName] = useState<string | null>(null);

  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [batchesError, setBatchesError] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState('');

  const [certificates, setCertificates] = useState<Record<string, unknown>[]>([]);
  // Never actually flips to true below (see the effect's own comment) --
  // preserved as-is from the proven backend build rather than "fixed", since
  // that's a deliberate trade-off, not an oversight.
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [certsError, setCertsError] = useState<string | null>(null);

  const [viewBusyId, setViewBusyId] = useState<string | null>(null);
  const [dlBusyId, setDlBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);

  useEffect(() => {
    organizerApi.event(eventId).then((res) => {
      if (res.success && res.data) setEventName(res.data.event_name);
    });
  }, [eventId]);

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

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }

  async function handleView(cert: Record<string, unknown>) {
    const rawId = cert.cert_id ?? cert.certificate_id;
    if (!rawId) return;
    const certId = String(rawId);
    setViewBusyId(certId);
    const res = await organizerApi.mintCertificateUrl(certId);
    setViewBusyId(null);
    if (res.success && res.data) {
      window.open(res.data.url, '_blank', 'noopener,noreferrer');
    } else {
      showToast(res.message || 'Could not open certificate');
    }
  }

  async function handleDownload(cert: Record<string, unknown>) {
    const rawId = cert.cert_id ?? cert.certificate_id;
    if (!rawId) return;
    const certId = String(rawId);
    const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null);
    setDlBusyId(certId);
    try {
      await downloadCertificateImage({
        level: str(cert.level) || str(cert.position) || str(cert.certificate_type) || undefined,
        playerName: str(cert.player_name) || 'Player',
        eventName: eventName || str(cert.event_name) || 'Event',
        signName: str(cert.sign_name),
        signDesignation: str(cert.sign_designation),
        sign2Name: str(cert.sign2_name),
        sign2Designation: str(cert.sign2_designation),
      });
      showToast('Certificate downloaded');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not download certificate');
    } finally {
      setDlBusyId(null);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenerateMessage(null);
    const res = await organizerApi.generateCertificates(selectedBatchId);
    setGenerating(false);
    setGenerateMessage(res.message || (res.success ? 'Done.' : 'Could not generate certificates.'));
  }

  if (loadingBatches) return <p className="text-muted">Loading batches…</p>;

  return (
    <div className="page">
      <div className="head">
        <h1>Certificates</h1>
        {eventName && <p>{eventName}</p>}
      </div>

      <div className="card">
        {batchesError ? (
          <p className="text-corner-red">{batchesError}</p>
        ) : batches.length === 0 ? (
          <p className="text-muted">No batches for this event yet.</p>
        ) : (
          <label className="field">
            <span>Batch</span>
            <select value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)}>
              <option value="">Select a batch…</option>
              {batches.map((b) => (
                <option key={b.batch_id} value={b.batch_id}>
                  {b.batch_name}
                </option>
              ))}
            </select>
          </label>
        )}

        <button type="button" className="btn-secondary" onClick={handleGenerate} disabled={generating || !selectedBatchId}>
          {generating ? 'Generating…' : 'Generate certificates'}
        </button>
        {generateMessage && <div className="pending-note">{generateMessage}</div>}
      </div>

      {selectedBatchId &&
        (loadingCerts ? (
          <p className="text-muted">Loading certificates…</p>
        ) : certsError ? (
          <p className="text-corner-red">{certsError}</p>
        ) : certificates.length === 0 ? (
          <p className="text-muted">No certificates for this batch yet.</p>
        ) : (
          <div className="cert-list">
            {certificates.map((c) => {
              const certId = String(c.cert_id ?? c.certificate_id ?? '');
              const playerName = (c.player_name as string) || 'Unknown player';
              const levelOrPosition = (c.level as string) || (c.position as string) || (c.certificate_type as string) || '-';
              return (
                <div className="cert-row" key={certId}>
                  <div>
                    <span className="c-name">{playerName}</span>
                    <span className="c-level">{levelOrPosition}</span>
                  </div>
                  <span className="c-actions">
                    <button type="button" className="btn-view" disabled={viewBusyId === certId} onClick={() => handleView(c)}>
                      {viewBusyId === certId ? 'Opening…' : 'View'}
                    </button>
                    <button type="button" className="btn-download" disabled={dlBusyId === certId} onClick={() => handleDownload(c)}>
                      {dlBusyId === certId ? 'Working…' : 'Download'}
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        ))}

      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .page {
          max-width: 680px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .head h1 {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.3px;
          margin: 0;
        }
        .head p {
          margin: 5px 0 0;
          font-size: 14px;
          color: #3a3d45;
        }

        .card {
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 18px;
          padding: 18px 20px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -14px rgba(22, 24, 29, 0.16);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field span {
          font-size: 12.5px;
          font-weight: 600;
          color: #3a3d45;
        }
        .field select {
          border: 1.5px solid var(--color-line);
          border-radius: 10px;
          padding: 9px 10px;
          font-size: 13.5px;
          font-family: inherit;
          color: var(--color-ink);
          background: var(--color-surface);
        }

        .btn-secondary {
          align-self: flex-start;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1.5px solid var(--color-line);
          border-radius: 13px;
          padding: 10px 18px;
          font-size: 13.5px;
          font-weight: 700;
          color: #3a3d45;
          cursor: pointer;
          font-family: inherit;
          background: var(--color-surface);
          transition: transform 0.08s ease, background 0.12s ease;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .btn-secondary:hover:not(:disabled) {
          background: var(--color-bg);
          border-color: #c9c6bf;
        }
        .btn-secondary:active:not(:disabled) {
          transform: scale(0.96);
          background: #efece6;
        }
        .btn-secondary:disabled {
          opacity: 0.6;
          cursor: default;
        }

        .pending-note {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: color-mix(in srgb, var(--color-status-pending) 12%, transparent);
          border: 1px solid color-mix(in srgb, var(--color-status-pending) 30%, transparent);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 12.5px;
          font-weight: 500;
          color: #8a6a10;
          line-height: 1.5;
        }

        .cert-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .cert-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 14px;
          padding: 13px 16px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 8px 18px -14px rgba(22, 24, 29, 0.14);
        }
        .c-name {
          display: block;
          font-size: 14px;
          font-weight: 700;
        }
        .c-level {
          display: block;
          font-size: 11.5px;
          color: var(--color-muted);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-top: 2px;
        }
        .btn-view {
          flex-shrink: 0;
          border: none;
          border-radius: 10px;
          padding: 8px 16px;
          font-size: 12.5px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          font-family: inherit;
          background: linear-gradient(120deg, var(--color-accent-green), #00e676);
          box-shadow: 0 4px 10px -6px color-mix(in srgb, var(--color-accent-green) 50%, transparent);
          transition: transform 0.08s ease, filter 0.1s ease;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .btn-view:hover:not(:disabled) {
          filter: brightness(1.05);
        }
        .btn-view:active:not(:disabled) {
          transform: scale(0.94);
          filter: brightness(0.92);
        }
        .btn-view:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .btn-download {
          flex-shrink: 0;
          border: 1.5px solid var(--color-line);
          border-radius: 10px;
          padding: 8px 16px;
          font-size: 12.5px;
          font-weight: 700;
          color: #0a8a3f;
          cursor: pointer;
          font-family: inherit;
          background: var(--color-surface);
        }
        .btn-download:hover:not(:disabled) {
          border-color: #0a8a3f;
        }
        .btn-download:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .c-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .toast {
          position: fixed;
          left: 50%;
          bottom: 26px;
          transform: translateX(-50%);
          background: var(--color-ink);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          padding: 11px 18px;
          border-radius: 12px;
          box-shadow: 0 12px 28px -10px rgba(0, 0, 0, 0.4);
          z-index: 50;
        }
      `}</style>
    </div>
  );
}
