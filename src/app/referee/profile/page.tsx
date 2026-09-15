'use client';

import { useEffect, useRef, useState } from 'react';
import { refereeApi } from '@/lib/api/referee.api';
import type { RefereeProfile } from '@/lib/types';

const FIELDS: { key: keyof RefereeProfile; label: string }[] = [
  { key: 'phone', label: 'Phone' },
  { key: 'state', label: 'State' },
  { key: 'district', label: 'District' },
  { key: 'blood_group', label: 'Blood group' },
  { key: 'emergency_contact', label: 'Emergency contact' },
];

/** Same helper as dashboard/matches/id-card's own initials() -- kept as a
 *  local copy rather than a new shared module, matching the per-file
 *  convention every other role's pages already use for small display
 *  helpers. */
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <rect x="2.5" y="6" width="15" height="10.5" rx="2.2" stroke="currentColor" strokeWidth={1.5} />
      <path d="M7 6 8.1 4h3.8L13 6" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx="10" cy="11.2" r="2.9" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

export default function RefereeProfilePage() {
  const [referee, setReferee] = useState<RefereeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  function applyReferee(r: RefereeProfile) {
    setReferee(r);
    setForm({
      name: r.name ?? '',
      ...Object.fromEntries(FIELDS.map((f) => [f.key, (r[f.key] as string | undefined) ?? ''])),
    });
  }

  async function refresh() {
    const res = await refereeApi.profile();
    if (res.success && res.data) applyReferee(res.data);
  }

  useEffect(() => {
    refereeApi
      .profile()
      .then((res) => {
        if (res.success && res.data) applyReferee(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const res = await refereeApi.updateProfile({
      name: form.name,
      phone: form.phone,
      state: form.state,
      district: form.district,
      blood_group: form.blood_group,
      emergency_contact: form.emergency_contact,
    });
    setSaving(false);
    if (res.success) {
      setMessage('Profile updated.');
      setEditing(false);
      refresh();
    } else {
      setMessage(res.message || 'Update failed');
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    const res = await refereeApi.uploadPhoto(file);
    setUploading(false);
    if (res.success) {
      setMessage('Photo updated.');
      refresh();
    } else {
      setMessage(res.message || 'Photo upload failed');
    }
  }

  if (loading) return <p className="text-muted">Loading profile…</p>;
  if (!referee) return <p className="text-corner-red">Profile not found.</p>;

  return (
    <div className="page">
      <div className="identity-card">
        <div className="avatar-wrap">
          {referee.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={referee.photo} alt="" className="avatar-photo" />
          ) : (
            <div className="avatar-fallback">{initials(referee.name)}</div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="avatar-edit"
            aria-label={uploading ? 'Uploading photo' : 'Change photo'}
          >
            <CameraIcon />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>
        <div className="identity-text">
          <div className="identity-name">{referee.name}</div>
          <div className="identity-sub">{uploading ? 'Uploading…' : referee.email}</div>
        </div>
      </div>

      <section>
        <div className="section-head">
          <p className="section-title">Personal info</p>
          {!editing && (
            <button type="button" onClick={() => setEditing(true)} className="edit-link">
              Edit
            </button>
          )}
        </div>

        <div className="field-card">
          {editing ? (
            <div className="edit-form">
              <label className="field">
                Name
                <input
                  value={form.name ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </label>
              {FIELDS.map((f) => (
                <label key={f.key} className="field">
                  {f.label}
                  <input
                    value={form[f.key] ?? ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </label>
              ))}
              <div className="form-actions">
                <button type="button" onClick={handleSave} disabled={saving} className="save-btn">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => setEditing(false)} className="cancel-btn">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <dl>
              <Row label="Email" value={referee.email} />
              {FIELDS.map((f) => (
                <Row key={f.key} label={f.label} value={(referee[f.key] as string) || '-'} />
              ))}
              <Row label="DOB" value={referee.dob || '-'} />
              <Row label="Gender" value={referee.gender || '-'} />
            </dl>
          )}

          {message && <p className="msg">{message}</p>}
        </div>
      </section>

      <section>
        <p className="section-title">ID (admin-assigned)</p>
        <div className="field-card">
          <dl>
            <Row label="ID number" value={referee.id_number || '-'} />
            <Row label="ID valid until" value={referee.id_valid_until || '-'} />
          </dl>
        </div>
      </section>

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 22px;
          max-width: 520px;
          margin: 0 auto;
        }

        /* Same blue-to-periwinkle pair as the dashboard's own "Profile"
           quick action tile, so this page visually matches the tile that
           links to it -- same idea as the ID card's own navy/indigo band. */
        .identity-card {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          gap: 16px;
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 20px;
          padding: 18px 20px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -12px rgba(22, 24, 29, 0.14);
        }
        .identity-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(180deg, var(--color-accent-blue), #5b6ee8);
        }
        .avatar-wrap {
          position: relative;
          flex-shrink: 0;
        }
        .avatar-photo,
        .avatar-fallback {
          width: 76px;
          height: 76px;
          border-radius: 999px;
          object-fit: cover;
        }
        .avatar-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-accent-blue), #5b6ee8);
          color: #fff;
          font-weight: 800;
          font-size: 24px;
          box-shadow: 0 8px 16px -8px color-mix(in srgb, var(--color-accent-blue) 50%, transparent);
        }
        .avatar-edit {
          position: absolute;
          right: -2px;
          bottom: -2px;
          width: 28px;
          height: 28px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-accent-blue);
          color: #fff;
          border: 2.5px solid var(--color-surface);
          cursor: pointer;
        }
        .avatar-edit:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .avatar-edit :global(svg) {
          width: 13px;
          height: 13px;
        }
        .identity-text {
          position: relative;
          z-index: 1;
          min-width: 0;
        }
        .identity-name {
          font-size: 17px;
          font-weight: 800;
          letter-spacing: -0.2px;
        }
        .identity-sub {
          font-size: 12.5px;
          color: var(--color-muted);
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .section-title {
          font-size: 14px;
          font-weight: 700;
          color: #3a3d45;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin: 0;
        }
        :global(.edit-link) {
          border: none;
          background: none;
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          color: var(--color-accent-indigo);
          padding: 0;
        }

        .field-card {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 18px;
          padding: 4px 18px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -12px rgba(22, 24, 29, 0.14);
        }

        :global(.detail-row) {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 13px 0;
          border-bottom: 1px solid var(--color-line);
        }
        :global(.detail-row:last-child) {
          border-bottom: none;
        }
        :global(.detail-label) {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-muted);
        }
        :global(.detail-value) {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--color-ink);
          text-align: right;
        }

        .edit-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 16px 0;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12.5px;
          font-weight: 700;
          color: var(--color-muted);
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .field :global(input) {
          border: 1.5px solid var(--color-line);
          background: var(--color-bg);
          border-radius: 12px;
          padding: 10px 12px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
          text-transform: none;
          letter-spacing: normal;
          color: var(--color-ink);
        }
        .form-actions {
          display: flex;
          gap: 8px;
          margin-top: 2px;
        }
        /* background/text drawn from the same ink/bg pair so it stays
           readable regardless of theme -- same convention as matches'
           own submit-btn (a form-confirm action, not an entry CTA, so it
           doesn't take the blue gradient used to *open* an action). */
        :global(.save-btn) {
          flex: 1;
          border: none;
          border-radius: 12px;
          padding: 10px 0;
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 700;
          color: var(--color-bg);
          cursor: pointer;
          background: var(--color-ink);
        }
        :global(.save-btn:disabled) {
          opacity: 0.5;
        }
        :global(.cancel-btn) {
          border: 1.5px solid var(--color-line);
          background: var(--color-surface);
          border-radius: 12px;
          padding: 10px 18px;
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 700;
          color: var(--color-ink);
          cursor: pointer;
        }

        .msg {
          margin: 12px 0 14px;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--color-muted);
          background: var(--color-bg);
          border: 1px solid var(--color-line);
          border-radius: 10px;
          padding: 8px 12px;
        }
      `}</style>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <dt className="detail-label">{label}</dt>
      <dd className="detail-value">{value}</dd>
    </div>
  );
}
