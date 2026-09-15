/**
 * Direct close port of sports-mobile-main/src/api/referee.api.ts, per
 * docs/M7_CONTRACT.md's "API layer: direct close port" section.
 *
 * All 7 mobile functions ported -- referee has no QR/camera screens at all
 * (RefereeIDCard's QR is display-only, same as player/organizer, and per
 * its own mobile comment is already documented as never resolving via
 * scan_for_list/find_player_by_qr's role='player' filter regardless), so
 * there's no scope-deferral question here the way organizer had one.
 *
 * `certification` is deliberately NOT ported into updateProfile's
 * passthrough whitelist: mobile's own file comments confirm it was never a
 * real profiles column, even in the original Firebase backend -- mobile's
 * edit form has always silently no-op'd on that field. Not replicating a
 * documented dead field, not a regression.
 *
 * ID types corrected the same way as organizer.api.ts: every *_id that is a
 * real Postgres uuid (matchId, winner_id) is typed `string` here, not
 * `number` -- see organizer.api.ts's own header comment for why this
 * matters (Phase 2 shipped a live bug from trusting the `number` type).
 */
import { createClient } from '../supabase/client';
import type { ApiResponse, RefereeProfile, RefereeDashboardData, RefereeMatch, Event } from '../types';

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

function mapRefereeRow(row: Record<string, unknown> | null): RefereeProfile | null {
  if (!row) return null;
  const { legacy_id, ...rest } = row;
  return { ...rest, referee_id: legacy_id } as RefereeProfile;
}

