/**
 * App-level types, ported from sports-mobile-main/src/types/index.ts as
 * needed. Kept in sync with the mobile shape deliberately — this is the
 * contract's "direct close port" principle applied to types too, not just
 * API functions.
 */
export type UserRole = 'player' | 'organizer' | 'referee' | 'admin' | 'associate';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  photo?: string | null;
  id_number?: string | null;
}

// ===================== API Response =====================
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: { message: string };
}

// ===================== Player =====================
export interface Player {
  // The real, always-present profiles.id uuid -- distinct from player_id
  // (legacy_id, NULL for every self-signup player). Added 2026-09-05 so the
  // ID card can encode a working QR code even when there's no legacy_id;
  // see the qr_resolve_by_uuid migration in sports-mobile-main.
  id: string;
  player_id: number | null;
  player_name: string;
  father_name?: string;
  email: string;
  phone?: string;
  nsrd_id?: string;
  sport?: string;
  state?: string;
  district?: string;
  gender?: string;
  photo?: string | null;
  id_number?: string;
  id_valid_until?: string;
  dob?: string;
  blood_group?: string;
  emergency_contact?: string;
  joined_on?: string;
  created_at?: string;
  // Real profiles.status column -- optional here since no player-facing
  // screen reads/writes it, but admin's user list does (admin.api.ts).
  status?: string;
  // Demo-only weight fields (worktree QA) — lets teammates tweak age/gender/weight to test category eligibility
  declared_weight_kg?: number | null;
  verified_weight_kg?: number | null;
  weight_verified_at?: string | null;
}

export interface CertificateCounts {
  gold: number;
  silver: number;
  bronze: number;
  participation: number;
}

export interface PlayerDashboardData {
  player: Player;
  stats: {
    events_count: number;
    certificates: CertificateCounts;
    total_certs: number;
  };
  upcoming_matches: Match[];
}

// ===================== Event =====================
// event_id is the table's real uuid (exposed under this legacy-looking field
// name, per the mobile API's own convention) -- NOT a number at runtime,
// despite historically being typed that way. A Number(event_id) coercion
// anywhere is a bug, not a cast -- see the register page fix this uncovered.
export interface Event {
  event_id: string;
  event_name: string;
  venue?: string;
  location?: string;
  event_date?: string;
  description?: string;
  banner_image?: string | null;
  organizer_id?: string;
  organizer_name?: string;
  status?: string;
  created_at?: string;
  player_count?: number;
  registration_id?: string | null;
  registration_status?: 'pending' | 'approved' | 'rejected' | null;
  event_category?: string | null;
  age_category?: string | null;
  weight_category?: string | null;
}

// ===================== Configured event categories =====================
// This mirrors the mobile Phase 3 category contract. Categories remain
// configuration-only until later phases explicitly activate v2 registration.
export type ConfiguredCompetitionType = 'TANDING' | 'SENI';
export type ConfiguredWeightRuleMode = 'range' | 'measurement_only' | 'not_applicable';

export interface ConfiguredEventCategory {
  id: string;
  event_id: string;
  code: string;
  competition_type: ConfiguredCompetitionType;
  age_label: string;
  minimum_age: number;
  maximum_age: number | null;
  gender: 'male' | 'female';
  weight_rule_mode: ConfiguredWeightRuleMode;
  weight_label: string | null;
  minimum_weight_kg: number | null;
  maximum_weight_kg: number | null;
  seni_category: string | null;
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string | null;
}

export interface ConfiguredEventCategoryInput {
  code: string;
  competition_type: ConfiguredCompetitionType;
  age_label: string;
  minimum_age: number;
  maximum_age: number | null;
  gender: 'male' | 'female';
  weight_rule_mode: ConfiguredWeightRuleMode;
  weight_label: string | null;
  minimum_weight_kg: number | null;
  maximum_weight_kg: number | null;
  seni_category: string | null;
}

// ===================== Match =====================
export interface Match {
  match_id: string;
  event_id?: string;
  scheduled_at?: string;
  match_date?: string;
  player1_id?: string;
  player2_id?: string;
  player1_score?: number;
  player2_score?: number;
  status?: string;
  event_name?: string;
  opponent_id?: string;
  opponent_name?: string;
}

// ===================== Certificate =====================
export interface Certificate {
  certificate_id?: string;
  player_id: string;
  event_id?: string;
  certificate_type?: string;
  level?: string;
  event_name?: string;
  category_name?: string;
  issue_date?: string;
  created_at?: string;
}

// ===================== Registration =====================
export interface Registration {
  registration_id: string;
  event_id: string;
  status?: 'pending' | 'approved' | 'rejected';
  event_category?: string;
  age_category?: string;
  weight_category?: string;
  seni_category?: string;
  player_id?: number | null;
  player_name?: string;
  email?: string;
  phone?: string;
  attendance_status?: 'present' | null;
}

