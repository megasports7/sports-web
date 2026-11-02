/**
 * PROTOTYPE-ONLY sample data + helpers for the player-dashboard concepts.
 *
 * The shape mirrors `PlayerDashboardData` / `Match` from `@/lib/types`
 * exactly (same fields the real `playerApi.dashboard()` returns) so the
 * concepts can be wired to the live API without reshaping anything. Nothing
 * here is imported by production pages; every value is illustrative.
 */
import type { Match, PlayerDashboardData } from '@/lib/types';

export const PROTOTYPE_NOTE =
  'Prototype sample data — illustrative only. No backend calls are made and no real player record is shown.';

export const sampleDashboard: PlayerDashboardData = {
  player: {
    id: 'proto-0000-0000-0000-000000000001',
    player_id: 1042,
    player_name: 'Riya Mehra',
    email: 'riya.mehra@example.invalid',
    phone: '+91 90000 00000',
    sport: 'Pencak Silat',
    state: 'Andhra Pradesh',
    district: 'Guntur',
    gender: 'female',
    nsrd_id: 'NSRD-AP-004821',
    id_valid_until: '2027-03-31',
    photo: null,
  },
  stats: {
    // Verified meaning (player.api.ts dashboard()): events_count is the count
    // of ALL registrations rows for this player; certificate counts come from
    // the certificates.position column; total_certs INCLUDES participation.
    events_count: 12,
    certificates: { gold: 2, silver: 1, bronze: 3, participation: 6 },
    total_certs: 12,
  },
  upcoming_matches: [
    {
      match_id: 'proto-match-0001',
      event_name: 'Andhra Pradesh State Pencak Silat Championship',
      opponent_name: 'Manjula Devi',
      status: 'scheduled',
      scheduled_at: '2026-10-18T09:30:00+05:30',
      match_date: '2026-10-18',
    },
    {
      match_id: 'proto-match-0002',
      event_name: 'Guntur District Open Tanding',
      // opponent_name intentionally absent -> renders the real "TBD" path.
      status: 'scheduled',
      scheduled_at: '2026-10-25T16:00:00+05:30',
      match_date: '2026-10-25',
    },
    {
      match_id: 'proto-match-0003',
      event_name: 'Inter-Club Tanding Meet',
      opponent_name: 'Sneha Rao',
      status: 'in_progress',
      scheduled_at: '2026-11-02T11:15:00+05:30',
      match_date: '2026-11-02',
    },
  ] as Match[],
};

/** Same player, no bouts — used for the empty-state toggle. */
export const emptyUpcoming: Match[] = [];

/**
 * Sample DECIDED bouts for the same player — used only by the Matches
 * prototype (/prototype-d/matches), which needs completed rows with real
 * scores to preview results, the W–L record and the "Decided" section.
 * Kept separate from `upcoming_matches` so the dashboard concepts (which
 * mirror the real dashboard API's upcoming-only list) stay untouched.
 * Dates/scores are illustrative, opponents reuse the season's circuit.
 */
export const samplePastMatches: Match[] = [
  {
    match_id: 'proto-match-0004',
    event_name: 'District Qualifier Final',
    opponent_name: 'Kavya Nair',
    status: 'completed',
    scheduled_at: '2026-09-12T10:00:00+05:30',
    match_date: '2026-09-12',
    player1_score: 5,
    player2_score: 3,
  },
  {
    match_id: 'proto-match-0005',
    event_name: 'Club Sparring Review',
    opponent_name: 'Divya Sree',
    status: 'completed',
    scheduled_at: '2026-08-22T17:30:00+05:30',
    match_date: '2026-08-22',
    player1_score: 2,
    player2_score: 4,
  },
] as Match[];

/** Split an ISO/local string into display parts without timezone drift
 *  (the sample strings already carry their own local offset, so the clock
 *  time is read verbatim and renders identically on server and client). */
export function formatMatchWhen(m: Match): { date: string; time: string } | null {
  const src = m.scheduled_at || m.match_date;
  if (!src) return null;
  const [datePart, timePart] = src.split('T');
  const [y, mo, d] = datePart.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[Number(mo) - 1] ?? mo;
  if (!timePart) return { date: `${Number(d)} ${monthName} ${y}`, time: '' };
  const [hh, mm] = timePart.slice(0, 5).split(':');
  return { date: `${Number(d)} ${monthName} ${y}`, time: `${hh}:${mm}` };
}

/** Mirrors the production dashboard's initials() helper. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Mirrors the production dashboard's status rendering. */
export function statusLabel(status?: string): string {
  return status ? status.replace(/_/g, ' ') : 'scheduled';
}

/** Mirrors the production dashboard's right-side meta rule:
 *  ID validity when set, otherwise location, otherwise nothing. */
export function rightMeta(player: PlayerDashboardData['player']) {
  if (player.id_valid_until) {
    return { label: 'ID valid until', value: new Date(player.id_valid_until).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) };
  }
  if (player.district || player.state) {
    return { label: 'Location', value: [player.district, player.state].filter(Boolean).join(', ') };
  }
  return null;
}
