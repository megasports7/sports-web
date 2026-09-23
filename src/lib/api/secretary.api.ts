/**
 * Secretary API layer (plan v2 Step 6) -- DEDICATED, no organizer.api reuse.
 *
 * Every read here goes through the secretary geo RLS policies, which enforce
 * permission-grant AND jurisdiction server-side per statement. The client
 * additionally gates section visibility off myPermissions() (convenience
 * only -- revoking a grant hides data on the very next request regardless
 * of what the UI renders).
 *
 * Scope filtering below is belt-and-braces on top of RLS (which already
 * returns only in-scope rows): events are world-readable, so the monitor
 * filters them to the caller's jurisdiction client-side using the same
 * canonical master data the backend resolves against.
 */
import { createClient } from '../supabase/client';
import type { ApiResponse, SecretaryPermission } from '../types';

export type SecretaryKind = 'district_secretary' | 'state_secretary';

export interface SecretaryScope {
  kind: SecretaryKind;
  /** Human jurisdiction label, e.g. "NTR district" / "Kerala". */
  label: string;
  /** Canonical district id (district secretaries) for event filtering. */
  districtId: string | null;
  /** Canonical state id (state secretaries) for event filtering. */
  stateId: string | null;
  /** district_id -> state_id for resolving event districts (state kind). */
  districtState: Map<string, string>;
}

export interface SecretaryPlayer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  sport: string | null;
  state: string | null;
  district: string | null;
}

export interface SecretaryEvent {
  event_id: string;
  event_name: string;
  state_id: string | null;
  district_id: string | null;
  status: string | null;
}

export interface SecretaryRegistration {
  id: string;
  player_id: string;
  player_name: string;
  status: string;
  created_at: string;
}

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

