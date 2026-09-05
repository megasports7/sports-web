'use client';

import { useEffect, useMemo, useState } from 'react';
import { playerApi } from '@/lib/api/player.api';
import type { Certificate } from '@/lib/types';

type FilterType = 'all' | 'gold' | 'silver' | 'bronze' | 'participation';
const FILTERS: FilterType[] = ['all', 'gold', 'silver', 'bronze', 'participation'];

export default function PlayerCertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    playerApi
      .certificates()
      .then((res) => {
        if (res.success && res.data) setCerts(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return certs;
    return certs.filter((c) => (c.level || c.certificate_type || '').toLowerCase() === filter);
  }, [certs, filter]);

  async function handleView(cert: Certificate) {
    if (!cert.certificate_id) return;
    setBusyId(cert.certificate_id);
    setMessage(null);
    const res = await playerApi.mintCertificateUrl(cert.certificate_id);
    setBusyId(null);
    if (res.success && res.data) {
      window.open(res.data.url, '_blank', 'noopener,noreferrer');
    } else {
      setMessage(res.message || 'Could not open certificate');
    }
  }

  // Web Share API where supported, clipboard fallback otherwise -- decided
  // this session, see docs/M7_CONTRACT.md Phase 2.
  async function handleShare(cert: Certificate) {
    if (!cert.certificate_id) return;
    setBusyId(cert.certificate_id);
    setMessage(null);
    const res = await playerApi.mintCertificateUrl(cert.certificate_id);
    setBusyId(null);
    if (!res.success || !res.data) {
      setMessage(res.message || 'Could not generate a link');
      return;
    }
    const shareData = { title: cert.event_name || 'Certificate', url: res.data.url };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled the native share sheet -- not an error
      }
    } else {
      await navigator.clipboard.writeText(res.data.url);
      setMessage('Link copied to clipboard.');
    }
  }

  if (loading) return <p className="text-gray-500">Loading certificates…</p>;

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold">My certificates ({certs.length})</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
              filter === f ? 'border-black bg-black text-white' : 'border-gray-300 text-gray-600'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500">
          {filter === 'all' ? 'No certificates yet.' : `No ${filter} certificates.`}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((c) => (
            <li key={c.certificate_id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{c.event_name || 'Event certificate'}</div>
                  <div className="text-xs uppercase text-gray-500">{c.level || c.certificate_type || 'Participation'}</div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => handleView(c)}
                    disabled={busyId === c.certificate_id}
                    className="rounded-lg border px-2 py-1 text-xs font-medium disabled:opacity-50"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleShare(c)}
                    disabled={busyId === c.certificate_id}
                    className="rounded-lg border px-2 py-1 text-xs font-medium disabled:opacity-50"
                  >
                    Share
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}
    </div>
  );
}
