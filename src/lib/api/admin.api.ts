/**
 * Direct close port of sports-mobile-main/src/api/admin.api.ts, per
 * docs/M7_CONTRACT.md's "API layer: direct close port" section.
 *
 * `getUser()` excluded -- confirmed dead code (zero call sites anywhere in
 * the mobile source: AdminEditUser.tsx receives its `user` via navigation
 * params, never fetches by id), same YAGNI treatment Phase 3 gave
 * eventRegistrations()/the no-arg batches() overload.
 *
 * createUser/updateUser/deleteUser call the SAME already-deployed Edge
 * Functions mobile uses (admin-create-user, admin-update-user) via
 * supabase.functions.invoke() -- no new Postgres/Edge Function work needed.
 * Both functions re-check `caller.role === 'admin'` server-side from the
 * verified JWT (never trusting the request body), so the real authorization
 * boundary is unchanged by which client calls them.
 *
 * ⚠ A REAL BUG FOUND WHILE PORTING, FIXED HERE, NOT REPLICATED: mobile's
 * AdminUserList.tsx builds each row's id as `p.player_id || p.id` (legacy_id
 * with a uuid fallback), then updateUser/deleteUser look the row up via
 * `.eq('legacy_id', userId)`. For any self-signup account -- legacy_id is
 * NULL -- that `||` falls through to the real uuid string, which then gets
 * compared against a numeric column: editing or suspending any non-legacy
 * player/organizer/referee through mobile's admin panel silently fails
 * today. This is the third occurrence of the exact bug class this project
 * has now found in the QR ID-card encoding and scanAttendance's player
 * matching (both in sports-web's Phase 3.5). Fixed here by keying
 * updateUser/deleteUser directly on `profiles.id` (the real uuid, always
 * present, globally unique -- no per-role disambiguation needed) instead of
 * legacy_id -- which also matches what admin-update-user's own validation
 * already requires natively (it rejects anything that isn't a uuid), so
 * this removes a lookup step rather than adding one. Not fixed in mobile
 * itself -- a different codebase, flagged rather than silently patched,
 * same treatment as PlayerIDCard.tsx's equivalent QR defect.
 *
 * Per explicit instruction, this file's write paths (createUser/updateUser/
 * deleteUser) are NOT exercised by any verification script in this session
 * -- no throwaway-account proof, unlike every other phase. This lines up
 * with an existing rule already written into admin-update-user's own file
 * header in sports-mobile-main: "BUILD IT. DO NOT PRESS IT... never invoked
 * against a real account -- not for testing, verification, demonstration,
 * or proving it works." Only `npm run build`/`npm run lint` are the bar
 * here.
 */
import { createClient } from '../supabase/client';
import type {
  ApiResponse,
  Player,
  Organizer,
  Referee,
  Associate,
  Event,
  AdminDashboardData,
  AdminUserRow,
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

/** legacy_id -> <role>_id, matching the *.api.ts-wide convention of exposing
 *  the pre-cutover numeric id under the client's historical field name.
 *  `id` (the real uuid) is always kept too -- see file header for why that,
 *  not legacy_id, is what management actions must key on. */
function mapRoleRow<T>(row: Record<string, unknown>, idKey: string): T {
  const { legacy_id, ...rest } = row;
  return { ...rest, [idKey]: legacy_id } as T;
}

function mapPlayerRow(row: Record<string, unknown>): Player {
  const mapped = mapRoleRow<Player>(row, 'player_id');
  return { ...mapped, player_name: row.name as string };
}

async function invokeEdge<T>(name: string, body: Record<string, unknown>): Promise<ApiResponse<T>> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (!error) return data as ApiResponse<T>;

  let message = error.message || 'Request failed';
  try {
    const context = (error as { context?: { json?: () => Promise<unknown> } }).context;
    if (context && typeof context.json === 'function') {
      const parsed = (await context.json()) as { message?: unknown };
      if (parsed && typeof parsed.message === 'string') message = parsed.message;
    }
  } catch {
    // context wasn't JSON (e.g. a network-level fetch error) -- fall back
    // to error.message above.
  }
  return { success: false, message, error: { message } };
}

