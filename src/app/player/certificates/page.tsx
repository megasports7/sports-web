'use client';

import { useEffect, useMemo, useState } from 'react';
import { playerApi } from '@/lib/api/player.api';
import { Card } from '@/lib/ui/Card';
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

  if (loading) return <p className="text-muted">Loading certificates…</p>;

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-ink">My certificates ({certs.length})</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
              filter === f ? 'border-accent-blue bg-accent-blue text-surface' : 'border-line text-muted'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">{filter === 'all' ? 'No certificates yet.' : `No ${filter} certificates.`}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((c) => (
            <Card
              as="li"
              key={c.certificate_id}
              accent={c.level === 'gold' ? 'pending' : c.level === 'bronze' ? 'red' : 'none'}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-ink">{c.event_name || 'Event certificate'}</div>
                  <div className="text-xs uppercase text-muted">{c.level || c.certificate_type || 'Participation'}</div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => handleView(c)}
                    disabled={busyId === c.certificate_id}
                    className="rounded-md border border-line px-2 py-1 text-xs font-medium text-ink disabled:opacity-50"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleShare(c)}
                    disabled={busyId === c.certificate_id}
                    className="rounded-md border border-line px-2 py-1 text-xs font-medium text-ink disabled:opacity-50"
                  >
                    Share
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </ul>
      )}

      {message && <p className="mt-3 text-sm text-muted">{message}</p>}
    </div>
  );
}