export const secretaryApi = {
  /** Own profile row (id = auth.uid(); self-select policy, no scope involved). */
  profile(): Promise<ApiResponse<Record<string, unknown>>> {
    return (async () => {
      const supabase = createClient();
      const uid = await getUid(supabase);
      const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
      if (error || !data)
        return toApiResponse<Record<string, unknown>>({
          data: null,
          error: error ?? { message: 'Profile not found' },
        });
      return toApiResponse({ data: data as Record<string, unknown>, error: null });
    })();
  },

  /** Live grant set -- drives section visibility. Revoke takes effect
   *  backend-side immediately; this is re-fetched on every dashboard mount. */
  myPermissions(): Promise<ApiResponse<SecretaryPermission[]>> {
    return (async () => {
      const supabase = createClient();
      const uid = await getUid(supabase);
      const { data, error } = await supabase
        .from('secretary_permissions')
        .select('permission')
        .eq('secretary_id', uid);
      if (error) return toApiResponse<SecretaryPermission[]>({ data: null, error });
      return toApiResponse({
        data: (data ?? []).map((r) => r.permission as SecretaryPermission),
        error: null,
      });
    })();
  },

  /** Resolve kind + jurisdiction once per dashboard mount. District names come
   *  from canonical master data (authenticated-readable); the state id for
   *  state secretaries resolves through resolve_state_id so alias spellings
   *  match exactly what RLS sees. */
  scope(): Promise<ApiResponse<SecretaryScope>> {
    return (async () => {
      const supabase = createClient();
      const uid = await getUid(supabase);
      const { data: me, error: meErr } = await supabase
        .from('profiles')
        .select('role, state, district, assigned_district_id')
        .eq('id', uid)
        .maybeSingle();
      if (meErr || !me)
        return toApiResponse<SecretaryScope>({ data: null, error: meErr ?? { message: 'No profile' } });
      if (me.role !== 'district_secretary' && me.role !== 'state_secretary')
        return toApiResponse<SecretaryScope>({ data: null, error: { message: 'Not a secretary account' } });

      const { data: districts } = await supabase.from('districts').select('id, state_id, name');
      const districtState = new Map((districts ?? []).map((d) => [d.id as string, d.state_id as string]));
      const districtName = new Map((districts ?? []).map((d) => [d.id as string, d.name as string]));

      if (me.role === 'district_secretary') {
        const did = (me.assigned_district_id as string | null) ?? null;
        return toApiResponse({
          data: {
            kind: me.role,
            label: did ? `${districtName.get(did) ?? 'Assigned'} district` : 'Unassigned district',
            districtId: did,
            stateId: (did && districtState.get(did)) || null,
            districtState,
          },
          error: null,
        });
      }
      const { data: stateId } = await supabase.rpc('resolve_state_id', { p_text: me.state });
      const { data: states } = await supabase.from('states').select('id, name');
      const sname = (states ?? []).find((s) => s.id === stateId)?.name ?? (me.state as string);
      return toApiResponse({
        data: {
          kind: me.role,
          label: sname as string,
          districtId: null,
          stateId: (stateId as string) ?? null,
          districtState,
        },
        error: null,
      });
    })();
  },

  /** In-jurisdiction player roster. RLS (view_players + scope) decides every
   *  row -- no client-side filtering needed or applied. */
  roster(): Promise<ApiResponse<SecretaryPlayer[]>> {
    return (async () => {
      const supabase = createClient();
      await getUid(supabase);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, phone, sport, state, district')
        .eq('role', 'player')
        .order('name');
      if (error) return toApiResponse<SecretaryPlayer[]>({ data: null, error });
      return toApiResponse({
        data: (data ?? []).map((p) => ({
          id: p.id as string,
          name: p.name as string,
          email: p.email as string,
          phone: (p.phone as string | null) ?? null,
          sport: (p.sport as string | null) ?? null,
          state: (p.state as string | null) ?? null,
          district: (p.district as string | null) ?? null,
        })),
        error: null,
      });
    })();
  },

  /** In-jurisdiction events. Events are world-readable, so the jurisdiction
   *  filter is applied here against canonical ids (RLS independently gates
   *  everything downstream: registrations, matches, certs). */
  events(scope: SecretaryScope): Promise<ApiResponse<SecretaryEvent[]>> {
    return (async () => {
      const supabase = createClient();
      await getUid(supabase);
      const { data, error } = await supabase
        .from('events')
        .select('id, event_name, state_id, district_id, status')
        .order('created_at', { ascending: false });
      if (error) return toApiResponse<SecretaryEvent[]>({ data: null, error });
      const rows = (data ?? []).filter((e) => {
        const did = (e.district_id as string | null) ?? null;
        const sid = (e.state_id as string | null) ?? null;
        if (scope.kind === 'district_secretary') return !!did && did === scope.districtId;
        if (!scope.stateId) return false;
        if (sid === scope.stateId) return true;
        return !!did && scope.districtState.get(did) === scope.stateId;
      });
      return toApiResponse({
        data: rows.map((e) => ({
          event_id: e.id as string,
          event_name: e.event_name as string,
          state_id: (e.state_id as string | null) ?? null,
          district_id: (e.district_id as string | null) ?? null,
          status: (e.status as string | null) ?? null,
        })),
        error: null,
      });
    })();
  },

  /** Registrations for one event (RLS: manage_registrations + event scope).
   *  Player names resolve through the same scoped profiles read as roster(). */
  registrations(eventId: string): Promise<ApiResponse<SecretaryRegistration[]>> {
    return (async () => {
      const supabase = createClient();
      await getUid(supabase);
      const { data, error } = await supabase
        .from('registrations')
        .select('id, player_id, status, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (error) return toApiResponse<SecretaryRegistration[]>({ data: null, error });
      const rows = data ?? [];
      const nameById = new Map<string, string>();
      if (rows.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in(
            'id',
            rows.map((r) => r.player_id as string),
          );
        for (const p of profiles ?? []) nameById.set(p.id as string, p.name as string);
      }
      return toApiResponse({
        data: rows.map((r) => ({
          id: r.id as string,
          player_id: r.player_id as string,
          player_name: nameById.get(r.player_id as string) ?? 'Unknown',
          status: String(r.status),
          created_at: r.created_at as string,
        })),
        error: null,
      });
    })();
  },

  /** Create a batch for an in-scope event (G1: manage_batches + event scope).
   *  Ownership derives from the event's organizer server-side; the RPC raises
   *  insufficient_privilege without the grant or out of scope. */
  createBatch(data: {
    event_id: string;
    batch_name: string;
    player_ids: string[];
    tournament_format?: string;
  }): Promise<ApiResponse<unknown>> {
    return (async () => {
      const supabase = createClient();
      await getUid(supabase);
      const payload: Record<string, unknown> = {
        p_event_id: data.event_id,
        p_batch_name: data.batch_name,
        p_player_ids: data.player_ids,
      };
      if (data.tournament_format) payload.p_tournament_format = data.tournament_format;
      const { data: result, error } = await supabase.rpc('create_batch_with_bracket', payload);
      if (error) return toApiResponse<unknown>({ data: null, error });
      return toApiResponse({ data: result, error: null });
    })();
  },

  /** G2: start a scheduled match (manage_matches + event scope via match_event_id). */
  startMatch(matchId: string): Promise<ApiResponse<unknown>> {
    return (async () => {
      const supabase = createClient();
      await getUid(supabase);
      const { data, error } = await supabase.rpc('start_match', { p_match_id: matchId });
      if (error) return toApiResponse<unknown>({ data: null, error });
      return toApiResponse({ data, error: null });
    })();
  },

  /** G2: declare a winner (manage_matches + event scope). Winner must be a participant. */
  recordMatchResult(matchId: string, winnerId: string): Promise<ApiResponse<unknown>> {
    return (async () => {
      const supabase = createClient();
      await getUid(supabase);
      const { data, error } = await supabase.rpc('record_match_result', {
        p_match_id: matchId,
        p_winner_id: winnerId,
      });
      if (error) return toApiResponse<unknown>({ data: null, error });
      return toApiResponse({ data, error: null });
    })();
  },

  /** Verify players: approve / reject / override via the audited RPC.
   *  Server-side the call needs verify_players + jurisdiction
   *  (secretary_may_review); a 4xx here means the grant or scope is missing. */
  reviewRegistration(
    registrationId: string,
    decision: 'approved' | 'rejected' | 'overridden',
    reason?: string,
  ): Promise<ApiResponse<unknown>> {
    return (async () => {
      const supabase = createClient();
      await getUid(supabase);
      const { data, error } = await supabase.rpc('review_registration', {
        p_registration_id: registrationId,
        p_decision: decision,
        p_override_reason: reason ?? null,
      });
      if (error) return toApiResponse<unknown>({ data: null, error });
      return toApiResponse({ data, error: null });
    })();
  },

  /** Results for one event: in-scope matches (RLS-scoped read) grouped by
   *  batch, with event linkage resolved through batch_event_id. */
  eventMatches(eventId: string): Promise<ApiResponse<Record<string, unknown>[]>> {
    return (async () => {
      const supabase = createClient();
      await getUid(supabase);
      const { data, error } = await supabase
        .from('matches')
        .select('id, batch_id, round_number, match_number, player1_id, player2_id, winner_id, status')
        .order('round_number')
        .order('match_number');
      if (error) return toApiResponse<Record<string, unknown>[]>({ data: null, error });
      const rows = data ?? [];
      const out: Record<string, unknown>[] = [];
      const eventCache = new Map<string, string | null>();
      for (const m of rows) {
        const bid = m.batch_id as string;
        if (!eventCache.has(bid)) {
          const { data: eid } = await supabase.rpc('batch_event_id', { p_batch_id: bid });
          eventCache.set(bid, (eid as string) ?? null);
        }
        if (eventCache.get(bid) === eventId) out.push(m as Record<string, unknown>);
      }
      return toApiResponse({ data: out, error: null });
    })();
  },

  /** Certificates for one event (RLS: manage_registrations + event scope). */
  eventCertificates(eventId: string): Promise<ApiResponse<Record<string, unknown>[]>> {
    return (async () => {
      const supabase = createClient();
      await getUid(supabase);
      const { data, error } = await supabase
        .from('certificates')
        .select('id, player_id, player_name, position, category_name, issue_date')
        .eq('event_id', eventId)
        .order('issue_date', { ascending: false });
      if (error) return toApiResponse<Record<string, unknown>[]>({ data: null, error });
      return toApiResponse({ data: (data ?? []) as Record<string, unknown>[], error: null });
    })();
  },

  /** G3: issue certificates for a batch (certificate_ops + event scope via batch). */
  issueCertificates(batchId: string): Promise<ApiResponse<unknown>> {
    return (async () => {
      const supabase = createClient();
      await getUid(supabase);
      const { data, error } = await supabase.rpc('issue_batch_certificates', {
        p_batch_id: batchId,
        p_overwrite: false,
      });
      if (error) return toApiResponse<unknown>({ data: null, error });
      return toApiResponse({ data, error: null });
    })();
  },

  /** Transparency display: name + role of an actor, only when the caller
   *  already sees an in-scope row that actor touched (else NULL). */
  actorName(actorId: string): Promise<string | null> {
    return (async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc('actor_display_name', { p_actor_id: actorId });
      return (data as string | null) ?? null;
    })();
  },
};
