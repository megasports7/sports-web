'use client';

import { useEffect, useRef, useState } from 'react';
import { organizerApi } from '@/lib/api/organizer.api';
import type { Organizer } from '@/lib/types';

const FIELDS: { key: keyof Organizer; label: string }[] = [
  { key: 'phone', label: 'Phone' },
  { key: 'state', label: 'State' },
  { key: 'district', label: 'District' },
];

export default function OrganizerProfilePage() {
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // No setState synchronously in the effect body -- `loading` already starts
  // `true`, and a post-mutation refresh (after save/photo upload) shouldn't
  // flash back to the loading view, so refresh() below never touches it.
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

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const res = await organizerApi.updateProfile({
      name: form.name,
      phone: form.phone,
      state: form.state,
      district: form.district,
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
    const res = await organizerApi.uploadPhoto(file);
    setUploading(false);
    if (res.success) {
      setMessage('Photo updated.');
      refresh();
    } else {
      setMessage(res.message || 'Photo upload failed');
    }
  }

  if (loading) return <p className="text-gray-500">Loading profile…</p>;
  if (!organizer) return <p className="text-red-600">Profile not found.</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Profile</h1>

      <section className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4">
        {organizer.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={organizer.photo} alt="" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-400">
            No photo
          </div>
        )}
        <div>
          <div className="font-bold">{organizer.name}</div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mt-1 text-sm font-medium underline disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Change photo'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-600">Personal info</h2>
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-sm font-medium underline">
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Name
              <input
                value={form.name ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            {FIELDS.map((f) => (
              <label key={f.key} className="flex flex-col gap-1 text-sm">
                {f.label}
                <input
                  value={form[f.key] ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
            ))}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} className="rounded-lg border px-3 py-2 text-sm font-medium">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <dl className="flex flex-col gap-2 text-sm">
            <Row label="Name" value={organizer.name || '-'} />
            <Row label="Email" value={organizer.email || '-'} />
            {FIELDS.map((f) => (
              <Row key={f.key} label={f.label} value={(organizer[f.key] as string) || '-'} />
            ))}
          </dl>
        )}

        {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-600">ID (admin-assigned)</h2>
        <dl className="flex flex-col gap-2 text-sm">
          <Row label="ID number" value={organizer.id_number || '-'} />
          <Row label="ID valid until" value={organizer.id_valid_until || '-'} />
        </dl>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gray-100 pb-2">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
