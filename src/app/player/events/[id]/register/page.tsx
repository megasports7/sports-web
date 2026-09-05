'use client';

import { useEffect, useState, use as usePromise } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { playerApi } from '@/lib/api/player.api';
import {
  TANDING_AGE_CATEGORIES,
  SENI_AGE_CATEGORIES,
  WEIGHT_CATEGORIES_BY_AGE,
  SIMPLE_WEIGHT_AGES,
  SENI_CATEGORIES,
} from '@/lib/player/registrationCategories';

interface EventSummary {
  event_name?: string;
  venue?: string;
  location?: string;
  organizer_name?: string;
}

export default function EventRegistrationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();

  const [event, setEvent] = useState<EventSummary | null>(null);
  const [eventCategory, setEventCategory] = useState<'' | 'TANDING' | 'SENI'>('');
  const [ageCategory, setAgeCategory] = useState('');
  const [weightCategory, setWeightCategory] = useState('');
  const [weightText, setWeightText] = useState('');
  const [seniCategory, setSeniCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => setEvent(data));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!eventCategory) return setError('Please select an event category');
    if (eventCategory === 'TANDING') {
      if (!ageCategory) return setError('Please select an age category');
      if (SIMPLE_WEIGHT_AGES.includes(ageCategory)) {
        if (!weightText.trim()) return setError('Please enter your weight');
      } else if (!weightCategory) {
        return setError('Please select a weight category');
      }
    } else if (eventCategory === 'SENI') {
      if (!ageCategory) return setError('Please select an age category');
      if (!seniCategory) return setError('Please select a seni category');
    }

    setSubmitting(true);
    const res = await playerApi.registerForEventWithCategory({
      event_id: Number(id),
      event_category: eventCategory,
      age_category: ageCategory,
      weight_category:
        eventCategory === 'TANDING'
          ? SIMPLE_WEIGHT_AGES.includes(ageCategory)
            ? weightText.trim()
            : weightCategory
          : undefined,
      seni_category: eventCategory === 'SENI' ? seniCategory : undefined,
    });
    setSubmitting(false);

    if (res.success) {
      router.push('/player/events');
    } else {
      setError(res.message || 'Registration failed');
    }
  }

  const ageOptions = eventCategory === 'TANDING' ? TANDING_AGE_CATEGORIES : SENI_AGE_CATEGORIES;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-lg font-bold">{event?.event_name || 'Register'}</h1>
      <p className="mb-4 text-sm text-gray-500">
        Venue: {event?.venue || event?.location || 'TBD'} · Organizer: {event?.organizer_name || 'TBD'}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Event category *
          <select
            value={eventCategory}
            onChange={(e) => {
              setEventCategory(e.target.value as 'TANDING' | 'SENI');
              setAgeCategory('');
              setWeightCategory('');
              setWeightText('');
              setSeniCategory('');
            }}
            className="rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="">Select event category</option>
            <option value="TANDING">TANDING</option>
            <option value="SENI">SENI</option>
          </select>
        </label>

        {eventCategory && (
          <label className="flex flex-col gap-1 text-sm">
            Age category *
            <select
              value={ageCategory}
              onChange={(e) => {
                setAgeCategory(e.target.value);
                setWeightCategory('');
                setWeightText('');
              }}
              className="rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">Select age category</option>
              {ageOptions.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <span className="text-xs italic text-gray-400">
              You may register once per age group (e.g., one Senior, one Junior…)
            </span>
          </label>
        )}

        {eventCategory === 'TANDING' && ageCategory && SIMPLE_WEIGHT_AGES.includes(ageCategory) && (
          <label className="flex flex-col gap-1 text-sm">
            Weight (kg) *
            <input
              type="number"
              value={weightText}
              onChange={(e) => setWeightText(e.target.value)}
              placeholder="Enter weight in kg"
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
        )}

        {eventCategory === 'TANDING' && ageCategory && !SIMPLE_WEIGHT_AGES.includes(ageCategory) && (
          <label className="flex flex-col gap-1 text-sm">
            Weight category *
            <select
              value={weightCategory}
              onChange={(e) => setWeightCategory(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">Select weight category</option>
              {(WEIGHT_CATEGORIES_BY_AGE[ageCategory] ?? []).map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {eventCategory === 'SENI' && ageCategory && (
          <label className="flex flex-col gap-1 text-sm">
            Seni category *
            <select
              value={seniCategory}
              onChange={(e) => setSeniCategory(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">Select seni category</option>
              {SENI_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-[2] rounded-lg bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium"
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );
}
