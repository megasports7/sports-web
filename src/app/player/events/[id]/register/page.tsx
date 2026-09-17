'use client';

import { useEffect, useMemo, useState, use as usePromise } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { playerApi } from '@/lib/api/player.api';
import {
  TANDING_AGE_CATEGORIES,
  SENI_AGE_CATEGORIES,
  WEIGHT_CATEGORIES_BY_AGE,
  SIMPLE_WEIGHT_AGES,
  SENI_CATEGORIES,
} from '@/lib/player/registrationCategories';
import type { ConfiguredEventCategory } from '@/lib/types';

interface EventSummary {
  event_name?: string;
  venue?: string;
  location?: string;
  organizer_name?: string;
  event_date?: string;
  registration_rules_version?: number;
  registration_v2_write_state?: string;
  eligibility_time_zone?: string | null;
}

type Step = 1 | 2 | 3 | 4 | 5;
type EventCategory = '' | 'TANDING' | 'SENI';

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: 'Category' },
  { n: 2, label: 'Age group' },
  { n: 3, label: 'Details' },
  { n: 4, label: 'Review' },
];

// Known, fixed set (7 entries) -- a small lookup, not a parse of arbitrary
// data, so it can't silently misrepresent a category it doesn't recognize.
const SENI_HINT: Record<string, string> = {
  'Ganda-P1': 'Pair event · your slot: Player 1',
  'Ganda-P2': 'Pair event · your slot: Player 2',
  'Regu-P1': 'Team of 3 · your slot: Player 1',
  'Regu-P2': 'Team of 3 · your slot: Player 2',
  'Regu-P3': 'Team of 3 · your slot: Player 3',
};

