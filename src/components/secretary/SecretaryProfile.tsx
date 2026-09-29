'use client';

/**
 * Shared secretary profile page (both portals): read-only identity +
 * jurisdiction + live grant list in the approved dashboard design
 * language. Nothing here is editable -- jurisdiction and permissions are
 * admin-managed (the freeze trigger + RLS reject self-edits server-side
 * anyway). All values come from secretaryApi.profile()/scope()/
 * myPermissions(); nothing is invented.
 */
import { useEffect, useState } from 'react';
import { secretaryApi, type SecretaryKind } from '@/lib/api/secretary.api';
import { SECRETARY_PERMISSIONS, type SecretaryPermission } from '@/lib/types';

const GROUPS: { title: string; keys: SecretaryPermission[] }[] = [
  {
    title: 'Tournament',
    keys: ['manage_events', 'create_events', 'delete_events', 'manage_registrations', 'manage_batches', 'manage_matches'],
  },
  {
    title: 'People',
    keys: ['view_players', 'verify_players', 'referee_mgmt'],
  },
  {
    title: 'Credentials',
    keys: ['attendance_ops', 'certificate_ops'],
  },
];

const LABELS: Record<SecretaryPermission, string> = {
  view_players: 'View players',
  verify_players: 'Verify players',
  manage_registrations: 'Manage registrations',
  manage_events: 'Manage events',
  create_events: 'Create events',
  delete_events: 'Delete events',
  manage_batches: 'Manage batches',
  manage_matches: 'Manage matches',
  attendance_ops: 'Attendance',
  referee_mgmt: 'Referees',
  certificate_ops: 'Certificates',
};

