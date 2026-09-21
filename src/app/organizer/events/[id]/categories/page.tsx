'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { organizerApi } from '@/lib/api/organizer.api';
import { useOrgParam, withOrg } from '@/lib/auth/orgContext';
import type {
  ConfiguredCompetitionType,
  ConfiguredEventCategory,
  ConfiguredEventCategoryInput,
  ConfiguredWeightRuleMode,
} from '@/lib/types';

type CategoryForm = {
  code: string;
  competitionType: ConfiguredCompetitionType;
  ageLabel: string;
  minimumAge: string;
  maximumAge: string;
  gender: 'male' | 'female';
  weightRuleMode: ConfiguredWeightRuleMode;
  weightLabel: string;
  minimumWeightKg: string;
  maximumWeightKg: string;
  seniCategory: string;
};

const EMPTY_FORM: CategoryForm = {
  code: '',
  competitionType: 'TANDING',
  ageLabel: '',
  minimumAge: '',
  maximumAge: '',
  gender: 'male',
  weightRuleMode: 'range',
  weightLabel: '',
  minimumWeightKg: '',
  maximumWeightKg: '',
  seniCategory: '',
};

function numberText(value: number | null): string {
  return value === null ? '' : String(value);
}

function categoryTitle(category: ConfiguredEventCategory): string {
  const detail = category.competition_type === 'SENI' ? category.seni_category : category.weight_label;
  return [category.competition_type, category.age_label, category.gender, detail].filter(Boolean).join(' · ');
}

function describeWeight(category: ConfiguredEventCategory): string {
  if (category.weight_rule_mode === 'not_applicable') return 'No weight rule';
  if (category.weight_rule_mode === 'measurement_only') return 'Measured weight required';
  const upper = category.maximum_weight_kg === null ? 'and above' : `< ${category.maximum_weight_kg} kg`;
  return `${category.minimum_weight_kg} kg ≤ weight ${upper}`;
}

function buildInput(form: CategoryForm): { input?: ConfiguredEventCategoryInput; error?: string } {
  const minimumAge = Number(form.minimumAge);
  const maximumAge = form.maximumAge.trim() ? Number(form.maximumAge) : null;
  if (!form.code.trim() || !form.ageLabel.trim() || !Number.isInteger(minimumAge) || minimumAge < 0) {
    return { error: 'Code, age label, and a non-negative whole-number minimum age are required.' };
  }
  if (maximumAge !== null && (!Number.isInteger(maximumAge) || maximumAge < minimumAge)) {
    return { error: 'Maximum age must be a whole number greater than or equal to minimum age.' };
  }

  if (form.competitionType === 'SENI') {
    if (!form.seniCategory.trim()) return { error: 'Enter a Seni category, such as TUNGGAL or GANDA [PLAYER-1].' };
    return {
      input: {
        code: form.code.trim(), competition_type: 'SENI', age_label: form.ageLabel.trim(), minimum_age: minimumAge,
        maximum_age: maximumAge, gender: form.gender, weight_rule_mode: 'not_applicable', weight_label: null,
        minimum_weight_kg: null, maximum_weight_kg: null, seni_category: form.seniCategory.trim(),
      },
    };
  }

  if (form.weightRuleMode === 'measurement_only') {
    return {
      input: {
        code: form.code.trim(), competition_type: 'TANDING', age_label: form.ageLabel.trim(), minimum_age: minimumAge,
        maximum_age: maximumAge, gender: form.gender, weight_rule_mode: 'measurement_only',
        weight_label: form.weightLabel.trim() || null, minimum_weight_kg: null, maximum_weight_kg: null, seni_category: null,
      },
    };
  }

  const minimumWeight = Number(form.minimumWeightKg);
  const maximumWeight = form.maximumWeightKg.trim() ? Number(form.maximumWeightKg) : null;
  if (!Number.isFinite(minimumWeight) || minimumWeight <= 0) return { error: 'A positive minimum weight is required for a ranged Tanding category.' };
  if (maximumWeight !== null && (!Number.isFinite(maximumWeight) || maximumWeight <= minimumWeight)) {
    return { error: 'Maximum weight must be greater than minimum weight. Leave it empty for an open class.' };
  }
  return {
    input: {
      code: form.code.trim(), competition_type: 'TANDING', age_label: form.ageLabel.trim(), minimum_age: minimumAge,
      maximum_age: maximumAge, gender: form.gender, weight_rule_mode: 'range', weight_label: form.weightLabel.trim() || null,
      minimum_weight_kg: minimumWeight, maximum_weight_kg: maximumWeight, seni_category: null,
    },
  };
}

