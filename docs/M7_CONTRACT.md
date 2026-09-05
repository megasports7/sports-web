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
- No custom backend or Next.js API routes layer. If a genuine server-side secret is ever needed (a third-party SMS/email provider, a future payment gateway for event fees), that's a Supabase Edge Function — the same mechanism mobile already uses for `migrate-password` — never a bespoke Next.js API route.
- No `service_role` key anywhere in this codebase, ever.
- No password-reset, credential-change, or forced-reset mechanism of any kind — per the standing "real user credentials are never touched by any mechanism" rule already governing M5/M6. If self-service password reset is ever wanted, it goes through Supabase's own built-in email-reset flow, unchanged — never custom logic, and only after an explicit ask.
- No SWR/React Query or other data-fetching library at launch — plain `useState`/`useEffect` per screen, matching mobile's existing manual-refetch pattern. Named exception, not a closed door: organizer's batch/bracket/dashboard screens can show the same underlying rows in multiple places, and mobile's own manual-refetch-after-mutation pattern is a known place for a "forgot to refresh the other screen" bug to hide. If that bug actually shows up during implementation, add React Query then, targeted to the screens that need it — it layers on top of the existing Supabase calls without requiring anything already built to be rewritten. Don't add it preemptively.

These are deliberate YAGNI cuts for a <1,000-user authenticated app on a tight timeline, not omissions to revisit reflexively — only reopen one if a real, observed need forces it.

## Execution-agent architecture (hard constraint — max 3 agents, fixed roles)

Same discipline `M5_CONTRACT.md` ran on the mobile migration, carried over unchanged: **brain** (Sonnet — decisions, contract/report writing, gate judging), **coding** (Sonnet — implementation), **reading** (Haiku — read-only verification, independently re-derives claims rather than trusting a self-report). No 4th role, no unbounded parallelism, at most 3 agents active at any point across the whole phased sequence below. The same reason it mattered for M5 applies here: the thing writing a check should not also be the thing that gets to grade it.

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

