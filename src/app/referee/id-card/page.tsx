'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { refereeApi } from '@/lib/api/referee.api';
import type { RefereeProfile } from '@/lib/types';

/** Same helper as dashboard/matches' own initials() -- kept as a local copy
 *  rather than a new shared module, matching the per-file convention every
 *  other role's pages already use for small display helpers. */
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function RefereeIdCardPage() {
  const [referee, setReferee] = useState<RefereeProfile | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refereeApi
      .profile()
      .then(async (res) => {
        if (res.success && res.data) {
          setReferee(res.data);
          // Universal scanner token format, display-only -- same null-safety
          // as player/organizer (falls back to the real uuid when
          // referee_id/legacy_id is absent, avoiding the literal broken
          // string "PLAYER:null" for a self-signup referee). Per mobile's
          // own comment this badge was never resolvable by scan_for_list/
          // find_player_by_qr anyway (both hard-require role='player'), so
          // this stays decorative regardless of which id it encodes.
          const qrValue = `PLAYER:${res.data.referee_id ?? res.data.id}`;
          setQrDataUrl(await QRCode.toDataURL(qrValue, { width: 160, margin: 1 }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted">Loading ID card…</p>;
  if (!referee) return <p className="text-corner-red">ID card not available.</p>;

  const idNumber = referee.id_number || (referee.referee_id ? `R-${referee.referee_id}` : referee.id.slice(0, 8));

  return (
    <div className="page">
      <div className="card">
        <div className="band">
          {referee.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={referee.photo} alt="" className="band-photo" />
          ) : (
            <div className="band-avatar">{initials(referee.name)}</div>
          )}
          <div className="band-text">
            <div className="band-name">{referee.name}</div>
            <div className="band-id">{idNumber}</div>
            <span className="band-role">Referee</span>
          </div>
        </div>

        {qrDataUrl && (
          <div className="qr-section">
            <div className="qr-box">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Referee QR code" width={160} height={160} />
            </div>
            <span className="qr-caption">Scan to verify</span>
          </div>
        )}
      </div>

      <section>
        <p className="section-title">Details</p>
        <dl className="detail-card">
          <Row label="District" value={referee.district || 'N/A'} />
          <Row label="State" value={referee.state || 'N/A'} />
          <Row label="Valid until" value={referee.id_valid_until ? new Date(referee.id_valid_until).toLocaleDateString() : 'N/A'} />
        </dl>
      </section>

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 22px;
          max-width: 480px;
          margin: 0 auto;
        }

        .card {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 22px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -12px rgba(22, 24, 29, 0.14);
        }

        /* Same navy-to-indigo pair as the dashboard's own "ID Card" quick
           action tile, so the card this opens into visually matches the
           tile that links to it. */
        .band {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 24px 22px;
          background: linear-gradient(135deg, #16205c, var(--color-accent-indigo));
          color: #fff;
        }
        .band-photo,
        .band-avatar {
          width: 68px;
          height: 68px;
          border-radius: 18px;
          flex-shrink: 0;
          object-fit: cover;
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.22);
        }
        .band-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.14);
          font-weight: 800;
          font-size: 23px;
        }
        .band-text {
          min-width: 0;
        }
        .band-name {
          font-size: 18.5px;
          font-weight: 800;
          letter-spacing: -0.2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .band-id {
          font-family: var(--font-mono);
          font-size: 12.5px;
          opacity: 0.78;
          margin-top: 3px;
        }
        .band-role {
          display: inline-flex;
          margin-top: 9px;
          padding: 3px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.18);
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .qr-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 26px 22px 28px;
        }
        .qr-box {
          padding: 14px;
          border: 1px solid var(--color-line);
          border-radius: 16px;
        }
        .qr-box :global(img) {
          display: block;
          width: 150px;
          height: 150px;
        }
        .qr-caption {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-muted);
        }

        .section-title {
          font-size: 14px;
          font-weight: 700;
          color: #3a3d45;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin: 0 0 12px;
        }

        .detail-card {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 18px;
          padding: 4px 18px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -12px rgba(22, 24, 29, 0.14);
        }
        /* Row is its own component below, so these classNames render outside
           this component's JSX tree -- same reason RefereeNav.tsx reaches
           its <Link>-rendered classNames with :global(). */
        :global(.detail-row) {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 13px 0;
          border-bottom: 1px solid var(--color-line);
        }
        :global(.detail-row:last-child) {
          border-bottom: none;
        }
        :global(.detail-label) {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-muted);
        }
        :global(.detail-value) {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--color-ink);
          text-align: right;
        }
      `}</style>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <dt className="detail-label">{label}</dt>
      <dd className="detail-value">{value}</dd>
    </div>
  );
}
