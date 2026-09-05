'use client';

import { use, useState } from 'react';
import { organizerApi } from '@/lib/api/organizer.api';
import { QrScanner } from '@/lib/qr/QrScanner';

export default function ScanAttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);

  // Gate scanning while a result is showing -- mirrors mobile's `scanned`
  // guard, resumed only by the user's own action (no auto-timeout), same as
  // mobile's ScanAttendance.tsx (contrast with ScanList's 1.5s auto-resume).
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleScan(qrData: string) {
    if (busy || result) return;
    setBusy(true);
    const res = await organizerApi.scanAttendance(qrData, eventId);
    setBusy(false);
    setResult({ ok: res.success, message: res.success ? 'Attendance marked!' : res.message || 'Failed to mark attendance' });
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-lg font-bold">Scan attendance</h1>

      {!result && <QrScanner onScan={handleScan} active={!busy} />}

      {result && (
        <div
          className={`mt-4 rounded-lg border p-4 text-sm ${
            result.ok ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <p className="mb-3 font-medium">{result.message}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setResult(null)}
              className="rounded-lg bg-black px-3 py-2 text-xs font-medium text-white"
            >
              {result.ok ? 'Scan more' : 'Try again'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
