/**
 * Direct close port of sports-mobile-main/src/api/associate.api.ts, per
 * docs/M7_CONTRACT.md's "API layer: direct close port" section.
 *
 * getPlayers/markAttendance/getAttendance are ported UNCHANGED -- mobile's
 * own file already carries dated "BUG FIX (2026-09-05)" comments fixing the
 * exact legacy_id-null-collision pattern this project has now found (and
 * had to fix itself) in the QR ID-card encoding, scanAttendance, and the
 * admin panel: markAttendance already takes the real profiles.id uuid, not
 * legacy_id, and AssociatePlayerRow already carries `id` alongside the
 * display-only `player_id`. Verified by reading the current mobile source,
 * not assumed from history -- there is nothing left to fix here.
 *
 * profile()/updateProfile()/uploadPhoto() are NEW -- mobile has no
 * associate-specific equivalent at all; AssociateTabs.tsx literally reuses
 * OrganizerProfile as its "Profile" tab (a UI-layer shortcut, not a
 * deliberate design choice -- an associate's row would show organizer-only
 * ID-card fields like id_number/id_valid_until it has no real use for).
 * Written here the same shape as every other role's own profile trio
 * (player/organizer/referee.api.ts), mapped onto a proper `Associate` type
 * instead, matching this codebase's actual convention rather than the
 * mobile screen's shortcut.
 *
 * getAttendance is kept even though mobile's own comment notes no screen
 * calls it today -- its own header frames it as a deliberate, designed
 * utility (matching getPlayers' response shape on purpose), not orphaned
 * dead code the way getUser()/eventRegistrations() were -- so it's ported,
 * not excluded, on the same YAGNI reasoning applied elsewhere.
 *
 * "Scan QR" is NOT ported: AssociateDashboard.tsx's button navigates to
 * `ScanAttendanceAssociate`, a screen name with zero registrations anywhere
 * in the mobile source (grepped) -- a dead button in the shipped app, not a
 * deferred-but-real feature the way organizer's QR screens were.
 */
import { createClient } from '../supabase/client';
import type { ApiResponse, Associate, AssociatePlayer } from '../types';

type AssociateRoster = { players: AssociatePlayer[]; total: number; present: number; absent: number };
type AssociateAttendance = AssociateRoster & { date: string };

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

function mapAssociateRow(row: Record<string, unknown> | null): Associate | null {
  if (!row) return null;
  const { legacy_id, ...rest } = row;
  return { ...rest, associate_id: legacy_id } as Associate;
}

