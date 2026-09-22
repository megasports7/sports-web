'use client';

/**
 * Shared secretary profile page (both portals): read-only identity +
 * jurisdiction + live grant list. Nothing here is editable -- jurisdiction
 * and permissions are admin-managed (the freeze trigger + RLS reject
 * self-edits server-side anyway).
 */
import { useEffect, useState } from 'react';
import { secretaryApi } from '@/lib/api/secretary.api';
import type { SecretaryPermission } from '@/lib/types';

export function SecretaryProfile() {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [perms, setPerms] = useState<SecretaryPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([secretaryApi.profile(), secretaryApi.myPermissions()]).then(([pRes, gRes]) => {
      if (pRes.success && pRes.data) {
        setProfile(pRes.data);
        setError(null);
      } else {
        setError(pRes.message || 'Could not load profile');
      }
      if (gRes.success && gRes.data) setPerms(gRes.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-muted">Loading profile…</p>;
  if (error || !profile) return <p className="text-error">{error ?? 'Profile not found.'}</p>;

  const rows: [string, string][] = [
    ['Name', String(profile.name ?? '—')],
    ['Email', String(profile.email ?? '—')],
    ['Phone', String(profile.phone ?? '—')],
    ['Role', String(profile.role ?? '—').replace(/_/g, ' ')],
    ['State', String(profile.state ?? '—')],
    ['District (text)', String(profile.district ?? '—')],
  ];

  return (
    <div className="profile">
      <div className="card">
        <h2>Profile</h2>
        <dl>
          {rows.map(([k, v]) => (
            <div key={k} className="row">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="card">
        <h2>My permissions ({perms.length})</h2>
        {perms.length === 0 ? (
          <p className="text-muted">No grants yet — ask an admin to assign permissions.</p>
        ) : (
          <ul className="perms">
            {perms.map((p) => (
              <li key={p} className="font-mono">
                {p}
              </li>
            ))}
          </ul>
        )}
      </div>

      <style jsx>{`
        .profile {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-width: 640px;
        }
        .card {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 14px;
          padding: 16px 18px;
        }
        .card h2 {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: #3a3d45;
          margin: 0 0 12px;
        }
        .row {
          display: flex;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid var(--color-line);
          font-size: 13.5px;
        }
        .row:last-child {
          border-bottom: none;
        }
        .row dt {
          width: 140px;
          flex-shrink: 0;
          color: var(--color-muted);
        }
        .row dd {
          margin: 0;
          color: var(--color-ink);
          font-weight: 600;
          text-transform: capitalize;
        }
        .perms {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .perms li {
          font-size: 12px;
          border: 1px solid var(--color-line);
          border-radius: 999px;
          padding: 4px 12px;
          background: color-mix(in srgb, var(--color-accent-green) 8%, transparent);
        }
      `}</style>
    </div>
  );
}
