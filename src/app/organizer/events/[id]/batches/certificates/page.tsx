'use client';

import { use, useEffect, useState } from 'react';
import { organizerApi } from '@/lib/api/organizer.api';
import { certBackgroundFor, certDescriptionFor, downloadCertificateImage } from '@/lib/certificateDownload';
import type { Batch } from '@/lib/types';

type TierFilter = 'all' | 'gold' | 'silver' | 'bronze' | 'participation';

function tierOf(cert: Record<string, unknown>): TierFilter {
  const v = String(cert.level ?? cert.position ?? cert.certificate_type ?? '').toLowerCase();
  if (v === 'gold' || v === 'silver' || v === 'bronze') return v;
  return 'participation';
}

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

  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [previewCert, setPreviewCert] = useState<Record<string, unknown> | null>(null);

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

  // Refetch the issued list for a batch (reused after Generate/Regenerate
  // so counts, tiers, and rows update without manual re-select).
  async function fetchCertificates(batchId: string) {
    const res = await organizerApi.getCertificates(eventId, batchId);
    if (res.success && res.data) {
      setCertificates(res.data);
      setCertsError(null);
    } else {
      setCertsError(res.message || 'Could not load certificates');
    }
  }

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
      console.debug('[certs] view failed', { certId, message: res.message });
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
      console.debug('[certs] download failed', { certId, error: err instanceof Error ? err.message : err });
      showToast(err instanceof Error ? err.message : 'Could not download certificate');
    } finally {
      setDlBusyId(null);
    }
  }

  // Organizer authority gate (mobile parity: BatchCertificates
  // handleGenerateCertificates) -- issuance happens ONLY on this click,
  // never automatically. Regenerate overwrites via p_overwrite; tiers are
  // always recalculated server-side from current match results.
  async function handleGenerate() {
    if (!selectedBatchId || generating) return;
    const isRegenerate = certificates.length > 0;
    console.debug('[certs] generate click', { eventId, batchId: selectedBatchId, format: selectedFormat, isRegenerate });
    const ok = window.confirm(
      isRegenerate
        ? `Overwrite all ${certificates.length} existing certificate${certificates.length !== 1 ? 's' : ''} in this batch? Tiers are recalculated from current match results. This cannot be undone.`
        : 'Issue certificates to all players in this batch? Each player automatically receives the correct tier (Gold, Silver, Bronze, or Participation) based on match results.',
    );
    if (!ok) return;
    setGenerating(true);
    setGenerateMessage(null);
    const res = await organizerApi.generateCertificates(selectedBatchId, { overwrite: isRegenerate });
    setGenerating(false);
    console.debug('[certs] generate result', { batchId: selectedBatchId, success: res.success, message: res.message, data: res.data });
    if (res.success && res.data) {
      const { created = 0, skipped = 0, updated = 0 } = res.data;
      setGenerateMessage(
        isRegenerate
          ? `${updated} certificate${updated !== 1 ? 's' : ''} updated${created > 0 ? `, ${created} newly created` : ''}.`
          : `${created} certificate${created !== 1 ? 's' : ''} issued${skipped > 0 ? `, ${skipped} already existed` : ''}.`,
      );
      await fetchCertificates(selectedBatchId);
    } else {
      setGenerateMessage(res.message || 'Could not generate certificates.');
    }
  }

  if (loadingBatches) return <p className="text-muted">Loading batches…</p>;

  const tierCounts: Record<TierFilter, number> = { all: certificates.length, gold: 0, silver: 0, bronze: 0, participation: 0 };
  for (const c of certificates) tierCounts[tierOf(c)] += 1;
  const visibleCerts = tierFilter === 'all' ? certificates : certificates.filter((c) => tierOf(c) === tierFilter);
  const isRegenerate = certificates.length > 0;
  const previewLevel = previewCert ? tierOf(previewCert) : 'participation';
  const previewName = String(previewCert?.player_name ?? 'Player');

  // Pre-flight format gate: medals are a single-elimination computation
  // (server guard refuses other formats). Gate here so the organizer gets
  // a batch-specific reason instead of a post-click RPC error. Unknown
  // (null) format falls through to the RPC, preserving old behaviour.
  const selectedBatch = batches.find((b) => b.batch_id === selectedBatchId) ?? null;
  const selectedFormat = selectedBatch?.tournament_format ?? null;
  const isEligible = !selectedBatch || selectedFormat === null || selectedFormat === 'single_elimination';
  const formatLabel =
    selectedFormat === 'round_robin' ? 'Round Robin'
    : selectedFormat === 'double_elimination' ? 'Double Elimination'
    : selectedFormat === 'single_elimination' ? 'Single Elimination'
    : 'this format';

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

        <button type="button" className="btn-secondary" onClick={handleGenerate} disabled={generating || !selectedBatchId || !isEligible}>
          {generating ? 'Generating…' : isRegenerate ? `Regenerate certificates (${certificates.length} existing)` : 'Generate certificates'}
        </button>
        {generateMessage && <div className="pending-note">{generateMessage}</div>}
        {selectedBatch && !isEligible && (
          <div className="pending-note">
            Certificates are issued for single-elimination batches — ‘{selectedBatch.batch_name}’ is {formatLabel}. Select a single-elimination batch to issue.
          </div>
        )}
      </div>

      {selectedBatchId && certificates.length > 0 && (
        <div className="card">
          <div className="tier-counts" aria-label="Certificates by tier">
            {(['gold', 'silver', 'bronze', 'participation'] as const).map((t) => (
              <span key={t} className="tier-count">
                <strong>{tierCounts[t]}</strong> {t === 'participation' ? 'Participation' : t[0].toUpperCase() + t.slice(1)}
              </span>
            ))}
          </div>
          <div className="chips" role="group" aria-label="Filter certificates by tier">
            {(['all', 'gold', 'silver', 'bronze', 'participation'] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={t === tierFilter ? 'chip chip-active' : 'chip'}
                onClick={() => setTierFilter(t)}
              >
                {t === 'all' ? `All (${tierCounts.all})` : `${t[0].toUpperCase() + t.slice(1)} (${tierCounts[t]})`}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedBatchId &&
        (loadingCerts ? (
          <p className="text-muted">Loading certificates…</p>
        ) : certsError ? (
          <p className="text-corner-red">{certsError}</p>
        ) : certificates.length === 0 ? (
          <p className="text-muted">No certificates for this batch yet.</p>
        ) : visibleCerts.length === 0 ? (
          <p className="text-muted">No certificates in this tier.</p>
        ) : (
          <div className="cert-list">
            {visibleCerts.map((c) => {
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
                    <button type="button" className="btn-preview" onClick={() => setPreviewCert(c)}>
                      Preview
                    </button>
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

      {previewCert && (
        <div className="modal-backdrop" onClick={() => setPreviewCert(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Certificate preview">
            <div className="modal-head">
              <strong>Certificate preview</strong>
              <button type="button" className="btn-download" onClick={() => setPreviewCert(null)}>
                Close
              </button>
            </div>
            <div className="preview-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={certBackgroundFor(previewLevel)} alt={`${previewLevel} certificate`} className="preview-bg" />
              <div className="preview-name">{previewName}</div>
              <div className="preview-desc">{certDescriptionFor(previewLevel, eventName || 'Event')}</div>
            </div>
            <button
              type="button"
              className="btn-view"
              disabled={dlBusyId === String(previewCert.cert_id ?? previewCert.certificate_id ?? '')}
              onClick={() => {
                handleDownload(previewCert);
              }}
            >
              {dlBusyId === String(previewCert.cert_id ?? previewCert.certificate_id ?? '') ? 'Working…' : 'Download JPEG'}
            </button>
          </div>
        </div>
      )}

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
        .btn-preview {
          flex-shrink: 0;
          border: 1.5px solid var(--color-line);
          border-radius: 10px;
          padding: 8px 16px;
          font-size: 12.5px;
          font-weight: 700;
          color: #3a3d45;
          cursor: pointer;
          font-family: inherit;
          background: var(--color-surface);
        }
        .btn-preview:hover {
          background: var(--color-bg);
        }

        .tier-counts {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          font-size: 13px;
          color: var(--color-muted);
        }
        .tier-count strong {
          color: var(--color-ink);
          font-size: 15px;
          margin-right: 4px;
        }
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .chip {
          border: 1.5px solid var(--color-line);
          border-radius: 999px;
          padding: 6px 14px;
          font-size: 12.5px;
          font-weight: 700;
          color: #3a3d45;
          cursor: pointer;
          font-family: inherit;
          background: var(--color-surface);
        }
        .chip-active {
          background: var(--color-ink);
          border-color: var(--color-ink);
          color: #fff;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(10, 12, 16, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 60;
        }
        .modal-sheet {
          background: var(--color-surface);
          border-radius: 18px;
          padding: 18px;
          max-width: 560px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .modal-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 15px;
        }
        .preview-wrap {
          position: relative;
          width: 100%;
          border-radius: 12px;
          overflow: hidden;
        }
        .preview-bg {
          display: block;
          width: 100%;
          height: auto;
        }
        .preview-name {
          position: absolute;
          left: 30%;
          right: 30%;
          top: 38%;
          text-align: center;
          font-family: Georgia, serif;
          font-style: italic;
          font-weight: 700;
          font-size: clamp(14px, 4vw, 24px);
          color: #1c1a14;
        }
        .preview-desc {
          position: absolute;
          left: 28%;
          right: 28%;
          top: 57%;
          text-align: center;
          font-family: Georgia, serif;
          font-style: italic;
          font-size: clamp(10px, 2.6vw, 15px);
          color: #3a352a;
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
