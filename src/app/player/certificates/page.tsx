'use client';

import { useEffect, useMemo, useState } from 'react';
import { playerApi } from '@/lib/api/player.api';
import { downloadCertificateImage } from '@/lib/certificateDownload';
import type { Certificate } from '@/lib/types';

type Level = 'gold' | 'silver' | 'bronze' | 'participation';
type Filter = 'all' | Level;
const LEVELS: Level[] = ['gold', 'silver', 'bronze', 'participation'];
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'gold', label: 'Gold' },
  { key: 'silver', label: 'Silver' },
  { key: 'bronze', label: 'Bronze' },
  { key: 'participation', label: 'Participation' },
];

// Matches CertificateCounts' own key set (see lib/types.ts) -- any level
// value the backend doesn't recognize as gold/silver/bronze still lands
// somewhere visible (Participation) rather than silently vanishing from
// every filter but "All".
function bucketOf(c: Certificate): Level {
  const v = (c.level || c.certificate_type || '').toLowerCase();
  return (LEVELS as string[]).includes(v) ? (v as Level) : 'participation';
}

function CupIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path d="M6 3h8v4a4 4 0 0 1-8 0V3Z" stroke="currentColor" strokeWidth={1.5} />
      <path
        d="M6 4H3.5A1.5 1.5 0 0 0 3 6.9L5 8.5M14 4h2.5A1.5 1.5 0 0 1 17 6.9L15 8.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <path d="M10 11v3M7.5 17h5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}
function MedalIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="12" r="4.6" stroke="currentColor" strokeWidth={1.5} />
      <path d="M7.5 8 6 3h8l-1.5 5" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <rect x="4.5" y="2.6" width="11" height="14.8" rx="1.6" stroke="currentColor" strokeWidth={1.5} />
      <path d="M7 6.5h6M7 9.3h6M7 12.1h3.5" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
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
function ViewIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path d="M2.5 10S5.5 4.5 10 4.5 17.5 10 17.5 10 14.5 15.5 10 15.5 2.5 10 2.5 10Z" stroke="currentColor" strokeWidth={1.5} />
      <circle cx="10" cy="10" r="2.4" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
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
function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path d="M10 3v9.5M6.5 9.5 10 13l3.5-3.5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 15.5h12" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}
const LEVEL_ICON: Record<Level, () => React.ReactElement> = {
  gold: CupIcon,
  silver: MedalIcon,
  bronze: MedalIcon,
  participation: DocIcon,
};