async function resolvePhoto(
  supabase: ReturnType<typeof createClient>,
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from('profile-photos').createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** certification intentionally excluded -- see file header. */
function sanitizeProfileUpdate(data: Partial<RefereeProfile>): Record<string, unknown> {
  const src = data as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const passthrough = ['name', 'phone', 'state', 'district', 'photo', 'dob', 'blood_group', 'emergency_contact', 'gender'];
  for (const key of passthrough) {
    if (src[key] !== undefined) out[key] = src[key];
  }
  return out;
}

export const refereeApi = {
  dashboard(): Promise<ApiResponse<RefereeDashboardData>> {
    return (async () => {
      const supabase = createClient();
      const uid = await getUid(supabase);

      const [profileRes, batchRowsRes, matchesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
        supabase.from('batches').select('event_id').eq('referee_id', uid),
        // matches_select_referee already scopes this to the referee's own
        // assigned batch(es) -- no extra filter needed.
        supabase.from('matches').select('*'),
      ]);

      if (profileRes.error || !profileRes.data) {
        return toApiResponse<RefereeDashboardData>({
          data: null,
          error: profileRes.error ?? { message: 'Profile not found' },
        });
      }

      const photo = await resolvePhoto(supabase, profileRes.data.photo);

      const eventIds = Array.from(
        new Set((batchRowsRes.data ?? []).map((b) => b.event_id).filter((id): id is string => !!id)),
      );
      const { data: assignedEventsRaw } = eventIds.length
        ? await supabase.from('events').select('*').in('id', eventIds)
        : { data: [] as Record<string, unknown>[] };
      const assignedEvents: Event[] = (assignedEventsRaw ?? []).map(
        (e) => ({ ...e, event_id: e.id }) as unknown as Event,
      );

      const matches = matchesRes.data ?? [];
      const todayKey = new Date().toDateString();
      const matchesToday = matches.filter(
        (m) => m.scheduled_at && new Date(m.scheduled_at).toDateString() === todayKey,
      ).length;
      const upcoming = matches.filter((m) => m.status !== 'completed').length;

      const referee = mapRefereeRow(profileRes.data as Record<string, unknown>)!;
      return toApiResponse({
        data: {
          referee: { ...referee, photo },
          stats: {
            events_assigned: eventIds.length,
            matches_total: matches.length,
            matches_today: matchesToday,
            upcoming,
          },
          assigned_events: assignedEvents,
        },
        error: null,
      });
    })();
  },

  profile(): Promise<ApiResponse<RefereeProfile>> {
    return (async () => {
      const supabase = createClient();
      const uid = await getUid(supabase);
      const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
      if (error || !data)
        return toApiResponse<RefereeProfile>({ data: null, error: error ?? { message: 'Profile not found' } });

      const photo = await resolvePhoto(supabase, data.photo);
      const referee = mapRefereeRow(data as Record<string, unknown>)!;
      return toApiResponse({ data: { ...referee, photo }, error: null });
    })();
  },

  updateProfile(data: Partial<RefereeProfile>): Promise<ApiResponse<RefereeProfile>> {
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
      if (error) return toApiResponse<RefereeProfile>({ data: null, error });

      const photo = await resolvePhoto(supabase, updated?.photo);
      const referee = updated ? mapRefereeRow(updated as Record<string, unknown>) : null;
      return toApiResponse({ data: referee ? { ...referee, photo } : null, error: null });
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

  /** RLS (matches_select_referee) already scopes this to the referee's own
   *  assigned batch. Resolves player1_name/player2_name via a batched
   *  profiles lookup, falling back to 'TBD' -- matches mobile's own bugfix
   *  comment (the original rewrite returned bare uuids with nothing to
   *  display until this join was added). */
  matches(): Promise<ApiResponse<RefereeMatch[]>> {
    return (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from('matches').select('*').order('scheduled_at', { ascending: true });
      if (error) return toApiResponse<RefereeMatch[]>({ data: null, error });
      const rows = data ?? [];

      const playerIds = Array.from(
        new Set(rows.flatMap((m) => [m.player1_id, m.player2_id]).filter((id): id is string => !!id)),
      );
      const nameById = new Map<string, string>();
      if (playerIds.length) {
        const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', playerIds);
        (profiles ?? []).forEach((p) => nameById.set(p.id, p.name));
      }

      return toApiResponse({
        data: rows.map(
          (m) =>
            ({
              ...m,
              match_id: m.id,
              player1_name: m.player1_id ? (nameById.get(m.player1_id) ?? 'TBD') : 'TBD',
              player2_name: m.player2_id ? (nameById.get(m.player2_id) ?? 'TBD') : 'TBD',
            }) as RefereeMatch,
        ),
        error: null,
      });
    })();
  },

  /** record_match_result RPC. p_decided_by is omitted deliberately -- the
   *  RPC forces 'points' for a referee caller regardless of what's passed
   *  (20260826130200_match_result_rpcs.sql), so there's nothing meaningful
   *  to send there. */
  recordResult(
    matchId: string,
    data: { winner_id: string; player1_score: number; player2_score: number },
  ): Promise<ApiResponse<RefereeMatch>> {
    return (async () => {
      const supabase = createClient();
      const { error: rpcErr } = await supabase.rpc('record_match_result', {
        p_match_id: matchId,
        p_winner_id: data.winner_id,
        p_score1: data.player1_score,
        p_score2: data.player2_score,
      });
      if (rpcErr) return toApiResponse<RefereeMatch>({ data: null, error: rpcErr });

      // record_match_result returns {result_id, match_id, winner_id,
      // next_match_id}, not a full match row -- re-read so the caller gets
      // back something shaped like the RefereeMatch it expects.
      const { data: match, error: readErr } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .maybeSingle();
      if (readErr || !match) return toApiResponse<RefereeMatch>({ data: null, error: readErr });

      return toApiResponse({ data: { ...match, match_id: match.id } as RefereeMatch, error: null });
    })();
  },

  /** Assembled client-side from the referee's own batches
   *  (batches_select_referee scopes that read) -- events_select_authenticated
   *  grants every role read access to every event, so there's no RLS
   *  narrowing to lean on here for "events I'm assigned to" specifically. */
  events(): Promise<ApiResponse<Event[]>> {
    return (async () => {
      const supabase = createClient();
      const uid = await getUid(supabase);
      const { data: batchRows, error: batchErr } = await supabase
        .from('batches')
        .select('event_id')
        .eq('referee_id', uid);
      if (batchErr) return toApiResponse<Event[]>({ data: null, error: batchErr });

      const eventIds = Array.from(
        new Set((batchRows ?? []).map((b) => b.event_id).filter((id): id is string => !!id)),
      );
      if (!eventIds.length) return toApiResponse<Event[]>({ data: [], error: null });

      const { data, error } = await supabase.from('events').select('*').in('id', eventIds);
      if (error) return toApiResponse<Event[]>({ data: null, error });
      return toApiResponse({ data: (data ?? []).map((e) => ({ ...e, event_id: e.id }) as unknown as Event), error: null });
    })();
  },
};
