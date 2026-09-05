/**
 * Direct close port of sports-mobile-main/src/api/auth.api.ts's `me()` —
 * same query, same shape, same reasoning: auth.users only carries email/id,
 * not app-specific profile fields, and a self-signup account's
 * `user.app_metadata` doesn't reliably carry role (only admin/API-created
 * accounts get it written there — see
 * supabase/migrations/20260825121400_sync_role_from_app_metadata.sql).
 * profiles.role is the single source of truth the JWT claim is derived from.
 */
import { createClient } from '../supabase/client';
import type { User, UserRole } from '../types';

interface ProfileRow {
  legacy_id: number | null;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  photo: string | null;
  id_number: string | null;
}

function mapProfileToUser(row: ProfileRow): User {
  return {
    id: row.legacy_id ?? 0,
    name: row.name,
    email: row.email,
    phone: row.phone ?? undefined,
    role: row.role,
    photo: row.photo ?? null,
    id_number: row.id_number ?? null,
  };
}

export const authApi = {
  async me(): Promise<{ success: boolean; data?: User; message?: string }> {
    const supabase = createClient();
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return { success: false, message: authErr?.message || 'Not signed in' };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('legacy_id, name, email, phone, role, photo, id_number')
      .eq('id', authData.user.id)
      .single<ProfileRow>();

    if (error || !data) {
      return { success: false, message: error?.message || 'Profile not found' };
    }
    return { success: true, data: mapProfileToUser(data) };
  },
};
