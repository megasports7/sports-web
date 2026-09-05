# M7 — Web Application Build: Architecture Contract

## Context

M5 (Firebase → Supabase mobile cutover) is complete and independently verified through Phase 11 (see `sports-mobile-main/docs/M5_CONTRACT.md`). M6 (production cutover) is deliberately paused. This contract covers M7 — building `sports-web`, a Next.js web app on the same Supabase backend the mobile app already uses.

Decided in `docs/MILESTONES.md` before this contract: Next.js on Vercel, `@supabase/ssr` cookie sessions. Everything else here was worked out across this design conversation and is settled, not open.

## Scope (v1)

- Roles served: **player and organizer only**. Referee, associate, and admin are out of scope for v1 — added later by extending the same pattern, not redesigning it.
- Surface: **entirely behind login**. No anonymous/public pages in v1 (this supersedes `MILESTONES.md`'s original "event discovery/public cert lookup" framing for v1 — that framing assumed a public surface; the actual product decision made in this conversation is an authenticated dashboard, matching what the mobile app already is).
- Backend: the **same Supabase project** mobile already uses. No new project, no schema changes required by this contract — the whole existing RLS/RPC surface from M5 is reused as-is.

## Non-goals (explicitly out of scope for v1)

- No Server Components or Server Actions for data fetching/mutation.
- No custom backend or Next.js API routes layer beyond Supabase itself.
- No `service_role` key anywhere in this codebase, ever.
- No password-reset, credential-change, or forced-reset mechanism of any kind — per the standing "real user credentials are never touched by any mechanism" rule already governing M5/M6. If self-service password reset is ever wanted, it goes through Supabase's own built-in email-reset flow, unchanged — never custom logic, and only after an explicit ask.
- No SWR/React Query or other data-fetching library/abstraction layer.

These are deliberate YAGNI cuts for a <1,000-user authenticated app on a tight timeline, not omissions to revisit reflexively — only reopen one if a real, observed need forces it.

## Architecture

**One backend, one middleware file, plain client-side calls everywhere else.**

- **Framework:** Next.js App Router, deployed on Vercel.
- **Session handling — the one place real complexity is allowed to live:** `middleware.ts`, following Supabase's current documented `@supabase/ssr` pattern near-verbatim. It calls `supabase.auth.getClaims()` on every request, refreshes the session cookie, and redirects to `/login` when there is no valid session. Because the whole app is behind login (per Scope above), the middleware matcher protects everything except `/login`, `/signup`, static assets, and Next internals — no public-route allowlist to maintain.
- **Role-aware routing:** mobile's Auth Hook already injects `role` into the JWT as `app_metadata.role` (this is what `jwt_role()` in `supabase/migrations/20260826090000_rls_helpers.sql` reads, and what every RLS policy is written against). `middleware.ts` reads `claims.app_metadata.role` from the same `getClaims()` call to route a player away from `/organizer/*` (and vice versa) — no extra profile fetch needed for this coarse routing decision.
- **This role check is UX, not the security boundary.** RLS is what actually stops a player from reading or writing organizer-owned rows, independently proven from a generic HTTP client in M5 Phase 9. Even if a request bypassed the middleware redirect entirely, Postgres still enforces the real rule. This must never be treated as a substitute for an RLS policy.
- **Everything else is a Client Component calling `createBrowserClient()` directly** (the `@supabase/ssr` browser client) — events, registration, profile, organizer's event/batch/attendance management, login, and signup. No Server Components or Server Actions in the data path at all for v1.

## API layer: direct close port, not a rewrite

`player.api.ts` and `organizer.api.ts` (from `sports-mobile-main/src/api/`) are ported into `sports-web` nearly as-is:

- Same function names, same RPC calls (`register_for_event`, `create_batch_with_bracket`, `find_player_by_qr`, etc.), same `{success, data, message}` envelope, same business logic (e.g. `player.api.ts`'s generic "Invalid credentials" on role mismatch, which deliberately doesn't reveal whether the email exists under a different role — carried over unchanged).
- Adapted only where the browser genuinely differs from React Native:
  - `createBrowserClient()` (from `@supabase/ssr`) in place of the mobile `createClient()`/SecureStore adapter — the browser's own cookie-backed session storage replaces SecureStore; no hand-rolled storage adapter needed.
  - Real `File`/`Blob` for Storage uploads (`profile-photos`) in place of mobile's `expo-file-system` base64 workaround — genuinely simpler on web, not a new problem to solve.
- This is translation, not redesign. It maximizes behavioral parity with mobile (same edge cases, same error shapes) and keeps the door open to extend to referee/associate/admin later by repeating the same port, not inventing a new pattern.

## Route structure

Two role-scoped route groups: `app/(player)/...` and `app/(organizer)/...`. Each has a lightweight client-side auth context mirroring mobile's `AuthContext.tsx` (`onAuthStateChange` + a `profiles` fetch for display data) driving navigation — backed underneath by `middleware.ts`'s coarse gate and RLS's real gate.

## Environment / secrets

- Reuses the mobile app's existing Supabase project — same `SUPABASE_URL`, same public anon/publishable key (whichever key format the project currently issues; it's a public-by-design key either way).
- Exposed as `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Next.js's client-exposure convention, equivalent to mobile's `EXPO_PUBLIC_` prefix).
- `SUPABASE_SERVICE_ROLE_KEY` must never be added to this project — no server-side privileged bypass exists in this architecture, so there is no legitimate reason for it to appear.

## Safety and scale (recorded for reference, not a new decision)

- **Security:** unchanged from mobile — RLS enforces identical row-level rules regardless of client platform. The only new code is `middleware.ts`'s session-refresh, copied from Supabase's own documented pattern. Worth doing once, cheaply: re-run an M5-Phase-7-style secret scan against the deployed web build before considering v1 done, to confirm no privileged key ever made it into a client bundle.
- **Scale:** the browser client is stateless HTTP to PostgREST/GoTrue (no persistent DB connection per browser tab); Supabase's connection pooling absorbs concurrency behind that. For under 1,000 registered users, even worst-case peak concurrency (everyone registering for one event at once) sits comfortably inside what even a small Supabase compute tier handles with zero caching or CDN work. This architecture would need roughly a 10-100x growth in sustained concurrent load before it stopped being "seamless" — and at that point the fix is a compute tier upgrade, not a rewrite.

## Definition of done for the auth gate

Following the same "a check must be proven able to fail before its PASS means anything" discipline M5 ran on every new check:

1. Hit a protected route with no session → confirm redirect to `/login`.
2. Hit `/organizer/*` with a player-role session → confirm redirect.
3. Hit `/organizer/*` with a legitimate organizer-role session → confirm access.

Only after all three are observed (not assumed) is `middleware.ts` trusted.

## Extending to referee/associate/admin later

Not built now. When it happens, it follows this same contract: port `referee.api.ts`/`associate.api.ts`/`admin.api.ts` the same close-port way, add a route group per role, extend `middleware.ts`'s role-routing table. No architectural change expected.