Two plain route trees, `app/player/...` and `app/organizer/...` (**not** Next.js's `(group)` parenthetical syntax — that hides the segment from the URL, which would break `proxy.ts`'s pathname-prefix role check; corrected here after Phase 1 implementation, the design intent was always the literal `/player`, `/organizer` URLs already used throughout this contract's screen inventory). Each has a lightweight client-side auth context mirroring mobile's `AuthContext.tsx` (`onAuthStateChange` + a `profiles` fetch for display data) driving navigation — backed underneath by `proxy.ts`'s coarse gate and RLS's real gate.

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

## Phased sequence

### Phase 0 — Scaffold, deploy pipeline, environment — ✅ complete, 2026-09-05 (build/lint proven; Vercel deploy not yet done)
Built direct in this session (user's call, not the full brain/coding/reading split — see process note below), not by a dispatched `coding` agent: Next.js 16.3.4 App Router scaffolded in `sports-web/` (TypeScript, ESLint, Tailwind), `@supabase/ssr` + `@supabase/supabase-js` installed, `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` wired in `.env.local` against the same project mobile uses (`.env.example` committed as the placeholder). `npm run build` and `npm run lint` both pass clean. **Not yet done:** an actual Vercel deploy — this session has no Vercel CLI session/OAuth available (non-interactive), so connecting `sports-web`'s existing GitHub remote (`megasports7/sports-web.git`) to Vercel needs the user's own dashboard action or an authenticated `vercel` CLI login. Tracked as open, not silently dropped.

### Phase 1 — Auth foundation, gated before anything is built behind it — ✅ complete, 2026-09-05
**Process note:** built direct in this session rather than the full brain/coding/reading agent split `M5_CONTRACT.md`'s discipline calls for — the user's explicit choice when asked, given Phase 0/1's lower stakes (fresh project, no live user data) versus M5's live-security-critical context. The 3-step definition of done was still independently run and evidenced below, not skipped.

**Naming correction, caught before writing any code:** Next.js 16 (what `create-next-app@latest` actually scaffolded) renamed the `middleware.ts` file convention and its exported function to `proxy.ts`/`export async function proxy` — verified live against Next.js's own v16 upgrade docs and Supabase's current Next.js-specific auth guide (both via context7) before writing anything, rather than assuming the old name from training data. Built as `src/proxy.ts`. Every other reference to "`middleware.ts`" elsewhere in this contract means this file under its current name.

Built: `src/proxy.ts` (session refresh + redirect via `getClaims()`, role-aware routing off `app_metadata.role`, root `/` redirected to the caller's own role home), `src/lib/supabase/client.ts` (browser client), `src/lib/auth/AuthContext.tsx` (mirrors mobile's `AuthContext.tsx` state machine, including the deliberately generic "Invalid credentials" on role mismatch), `src/lib/api/auth.api.ts` (direct port of mobile's `authApi.me()`), `/login` and `/signup` pages, and stub `/player` and `/organizer` pages (real content is Phase 2/3's job — these exist only so the gate has something real to test).

**Definition of done — proven, not assumed**, against a local `next build` + `next dev` instance: two brand-new throwaway accounts (`m7-phase1-{player,organizer}-test-*@example.com`, never touching any real user) were created via direct GoTrue REST calls — the same call `/signup` itself makes — to get real sessions, which were then encoded into the exact cookie `@supabase/ssr` expects (`sb-kedfkraaylzcprsfdkwn-auth-token=base64-<base64url(session json)>`, verified against `@supabase/ssr`'s own installed source rather than assumed) and driven at the running server with `curl`:
1. No session → `/`, `/player`, `/organizer` all redirect to `/login` (`/login` itself stays 200). **PASS.**
2. Player-role session → `/organizer` redirects to `/player`. **PASS.**
3. Organizer-role session → `/organizer` returns 200. **PASS.**
4. Bonus (not required, run anyway): organizer session → `/player` redirects to `/organizer`; each role's session hitting `/` redirects to their own home; each role's session hitting their own area returns 200. **All PASS.**

Both throwaway accounts were deleted via the Admin API immediately after (HTTP 200 both), and the local file holding their session tokens was removed — nothing test-only was left behind.

### Phase 2 — Player role port
`coding` ports `player.api.ts` (direct close port, per the API-layer section above) and builds the `app/(player)/...` route group: dashboard, events browse + register, matches, certificates, profile (real `File`/`Blob` photo upload). `reading` independently verifies each ported function's behavior against the mobile original — same RPC calls, same envelope shape, same edge cases (e.g. the duplicate-registration behavior) — not just "the page renders."

**Screen inventory** (mobile `src/screens/player/*.tsx` → web route), settled this session:

| Mobile screen | Web route | Notes |
|---|---|---|
| `PlayerDashboard.tsx` | `/player` | Direct port — ID card preview, stat chips, quick actions, upcoming matches |
| `PlayerEvents.tsx` | `/player/events` | Direct port — drop pull-to-refresh, refetch on load/focus instead |
| `EventRegistration.tsx` | `/player/events/[id]/register` | **Simpler on web** — mobile's custom bottom-sheet picker modal becomes a plain native `<select>` for the TANDING/SENI → age → weight/seni cascade |
| `PlayerMatches.tsx` | `/player/matches` | Direct port, read-only list |
| `PlayerCertificates.tsx` | `/player/certificates` | Direct port, including the `cert-view` Edge Function call for signed cert links — already inside "Supabase itself," nothing new |
| `PlayerIDCard.tsx` | `/player/id-card` | QR is generate-only (`PLAYER:<id>`, a JS QR library) — no scanning involved. Two decisions below apply here and to the certificate viewer. |
| `PlayerProfile.tsx` | `/player/profile` | **Simpler on web** — real `<input type="file">`/`File`, no `expo-image-picker` workaround |

**Two web-specific decisions, settled this session (not silent defaults):**
- **Image export (ID card / certificate):** view-only for v1 — no canvas-rendering library, no generated JPEG download. Users can right-click-save or print from the browser. Revisit only if users actually ask for a real download button.
- **Share button (ID card / certificate):** `navigator.share()` (Web Share API) where supported, falling back to copy-to-clipboard elsewhere. No new dependency.

### Phase 3 — Organizer role port
`coding` ports `organizer.api.ts` and builds the `app/(organizer)/...` route group: dashboard, create event (banner upload), manage events, manage registrations, create batch, batch certificates, attendance lists, referee assignment. **One open question, flagged here rather than silently decided:** organizer's mobile attendance-marking flows (Rapid Mode, Scan List) are QR/camera-driven, and QR is explicitly deferred (per Non-goals). What replaces QR-based attendance marking in the web version for v1 — a manual checklist/search-and-tap UI, or is attendance marking itself deferred alongside QR? Not decided in this contract; resolve explicitly before Phase 3 starts, don't let `coding` default to something unstated.

### Phase 4 — HARD GATE: bundle secret scan
Same method M5 Phase 7 already proved out: `reading` scans the deployed web build's actual output for the mandatory positive control (the anon/publishable key, expected and public-by-design) before trusting any absence claim, then confirms zero occurrences of `SUPABASE_SERVICE_ROLE_KEY` or any other privileged secret anywhere in the client-shipped bundle. `brain` judges the gate — a passing scan that never proved it could find something is not evidence of anything.

### Phase 5 — Final deployment verification
`coding` deploys the real build to Vercel; `reading` re-runs the auth-gate definition of done (Phase 1) and a full login → browse → register (player) / login → create event → manage registration (organizer) smoke pass against the actual deployed production URL, not localhost. `brain` closes M7 v1 only once this passes live, independently confirmed — same bar as every M5 phase closed on.

## Extending to referee/associate/admin later

Not built now. When it happens, it follows this same contract: port `referee.api.ts`/`associate.api.ts`/`admin.api.ts` the same close-port way, add a route group per role, extend `middleware.ts`'s role-routing table. No architectural change expected.
