'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { organizerApi } from '@/lib/api/organizer.api';
import type { Organizer } from '@/lib/types';

const FIELDS: { key: keyof Organizer; label: string }[] = [
  { key: 'phone', label: 'Phone' },
  { key: 'state', label: 'State' },
  { key: 'district', label: 'District' },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function CamIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path
        d="M3 7.5a1.5 1.5 0 0 1 1.5-1.5h1.2l.6-1.2c.2-.4.6-.6 1-.6h3.4c.4 0 .8.2 1 .6l.6 1.2h1.2A1.5 1.5 0 0 1 15 7.5v6A1.5 1.5 0 0 1 13.5 15h-9A1.5 1.5 0 0 1 3 13.5v-6Z"
        stroke="currentColor"
        strokeWidth={1.4}
      />
      <circle cx="9" cy="10" r="2.4" stroke="currentColor" strokeWidth={1.4} />
    </svg>
  );
}
function EditIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path d="M11.5 3.5 15 7l-8 8H3.5v-3.5l8-8Z" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

export default function OrganizerProfilePage() {
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  function applyOrganizer(o: Organizer) {
    setOrganizer(o);
    setForm({
      name: o.name ?? '',
      ...Object.fromEntries(FIELDS.map((f) => [f.key, (o[f.key] as string | undefined) ?? ''])),
    });
  }

  async function refresh() {
    const res = await organizerApi.profile();
    if (res.success && res.data) applyOrganizer(res.data);
  }

  useEffect(() => {
    organizerApi
      .profile()
      .then((res) => {
        if (res.success && res.data) applyOrganizer(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }

  async function handleSave() {
    setSaving(true);
    const res = await organizerApi.updateProfile({
      name: form.name,
      phone: form.phone,
      state: form.state,
      district: form.district,
    });
    setSaving(false);
    if (res.success) {
      setEditing(false);
      refresh();
      showToast('Profile updated');
    } else {
      showToast(res.message || 'Update failed');
    }
  }

  // Cancel discards unsaved edits back to the last-saved values -- same
  // correctness fix already made on the player profile page (the pre-existing
  // organizer page left `form` untouched on Cancel, so a half-typed field
  // would still be sitting there next time Edit was pressed).
  function handleCancel() {
    if (organizer) applyOrganizer(organizer);
    setEditing(false);
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const res = await organizerApi.uploadPhoto(file);
    setUploading(false);
    if (res.success) {
      refresh();
      showToast('Photo updated');
    } else {
      showToast(res.message || 'Photo upload failed');
    }
  }

  if (loading) return <p className="text-muted">Loading profile…</p>;
  if (!organizer) return <p className="text-corner-red">Profile not found.</p>;

  const isActive = !organizer.status || organizer.status === 'active';
  const idNumber = organizer.id_number || (organizer.organizer_id ? `#${organizer.organizer_id}` : organizer.id.slice(0, 8));

  return (
    <div className="page">
      <div className="head">
        <h1>Profile</h1>
        <p>Your organization and contact details.</p>
      </div>

      <div className="photo-card">
        <button className="avatar-edit" onClick={() => fileInputRef.current?.click()} disabled={uploading} aria-label="Change photo">
          {organizer.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={organizer.photo} alt="" />
          ) : (
            <span className="initials">{initials(organizer.name)}</span>
          )}
          <span className="cam-badge">
            <CamIcon />
          </span>
          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePhotoChange} />
        </button>
        <div className="photo-info">
          <div className="name-row">
            <span className="p-name">{organizer.name}</span>
            <span className="role-pill">Organizer</span>
          </div>
          <div className="p-hint">
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? 'Uploading…' : 'Change photo'}
            </button>{' '}
            · JPG or PNG
          </div>
        </div>
      </div>

      <div className="info-card">
        <div className="info-head">
          <h2>Personal info</h2>
          {!editing && (
            <button className="edit-link" onClick={() => setEditing(true)}>
              <EditIcon />
              Edit
            </button>
          )}
        </div>

        <div className="row">
          <span className="k">Name</span>
          {editing ? (
            <input value={form.name ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          ) : (
            <span className="v">{organizer.name || 'Not set'}</span>
          )}
        </div>

        <div className="row">
          <span className="k">Email</span>
          <span className="v muted">{organizer.email}</span>
        </div>

        {FIELDS.map((f) => {
          const value = (organizer[f.key] as string) || '';
          return (
            <div className="row" key={f.key}>
              <span className="k">{f.label}</span>
              {editing ? (
                <input value={form[f.key] ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))} />
              ) : (
                <span className={`v ${!value ? 'muted' : ''}`}>{value || 'Not set'}</span>
              )}
            </div>
          );
        })}

        {editing && (
          <div className="card-actions">
            <button className="btn-cancel" onClick={handleCancel}>
              Cancel
            </button>
            <button className="btn-save" disabled={saving} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>

      <div className="info-card id-card">
        <div className="info-head">
          <h2>Organizer ID</h2>
          <span className="admin-tag">Admin-assigned</span>
        </div>

        <div className="row">
          <span className="k">ID number</span>
          <span className="v mono">{idNumber}</span>
        </div>
        <div className="row">
          <span className="k">Valid until</span>
          <span className={`v mono ${!organizer.id_valid_until ? 'muted' : ''}`}>{organizer.id_valid_until || 'Not set'}</span>
        </div>
        <div className="row" style={{ borderBottom: 'none' }}>
          <span className="k">Status</span>
          <span className={`status-pill ${isActive ? 'active' : ''}`}>{isActive ? 'Active' : organizer.status}</span>
        </div>

        <Link href="/organizer/id-card" className="view-idcard">
          View ID card →
        </Link>
      </div>

      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .page {
          max-width: 660px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 22px;
        }
        .head h1 {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.3px;
          margin: 0;
        }
        .head p {
          margin: 5px 0 0;
          font-size: 15px;
          color: #3a3d45;
        }

        .photo-card {
          display: flex;
          align-items: center;
          gap: 18px;
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 20px;
          padding: 20px 22px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -14px rgba(22, 24, 29, 0.16);
        }
        .avatar-edit {
          position: relative;
          width: 84px;
          height: 84px;
          flex-shrink: 0;
          cursor: pointer;
          border: none;
          padding: 0;
          background: none;
          border-radius: 22px;
        }
        .avatar-edit:disabled {
          cursor: default;
          opacity: 0.7;
        }
        .avatar-edit :global(img) {
          width: 100%;
          height: 100%;
          border-radius: 22px;
          object-fit: cover;
        }
        .avatar-edit .initials {
          width: 100%;
          height: 100%;
          border-radius: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-accent-green), #00e676);
          color: #fff;
          font-weight: 800;
          font-size: 26px;
        }
        .cam-badge {
          position: absolute;
          bottom: -4px;
          right: -4px;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--color-ink);
          border: 3px solid var(--color-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease, transform 0.15s ease;
        }
        .cam-badge :global(svg) {
          width: 13px;
          height: 13px;
          color: #fff;
        }
        .avatar-edit:hover:not(:disabled) .cam-badge {
          background: var(--color-accent-green);
          transform: scale(1.08);
        }
        .name-row {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-wrap: wrap;
        }
        .photo-info .p-name {
          font-size: 19px;
          font-weight: 800;
        }
        .role-pill {
          font-size: 12px;
          font-weight: 700;
          color: var(--color-accent-green);
          background: color-mix(in srgb, var(--color-accent-green) 12%, transparent);
          padding: 3px 9px;
          border-radius: 999px;
          letter-spacing: 0.2px;
        }
        .photo-info .p-hint {
          font-size: 14px;
          color: #3a3d45;
          margin-top: 5px;
        }
        .photo-info .p-hint button {
          border: none;
          background: none;
          color: var(--color-accent-green);
          font-weight: 700;
          cursor: pointer;
          padding: 0;
          font-size: 14px;
          font-family: inherit;
        }
        .photo-info .p-hint button:disabled {
          opacity: 0.6;
          cursor: default;
        }

        .info-card {
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 20px;
          padding: 6px 22px 18px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -14px rgba(22, 24, 29, 0.16);
        }
        .info-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 0 6px;
        }
        .info-head h2 {
          font-size: 13.5px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: #3a3d45;
          margin: 0;
        }
        .edit-link {
          border: none;
          background: none;
          color: var(--color-accent-green);
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          font-family: inherit;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .edit-link :global(svg) {
          width: 13px;
          height: 13px;
        }
        .admin-tag {
          font-size: 12px;
          font-weight: 700;
          color: #3a3d45;
          background: var(--color-bg);
          border: 1px solid var(--color-line);
          padding: 3px 9px;
          border-radius: 999px;
        }

        .row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 14px 0;
          border-bottom: 1px solid var(--color-line);
        }
        .row:last-of-type {
          border-bottom: none;
        }
        .row .k {
          font-size: 14.5px;
          font-weight: 600;
          color: #3a3d45;
          flex-shrink: 0;
        }
        .row .v {
          font-size: 15.5px;
          font-weight: 700;
          text-align: right;
          color: var(--color-ink);
        }
        .row .v.muted {
          color: #b7b3aa;
          font-weight: 600;
        }
        .row .v.mono {
          font-family: var(--font-mono);
          font-size: 14px;
        }
        .row input {
          width: 190px;
          max-width: 55%;
          text-align: right;
          border: 1.5px solid var(--color-line);
          border-radius: 9px;
          padding: 8px 10px;
          font-size: 15px;
          font-weight: 600;
          color: var(--color-ink);
          outline: none;
          font-family: inherit;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .row input:focus {
          border-color: var(--color-accent-green);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent-green) 14%, transparent);
        }

        .status-pill {
          font-size: 12.5px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 999px;
          color: #3a3d45;
          background: var(--color-bg);
        }
        .status-pill.active {
          color: #0a7a3d;
          background: color-mix(in srgb, var(--color-accent-green) 14%, transparent);
        }

        .card-actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
        }
        .btn-save {
          flex: 1;
          border: none;
          border-radius: 12px;
          padding: 12px;
          font-size: 15px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          background: linear-gradient(120deg, var(--color-accent-green), #00e676);
          box-shadow: 0 8px 16px -8px color-mix(in srgb, var(--color-accent-green) 55%, transparent);
          font-family: inherit;
        }
        .btn-save:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .btn-cancel {
          border: 1.5px solid var(--color-line);
          background: var(--color-surface);
          border-radius: 12px;
          padding: 12px 18px;
          font-size: 15px;
          font-weight: 700;
          color: #3a3d45;
          cursor: pointer;
          font-family: inherit;
        }

        :global(.view-idcard) {
          display: block;
          text-align: right;
          padding: 10px 0 2px;
          font-size: 13.5px;
          font-weight: 700;
          color: var(--color-accent-green);
          text-decoration: none;
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
          animation: toastIn 0.25s ease;
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
