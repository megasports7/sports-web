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
