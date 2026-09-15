'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { playerApi } from '@/lib/api/player.api';
import type { Player } from '@/lib/types';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <circle cx="15" cy="5" r="2" stroke="currentColor" strokeWidth={1.4} />
      <circle cx="5" cy="10" r="2" stroke="currentColor" strokeWidth={1.4} />
      <circle cx="15" cy="15" r="2" stroke="currentColor" strokeWidth={1.4} />
      <path d="M6.7 9 13.3 6M6.7 11l6.6 3" stroke="currentColor" strokeWidth={1.4} />
    </svg>
  );
}
function FlipIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path d="M16 10a6 6 0 1 1-2-4.5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M16 3v3.5h-3.5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SportIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path
        d="M10 2.6 15.5 5v4.4c0 4-2.4 6.8-5.5 8-3.1-1.2-5.5-4-5.5-8V5L10 2.6Z"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}
function BloodIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path d="M10 17.5S3 13 3 7.8A3.8 3.8 0 0 1 10 5.5a3.8 3.8 0 0 1 7 2.3c0 5.2-7 9.7-7 9.7Z" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth={1.5} />
      <path d="M3 8h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}
function GenderIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="6.2" r="3.2" stroke="currentColor" strokeWidth={1.5} />
      <path d="M3.5 17c.6-4 3-6.2 6.5-6.2s5.9 2.2 6.5 6.2" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path
        d="M4 5.5c0-1 .7-1.5 1.5-1.5h1.7c.5 0 .9.3 1 .8l.7 2.4c.1.5 0 1-.4 1.3l-1 .9c.8 1.8 2.2 3.2 4 4l.9-1c.3-.4.8-.5 1.3-.4l2.4.7c.5.1.8.5.8 1V15c0 .8-.5 1.5-1.5 1.5C9 16.5 4 11.5 4 5.5Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PlayerIdCardPage() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    playerApi
      .profile()
      .then(async (res) => {
        if (res.success && res.data) {
          setPlayer(res.data);
          // M5 Phase 5b format (PLAYER:<legacy_id>) when a legacy_id exists
          // -- unchanged, byte-identical to any already-printed card. Every
          // self-signup player (post-cutover) has legacy_id null, so falls
          // back to PLAYER:<uuid> instead -- both forms are resolved by the
          // find_player_by_qr/scan_for_list uuid fallback added 2026-09-05
          // (sports-mobile-main's qr_resolve_by_uuid migration). Without
          // this fallback, a self-signup player's QR would encode the
          // literal broken string "PLAYER:null".
          const qrValue = `PLAYER:${res.data.player_id ?? res.data.id}`;
          setQrDataUrl(await QRCode.toDataURL(qrValue, { width: 220, margin: 1 }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }

  async function handleShare() {
    if (!player) return;
    const text = `Player ID: ${player.id_number || player.nsrd_id || player.player_id || player.id}\nName: ${player.player_name}\nSport: ${player.sport || 'N/A'}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Player ID', text });
      } catch {
        // cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      showToast('Link copied to clipboard');
    }
  }

  if (loading) return <p className="text-muted">Loading ID card…</p>;
  if (!player) return <p className="text-corner-red">ID card not available.</p>;

  // player_id (legacy_id) is null for every self-signup player -- fall back
  // to a short slice of the real uuid rather than displaying "#null".
  const idNumber = player.id_number || player.nsrd_id || (player.player_id ? `#${player.player_id}` : player.id.slice(0, 8));

  return (
    <div className="page">
      <div className="head">
        <h1>Your player ID</h1>
        <p>Tap the card to flip it and show your QR at check-in.</p>
      </div>

      <button className="card-scene" onClick={() => setFlipped((f) => !f)} aria-label="Flip ID card">
        <div className={`card-flip ${flipped ? 'flipped' : ''}`}>
          <div className="face face-front">
            <svg className="face-texture" viewBox="0 0 300 440" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              <g fill="none" stroke="#fff" strokeWidth={1}>
                <line x1="40" y1="30" x2="40" y2="110" />
                <circle cx="40" cy="30" r="2.5" fill="#fff" stroke="none" />
                <circle cx="40" cy="70" r="2.5" fill="#fff" stroke="none" />
                <circle cx="40" cy="110" r="2.5" fill="#fff" stroke="none" />
                <line x1="260" y1="330" x2="260" y2="410" />
                <circle cx="260" cy="330" r="2.5" fill="#fff" stroke="none" />
                <circle cx="260" cy="370" r="2.5" fill="#fff" stroke="none" />
                <circle cx="260" cy="410" r="2.5" fill="#fff" stroke="none" />
              </g>
            </svg>
            <span className="clip-hole" />
            <span className="brandline">
              <svg viewBox="0 0 22 22">
                <path d="M11 2a9 9 0 0 1 0 18 9 9 0 0 0 0-18Z" fill="#fff" fillOpacity={0.9} />
                <path d="M11 2a9 9 0 0 0 0 18 9 9 0 0 1 0-18Z" fill="#fff" fillOpacity={0.55} />
              </svg>
              MEGASPORTSX &middot; PLAYER ID
            </span>
            <span className="avatar-wrap">
              {player.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={player.photo} alt="" />
              ) : (
                initials(player.player_name)
              )}
            </span>
            <span className="p-name">{player.player_name}</span>
            {player.sport && (
              <span className="sport-badge">
                <SportIcon />
                {player.sport}
              </span>
            )}
            <span className="idnum">{idNumber}</span>
            <span className="flip-hint">
              <FlipIcon />
              Flip for QR
            </span>
          </div>

          <div className="face face-back">
            <div className="qr-box">
              {qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="Player QR code" />
              )}
            </div>
            <span className="back-name">{player.player_name}</span>
            <span className="back-idnum">{idNumber}</span>
            <span className="back-scan-label">Scan to verify at check-in</span>
            <span className="flip-hint-back">
              <FlipIcon />
              Flip back
            </span>
          </div>
        </div>
      </button>

      <p className="save-hint">No image export yet — right-click the card to save it, or print this page.</p>

      <button className="share-btn" onClick={handleShare}>
        <ShareIcon />
        Share ID
      </button>

      <div className="panel">
        <p className="panel-title">Emergency information</p>
        <div className="panel-row">
          <span className="k">
            <BloodIcon />
            Blood type
          </span>
          <span className={`v ${player.blood_group ? 'blood' : 'muted'}`}>{player.blood_group || 'Not set'}</span>
        </div>
        <div className="panel-row">
          <span className="k">
            <CalendarIcon />
            Date of birth
          </span>
          <span className={`v ${player.dob ? '' : 'muted'}`}>{player.dob || 'Not set'}</span>
        </div>
        <div className="panel-row">
          <span className="k">
            <GenderIcon />
            Gender
          </span>
          <span className={`v ${player.gender ? '' : 'muted'}`}>{player.gender || 'Not set'}</span>
        </div>
        <div className="panel-row">
          <span className="k">
            <PhoneIcon />
            Emergency contact
          </span>
          <span className={`v ${player.emergency_contact ? '' : 'muted'}`}>{player.emergency_contact || 'Not set'}</span>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .page {
          max-width: 460px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 22px;
        }
        .head {
          text-align: center;
        }
        .head h1 {
          font-size: 21px;
          font-weight: 800;
          letter-spacing: -0.3px;
          margin: 0 0 4px;
        }
        .head p {
          font-size: 13px;
          color: var(--color-muted);
          margin: 0;
        }

        .card-scene {
          width: 300px;
          height: 440px;
          perspective: 1600px;
          cursor: pointer;
          border: none;
          background: none;
          padding: 0;
          font-family: inherit;
        }
        .card-flip {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.7s cubic-bezier(0.4, 0.2, 0.2, 1);
          transform-style: preserve-3d;
        }
        .card-flip.flipped {
          transform: rotateY(180deg);
        }
        .face {
          position: absolute;
          inset: 0;
          border-radius: 24px;
          backface-visibility: hidden;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.06), 0 20px 40px -18px rgba(22, 24, 29, 0.35);
          display: flex;
          flex-direction: column;
        }
        .face-front {
          background: linear-gradient(160deg, var(--color-accent-blue) 0%, #0072b8 55%, #163a5c 100%);
          color: #fff;
          align-items: center;
          padding: 22px 22px 20px;
        }
        .face-texture {
          position: absolute;
          inset: 0;
          opacity: 0.14;
          pointer-events: none;
        }
        .clip-hole {
          width: 44px;
          height: 8px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.28);
          margin-bottom: 16px;
          flex-shrink: 0;
        }
        .brandline {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.4px;
          margin-bottom: auto;
          z-index: 1;
        }
        .brandline svg {
          width: 16px;
          height: 16px;
        }
        .avatar-wrap {
          width: 92px;
          height: 92px;
          border-radius: 26px;
          background: rgba(255, 255, 255, 0.14);
          border: 2px solid rgba(255, 255, 255, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          font-weight: 800;
          letter-spacing: 0.5px;
          margin: 6px 0 14px;
          z-index: 1;
          overflow: hidden;
        }
        .avatar-wrap :global(img) {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .p-name {
          font-size: 19px;
          font-weight: 800;
          letter-spacing: -0.2px;
          text-align: center;
          z-index: 1;
        }
        .sport-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-top: 8px;
          background: rgba(255, 255, 255, 0.16);
          font-size: 11.5px;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: 999px;
          z-index: 1;
        }
        .sport-badge :global(svg) {
          width: 11px;
          height: 11px;
        }
        .idnum {
          margin-top: auto;
          font-family: var(--font-mono);
          font-size: 13.5px;
          letter-spacing: 1.2px;
          opacity: 0.9;
          z-index: 1;
        }
        .flip-hint {
          position: absolute;
          bottom: 14px;
          right: 16px;
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          opacity: 0.75;
          z-index: 1;
        }
        .flip-hint :global(svg) {
          width: 12px;
          height: 12px;
        }

        .face-back {
          background: var(--color-surface);
          color: var(--color-ink);
          transform: rotateY(180deg);
          align-items: center;
          justify-content: center;
          padding: 26px;
          border: 1px solid var(--color-line);
        }
        .qr-box {
          width: 168px;
          height: 168px;
          border-radius: 16px;
          border: 1.5px solid var(--color-line);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          margin-bottom: 14px;
        }
        .qr-box :global(img) {
          width: 100%;
          height: 100%;
        }
        .back-name {
          font-size: 15px;
          font-weight: 700;
        }
        .back-idnum {
          font-family: var(--font-mono);
          font-size: 12.5px;
          color: var(--color-muted);
          margin-top: 3px;
        }
        .back-scan-label {
          font-size: 11px;
          color: var(--color-muted);
          margin-top: 10px;
          font-weight: 600;
          letter-spacing: 0.2px;
        }
        .flip-hint-back {
          position: absolute;
          bottom: 14px;
          right: 16px;
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          color: var(--color-muted);
        }
        .flip-hint-back :global(svg) {
          width: 12px;
          height: 12px;
        }

        .save-hint {
          font-size: 12px;
          color: var(--color-muted);
          text-align: center;
          max-width: 280px;
          margin: -6px 0 0;
        }

        .share-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: none;
          border-radius: 13px;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          background: linear-gradient(120deg, var(--color-accent-blue), #00b8d9);
          box-shadow: 0 10px 20px -10px color-mix(in srgb, var(--color-accent-blue) 55%, transparent);
          font-family: inherit;
        }
        .share-btn :global(svg) {
          width: 15px;
          height: 15px;
        }

        .panel {
          width: 100%;
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 18px;
          padding: 6px 20px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -14px rgba(22, 24, 29, 0.16);
        }
        .panel-title {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          color: var(--color-muted);
          padding: 16px 0 8px;
        }
        .panel-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 13px 0;
          border-bottom: 1px solid var(--color-line);
        }
        .panel-row:last-child {
          border-bottom: none;
        }
        .panel-row .k {
          font-size: 12.5px;
          color: var(--color-muted);
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .panel-row .k :global(svg) {
          width: 13px;
          height: 13px;
          color: #9aa0ac;
        }
        .panel-row .v {
          font-size: 13.5px;
          font-weight: 700;
        }
        .panel-row .v.blood {
          color: var(--color-corner-red);
        }
        .panel-row .v.muted {
          color: #b7b3aa;
          font-weight: 600;
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
          animation: toastIn 0.25s ease;
        }
        @keyframes toastIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
