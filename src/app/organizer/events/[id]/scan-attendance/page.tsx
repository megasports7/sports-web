'use client';

import { use, useEffect, useState } from 'react';
import { organizerApi } from '@/lib/api/organizer.api';
import { QrScanner } from '@/lib/qr/QrScanner';

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path d="m5 10.5 3.5 3.5L15 7" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path d="m6 6 8 8M14 6l-8 8" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
    </svg>
  );
}

export default function ScanAttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);

  const [eventName, setEventName] = useState<string | null>(null);

  // Gate scanning while a result is showing -- mirrors mobile's `scanned`
  // guard, resumed only by the user's own action (no auto-timeout), same as
  // mobile's ScanAttendance.tsx (contrast with ScanList's 1.5s auto-resume).
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    organizerApi.event(eventId).then((res) => {
      if (res.success && res.data) setEventName(res.data.event_name);
    });
  }, [eventId]);

  async function handleScan(qrData: string) {
    if (busy || result) return;
    setBusy(true);
    const res = await organizerApi.scanAttendance(qrData, eventId);
    setBusy(false);
    // The API owns the wording: 'Attendance marked!' for a fresh mark,
    // 'Attendance already marked' for a re-scan, specific reasons otherwise.
    setResult({ ok: res.success, message: res.message || (res.success ? 'Attendance marked!' : 'Failed to mark attendance') });
  }

  return (
    <div className="page">
      <div className="head">
        <h1>Scan attendance</h1>
        {eventName && <p>{eventName}</p>}
      </div>

      {/* Scanner fully unmounts (camera stops) while a result is showing --
          not just paused via QrScanner's own `active` prop -- matching the
          proven no-auto-timeout behavior exactly. */}
      {!result && (
        <div className="scanner-frame">
          <QrScanner onScan={handleScan} active={!busy} className="scanner-inner" />
          <span className="corner tl" />
          <span className="corner tr" />
          <span className="corner bl" />
          <span className="corner br" />
          <span className="scan-hint">Point the camera at a player&apos;s ID QR</span>
        </div>
      )}

      {result && (
        <div className={`result-card ${result.ok ? 'ok' : 'err'}`}>
          <span className={`result-icon ${result.ok ? 'ok' : 'err'}`}>{result.ok ? <CheckIcon /> : <XIcon />}</span>
          <span className="result-msg">{result.message}</span>
          <button className="btn-primary" onClick={() => setResult(null)}>
            {result.ok ? 'Scan more' : 'Try again'}
          </button>
        </div>
      )}

      <style jsx>{`
        .page {
          max-width: 420px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .head h1 {
          font-size: 22px;
          font-weight: 800;
          margin: 0;
        }
        .head p {
          margin: 5px 0 0;
          font-size: 14px;
          color: var(--color-accent-green);
          font-weight: 700;
        }

        .scanner-frame {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          background: #0c0d10;
          aspect-ratio: 3 / 4;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.06), 0 20px 40px -18px rgba(22, 24, 29, 0.4);
        }
        .scanner-frame :global(video) {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        /* QrScanner takes one className applied to whichever it renders --
           the video+canvas wrapper once granted, or the state message
           (requesting/denied/etc.) otherwise -- so this one rule has to
           work for both: fill the frame, and center text when it's text. */
        .scanner-frame :global(.scanner-inner) {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 0 30px;
          font-size: 13px;
          font-weight: 600;
          color: #b7bcc6;
        }
        .corner {
          position: absolute;
          width: 34px;
          height: 34px;
          border-color: #00e676;
          opacity: 0.9;
          pointer-events: none;
        }
        .corner.tl {
          top: 22px;
          left: 22px;
          border-top: 3px solid;
          border-left: 3px solid;
          border-radius: 8px 0 0 0;
        }
        .corner.tr {
          top: 22px;
          right: 22px;
          border-top: 3px solid;
          border-right: 3px solid;
          border-radius: 0 8px 0 0;
        }
        .corner.bl {
          bottom: 22px;
          left: 22px;
          border-bottom: 3px solid;
          border-left: 3px solid;
          border-radius: 0 0 0 8px;
        }
        .corner.br {
          bottom: 22px;
          right: 22px;
          border-bottom: 3px solid;
          border-right: 3px solid;
          border-radius: 0 0 8px 0;
        }
        .scan-hint {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 12px;
          text-align: center;
          color: rgba(255, 255, 255, 0.75);
          font-size: 12px;
          font-weight: 600;
          pointer-events: none;
        }

        .result-card {
          border-radius: 20px;
          padding: 26px 22px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.06), 0 20px 40px -18px rgba(22, 24, 29, 0.3);
        }
        .result-card.ok {
          background: color-mix(in srgb, var(--color-accent-green) 9%, var(--color-surface));
          border: 1px solid color-mix(in srgb, var(--color-accent-green) 30%, var(--color-line));
        }
        .result-card.err {
          background: color-mix(in srgb, var(--color-corner-red) 8%, var(--color-surface));
          border: 1px solid color-mix(in srgb, var(--color-corner-red) 28%, var(--color-line));
        }
        .result-icon {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 6px;
        }
        .result-icon.ok {
          background: color-mix(in srgb, var(--color-accent-green) 16%, transparent);
          color: #0a7a3d;
        }
        .result-icon.err {
          background: color-mix(in srgb, var(--color-corner-red) 14%, transparent);
          color: #c23f26;
        }
        .result-icon :global(svg) {
          width: 26px;
          height: 26px;
        }
        .result-msg {
          font-size: 15px;
          font-weight: 700;
          color: var(--color-ink);
        }
        .btn-primary {
          margin-top: 10px;
          border: none;
          border-radius: 13px;
          padding: 11px 26px;
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          font-family: inherit;
          background: linear-gradient(120deg, var(--color-accent-green), #00e676);
          box-shadow: 0 10px 20px -10px color-mix(in srgb, var(--color-accent-green) 55%, transparent);
          transition: transform 0.08s ease, filter 0.1s ease;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .btn-primary:hover {
          filter: brightness(1.05);
          transform: translateY(-1px);
        }
        .btn-primary:active {
          transform: scale(0.96) translateY(0);
          filter: brightness(0.94);
        }
      `}</style>
    </div>
  );
}
