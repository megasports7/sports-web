/**
 * Browser Supabase client, for Client Components (M7 Phase 1).
 *
 * Every data call in this app — login, signup, events, registration,
 * profile, organizer management — goes through this client directly, per
 * docs/M7_CONTRACT.md's "API layer: direct close port" section. Mirrors
 * sports-mobile-main/src/api/supabase-client.ts, except session storage is
 * the browser's own cookie jar (via @supabase/ssr) instead of SecureStore —
 * no hand-rolled storage adapter needed here.
 */
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
