/**
 * Direct close port of sports-mobile-main/src/api/organizer.api.ts, per
 * docs/M7_CONTRACT.md's "API layer: direct close port" section.
 *
 * Phase 3 scope: the 10 non-camera organizer screens. Excludes
 * eventRegistrations()/the no-arg batches() overload (both confirmed dead
 * code in the mobile source -- zero live callers -- not ported per the same
 * "don't replicate unused code" principle already applied in Phase 2).
 *
 * QR-scanning follow-up phase adds back getPlayerByQR/scanAttendance/
 * scanForList/getAttendanceListScans (originally deferred alongside the 3
 * camera-scanning screens). scanAttendance's player-matching logic is
 * adapted, not byte-ported -- see that function's own comment: mobile
 * matches by legacy_id, which is NULL for every self-signup player and
 * would incorrectly treat any two such players as the same one.
 *
 * ID types corrected against the mobile source's own documented asymmetry
 * (see organizer.api.ts's file-header comment): every *_id below that is a
 * real Postgres uuid (batch/match/referee/player/registration/event ids) is
 * typed `string` here, not `number` -- the mobile TS types say `number` for
 * historical reasons but the runtime value has always been a uuid string.
 * This is not a stylistic choice: Phase 2's own registration page shipped
 * exactly this bug (`Number(event_id)` on a uuid, silently producing NaN),
 * caught only because this phase's discovery pass flagged the pattern.
 */
import { createClient } from '../supabase/client';
import type {
  ApiResponse,
  Organizer,
  OrganizerDashboardData,
  Event,
  Registration,
  Batch,
  BatchPlayer,
  Referee,
  OrganizerMatch,
  FilteredPlayer,
  AttendanceList,
} from '../types';

function toApiResponse<T>(result: { data: T | null; error: unknown }): ApiResponse<T> {
  const { data, error } = result;
  if (error) {
    const message =
      (typeof (error as { message?: unknown })?.message === 'string' &&
        (error as { message: string }).message) ||
      'Request failed';
    return { success: false, message, error: { message } };
  }
  return { success: true, data: data ?? undefined, message: 'OK' };
}

async function getUid(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) throw new Error('Not signed in');
  return uid;
}

function mapOrganizerRow(row: Record<string, unknown> | null): Organizer | null {
  if (!row) return null;
  const { legacy_id, ...rest } = row;
  return { ...rest, organizer_id: legacy_id } as Organizer;
}

async function resolvePhoto(
  supabase: ReturnType<typeof createClient>,
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from('profile-photos').createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

function sanitizeProfileUpdate(data: Partial<Organizer>): Record<string, unknown> {
  const src = data as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const passthrough = ['name', 'phone', 'state', 'district', 'id_number', 'id_valid_until'];
  for (const key of passthrough) {
    if (src[key] !== undefined) out[key] = src[key];
  }
  return out;
}

function mapEventRow(row: Record<string, unknown>): Event {
  return { ...row, event_id: row.id } as unknown as Event;
}

/** batch_label was never a real distinct column (mobile's own comment:
 *  batches.sql Q9) -- it's always equal to category, so this derives it the
 *  same way rather than trusting a second, always-redundant field. */
function mapBatchRow(row: Record<string, unknown>): Batch {
  return { ...row, batch_id: row.id, batch_label: row.category ?? null } as unknown as Batch;
}

async function attachRefereeNames(
  supabase: ReturnType<typeof createClient>,
  batches: Record<string, unknown>[],
): Promise<Batch[]> {
  const refIds = Array.from(new Set(batches.map((b) => b.referee_id).filter(Boolean))) as string[];
  if (!refIds.length) return batches.map((b) => ({ ...mapBatchRow(b), referee_name: null }));

  const { data: refs } = await supabase.from('profiles').select('id, name').in('id', refIds);
  const nameById = new Map((refs ?? []).map((r) => [r.id, r.name]));

  return batches.map((b) => ({
    ...mapBatchRow(b),
    referee_name: b.referee_id ? (nameById.get(b.referee_id as string) ?? null) : null,
  }));
}

/** player_id is deliberately profiles.legacy_id here (matching mobile's own
 *  asymmetry note) -- NOT the uuid, unlike batchPlayers/getFilteredPlayers
 *  below, which deliberately expose the real uuid because it flows into
 *  createBatch's uuid[] RPC parameter. attendance_status is synthesized from
 *  the boolean `attendance` column so the UI can key off a string. */
function mapRegistrationRow(row: Record<string, unknown>, profile?: Record<string, unknown>): Registration {
  return {
    ...row,
    registration_id: row.id,
    player_id: (profile?.legacy_id as number | null) ?? null,
    player_name: profile?.name,
    email: profile?.email,
    phone: profile?.phone,
    attendance_status: row.attendance ? 'present' : null,
  } as unknown as Registration;
}

async function fetchRegistrationsForEvent(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
): Promise<ApiResponse<Registration[]>> {
  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });
  if (error) return toApiResponse<Registration[]>({ data: null, error });

  const regs = data ?? [];
  const playerIds = Array.from(new Set(regs.map((r) => r.player_id).filter(Boolean)));
  const { data: profiles } = playerIds.length
    ? await supabase.from('profiles').select('id, legacy_id, name, email, phone').in('id', playerIds)
    : { data: [] as Record<string, unknown>[] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  return toApiResponse({
    data: regs.map((r) => mapRegistrationRow(r, byId.get(r.player_id))),
    error: null,
  });
}