// Every TANDING_AGE_CATEGORIES/SENI_AGE_CATEGORIES label ends in a
// parenthetical age range -- pull just that out for the compact chip.
// Falls back to the full label if a future entry ever doesn't match,
// rather than risk showing something invented.
function ageRange(label: string): string {
  const m = label.match(/\(([^)]+)\)/);
  return m ? m[1] : label;
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth={1.5} />
      <path d="M3 8h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
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
function TrophyIcon() {
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
function CrossedSticksIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path d="M4 4l12 12M16 4 4 16" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      <circle cx="4" cy="4" r="1.6" fill="currentColor" />
      <circle cx="16" cy="4" r="1.6" fill="currentColor" />
      <circle cx="4" cy="16" r="1.6" fill="currentColor" />
      <circle cx="16" cy="16" r="1.6" fill="currentColor" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path
        d="M10 12.5 5.5 17l1-5.3L3 8.2l5.4-.6L10 2.6l1.6 5 5.4.6-3.5 3.5 1 5.3Z"
        stroke="currentColor"
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path d="m4 10.5 3.5 3.5L16 5.5" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function EventRegistrationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);

  const [event, setEvent] = useState<EventSummary | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [eventCategory, setEventCategory] = useState<EventCategory>('');
  const [ageCategory, setAgeCategory] = useState('');
  const [weightCategory, setWeightCategory] = useState('');
  const [weightText, setWeightText] = useState('');
  const [seniCategory, setSeniCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phase 4 dual-mode: v2 events load published categories + eligibility preview
  const [publishedCategories, setPublishedCategories] = useState<ConfiguredEventCategory[]>([]);
  const [selectedV2Id, setSelectedV2Id] = useState('');
  const [preview, setPreview] = useState<{ eligible: boolean; status: string; reasons: string[] } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => setEvent(data as EventSummary | null));
  }, [id]);

  const isV2 = event?.registration_rules_version === 2;

  useEffect(() => {
    if (!isV2 || !id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset when v2 deactivates
      setPublishedCategories([]);
      setSelectedV2Id('');
      setPreview(null);
      return;
    }
    const supabase = createClient();
    supabase
      .from('event_categories')
      .select('*')
      .eq('event_id', id)
      .eq('is_published', true)
      .order('competition_type')
      .order('age_label')
      .order('code')
      .then(({ data }) => setPublishedCategories((data as ConfiguredEventCategory[]) ?? []));
  }, [isV2, id]);

  async function selectV2Category(categoryId: string) {
    setSelectedV2Id(categoryId);
    setPreview(null);
    if (!categoryId) return;
    setPreviewLoading(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc('check_registration_eligibility', {
      p_event_id: id,
      p_event_category_id: categoryId,
    });
    setPreviewLoading(false);
    if (rpcError) {
      setPreview({ eligible: false, status: 'ineligible', reasons: [rpcError.message] });
    } else {
      const r = data as { eligible: boolean; status: string; reasons: string[] };
      setPreview(r);
    }
  }

  const ageOptions = eventCategory === 'TANDING' ? TANDING_AGE_CATEGORIES : SENI_AGE_CATEGORIES;
  const isSimpleWeight = eventCategory === 'TANDING' && SIMPLE_WEIGHT_AGES.includes(ageCategory);
  const weightOptions = useMemo(() => WEIGHT_CATEGORIES_BY_AGE[ageCategory] ?? [], [ageCategory]);

  function pickCategory(v: EventCategory) {
    setEventCategory(v);
    setAgeCategory('');
    setWeightCategory('');
    setWeightText('');
    setSeniCategory('');
  }
  function pickAge(key: string) {
    setAgeCategory(key);
    setWeightCategory('');
    setWeightText('');
    setSeniCategory('');
  }

  const step3Complete = eventCategory === 'TANDING' ? (isSimpleWeight ? Number(weightText) > 0 : !!weightCategory) : !!seniCategory;
  const canContinue = step === 1 ? !!eventCategory : step === 2 ? !!ageCategory : step === 3 ? step3Complete : true;

  const weightDisplay = () => {
    if (eventCategory !== 'TANDING') return null;
    if (isSimpleWeight) return `${weightText} kg`;
    const found = weightOptions.find((c) => c.key === weightCategory);
    return found ? `${found.key} · ${found.label}` : '';
  };
  const seniDisplay = () => {
    const s = SENI_CATEGORIES.find((c) => c.key === seniCategory);
    return s ? s.label : '';
  };

  async function handleConfirm() {
    setError(null);
    // Phase 5 v2 path: configured categories use the audited RPC with snapshots
    if (isV2) {
      if (!selectedV2Id) {
        setError('Please select a category');
        return;
      }
      if (preview && preview.status === 'ineligible') {
        setError(`Ineligible: ${preview.reasons.join(', ')}`);
        return;
      }
      setSubmitting(true);
      const res = await playerApi.registerForEventV2(id, selectedV2Id);
      setSubmitting(false);
      if (res.success) {
        setStep(5);
      } else {
        setError(res.message || 'Registration failed');
      }
      return;
    }
    // Legacy v1 path
    if (!eventCategory) {
      setError('Please select an event category');
      return;
    }
    setSubmitting(true);
    const res = await playerApi.registerForEventWithCategory({
      event_id: id,
      event_category: eventCategory,
      age_category: ageCategory,
      weight_category: eventCategory === 'TANDING' ? (isSimpleWeight ? weightText.trim() : weightCategory) : undefined,
      seni_category: eventCategory === 'SENI' ? seniCategory : undefined,
    });
    setSubmitting(false);
    if (res.success) {
      setStep(5);
    } else {
      setError(res.message || 'Registration failed');
    }
  }

  function registerAnother() {
    pickCategory('');
    setSelectedV2Id('');
    setPreview(null);
    setError(null);
    setStep(1);
  }

  return (
    <div className="page">
      <div className="event-card">
        <div className="event-icon">
          <TrophyIcon />
        </div>
        <div className="event-body">
          <p className="event-name">{event?.event_name || 'Loading event…'}</p>
          <div className="event-meta">
            {event?.event_date && (
              <span className="when">
                <CalendarIcon />
                {new Date(event.event_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
            {(event?.venue || event?.location) && (
              <span>
                <PinIcon />
                {event.venue || event.location}
              </span>
            )}
          </div>
        </div>
        <span className="open-pill">Open</span>
      </div>

      {isV2 && (
        <section className="step">
          <p className="step-label">Configured categories</p>
          <h2>Select your category</h2>
          <p className="step-note">This event uses configured categories. Eligibility is checked live — submission still uses legacy until Phase 5.</p>
          {publishedCategories.length === 0 ? (
            <p className="step-note">No published categories yet. Please check back after organizer publishes.</p>
          ) : (
            <div className="choice-grid age-grid">
              {publishedCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`choice-card ${selectedV2Id === c.id ? 'selected' : ''}`}
                  onClick={() => selectV2Category(c.id)}
                >
                  <span className="age-text">
                    <span className="choice-title">{c.code}</span>
                    <span className="choice-desc">
                      {c.competition_type} · {c.age_label} {c.maximum_age ? `(${c.minimum_age}-${c.maximum_age})` : `(${c.minimum_age}+)`} · {c.gender}{' '}
                      {c.weight_label ? `· ${c.weight_label}` : c.seni_category ? `· ${c.seni_category}` : ''}
                    </span>
                  </span>
                  <span className="choice-check"><CheckIcon /></span>
                </button>
              ))}
            </div>
          )}
          {selectedV2Id && (
            <div className="review-card" style={{ marginTop: 16 }}>
              {previewLoading ? (
                <p className="step-note">Checking eligibility…</p>
              ) : preview ? (
                <>
                  <div className="review-row">
                    <span className="review-label">Eligibility</span>
                    <span className="review-value">{preview.status} {preview.eligible ? '✓' : '✗'}</span>
                  </div>
                  {preview.reasons.length > 0 && (
                    <div className="review-row">
                      <span className="review-label">Reasons</span>
                      <span className="review-value">{preview.reasons.join(', ')}</span>
                    </div>
                  )}
                  <p className="step-note" style={{ marginTop: 8 }}>
                    {preview.status === 'eligible' ? 'You are eligible — you can confirm.' : preview.status === 'pending_weight_verification' ? 'Pending organizer weight verification — you can still register, approval will wait.' : 'Fix the reasons above before registering.'}
                  </p>
                </>
              ) : null}
            </div>
          )}
          {selectedV2Id && (
            <>
              {error && <p className="form-error">{error}</p>}
              <button type="button" className="btn-continue" disabled={submitting || previewLoading} onClick={handleConfirm} style={{ marginTop: 12, width: '100%' }}>
                {submitting ? 'Registering…' : 'Confirm registration'}
              </button>
            </>
          )}
        </section>
      )}

      {!isV2 && step <= 4 && (
        <div className="progress">
          <div className="progress-line-wrap">
            <div className="progress-line-track" />
            <div className="progress-line-fill" style={{ width: `${((step - 1) / 3) * 100}%` }} />
          </div>
          {STEPS.map((s) => (
            <div key={s.n} className={`progress-node ${step > s.n ? 'done' : ''} ${step === s.n ? 'current' : ''}`}>
              <span className="progress-circle">
                {step > s.n ? <CheckIcon /> : <span className="node-num">{s.n}</span>}
              </span>
              <span className="progress-label">
                {s.n === 3 ? (eventCategory === 'SENI' ? 'Style' : isSimpleWeight ? 'Weight' : 'Weight class') : s.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {!isV2 && step === 1 && (
        <section className="step">
          <p className="step-label">Category</p>
          <h2>Which category are you entering?</h2>
          <p className="step-note">This decides how the rest of registration works.</p>
          <div className="choice-grid two-col">
            <button type="button" className={`choice-card ${eventCategory === 'TANDING' ? 'selected' : ''}`} onClick={() => pickCategory('TANDING')}>
              <span className="choice-check"><CheckIcon /></span>
              <span className="choice-icon"><CrossedSticksIcon /></span>
              <span className="choice-title">TANDING</span>
              <span className="choice-desc">Head-to-head sparring, scored on points.</span>
            </button>
            <button type="button" className={`choice-card ${eventCategory === 'SENI' ? 'selected' : ''}`} onClick={() => pickCategory('SENI')}>
              <span className="choice-check"><CheckIcon /></span>
              <span className="choice-icon"><StarIcon /></span>
              <span className="choice-title">SENI</span>
              <span className="choice-desc">Solo or team performance routines, scored on form.</span>
            </button>
          </div>
        </section>
      )}

      {!isV2 && step === 2 && (
        <section className="step">
          <p className="step-label">Age group</p>
          <h2>What&apos;s your age category?</h2>
          <p className="step-note">You may register once per age group for this event.</p>
          <div className="choice-grid age-grid">
            {ageOptions.map((c) => (
              <button key={c.key} type="button" className={`choice-card ${ageCategory === c.key ? 'selected' : ''}`} onClick={() => pickAge(c.key)}>
                <span className="age-text">
                  <span className="choice-title">{c.key}</span>
                  <span className="choice-desc">{ageRange(c.label)}</span>
                </span>
                <span className="choice-check"><CheckIcon /></span>
              </button>
            ))}
          </div>
        </section>
      )}

      {!isV2 && step === 3 && eventCategory === 'TANDING' && isSimpleWeight && (
        <section className="step">
          <p className="step-label">Weight</p>
          <h2>What&apos;s your weight?</h2>
          <p className="step-note">This age group weighs in on the day — an approximate figure is fine for now.</p>
          <div className="weight-input-wrap">
            <input type="number" min="1" inputMode="decimal" placeholder="0" value={weightText} onChange={(e) => setWeightText(e.target.value)} />
            <span className="weight-unit">kg</span>
          </div>
        </section>
      )}

      {!isV2 && step === 3 && eventCategory === 'TANDING' && !isSimpleWeight && (
        <section className="step">
          <p className="step-label">Weight class</p>
          <h2>What&apos;s your weight class?</h2>
          <p className="step-note">Your weight class determines who you&apos;ll be matched against.</p>
          <div className="chip-grid">
            {weightOptions.map((c) => (
              <div key={c.key} className={`weight-chip ${weightCategory === c.key ? 'selected' : ''}`} onClick={() => setWeightCategory(c.key)}>
                <span className="code">{c.key}</span>
                <span className="range">{c.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {!isV2 && step === 3 && eventCategory === 'SENI' && (
        <section className="step">
          <p className="step-label">Style</p>
          <h2>Which performance category?</h2>
          <p className="step-note">Ganda and Regu are pair/team events — pick the slot that&apos;s yours.</p>
          <div className="choice-grid seni-grid">
            {SENI_CATEGORIES.map((c) => (
              <button key={c.key} type="button" className={`choice-card ${seniCategory === c.key ? 'selected' : ''}`} onClick={() => setSeniCategory(c.key)}>
                <span className="age-text">
                  <span className="choice-title">{c.label}</span>
                  {SENI_HINT[c.key] && <span className="choice-desc">{SENI_HINT[c.key]}</span>}
                </span>
                <span className="choice-check"><CheckIcon /></span>
              </button>
            ))}
          </div>
        </section>
      )}

      {!isV2 && step === 4 && (
        <section className="step">
          <p className="step-label">Review</p>
          <h2>Confirm your registration</h2>
          <p className="step-note">Check this before you submit — organizers seed brackets straight from it.</p>
          <div className="review-card">
            <div className="review-row">
              <span className="review-label">Category</span>
              <span className="review-value">
                {eventCategory}
                <button className="review-edit" onClick={() => setStep(1)}>Edit</button>
              </span>
            </div>
            <div className="review-row">
              <span className="review-label">Age group</span>
              <span className="review-value">
                {ageCategory} · {ageRange(ageOptions.find((a) => a.key === ageCategory)?.label || '')}
                <button className="review-edit" onClick={() => setStep(2)}>Edit</button>
              </span>
            </div>
            <div className="review-row">
              <span className="review-label">{eventCategory === 'TANDING' ? 'Weight class' : 'Style'}</span>
              <span className="review-value">
                {eventCategory === 'TANDING' ? weightDisplay() : seniDisplay()}
                <button className="review-edit" onClick={() => setStep(3)}>Edit</button>
              </span>
            </div>
          </div>
          {error && <p className="form-error">{error}</p>}
        </section>
      )}

      {step === 5 && (
        <section className="success">
          <div className="success-icon"><CheckIcon /></div>
          <h2>You&apos;re in.</h2>
          <p>
            You&apos;re registered for {event?.event_name} —{' '}
            {isV2
              ? publishedCategories.find((c) => c.id === selectedV2Id)?.code || selectedV2Id
              : eventCategory === 'TANDING'
                ? `TANDING · ${ageCategory} · ${weightDisplay()}`
                : `SENI · ${ageCategory} · ${seniDisplay()}`}
            .
          </p>
          <span className="status-pill">Pending organizer approval</span>
          <div>
            <Link href="/player/events" className="cta">Back to Events</Link>
            <button className="again-link" onClick={registerAnother}>Register another category for this event</button>
          </div>
        </section>
      )}

      {!isV2 && step <= 4 && (
        <div className="footer-nav">
          {step > 1 && (
            <button type="button" className="btn-back" onClick={() => setStep((s) => (s - 1) as Step)}>
              Back
            </button>
          )}
          <button
            type="button"
            className="btn-continue"
            disabled={!canContinue || submitting}
            onClick={() => (step === 4 ? handleConfirm() : setStep((s) => (s + 1) as Step))}
          >
            {step === 4 ? (submitting ? 'Registering…' : 'Confirm registration') : 'Continue'}
          </button>
        </div>
      )}

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 22px;
          max-width: 640px;
          margin: 0 auto;
        }

        .event-card {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          gap: 14px;
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 20px;
          padding: 18px 20px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -12px rgba(22, 24, 29, 0.16);
        }
        .event-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(180deg, var(--color-accent-blue), #00b8d9);
        }
        .event-icon {
          width: 52px;
          height: 52px;
          border-radius: 15px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-accent-blue), #00b8d9);
          box-shadow: 0 8px 16px -8px color-mix(in srgb, var(--color-accent-blue) 55%, transparent);
        }
        .event-icon :global(svg) {
          width: 25px;
          height: 25px;
          color: #fff;
        }
        .event-body {
          min-width: 0;
          flex: 1;
        }
        .event-name {
          font-size: 17.5px;
          font-weight: 800;
          letter-spacing: -0.2px;
          margin: 0 0 5px;
        }
        .event-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 13px;
        }
        .event-meta span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12.5px;
          color: var(--color-muted);
        }
        .event-meta :global(svg) {
          width: 12.5px;
          height: 12.5px;
          color: #9aa0ac;
          flex-shrink: 0;
        }
        .event-meta .when {
          font-family: var(--font-mono);
          font-weight: 600;
          color: #3a3d45;
        }
        .event-meta .when :global(svg) {
          color: var(--color-accent-blue);
        }
        .open-pill {
          flex-shrink: 0;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.2px;
          color: #0a8a3f;
          background: color-mix(in srgb, var(--color-accent-green) 14%, transparent);
          padding: 5px 11px;
          border-radius: 999px;
          white-space: nowrap;
        }

        /* ---------- progress stepper ---------- */
        .progress {
          position: relative;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
        }
        .progress-line-wrap {
          position: absolute;
          top: 17px;
          left: 0;
          right: 0;
          margin: 0 12.5%;
          height: 3px;
          z-index: 0;
        }
        .progress-line-track {
          position: absolute;
          inset: 0;
          background: var(--color-line);
          border-radius: 999px;
        }
        .progress-line-fill {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--color-accent-blue), #00b8d9);
          transition: width 0.55s cubic-bezier(0.65, 0, 0.35, 1);
        }
        .progress-node {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .progress-circle {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-surface);
          border: 2px solid var(--color-line);
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 700;
          color: #b7b3aa;
          transition: background 0.35s ease, border-color 0.35s ease, color 0.35s ease, box-shadow 0.35s ease, transform 0.35s ease;
        }
        .progress-circle :global(svg) {
          width: 14px;
          height: 14px;
        }
        .progress-node.current .progress-circle {
          background: linear-gradient(135deg, var(--color-accent-blue), #00b8d9);
          border-color: transparent;
          color: #fff;
          transform: scale(1.08);
          box-shadow: 0 0 0 5px color-mix(in srgb, var(--color-accent-blue) 16%, transparent),
            0 6px 14px -6px color-mix(in srgb, var(--color-accent-blue) 60%, transparent);
          animation: nodePulse 2.2s ease-in-out infinite;
        }
        .progress-node.done .progress-circle {
          background: linear-gradient(135deg, var(--color-accent-blue), #00b8d9);
          border-color: transparent;
          color: #fff;
        }
        @keyframes nodePulse {
          0%,
          100% {
            box-shadow: 0 0 0 5px color-mix(in srgb, var(--color-accent-blue) 16%, transparent),
              0 6px 14px -6px color-mix(in srgb, var(--color-accent-blue) 60%, transparent);
          }
          50% {
            box-shadow: 0 0 0 8px color-mix(in srgb, var(--color-accent-blue) 10%, transparent),
              0 6px 14px -6px color-mix(in srgb, var(--color-accent-blue) 60%, transparent);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .progress-node.current .progress-circle {
            animation: none;
          }
        }
        .progress-label {
          font-size: 13.5px;
          font-weight: 600;
          color: #b7b3aa;
          letter-spacing: 0.1px;
          text-align: center;
          transition: color 0.3s ease, font-weight 0.3s ease;
        }
        .progress-node.done .progress-label {
          color: var(--color-accent-blue);
        }
        .progress-node.current .progress-label {
          color: var(--color-ink);
          font-weight: 700;
        }

        /* ---------- step shell ---------- */
        .step-label {
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--color-accent-blue);
          margin: 0 0 8px;
        }
        .step h2 {
          font-size: 21px;
          font-weight: 800;
          letter-spacing: -0.3px;
          margin: 0 0 6px;
        }
        .step-note {
          font-size: 13px;
          color: var(--color-muted);
          margin: 0 0 20px;
          line-height: 1.5;
        }
        @keyframes stepIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .step {
          animation: stepIn 0.32s cubic-bezier(0.2, 0.7, 0.3, 1);
        }

        /* ---------- choice cards ---------- */
        .choice-grid {
          display: grid;
          gap: 12px;
        }
        .choice-grid.two-col {
          grid-template-columns: 1fr 1fr;
        }
        :global(.choice-card) {
          position: relative;
          text-align: left;
          cursor: pointer;
          background: var(--color-surface);
          border: 1.5px solid var(--color-line);
          border-radius: 16px;
          padding: 18px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
          font-family: inherit;
          width: 100%;
        }
        :global(.choice-card:hover) {
          border-color: color-mix(in srgb, var(--color-accent-blue) 45%, var(--color-line));
          transform: translateY(-1px);
        }
        :global(.choice-card.selected) {
          border-color: var(--color-accent-blue);
          background: color-mix(in srgb, var(--color-accent-blue) 6%, #fff);
          box-shadow: 0 8px 20px -12px color-mix(in srgb, var(--color-accent-blue) 45%, transparent);
        }
        .choice-check {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 19px;
          height: 19px;
          border-radius: 50%;
          background: var(--color-accent-blue);
          color: #fff;
          display: none;
          align-items: center;
          justify-content: center;
        }
        .choice-check :global(svg) {
          width: 10px;
          height: 10px;
        }
        :global(.choice-card.selected) .choice-check {
          display: flex;
        }
        .choice-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: color-mix(in srgb, var(--color-accent-blue) 12%, transparent);
          color: var(--color-accent-blue);
        }
        .choice-icon :global(svg) {
          width: 19px;
          height: 19px;
        }
        .choice-title {
          font-size: 15.5px;
          font-weight: 700;
        }
        .choice-desc {
          font-size: 12.5px;
          color: var(--color-muted);
          line-height: 1.45;
        }

        .age-grid {
          grid-template-columns: repeat(2, 1fr);
        }
        .age-grid :global(.choice-card) {
          padding: 14px 15px;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .age-grid .choice-title {
          font-size: 14px;
        }
        .age-grid .choice-desc {
          font-size: 11.5px;
          margin: 0;
        }
        .age-grid .choice-check {
          position: static;
          display: flex;
          opacity: 0;
          flex-shrink: 0;
        }
        .age-grid :global(.choice-card.selected) .choice-check {
          opacity: 1;
        }
        .age-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .seni-grid {
          grid-template-columns: 1fr;
        }
        .seni-grid :global(.choice-card) {
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
        }

        /* ---------- weight chips / input ---------- */
        .chip-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .weight-chip {
          cursor: pointer;
          text-align: center;
          min-width: 108px;
          background: var(--color-surface);
          border: 1.5px solid var(--color-line);
          border-radius: 13px;
          padding: 9px 12px;
          transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
        }
        .weight-chip:hover {
          border-color: color-mix(in srgb, var(--color-accent-blue) 45%, var(--color-line));
        }
        .weight-chip.selected {
          border-color: var(--color-accent-blue);
          background: color-mix(in srgb, var(--color-accent-blue) 8%, #fff);
          box-shadow: 0 6px 14px -9px color-mix(in srgb, var(--color-accent-blue) 50%, transparent);
        }
        .weight-chip .code {
          display: block;
          font-size: 13.5px;
          font-weight: 700;
        }
        .weight-chip .range {
          display: block;
          font-size: 10.5px;
          color: var(--color-muted);
          margin-top: 2px;
        }
        .weight-chip.selected .range {
          color: var(--color-accent-blue);
        }

        .weight-input-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: 1.5px solid var(--color-line);
          border-radius: 18px;
          padding: 22px;
          background: var(--color-surface);
        }
        .weight-input-wrap:focus-within {
          border-color: var(--color-accent-blue);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent-blue) 14%, transparent);
        }
        .weight-input-wrap input {
          width: 110px;
          border: none;
          outline: none;
          background: transparent;
          text-align: right;
          font-family: var(--font-mono);
          font-size: 34px;
          font-weight: 700;
          color: var(--color-ink);
        }
        .weight-unit {
          font-size: 16px;
          font-weight: 700;
          color: var(--color-muted);
        }

        /* ---------- review ---------- */
        .review-card {
          background: var(--color-surface);
          border: 1px solid rgba(22, 24, 29, 0.05);
          border-radius: 18px;
          padding: 6px 20px;
          box-shadow: 0 1px 2px rgba(22, 24, 29, 0.04), 0 10px 24px -14px rgba(22, 24, 29, 0.16);
        }
        .review-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 0;
          border-bottom: 1px solid var(--color-line);
        }
        .review-row:last-child {
          border-bottom: none;
        }
        .review-label {
          font-size: 12px;
          color: var(--color-muted);
          font-weight: 600;
        }
        .review-value {
          font-size: 14px;
          font-weight: 700;
          text-align: right;
        }
        .review-edit {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--color-accent-blue);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          margin-left: 10px;
          font-family: inherit;
        }
        .form-error {
          font-size: 12.5px;
          color: var(--color-corner-red);
          margin: 12px 0 0;
        }

        /* ---------- footer nav ---------- */
        .footer-nav {
          display: flex;
          gap: 10px;
        }
        .btn-back {
          padding: 13px 20px;
          border-radius: 13px;
          border: 1.5px solid var(--color-line);
          background: var(--color-surface);
          font-size: 14px;
          font-weight: 700;
          color: #3a3d45;
          cursor: pointer;
          font-family: inherit;
        }
        .btn-continue {
          flex: 1;
          border: none;
          border-radius: 13px;
          padding: 13px 20px;
          font-size: 14.5px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          background: linear-gradient(120deg, var(--color-accent-blue), #00b8d9);
          box-shadow: 0 10px 20px -10px color-mix(in srgb, var(--color-accent-blue) 55%, transparent);
          transition: transform 0.08s ease, opacity 0.15s ease;
          font-family: inherit;
        }
        .btn-continue:active {
          transform: translateY(1px);
        }
        .btn-continue:disabled {
          opacity: 0.4;
          cursor: default;
          box-shadow: none;
        }

        /* ---------- success ---------- */
        .success {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 30px 10px 10px;
        }
        .success-icon {
          width: 68px;
          height: 68px;
          border-radius: 50%;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: color-mix(in srgb, var(--color-accent-green) 15%, transparent);
          color: #0a8a3f;
          animation: pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes pop {
          from {
            transform: scale(0.5);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .success-icon :global(svg) {
          width: 30px;
          height: 30px;
        }
        .success h2 {
          font-size: 22px;
          font-weight: 800;
          margin: 0 0 8px;
        }
        .success p {
          font-size: 14px;
          color: var(--color-muted);
          max-width: 380px;
          line-height: 1.55;
          margin: 0 0 26px;
        }
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: color-mix(in srgb, var(--color-status-pending) 18%, transparent);
          color: #93710f;
          font-size: 12px;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: 999px;
          margin-bottom: 22px;
        }
        :global(.cta) {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: none;
          border-radius: 13px;
          padding: 13px 26px;
          font-family: inherit;
          font-size: 14.5px;
          font-weight: 700;
          color: #fff;
          text-decoration: none;
          background: linear-gradient(120deg, var(--color-accent-blue), #00b8d9);
          box-shadow: 0 10px 20px -10px color-mix(in srgb, var(--color-accent-blue) 55%, transparent);
        }
        .again-link {
          display: block;
          margin-top: 14px;
          font-size: 12.5px;
          font-weight: 700;
          color: var(--color-muted);
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 2px;
          font-family: inherit;
        }

        @media (max-width: 480px) {
          .choice-grid.two-col,
          .age-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
