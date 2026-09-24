'use client';

/**
 * Dedicated secretary batch creator (both portals): full category detail
 * (v2 published category with gender/minimum-age/weight, or v1
 * event/age/weight/seni filters), approved-player multi-select, and the
 * bracket-engine options the G1 RPC already supports (format, bye method,
 * seeds, manual byes). Creation goes through the existing
 * create_batch_with_bracket path with manage_batches + event scope enforced
 * server-side -- no parallel backend, no new tables, no migration.
 */
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { secretaryApi, type SecretaryEvent, type SecretaryKind, type SecretaryRegistration } from '@/lib/api/secretary.api';
import { EventNav, eventNavItems } from '@/components/secretary/EventNav';

const SENI_TYPES = ['TUNGGAL', 'SOLO', 'GANDA', 'REGU'];

type V2Category = {
  id: string;
  code: string;
  gender: string;
  minimum_age: number;
  maximum_age: number | null;
  weight_label: string | null;
  seni_category: string | null;
};

function Icon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  switch (name) {
    case 'trophy':
      return (
        <svg {...common}><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 5H4.5a.5.5 0 0 0-.5.5C4 8 6 10 8.2 10" /><path d="M16 5h3.5a.5.5 0 0 1 .5.5C20 8 18 10 15.8 10" /><path d="M12 13v4" /><path d="M8.5 20.5h7" /><path d="M10 17h4" /></svg>
      );
    case 'plus':
      return (
        <svg {...common}><path d="M12 5v14" /><path d="M5 12h14" /></svg>
      );
    case 'users':
      return (
        <svg {...common}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" /><circle cx="17" cy="9" r="2.6" /><path d="M16 15.2c2.6.3 4.6 1.9 5.3 4.3" /></svg>
      );
    default:
      return null;
  }
}

function dateBlock(eventDate: string | null): { top: string; bottom: string } {
  if (!eventDate) return { top: '—', bottom: 'TBA' };
  const d = new Date(eventDate);
  if (Number.isNaN(d.getTime())) return { top: '—', bottom: 'TBA' };
  return {
    top: d.toLocaleString('en-US', { month: 'short' }),
    bottom: String(d.getFullYear()),
  };
}

function regCategoryText(r: SecretaryRegistration): string {
  return [r.event_category, r.age_category, r.weight_category, r.seni_category].filter(Boolean).join(' · ');
}

