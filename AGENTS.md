<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Scope

This repository is the Next.js 16 web client. Source is under `src/`, types in `src/lib/types.ts`, API in `src/lib/api/`. Key client modules: `src/lib/registrationExport.ts` (xlsx export), `src/lib/certificateDownload.ts` (canvas JPEG certs), `src/lib/auth/roleUi.tsx` (shared role icons/colors), `src/lib/qr/QrScanner.tsx` (camera + jsQR).

## Supabase rules

- QA-first: web reads/writes QA `wbajcszlaarwlzaundot` via worktree `.env.local` (`NEXT_PUBLIC_SUPABASE_*`). Never run write-capable tests against production `kedf...`.
- Never run `npm run dev` from the main checkout for QA work — its `.env.local` points at production. Use this worktree.
- Do not push, deploy, or alter production without explicit user approval.

## Current delivery boundary

- This worktree (`phase3-category-configuration` → `preview/phase7-web-qa`) = all `main` code **plus** registration export, category/v2 flow (Phases 3-7), RPC batch creation, certificate download, hardened QR scanner, expanded player signup, admin confirm-gate + red-theme dashboard, login-system signup page. Mobile Phase 4-7 deferred.
- QA project has all v2 migrations, demo `demo_verify_own_weight` (first-verify fixed), custom-access-token hook **enabled**, `cert-view` + `admin-create-user` deployed, synthetic fixtures. Production unchanged.
- Web `npm run lint` and `npm run build` must pass. Supabase changes verified via `sports-mobile-main` migrations and `wbajcsz...` preview smoke.

## Standing contracts (learned the hard way — do not regress)

- Batches are created **only** via `create_batch_with_bracket` RPC (`organizerApi.createBatch`). Direct `batches`/`batch_players` INSERTs are revoked by design (migration `20260826140000`) and fail with 42501.
- `proxy.ts` gates routes on the JWT `app_metadata.role` claim, which requires the custom-access-token hook **enabled per Supabase project** — self-signup users otherwise bounce to `/login`.
- Aadhaar lives **only** in `player_sensitive_ids` (self + admin read), never in `profiles`; NSRD goes to `profiles.nsrd_id`. Never render Aadhaar back to UI.
- Admin `admin-update-user` changes the password for **any** non-empty `password` value — admin UI must keep password fields blank with a confirm-match gate plus `autocomplete="new-password"`.
- Icons are hand-rolled inline SVGs (no icon library): always set intrinsic `width`/`height` on the element, never rely solely on stylesheet scoping.
- Admin-in-organizer context (Phase 4): admins enter `/organizer` only via `?org=<organizer-uuid>` (proxy gate); `OrgContextHost` + `organizerApi.setOrgContextUid()` scope reads/operations, profile/photo stay self-scoped, and every in-dashboard link must preserve `?org=` via `withOrg()`. The param is navigation-only — RLS/RPCs authorize, triggers attribute.
- QA/demo-only code (demo verify button, Activate-v2 button) must be stripped or flagged before QA ever merges to `main`.

## Validation

- `npm run lint`
- `npm run build`
