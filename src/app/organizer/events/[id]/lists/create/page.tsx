'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { organizerApi } from '@/lib/api/organizer.api';
import { useOrgParam, withOrg } from '@/lib/auth/orgContext';
import type { AttendanceList } from '@/lib/types';

const MODES = ['Enter', 'Leave', 'Lunch', 'Other'];

export default function CreateAttendanceListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // Phase 4: preserve admin-in-organizer ?org= on the scan link.
  const orgParam = useOrgParam();

  const [eventName, setEventName] = useState<string | null>(null);

  const [purpose, setPurpose] = useState('');
  const [mode, setMode] = useState(MODES[0]);
  const [uniqueOnly, setUniqueOnly] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [lists, setLists] = useState<AttendanceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  async function refreshLists() {
    const res = await organizerApi.getAttendanceLists(id);
    if (res.success && res.data) {
      setLists(res.data);
      setListError(null);
    } else {
      setListError(res.message || 'Could not load past lists');
    }
  }

  useEffect(() => {
    organizerApi.event(id).then((res) => {
      if (res.success && res.data) setEventName(res.data.event_name);
    });
  }, [id]);

  // Inlined directly (not via refreshLists()) -- calling a locally-defined
  // function that itself sets state from inside an effect body trips
  // react-hooks/set-state-in-effect; every other page in this app that
  // passes lint does its initial fetch inline like this, reserving the
  // named helper for post-submit refreshes triggered from event handlers.
  useEffect(() => {
    organizerApi
      .getAttendanceLists(id)
      .then((res) => {
        if (res.success && res.data) {
          setLists(res.data);
          setListError(null);
        } else {
          setListError(res.message || 'Could not load past lists');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!purpose.trim()) {
      showToast('Purpose is required');
      return;
    }

    setSubmitting(true);
    const res = await organizerApi.createAttendanceList({
      event_id: id,
      purpose: purpose.trim(),
      mode,
      unique_only: uniqueOnly,
    });
    setSubmitting(false);

    if (res.success) {
      showToast('Attendance list created');
      setPurpose('');
      setMode(MODES[0]);
      setUniqueOnly(true);
      refreshLists();
    } else {
      showToast(res.message || 'Could not create attendance list');
    }
  }

  return (
    <div className="page">
      <div className="head">
        <h1>Create attendance list</h1>
        {eventName && <p>{eventName}</p>}
      </div>

      <form onSubmit={handleSubmit} className="card">
        <label className="field">
          <span>Purpose</span>
          <input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Day 1 Check-in" />
        </label>

        <label className="field">
          <span>Mode</span>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            {MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="checkbox-row">
          <input type="checkbox" checked={uniqueOnly} onChange={(e) => setUniqueOnly(e.target.checked)} />
          Unique scan per player
        </label>

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create list'}
        </button>
      </form>

      <div>
        <h2 className="section-title">Past lists</h2>

        {loading ? (
          <p className="text-muted">Loading lists…</p>
        ) : listError ? (
          <p className="text-corner-red">{listError}</p>
        ) : lists.length === 0 ? (
          <p className="text-muted">No attendance lists yet.</p>
        ) : (
          <div className="lists">
            {lists.map((l) => (
              <div className="list-card" key={l.list_id}>
                <div className="list-info">
                  <span className="l-purpose">{l.purpose}</span>
                  <span className="l-meta">
                    {l.mode}
                    {l.created_at && ` · ${new Date(l.created_at).toLocaleDateString()}`}
                  </span>
                </div>
                <div className="l-count">
                  <span className="n">{l.scan_count ?? 0}</span>
                  <span className="lbl">Scans</span>
                </div>
                <Link href={withOrg(`/organizer/lists/${l.list_id}/scan`, orgParam)} className="btn-scan">
                  Scan
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .page {
          max-width: 680px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .head h1 {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.3px;
          margin: 0;
        }
        .head p {
          margin: 5px 0 0;
          font-size: 14px;
          color: #3a3d45;
        }
        .section-title {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: #3a3d45;
          margin: 0 0 10px;
        }

        .card {
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 18px;
          padding: 18px 20px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -14px rgba(22, 24, 29, 0.16);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field span {
          font-size: 12.5px;
          font-weight: 600;
          color: #3a3d45;
        }
        .field select,
        .field input {
          border: 1.5px solid var(--color-line);
          border-radius: 10px;
          padding: 9px 10px;
          font-size: 13.5px;
          font-family: inherit;
          color: var(--color-ink);
          background: var(--color-surface);
        }
        .field select:focus,
        .field input:focus {
          outline: none;
          border-color: var(--color-accent-green);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent-green) 14%, transparent);
        }
        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 13px;
          font-weight: 600;
          color: #3a3d45;
        }
        .checkbox-row input {
          width: 17px;
          height: 17px;
          accent-color: var(--color-accent-green);
        }

        .btn-primary {
          align-self: flex-start;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: none;
          border-radius: 13px;
          padding: 11px 22px;
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          font-family: inherit;
          background: linear-gradient(120deg, var(--color-accent-green), #00e676);
          box-shadow: 0 10px 20px -10px color-mix(in srgb, var(--color-accent-green) 55%, transparent);
          transition: transform 0.08s ease, filter 0.1s ease, box-shadow 0.12s ease;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .btn-primary:hover:not(:disabled) {
          filter: brightness(1.05);
          transform: translateY(-1px);
        }
        .btn-primary:active:not(:disabled) {
          transform: scale(0.96) translateY(0);
          filter: brightness(0.94);
          transition: transform 0.04s ease;
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: default;
        }

        .lists {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .list-card {
          display: flex;
          align-items: center;
          gap: 14px;
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 14px;
          padding: 14px 16px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 8px 18px -14px rgba(22, 24, 29, 0.14);
        }
        .list-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .l-purpose {
          font-size: 14.5px;
          font-weight: 700;
        }
        .l-meta {
          font-size: 12.5px;
          color: var(--color-muted);
          font-weight: 500;
        }
        .l-count {
          flex-shrink: 0;
          text-align: right;
        }
        .l-count .n {
          display: block;
          font-size: 16px;
          font-weight: 800;
          font-family: var(--font-mono);
        }
        .l-count .lbl {
          display: block;
          font-size: 9.5px;
          color: var(--color-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        :global(.btn-scan) {
          flex-shrink: 0;
          display: inline-flex;
          border: none;
          border-radius: 10px;
          padding: 8px 16px;
          font-size: 12.5px;
          font-weight: 700;
          color: #fff;
          text-decoration: none;
          background: linear-gradient(120deg, var(--color-accent-green), #00e676);
          box-shadow: 0 4px 10px -6px color-mix(in srgb, var(--color-accent-green) 50%, transparent);
          transition: transform 0.08s ease, filter 0.1s ease;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        :global(.btn-scan:hover) {
          filter: brightness(1.05);
        }
        :global(.btn-scan:active) {
          transform: scale(0.94);
          filter: brightness(0.92);
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
        }

        @media (max-width: 560px) {
          .list-card {
            flex-wrap: wrap;
          }
          .list-info {
            order: 1;
            width: 100%;
          }
          .l-count {
            order: 2;
          }
          :global(.btn-scan) {
            order: 3;
            margin-left: auto;
          }
        }
      `}</style>
    </div>
  );
}
