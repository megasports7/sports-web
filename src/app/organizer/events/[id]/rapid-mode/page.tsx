'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { organizerApi } from '@/lib/api/organizer.api';
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

  async function handleScan(qrData: string) {
    if (scanning) return;
    // Real dedup, unlike mobile's dead check (which compared the raw scanned
    // string against a uuid and could never match) -- compares the actual
    // resolved uuid.
    setScanning(true);
    setScanMessage(null);
    // Passes eventId, unlike mobile's RapidMode.tsx, which deliberately
    // never did (documented in organizer.api.ts as "still non-functional
    // the same way it was before this phase") -- find_player_by_qr requires
    // it, so that call site never actually worked on mobile. Fixed here
    // since this is a fresh build with eventId already on hand from the route.
    const res = await organizerApi.getPlayerByQR(qrData, eventId);
    setScanning(false);

    if (!res.success || !res.data) {
      setScanMessage(res.message || 'Player not found');
      return;
    }
    if (players.some((p) => p.player_id === res.data!.id)) {
      setScanMessage('This player is already in the batch.');
      return;
    }
    if (players.length === 0) setCategoryLocked(true);
    setPlayers((prev) => [
      ...prev,
      {
        player_id: res.data!.id,
        player_name: res.data!.player_name,
        state: res.data!.state,
        district: res.data!.district,
        sendToBye: false,
      },
    ]);
    setScanMessage(`Added: ${res.data.player_name}`);
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
      router.push(`/organizer/events/${eventId}/batches`);
    } else {
      setError(res.message || 'Could not create batch');
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-lg font-bold">Rapid mode</h1>

      <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-600">Category</h2>
          {categoryLocked && (
            <button onClick={resetCategory} className="text-xs font-medium text-red-600 underline">
              Change category
            </button>
          )}
        </div>
        <div className="flex flex-col gap-3">
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
            className="rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-50"
          >
            <option value="">Event category</option>
            <option value="TANDING">TANDING</option>
            <option value="SENI">SENI</option>
          </select>

          {eventCategory && (
            <select
              value={ageCategory}
              disabled={categoryLocked}
              onChange={(e) => {
                setAgeCategory(e.target.value);
                setWeightCategory('');
                setWeightText('');
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-50"
            >
              <option value="">Age category</option>
              {ageOptions.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          )}

          {eventCategory === 'TANDING' &&
            ageCategory &&
            (useWeightSelect ? (
              <select
                value={weightCategory}
                disabled={categoryLocked}
                onChange={(e) => setWeightCategory(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-50"
              >
                <option value="">Weight category</option>
                {(WEIGHT_CATEGORIES_BY_AGE[ageCategory] ?? []).map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={weightText}
                disabled={categoryLocked}
                onChange={(e) => setWeightText(e.target.value)}
                placeholder="Weight (kg)"
                className="rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-50"
              />
            ))}

          {eventCategory === 'SENI' && ageCategory && (
            <select
              value={seniType}
              disabled={categoryLocked}
              onChange={(e) => setSeniType(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-50"
            >
              <option value="">Seni type</option>
              {SENI_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
        </div>
        {(eventCategory || ageCategory) && <p className="mt-3 text-xs text-gray-500">{categoryLabel()}</p>}
      </section>

      <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-600">Scan players</h2>
          <button onClick={() => setPaused((p) => !p)} className="text-xs font-medium underline">
            {paused ? 'Resume camera' : 'Pause camera'}
          </button>
        </div>
        {!paused ? <QrScanner onScan={handleScan} active={!scanning} /> : <p className="text-sm text-gray-500">Scanner paused.</p>}
        {scanMessage && <p className="mt-2 text-sm text-gray-600">{scanMessage}</p>}
      </section>

      <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-600">
            Players ({players.length}) — {activeCount} active
          </h2>
          <div className="flex gap-3">
            <button onClick={selectAll} className="text-xs font-medium underline">
              Select all
            </button>
            <button onClick={deselectAll} className="text-xs font-medium underline">
              Deselect all
            </button>
          </div>
        </div>
        {byesRequired > 0 && <p className="mb-2 text-sm text-gray-600">Byes required: {byesRequired}</p>}
        {players.length === 0 ? (
          <p className="text-sm text-gray-500">No players scanned yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="py-1 pr-2">Name</th>
                  <th className="py-1 pr-2">State</th>
                  <th className="py-1 pr-2">District</th>
                  <th className="py-1 pr-2">BYE?</th>
                  <th className="py-1" />
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.player_id} className="border-b border-gray-100">
                    <td className="py-1 pr-2 font-medium">{p.player_name}</td>
                    <td className="py-1 pr-2 text-gray-500">{p.state || '-'}</td>
                    <td className="py-1 pr-2 text-gray-500">{p.district || '-'}</td>
                    <td className="py-1 pr-2">
                      <input type="checkbox" checked={p.sendToBye} onChange={() => toggleBye(p.player_id)} />
                    </td>
                    <td className="py-1">
                      <button onClick={() => removePlayer(p.player_id)} className="text-xs text-red-600 underline">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <label className="mb-3 flex flex-col gap-1 text-sm">
          Batch name (optional)
          <input
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            placeholder={categoryLabel() || 'Custom Batch'}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        <button
          onClick={handleCreateBatch}
          disabled={creating || activeCount < 2}
          className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {creating ? 'Creating…' : `Create batch & go to manage (${activeCount} players)`}
        </button>
      </section>
    </div>
  );
}
