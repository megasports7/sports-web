/**
 * Direct close port of sports-mobile-main/src/api/player.api.ts, per
 * docs/M7_CONTRACT.md's "API layer: direct close port" section. Same
 * function names, same RPC calls, same {success, data, message} envelope,
 * same business logic. The only real adaptations are browser-native:
 * `createClient()` (cookie-backed) in place of mobile's SecureStore-backed
 * client, and a real `File` for photo upload in place of mobile's
 * FormData + expo-file-system base64 workaround (genuinely simpler here --
 * storage-js accepts a File directly).
 */
import { createClient } from '../supabase/client';
import type {
  ApiResponse,
  Player,
  PlayerDashboardData,
  CertificateCounts,
  Event,
  Match,
  Certificate,
  Registration,
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

function mapPlayerRow(row: Record<string, unknown> | null): Player | null {
  if (!row) return null;
  const { legacy_id, name, ...rest } = row;
  return { ...rest, player_id: legacy_id, player_name: name } as Player;
}

/** profile-photos is a private bucket (self+admin read only) -- what's
 *  stored in profiles.photo is a storage PATH, not a usable URL, so every
 *  read that surfaces it has to resolve a fresh signed URL first. */
async function resolvePhoto(
  supabase: ReturnType<typeof createClient>,
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from('profile-photos').createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** Mirrors mobile's allowlist exactly -- player_id/password/id_number/
 *  joined_on were never accepted server-side either. */
function sanitizeProfileUpdate(data: Partial<Player>): Record<string, unknown> {
  const src = data as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const passthrough = [
    'phone',
    'state',
    'district',
    'photo',
    'dob',
    'blood_group',
    'emergency_contact',
    'sport',
    'gender',
    'father_name',
  ];
  for (const key of passthrough) {
    if (src[key] !== undefined) out[key] = src[key];
  }
  if (src.player_name !== undefined) out.name = src.player_name;
  return out;
}

async function callRegisterForEvent(
  supabase: ReturnType<typeof createClient>,
  params: {
    event_id: string;
    event_category?: string;
    age_category?: string;
    weight_category?: string;
    seni_category?: string;
  },
): Promise<ApiResponse<Registration>> {
  const { data, error } = await supabase.rpc('register_for_event', {
    p_event_id: params.event_id,
    p_event_category: params.event_category ?? null,
    p_age_category: params.age_category ?? null,
    p_weight_category: params.weight_category ?? null,
    p_seni_category: params.seni_category ?? null,
  });
  if (error) return toApiResponse<Registration>({ data: null, error });

  const result = data as { registration_id: string; created: boolean; message: string } | null;
  return toApiResponse({
    data: {
      registration_id: result?.registration_id as string,
      event_id: params.event_id,
      status: result?.created ? 'pending' : undefined,
      event_category: params.event_category,
      age_category: params.age_category,
      weight_category: params.weight_category,
      seni_category: params.seni_category,
    } as Registration,
    error: null,
  });
}

export const playerApi = {
  dashboard(): Promise<ApiResponse<PlayerDashboardData>> {
    return (async () => {
      const supabase = createClient();
      const uid = await getUid(supabase);

      const [profileRes, regsCountRes, certsRes, matchesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
        supabase.from('registrations').select('id', { count: 'exact', head: true }).eq('player_id', uid),
        supabase.from('certificates').select('position').eq('player_id', uid),
        supabase
          .from('matches')
          // events(event_name): matches has no event_name/opponent_name column
          // of its own (checked the schema directly -- see matches() below for
          // the same fix) -- event_id is a direct FK to events, and
          // events_select_authenticated already lets any signed-in player read
          // it, so this embed resolves without a second round trip.
          .select('*, events(event_name)')
          .or(`player1_id.eq.${uid},player2_id.eq.${uid}`)
          .neq('status', 'completed')
          .order('scheduled_at', { ascending: true })
          .limit(5),
      ]);

      if (profileRes.error || !profileRes.data) {
        return toApiResponse<PlayerDashboardData>({
          data: null,
          error: profileRes.error ?? { message: 'Profile not found' },
        });
      }

      const photo = await resolvePhoto(supabase, profileRes.data.photo);

      const counts: CertificateCounts = { gold: 0, silver: 0, bronze: 0, participation: 0 };
      for (const c of certsRes.data ?? []) {
        const p = (c as { position?: string }).position as keyof CertificateCounts;
        if (p && p in counts) counts[p] += 1;
      }
      const totalCerts = counts.gold + counts.silver + counts.bronze + counts.participation;

      const matches = matchesRes.data ?? [];
      const opponentIds = Array.from(
        new Set(
          matches
            .map((m: Record<string, unknown>) => (m.player1_id === uid ? m.player2_id : m.player1_id))
            .filter((id): id is string => !!id),
        ),
      );
      const { data: opponents } = opponentIds.length
        ? await supabase.from('profiles').select('id, name').in('id', opponentIds)
        : { data: [] as { id: string; name: string }[] };
      const nameById = new Map((opponents ?? []).map((o) => [o.id, o.name]));

      const upcomingMatches: Match[] = matches.map((m: Record<string, unknown>) => {
        const opponentId = (m.player1_id === uid ? m.player2_id : m.player1_id) as string | undefined;
        const eventRel = m.events as { event_name?: string } | null | undefined;
        return {
          ...m,
          match_id: m.id,
          opponent_id: opponentId,
          opponent_name: opponentId ? nameById.get(opponentId) : undefined,
          event_name: eventRel?.event_name,
        } as Match;
      });

      const player = mapPlayerRow(profileRes.data as Record<string, unknown>)!;
      return toApiResponse({
        data: {
          player: { ...player, photo },
          stats: {
            events_count: regsCountRes.count ?? 0,
            certificates: counts,
            total_certs: totalCerts,
          },
          upcoming_matches: upcomingMatches,
        },
        error: null,
      });
    })();
  },

  profile(): Promise<ApiResponse<Player>> {
    return (async () => {
      const supabase = createClient();
      const uid = await getUid(supabase);
      const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
      if (error || !data)
        return toApiResponse<Player>({ data: null, error: error ?? { message: 'Profile not found' } });

      const photo = await resolvePhoto(supabase, data.photo);
      const player = mapPlayerRow(data as Record<string, unknown>)!;
      return toApiResponse({ data: { ...player, photo }, error: null });
    })();
  },

  updateProfile(data: Partial<Player>): Promise<ApiResponse<Player>> {
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
      if (error) return toApiResponse<Player>({ data: null, error });

      const photo = await resolvePhoto(supabase, updated?.photo);
      const player = updated ? mapPlayerRow(updated as Record<string, unknown>) : null;
      return toApiResponse({ data: player ? { ...player, photo } : null, error: null });
    })();
  },

  /** Web-native: a real File, no FormData/base64 workaround. Path convention
   *  (`${uid}/photo.<ext>`) matches profile_photos_insert_own's RLS check
   *  (first path segment must be the caller's own uid) exactly as mobile. */
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
      const [eventsRes, regsRes] = await Promise.all([
        supabase.from('events').select('*').order('event_date', { ascending: true }),
        supabase
          .from('registrations')
          .select('id, event_id, status, event_category, age_category, weight_category')
          .eq('player_id', uid),
      ]);
      if (eventsRes.error) return toApiResponse<Event[]>({ data: null, error: eventsRes.error });

      const regByEvent = new Map<string, Record<string, unknown>>();
      if (!regsRes.error) {
        for (const r of regsRes.data ?? []) regByEvent.set((r as { event_id: string }).event_id, r);
      }

      const mapped = (eventsRes.data ?? []).map((e: Record<string, unknown>) => {
        const reg = regByEvent.get(e.id as string);
        return {
          ...e,
          event_id: e.id,
          registration_id: reg?.id ?? null,
          registration_status: reg?.status ?? null,
          event_category: reg?.event_category ?? null,
          age_category: reg?.age_category ?? null,
          weight_category: reg?.weight_category ?? null,
        } as Event;
      });
      return toApiResponse({ data: mapped, error: null });
    })();
  },

  registerForEvent(eventId: string): Promise<ApiResponse<Registration>> {
    return callRegisterForEvent(createClient(), { event_id: eventId });
  },

  registerForEventWithCategory(data: {
    event_id: string;
    event_category: 'TANDING' | 'SENI';
    age_category?: string;
    weight_category?: string;
    seni_category?: string;
  }): Promise<ApiResponse<Registration>> {
    return callRegisterForEvent(createClient(), data);
  },

  /** A real, previously-invisible gap found while wiring this page's redesign,
   *  not a byte-port of a byte-port: mobile's own `matches()` has the exact
   *  same `select('*')`, and `matches` genuinely has no `event_name` or
   *  `opponent_name` column at all (checked
   *  sports-mobile-main/supabase/migrations/20260825120500_matches.sql
   *  directly) -- both fields were silently `undefined` on every row, on
   *  mobile and here, before this fix. `batches` has no player-facing SELECT
   *  policy (only owner/referee/admin), so the reliable path to a real event
   *  name is the direct `event_id` FK to `events`, which
   *  `events_select_authenticated` already lets any player read -- same fix
   *  already applied to dashboard()'s upcoming_matches above. Opponent name
   *  resolves via the identical batch-profile-lookup dashboard() already
   *  proved. Still open, deliberately not touched here: `player1_score`/
   *  `player2_score` are typed on `Match` but have no backing column either
   *  (scores live on `match_results.score_side1/2`, joined via
   *  `matches.result_id` -- see M7_CONTRACT.md Phase 4's notes) -- a related
   *  but separate gap, flagged rather than folded into this fix. */
  matches(): Promise<ApiResponse<Match[]>> {
    return (async () => {
      const supabase = createClient();
      const uid = await getUid(supabase);
      const { data, error } = await supabase
        .from('matches')
        .select('*, events(event_name)')
        .order('scheduled_at', { ascending: true });
      if (error) return toApiResponse<Match[]>({ data: null, error });

      const rows = data ?? [];
      const opponentIds = Array.from(
        new Set(
          rows
            .map((m: Record<string, unknown>) => (m.player1_id === uid ? m.player2_id : m.player1_id))
            .filter((id): id is string => !!id),
        ),
      );
      const { data: opponents } = opponentIds.length
        ? await supabase.from('profiles').select('id, name').in('id', opponentIds)
        : { data: [] as { id: string; name: string }[] };
      const nameById = new Map((opponents ?? []).map((o) => [o.id, o.name]));

      return toApiResponse({
        data: rows.map((m: Record<string, unknown>) => {
          const opponentId = (m.player1_id === uid ? m.player2_id : m.player1_id) as string | undefined;
          const eventRel = m.events as { event_name?: string } | null | undefined;
          return {
            ...m,
            match_id: m.id,
            opponent_id: opponentId,
            opponent_name: opponentId ? nameById.get(opponentId) : undefined,
            event_name: eventRel?.event_name,
          } as Match;
        }),
        error: null,
      });
    })();
  },

  certificates(): Promise<ApiResponse<Certificate[]>> {
    return (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) return toApiResponse<Certificate[]>({ data: null, error });
      return toApiResponse({
        data: (data ?? []).map(
          (c: Record<string, unknown>) => ({ ...c, certificate_id: c.id, level: c.position }) as Certificate,
        ),
        error: null,
      });
    })();
  },

  /** Mints a short-lived cert-view link via the Edge Function -- same call
   *  mobile's PlayerCertificates.tsx makes, already inside "Supabase itself"
   *  per the contract's Non-goals section. */
  async mintCertificateUrl(certId: string): Promise<ApiResponse<{ url: string }>> {
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke('cert-view', {
      body: { cert_id: certId },
    });
    if (!error && data?.success && data?.data?.url) {
      return { success: true, data: { url: data.data.url as string } };
    }
    let message = 'Could not generate a certificate link';
    if (data && typeof data.message === 'string') message = data.message;
    else if (error) message = (error as { message?: string }).message || message;
    return { success: false, message };
  },
};