export const adminApi = {
  /** Dashboard stats. No RPC exists for this -- assembled client-side from a
   *  handful of REST reads, matching mobile's own AdminDashboard.tsx field
   *  usage exactly (profiles_select_admin grants the unrestricted read this
   *  needs). */
  dashboard(): Promise<ApiResponse<AdminDashboardData>> {
    return (async () => {
      const supabase = createClient();
      const countRole = (role: string) =>
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', role);

      const [playersC, organizersC, refereesC, associatesC, eventsC, recentPlayersRes, recentEventsRes] =
        await Promise.all([
          countRole('player'),
          countRole('organizer'),
          countRole('referee'),
          countRole('associate'),
          supabase.from('events').select('*', { count: 'exact', head: true }),
          supabase
            .from('profiles')
            .select('*')
            .eq('role', 'player')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase.from('events').select('*').order('created_at', { ascending: false }).limit(5),
        ]);

      const firstError = [
        playersC,
        organizersC,
        refereesC,
        associatesC,
        eventsC,
        recentPlayersRes,
        recentEventsRes,
      ].find((r) => r.error)?.error;
      if (firstError) return toApiResponse<AdminDashboardData>({ data: null, error: firstError });

      return toApiResponse({
        data: {
          total_players: playersC.count ?? 0,
          total_organizers: organizersC.count ?? 0,
          total_referees: refereesC.count ?? 0,
          total_associates: associatesC.count ?? 0,
          total_events: eventsC.count ?? 0,
          recent_players: (recentPlayersRes.data ?? []).map(mapPlayerRow),
          recent_events: (recentEventsRes.data ?? []).map(
            (e) => ({ ...e, event_id: e.id }) as unknown as Event,
          ),
        },
        error: null,
      });
    })();
  },

  players(): Promise<ApiResponse<Player[]>> {
    return (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'player')
        .order('created_at', { ascending: false });
      if (error) return toApiResponse<Player[]>({ data: null, error });
      return toApiResponse({ data: (data ?? []).map(mapPlayerRow), error: null });
    })();
  },

  organizers(): Promise<ApiResponse<Organizer[]>> {
    return (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'organizer')
        .order('created_at', { ascending: false });
      if (error) return toApiResponse<Organizer[]>({ data: null, error });
      return toApiResponse({ data: (data ?? []).map((r) => mapRoleRow<Organizer>(r, 'organizer_id')), error: null });
    })();
  },

  referees(): Promise<ApiResponse<Referee[]>> {
    return (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'referee')
        .order('created_at', { ascending: false });
      if (error) return toApiResponse<Referee[]>({ data: null, error });
      // Referee (organizer's roster shape) keys referee_id on the real uuid
      // already -- id, not legacy_id, matching this file's own uuid-first
      // fix (see header). profiles.id is always present.
      return toApiResponse({
        data: (data ?? []).map((r) => ({ ...r, referee_id: r.id }) as unknown as Referee),
        error: null,
      });
    })();
  },

  associates(): Promise<ApiResponse<Associate[]>> {
    return (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'associate')
        .order('created_at', { ascending: false });
      if (error) return toApiResponse<Associate[]>({ data: null, error });
      return toApiResponse({ data: (data ?? []).map((r) => mapRoleRow<Associate>(r, 'associate_id')), error: null });
    })();
  },

  /** Fetch a single user by their real profiles.id uuid. NOT a port of
   *  mobile's dead getUser() (legacy_id+role keyed, zero callers -- see file
   *  header) -- a distinct, new, minimal single-row fetch this web page
   *  genuinely needs because /admin/users/:type/:id/edit is directly
   *  URL-addressable, unlike mobile's screen, which receives the row
   *  in-memory via navigation params instead of re-fetching it. */
  getUserById(userId: string): Promise<ApiResponse<AdminUserRow>> {
    return (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, phone, state, district, status')
        .eq('id', userId)
        .maybeSingle();
      if (error) return toApiResponse<AdminUserRow>({ data: null, error });
      if (!data) return toApiResponse<AdminUserRow>({ data: null, error: { message: 'User not found' } });
      return toApiResponse({ data: data as AdminUserRow, error: null });
    })();
  },

  /** Create a new user. Requires the service_role key (auth.admin.createUser),
   *  which only the admin-create-user Edge Function may hold -- never
   *  shipped in this bundle. Role choices deliberately exclude 'admin'
   *  itself, matching mobile's AdminEditUser.tsx role selector exactly. */
  createUser(data: {
    email: string;
    password: string;
    name: string;
    role: 'player' | 'organizer' | 'referee' | 'associate';
    phone?: string;
    state?: string;
    district?: string;
  }): Promise<ApiResponse<{ id: string; email: string; role: string; legacy_id: number }>> {
    return invokeEdge('admin-create-user', data);
  },

  /** Update an existing user. `userId` is the real profiles.id uuid -- see
   *  file header for why this, not legacy_id, is what this keys on.
   *  admin-update-user's own validation requires exactly this shape. */
  updateUser(
    userId: string,
    data: {
      name?: string;
      phone?: string;
      state?: string;
      district?: string;
      password?: string;
      status?: string;
    },
  ): Promise<ApiResponse<{ user_id: string; updated_fields: string[]; password_changed: boolean }>> {
    return invokeEdge('admin-update-user', { user_id: userId, ...data });
  },

  /** Not a literal delete -- mobile's own M3 review already decided real
   *  deletion is wrong here (FK ON DELETE RESTRICT on
   *  certificates/registrations would reject it regardless), so this
   *  redirects to deactivation via the same Edge Function updateUser uses,
   *  setting profiles.status to 'suspended'. */
  deleteUser(userId: string): Promise<ApiResponse<{ user_id: string; updated_fields: string[]; password_changed: boolean }>> {
    return invokeEdge('admin-update-user', { user_id: userId, status: 'suspended' });
  },

  events(): Promise<ApiResponse<Event[]>> {
    return (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
      if (error) return toApiResponse<Event[]>({ data: null, error });
      return toApiResponse({ data: (data ?? []).map((e) => ({ ...e, event_id: e.id }) as unknown as Event), error: null });
    })();
  },
};