// ===================== Organizer =====================
export interface Organizer {
  // Real, always-present profiles.id uuid -- see Player.id's comment above.
  id: string;
  organizer_id: number | null;
  name: string;
  email: string;
  phone?: string;
  district?: string;
  state?: string;
  photo?: string | null;
  id_number?: string;
  id_valid_until?: string;
  created_at?: string;
  // Real profiles.status column -- see Player.status's comment above.
  status?: string;
}

export interface OrganizerDashboardData {
  organizer: Organizer;
  stats: {
    total_events: number;
    total_batches: number;
    total_registrations: number;
    pending_registrations?: number;
    active_today?: number;
  };
  recent_events: Event[];
}

// ===================== Batch =====================
// batch_id/event_id/referee_id are real uuids (see the Event comment above
// for why this file types them as such rather than `number`).
export interface Batch {
  batch_id: string;
  organizer_id?: string;
  batch_name: string;
  batch_label?: string | null;
  category?: string | null;
  event_id?: string;
  event_name?: string;
  referee_id?: string | null;
  referee_name?: string | null;
  player_count?: number;
  created_at?: string;
}

export interface BatchPlayer {
  player_id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface Referee {
  referee_id: string;
  name: string;
  email?: string;
  phone?: string;
  state?: string;
  district?: string;
  // Real profiles.status column -- see Player.status's comment above.
  status?: string;
}

// ===================== Referee's own profile =====================
// Distinct from Referee above (organizer's roster-row shape, referee_id
// there is the real uuid). Here referee_id is legacy_id -- nullable for
// every self-signup referee, same pattern as Player.player_id/
// Organizer.organizer_id. `id` is the real uuid, always present.
export interface RefereeProfile {
  id: string;
  referee_id: number | null;
  name: string;
  email: string;
  phone?: string;
  photo?: string | null;
  id_number?: string;
  district?: string;
  state?: string;
  id_valid_until?: string;
  joined_on?: string;
  blood_group?: string;
  dob?: string;
  gender?: string;
  emergency_contact?: string;
}

export interface RefereeDashboardData {
  referee: RefereeProfile;
  stats: {
    events_assigned: number;
    matches_total: number;
    matches_today: number;
    upcoming: number;
  };
  assigned_events: Event[];
}

export interface OrganizerMatch {
  match_id: string;
  batch_id: string;
  round_number?: number;
  match_number?: number;
  player1_id?: string | null;
  player2_id?: string | null;
  player1_name?: string;
  player2_name?: string;
  winner_id?: string | null;
  player1_score?: number;
  player2_score?: number;
  status?: string;
  scheduled_at?: string;
}

// referee.api.ts's matches() returns the identical shape (same raw matches
// row + the same player1_name/player2_name resolution) -- a type alias
// keeps both call sites semantically named without duplicating the fields.
export type RefereeMatch = OrganizerMatch;

export interface FilteredPlayer {
  registration_id: string;
  player_id: string;
  player_name: string;
  email?: string;
  phone?: string;
  state?: string;
  district?: string;
  event_category?: string;
  age_category?: string;
  weight_category?: string;
  seni_category?: string;
  status?: string;
}

// ===================== Admin =====================
// Associate isn't a built role yet (only admin needs to list/manage it) --
// kept minimal and loose the same way mobile's own admin.api.ts types
// associates() as `any`, rather than inventing a full role type nothing
// else in this app uses yet.
export interface Associate {
  id: string;
  associate_id: number | null;
  name: string;
  email: string;
  phone?: string;
  state?: string;
  district?: string;
  status?: string;
  photo?: string | null;
}

/** A roster row in an associate's attendance list -- direct mirror of
 *  mobile's AssociatePlayerRow (associate.api.ts). `id` is the real
 *  profiles.id uuid and is what markAttendance/list-keying must use;
 *  `player_id` (legacy_id) is display-only and null for self-signup
 *  players -- see associate.api.ts's file header for the 2026-09-05 bug
 *  this distinction fixes in mobile. */
export interface AssociatePlayer {
  id: string;
  player_id: number | null;
  player_name: string;
  email: string;
  phone?: string | null;
  sport?: string | null;
  id_number?: string | null;
  district?: string | null;
  state?: string | null;
  present: boolean;
  absent: boolean;
  marked_at?: string;
}

/** The normalized row shape every admin user-list renders to, regardless of
 *  which role's table it came from -- mirrors mobile's own AdminUserList.tsx
 *  UserItem interface. `id` is always the real profiles.id uuid (NOT
 *  legacy_id/player_id -- see admin.api.ts's file header for why keying on
 *  legacy_id was a live bug for self-signup accounts). */
export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  phone?: string;
  state?: string;
  district?: string;
  status?: string;
}

export interface AdminDashboardData {
  total_players: number;
  total_organizers: number;
  total_referees: number;
  total_associates: number;
  total_events: number;
  recent_players: Player[];
  recent_events: Event[];
}

export interface AttendanceList {
  list_id: string;
  event_id: string;
  purpose?: string;
  mode?: string;
  unique_only?: boolean;
  scan_count?: number;
  created_at?: string;
}
