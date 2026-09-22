'use client';

import { useEffect, useRef, useState } from 'react';
import { playerApi } from '@/lib/api/player.api';
import type { GeoDistrict, GeoState, Player } from '@/lib/types';

const FIELDS: { key: keyof Player; label: string; icon: () => React.ReactElement }[] = [
  { key: 'phone', label: 'Phone', icon: PhoneIcon },
  { key: 'state', label: 'State', icon: PinIcon },
  { key: 'district', label: 'District', icon: PinIcon },
  { key: 'sport', label: 'Sport', icon: SportIcon },
  { key: 'blood_group', label: 'Blood group', icon: BloodIcon },
  { key: 'emergency_contact', label: 'Emergency contact', icon: PhoneIcon },
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
function MailIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path stroke="currentColor" strokeWidth={1.5} d="M3 5.5h14v9a1.2 1.2 0 0 1-1.2 1.2H4.2A1.2 1.2 0 0 1 3 14.5v-9Z" />
      <path stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" d="m3.4 5.8 6.1 5 6.1-5" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path
        d="M4 5.5c0-1 .7-1.5 1.5-1.5h1.7c.5 0 .9.3 1 .8l.7 2.4c.1.5 0 1-.4 1.3l-1 .9c.8 1.8 2.2 3.2 4 4l.9-1c.3-.4.8-.5 1.3-.4l2.4.7c.5.1.8.5.8 1V15c0 .8-.5 1.5-1.5 1.5C9 16.5 4 11.5 4 5.5Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path
        d="M10 2.6c-3 0-5.4 2.3-5.4 5.5 0 4 5.4 9.3 5.4 9.3s5.4-5.3 5.4-9.3c0-3.2-2.4-5.5-5.4-5.5Z"
        stroke="currentColor"
        strokeWidth={1.4}
      />
      <circle cx="10" cy="8" r="1.8" stroke="currentColor" strokeWidth={1.4} />
    </svg>
  );
}
function SportIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path
        d="M10 2.6 15.5 5v4.4c0 4-2.4 6.8-5.5 8-3.1-1.2-5.5-4-5.5-8V5L10 2.6Z"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}
function BloodIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path d="M10 17.5S3 13 3 7.8A3.8 3.8 0 0 1 10 5.5a3.8 3.8 0 0 1 7 2.3c0 5.2-7 9.7-7 9.7Z" stroke="currentColor" strokeWidth={1.5} />
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
function GenderIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="6.2" r="3.2" stroke="currentColor" strokeWidth={1.5} />
      <path d="M3.5 17c.6-4 3-6.2 6.5-6.2s5.9 2.2 6.5 6.2" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export default function PlayerProfilePage() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Step 7: canonical geography dropdowns in edit mode (never free text).
  // Stored values stay canonical NAMES -- resolvers match names/aliases.
  const [geoStates, setGeoStates] = useState<GeoState[]>([]);
  const [geoDistricts, setGeoDistricts] = useState<GeoDistrict[]>([]);
  const [geoStateId, setGeoStateId] = useState('');

  function applyProfile(p: Player) {
    setPlayer(p);
    setForm({
      ...Object.fromEntries(FIELDS.map((f) => [f.key, (p[f.key] as string | undefined) ?? ''])),
      dob: p.dob ? p.dob.slice(0, 10) : '',
      gender: p.gender ?? '',
      declared_weight_kg: p.declared_weight_kg != null ? String(p.declared_weight_kg) : '',
    });
  }

  async function refresh() {
    const res = await playerApi.profile();
    if (res.success && res.data) applyProfile(res.data);
  }

  useEffect(() => {
    playerApi
      .profile()
      .then((res) => {
        if (res.success && res.data) applyProfile(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }

  // Entering edit mode preloads master data and pins the state select to
  // the player's current canonical state (matched by name).
  async function startEdit() {
    setEditing(true);
    const sRes = await playerApi.geoStates();
    if (sRes.success && sRes.data) {
      setGeoStates(sRes.data);
      const current = (form.state ?? player?.state ?? '').trim().toLowerCase();
      const match = sRes.data.find((s) => s.name.toLowerCase() === current);
      if (match) {
        setGeoStateId(match.id);
        const dRes = await playerApi.geoDistricts(match.id);
        if (dRes.success && dRes.data) setGeoDistricts(dRes.data);
      }
    }
  }

  async function handleGeoStateChange(nextStateId: string) {
    setGeoStateId(nextStateId);
    const name = geoStates.find((s) => s.id === nextStateId)?.name ?? '';
    setForm((prev) => ({ ...prev, state: name, district: '' }));
    if (!nextStateId) {
      setGeoDistricts([]);
      return;
    }
    const res = await playerApi.geoDistricts(nextStateId);
    if (res.success && res.data) setGeoDistricts(res.data);
  }

  async function handleSave() {
    const declaredWeight = parseWeight(form.declared_weight_kg ?? '');
    if (declaredWeight === undefined) {
      showToast('Enter a weight between 0 and 500 kg, or leave it blank');
      return;
    }
    setSaving(true);
    // declared_weight_kg: empty → null, otherwise number
    const payload: Record<string, unknown> = { ...form };
    const rawWeight = (form.declared_weight_kg ?? '').trim();
    if (rawWeight === '') payload.declared_weight_kg = null;
    else {
      const n = Number(rawWeight);
      if (!Number.isFinite(n) || n <= 0 || n > 500) {
        setSaving(false);
        showToast('Weight must be 0-500 kg');
        return;
      }
      payload.declared_weight_kg = n;
    }
    // dob: empty → null, otherwise keep YYYY-MM-DD string
    if (!form.dob) payload.dob = null;
    // gender: empty → null
    if (!form.gender) payload.gender = null;

    const res = await playerApi.updateProfile(payload);
    setSaving(false);
    if (res.success) {
      setEditing(false);
      refresh();
      showToast('Profile updated');
    } else {
      showToast(res.message || 'Update failed');
    }
  }

  // Cancel discards unsaved edits back to the last-saved values -- the
  // original plain-styled page left `form` untouched on Cancel, so a
  // half-typed field would still be sitting there next time Edit was
  // pressed. Fixed here rather than ported faithfully: a one-line
  // correctness gap, not a design choice worth preserving.
  function handleCancel() {
    if (player) applyProfile(player);
    setEditing(false);
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const res = await playerApi.uploadPhoto(file);
    setUploading(false);
    if (res.success) {
      refresh();
      showToast('Photo updated');
    } else {
      showToast(res.message || 'Photo upload failed');
    }
  }

  if (loading) return <p className="text-muted">Loading profile…</p>;
  if (!player) return <p className="text-corner-red">Profile not found.</p>;

  return (
    <div className="page">
      <div className="head">
        <h1>Profile</h1>
        <p>Your personal and emergency details.</p>
      </div>

      <div className="photo-card">
        <button className="avatar-edit" onClick={() => fileInputRef.current?.click()} disabled={uploading} aria-label="Change photo">
          {player.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.photo} alt="" />
          ) : (
            <span className="initials">{initials(player.player_name)}</span>
          )}
          <span className="cam-badge">
            <CamIcon />
          </span>
          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePhotoChange} />
        </button>
        <div className="photo-info">
          <div className="p-name">{player.player_name}</div>
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
            <button className="edit-link" onClick={startEdit}>
              <EditIcon />
              Edit
            </button>
          )}
        </div>

        <div className="row">
          <span className="k">
            <MailIcon />
            Email
          </span>
          <span className="v">{player.email}</span>
        </div>

        {FIELDS.map((f) => {
          const Icon = f.icon;
          const isGeo = f.key === 'state' || f.key === 'district';
          return (
            <div className="row" key={f.key}>
              <span className="k">
                <Icon />
                {f.label}
              </span>
              {editing ? (
                isGeo ? (
                  f.key === 'state' ? (
                    <select value={geoStateId} onChange={(e) => handleGeoStateChange(e.target.value)}>
                      <option value="">Select</option>
                      {geoStates.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={form.district ?? ''}
                      onChange={(e) => setForm((prev) => ({ ...prev, district: e.target.value }))}
                      disabled={!geoStateId}
                    >
                      <option value="">{geoStateId ? 'Select' : 'Select a state first'}</option>
                      {geoDistricts.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  )
                ) : (
                  <input value={form[f.key] ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))} />
                )
              ) : (
                <span className={`v ${!player[f.key] ? 'muted' : f.key === 'blood_group' ? 'blood' : ''}`}>
                  {(player[f.key] as string) || 'Not set'}
                </span>
              )}
            </div>
          );
        })}

        <div className="row">
          <span className="k">
            <WeightIcon />
            Declared weight
          </span>
          {editing ? (
            <input
              type="number"
              min="0.01"
              max="500"
              step="0.01"
              inputMode="decimal"
              value={form.declared_weight_kg ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, declared_weight_kg: e.target.value }))}
              placeholder="kg"
              aria-label="Declared weight in kilograms"
            />
          ) : (
            <span className={`v ${player.declared_weight_kg == null ? 'muted' : ''}`}>
              {formatWeight(player.declared_weight_kg)}
            </span>
          )}
        </div>

        <div className="row">
          <span className="k">
            <CalendarIcon />
            Date of birth
          </span>
          {editing ? (
            <input type="date" value={form.dob ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, dob: e.target.value }))} />
          ) : (
            <span className={`v ${!player.dob ? 'muted' : ''}`}>{player.dob ? new Date(player.dob).toLocaleDateString() : 'Not set'}</span>
          )}
        </div>
        <div className="row">
          <span className="k">
            <GenderIcon />
            Gender
          </span>
          {editing ? (
            <select value={form.gender ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value }))}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          ) : (
            <span className={`v ${!player.gender ? 'muted' : ''}`}>{player.gender || 'Not set'}</span>
          )}
        </div>
        <div className="row">
          <span className="k">Declared weight (kg)</span>
          {editing ? (
            <input
              type="number"
              min="0.01"
              max="500"
              step="0.01"
              value={form.declared_weight_kg ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, declared_weight_kg: e.target.value }))}
              placeholder="e.g. 42"
            />
          ) : (
            <span className={`v ${player.declared_weight_kg == null ? 'muted' : ''}`}>
              {player.declared_weight_kg != null ? `${player.declared_weight_kg} kg` : 'Not set'}
            </span>
          )}
        </div>
        <div className="row">
          <span className="k">Verified weight</span>
          <span className={`v ${player.verified_weight_kg == null ? 'muted' : ''}`}>
            {player.verified_weight_kg != null ? `${player.verified_weight_kg} kg` : 'Not set (organizer verifies)'}
          </span>
        </div>
        <button
          className="btn-save"
          style={{ marginTop: 8 }}
          disabled={verifying || editing || player.declared_weight_kg == null}
          onClick={async () => {
            setVerifying(true);
            const res = await playerApi.demoVerifyWeight();
            setVerifying(false);
            if (res.success) {
              showToast('Weight verified (demo)');
              refresh();
            } else {
              showToast(res.message || 'Verify failed');
            }
          }}
        >
          {verifying ? 'Verifying…' : 'Verify weight (Demo)'}
        </button>
        {editing && (
          <p style={{ fontSize: 11, color: 'var(--color-muted)', margin: '4px 0 0' }}>
            Save changes first, then verify — verify copies the saved declared weight.
          </p>
        )}
        <p style={{ fontSize: 11, color: 'var(--color-muted)', margin: '4px 0 0' }}>Demo — worktree QA only. Change age/gender/weight to test your categories.</p>

        <div className="weight-verification" aria-label="Weight verification status">
          <div className="weight-verified-row">
            <span>Verified weight</span>
            <strong className={player.verified_weight_kg == null ? 'muted' : ''}>{formatWeight(player.verified_weight_kg)}</strong>
          </div>
          {player.weight_verified_at ? (
            <p>
              Verified by {player.weight_verified_by_name || 'Organizer'} on {new Date(player.weight_verified_at).toLocaleDateString()}.
            </p>
          ) : (
            <p>Awaiting organizer verification.</p>
          )}
          {hasWeightMismatch(player) && <p className="weight-mismatch">Your declared and verified weights are different.</p>}
        </div>

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

      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .page {
          max-width: 640px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
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
          background: linear-gradient(135deg, var(--color-accent-blue), #00b8d9);
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
          background: var(--color-accent-blue);
          transform: scale(1.08);
        }
        .photo-info .p-name {
          font-size: 17px;
          font-weight: 800;
        }
        .photo-info .p-hint {
          font-size: 12.5px;
          color: var(--color-muted);
          margin-top: 3px;
        }
        .photo-info .p-hint button {
          border: none;
          background: none;
          color: var(--color-accent-blue);
          font-weight: 700;
          cursor: pointer;
          padding: 0;
          font-size: 12.5px;
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
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          color: var(--color-muted);
          margin: 0;
        }
        .edit-link {
          border: none;
          background: none;
          color: var(--color-accent-blue);
          font-weight: 700;
          font-size: 12.5px;
          cursor: pointer;
          font-family: inherit;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .edit-link :global(svg) {
          width: 12px;
          height: 12px;
        }

        .row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 13px 0;
          border-bottom: 1px solid var(--color-line);
        }
        .row:last-of-type {
          border-bottom: none;
        }
        .row .k {
          font-size: 12.5px;
          color: var(--color-muted);
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .row .k :global(svg) {
          width: 13px;
          height: 13px;
          color: #9aa0ac;
        }
        .row .v {
          font-size: 13.5px;
          font-weight: 700;
          text-align: right;
        }
        .row .v.muted {
          color: #b7b3aa;
          font-weight: 600;
        }
        .row .v.blood {
          color: var(--color-corner-red);
        }
        .row input {
          width: 190px;
          max-width: 55%;
          text-align: right;
          border: 1.5px solid var(--color-line);
          border-radius: 9px;
          padding: 7px 10px;
          font-size: 13.5px;
          font-weight: 600;
          color: var(--color-ink);
          outline: none;
          font-family: inherit;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .row select {
          width: 190px;
          max-width: 55%;
          text-align: right;
          border: 1.5px solid var(--color-line);
          border-radius: 9px;
          padding: 7px 10px;
          font-size: 13.5px;
          font-weight: 600;
          color: var(--color-ink);
          outline: none;
          font-family: inherit;
          background: var(--color-surface);
        }
        .row select:disabled {
          opacity: 0.5;
        }
        .row input:focus {
          border-color: var(--color-accent-blue);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent-blue) 14%, transparent);
        }
        .weight-verification {
          margin-top: 16px;
          padding: 13px 14px;
          border-radius: 12px;
          background: color-mix(in srgb, var(--color-accent-blue) 6%, var(--color-surface));
          border: 1px solid color-mix(in srgb, var(--color-accent-blue) 16%, var(--color-line));
        }
        .weight-verified-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          color: #3a3d45;
          font-size: 12.5px;
        }
        .weight-verified-row strong {
          color: var(--color-ink);
        }
        .weight-verified-row strong.muted {
          color: #b7b3aa;
          font-weight: 600;
        }
        .weight-verification p {
          margin: 7px 0 0;
          color: var(--color-muted);
          font-size: 12px;
          line-height: 1.45;
        }
        .weight-verification p.weight-mismatch {
          color: #b42318;
          font-weight: 700;
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
          padding: 11px;
          font-size: 13.5px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          background: linear-gradient(120deg, var(--color-accent-blue), #00b8d9);
          box-shadow: 0 8px 16px -8px color-mix(in srgb, var(--color-accent-blue) 55%, transparent);
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
          padding: 11px 18px;
          font-size: 13.5px;
          font-weight: 700;
          color: #3a3d45;
          cursor: pointer;
          font-family: inherit;
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

function WeightIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 6.2A3.2 3.2 0 0 1 7.2 3h5.6A3.2 3.2 0 0 1 16 6.2v7.6a3.2 3.2 0 0 1-3.2 3.2H7.2A3.2 3.2 0 0 1 4 13.8V6.2Z" stroke="currentColor" strokeWidth={1.4} />
      <path d="M7 9.5a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
      <path d="m10 9.5 1.8-1.2" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
    </svg>
  );
}

function parseWeight(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 500 ? parsed : undefined;
}

function formatWeight(value?: number | null): string {
  return value == null ? 'Not set' : `${Number(value)} kg`;
}

function hasWeightMismatch(player: Player): boolean {
  return player.declared_weight_kg != null
    && player.verified_weight_kg != null
    && Number(player.declared_weight_kg) !== Number(player.verified_weight_kg);
}
