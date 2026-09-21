'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { organizerApi } from '@/lib/api/organizer.api';
import { useOrgParam, withOrg } from '@/lib/auth/orgContext';
import { QrScanner } from '@/lib/qr/QrScanner';
import {
  TANDING_AGE_CATEGORIES,
  SENI_AGE_CATEGORIES,
  WEIGHT_CATEGORIES_BY_AGE,
  SIMPLE_WEIGHT_AGES,
  SENI_CATEGORIES,
} from '@/lib/player/registrationCategories';

interface ScannedPlayer {
  player_id: string; // the real uuid (res.data.id), not the legacy display id
  player_name: string;
  state?: string;
  district?: string;
  sendToBye: boolean;
}

export default function RapidModePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const router = useRouter();
  // Phase 4: preserve admin-in-organizer ?org= when returning to batches.
  const orgParam = useOrgParam();

  const [eventName, setEventName] = useState<string | null>(null);

  const [eventCategory, setEventCategory] = useState<'' | 'TANDING' | 'SENI'>('');
  const [ageCategory, setAgeCategory] = useState('');
  const [weightCategory, setWeightCategory] = useState('');
  const [weightText, setWeightText] = useState('');
  const [seniType, setSeniType] = useState('');
  const [categoryLocked, setCategoryLocked] = useState(false);

  const [paused, setPaused] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const [players, setPlayers] = useState<ScannedPlayer[]>([]);
  const [batchName, setBatchName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    organizerApi.event(eventId).then((res) => {
      if (res.success && res.data) setEventName(res.data.event_name);
    });
  }, [eventId]);

  const ageOptions = eventCategory === 'TANDING' ? TANDING_AGE_CATEGORIES : SENI_AGE_CATEGORIES;
  const useWeightSelect = eventCategory === 'TANDING' && !!ageCategory && !SIMPLE_WEIGHT_AGES.includes(ageCategory);
  const weightValue = useWeightSelect ? weightCategory : weightText.trim();

  function categoryLabel(): string {
    const parts = ['On-spot', eventCategory, ageCategory, weightValue, seniType].filter(Boolean);
    return parts.join(' | ');
  }

  function resetCategory() {
    if (!window.confirm('Change category? This clears all scanned players.')) return;
    setPlayers([]);
    setCategoryLocked(false);
    setEventCategory('');
    setAgeCategory('');
    setWeightCategory('');
    setWeightText('');
    setSeniType('');
  }

  function currentCategories() {
    return {
      event_category: eventCategory || undefined,
      age_category: ageCategory || undefined,
      weight_category: weightValue || undefined,
      seni_category: seniType || undefined,
    };
  }

  function addPlayer(d: { id: string; player_name: string; state?: string; district?: string }) {
    if (players.length === 0) setCategoryLocked(true);
    setPlayers((prev) => [
      ...prev,
      { player_id: d.id, player_name: d.player_name, state: d.state, district: d.district, sendToBye: false },
    ]);
    setScanMessage(`Added: ${d.player_name}`);
  }

  async function handleScan(qrData: string) {
    if (scanning) return;
    // Real dedup, unlike mobile's original dead check (which compared the raw
    // scanned string against a uuid and could never match) -- compares the
    // actual resolved uuid.
    setScanning(true);
    setScanMessage(null);
    // onspot_register_by_qr, not find_player_by_qr: this page already passed
    // eventId (unlike mobile's original RapidMode.tsx), but find_player_by_qr
    // also requires the scanned player already be REGISTERED for eventId --
    // exactly backwards for an "On-spot" walk-up flow. See
    // organizerApi.onSpotRegisterByQR's own comment.
    const res = await organizerApi.onSpotRegisterByQR(eventId, qrData, currentCategories());
    setScanning(false);

    if (!res.success || !res.data) {
      setScanMessage(res.message || 'Player not found');
      return;
    }
    if (players.some((p) => p.player_id === res.data!.id)) {
      setScanMessage('This player is already in the batch.');
      return;
    }

    // Contract §3 decision 2: no organizer-approval workflow -- just surface
    // the fact and let the organizer's own next action be the decision.
    if (res.data.rejected_pending_confirmation) {
      const proceed = window.confirm(`${res.data.player_name || 'This player'} was rejected for this event. Add anyway?`);
      if (!proceed) {
        setScanMessage('Skipped (previously rejected for this event).');
        return;
      }
      setScanning(true);
      const retry = await organizerApi.onSpotRegisterByQR(eventId, qrData, currentCategories(), true);
      setScanning(false);
      if (!retry.success || !retry.data) {
        setScanMessage(retry.message || 'Failed to register player');
        return;
      }
      addPlayer(retry.data);
      return;
    }

    addPlayer(res.data);
  }

  function toggleBye(playerId: string) {
    setPlayers((prev) => prev.map((p) => (p.player_id === playerId ? { ...p, sendToBye: !p.sendToBye } : p)));
  }
  function removePlayer(playerId: string) {
    setPlayers((prev) => {
      const next = prev.filter((p) => p.player_id !== playerId);
      if (next.length === 0) setCategoryLocked(false);
      return next;
    });
  }
  // Naming matches mobile exactly: "Select all" marks everyone active (not
  // BYE), "Deselect all" sends everyone to BYE.
  const selectAll = () => setPlayers((prev) => prev.map((p) => ({ ...p, sendToBye: false })));
  const deselectAll = () => setPlayers((prev) => prev.map((p) => ({ ...p, sendToBye: true })));

  const activeCount = players.filter((p) => !p.sendToBye).length;
  const byesRequired = activeCount < 2 ? 0 : Math.pow(2, Math.ceil(Math.log2(activeCount))) - activeCount;

  async function handleCreateBatch() {
    const activePlayers = players.filter((p) => !p.sendToBye);
    if (activePlayers.length < 2) {
      setError('Need at least 2 active players to create a batch.');
      return;
    }
    setCreating(true);
    setError(null);
    const label = categoryLabel();
    const res = await organizerApi.createBatch({
      event_id: eventId,
      batch_name: batchName.trim() || label,
      category_label: label,
      player_ids: activePlayers.map((p) => p.player_id),
    });
    setCreating(false);
    if (res.success) {
      router.push(withOrg(`/organizer/events/${eventId}/batches`, orgParam));
    } else {
      setError(res.message || 'Could not create batch');
    }
  }

  return (
    <div className="page">
      <div className="head">
        <h1>Rapid mode</h1>
        {eventName && <p>{eventName}</p>}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Category</h2>
          {categoryLocked && (
            <button className="chip-btn warn" onClick={resetCategory}>
              Change category
            </button>
          )}
        </div>
        <div className="field-grid">
          <div className="field">
            <select
              value={eventCategory}
              disabled={categoryLocked}
              onChange={(e) => {
                setEventCategory(e.target.value as 'TANDING' | 'SENI');
                setAgeCategory('');
                setWeightCategory('');
                setWeightText('');
                setSeniType('');
              }}
            >
              <option value="">Event category</option>
              <option value="TANDING">TANDING</option>
              <option value="SENI">SENI</option>
            </select>
          </div>

          {eventCategory && (
            <div className="field">
              <select
                value={ageCategory}
                disabled={categoryLocked}
                onChange={(e) => {
                  setAgeCategory(e.target.value);
                  setWeightCategory('');
                  setWeightText('');
                }}
              >
                <option value="">Age category</option>
                {ageOptions.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {eventCategory === 'TANDING' &&
            ageCategory &&
            (useWeightSelect ? (
              <div className="field">
                <select value={weightCategory} disabled={categoryLocked} onChange={(e) => setWeightCategory(e.target.value)}>
                  <option value="">Weight category</option>
                  {(WEIGHT_CATEGORIES_BY_AGE[ageCategory] ?? []).map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="field">
                <input value={weightText} disabled={categoryLocked} onChange={(e) => setWeightText(e.target.value)} placeholder="Weight (kg)" />
              </div>
            ))}

          {eventCategory === 'SENI' && ageCategory && (
            <div className="field">
              <select value={seniType} disabled={categoryLocked} onChange={(e) => setSeniType(e.target.value)}>
                <option value="">Seni type</option>
                {SENI_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {(eventCategory || ageCategory) && <span className="category-label">{categoryLabel()}</span>}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Scan players</h2>
          <button className="chip-btn" onClick={() => setPaused((p) => !p)}>
            {paused ? 'Resume camera' : 'Pause camera'}
          </button>
        </div>
        {!paused ? (
          <div className="scanner-frame">
            <QrScanner onScan={handleScan} active={!scanning} className="scanner-inner" />
            <span className="corner tl" />
            <span className="corner tr" />
            <span className="corner bl" />
            <span className="corner br" />
          </div>
        ) : (
          <div className="scanner-frame">
            <span className="paused-state">Scanner paused</span>
          </div>
        )}
        {scanMessage && <span className="scan-msg">{scanMessage}</span>}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>
            Players ({players.length}) <span>— {activeCount} active</span>
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="chip-btn" onClick={selectAll}>
              Select all
            </button>
            <button className="chip-btn" onClick={deselectAll}>
              Deselect all
            </button>
          </div>
        </div>
        {byesRequired > 0 && (
          <div className="byes-note">
            ⚠ {byesRequired} bye{byesRequired === 1 ? '' : 's'} required — {activeCount} active players isn&apos;t a power of two
          </div>
        )}
        {players.length === 0 ? (
          <p className="text-muted">No players scanned yet.</p>
        ) : (
          <div className="bracket">
            {players.map((p, i) => (
              <div className="roster-row" key={p.player_id}>
                <span className={`roster-num ${p.sendToBye ? 'bye' : ''}`}>{String(i + 1).padStart(2, '0')}</span>
                <div className="roster-main">
                  <span>
                    <span className="r-name">{p.player_name}</span>
                    <span className="r-loc">{[p.state, p.district].filter(Boolean).join(' · ') || '-'}</span>
                  </span>
                  <div className="roster-actions">
                    <label className="bye-label">
                      <input type="checkbox" checked={p.sendToBye} onChange={() => toggleBye(p.player_id)} />
                      Bye
                    </label>
                    <button className="remove-link" onClick={() => removePlayer(p.player_id)}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="field">
          <input value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder={categoryLabel() || 'Custom Batch'} />
        </div>
        {error && <p className="text-corner-red">{error}</p>}
        <button className="btn-primary" onClick={handleCreateBatch} disabled={creating || activeCount < 2}>
          {creating ? 'Creating…' : `Create batch & go to manage (${activeCount} players)`}
        </button>
      </div>

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
          color: var(--color-accent-green);
          font-weight: 700;
        }

        .card {
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 18px;
          padding: 18px 20px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -14px rgba(22, 24, 29, 0.16);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }
        .card-head h2 {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: #3a3d45;
          margin: 0;
        }
        .card-head h2 span {
          text-transform: none;
          color: var(--color-muted);
          font-weight: 600;
          letter-spacing: 0;
        }

        .chip-btn {
          border: 1.5px solid var(--color-line);
          background: var(--color-bg);
          border-radius: 9px;
          padding: 7px 13px;
          font-size: 12px;
          font-weight: 600;
          color: #3a3d45;
          cursor: pointer;
          font-family: inherit;
        }
        .chip-btn:hover {
          border-color: var(--color-accent-green);
          color: var(--color-accent-green);
        }
        .chip-btn.warn {
          border-color: color-mix(in srgb, var(--color-corner-red) 35%, var(--color-line));
          color: #c23f26;
          background: color-mix(in srgb, var(--color-corner-red) 6%, var(--color-bg));
        }
        .chip-btn.warn:hover {
          border-color: var(--color-corner-red);
        }

        /* 1-3 fields show up here depending on how far the cascade has gone
           (event category alone, +age, +weight-or-seni) -- auto-fit instead
           of a fixed 2-column grid so 3 fields fill one row evenly instead
           of leaving an orphan cell, collapsing to 1 column on narrow
           screens without a separate media query. */
        .field-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }
        .field select,
        .field input {
          width: 100%;
          border: 1.5px solid var(--color-line);
          border-radius: 10px;
          padding: 9px 10px;
          font-size: 13.5px;
          font-family: inherit;
          color: var(--color-ink);
          background: var(--color-surface);
        }
        .field select:disabled,
        .field input:disabled {
          opacity: 0.55;
        }
        .category-label {
          display: inline-block;
          font-size: 12px;
          color: var(--color-muted);
          font-family: var(--font-mono);
          background: var(--color-bg);
          border-radius: 8px;
          padding: 6px 10px;
        }

        .scanner-frame {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          background: #0c0d10;
          aspect-ratio: 4 / 3;
        }
        .scanner-frame :global(video) {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        /* Same dual-purpose className note as the other two scan pages --
           QrScanner applies this one class to either the video wrapper or
           the state-message text. */
        .scanner-frame :global(.scanner-inner) {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 0 26px;
          font-size: 11.5px;
          font-weight: 600;
          color: #b7bcc6;
        }
        .corner {
          position: absolute;
          width: 26px;
          height: 26px;
          border-color: #00e676;
          opacity: 0.9;
          pointer-events: none;
        }
        .corner.tl {
          top: 16px;
          left: 16px;
          border-top: 3px solid;
          border-left: 3px solid;
          border-radius: 8px 0 0 0;
        }
        .corner.tr {
          top: 16px;
          right: 16px;
          border-top: 3px solid;
          border-right: 3px solid;
          border-radius: 0 8px 0 0;
        }
        .corner.bl {
          bottom: 16px;
          left: 16px;
          border-bottom: 3px solid;
          border-left: 3px solid;
          border-radius: 0 0 0 8px;
        }
        .corner.br {
          bottom: 16px;
          right: 16px;
          border-bottom: 3px solid;
          border-right: 3px solid;
          border-radius: 0 0 8px 0;
        }
        .paused-state {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #b7bcc6;
          font-size: 13px;
          font-weight: 600;
        }
        .scan-msg {
          font-size: 12.5px;
          font-weight: 600;
          color: #0a7a3d;
        }

        .byes-note {
          display: flex;
          align-items: center;
          gap: 8px;
          background: color-mix(in srgb, var(--color-status-pending) 12%, transparent);
          border: 1px solid color-mix(in srgb, var(--color-status-pending) 30%, transparent);
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 12.5px;
          font-weight: 600;
          color: #8a6a10;
        }

        .bracket {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding-left: 22px;
        }
        .bracket::before {
          content: '';
          position: absolute;
          left: 7px;
          top: 6px;
          bottom: 20px;
          width: 1px;
          background: var(--color-line);
        }
        .roster-row {
          position: relative;
        }
        .roster-num {
          position: absolute;
          left: -22px;
          top: 1px;
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background: var(--color-surface);
          border: 1.5px solid var(--color-accent-green);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          font-weight: 700;
          color: var(--color-accent-green);
          font-family: var(--font-mono);
        }
        .roster-num.bye {
          border-color: var(--color-status-pending);
          color: #8a6a10;
        }
        .roster-main {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }
        .r-name {
          font-size: 14px;
          font-weight: 700;
        }
        .r-loc {
          font-size: 12px;
          color: var(--color-muted);
          margin-left: 8px;
          font-weight: 500;
        }
        .roster-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .bye-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          font-weight: 700;
          color: #3a3d45;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .bye-label input {
          accent-color: var(--color-status-pending);
          width: 15px;
          height: 15px;
        }
        .remove-link {
          font-size: 12px;
          font-weight: 700;
          color: var(--color-corner-red);
          background: none;
          border: none;
          cursor: pointer;
          font-family: inherit;
          padding: 0;
        }

        .btn-primary {
          border: none;
          border-radius: 13px;
          padding: 12px 22px;
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          font-family: inherit;
          background: linear-gradient(120deg, var(--color-accent-green), #00e676);
          box-shadow: 0 10px 20px -10px color-mix(in srgb, var(--color-accent-green) 55%, transparent);
        }
        .btn-primary:disabled {
          background: #e5e3de;
          color: #a8a49b;
          box-shadow: none;
          cursor: default;
        }
      `}</style>
    </div>
  );
}