async function resolvePlayerNames(
  supabase: ReturnType<typeof createClient>,
  ids: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(ids.filter((id): id is string => !!id)));
  if (!uniqueIds.length) return new Map();
  const { data } = await supabase.from('profiles').select('id, name').in('id', uniqueIds);
  return new Map((data ?? []).map((p) => [p.id, p.name]));
}

/** Web-native: a real File/Blob, no file://-uri/base64 detour -- storage-js
 *  accepts File directly in the browser (genuinely simpler than mobile,
 *  same pattern as player.api.ts's uploadPhoto). event-banners is a PUBLIC
 *  bucket (unlike profile-photos), so a public URL, not a signed one, is
 *  correct here. */
async function uploadEventBanner(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  file: File,
): Promise<string | null> {
  const contentType = file.type || 'image/jpeg';
  const ext = contentType.split('/')[1] || 'jpg';
  const path = `${eventId}/banner.${ext}`;
  const { error } = await supabase.storage.from('event-banners').upload(path, file, { contentType, upsert: true });
  if (error) return null;
  const { data } = supabase.storage.from('event-banners').getPublicUrl(path);
  return data?.publicUrl ?? null;
}

export const organizerApi = {
  dashboard(): Promise<ApiResponse<OrganizerDashboardData>> {
    return (async () => {
      const supabase = createClient();
      const uid = await getUid(supabase);

      const [profileRes, eventsCountRes, batchesCountRes, registrationsCountRes, recentEventsRes, allEventsRes] =
        await Promise.all([
          supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
          supabase.from('events').select('*', { count: 'exact', head: true }).eq('organizer_id', uid),
          supabase.from('batches').select('*', { count: 'exact', head: true }).eq('organizer_id', uid),
          supabase.from('registrations').select('id', { count: 'exact', head: true }),
          supabase
            .from('events')
            .select('*')
            .eq('organizer_id', uid)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase.from('events').select('id, event_date').eq('organizer_id', uid),
        ]);

      if (profileRes.error || !profileRes.data) {
        return toApiResponse<OrganizerDashboardData>({
          data: null,
          error: profileRes.error ?? { message: 'Profile not found' },
        });
      }

      const photo = await resolvePhoto(supabase, profileRes.data.photo);

      const todayIso = new Date().toISOString().slice(0, 10);
      const todayEventIds = (allEventsRes.data ?? [])
        .filter((e) => e.event_date && String(e.event_date).slice(0, 10) === todayIso)
        .map((e) => e.id);

      let activeToday = 0;
      if (todayEventIds.length) {
        const { data: todayMatches } = await supabase
          .from('matches')
          .select('player1_id, player2_id')
          .in('event_id', todayEventIds)
          .eq('status', 'scheduled');
        const activeSet = new Set<string>();
        for (const m of todayMatches ?? []) {
          if (m.player1_id) activeSet.add(m.player1_id);
          if (m.player2_id) activeSet.add(m.player2_id);
        }
        activeToday = activeSet.size;
      }

      const organizer = mapOrganizerRow(profileRes.data as Record<string, unknown>)!;
      return toApiResponse({
        data: {
          organizer: { ...organizer, photo },
          stats: {
            total_events: eventsCountRes.count ?? 0,
            total_batches: batchesCountRes.count ?? 0,
            total_registrations: registrationsCountRes.count ?? 0,
            active_today: activeToday,
          },
          recent_events: (recentEventsRes.data ?? []).map((e) => mapEventRow(e)),
        },
        error: null,
      });
    })();
  },

  profile(): Promise<ApiResponse<Organizer>> {
    return (async () => {
      const supabase = createClient();
      const uid = await getUid(supabase);
      const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
      if (error || !data)
        return toApiResponse<Organizer>({ data: null, error: error ?? { message: 'Profile not found' } });

      const photo = await resolvePhoto(supabase, data.photo);
      const organizer = mapOrganizerRow(data as Record<string, unknown>)!;
      return toApiResponse({ data: { ...organizer, photo }, error: null });
    })();
  },

  updateProfile(data: Partial<Organizer>): Promise<ApiResponse<Organizer>> {
    return (async () => {
      const supabase = createClient();
      const uid = await getUid(supabase);
      const updates = sanitizeProfileUpdate(data);
      const { data: updated, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', uid)
        .select('*')
        .maybeSingle();
      if (error) return toApiResponse<Organizer>({ data: null, error });

      const photo = await resolvePhoto(supabase, updated?.photo);
      const organizer = updated ? mapOrganizerRow(updated as Record<string, unknown>) : null;
      return toApiResponse({ data: organizer ? { ...organizer, photo } : null, error: null });
    })();
  },

  uploadPhoto(file: File): Promise<ApiResponse<{ photo: string }>> {
    return (async () => {
      const supabase = createClient();
      const uid = await getUid(supabase);
      const contentType = file.type || 'image/jpeg';
      const ext = contentType.split('/')[1] || 'jpg';
      const path = `${uid}/photo.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('profile-photos')
        .upload(path, file, { contentType, upsert: true });
      if (uploadErr) return toApiResponse<{ photo: string }>({ data: null, error: uploadErr });

      const { error: patchErr } = await supabase.from('profiles').update({ photo: path }).eq('id', uid);
      if (patchErr) return toApiResponse<{ photo: string }>({ data: null, error: patchErr });

      const photo = await resolvePhoto(supabase, path);
      return toApiResponse<{ photo: string }>({ data: { photo: photo ?? path }, error: null });
    })();
  },

  events(): Promise<ApiResponse<Event[]>> {
    return (async () => {
      const supabase = createClient();
      const uid = await getUid(supabase);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', uid)
        .order('created_at', { ascending: false });
      if (error) return toApiResponse<Event[]>({ data: null, error });

      const events = data ?? [];
      const eventIds = events.map((e) => e.id);
      const countByEvent = new Map<string, number>();
      if (eventIds.length) {
        const { data: regs } = await supabase.from('registrations').select('event_id').in('event_id', eventIds);
        for (const r of regs ?? []) {
          countByEvent.set(r.event_id, (countByEvent.get(r.event_id) ?? 0) + 1);
        }
      }

      return toApiResponse({
        data: events.map((e) => ({ ...mapEventRow(e), player_count: countByEvent.get(e.id) ?? 0 })),
        error: null,
      });
    })();
  },

  /** banner_image_file (a real File), not banner_image_uri -- the mobile
   *  signature's file://-uri field has no web equivalent; the browser file
   *  input hands back a File directly, which is simpler to upload, not a
   *  workaround. Event inserted first (Storage's owns_event check needs a
   *  real event row to check against), banner uploaded after; a banner
   *  failure logs and the event still succeeds without one, matching
   *  mobile's own forgiving behavior. */
  createEvent(data: {
    event_name: string;
    venue?: string;
    location?: string;
    description?: string;
    event_date?: string;
    banner_image_file?: File;
  }): Promise<ApiResponse<Event>> {
    return (async () => {
      const supabase = createClient();
      const uid = await getUid(supabase);

      const { data: inserted, error: insertErr } = await supabase
        .from('events')
        .insert({
          event_name: data.event_name,
          location: data.location ?? data.venue ?? null,
          event_date: data.event_date ?? null,
          description: data.description ?? null,
          organizer_id: uid,
          status: 'active',
        })
        .select('*')
        .single();
      if (insertErr || !inserted) {
        return toApiResponse<Event>({ data: null, error: insertErr ?? { message: 'Event creation failed' } });
      }

      let bannerUrl: string | null = null;
      if (data.banner_image_file) {
        bannerUrl = await uploadEventBanner(supabase, inserted.id, data.banner_image_file);
        if (bannerUrl) {
          await supabase.from('events').update({ banner_image: bannerUrl }).eq('id', inserted.id);
        }
      }

      return toApiResponse({
        data: { ...mapEventRow(inserted), banner_image: bannerUrl, player_count: 0 },
        error: null,
      });
    })();
  },

  registrations(eventId: string): Promise<ApiResponse<Registration[]>> {
    return fetchRegistrationsForEvent(createClient(), eventId);
  },

  updateRegistrationStatus(
    registrationId: string,
    status: 'approved' | 'rejected' | 'pending',
    eventId: string,
  ): Promise<ApiResponse<void>> {
    return (async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from('registrations')
        .update({ status })
        .eq('id', registrationId)
        .eq('event_id', eventId);
      return toApiResponse<void>({ data: undefined, error });
    })();
  },

  markAttendance(registrationId: string, eventId: string): Promise<ApiResponse<void>> {
    return (async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from('registrations')
        .update({ attendance: true })
        .eq('id', registrationId)
        .eq('event_id', eventId);
      return toApiResponse<void>({ data: undefined, error });
    })();
  },

  eventBatches(eventId: string): Promise<ApiResponse<Batch[]>> {
    return (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('batches')
        .select('*, player_count')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (error) return toApiResponse<Batch[]>({ data: null, error });
      return toApiResponse({ data: await attachRefereeNames(supabase, data ?? []), error: null });
    })();
  },

  batchDetail(batchId: string): Promise<ApiResponse<Batch>> {
    return (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('batches')
        .select('*, player_count')
        .eq('id', batchId)
        .maybeSingle();
      if (error) return toApiResponse<Batch>({ data: null, error });
      if (!data) return toApiResponse<Batch>({ data: null, error: { message: 'Batch not found' } });

      const [withReferee] = await attachRefereeNames(supabase, [data]);
      return toApiResponse({ data: withReferee, error: null });
    })();
  },

  /** create_batch_with_bracket(p_event_id, p_batch_name, p_player_ids,
   *  p_category, p_referee_id) -- category_label folds into p_category
   *  (mobile's own documented fix for a client/server key-mismatch bug;
   *  there is no separate category_label RPC parameter). */
  createBatch(data: {
    event_id: string;
    batch_name: string;
    category?: string;
    category_label?: string;
    player_ids: string[];
    referee_id?: string | null;
  }): Promise<ApiResponse<unknown>> {
    return (async () => {
      const supabase = createClient();
      const category = data.category ?? data.category_label ?? null;
      const { data: result, error } = await supabase.rpc('create_batch_with_bracket', {
        p_event_id: data.event_id,
        p_batch_name: data.batch_name,
        p_player_ids: data.player_ids,
        p_category: category,
        p_referee_id: data.referee_id ?? null,
      });
      if (error) return toApiResponse<unknown>({ data: null, error });
      return toApiResponse({ data: result, error: null });
    })();
  },

  batchPlayers(batchId: string): Promise<ApiResponse<BatchPlayer[]>> {
    return (async () => {
      const supabase = createClient();
      const { data: links, error } = await supabase.from('batch_players').select('player_id').eq('batch_id', batchId);
      if (error) return toApiResponse<BatchPlayer[]>({ data: null, error });

      const playerIds = (links ?? []).map((l) => l.player_id);
      if (!playerIds.length) return toApiResponse<BatchPlayer[]>({ data: [], error: null });

      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, name, email, phone')
        .in('id', playerIds);
      if (profErr) return toApiResponse<BatchPlayer[]>({ data: null, error: profErr });

      return toApiResponse({
        data: (profiles ?? []).map((p) => ({ player_id: p.id, name: p.name, email: p.email, phone: p.phone })),
        error: null,
      });
    })();
  },

  /** batches_update_owner is row-level + column-agnostic (verified against
   *  the migration, not assumed): an owner may update any column of their
   *  own batch, referee_id included -- no separate trigger constrains it on
   *  a raw UPDATE. */
  assignReferee(batchId: string, refereeId: string | null): Promise<ApiResponse<void>> {
    return (async () => {
      const supabase = createClient();
      const { error } = await supabase.from('batches').update({ referee_id: refereeId }).eq('id', batchId);
      return toApiResponse<void>({ data: undefined, error });
    })();
  },

  referees(): Promise<ApiResponse<Referee[]>> {
    return (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, phone, state, district')
        .eq('role', 'referee')
        .order('name', { ascending: true });
      if (error) return toApiResponse<Referee[]>({ data: null, error });
      return toApiResponse({
        data: (data ?? []).map((r) => ({
          referee_id: r.id,
          name: r.name,
          email: r.email,
          phone: r.phone,
          state: r.state,
          district: r.district,
        })),
        error: null,
      });
    })();
  },

  /** Deliberately deferred, per the M5 contract's own decision (ranking rule
   *  and generation timing remain open product calls). No network call at
   *  all -- ported as-is, same message. */
  generateCertificates(): Promise<ApiResponse<unknown>> {
    return Promise.resolve({
      success: false,
      message: 'Certificate generation is not yet available on the new backend — pending a product decision.',
    });
  },

  getCertificates(eventId: string, batchId?: string): Promise<ApiResponse<Record<string, unknown>[]>> {
    return (async () => {
      const supabase = createClient();
      let query = supabase.from('certificates').select('*').eq('event_id', eventId);
      if (batchId) query = query.eq('batch_id', batchId);

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) return toApiResponse<Record<string, unknown>[]>({ data: null, error });

      const rows = data ?? [];
      const playerIds = Array.from(new Set(rows.map((c) => c.player_id).filter(Boolean)));
      const { data: profiles } = playerIds.length
        ? await supabase.from('profiles').select('id, name').in('id', playerIds)
        : { data: [] as Record<string, unknown>[] };
      const nameById = new Map((profiles ?? []).map((p) => [p.id, p.name]));

      return toApiResponse({
        data: rows.map((c) => ({
          ...c,
          cert_id: c.id,
          certificate_id: c.id,
          player_name: c.player_name || nameById.get(c.player_id) || `Player #${c.player_id}`,
        })),
        error: null,
      });
    })();
  },

  /** player_id here is the real uuid (flows into createBatch's player_ids ->
   *  create_batch_with_bracket's uuid[] parameter) -- deliberately NOT
   *  profiles.legacy_id, unlike registrations() above. */
  getFilteredPlayers(
    eventId: string,
    filters: { event_category?: string; age_category?: string; weight_category?: string; seni_type?: string },
  ): Promise<ApiResponse<{ players: FilteredPlayer[]; total: number; byes_required: number }>> {
    return (async () => {
      const supabase = createClient();
      let query = supabase
        .from('registrations')
        .select('id, player_id, event_category, age_category, weight_category, seni_category, status')
        .eq('event_id', eventId);
      if (filters.event_category) query = query.eq('event_category', filters.event_category);
      if (filters.age_category) query = query.eq('age_category', filters.age_category);
      if (filters.weight_category) query = query.eq('weight_category', filters.weight_category);
      if (filters.seni_type) query = query.eq('seni_category', filters.seni_type);

      const { data: regs, error } = await query;
      if (error)
        return toApiResponse<{ players: FilteredPlayer[]; total: number; byes_required: number }>({
          data: null,
          error,
        });

      const rows = regs ?? [];
      const playerIds = Array.from(new Set(rows.map((r) => r.player_id).filter(Boolean)));
      const { data: profiles } = playerIds.length
        ? await supabase.from('profiles').select('id, name, email, phone, state, district').in('id', playerIds)
        : { data: [] as Record<string, unknown>[] };
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

      const players: FilteredPlayer[] = rows.map((r) => {
        const p = byId.get(r.player_id);
        return {
          registration_id: r.id,
          player_id: r.player_id,
          player_name: (p?.name as string) ?? 'Unknown',
          email: p?.email as string | undefined,
          phone: p?.phone as string | undefined,
          state: p?.state as string | undefined,
          district: p?.district as string | undefined,
          event_category: r.event_category,
          age_category: r.age_category,
          weight_category: r.weight_category,
          seni_category: r.seni_category,
          status: r.status || 'pending',
        };
      });

      const n = players.length;
      const nextPow2 = n > 0 ? Math.pow(2, Math.ceil(Math.log2(n))) : 0;
      const byesRequired = nextPow2 - n;

      return toApiResponse({ data: { players, total: players.length, byes_required: byesRequired }, error: null });
    })();
  },

  getAttendanceLists(eventId: string): Promise<ApiResponse<AttendanceList[]>> {
    return (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('attendance_lists')
        .select('*, scan_count')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (error) return toApiResponse<AttendanceList[]>({ data: null, error });
      return toApiResponse({ data: (data ?? []).map((l) => ({ ...l, list_id: l.id })), error: null });
    })();
  },

  createAttendanceList(data: {
    event_id: string;
    purpose: string;
    mode: string;
    unique_only: boolean;
  }): Promise<ApiResponse<{ list_id: string }>> {
    return (async () => {
      const supabase = createClient();
      const uid = await getUid(supabase);
      const { data: inserted, error } = await supabase
        .from('attendance_lists')
        .insert({
          event_id: data.event_id,
          organizer_id: uid,
          purpose: data.purpose || data.mode,
          mode: data.mode,
          unique_only: data.unique_only !== false,
        })
        .select('id')
        .single();
      if (error || !inserted) {
        return toApiResponse<{ list_id: string }>({ data: null, error: error ?? { message: 'Failed to create list' } });
      }
      return toApiResponse({ data: { list_id: inserted.id }, error: null });
    })();
  },

  batchMatches(batchId: string): Promise<ApiResponse<OrganizerMatch[]>> {
    return (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('batch_id', batchId)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true });
      if (error) return toApiResponse<OrganizerMatch[]>({ data: null, error });

      const rows = data ?? [];
      const nameById = await resolvePlayerNames(
        supabase,
        rows.flatMap((m) => [m.player1_id, m.player2_id]),
      );

      return toApiResponse({
        data: rows.map((m) => ({
          ...m,
          match_id: m.id,
          player1_name: m.player1_id ? (nameById.get(m.player1_id) ?? 'TBD') : 'TBD',
          player2_name: m.player2_id ? (nameById.get(m.player2_id) ?? 'TBD') : 'TBD',
        })),
        error: null,
      });
    })();
  },

  /** RLS re-derives batch ownership from the match row itself; batchId isn't
   *  needed by the update, kept on the signature for call-site parity. */
  startConducting(batchId: string, matchId: string): Promise<ApiResponse<{ match_id: string; status: string }>> {
    return (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('matches')
        .update({ status: 'in_progress' })
        .eq('id', matchId)
        .select('id, status')
        .maybeSingle();
      if (error) return toApiResponse<{ match_id: string; status: string }>({ data: null, error });
      if (!data)
        return toApiResponse<{ match_id: string; status: string }>({
          data: null,
          error: { message: 'Match not found or not authorized' },
        });
      return toApiResponse({ data: { match_id: data.id, status: data.status }, error: null });
    })();
  },

  recordMatchResult(
    batchId: string,
    matchId: string,
    data: { winner_id: string; player1_score?: number; player2_score?: number },
  ): Promise<ApiResponse<unknown>> {
    return (async () => {
      const supabase = createClient();
      const { data: result, error } = await supabase.rpc('record_match_result', {
        p_match_id: matchId,
        p_winner_id: data.winner_id,
        p_score1: data.player1_score ?? null,
        p_score2: data.player2_score ?? null,
      });
      if (error) return toApiResponse<unknown>({ data: null, error });
      return toApiResponse({ data: result, error: null });
    })();
  },

  reopenMatch(batchId: string, matchId: string): Promise<ApiResponse<unknown>> {
    return (async () => {
      const supabase = createClient();
      const { data: result, error } = await supabase.rpc('reopen_match', { p_match_id: matchId });
      if (error) return toApiResponse<unknown>({ data: null, error });
      return toApiResponse({ data: result, error: null });
    })();
  },

  forceAdvanceMatch(batchId: string, matchId: string, winnerId: string): Promise<ApiResponse<unknown>> {
    return (async () => {
      const supabase = createClient();
      const { data: result, error } = await supabase.rpc('force_advance_match', {
        p_match_id: matchId,
        p_winner_id: winnerId,
      });
      if (error) return toApiResponse<unknown>({ data: null, error });
      return toApiResponse({ data: result, error: null });
    })();
  },

  replaceParticipant(
    batchId: string,
    matchId: string,
    oldPlayerId: string,
    newPlayerId: string,
  ): Promise<ApiResponse<unknown>> {
    return (async () => {
      const supabase = createClient();
      const { data: result, error } = await supabase.rpc('replace_participant', {
        p_match_id: matchId,
        p_old_player_id: oldPlayerId,
        p_new_player_id: newPlayerId,
      });
      if (error) return toApiResponse<unknown>({ data: null, error });
      return toApiResponse({ data: result, error: null });
    })();
  },

  /** Mints a short-lived cert-view link via the Edge Function -- same call
   *  as player.api.ts's mintCertificateUrl, already inside "Supabase
   *  itself" per the contract's Non-goals section. */
  async mintCertificateUrl(certId: string): Promise<ApiResponse<{ url: string }>> {
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke('cert-view', { body: { cert_id: certId } });
    if (!error && data?.success && data?.data?.url) {
      return { success: true, data: { url: data.data.url as string } };
    }
    let message = 'Could not generate a certificate link';
    if (data && typeof data.message === 'string') message = data.message;
    else if (error) message = (error as { message?: string }).message || message;
    return { success: false, message };
  },

  /** Resolves a scanned QR string to a player, scoped to eventId (the caller
   *  must own that event). Backed by find_player_by_qr, which since the
   *  2026-09-05 qr_resolve_by_uuid migration tries a real profiles.id uuid
   *  form first, then the legacy PLAYER:<legacy_id> form -- both are opaque
   *  to this function, which just forwards qrData and returns whatever the
   *  RPC resolves. Returned player_id (legacy_id) is null when resolved via
   *  the uuid branch -- callers must key off `id` (the real uuid), never
   *  player_id, for any further lookup (see scanAttendance below for why). */
  async getPlayerByQR(
    qrData: string,
    eventId: string,
  ): Promise<
    ApiResponse<{ id: string; player_id: number | null; player_name: string; state?: string; district?: string }>
  > {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('find_player_by_qr', { p_qr_data: qrData, p_event_id: eventId });
    if (error)
      return toApiResponse<{
        id: string;
        player_id: number | null;
        player_name: string;
        state?: string;
        district?: string;
      }>({ data: null, error });
    if (!data?.found) return { success: false, message: 'Player not found' };
    return { success: true, data };
  },

  /** Scans a QR code and marks attendance for the resolved player's
   *  registration on eventId.
   *
   *  ADAPTED, not a byte-port of mobile's scanAttendance: mobile matches the
   *  resolved player to a registration by comparing legacy_id values
   *  (`regs.data.find(r => r.player_id === playerLegacyId)`). legacy_id is
   *  NULL for every self-signup player, and in JavaScript `null === null` is
   *  true -- so that comparison would silently match ANY self-signup
   *  player's registration to ANY OTHER self-signup player being scanned,
   *  marking the wrong student present. This looks up the registration
   *  directly by the resolved player's real uuid instead, which is always
   *  present and unique regardless of legacy_id. This is a correctness fix
   *  surfaced while implementing the uuid QR fallback, not a redesign for
   *  its own sake -- the same latent bug exists in the mobile app today,
   *  flagged here rather than silently carried into a second codebase. */
  async scanAttendance(qrData: string, eventId: string): Promise<ApiResponse<void>> {
    const resolved = await this.getPlayerByQR(qrData, eventId);
    if (!resolved.success || !resolved.data) {
      return { success: false, message: resolved.message || 'Player not found' };
    }
    const playerUuid = resolved.data.id;

    const supabase = createClient();
    const { data: regRow, error: regErr } = await supabase
      .from('registrations')
      .select('id')
      .eq('event_id', eventId)
      .eq('player_id', playerUuid)
      .maybeSingle();
    if (regErr) return toApiResponse<void>({ data: undefined, error: regErr });
    if (!regRow) return { success: false, message: 'Player not registered for this event' };

    return this.markAttendance(regRow.id, eventId);
  },

  /** Records a QR scan against a specific attendance list. The RPC does all
   *  QR parsing and player resolution server-side (including the uuid
   *  fallback) and its own idempotent-insert dance for duplicate scans --
   *  this just forwards the raw scanned string and translates the RPC's
   *  {found, recorded, message, player_id, player_name} shape into
   *  ApiResponse, same translation as mobile's scanForList. player_id in
   *  the response is legacy_id and may be null (uuid-resolved player); the
   *  actual dedup key attendance_scans uses is the real uuid, set
   *  server-side by the RPC, never touched here. */
  async scanForList(
    listId: string,
    qrData: string,
  ): Promise<ApiResponse<{ player_id: number | null; player_name: string }>> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('scan_for_list', { p_list_id: listId, p_qr_data: qrData });
    if (error) return toApiResponse<{ player_id: number | null; player_name: string }>({ data: null, error });
    if (!data?.found) return { success: false, message: 'Player not found' };
    if (!data.recorded) {
      return {
        success: false,
        message: data.message || 'Already marked present',
        data: { player_id: data.player_id, player_name: data.player_name },
      };
    }
    return { success: true, data: { player_id: data.player_id, player_name: data.player_name } };
  },

  /** Prior scans for a list, so reopening the scan page shows scans made in
   *  an earlier session, not just the current one. */
  getAttendanceListScans(
    listId: string,
  ): Promise<ApiResponse<{ id: string; player_name: string; scanned_at: string }[]>> {
    return (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('attendance_scans')
        .select('id, player_name, scanned_at')
        .eq('list_id', listId)
        .order('scanned_at', { ascending: false });
      if (error)
        return toApiResponse<{ id: string; player_name: string; scanned_at: string }[]>({ data: null, error });
      return toApiResponse({ data: data ?? [], error: null });
    })();
  },
};
