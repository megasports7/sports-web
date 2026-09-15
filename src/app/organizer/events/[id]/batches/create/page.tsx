'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { organizerApi } from '@/lib/api/organizer.api';
import type { FilteredPlayer } from '@/lib/types';
import { WEIGHT_CATEGORIES_BY_AGE, SIMPLE_WEIGHT_AGES } from '@/lib/player/registrationCategories';

// Flat key list -- shared between TANDING_AGE_CATEGORIES and
// SENI_AGE_CATEGORIES in registrationCategories.ts (same keys, different
// display labels). This is a filter dropdown, not a registration form, so
// the bare key doubles as its own label.
const AGE_CATEGORIES = ['Senior', 'Junior', 'Pre-Junior', 'Pre-Teen', 'Singa', 'Maccan', 'Master-1', 'Master-2'];

// Mobile's CreateBatchScreen filters on this blunter 4-value set, not the
// finer Ganda-P1/Regu-P2/etc. keys SENI_CATEGORIES uses at registration time
// -- ported as-is, not reconciled.
const SENI_TYPES = ['TUNGGAL', 'SOLO', 'GANDA', 'REGU'];

export default function CreateBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [eventName, setEventName] = useState<string | null>(null);

  const [eventCategory, setEventCategory] = useState('');
  const [ageCategory, setAgeCategory] = useState('');
  const [weightCategory, setWeightCategory] = useState('');
  const [weightText, setWeightText] = useState('');
  const [seniType, setSeniType] = useState('');

  const [hasSearched, setHasSearched] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [players, setPlayers] = useState<FilteredPlayer[]>([]);
  const [total, setTotal] = useState(0);
  const [byesRequired, setByesRequired] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [batchName, setBatchName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    organizerApi.event(id).then((res) => {
      if (res.success && res.data) setEventName(res.data.event_name);
    });
  }, [id]);

  // Same cascading rule as the player registration page: a select backed by
  // WEIGHT_CATEGORIES_BY_AGE when the age has real weight classes, a plain
  // input for the two SIMPLE_WEIGHT_AGES (Singa/Maccan) or when no TANDING
  // age is chosen yet.
  const useWeightSelect = eventCategory === 'TANDING' && !!ageCategory && !SIMPLE_WEIGHT_AGES.includes(ageCategory);
  const weightValue = useWeightSelect ? weightCategory : weightText.trim();

  function computeLabel(): string {
    const parts = [eventCategory, ageCategory, weightValue, seniType].filter(Boolean);
    return parts.length ? parts.join(' | ') : 'Custom Batch';
  }

  async function handleShowPlayers() {
    setLoadingPlayers(true);
    setError(null);
    setHasSearched(true);
    const res = await organizerApi.getFilteredPlayers(id, {
      event_category: eventCategory || undefined,
      age_category: ageCategory || undefined,
      weight_category: weightValue || undefined,
      seni_type: seniType || undefined,
    });
    setLoadingPlayers(false);
    if (res.success && res.data) {
      setPlayers(res.data.players);
      setTotal(res.data.total);
      setByesRequired(res.data.byes_required);
      // Pre-checked by default, matching mobile's own behavior.
      setSelected(new Set(res.data.players.map((p) => p.player_id)));
    } else {
      setPlayers([]);
      setTotal(0);
      setByesRequired(0);
      setSelected(new Set());
      setError(res.message || 'Could not load players');
    }
  }

  function toggle(playerId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  async function handleCreate() {
    if (selected.size === 0) return;
    setCreating(true);
    setError(null);
    const label = computeLabel();
    const finalName = batchName.trim() || label;
    // player_ids are FilteredPlayer.player_id -- already the real profile
    // uuid (getFilteredPlayers' own doc comment), never coerced with Number().
    const res = await organizerApi.createBatch({
      event_id: id,
      batch_name: finalName,
      category_label: label,
      player_ids: Array.from(selected),
    });
    setCreating(false);
    if (res.success) {
      router.push(`/organizer/events/${id}/batches`);
    } else {
      setError(res.message || 'Could not create batch');
    }
  }

  return (
    <div className="page">
      <div className="head">
        <h1>Create batch</h1>
        {eventName && <p>{eventName}</p>}
      </div>

      <div className="card">
        <h2>Filter players</h2>
        <div className="field-grid">
          <label className="field">
            <span>Event category</span>
            <select
              value={eventCategory}
              onChange={(e) => {
                setEventCategory(e.target.value);
                setAgeCategory('');
                setWeightCategory('');
                setWeightText('');
                setSeniType('');
              }}
            >
              <option value="">Any</option>
              <option value="TANDING">TANDING</option>
              <option value="SENI">SENI</option>
            </select>
          </label>

          <label className="field">
            <span>Age category</span>
            <select
              value={ageCategory}
              onChange={(e) => {
                setAgeCategory(e.target.value);
                setWeightCategory('');
                setWeightText('');
              }}
            >
              <option value="">Any</option>
              {AGE_CATEGORIES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Weight category</span>
            {useWeightSelect ? (
              <select value={weightCategory} onChange={(e) => setWeightCategory(e.target.value)}>
                <option value="">Any</option>
                {(WEIGHT_CATEGORIES_BY_AGE[ageCategory] ?? []).map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            ) : (
              <input value={weightText} onChange={(e) => setWeightText(e.target.value)} placeholder="Weight category (optional)" />
            )}
          </label>

          <label className="field">
            <span>Seni type</span>
            <select value={seniType} onChange={(e) => setSeniType(e.target.value)}>
              <option value="">Any</option>
              {SENI_TYPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button type="button" className="btn-primary" onClick={handleShowPlayers} disabled={loadingPlayers}>
          {loadingPlayers ? 'Loading…' : 'Show players'}
        </button>
      </div>

      {hasSearched && (
        <div className="card">
          <div className="results-head">
            <span className="results-title">
              Players ({total}) — <span>{selected.size} selected</span>
            </span>
            <div className="chip-row">
              <button type="button" className="chip" onClick={() => setSelected(new Set(players.map((p) => p.player_id)))}>
                Select all
              </button>
              <button type="button" className="chip" onClick={() => setSelected(new Set())}>
                Deselect all
              </button>
            </div>
          </div>

          {byesRequired > 0 && <div className="byes-note">⚠ {byesRequired} bye{byesRequired === 1 ? '' : 's'} required — odd number of players in this bracket</div>}

          {loadingPlayers ? (
            <p className="text-muted">Loading players…</p>
          ) : players.length === 0 ? (
            <p className="text-muted">No players match these filters.</p>
          ) : (
            <div className="player-list">
              {players.map((p) => (
                <label className="player-row" key={p.registration_id}>
                  <input type="checkbox" checked={selected.has(p.player_id)} onChange={() => toggle(p.player_id)} />
                  <span>
                    <span className="p-name">{p.player_name}</span>
                    <span className="p-cat">{[p.event_category, p.age_category, p.weight_category, p.seni_category].filter(Boolean).join(' · ')}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card">
        <label className="field">
          <span>Batch name (optional)</span>
          <input value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder={computeLabel()} />
        </label>

        {error && <p className="text-corner-red">{error}</p>}

        <button type="button" className="btn-primary full" onClick={handleCreate} disabled={creating || selected.size === 0}>
          {creating ? 'Creating…' : 'Create batch'}
        </button>
      </div>

      <style jsx>{`
        .page {
          max-width: 720px;
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
        .card h2 {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: #3a3d45;
          margin: 0;
        }

        .field-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
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
          box-shadow: 0 12px 22px -8px color-mix(in srgb, var(--color-accent-green) 60%, transparent);
          transform: translateY(-1px);
        }
        .btn-primary:active:not(:disabled) {
          transform: scale(0.96) translateY(0);
          filter: brightness(0.94);
          transition: transform 0.04s ease;
        }
        .btn-primary:disabled {
          background: #e5e3de;
          color: #a8a49b;
          box-shadow: none;
          cursor: default;
        }
        .btn-primary.full {
          width: 100%;
          justify-content: center;
        }

        .results-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }
        .results-title {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--color-ink);
        }
        .results-title span {
          color: var(--color-muted);
          font-weight: 600;
        }
        .chip-row {
          display: flex;
          gap: 8px;
        }
        .chip {
          border: 1.5px solid var(--color-line);
          background: var(--color-bg);
          border-radius: 9px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          color: #3a3d45;
          cursor: pointer;
          font-family: inherit;
        }
        .chip:hover {
          border-color: var(--color-accent-green);
          color: var(--color-accent-green);
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

        .player-list {
          display: flex;
          flex-direction: column;
          max-height: 280px;
          overflow-y: auto;
          border: 1px solid var(--color-line);
          border-radius: 12px;
        }
        .player-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 14px;
          border-bottom: 1px solid var(--color-line);
          cursor: pointer;
        }
        .player-row:last-child {
          border-bottom: none;
        }
        .player-row:hover {
          background: color-mix(in srgb, var(--color-accent-green) 4%, transparent);
        }
        .player-row input {
          width: 17px;
          height: 17px;
          accent-color: var(--color-accent-green);
          flex-shrink: 0;
        }
        .p-name {
          display: block;
          font-size: 13.5px;
          font-weight: 700;
        }
        .p-cat {
          display: block;
          font-size: 12px;
          color: var(--color-muted);
          margin-top: 1px;
        }

        @media (max-width: 560px) {
          .field-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
