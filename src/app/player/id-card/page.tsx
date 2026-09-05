'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { playerApi } from '@/lib/api/player.api';
import type { Player } from '@/lib/types';

export default function PlayerIdCardPage() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

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
          setQrDataUrl(await QRCode.toDataURL(qrValue, { width: 160, margin: 1 }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

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
      setMessage('Copied to clipboard.');
    }
  }

  if (loading) return <p className="text-gray-500">Loading ID card…</p>;
  if (!player) return <p className="text-red-600">ID card not available.</p>;

  // player_id (legacy_id) is null for every self-signup player -- fall back
  // to a short slice of the real uuid rather than displaying "#null".
  const idNumber = player.id_number || player.nsrd_id || (player.player_id ? `#${player.player_id}` : player.id.slice(0, 8));

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      {/* View-only for v1 -- decided this session, see docs/M7_CONTRACT.md
          Phase 2. No download-as-image; right-click-save or print covers it. */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-4">
          {player.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.photo} alt="" className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-lg bg-gray-100" />
          )}
          <div>
            <div className="font-bold">{player.player_name}</div>
            <div className="text-xs text-gray-500">{idNumber}</div>
            {player.sport && <div className="text-xs font-medium">{player.sport}</div>}
          </div>
        </div>

        {qrDataUrl && (
          <div className="mt-4 flex flex-col items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="Player QR code" width={160} height={160} />
            <span className="text-xs text-gray-400">Scan to verify</span>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-2 text-sm font-semibold text-gray-600">Emergency information</h2>
        <dl className="flex flex-col gap-2 text-sm">
          <Row label="Blood type" value={player.blood_group || 'N/A'} />
          <Row label="Date of birth" value={player.dob || 'N/A'} />
          <Row label="Gender" value={player.gender || 'N/A'} />
          <Row label="Emergency contact" value={player.emergency_contact || 'N/A'} />
        </dl>
      </section>

      <button onClick={handleShare} className="rounded-lg border px-3 py-2 text-sm font-medium">
        Share
      </button>
      {message && <p className="text-sm text-gray-600">{message}</p>}
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