function Icon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  switch (name) {
    case 'mail':
      return (
        <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 7 8.5 6 8.5-6" /></svg>
      );
    case 'phone':
      return (
        <svg {...common}><path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg>
      );
    case 'id':
      return (
        <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="11" r="2" /><path d="M5.5 16.5c.6-1.8 1.7-2.7 3-2.7s2.4.9 3 2.7" /><path d="M14 9.5h4.5" /><path d="M14 13h4.5" /></svg>
      );
    case 'pin':
      return (
        <svg {...common}><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
      );
    case 'shield':
      return (
        <svg {...common}><path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6l-7-3Z" /><path d="m9.5 12 2 2 3.5-4" /></svg>
      );
    default:
      return null;
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function SecretaryProfile({ kind }: { kind: SecretaryKind }) {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [perms, setPerms] = useState<SecretaryPermission[]>([]);
  const [scopeLabel, setScopeLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const roleLabel = kind === 'district_secretary' ? 'District Secretary' : 'State Secretary';
  const accentVar =
    kind === 'district_secretary' ? 'var(--color-role-district-secretary)' : 'var(--color-role-state-secretary)';

  useEffect(() => {
    Promise.all([secretaryApi.profile(), secretaryApi.myPermissions(), secretaryApi.scope()]).then(
      ([pRes, gRes, sRes]) => {
        if (pRes.success && pRes.data) {
          setProfile(pRes.data);
          setError(null);
        } else {
          setError(pRes.message || 'Could not load profile');
        }
        if (gRes.success && gRes.data) setPerms(gRes.data);
        if (sRes.success && sRes.data) setScopeLabel(sRes.data.label);
        setLoading(false);
      },
    );
  }, []);

  if (loading) return <p className="text-muted">Loading profile…</p>;
  if (error || !profile) return <p className="text-error">{error ?? 'Profile not found.'}</p>;

  const name = String(profile.name ?? '—');
  const email = String(profile.email ?? '—');
  const phone = String(profile.phone ?? '—');
  const role = String(profile.role ?? '—').replace(/_/g, ' ');
  const state = String(profile.state ?? '—');
  const district = String(profile.district ?? '—');
  const granted = new Set(perms);

  return (
    <div className="profile">
      <header className="head">
        <div>
          <span className="crumb">
            {roleLabel} · {scopeLabel ?? '…'}
          </span>
          <h1>Profile</h1>
          <p>Account identity and jurisdiction — read-only. Changes are admin-managed.</p>
        </div>
        {scopeLabel && (
          <span className="scope-pill">
            <span className="dot" />
            {scopeLabel}
          </span>
        )}
      </header>

      <section className="card identity">
        <span className="avatar">{initials(name)}</span>
        <div className="id-main">
          <strong>{name}</strong>
          <span className="id-email">{email}</span>
          <span className="id-pills">
            <span className="pill role">{role}</span>
            {scopeLabel && <span className="pill juris">{scopeLabel}</span>}
          </span>
        </div>
      </section>

      <div className="grid">
        <section className="card">
          <div className="card-head">
            <span className="tile sm blue"><Icon name="mail" /></span>
            <h2>Contact</h2>
          </div>
          <div className="field">
            <span className="f-icon"><Icon name="mail" /></span>
            <div>
              <span className="f-label">Email</span>
              <strong className="f-value">{email}</strong>
            </div>
          </div>
          <div className="field">
            <span className="f-icon"><Icon name="phone" /></span>
            <div>
              <span className="f-label">Phone</span>
              <strong className="f-value">{phone}</strong>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <span className="tile sm violet"><Icon name="pin" /></span>
            <h2>Assignment</h2>
          </div>
          <div className="field">
            <span className="f-icon"><Icon name="id" /></span>
            <div>
              <span className="f-label">Role</span>
              <strong className="f-value cap">{role}</strong>
            </div>
          </div>
          <div className="field">
            <span className="f-icon"><Icon name="pin" /></span>
            <div>
              <span className="f-label">State / District (record text)</span>
              <strong className="f-value">{state} · {district}</strong>
            </div>
          </div>
        </section>
      </div>

      <section className="card action">
        <div className="card-head">
          <span className="tile sm green"><Icon name="shield" /></span>
          <h2>
            My permissions <span className="count-badge">{perms.length} of {SECRETARY_PERMISSIONS.length} granted</span>
          </h2>
        </div>
        {perms.length === 0 ? (
          <p className="text-muted">No grants yet — ask an admin to assign permissions.</p>
        ) : (
          GROUPS.map((g) => (
            <div key={g.title} className="perm-group">
              <span className="g-label">{g.title}</span>
              <div className="perm-chips">
                {g.keys.map((k) =>
                  granted.has(k) ? (
                    <span key={k} className="perm on">✓ {LABELS[k]}</span>
                  ) : (
                    <span key={k} className="perm off">○ {LABELS[k]}</span>
                  ),
                )}
              </div>
            </div>
          ))
        )}
        <p className="card-foot">Granted rows enforce every read and action server-side — revoking takes effect immediately.</p>
      </section>

      <style jsx>{`
        .profile {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--color-line);
          margin-bottom: 2px;
        }
        .crumb {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: ${accentVar};
        }
        .head h1 {
          margin: 4px 0 2px;
          font-size: 27px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .head p {
          margin: 0;
          font-size: 15px;
          color: var(--color-muted);
        }
        .scope-pill {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 14px;
          font-weight: 700;
          border-radius: 999px;
          padding: 7px 14px;
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          box-shadow: 0 1px 2px rgba(16, 20, 24, 0.06);
          white-space: nowrap;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${accentVar};
        }
        .card {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 14px;
          padding: 18px 20px;
          box-shadow: 0 1px 2px rgba(16, 20, 24, 0.05);
        }
        .card.action {
          box-shadow: inset 0 3px 0 #1c9a5b, 0 1px 2px rgba(16, 20, 24, 0.05);
        }
        .identity {
          display: flex;
          gap: 16px;
          align-items: center;
          box-shadow: inset 0 3px 0 ${accentVar}, 0 1px 2px rgba(16, 20, 24, 0.05);
        }
        .avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: color-mix(in srgb, ${accentVar} 12%, #eef0f3);
          color: ${accentVar};
          font-size: 22px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .id-main {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .id-main > strong {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.3px;
        }
        .id-email {
          font-size: 14.5px;
          color: var(--color-muted);
        }
        .id-pills {
          display: flex;
          gap: 6px;
          margin-top: 6px;
          flex-wrap: wrap;
        }
        .pill {
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 0.3px;
          border-radius: 999px;
          padding: 4px 12px;
          white-space: nowrap;
          text-transform: capitalize;
        }
        .pill.role {
          background: var(--color-ink);
          color: #fff;
        }
        .pill.juris {
          background: color-mix(in srgb, ${accentVar} 12%, transparent);
          color: ${accentVar};
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 1000px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
        .card-head {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }
        .card-head h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: -0.1px;
        }
        .tile {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .tile.sm {
          width: 36px;
          height: 36px;
          border-radius: 10px;
        }
        .tile.blue { background: #e8effd; color: #2456c6; }
        .tile.violet { background: #efe9fb; color: #6a3fb5; }
        .tile.green { background: #e3f4e8; color: #177245; }
        .count-badge {
          font-size: 13px;
          font-weight: 700;
          color: #5b6470;
          background: #eef0f3;
          border-radius: 999px;
          padding: 3px 10px;
          vertical-align: 2px;
          margin-left: 6px;
        }
        .field {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 12px 2px;
          border-bottom: 1px solid var(--color-line);
        }
        .field:last-child {
          border-bottom: none;
        }
        .f-icon {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          background: #f2f4f7;
          color: #5b6470;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .field > div {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }
        .f-label {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: var(--color-muted);
        }
        .f-value {
          font-size: 15.5px;
          overflow-wrap: anywhere;
        }
        .f-value.cap {
          text-transform: capitalize;
        }
        .perm-group {
          margin-bottom: 12px;
        }
        .perm-group:last-of-type {
          margin-bottom: 4px;
        }
        .g-label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: var(--color-muted);
          margin-bottom: 6px;
        }
        .perm-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .perm {
          font-size: 13.5px;
          font-weight: 700;
          border-radius: 999px;
          padding: 6px 14px;
          white-space: nowrap;
        }
        .perm.on {
          background: #e3f4e8;
          color: #146c40;
        }
        .perm.off {
          background: transparent;
          border: 1px solid var(--color-line);
          color: #9aa2ad;
        }
        .card-foot {
          margin: 10px 0 0;
          font-size: 13px;
          color: var(--color-muted);
        }
      `}</style>
    </div>
  );
}
