'use client';

import { use, useEffect, useRef, useState } from 'react';
import { organizerApi } from '@/lib/api/organizer.api';
import { QrScanner } from '@/lib/qr/QrScanner';

interface ScannedEntry {
  key: string;
  name: string;
  timestamp: string;
  status: 'success' | 'duplicate' | 'error';
  message: string;
}

export default function ScanListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: listId } = use(params);

  const [listPurpose, setListPurpose] = useState<string | null>(null);

  const [recentScans, setRecentScans] = useState<ScannedEntry[]>([]);
  const [scanCount, setScanCount] = useState(0);
  const [lastResult, setLastResult] = useState<{ ok: boolean; msg: string } | null>(null);
  // scanned: true while the 1.5s auto-resume window is active (blocks the
  // scanner entirely, same as mobile passing onBarcodeScanned={undefined}).
  // processing: true only while the actual API call is in flight.
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const nextKey = useRef(0);

  useEffect(() => {
    organizerApi.attendanceList(listId).then((res) => {
      if (res.success && res.data) setListPurpose(res.data.purpose ?? null);
    });
  }, [listId]);

  useEffect(() => {
    organizerApi.getAttendanceListScans(listId).then((res) => {
      if (res.success && res.data) {
        setRecentScans(
          res.data.map((s) => ({
            key: `initial-${nextKey.current++}`,
            name: s.player_name,
            timestamp: new Date(s.scanned_at).toLocaleTimeString(),
            status: 'success' as const,
            message: 'Already recorded',
          })),
        );
        setScanCount(res.data.length);
      }
    });
  }, [listId]);

  async function handleScan(qrData: string) {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);
    setLastResult(null);

    const res = await organizerApi.scanForList(listId, qrData);
    const ok = res.success;
    const msg = res.message || (ok ? 'Scanned successfully' : 'Scan failed');
    setLastResult({ ok, msg });
    if (ok) setScanCount((c) => c + 1);

    const playerName = res.data?.player_name || qrData.slice(0, 20);
    setRecentScans((prev) => [
      {
        key: `scan-${nextKey.current++}`,
        name: playerName,
        timestamp: new Date().toLocaleTimeString(),
        status: ok ? 'success' : msg.toLowerCase().includes('already') ? 'duplicate' : 'error',
        message: msg,
      },
      ...prev.slice(0, 49),
    ]);

    setProcessing(false);
    // Auto-resume after 1.5s -- same fixed debounce as mobile's ScanList.
    setTimeout(() => setScanned(false), 1500);
  }

  return (
    <div className="page">
      <div className="head-row">
        <div className="head">
          <h1>Scan list</h1>
          {listPurpose && <p>{listPurpose}</p>}
        </div>
        <div className="count-chip">
          <span className="n">{scanCount}</span>
          <span className="l">Scans</span>
        </div>
      </div>

      <div className="scanner-frame">
        <QrScanner onScan={handleScan} active={!scanned} className="scanner-inner" />
        <span className="corner tl" />
        <span className="corner tr" />
        <span className="corner bl" />
        <span className="corner br" />
      </div>

      {lastResult && <div className={`result-banner ${lastResult.ok ? 'ok' : 'err'}`}>{lastResult.msg}</div>}

      <div>
        <p className="section-title">Recent scans</p>
        {recentScans.length === 0 ? (
          <p className="text-muted">No scans yet.</p>
        ) : (
          <div className="scan-list">
            {recentScans.map((s) => (
              <div className={`scan-row ${s.status}`} key={s.key}>
                <div>
                  <span className="s-name">{s.name}</span>
                  <span className="s-msg">{s.message}</span>
                </div>
                <span className="s-time">{s.timestamp}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .page {
          max-width: 420px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .head-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }
        .head h1 {
          font-size: 21px;
          font-weight: 800;
          margin: 0;
        }
        .head p {
          margin: 4px 0 0;
          font-size: 13.5px;
          color: var(--color-accent-green);
          font-weight: 700;
        }
        .count-chip {
          flex-shrink: 0;
          text-align: center;
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.06);
          border-radius: 12px;
          padding: 8px 14px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 6px 14px -10px rgba(22, 24, 29, 0.2);
        }
        .count-chip .n {
          display: block;
          font-size: 17px;
          font-weight: 800;
          font-family: var(--font-mono);
        }
        .count-chip .l {
          display: block;
          font-size: 9px;
          color: var(--color-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .scanner-frame {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          background: #0c0d10;
          aspect-ratio: 1 / 1;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.06), 0 20px 40px -18px rgba(22, 24, 29, 0.4);
        }
        .scanner-frame :global(video) {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        /* Same dual-purpose className note as scan-attendance/page.tsx --
           QrScanner applies this one class to either the video wrapper or
           the state-message text, so it has to work for both. */
        .scanner-frame :global(.scanner-inner) {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 0 26px;
          font-size: 11.5px;
          font-weight: 600;
          color: #b7bcc6;
        }
        .corner {
          position: absolute;
          width: 30px;
          height: 30px;
          border-color: #00e676;
          opacity: 0.9;
          pointer-events: none;
        }
        .corner.tl {
          top: 18px;
          left: 18px;
          border-top: 3px solid;
          border-left: 3px solid;
          border-radius: 8px 0 0 0;
        }
        .corner.tr {
          top: 18px;
          right: 18px;
          border-top: 3px solid;
          border-right: 3px solid;
          border-radius: 0 8px 0 0;
        }
        .corner.bl {
          bottom: 18px;
          left: 18px;
          border-bottom: 3px solid;
          border-left: 3px solid;
          border-radius: 0 0 0 8px;
        }
        .corner.br {
          bottom: 18px;
          right: 18px;
          border-bottom: 3px solid;
          border-right: 3px solid;
          border-radius: 0 0 8px 0;
        }

        .result-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          border-radius: 13px;
          padding: 11px 14px;
          font-size: 13.5px;
          font-weight: 700;
        }
        .result-banner.ok {
          background: color-mix(in srgb, var(--color-accent-green) 12%, var(--color-surface));
          color: #0a7a3d;
          border: 1px solid color-mix(in srgb, var(--color-accent-green) 30%, var(--color-line));
        }
        .result-banner.err {
          background: color-mix(in srgb, var(--color-corner-red) 10%, var(--color-surface));
          color: #c23f26;
          border: 1px solid color-mix(in srgb, var(--color-corner-red) 28%, var(--color-line));
        }

        .section-title {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: #3a3d45;
          margin: 0 0 10px;
        }
        .scan-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .scan-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-left: 4px solid var(--color-line);
          border-radius: 10px;
          padding: 10px 13px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.03);
        }
        .scan-row.success {
          border-left-color: var(--color-accent-green);
        }
        .scan-row.duplicate {
          border-left-color: var(--color-status-pending);
        }
        .scan-row.error {
          border-left-color: var(--color-corner-red);
        }
        .s-name {
          display: block;
          font-size: 13.5px;
          font-weight: 700;
        }
        .s-msg {
          display: block;
          font-size: 11.5px;
          color: var(--color-muted);
          margin-top: 1px;
        }
        .s-time {
          flex-shrink: 0;
          font-size: 11px;
          color: var(--color-muted);
          font-family: var(--font-mono);
        }
      `}</style>
    </div>
  );
}
