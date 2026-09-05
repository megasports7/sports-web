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
  player_id: number;
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
export interface Event {
  event_id: number;
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
  event_id: number;
  status?: string;
  event_category?: string;
  age_category?: string;
  weight_category?: string;
  seni_category?: string;
}
