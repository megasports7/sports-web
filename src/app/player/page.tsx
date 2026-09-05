'use client';

/**
 * Stub — Phase 2 replaces this with the real dashboard
 * (docs/M7_CONTRACT.md's Phase 2 screen inventory). Exists in Phase 1 only
 * so the auth gate (src/proxy.ts) has a real player-role page to redirect
 * to/from when proving its definition of done.
 */
import { useAuth } from '@/lib/auth/AuthContext';

export default function PlayerHome() {
  const { user, signOut } = useAuth();
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-bold">Player area</h1>
      <p className="mt-2 text-gray-600">Signed in as {user?.name ?? '…'} ({user?.role})</p>
      <button onClick={() => signOut()} className="mt-4 rounded-lg border px-3 py-2 text-sm font-medium">
        Sign out
      </button>
    </main>
  );
}
