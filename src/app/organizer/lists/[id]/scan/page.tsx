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
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-lg font-bold text-ink">Scan list</h1>
        <span className="text-sm text-muted">{scanCount} scans recorded</span>
      </div>

      <QrScanner onScan={handleScan} active={!scanned} />

      {lastResult && (
        <div className={`mt-4 rounded-md p-3 text-sm font-medium text-surface ${lastResult.ok ? 'bg-accent-green' : 'bg-corner-red'}`}>
          {lastResult.msg}
        </div>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-muted">Recent scans</h2>
        {recentScans.length === 0 ? (
          <p className="text-sm text-muted">No scans yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {recentScans.map((s) => (
              <li
                key={s.key}
                className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                  s.status === 'success'
                    ? 'border-accent-green/30 bg-accent-green/10'
                    : s.status === 'duplicate'
                      ? 'border-status-pending/30 bg-status-pending/10'
                      : 'border-corner-red/30 bg-corner-red/10'
                }`}
              >
                <div>
                  <div className="font-medium text-ink">{s.name}</div>
                  <div className="text-xs text-muted">{s.message}</div>
                </div>
                <span className="text-xs text-muted">{s.timestamp}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
