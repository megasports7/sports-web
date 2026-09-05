'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { organizerApi } from '@/lib/api/organizer.api';
import type { Organizer } from '@/lib/types';

export default function OrganizerIdCardPage() {
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    organizerApi
      .profile()
      .then(async (res) => {
        if (res.success && res.data) {
          setOrganizer(res.data);
          // Universal scanner token format used across this codebase --
          // PLAYER: prefix regardless of the scanned profile's role. Falls
          // back to the real uuid when organizer_id (legacy_id) is absent,
          // same null-safety as the player ID card -- though note neither
          // find_player_by_qr nor scan_for_list will ever actually resolve
          // an organizer's own badge (both hard-require role='player'); this
          // QR is decorative/display-only until that's separately decided.
          const qrValue = `PLAYER:${res.data.organizer_id ?? res.data.id}`;
          setQrDataUrl(await QRCode.toDataURL(qrValue, { width: 160, margin: 1 }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading ID card…</p>;
  if (!organizer) return <p className="text-red-600">ID card not available.</p>;

  const idNumber = organizer.id_number || (organizer.organizer_id ? `#${organizer.organizer_id}` : organizer.id.slice(0, 8));

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      {/* View-only, matching the player ID card's own v1 decision -- no
          download-as-image button. */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-4">
          {organizer.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={organizer.photo} alt="" className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-lg bg-gray-100" />
          )}
          <div>
            <div className="font-bold">{organizer.name}</div>
            <div className="text-xs text-gray-500">{idNumber}</div>
            <div className="text-xs font-medium">Organizer</div>
          </div>
        </div>

        {qrDataUrl && (
          <div className="mt-4 flex flex-col items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="Organizer QR code" width={160} height={160} />
            <span className="text-xs text-gray-400">Scan to verify</span>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-2 text-sm font-semibold text-gray-600">Organization details</h2>
        <dl className="flex flex-col gap-2 text-sm">
          <Row label="District" value={organizer.district || 'N/A'} />
          <Row label="State" value={organizer.state || 'N/A'} />
        </dl>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