export default function ConfigureEventCategoriesPage() {
  // Phase 4: preserve admin-in-organizer ?org= on the back link.
  const orgParam = useOrgParam();
  const { id: eventId } = useParams<{ id: string }>();
  const [eventName, setEventName] = useState('Event');
  const [categories, setCategories] = useState<ConfiguredEventCategory[]>([]);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [editing, setEditing] = useState<ConfiguredEventCategory | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [replacementRequired, setReplacementRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activating, setActivating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([organizerApi.event(eventId), organizerApi.eventCategories(eventId)])
      .then(([eventResult, categoryResult]) => {
        if (cancelled) return;
        setError(null);
        if (eventResult.success && eventResult.data) setEventName(eventResult.data.event_name);
        else setError(eventResult.message || 'Could not load this event.');
        if (categoryResult.success && categoryResult.data) setCategories(categoryResult.data);
        else setError(categoryResult.message || 'Could not load categories.');
      })
      .catch(() => {
        if (!cancelled) setError('Could not load category configuration.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [eventId, reloadKey]);

  function refreshCategories() {
    setLoading(true);
    setReloadKey((current) => current + 1);
  }

  const publishedCount = useMemo(() => categories.filter((category) => category.is_published).length, [categories]);

  function startAdd() {
    setEditing(null); setReplacementRequired(false); setForm(EMPTY_FORM); setMessage(null); setError(null); setShowForm(true);
  }

  function startEdit(category: ConfiguredEventCategory) {
    setEditing(category); setReplacementRequired(false); setMessage(null); setError(null);
    setForm({
      code: category.code, competitionType: category.competition_type, ageLabel: category.age_label,
      minimumAge: numberText(category.minimum_age), maximumAge: numberText(category.maximum_age), gender: category.gender,
      weightRuleMode: category.weight_rule_mode, weightLabel: category.weight_label ?? '',
      minimumWeightKg: numberText(category.minimum_weight_kg), maximumWeightKg: numberText(category.maximum_weight_kg),
      seniCategory: category.seni_category ?? '',
    });
    setShowForm(true);
  }

  function dismissForm() {
    setEditing(null); setReplacementRequired(false); setForm(EMPTY_FORM); setShowForm(false);
  }

  function updateForm<K extends keyof CategoryForm>(key: K, value: CategoryForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setCompetitionType(competitionType: ConfiguredCompetitionType) {
    setForm((current) => ({
      ...current, competitionType, weightRuleMode: competitionType === 'SENI' ? 'not_applicable' : 'range',
      weightLabel: competitionType === 'SENI' ? '' : current.weightLabel,
      minimumWeightKg: competitionType === 'SENI' ? '' : current.minimumWeightKg,
      maximumWeightKg: competitionType === 'SENI' ? '' : current.maximumWeightKg,
      seniCategory: competitionType === 'SENI' ? current.seniCategory : '',
    }));
  }

  async function saveCategory(event: React.FormEvent) {
    event.preventDefault();
    setError(null); setMessage(null);
    const built = buildInput(form);
    if (!built.input) { setError(built.error || 'Check the category fields.'); return; }
    const input = built.input;
    setSaving(true);
    let replaced = false;
    let result;
    if (!editing) {
      result = await organizerApi.createEventCategory(eventId, input);
    } else if (replacementRequired) {
      if (input.code === editing.code) {
        setSaving(false);
        setError(`Replacement code required. Use a new stable code, such as ${editing.code}-R2.`);
        return;
      }
      result = await organizerApi.cloneEventCategory(editing.id, input);
      replaced = result.success;
    } else {
      result = await organizerApi.updateEventCategory(editing.id, input);
      if (!result.success && /category rule fields are immutable after a v2 registration/i.test(result.message || '')) {
        if (input.code === editing.code) {
          setSaving(false);
          setReplacementRequired(true);
          setError(`This category has v2 registrations. Enter a new stable code, such as ${editing.code}-R2, then save an unpublished replacement draft.`);
          return;
        }
        result = await organizerApi.cloneEventCategory(editing.id, input);
        replaced = result.success;
      }
    }
    setSaving(false);
    if (!result.success) { setError(result.message || 'The database rejected this category.'); return; }
    dismissForm();
    setMessage(replaced ? 'Replacement draft created. The historic category was unpublished and its rules were preserved.' : 'Category saved.');
    refreshCategories();
  }

  async function togglePublished(category: ConfiguredEventCategory) {
    setError(null); setMessage(null);
    const result = await organizerApi.updateEventCategory(category.id, { is_published: !category.is_published });
    if (!result.success) { setError(result.message || 'Could not update publication.'); return; }
    setMessage(category.is_published ? 'Category unpublished.' : 'Category published. This does not activate configured registration.');
    refreshCategories();
  }

  async function generateDefaults() {
    if (!eventId) return;
    setGenerating(true); setError(null); setMessage(null);
    const result = await organizerApi.createEventCategoriesFromCurrentPencakDefaults(eventId);
    setGenerating(false);
    if (!result.success) { setError(result.message || 'Could not create default categories.'); return; }
    setMessage(`${result.data ?? 0} Pencak categories were created as unpublished drafts.`);
    refreshCategories();
  }

  async function activateV2() {
    if (!eventId) return;
    setActivating(true); setError(null); setMessage(null);
    const result = await organizerApi.activateEventV2(eventId as string);
    setActivating(false);
    if (!result.success) { setError(result.message || 'Could not activate v2. Need at least one published category.'); return; }
    setMessage('Event activated to v2 — players now see configured categories with eligibility preview.');
    refreshCategories();
  }

  if (loading) return <p className="text-muted">Loading category configuration…</p>;

  return (
    <div className="page">
      <div className="head-row">
        <div>
          <Link href={withOrg('/organizer/events', orgParam)} className="back-link">← Events</Link>
          <h1>Configure categories</h1>
          <p>{eventName} · Shared Supabase configuration only. Publish, then Activate v2 for players to see configured categories.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="secondary" onClick={activateV2} disabled={activating || publishedCount === 0}>
            {activating ? 'Activating…' : 'Activate v2 (QA)'}
          </button>
          <button type="button" className="primary" onClick={startAdd}>Add category</button>
        </div>
      </div>

      {message && <p className="notice success" role="status">{message}</p>}
      {error && <p className="notice error" role="alert">{error}</p>}

      {showForm && (
        <form className="form-card" onSubmit={saveCategory}>
          <div className="form-head"><h2>{replacementRequired ? 'Replace used category' : editing ? 'Edit category' : 'Add draft category'}</h2><button type="button" className="text-button" onClick={dismissForm}>Cancel</button></div>
          {replacementRequired && <p className="replacement">The historical category stays unchanged. This replacement will be unpublished for review and needs a different stable code.</p>}
          <label> {replacementRequired ? 'Replacement code (must differ)' : 'Stable code'}
            <input value={form.code} onChange={(event) => updateForm('code', event.target.value)} autoCapitalize="characters" required />
          </label>
          <div className="split">
            <label>Competition<select value={form.competitionType} onChange={(event) => setCompetitionType(event.target.value as ConfiguredCompetitionType)}><option value="TANDING">Tanding</option><option value="SENI">Seni</option></select></label>
            <label>Gender<select value={form.gender} onChange={(event) => updateForm('gender', event.target.value as 'male' | 'female')}><option value="male">Male</option><option value="female">Female</option></select></label>
          </div>
          <label>Age label<input value={form.ageLabel} onChange={(event) => updateForm('ageLabel', event.target.value)} required /></label>
          <div className="split">
            <label>Minimum age<input value={form.minimumAge} onChange={(event) => updateForm('minimumAge', event.target.value)} inputMode="numeric" required /></label>
            <label>Maximum age (optional)<input value={form.maximumAge} onChange={(event) => updateForm('maximumAge', event.target.value)} inputMode="numeric" /></label>
          </div>
          {form.competitionType === 'SENI' ? (
            <label>Seni category<input value={form.seniCategory} onChange={(event) => updateForm('seniCategory', event.target.value)} required /></label>
          ) : (
            <>
              <label>Weight rule<select value={form.weightRuleMode === 'measurement_only' ? 'measurement_only' : 'range'} onChange={(event) => updateForm('weightRuleMode', event.target.value as ConfiguredWeightRuleMode)}><option value="range">Weight range</option><option value="measurement_only">Measure only</option></select></label>
              <label>Weight label (optional)<input value={form.weightLabel} onChange={(event) => updateForm('weightLabel', event.target.value)} /></label>
              {form.weightRuleMode === 'range' && <div className="split"><label>Minimum kg<input value={form.minimumWeightKg} onChange={(event) => updateForm('minimumWeightKg', event.target.value)} inputMode="decimal" required /></label><label>Maximum kg (open if blank)<input value={form.maximumWeightKg} onChange={(event) => updateForm('maximumWeightKg', event.target.value)} inputMode="decimal" /></label></div>}
            </>
          )}
          <button className="primary" disabled={saving}>{saving ? 'Saving…' : replacementRequired ? 'Create replacement draft' : editing ? 'Save category' : 'Add draft category'}</button>
        </form>
      )}

      <div className="summary"><span>{categories.length} total · {publishedCount} published</span>{categories.length === 0 && <button type="button" className="secondary" onClick={generateDefaults} disabled={generating}>{generating ? 'Creating drafts…' : 'Create from current Pencak defaults'}</button>}</div>

      {categories.length === 0 ? (
        <div className="empty"><h2>No categories yet</h2><p>Create the current Pencak set as drafts, or add a tailored category.</p></div>
      ) : (
        <div className="category-list">
          {categories.map((category) => (
            <article className="category-card" key={category.id}>
              <div><h2>{categoryTitle(category)}</h2><p className="code">{category.code}</p><p>Age {category.minimum_age}–{category.maximum_age ?? 'open'} · {describeWeight(category)}</p></div>
              <div className="card-actions"><span className={category.is_published ? 'published' : 'draft'}>{category.is_published ? 'Published' : 'Draft'}</span><button type="button" className="secondary" onClick={() => startEdit(category)}>Edit</button><button type="button" className="secondary" onClick={() => togglePublished(category)}>{category.is_published ? 'Unpublish' : 'Publish'}</button></div>
            </article>
          ))}
        </div>
      )}

      <style jsx>{`
        .page { display: flex; flex-direction: column; gap: 18px; }
        .head-row, .form-head, .summary, .category-card, .card-actions { display: flex; align-items: center; gap: 12px; }
        .head-row { justify-content: space-between; align-items: flex-start; flex-wrap: wrap; }
        h1 { margin: 5px 0 0; font-size: 26px; font-weight: 800; letter-spacing: -.3px; } h2 { margin: 0; font-size: 16px; font-weight: 800; } p { margin: 5px 0 0; color: #3a3d45; }
        .back-link, .text-button { color: var(--color-accent-green); font-size: 13px; font-weight: 700; text-decoration: none; background: none; border: 0; cursor: pointer; padding: 0; }
        .primary, .secondary { border-radius: 10px; padding: 10px 14px; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
        .primary { border: 0; color: #fff; background: linear-gradient(120deg, var(--color-accent-green), #00e676); } .primary:disabled, .secondary:disabled { cursor: wait; opacity: .6; }
        .secondary { border: 1px solid var(--color-line); color: #3a3d45; background: var(--color-bg); } .secondary:hover { border-color: var(--color-accent-green); color: var(--color-accent-green); }
        .notice { border-radius: 10px; padding: 11px 13px; font-size: 13px; font-weight: 600; } .success { color: #176b35; background: color-mix(in srgb, var(--color-accent-green) 12%, white); } .error { color: #a42f20; background: color-mix(in srgb, var(--color-corner-red) 10%, white); }
        .form-card, .empty, .category-card { border: 1px solid var(--color-line); border-radius: 16px; background: var(--color-surface); } .form-card { display: flex; flex-direction: column; gap: 13px; padding: 18px; } .form-head { justify-content: space-between; } .replacement { color: #875d05; background: color-mix(in srgb, var(--color-status-pending) 13%, white); border-radius: 8px; padding: 10px; }
        label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 700; color: #3a3d45; } input, select { width: 100%; box-sizing: border-box; border: 1px solid var(--color-line); border-radius: 8px; background: #fff; padding: 10px; color: var(--color-ink); font: inherit; font-weight: 500; } .split { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .summary { justify-content: space-between; color: var(--color-muted); font-size: 13px; font-weight: 700; flex-wrap: wrap; } .empty { text-align: center; padding: 42px 20px; } .category-list { display: flex; flex-direction: column; gap: 10px; } .category-card { justify-content: space-between; align-items: flex-start; padding: 15px; } .category-card p { font-size: 13px; } .code { color: var(--color-muted); font-family: var(--font-mono); font-size: 11px !important; } .card-actions { flex-wrap: wrap; justify-content: flex-end; } .published, .draft { border-radius: 999px; padding: 5px 8px; font-size: 11px; font-weight: 800; } .published { color: #176b35; background: color-mix(in srgb, var(--color-accent-green) 14%, white); } .draft { color: #875d05; background: color-mix(in srgb, var(--color-status-pending) 16%, white); }
        @media (max-width: 640px) { .head-row { align-items: stretch; } .head-row .primary { width: 100%; } .split { grid-template-columns: 1fr; } .category-card { flex-direction: column; } .card-actions { justify-content: flex-start; } }
      `}</style>
    </div>
  );
}
