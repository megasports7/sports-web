/**
 * Auth gate — the one place real session/JWT complexity is allowed to live
 * (docs/M7_CONTRACT.md's Architecture section). Runs on every request.
 *
 * Named `proxy.ts`, not `middleware.ts`: Next.js 16 renamed the file
 * convention and the exported function (`middleware` -> `proxy`) — verified
 * live against Next.js's own v16 upgrade docs and Supabase's current
 * Next.js-specific guide before writing this, since assuming the old name
 * from training data would have silently built something already deprecated.
 * The underlying job — refresh the session cookie, gate the app behind
 * login — is unchanged from what was designed.
 *
 * Cookie plumbing below matches Supabase's current official Next.js proxy
 * pattern verbatim (supabase.com/docs/guides/auth/server-side/creating-a-client,
 * the same one their own "AI prompt" doc tells code-generators to use) --
 * this part is NOT specific to which verification call follows it.
 *
 * Verification method: `getClaims()`, not `getSession()` (a cookie-based
 * session can be spoofed and getSession() never revalidates) and not
 * `getUser()` (also safe, but a plain network round-trip with no claims
 * payload). getClaims() verifies the JWT and, in the same call, hands back
 * the decoded claims -- including `app_metadata.role`, the exact claim
 * mobile's own `jwt_role()` Postgres helper reads (supabase/migrations/
 * 20260826090000_rls_helpers.sql) and every RLS policy is written against.
 * Reading it here costs nothing extra and needs no separate profile fetch.
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getClaims() -- a mistake
  // here is exactly the kind of thing that makes users randomly get logged
  // out, per Supabase's own warning on this pattern.
  const { data } = await supabase.auth.getClaims();
  const role = data?.claims?.app_metadata?.role as string | undefined;

  // Whole app is behind login (docs/M7_CONTRACT.md Scope: "entirely behind
  // login", v1 has no anonymous surface) -- no session, no access.
  if (!data?.claims) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Role-aware routing -- UX only, not the security boundary. RLS is what
  // actually stops a player from reading/writing organizer-owned rows
  // (independently proven from a generic HTTP client in M5 Phase 9); this
  // redirect just sends someone to the area their role actually has.
  //
  // A lookup table, not a growing chain of if-blocks -- adding referee here
  // (and admin/associate later) is one line, not a new hand-copied branch
  // that has to remember to redirect every *other* existing role away too.
  const ROLE_HOME: Record<string, string> = {
    player: '/player',
    organizer: '/organizer',
    referee: '/referee',
    admin: '/admin',
    associate: '/associate',
  };
  const homeFor = (r: string | undefined) => (r && ROLE_HOME[r]) || '/login';

  const { pathname } = request.nextUrl;
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = homeFor(role);
    return NextResponse.redirect(url);
  }
  // Phase 4 (admin-in-organizer-context): an admin may enter /organizer/*
  // ONLY with an explicit ?org=<uuid> context parameter. The param is
  // navigation/context only -- it grants nothing by itself (RLS + RPC
  // ownership checks authorize every read/write from the object's own
  // owner chain + jwt_role). Without the param, admins bounce to /admin
  // exactly as before (fail-closed default preserved).
  const ORG_CONTEXT_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const orgParam = request.nextUrl.searchParams.get('org');
  const adminInOrgContext =
    role === 'admin' &&
    pathname.startsWith('/organizer') &&
    orgParam !== null &&
    ORG_CONTEXT_RE.test(orgParam);
  for (const roleName of Object.keys(ROLE_HOME)) {
    if (pathname.startsWith(`/${roleName}`) && role !== roleName) {
      if (adminInOrgContext) continue;
      const url = request.nextUrl.clone();
      url.pathname = homeFor(role);
      return NextResponse.redirect(url);
    }
  }

  // Must return this exact response object -- it carries the refreshed
  // session cookie. A new NextResponse here would desync browser and server.
  return response;
}

export const config = {
  matcher: [
    // Everything except: Next internals, the favicon, static image
    // extensions, and the two pages that must stay reachable without a
    // session (/login, /signup) -- per the Scope section, there is no other
    // anonymous surface in v1.
    '/((?!_next/static|_next/image|favicon\\.ico|login|signup|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
