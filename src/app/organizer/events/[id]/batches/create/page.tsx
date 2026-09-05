'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { organizerApi } from '@/lib/api/organizer.api';
import { Card } from '@/lib/ui/Card';
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
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-lg font-bold text-ink">Create Batch</h1>

      <Card className="mb-4 flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted">Filter players</h2>

        <label className="flex flex-col gap-1 text-sm text-ink">
          Event category
          <select
            value={eventCategory}
            onChange={(e) => {
              setEventCategory(e.target.value);
              setAgeCategory('');
              setWeightCategory('');
              setWeightText('');
              setSeniType('');
            }}
            className="rounded-md border border-line px-3 py-2"
          >
            <option value="">Any</option>
            <option value="TANDING">TANDING</option>
            <option value="SENI">SENI</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink">
          Age category
          <select
            value={ageCategory}
            onChange={(e) => {
              setAgeCategory(e.target.value);
              setWeightCategory('');
              setWeightText('');
            }}
            className="rounded-md border border-line px-3 py-2"
          >
            <option value="">Any</option>
            {AGE_CATEGORIES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink">
          Weight category
          {useWeightSelect ? (
            <select
              value={weightCategory}
              onChange={(e) => setWeightCategory(e.target.value)}
              className="rounded-md border border-line px-3 py-2"
            >
              <option value="">Any</option>
              {(WEIGHT_CATEGORIES_BY_AGE[ageCategory] ?? []).map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={weightText}
              onChange={(e) => setWeightText(e.target.value)}
              placeholder="Weight category (optional)"
              className="rounded-md border border-line px-3 py-2"
            />
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink">
          Seni type
          <select
            value={seniType}
            onChange={(e) => setSeniType(e.target.value)}
            className="rounded-md border border-line px-3 py-2"
          >
            <option value="">Any</option>
            {SENI_TYPES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={handleShowPlayers}
          disabled={loadingPlayers}
          className="rounded-md bg-accent-green px-3 py-2 text-sm font-medium text-surface disabled:opacity-50"
        >
          {loadingPlayers ? 'Loading…' : 'Show players'}
        </button>
      </Card>

      {hasSearched && (
        <Card className="mb-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-muted">
              Players ({total}) — {selected.size} selected
            </h2>
            <div className="flex gap-3">
              <button type="button" onClick={() => setSelected(new Set(players.map((p) => p.player_id)))} className="text-sm font-medium text-accent-green underline">
                Select all
              </button>
              <button type="button" onClick={() => setSelected(new Set())} className="text-sm font-medium text-accent-green underline">
                Deselect all
              </button>
            </div>
          </div>

          {byesRequired > 0 && <p className="mb-2 text-sm text-muted">Byes required: {byesRequired}</p>}

          {loadingPlayers ? (
            <p className="text-sm text-muted">Loading players…</p>
          ) : players.length === 0 ? (
            <p className="text-sm text-muted">No players match these filters.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {players.map((p) => (
                <li key={p.registration_id} className="flex items-center gap-2 border-b border-line pb-2 text-sm">
                  <input type="checkbox" checked={selected.has(p.player_id)} onChange={() => toggle(p.player_id)} />
                  <div>
                    <div className="font-medium text-ink">{p.player_name}</div>
                    <div className="text-xs text-muted">
                      {[p.event_category, p.age_category, p.weight_category, p.seni_category].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-ink">
          Batch name (optional)
          <input
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            placeholder={computeLabel()}
            className="rounded-md border border-line px-3 py-2"
          />
        </label>

        {error && <p className="text-sm text-corner-red">{error}</p>}

        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || selected.size === 0}
          className="rounded-md bg-accent-green px-3 py-2 text-sm font-medium text-surface disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Create batch'}
        </button>
      </Card>
    </div>
  );
}