export function SecretaryBatchCreateSection({
  eventId,
  basePath,
  canManageBatches,
  kind,
  event,
  scopeLabel,
}: {
  eventId: string;
  basePath: string;
  canManageBatches: boolean;
  kind: SecretaryKind;
  event: SecretaryEvent;
  scopeLabel: string;
}) {
  const router = useRouter();
  const [regs, setRegs] = useState<SecretaryRegistration[]>([]);
  const [categories, setCategories] = useState<V2Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedV2, setSelectedV2] = useState('');
  const [eventCategory, setEventCategory] = useState('');
  const [ageCategory, setAgeCategory] = useState('');
  const [weightText, setWeightText] = useState('');
  const [seniType, setSeniType] = useState('');
  const [searched, setSearched] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchName, setBatchName] = useState('');
  const [tournamentFormat, setTournamentFormat] = useState('single_elimination');
  const [byeMethod, setByeMethod] = useState('random');
  const [seedOrder, setSeedOrder] = useState<string[]>([]);
  const [manualByeIds, setManualByeIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const accentVar =
    kind === 'district_secretary' ? 'var(--color-role-district-secretary)' : 'var(--color-role-state-secretary)';

  useEffect(() => {
    let live = true;
    Promise.all([secretaryApi.registrations(eventId), secretaryApi.publishedCategories(eventId)])
      .then(([rRes, cRes]) => {
        if (!live) return;
        if (rRes.success && rRes.data) {
          setRegs(rRes.data);
          setError(null);
        } else {
          setError(rRes.message || 'Could not load registrations');
        }
        if (cRes.success && cRes.data) setCategories(cRes.data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!live) return;
        setError(err instanceof Error ? err.message : 'Could not load batch setup data');
        setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [eventId]);

  const isV2 = categories.length > 0;
  const approved = useMemo(() => regs.filter((r) => r.status === 'approved'), [regs]);

  function computeCandidates(): SecretaryRegistration[] {
    if (isV2) {
      if (!selectedV2) return [];
      return approved.filter((r) => r.event_category_id === selectedV2);
    }
    return approved.filter((r) => {
      if (eventCategory && (r.event_category ?? '') !== eventCategory) return false;
      if (ageCategory && (r.age_category ?? '') !== ageCategory) return false;
      if (weightText.trim() && !(r.weight_category ?? '').toLowerCase().includes(weightText.trim().toLowerCase()))
        return false;
      if (seniType && (r.seni_category ?? '') !== seniType) return false;
      return true;
    });
  }

  const candidates = useMemo(
    () => (searched ? computeCandidates() : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searched, isV2, selectedV2, approved, eventCategory, ageCategory, weightText, seniType],
  );

  const v1EventCats = useMemo(
    () => Array.from(new Set(approved.map((r) => r.event_category).filter((v): v is string => !!v))).sort(),
    [approved],
  );
  const v1AgeCats = useMemo(
    () => Array.from(new Set(approved.map((r) => r.age_category).filter((v): v is string => !!v))).sort(),
    [approved],
  );

  const byesForSelected =
    selected.size > 0 ? Math.pow(2, Math.ceil(Math.log2(selected.size))) - selected.size : 0;
  const prunedSeeds = seedOrder.filter((sid) => selected.has(sid));
  const prunedPicks = [...manualByeIds].filter((pid) => selected.has(pid));
  const isRR = tournamentFormat === 'round_robin';

  const categoryLabel = useMemo(() => {
    if (isV2) {
      const c = categories.find((x) => x.id === selectedV2);
      return c?.code ?? '';
    }
    const parts = [eventCategory, ageCategory, weightText.trim(), seniType].filter(Boolean);
    return parts.join(' | ');
  }, [isV2, categories, selectedV2, eventCategory, ageCategory, weightText, seniType]);

  function findPlayers() {
    if (isV2 && !selectedV2) {
      setError('Select a published category first.');
      return;
    }
    setError(null);
    setSearched(true);
    // Pre-select everyone found, mirroring the organizer flow.
    const found = (() => {
      if (isV2) {
        return approved.filter((r) => r.event_category_id === selectedV2);
      }
      return approved.filter((r) => {
        if (eventCategory && (r.event_category ?? '') !== eventCategory) return false;
        if (ageCategory && (r.age_category ?? '') !== ageCategory) return false;
        if (weightText.trim() && !(r.weight_category ?? '').toLowerCase().includes(weightText.trim().toLowerCase()))
          return false;
        if (seniType && (r.seni_category ?? '') !== seniType) return false;
        return true;
      });
    })();
    setSelected(new Set(found.map((c) => c.player_id)));
    setSeedOrder([]);
    setManualByeIds(new Set());
  }

  function toggle(pid: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  }

  function toggleSeed(pid: string) {
    setSeedOrder((prev) => (prev.includes(pid) ? prev.filter((s) => s !== pid) : [...prev, pid]));
  }

  function toggleBye(pid: string) {
    setManualByeIds((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  }

  async function handleCreate() {
    if (selected.size === 0) {
      setError('Select at least one player.');
      return;
    }
    if (!isRR && byeMethod === 'manual' && prunedPicks.length !== byesForSelected) {
      setError(`Manual byes: pick exactly ${byesForSelected} player${byesForSelected === 1 ? '' : 's'}.`);
      return;
    }
    const v2cat = isV2 ? categories.find((c) => c.id === selectedV2) : undefined;
    if (isV2 && !v2cat) {
      setError('Select a published category first.');
      return;
    }
    setCreating(true);
    setError(null);
    const finalName =
      batchName.trim() || categoryLabel || v2cat?.code || 'Batch';
    const res = await secretaryApi.createBatch({
      event_id: eventId,
      batch_name: finalName,
      player_ids: [...selected],
      tournament_format: tournamentFormat,
      category: categoryLabel || undefined,
      ...(!isRR ? { bye_method: byeMethod } : {}),
      ...(!isRR && byeMethod === 'seed_priority' && prunedSeeds.length ? { seeds: prunedSeeds } : {}),
      ...(!isRR && byeMethod === 'manual' && prunedPicks.length ? { bye_player_ids: prunedPicks } : {}),
    });
    setCreating(false);
    if (res.success) {
      router.push(`${basePath}/events/${eventId}/batches`);
    } else {
      setError(res.message || 'Batch creation failed');
    }
  }

  const d = dateBlock(event.event_date);
  const status = (event.status ?? 'active').toLowerCase();

  if (loading) {
    return (
      <div className="create-page">
        <div className="skel crumbs" />
        <div className="skel header" />
        <div className="skel tabs" />
        <div className="skel block" />
        <div className="skel block tall" />
        <style jsx>{`
          .create-page { display: flex; flex-direction: column; gap: 12px; }
          .skel { border-radius: 14px; background: #dfe3e8; }
          .skel.crumbs { height: 18px; width: 260px; border-radius: 6px; }
          .skel.header { height: 104px; }
          .skel.tabs { height: 42px; border-radius: 0; background: transparent; border-bottom: 1.5px solid var(--color-line); }
          .skel.block { height: 170px; background: var(--color-surface); border: 1px solid var(--color-line); }
          .skel.block.tall { height: 300px; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="create-page">
      <div className="crumbs">
        <Link href={`${basePath}/events`}>Events</Link>
        <span className="sep">/</span>
        <Link href={`${basePath}/events/${eventId}`}>{event.event_name}</Link>
        <span className="sep">/</span>
        <Link href={`${basePath}/events/${eventId}/batches`}>Batches</Link>
        <span className="sep">/</span>
        <strong>Create batch</strong>
      </div>

      <header className="event-head">
        <span className="date-block">
          <strong>{d.top}</strong>
          <span>{d.bottom}</span>
        </span>
        <div className="id-block">
          <div className="title-row">
            <h1>{event.event_name}</h1>
            <span className={status === 'active' || status === 'completed' ? 'pill ok' : 'pill mute'}>
              {event.status ?? 'active'}
            </span>
          </div>
          <p>
            {scopeLabel} · {approved.length} approved registration{approved.length === 1 ? '' : 's'} available
          </p>
        </div>
      </header>

      <EventNav items={eventNavItems(basePath, eventId)} activeHref={`${basePath}/events/${eventId}/batches`} accentVar={accentVar} />

      {error && <p className="text-error">{error}</p>}

      {!canManageBatches ? (
        <section className="card">
          <p className="locked-note">Batch creation needs the manage_batches permission — ask an admin.</p>
        </section>
      ) : (
        <>
          <section className="card">
            <div className="card-head">
              <span className="tile sm violet"><Icon name="trophy" /></span>
              <h2>1 · Competition category</h2>
            </div>
            {isV2 ? (
              <div className="field-grid">
                <label>
                  Published category
                  <select value={selectedV2} onChange={(e) => setSelectedV2(e.target.value)}>
                    <option value="">Select a category…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} · {c.gender} · min age {c.minimum_age}
                        {c.maximum_age != null ? `–${c.maximum_age}` : '+'}
                        {c.weight_label ? ` · ${c.weight_label}` : ''}
                        {c.seni_category ? ` · ${c.seni_category}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="field-btn">
                  <button className="btn dark" onClick={findPlayers}>
                    Find players
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="field-grid">
                  <label>
                    Sport / event category
                    <select value={eventCategory} onChange={(e) => setEventCategory(e.target.value)}>
                      <option value="">Any</option>
                      {v1EventCats.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Age category
                    <select value={ageCategory} onChange={(e) => setAgeCategory(e.target.value)}>
                      <option value="">Any</option>
                      {v1AgeCats.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Weight category
                    <input
                      value={weightText}
                      onChange={(e) => setWeightText(e.target.value)}
                      placeholder="e.g. 55–60 kg"
                    />
                  </label>
                  <label>
                    Seni type
                    <select value={seniType} onChange={(e) => setSeniType(e.target.value)}>
                      <option value="">Any</option>
                      {SENI_TYPES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="field-btn">
                  <button className="btn dark" onClick={findPlayers}>
                    Find players
                  </button>
                </div>
              </>
            )}
          </section>

          <section className="card">
            <div className="card-head">
              <span className="tile sm blue"><Icon name="users" /></span>
              <h2>
                2 · Players{' '}
                <span className="count-badge">
                  {selected.size} of {candidates.length} selected
                  {byesForSelected > 0 ? ` · ${byesForSelected} bye${byesForSelected === 1 ? '' : 's'} needed` : ''}
                </span>
              </h2>
            </div>
            {!searched ? (
              <p className="text-muted">Choose a category above and find players first.</p>
            ) : candidates.length === 0 ? (
              <p className="text-muted">No approved registrations match this category.</p>
            ) : (
              <div className="player-list">
                {candidates.map((c) => (
                  <label key={c.player_id} className="player-row">
                    <input type="checkbox" checked={selected.has(c.player_id)} onChange={() => toggle(c.player_id)} />
                    <span className="p-text">
                      <strong>{c.player_name}</strong>
                      <span>{regCategoryText(c) || 'No category recorded'}</span>
                    </span>
                    {byeMethod === 'seed_priority' && selected.has(c.player_id) && (
                      <button
                        type="button"
                        className={prunedSeeds.includes(c.player_id) ? 'seed on' : 'seed'}
                        onClick={(e) => {
                          e.preventDefault();
                          toggleSeed(c.player_id);
                        }}
                      >
                        {prunedSeeds.includes(c.player_id) ? `Seed ${prunedSeeds.indexOf(c.player_id) + 1}` : 'Seed'}
                      </button>
                    )}
                    {byeMethod === 'manual' && selected.has(c.player_id) && (
                      <button
                        type="button"
                        className={prunedPicks.includes(c.player_id) ? 'seed on' : 'seed'}
                        onClick={(e) => {
                          e.preventDefault();
                          toggleBye(c.player_id);
                        }}
                      >
                        {prunedPicks.includes(c.player_id) ? 'Bye ✓' : 'Bye'}
                      </button>
                    )}
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <div className="card-head">
              <span className="tile sm green"><Icon name="plus" /></span>
              <h2>3 · Batch & bracket</h2>
            </div>
            <div className="field-grid">
              <label className="span-2">
                Batch name
                <input
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder={categoryLabel || 'Batch name'}
                />
              </label>
              <label>
                Format
                <select
                  value={tournamentFormat}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTournamentFormat(v);
                    if (v === 'round_robin') {
                      setByeMethod('random');
                      setSeedOrder([]);
                      setManualByeIds(new Set());
                    }
                  }}
                >
                  <option value="single_elimination">Single elimination</option>
                  <option value="round_robin">Round robin</option>
                  <option value="double_elimination">Double elimination</option>
                </select>
              </label>
              {!isRR && (
                <label>
                  Bye method
                  <select
                    value={byeMethod}
                    onChange={(e) => {
                      const v = e.target.value;
                      setByeMethod(v);
                      if (v !== 'manual') setManualByeIds(new Set());
                      if (v !== 'seed_priority') setSeedOrder([]);
                    }}
                  >
                    <option value="random">Random</option>
                    <option value="seed_priority">Seed priority</option>
                    <option value="manual">Manual byes</option>
                  </select>
                </label>
              )}
            </div>
            {categoryLabel && <p className="cat-line">Category snapshot stored on the batch: <strong>{categoryLabel}</strong></p>}
            <div className="create-foot">
              <button className="btn primary" disabled={creating || selected.size === 0} onClick={handleCreate}>
                {creating ? 'Creating…' : `Create batch with ${selected.size} player${selected.size === 1 ? '' : 's'}`}
              </button>
              <Link href={`${basePath}/events/${eventId}/batches`} className="btn ghost">
                Cancel
              </Link>
            </div>
          </section>
        </>
      )}

      <style jsx>{`
        .create-page {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .crumbs {
          display: flex;
          gap: 8px;
          align-items: center;
          font-size: 13px;
          color: var(--color-muted);
          flex-wrap: wrap;
        }
        .crumbs a {
          color: var(--color-muted);
          text-decoration: none;
        }
        .crumbs strong {
          color: var(--color-ink);
        }
        .crumbs .sep {
          color: #c9cfd7;
        }
        .event-head {
          display: flex;
          gap: 14px;
          align-items: center;
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 14px;
          padding: 18px 20px;
          box-shadow: 0 1px 2px rgba(16, 20, 24, 0.05);
        }
        .date-block {
          width: 64px;
          flex-shrink: 0;
          background: #f2f4f7;
          border-radius: 10px;
          padding: 9px 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          line-height: 1.2;
        }
        .date-block strong {
          font-size: 15px;
          text-transform: uppercase;
        }
        .date-block span {
          font-size: 13px;
          color: var(--color-muted);
        }
        .id-block {
          flex: 1;
          min-width: 0;
        }
        .title-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .title-row h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .id-block p {
          margin: 3px 0 0;
          font-size: 14px;
          color: var(--color-muted);
        }
        .card {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 14px;
          padding: 18px 20px;
          box-shadow: 0 1px 2px rgba(16, 20, 24, 0.05);
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
        .field-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        @media (max-width: 860px) {
          .field-grid {
            grid-template-columns: 1fr;
          }
        }
        .field-grid label {
          display: flex;
          flex-direction: column;
          gap: 5px;
          font-size: 12.5px;
          font-weight: 700;
          color: var(--color-muted);
        }
        .field-grid .span-2 {
          grid-column: 1 / -1;
        }
        .field-grid select,
        .field-grid input {
          border: 1px solid var(--color-line);
          background: #f7f8fa;
          border-radius: 9px;
          padding: 8px 12px;
          font-size: 14px;
          font-family: inherit;
          color: var(--color-ink);
          font-weight: 400;
        }
        .field-btn {
          margin-top: 10px;
        }
        .btn {
          font-size: 13.5px;
          font-weight: 700;
          border-radius: 9px;
          padding: 8px 16px;
          white-space: nowrap;
          font-family: inherit;
          cursor: pointer;
          text-decoration: none;
        }
        .btn.dark {
          background: var(--color-ink);
          color: #fff;
          border: 1px solid var(--color-ink);
        }
        .btn.primary {
          background: var(--color-accent-blue);
          color: #fff;
          border: 1px solid var(--color-accent-blue);
          box-shadow: 0 1px 2px rgba(0, 145, 234, 0.4);
        }
        .btn.primary:disabled {
          opacity: 0.6;
          cursor: wait;
        }
        .btn.ghost {
          border: 1px solid var(--color-line);
          background: var(--color-surface);
          color: var(--color-muted);
        }
        .locked-note {
          font-size: 13.5px;
          color: var(--color-muted);
          margin: 0;
        }
        .player-list {
          display: flex;
          flex-direction: column;
          max-height: 320px;
          overflow-y: auto;
          border: 1px solid var(--color-line);
          border-radius: 12px;
        }
        .player-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-bottom: 1px solid var(--color-line);
          cursor: pointer;
        }
        .player-row:last-child {
          border-bottom: none;
        }
        .player-row:hover {
          background: #f7f8fa;
        }
        .player-row input {
          width: 17px;
          height: 17px;
          flex-shrink: 0;
        }
        .p-text {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        .p-text strong {
          font-size: 14px;
        }
        .p-text span {
          font-size: 12.5px;
          color: var(--color-muted);
        }
        .seed {
          border: 1px solid var(--color-line);
          background: transparent;
          border-radius: 8px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 700;
          color: var(--color-muted);
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
        }
        .seed.on {
          background: var(--color-ink);
          color: #fff;
          border-color: var(--color-ink);
        }
        .cat-line {
          margin: 10px 0 0;
          font-size: 13px;
          color: var(--color-muted);
        }
        .create-foot {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }
        .pill {
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 0.3px;
          border-radius: 999px;
          padding: 4px 11px;
          white-space: nowrap;
        }
        .pill.ok { background: #e3f4e8; color: #146c40; }
        .pill.mute { background: #eef0f3; color: #5b6470; }
        .skel {
          border-radius: 14px;
          background: #dfe3e8;
        }
        .skel.crumbs { height: 18px; width: 260px; border-radius: 6px; }
        .skel.header { height: 104px; }
        .skel.tabs { height: 42px; border-radius: 0; background: transparent; border-bottom: 1.5px solid var(--color-line); }
        .skel.block { height: 170px; background: var(--color-surface); border: 1px solid var(--color-line); }
        .skel.block.tall { height: 300px; }
      `}</style>
    </div>
  );
}