async function resolvePhoto(
  supabase: ReturnType<typeof createClient>,
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from('profile-photos').createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

function sanitizeProfileUpdate(data: Partial<Associate>): Record<string, unknown> {
  const src = data as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const passthrough = ['name', 'phone', 'state', 'district', 'photo'];
  for (const key of passthrough) {
    if (src[key] !== undefined) out[key] = src[key];
  }
  return out;
}

/** legacy_id -> player_id, name -> player_name, plus the present/absent
 *  pair the roster UI keys off. `row` may be null (a mark whose player
 *  profile didn't resolve under RLS -- see getAttendance below). */
function mapAssociatePlayerRow(
  row: Record<string, unknown> | null | undefined,
  present: boolean,
  marked_at?: string,
): AssociatePlayer {
  return {
    id: row?.id as string,
    player_id: (row?.legacy_id as number | null) ?? null,
    player_name: row?.name as string,
    email: row?.email as string,
    phone: row?.phone as string | null,
    sport: row?.sport as string | null,
    id_number: row?.id_number as string | null,
    district: row?.district as string | null,
    state: row?.state as string | null,
    present,
    absent: !present,
    marked_at,
  };
}

export const associateApi = {
  profile(): Promise<ApiResponse<Associate>> {
    return (async () => {
      const supabase = createClient();
      const uid = await getUid(supabase);
      const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
      if (error || !data)
        return toApiResponse<Associate>({ data: null, error: error ?? { message: 'Profile not found' } });

      const photo = await resolvePhoto(supabase, data.photo);
      const associate = mapAssociateRow(data as Record<string, unknown>)!;
      return toApiResponse({ data: { ...associate, photo }, error: null });
    })();
  },

  updateProfile(data: Partial<Associate>): Promise<ApiResponse<Associate>> {
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
      if (error) return toApiResponse<Associate>({ data: null, error });

      const photo = await resolvePhoto(supabase, updated?.photo);
      const associate = updated ? mapAssociateRow(updated as Record<string, unknown>) : null;
      return toApiResponse({ data: associate ? { ...associate, photo } : null, error: null });
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

  /** Roster for the associate's own district/state, with each player's
   *  present/absent status for `date` resolved from
   *  associate_attendance_marks. Scoping mirrors
   *  profiles_select_associate_scoped (role='player' rows in the caller's
   *  own district OR state, NULL-unsafe by construction -- an associate
   *  with no district/state set sees nobody, not everybody). `scope` picks
   *  which of the two this additionally narrows to -- a client-side filter
   *  can only narrow further than what RLS already permits, never broaden
   *  past it. */
  getPlayers(params: {
    scope?: 'district' | 'state';
    date?: string;
    search?: string;
  }): Promise<ApiResponse<AssociateRoster>> {
    return (async () => {
      const supabase = createClient();
      const uid = await getUid(supabase);

      const { data: me, error: meErr } = await supabase
        .from('profiles')
        .select('district, state')
        .eq('id', uid)
        .maybeSingle();
      if (meErr || !me) {
        return toApiResponse<AssociateRoster>({ data: null, error: meErr ?? { message: 'Associate profile not found' } });
      }

      let query = supabase.from('profiles').select('*').eq('role', 'player');
      query = params.scope === 'state' ? query.eq('state', me.state) : query.eq('district', me.district);

      const term = (params.search || '').trim().replace(/[,()*]/g, ' ').trim();
      if (term) {
        // PostgREST's .or() filter string uses `*` as its own wildcard token
        // -- the %-to-* conversion only happens inside the dedicated
        // .ilike()/.like() builder methods, never inside a raw .or() string.
        const pattern = `*${term}*`;
        query = query.or(
          `name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern},id_number.ilike.${pattern}`,
        );
      }

      const { data: players, error } = await query.order('name', { ascending: true });
      if (error) return toApiResponse<AssociateRoster>({ data: null, error });

      const presentByPlayer = new Map<string, boolean>();
      const { date } = params;
      if (date && players && players.length) {
        const { data: sheet } = await supabase
          .from('associate_attendance')
          .select('id')
          .eq('associate_id', uid)
          .eq('date', date)
          .maybeSingle();
        if (sheet) {
          const { data: marks } = await supabase
            .from('associate_attendance_marks')
            .select('player_id, present')
            .eq('associate_attendance_id', sheet.id);
          for (const m of marks ?? []) presentByPlayer.set(m.player_id, m.present);
        }
      }

      const mapped: AssociatePlayer[] = (players ?? []).map((p) =>
        mapAssociatePlayerRow(p as Record<string, unknown>, presentByPlayer.get(p.id) ?? false),
      );
      const presentCount = mapped.filter((p) => p.present).length;

      return toApiResponse<AssociateRoster>({
        data: { players: mapped, total: mapped.length, present: presentCount, absent: mapped.length - presentCount },
        error: null,
      });
    })();
  },

  /** Two upserts, both ON CONFLICT DO UPDATE -- first ensure today's sheet
   *  exists, then upsert the mark itself. `playerUuid` is the real
   *  profiles.id (see file header -- already fixed in mobile, ported as
   *  such). Existence+role check kept as defense-in-depth validation of the
   *  caller's input, same as mobile. */
  markAttendance(playerUuid: string, present: boolean, date: string): Promise<ApiResponse<void>> {
    return (async () => {
      const supabase = createClient();
      const uid = await getUid(supabase);

      const { data: player, error: findErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'player')
        .eq('id', playerUuid)
        .maybeSingle();
      if (findErr) return toApiResponse<void>({ data: null, error: findErr });
      if (!player) {
        return toApiResponse<void>({ data: null, error: { message: `No player found with id ${playerUuid}` } });
      }

      const { data: sheet, error: sheetErr } = await supabase
        .from('associate_attendance')
        .upsert({ associate_id: uid, date }, { onConflict: 'associate_id,date' })
        .select('id')
        .single();
      if (sheetErr) return toApiResponse<void>({ data: null, error: sheetErr });

      const { error: markErr } = await supabase.from('associate_attendance_marks').upsert(
        {
          associate_attendance_id: sheet.id,
          player_id: player.id,
          present,
          marked_at: new Date().toISOString(),
        },
        { onConflict: 'associate_attendance_id,player_id' },
      );
      if (markErr) return toApiResponse<void>({ data: null, error: markErr });

      return toApiResponse<void>({ data: undefined, error: null });
    })();
  },

  /** The caller's own marks for `date`, resolved back to each player's
   *  profile. Not wired to any screen yet, ported for parity with mobile
   *  regardless -- see file header. */
  getAttendance(date: string): Promise<ApiResponse<AssociateAttendance>> {
    return (async () => {
      const supabase = createClient();
      const uid = await getUid(supabase);

      const { data: sheet, error: sheetErr } = await supabase
        .from('associate_attendance')
        .select('id')
        .eq('associate_id', uid)
        .eq('date', date)
        .maybeSingle();
      if (sheetErr) return toApiResponse<AssociateAttendance>({ data: null, error: sheetErr });
      if (!sheet) {
        return toApiResponse<AssociateAttendance>({
          data: { date, players: [], total: 0, present: 0, absent: 0 },
          error: null,
        });
      }

      const { data: marks, error: marksErr } = await supabase
        .from('associate_attendance_marks')
        .select('player_id, present, marked_at')
        .eq('associate_attendance_id', sheet.id);
      if (marksErr) return toApiResponse<AssociateAttendance>({ data: null, error: marksErr });

      const markRows = marks ?? [];
      const playerIds = markRows.map((m) => m.player_id);
      const { data: profileRows } = playerIds.length
        ? await supabase.from('profiles').select('*').in('id', playerIds)
        : { data: [] as Record<string, unknown>[] };
      const byId = new Map((profileRows ?? []).map((p) => [p.id as string, p as Record<string, unknown>]));

      const players: AssociatePlayer[] = markRows.map((m) =>
        mapAssociatePlayerRow(byId.get(m.player_id), m.present, m.marked_at ?? undefined),
      );
      const presentCount = players.filter((p) => p.present).length;

      return toApiResponse<AssociateAttendance>({
        data: { date, players, total: players.length, present: presentCount, absent: players.length - presentCount },
        error: null,
      });
    })();
  },
};
