'use client';

import { use, useState } from 'react';
import { organizerApi } from '@/lib/api/organizer.api';
import { QrScanner } from '@/lib/qr/QrScanner';
import { Card } from '@/lib/ui/Card';

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
      <h1 className="mb-4 text-lg font-bold text-ink">Scan attendance</h1>

      {!result && <QrScanner onScan={handleScan} active={!busy} />}

      {result && (
        <Card accent={result.ok ? 'green' : 'red'} className="mt-4">
          <p className="mb-3 text-sm font-medium text-ink">{result.message}</p>
          <button onClick={() => setResult(null)} className="rounded-md bg-accent-green px-3 py-2 text-xs font-medium text-surface">
            {result.ok ? 'Scan more' : 'Try again'}
          </button>
        </Card>
      )}
    </div>
  );
}