export default function PlayerCertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('Player');
  const [playerPhoto, setPlayerPhoto] = useState<string | null>(null);

  useEffect(() => {
    playerApi
      .certificates()
      .then((res) => {
        if (res.success && res.data) setCerts(res.data);
      })
      .finally(() => setLoading(false));
    // Display name/photo for the rendered certificate card (mirrors mobile,
    // which overlays the profile name + photo onto the template).
    playerApi.profile().then((res) => {
      if (res.success && res.data) {
        if (res.data.player_name) setPlayerName(res.data.player_name);
        if (res.data.photo) setPlayerPhoto(res.data.photo);
      }
    });
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: certs.length, gold: 0, silver: 0, bronze: 0, participation: 0 };
    for (const cert of certs) c[bucketOf(cert)]++;
    return c;
  }, [certs]);

  const filtered = useMemo(
    () => (filter === 'all' ? certs : certs.filter((c) => bucketOf(c) === filter)),
    [certs, filter],
  );

  async function handleView(cert: Certificate) {
    if (!cert.certificate_id) return;
    setBusyId(cert.certificate_id);
    const res = await playerApi.mintCertificateUrl(cert.certificate_id);
    setBusyId(null);
    if (res.success && res.data) {
      window.open(res.data.url, '_blank', 'noopener,noreferrer');
    } else {
      showToast(res.message || 'Could not open certificate');
    }
  }

  // Local render + JPEG download, ported from mobile's viewer-modal capture
  // (PlayerCertificates.tsx captureCertificateImage) — no Edge Function
  // involved, so this works even where cert-view's browser link cannot.
  async function handleDownload(cert: Certificate) {
    if (!cert.certificate_id) return;
    setBusyId(cert.certificate_id);
    try {
      const row = cert as unknown as Record<string, unknown>;
      const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null);
      await downloadCertificateImage({
        level: cert.level || cert.certificate_type,
        playerName: str(row.player_name) || playerName,
        eventName: cert.event_name || 'Event',
        signName: str(row.sign_name),
        signDesignation: str(row.sign_designation),
        sign2Name: str(row.sign2_name),
        sign2Designation: str(row.sign2_designation),
        photoUrl: playerPhoto,
      });
      showToast('Certificate downloaded');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not download certificate');
    } finally {
      setBusyId(null);
    }
  }

  // Web Share API where supported, clipboard fallback otherwise -- decided
  // this session, see docs/M7_CONTRACT.md Phase 2.
  async function handleShare(cert: Certificate) {
    if (!cert.certificate_id) return;
    setBusyId(cert.certificate_id);
    const res = await playerApi.mintCertificateUrl(cert.certificate_id);
    setBusyId(null);
    if (!res.success || !res.data) {
      showToast(res.message || 'Could not generate a link');
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
      showToast('Link copied to clipboard');
    }
  }

  if (loading) return <p className="text-muted">Loading certificates…</p>;

  return (
    <div className="page">
      <div className="head">
        <h1>My certificates</h1>
        <p><b>{certs.length}</b> earned so far</p>
      </div>

      {certs.length === 0 ? (
        <div className="empty">
          <div className="empty-icon"><CupIcon /></div>
          <h2>No certificates yet</h2>
          <p>Certificates land here as soon as an organizer issues one for an event you competed in.</p>
        </div>
      ) : (
        <>
          <div className="chips" role="group" aria-label="Filter certificates">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className="chip"
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
              >
                {f.label} · {counts[f.key]}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted">No certificates in this filter.</p>
          ) : (
            <div className="grid">
              {filtered.map((c) => {
                const level = bucketOf(c);
                const Icon = LEVEL_ICON[level];
                const when = c.issue_date || c.created_at;
                const busy = busyId === c.certificate_id;
                return (
                  <div className="cert" data-level={level} key={c.certificate_id}>
                    <div className="cert-top">
                      <span className="cert-icon"><Icon /></span>
                      <span className="level-pill">{level}</span>
                    </div>
                    <p className="cert-name">{c.event_name || 'Event certificate'}</p>
                    <div className="cert-meta">
                      {c.category_name && <span>{c.category_name}</span>}
                      {when && (
                        <span className="when">
                          <CalendarIcon />
                          {new Date(when).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <div className="cert-actions">
                      <button className="btn-view" disabled={busy} onClick={() => handleView(c)}>
                        <ViewIcon />
                        View
                      </button>
                      <button className="btn-share" disabled={busy} onClick={() => handleShare(c)}>
                        <ShareIcon />
                        Share
                      </button>
                      <button className="btn-download" disabled={busy} onClick={() => handleDownload(c)}>
                        <DownloadIcon />
                        {busy ? 'Working…' : 'Download'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {toast && (
        <div className="toast">
          <svg viewBox="0 0 20 20" fill="none">
            <path d="m4 10.5 3.5 3.5L16 5.5" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {toast}
        </div>
      )}

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }
        .head h1 {
          font-size: 23px;
          font-weight: 800;
          letter-spacing: -0.3px;
          margin: 0;
        }
        .head p {
          margin: 4px 0 0;
          font-size: 13.5px;
          color: var(--color-muted);
        }
        .head p :global(b) {
          color: var(--color-ink);
          font-weight: 700;
        }

        .chips {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
        }
        .chip {
          appearance: none;
          border: 1.5px solid var(--color-line);
          background: var(--color-surface);
          border-radius: 999px;
          padding: 9px 15px;
          cursor: pointer;
          font-family: inherit;
          font-size: 12.5px;
          font-weight: 600;
          color: #3a3d45;
          transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
        }
        .chip[aria-pressed='true'] {
          background: linear-gradient(120deg, var(--color-accent-blue), #00b8d9);
          border-color: transparent;
          color: #fff;
          box-shadow: 0 6px 14px -7px color-mix(in srgb, var(--color-accent-blue) 55%, transparent);
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 14px;
        }

        .cert {
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 18px;
          padding: 18px 18px 16px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -14px rgba(22, 24, 29, 0.16);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .cert:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(22, 24, 29, 0.06), 0 16px 30px -14px rgba(22, 24, 29, 0.22);
        }
        .cert::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3.5px;
          background: var(--color-line);
        }
        .cert[data-level='gold']::before {
          background: linear-gradient(90deg, var(--color-gold), var(--color-gold-tint));
        }
        .cert[data-level='silver']::before {
          background: linear-gradient(90deg, #9aa4ae, var(--color-silver));
        }
        .cert[data-level='bronze']::before {
          background: linear-gradient(90deg, var(--color-bronze), #d98a4f);
        }
        .cert[data-level='participation']::before {
          background: linear-gradient(90deg, var(--color-accent-blue), #00b8d9);
        }
        .cert[data-level='gold'] {
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 14px 28px -16px color-mix(in srgb, var(--color-gold-tint) 55%, transparent);
        }

        .cert-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }
        .cert-icon {
          width: 44px;
          height: 44px;
          border-radius: 13px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cert-icon :global(svg) {
          width: 21px;
          height: 21px;
        }
        .cert[data-level='gold'] .cert-icon {
          background: color-mix(in srgb, var(--color-gold-tint) 24%, transparent);
          color: var(--color-gold);
        }
        .cert[data-level='silver'] .cert-icon {
          background: color-mix(in srgb, var(--color-silver) 18%, transparent);
          color: var(--color-silver);
        }
        .cert[data-level='bronze'] .cert-icon {
          background: color-mix(in srgb, var(--color-bronze) 18%, transparent);
          color: var(--color-bronze);
        }
        .cert[data-level='participation'] .cert-icon {
          background: color-mix(in srgb, var(--color-accent-blue) 12%, transparent);
          color: var(--color-accent-blue);
        }

        .level-pill {
          flex-shrink: 0;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 999px;
        }
        .cert[data-level='gold'] .level-pill {
          background: color-mix(in srgb, var(--color-gold-tint) 24%, transparent);
          color: #8a6a08;
        }
        .cert[data-level='silver'] .level-pill {
          background: color-mix(in srgb, var(--color-silver) 18%, transparent);
          color: #56616c;
        }
        .cert[data-level='bronze'] .level-pill {
          background: color-mix(in srgb, var(--color-bronze) 18%, transparent);
          color: #8a4c22;
        }
        .cert[data-level='participation'] .level-pill {
          background: color-mix(in srgb, var(--color-accent-blue) 12%, transparent);
          color: #0074b8;
        }

        .cert-name {
          font-size: 15.5px;
          font-weight: 700;
          letter-spacing: -0.1px;
          margin: 0;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .cert-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 10px;
        }
        .cert-meta span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: var(--color-muted);
        }
        .cert-meta :global(svg) {
          width: 12px;
          height: 12px;
          color: #9aa0ac;
          flex-shrink: 0;
        }
        .cert-meta .when {
          font-family: var(--font-mono);
          font-weight: 600;
          color: #3a3d45;
        }

        .cert-actions {
          display: flex;
          gap: 8px;
          margin-top: 2px;
          border-top: 1px solid var(--color-line);
          padding-top: 12px;
        }
        .cert-actions button {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-radius: 10px;
          padding: 8px 10px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }
        .cert-actions button:disabled {
          opacity: 0.5;
          cursor: default;
        }
        .cert-actions :global(svg) {
          width: 13px;
          height: 13px;
        }
        .btn-view {
          border: none;
          background: color-mix(in srgb, var(--color-accent-blue) 10%, transparent);
          color: var(--color-accent-blue);
        }
        .btn-view:hover:not(:disabled) {
          background: color-mix(in srgb, var(--color-accent-blue) 16%, transparent);
        }
        .btn-share {
          border: 1.5px solid var(--color-line);
          background: var(--color-surface);
          color: #3a3d45;
        }
        .btn-share:hover:not(:disabled) {
          border-color: #c9c6bf;
        }
        .btn-download {
          border: none;
          background: color-mix(in srgb, var(--color-accent-green) 12%, transparent);
          color: #0a8a3f;
        }
        .btn-download:hover:not(:disabled) {
          background: color-mix(in srgb, var(--color-accent-green) 20%, transparent);
        }

        .empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 64px 20px 40px;
        }
        .empty-icon {
          width: 62px;
          height: 62px;
          border-radius: 18px;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: color-mix(in srgb, var(--color-gold-tint) 20%, transparent);
          color: var(--color-gold);
        }
        .empty-icon :global(svg) {
          width: 28px;
          height: 28px;
        }
        .empty h2 {
          font-size: 17px;
          font-weight: 700;
          margin: 0 0 6px;
        }
        .empty p {
          font-size: 13.5px;
          color: var(--color-muted);
          max-width: 320px;
          margin: 0;
          line-height: 1.55;
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
          display: flex;
          align-items: center;
          gap: 8px;
          animation: toastIn 0.25s ease;
        }
        .toast :global(svg) {
          width: 14px;
          height: 14px;
          color: var(--color-accent-green);
          flex-shrink: 0;
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
