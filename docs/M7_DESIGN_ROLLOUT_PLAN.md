# M7 Design System Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved M7 design system to all ~24 existing, already-backend-proven pages in `sports-web`, starting with exactly one pilot page.

**Architecture:** Pure visual restyle — no data flow, route, or API changes. Task 1 establishes Tailwind theme tokens, two Google Fonts, and four small shared presentational components (`Card`, `StatTile`, `StatusBadge`, `BracketList`/`BracketRow`), then fully restyles the player dashboard as the pilot. Tasks 2–9 apply the same tokens/components to the remaining pages, grouped by role and content shape, consuming what Task 1 produces.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4 (`@theme` in CSS, no `tailwind.config.js`), `next/font/google`. No new npm dependency.

**Spec:** `docs/M7_DESIGN_SYSTEM.md` — read it before Task 1. This plan implements it task by task; it does not repeat the *why* behind each token/rule, only the *what*.

## Global Constraints

- No new npm dependency — Tailwind utilities + Space Grotesk/JetBrains Mono (`next/font/google`) only.
- No dark mode — remove the scaffold's `@media (prefers-color-scheme: dark)` block in Task 1 and do not reintroduce one.
- Color is functional only: `accent-blue` = player-role/interactive/in-progress, `accent-green` = organizer-role/success/completed, `accent-violet` = sparing/certificate-only, `corner-red` = red-corner match tag only, `status-pending` = pending/needs-action only. Never decorative.
- Primary action buttons are role-colored, not black: `bg-accent-blue` on every page under `src/app/player/`, `bg-accent-green` on every page under `src/app/organizer/`.
- Cards are flat: `border border-line bg-surface`, no shadow utility (`shadow-*`) anywhere.
- `BracketList`/`BracketRow` (tree-line + tabular mono numerals) are used **only** in: organizer batch-manage (Task 8), rapid-mode's scanned-player table (Task 9). Every other list on every other page uses plain `Card`/`<ul>` rows — do not spread the bracket treatment to registrations, batches lists, or certificates.
- Every task ends with `npm run build` and `npm run lint` passing clean in `D:\sports\sports-web`, plus the manual visual checklist listed in that task (there is no automated visual-regression suite in this project — build/lint is the automated gate, the checklist is the human one).
- Commit after each task with the message given in that task's last step.

---

### Task 1: Foundation — theme tokens, fonts, shared components, pilot page (player dashboard)

**Files:**
- Modify: `src/app/layout.tsx` (swap Geist fonts for Space Grotesk/JetBrains Mono)
- Modify: `src/app/globals.css` (theme tokens, remove dark-mode block, add focus-visible rule)
- Create: `src/lib/ui/Card.tsx`
- Create: `src/lib/ui/StatTile.tsx`
- Create: `src/lib/ui/StatusBadge.tsx`
- Create: `src/lib/ui/Bracket.tsx`
- Modify: `src/app/player/PlayerNav.tsx`
- Modify: `src/app/player/layout.tsx`
- Modify: `src/app/player/page.tsx` (the pilot)

**Interfaces:**
- Produces: `Card({ as?, accent?: 'blue'|'green'|'violet'|'red'|'pending'|'none', className?, children })`, `StatTile({ value, label, accent? })`, `StatusBadge({ status: string })`, `BracketList({ children })`, `BracketRow({ number, dotColor?, children })` — every later task imports these from `@/lib/ui/Card`, `@/lib/ui/StatTile`, `@/lib/ui/StatusBadge`, `@/lib/ui/Bracket`.
- Consumes: nothing from earlier tasks (this is the foundation).

- [ ] **Step 1: Swap fonts in the root layout**

Replace the full contents of `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth/AuthContext";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sports",
  description: "Sports web app",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Replace theme tokens in globals.css**

Replace the full contents of `src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-ink: #16181D;
  --color-muted: #6B7280;
  --color-bg: #FAFAF9;
  --color-surface: #FFFFFF;
  --color-line: #E7E5E0;
  --color-accent-blue: #0091EA;
  --color-accent-green: #00C853;
  --color-accent-violet: #6C3CE9;
  --color-corner-red: #E8492D;
  --color-status-pending: #D4A017;

  --font-sans: var(--font-space-grotesk);
  --font-mono: var(--font-jetbrains-mono);
}

body {
  background-color: var(--color-bg);
  color: var(--color-ink);
}

/* Visible keyboard focus everywhere, one rule instead of per-element classes. */
:focus-visible {
  outline: 2px solid var(--color-accent-blue);
  outline-offset: 2px;
}
```

No dark-mode media query — deliberately removed, per the spec's "no dark mode" rule. Do not add one back.

- [ ] **Step 3: Verify the build still succeeds with the new fonts/tokens**

Run: `cd D:\sports\sports-web && npm run build`
Expected: succeeds. If it fails on the font import, `Space_Grotesk`/`JetBrains_Mono` are the exact export names `next/font/google` uses for these two fonts — a failure here means checking the installed `next` version's font list, not a typo in this plan.

- [ ] **Step 4: Create the Card component**

Create `src/lib/ui/Card.tsx`:

```tsx
import type { ElementType, ReactNode } from 'react';

export type AccentColor = 'blue' | 'green' | 'violet' | 'red' | 'pending' | 'none';

const ACCENT_BORDER: Record<AccentColor, string> = {
  blue: 'border-l-accent-blue',
  green: 'border-l-accent-green',
  violet: 'border-l-accent-violet',
  red: 'border-l-corner-red',
  pending: 'border-l-status-pending',
  none: 'border-l-line',
};

/**
 * The one card primitive for the whole app -- flat border, no shadow, an
 * optional 3px left-edge accent bar carrying a real meaning (role/status),
 * never decoration. See docs/M7_DESIGN_SYSTEM.md.
 */
export function Card({
  as,
  children,
  accent = 'none',
  className = '',
}: {
  as?: ElementType;
  children: ReactNode;
  accent?: AccentColor;
  className?: string;
}) {
  const Tag = as ?? 'div';
  return (
    <Tag
      className={`rounded-md border border-line bg-surface p-4 border-l-[3px] ${ACCENT_BORDER[accent]} ${className}`}
    >
      {children}
    </Tag>
  );
}
```

- [ ] **Step 5: Create the StatTile component**

Create `src/lib/ui/StatTile.tsx`:

```tsx
import { Card, type AccentColor } from './Card';

export function StatTile({
  value,
  label,
  accent = 'none',
}: {
  value: number | string;
  label: string;
  accent?: AccentColor;
}) {
  return (
    <Card accent={accent}>
      <div className="text-2xl font-bold text-ink">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </Card>
  );
}
```

- [ ] **Step 6: Create the StatusBadge component**

Create `src/lib/ui/StatusBadge.tsx`:

```tsx
const STATUS_STYLE: Record<string, { bg: string; label: string }> = {
  scheduled: { bg: 'bg-muted', label: 'Scheduled' },
  in_progress: { bg: 'bg-accent-blue', label: 'In progress' },
  completed: { bg: 'bg-accent-green', label: 'Completed' },
  pending: { bg: 'bg-status-pending', label: 'Pending' },
  approved: { bg: 'bg-accent-green', label: 'Approved' },
  rejected: { bg: 'bg-corner-red', label: 'Rejected' },
  present: { bg: 'bg-accent-blue', label: 'Present' },
};

/** A small colored pill for any status value used across registrations,
 *  matches, and batches. Falls back to the raw status string (capitalized
 *  by the browser's own text, not forced) for any value not in the map,
 *  so a genuinely new status never renders blank. */
export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { bg: 'bg-muted', label: status };
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-bold text-white ${s.bg}`}>{s.label}</span>
  );
}
```

- [ ] **Step 7: Create the Bracket components**

Create `src/lib/ui/Bracket.tsx`:

```tsx
import type { ReactNode } from 'react';

/**
 * Tree-line-connector list, used ONLY where the content genuinely is a
 * bracket/ordered sequence -- organizer batch-manage's match rounds, and
 * rapid-mode's scanned-player roster. Never used for plain lists (registrations,
 * batches, certificates) -- see docs/M7_DESIGN_SYSTEM.md's merge rule.
 */
export function BracketList({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex flex-col gap-3 pl-4">
      <div className="absolute bottom-5 left-1 top-1.5 w-px bg-line" />
      {children}
    </div>
  );
}

export function BracketRow({
  number,
  dotColor = 'bg-muted',
  children,
}: {
  number: string | number;
  dotColor?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex items-center gap-2">
      <span className={`absolute -left-4 h-[9px] w-[9px] rounded-full ${dotColor}`} />
      <span className="w-5 font-mono text-[11px] text-muted">{String(number).padStart(2, '0')}</span>
      {children}
    </div>
  );
}
```

Note for whoever implements this: the tree-line's `top-1.5`/`bottom-5` offsets are a starting guess to visually center the line between the first and last row's dots — if it looks slightly off once real rows render (Task 8), nudge these two values, don't treat them as exact.

- [ ] **Step 8: Restyle PlayerNav**

Replace the full contents of `src/app/player/PlayerNav.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';

const LINKS = [
  { href: '/player', label: 'Dashboard' },
  { href: '/player/events', label: 'Events' },
  { href: '/player/matches', label: 'Matches' },
  { href: '/player/certificates', label: 'Certificates' },
  { href: '/player/id-card', label: 'ID Card' },
  { href: '/player/profile', label: 'Profile' },
];

export function PlayerNav() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-line bg-surface px-4 py-2">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            pathname === link.href ? 'bg-accent-blue text-surface' : 'text-ink hover:bg-bg'
          }`}
        >
          {link.label}
        </Link>
      ))}
      <button
        onClick={() => signOut()}
        className="ml-auto rounded-md px-3 py-1.5 text-sm font-medium text-muted hover:bg-bg"
      >
        Sign out
      </button>
    </nav>
  );
}
```

- [ ] **Step 9: Restyle the player layout wrapper**

Replace the full contents of `src/app/player/layout.tsx`:

```tsx
import { PlayerNav } from './PlayerNav';

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <PlayerNav />
      <div className="mx-auto max-w-3xl px-4 py-6">{children}</div>
    </div>
  );
}
```

- [ ] **Step 10: Restyle the pilot page — player dashboard**

Replace the full contents of `src/app/player/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { playerApi } from '@/lib/api/player.api';
import { Card } from '@/lib/ui/Card';
import { StatTile } from '@/lib/ui/StatTile';
import type { PlayerDashboardData } from '@/lib/types';

export default function PlayerDashboardPage() {
  const [data, setData] = useState<PlayerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    playerApi
      .dashboard()
      .then((res) => {
        if (res.success && res.data) setData(res.data);
        else setError(res.message || 'Could not load dashboard');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted">Loading dashboard…</p>;
  if (error) return <p className="text-corner-red">{error}</p>;
  if (!data) return null;

  const { player, stats, upcoming_matches } = data;

  return (
    <div className="flex flex-col gap-6">
      <Card accent="blue">
        <h1 className="text-lg font-bold text-ink">{player.player_name}</h1>
        <p className="text-sm text-muted">
          {player.id_number || player.nsrd_id || (player.player_id ? `#${player.player_id}` : player.id.slice(0, 8))}
          {player.sport ? ` · ${player.sport}` : ''}
        </p>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted">Your stats</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatTile value={stats.events_count} label="Events" accent="blue" />
          <StatTile value={stats.certificates.gold} label="Gold" accent="pending" />
          <StatTile value={stats.certificates.silver} label="Silver" accent="none" />
          <StatTile value={stats.certificates.bronze} label="Bronze" accent="none" />
          <StatTile value={stats.total_certs} label="Total certs" accent="green" />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted">Upcoming matches</h2>
        {upcoming_matches.length === 0 ? (
          <p className="text-sm text-muted">No upcoming matches.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {upcoming_matches.map((m) => (
              <Card as="li" key={m.match_id}>
                <div className="mb-2 text-xs text-muted">{m.event_name || 'Event'}</div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold text-ink">
                    <span className="h-[9px] w-[9px] rounded-full bg-corner-red" />
                    You
                  </span>
                  <span className="text-xs font-semibold text-muted">VS</span>
                  <span className="flex items-center gap-2 font-medium text-ink">
                    {m.opponent_name || 'TBD'}
                    <span className="h-[9px] w-[9px] rounded-full bg-accent-blue" />
                  </span>
                </div>
              </Card>
            ))}
          </ul>
        )}
      </section>

      <Link href="/player/events" className="text-sm font-medium text-accent-blue underline">
        Browse events →
      </Link>
    </div>
  );
}
```

- [ ] **Step 11: Build and lint**

Run: `cd D:\sports\sports-web && npm run build && npm run lint`
Expected: both pass clean.

- [ ] **Step 12: Manual visual checklist**

Run `npm run dev`, sign in as a player (or use an existing session), open `/player`, and confirm:
- Page background is warm off-white (`#FAFAF9`), not stark white.
- Heading/body text renders in a geometric sans (Space Grotesk) — visibly different from a default system font.
- The nav's active tab ("Dashboard") has a blue background, inactive tabs are plain text.
- The name/ID card at the top has a thin blue left-edge bar, not a shadow.
- Stat tiles are flat-bordered boxes with small colored left bars (blue/gold/none/none/green) — no drop shadow on any card anywhere on the page.
- If there's an upcoming match, "You" has a small red dot next to it and the opponent has a small blue dot — this is the red/blue corner convention, used here for the first time.
- Tab to a link/button — a visible blue focus ring appears (keyboard focus check).

**This is the checkpoint the user asked to confirm before continuing to Task 2.**

- [ ] **Step 13: Commit**

```bash
cd D:\sports\sports-web
git add src/app/layout.tsx src/app/globals.css src/lib/ui/ src/app/player/PlayerNav.tsx src/app/player/layout.tsx src/app/player/page.tsx
git commit -m "feat: design system foundation + pilot page (player dashboard)"
```

---

### Task 2: Player matches + profile pages

**Files:**
- Modify: `src/app/player/matches/page.tsx`
- Modify: `src/app/player/profile/page.tsx`

**Interfaces:**
- Consumes: `Card` (`@/lib/ui/Card`), `StatusBadge` (`@/lib/ui/StatusBadge`) from Task 1.

- [ ] **Step 1: Restyle the matches page**

Replace the full contents of `src/app/player/matches/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { playerApi } from '@/lib/api/player.api';
import { Card } from '@/lib/ui/Card';
import { StatusBadge } from '@/lib/ui/StatusBadge';
import type { Match } from '@/lib/types';

export default function PlayerMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    playerApi
      .matches()
      .then((res) => {
        if (res.success && res.data) setMatches(res.data);
        else setError(res.message || 'Could not load matches');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted">Loading matches…</p>;
  if (error) return <p className="text-corner-red">{error}</p>;

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-ink">My matches</h1>
      {matches.length === 0 ? (
        <p className="text-sm text-muted">No matches yet — they&apos;ll appear here once you&apos;re scheduled.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {matches.map((m) => (
            <Card as="li" key={m.match_id}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink">{m.event_name || 'Event match'}</span>
                {m.status && <StatusBadge status={m.status} />}
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <span className="h-[9px] w-[9px] rounded-full bg-corner-red" />
                <span className="text-ink">You</span>
                <span className="font-mono text-xs text-muted">
                  {m.player1_score !== undefined && m.player2_score !== undefined
                    ? `${m.player1_score} – ${m.player2_score}`
                    : 'vs'}
                </span>
                <span className="text-ink">{m.opponent_name || 'TBD'}</span>
                <span className="h-[9px] w-[9px] rounded-full bg-accent-blue" />
              </div>
              {m.scheduled_at && (
                <div className="mt-1 text-xs text-muted">{new Date(m.scheduled_at).toLocaleDateString()}</div>
              )}
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Restyle the profile page**

Replace the full contents of `src/app/player/profile/page.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { playerApi } from '@/lib/api/player.api';
import { Card } from '@/lib/ui/Card';
import type { Player } from '@/lib/types';

const FIELDS: { key: keyof Player; label: string }[] = [
  { key: 'phone', label: 'Phone' },
  { key: 'state', label: 'State' },
  { key: 'district', label: 'District' },
  { key: 'sport', label: 'Sport' },
  { key: 'blood_group', label: 'Blood group' },
  { key: 'emergency_contact', label: 'Emergency contact' },
];

export default function PlayerProfilePage() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  function applyProfile(p: Player) {
    setPlayer(p);
    setForm(Object.fromEntries(FIELDS.map((f) => [f.key, (p[f.key] as string | undefined) ?? ''])));
  }

  async function refresh() {
    const res = await playerApi.profile();
    if (res.success && res.data) applyProfile(res.data);
  }

  useEffect(() => {
    playerApi
      .profile()
      .then((res) => {
        if (res.success && res.data) applyProfile(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const res = await playerApi.updateProfile(form);
    setSaving(false);
    if (res.success) {
      setMessage('Profile updated.');
      setEditing(false);
      refresh();
    } else {
      setMessage(res.message || 'Update failed');
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    const res = await playerApi.uploadPhoto(file);
    setUploading(false);
    if (res.success) {
      setMessage('Photo updated.');
      refresh();
    } else {
      setMessage(res.message || 'Photo upload failed');
    }
  }

  if (loading) return <p className="text-muted">Loading profile…</p>;
  if (!player) return <p className="text-corner-red">Profile not found.</p>;

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex items-center gap-4">
        {player.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.photo} alt="" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-bg text-xs text-muted">
            No photo
          </div>
        )}
        <div>
          <div className="font-bold text-ink">{player.player_name}</div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mt-1 text-sm font-medium text-accent-blue underline disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Change photo'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">Personal info</h2>
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-sm font-medium text-accent-blue underline">
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="flex flex-col gap-3">
            {FIELDS.map((f) => (
              <label key={f.key} className="flex flex-col gap-1 text-sm text-ink">
                {f.label}
                <input
                  value={form[f.key] ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="rounded-md border border-line px-3 py-2"
                />
              </label>
            ))}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-accent-blue px-3 py-2 text-sm font-medium text-surface disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <dl className="flex flex-col gap-2 text-sm">
            <Row label="Email" value={player.email} />
            {FIELDS.map((f) => (
              <Row key={f.key} label={f.label} value={(player[f.key] as string) || '-'} />
            ))}
            <Row label="DOB" value={player.dob || '-'} />
            <Row label="Gender" value={player.gender || '-'} />
          </dl>
        )}

        {message && <p className="mt-3 text-sm text-muted">{message}</p>}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-line pb-2">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
```

- [ ] **Step 3: Build, lint, visual check, commit**

Run: `npm run build && npm run lint` — both clean.
Manual check: `/player/matches` shows red/blue-dotted rows with a status pill; `/player/profile` cards are flat with no shadow, primary Save button is blue.

```bash
git add src/app/player/matches/page.tsx src/app/player/profile/page.tsx
git commit -m "feat: design system rollout — player matches + profile"
```

---

### Task 3: Player events list + registration form

**Files:**
- Modify: `src/app/player/events/page.tsx`
- Modify: `src/app/player/events/[id]/register/page.tsx`

**Interfaces:**
- Consumes: `Card` from Task 1.

- [ ] **Step 1: Restyle the events list**

Replace the full contents of `src/app/player/events/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { playerApi } from '@/lib/api/player.api';
import { Card } from '@/lib/ui/Card';
import type { Event } from '@/lib/types';

export default function PlayerEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    playerApi
      .events()
      .then((res) => {
        if (res.success && res.data) setEvents(res.data);
        else setError(res.message || 'Could not load events');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted">Loading events…</p>;
  if (error) return <p className="text-corner-red">{error}</p>;

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-ink">Events</h1>
      {events.length === 0 ? (
        <p className="text-sm text-muted">No events available. Check back later.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((e) => {
            const registered = e.registration_status === 'approved' || e.registration_status === 'pending';
            return (
              <Card as="li" key={e.event_id} accent={e.registration_status === 'approved' ? 'green' : e.registration_status === 'pending' ? 'pending' : 'none'}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-ink">{e.event_name}</div>
                    {(e.venue || e.location) && <div className="text-sm text-muted">{e.venue || e.location}</div>}
                    {e.event_date && (
                      <div className="text-xs text-muted">{new Date(e.event_date).toLocaleDateString()}</div>
                    )}
                    {e.event_category && (
                      <div className="mt-1 text-xs font-medium text-muted">
                        {e.event_category}
                        {e.age_category ? ` · ${e.age_category}` : ''}
                        {e.weight_category ? ` · ${e.weight_category}` : ''}
                      </div>
                    )}
                  </div>
                  {registered ? (
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-surface ${
                        e.registration_status === 'approved' ? 'bg-accent-green' : 'bg-status-pending'
                      }`}
                    >
                      {e.registration_status === 'approved' ? 'Registered' : 'Pending'}
                    </span>
                  ) : (
                    <Link
                      href={`/player/events/${e.event_id}/register`}
                      className="shrink-0 rounded-md bg-accent-blue px-3 py-1.5 text-xs font-semibold text-surface"
                    >
                      Register
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Restyle the registration form**

Replace the full contents of `src/app/player/events/[id]/register/page.tsx`:

```tsx
'use client';

import { useEffect, useState, use as usePromise } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { playerApi } from '@/lib/api/player.api';
import { Card } from '@/lib/ui/Card';
import {
  TANDING_AGE_CATEGORIES,
  SENI_AGE_CATEGORIES,
  WEIGHT_CATEGORIES_BY_AGE,
  SIMPLE_WEIGHT_AGES,
  SENI_CATEGORIES,
} from '@/lib/player/registrationCategories';

interface EventSummary {
  event_name?: string;
  venue?: string;
  location?: string;
  organizer_name?: string;
}

export default function EventRegistrationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();

  const [event, setEvent] = useState<EventSummary | null>(null);
  const [eventCategory, setEventCategory] = useState<'' | 'TANDING' | 'SENI'>('');
  const [ageCategory, setAgeCategory] = useState('');
  const [weightCategory, setWeightCategory] = useState('');
  const [weightText, setWeightText] = useState('');
  const [seniCategory, setSeniCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => setEvent(data));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!eventCategory) return setError('Please select an event category');
    if (eventCategory === 'TANDING') {
      if (!ageCategory) return setError('Please select an age category');
      if (SIMPLE_WEIGHT_AGES.includes(ageCategory)) {
        if (!weightText.trim()) return setError('Please enter your weight');
      } else if (!weightCategory) {
        return setError('Please select a weight category');
      }
    } else if (eventCategory === 'SENI') {
      if (!ageCategory) return setError('Please select an age category');
      if (!seniCategory) return setError('Please select a seni category');
    }

    setSubmitting(true);
    const res = await playerApi.registerForEventWithCategory({
      event_id: id,
      event_category: eventCategory,
      age_category: ageCategory,
      weight_category:
        eventCategory === 'TANDING'
          ? SIMPLE_WEIGHT_AGES.includes(ageCategory)
            ? weightText.trim()
            : weightCategory
          : undefined,
      seni_category: eventCategory === 'SENI' ? seniCategory : undefined,
    });
    setSubmitting(false);

    if (res.success) {
      router.push('/player/events');
    } else {
      setError(res.message || 'Registration failed');
    }
  }

  const ageOptions = eventCategory === 'TANDING' ? TANDING_AGE_CATEGORIES : SENI_AGE_CATEGORIES;

  return (
    <div className="mx-auto max-w-md">
      <Card accent="blue" className="mb-4">
        <h1 className="text-lg font-bold text-ink">{event?.event_name || 'Register'}</h1>
        <p className="text-sm text-muted">
          Venue: {event?.venue || event?.location || 'TBD'} · Organizer: {event?.organizer_name || 'TBD'}
        </p>
      </Card>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-ink">
          Event category *
          <select
            value={eventCategory}
            onChange={(e) => {
              setEventCategory(e.target.value as 'TANDING' | 'SENI');
              setAgeCategory('');
              setWeightCategory('');
              setWeightText('');
              setSeniCategory('');
            }}
            className="rounded-md border border-line px-3 py-2"
          >
            <option value="">Select event category</option>
            <option value="TANDING">TANDING</option>
            <option value="SENI">SENI</option>
          </select>
        </label>

        {eventCategory && (
          <label className="flex flex-col gap-1 text-sm text-ink">
            Age category *
            <select
              value={ageCategory}
              onChange={(e) => {
                setAgeCategory(e.target.value);
                setWeightCategory('');
                setWeightText('');
              }}
              className="rounded-md border border-line px-3 py-2"
            >
              <option value="">Select age category</option>
              {ageOptions.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <span className="text-xs italic text-muted">
              You may register once per age group (e.g., one Senior, one Junior…)
            </span>
          </label>
        )}

        {eventCategory === 'TANDING' && ageCategory && SIMPLE_WEIGHT_AGES.includes(ageCategory) && (
          <label className="flex flex-col gap-1 text-sm text-ink">
            Weight (kg) *
            <input
              type="number"
              value={weightText}
              onChange={(e) => setWeightText(e.target.value)}
              placeholder="Enter weight in kg"
              className="rounded-md border border-line px-3 py-2"
            />
          </label>
        )}

        {eventCategory === 'TANDING' && ageCategory && !SIMPLE_WEIGHT_AGES.includes(ageCategory) && (
          <label className="flex flex-col gap-1 text-sm text-ink">
            Weight category *
            <select
              value={weightCategory}
              onChange={(e) => setWeightCategory(e.target.value)}
              className="rounded-md border border-line px-3 py-2"
            >
              <option value="">Select weight category</option>
              {(WEIGHT_CATEGORIES_BY_AGE[ageCategory] ?? []).map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {eventCategory === 'SENI' && ageCategory && (
          <label className="flex flex-col gap-1 text-sm text-ink">
            Seni category *
            <select
              value={seniCategory}
              onChange={(e) => setSeniCategory(e.target.value)}
              className="rounded-md border border-line px-3 py-2"
            >
              <option value="">Select seni category</option>
              {SENI_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {error && <p className="text-sm text-corner-red">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-[2] rounded-md bg-accent-blue px-3 py-2 text-sm font-medium text-surface disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-md border border-line px-3 py-2 text-sm font-medium text-ink"
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Build, lint, visual check, commit**

Run: `npm run build && npm run lint` — both clean.
Manual check: registered/pending events show a colored left accent bar on their card; the "Register" button and form submit button are blue, not black.

```bash
git add src/app/player/events/page.tsx "src/app/player/events/[id]/register/page.tsx"
git commit -m "feat: design system rollout — player events + registration form"
```

---

### Task 4: Player certificates + ID card pages

**Files:**
- Modify: `src/app/player/certificates/page.tsx`
- Modify: `src/app/player/id-card/page.tsx`

**Interfaces:**
- Consumes: `Card` from Task 1.

- [ ] **Step 1: Restyle the certificates page**

Replace the full contents of `src/app/player/certificates/page.tsx`:

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { playerApi } from '@/lib/api/player.api';
import { Card } from '@/lib/ui/Card';
import type { Certificate } from '@/lib/types';

type FilterType = 'all' | 'gold' | 'silver' | 'bronze' | 'participation';
const FILTERS: FilterType[] = ['all', 'gold', 'silver', 'bronze', 'participation'];

export default function PlayerCertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    playerApi
      .certificates()
      .then((res) => {
        if (res.success && res.data) setCerts(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return certs;
    return certs.filter((c) => (c.level || c.certificate_type || '').toLowerCase() === filter);
  }, [certs, filter]);

  async function handleView(cert: Certificate) {
    if (!cert.certificate_id) return;
    setBusyId(cert.certificate_id);
    setMessage(null);
    const res = await playerApi.mintCertificateUrl(cert.certificate_id);
    setBusyId(null);
    if (res.success && res.data) {
      window.open(res.data.url, '_blank', 'noopener,noreferrer');
    } else {
      setMessage(res.message || 'Could not open certificate');
    }
  }

  async function handleShare(cert: Certificate) {
    if (!cert.certificate_id) return;
    setBusyId(cert.certificate_id);
    setMessage(null);
    const res = await playerApi.mintCertificateUrl(cert.certificate_id);
    setBusyId(null);
    if (!res.success || !res.data) {
      setMessage(res.message || 'Could not generate a link');
      return;
    }
    const shareData = { title: cert.event_name || 'Certificate', url: res.data.url };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled the native share sheet -- not an error
      }
    } else {
      await navigator.clipboard.writeText(res.data.url);
      setMessage('Link copied to clipboard.');
    }
  }

  if (loading) return <p className="text-muted">Loading certificates…</p>;

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-ink">My certificates ({certs.length})</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
              filter === f ? 'border-accent-blue bg-accent-blue text-surface' : 'border-line text-muted'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">{filter === 'all' ? 'No certificates yet.' : `No ${filter} certificates.`}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((c) => (
            <Card
              as="li"
              key={c.certificate_id}
              accent={c.level === 'gold' ? 'pending' : c.level === 'bronze' ? 'red' : 'none'}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-ink">{c.event_name || 'Event certificate'}</div>
                  <div className="text-xs uppercase text-muted">{c.level || c.certificate_type || 'Participation'}</div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => handleView(c)}
                    disabled={busyId === c.certificate_id}
                    className="rounded-md border border-line px-2 py-1 text-xs font-medium text-ink disabled:opacity-50"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleShare(c)}
                    disabled={busyId === c.certificate_id}
                    className="rounded-md border border-line px-2 py-1 text-xs font-medium text-ink disabled:opacity-50"
                  >
                    Share
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </ul>
      )}

      {message && <p className="mt-3 text-sm text-muted">{message}</p>}
    </div>
  );
}
```

Note: gold uses `accent="pending"` (the amber/gold token) deliberately — there is no separate silver/bronze hue in the palette per the spec's tight 6-color base; bronze borrows `corner-red`'s warm tone as a reasonable stand-in, silver and participation get no accent bar. If this reads oddly once real certificates render, that's a legitimate spot to revisit — flag it rather than silently expanding the palette.

- [ ] **Step 2: Restyle the ID card page**

Replace the full contents of `src/app/player/id-card/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { playerApi } from '@/lib/api/player.api';
import { Card } from '@/lib/ui/Card';
import type { Player } from '@/lib/types';

export default function PlayerIdCardPage() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    playerApi
      .profile()
      .then(async (res) => {
        if (res.success && res.data) {
          setPlayer(res.data);
          const qrValue = `PLAYER:${res.data.player_id ?? res.data.id}`;
          setQrDataUrl(await QRCode.toDataURL(qrValue, { width: 160, margin: 1 }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleShare() {
    if (!player) return;
    const text = `Player ID: ${player.id_number || player.nsrd_id || player.player_id || player.id}\nName: ${player.player_name}\nSport: ${player.sport || 'N/A'}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Player ID', text });
      } catch {
        // cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      setMessage('Copied to clipboard.');
    }
  }

  if (loading) return <p className="text-muted">Loading ID card…</p>;
  if (!player) return <p className="text-corner-red">ID card not available.</p>;

  const idNumber = player.id_number || player.nsrd_id || (player.player_id ? `#${player.player_id}` : player.id.slice(0, 8));

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      <Card accent="blue" className="p-5">
        <div className="flex items-center gap-4">
          {player.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.photo} alt="" className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-lg bg-bg" />
          )}
          <div>
            <div className="font-bold text-ink">{player.player_name}</div>
            <div className="text-xs text-muted">{idNumber}</div>
            {player.sport && <div className="text-xs font-medium text-accent-blue">{player.sport}</div>}
          </div>
        </div>

        {qrDataUrl && (
          <div className="mt-4 flex flex-col items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="Player QR code" width={160} height={160} />
            <span className="text-xs text-muted">Scan to verify</span>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-2 text-sm font-semibold text-muted">Emergency information</h2>
        <dl className="flex flex-col gap-2 text-sm">
          <Row label="Blood type" value={player.blood_group || 'N/A'} />
          <Row label="Date of birth" value={player.dob || 'N/A'} />
          <Row label="Gender" value={player.gender || 'N/A'} />
          <Row label="Emergency contact" value={player.emergency_contact || 'N/A'} />
        </dl>
      </Card>

      <button onClick={handleShare} className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink">
        Share
      </button>
      {message && <p className="text-sm text-muted">{message}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
```

- [ ] **Step 3: Build, lint, visual check, commit**

Run: `npm run build && npm run lint` — both clean.

```bash
git add src/app/player/certificates/page.tsx src/app/player/id-card/page.tsx
git commit -m "feat: design system rollout — player certificates + ID card"
```

---

### Task 5: Organizer foundation — nav, layout, dashboard, profile, ID card

**Files:**
- Modify: `src/app/organizer/OrganizerNav.tsx`
- Modify: `src/app/organizer/layout.tsx`
- Modify: `src/app/organizer/page.tsx`
- Modify: `src/app/organizer/profile/page.tsx`
- Modify: `src/app/organizer/id-card/page.tsx`

**Interfaces:**
- Consumes: `Card`, `StatTile` from Task 1.

- [ ] **Step 1: Restyle OrganizerNav**

Replace the full contents of `src/app/organizer/OrganizerNav.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';

const LINKS = [
  { href: '/organizer', label: 'Dashboard' },
  { href: '/organizer/events', label: 'Events' },
  { href: '/organizer/id-card', label: 'ID Card' },
  { href: '/organizer/profile', label: 'Profile' },
];

export function OrganizerNav() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-line bg-surface px-4 py-2">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            pathname === link.href ? 'bg-accent-green text-surface' : 'text-ink hover:bg-bg'
          }`}
        >
          {link.label}
        </Link>
      ))}
      <button
        onClick={() => signOut()}
        className="ml-auto rounded-md px-3 py-1.5 text-sm font-medium text-muted hover:bg-bg"
      >
        Sign out
      </button>
    </nav>
  );
}
```

- [ ] **Step 2: Restyle the organizer layout wrapper**

Replace the full contents of `src/app/organizer/layout.tsx`:

```tsx
import { OrganizerNav } from './OrganizerNav';

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <OrganizerNav />
      <div className="mx-auto max-w-3xl px-4 py-6">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Restyle the organizer dashboard**

Replace the full contents of `src/app/organizer/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { organizerApi } from '@/lib/api/organizer.api';
import { Card } from '@/lib/ui/Card';
import { StatTile } from '@/lib/ui/StatTile';
import type { OrganizerDashboardData } from '@/lib/types';

export default function OrganizerHome() {
  const [data, setData] = useState<OrganizerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    organizerApi
      .dashboard()
      .then((res) => {
        if (res.success && res.data) setData(res.data);
        else setError(res.message || 'Could not load dashboard');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted">Loading dashboard…</p>;
  if (error) return <p className="text-corner-red">{error}</p>;
  if (!data) return <p className="text-corner-red">Dashboard not found.</p>;

  const { organizer, stats, recent_events } = data;

  return (
    <div className="flex flex-col gap-6">
      <Card accent="green">
        <h1 className="text-lg font-bold text-ink">Welcome, {organizer.name}</h1>
        <p className="text-sm text-muted">{organizer.email}</p>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile value={stats.total_events} label="Events" accent="green" />
        <StatTile value={stats.total_batches} label="Batches" accent="blue" />
        <StatTile value={stats.total_registrations} label="Registrations" accent="none" />
        <StatTile value={stats.active_today ?? 0} label="Active today" accent="pending" />
      </div>

      <div className="flex gap-4 text-sm font-medium">
        <Link href="/organizer/events" className="text-accent-green underline">
          View all events
        </Link>
        <Link href="/organizer/events/new" className="text-accent-green underline">
          Create event
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted">Recent events</h2>
        {recent_events.length === 0 ? (
          <p className="text-sm text-muted">No events yet. Create your first event to get started.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {recent_events.map((e) => (
              <Card as="li" key={e.event_id}>
                <Link href={`/organizer/events/${e.event_id}/registrations`} className="font-semibold text-ink underline">
                  {e.event_name}
                </Link>
                {(e.venue || e.location) && <div className="text-sm text-muted">{e.venue || e.location}</div>}
                {e.event_date && <div className="text-xs text-muted">{new Date(e.event_date).toLocaleDateString()}</div>}
              </Card>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Restyle the organizer profile page**

Replace the full contents of `src/app/organizer/profile/page.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { organizerApi } from '@/lib/api/organizer.api';
import { Card } from '@/lib/ui/Card';
import type { Organizer } from '@/lib/types';

const FIELDS: { key: keyof Organizer; label: string }[] = [
  { key: 'phone', label: 'Phone' },
  { key: 'state', label: 'State' },
  { key: 'district', label: 'District' },
];

export default function OrganizerProfilePage() {
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  function applyOrganizer(o: Organizer) {
    setOrganizer(o);
    setForm({
      name: o.name ?? '',
      ...Object.fromEntries(FIELDS.map((f) => [f.key, (o[f.key] as string | undefined) ?? ''])),
    });
  }

  async function refresh() {
    const res = await organizerApi.profile();
    if (res.success && res.data) applyOrganizer(res.data);
  }

  useEffect(() => {
    organizerApi
      .profile()
      .then((res) => {
        if (res.success && res.data) applyOrganizer(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const res = await organizerApi.updateProfile({
      name: form.name,
      phone: form.phone,
      state: form.state,
      district: form.district,
    });
    setSaving(false);
    if (res.success) {
      setMessage('Profile updated.');
      setEditing(false);
      refresh();
    } else {
      setMessage(res.message || 'Update failed');
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    const res = await organizerApi.uploadPhoto(file);
    setUploading(false);
    if (res.success) {
      setMessage('Photo updated.');
      refresh();
    } else {
      setMessage(res.message || 'Photo upload failed');
    }
  }

  if (loading) return <p className="text-muted">Loading profile…</p>;
  if (!organizer) return <p className="text-corner-red">Profile not found.</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-ink">Profile</h1>

      <Card className="flex items-center gap-4">
        {organizer.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={organizer.photo} alt="" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-bg text-xs text-muted">
            No photo
          </div>
        )}
        <div>
          <div className="font-bold text-ink">{organizer.name}</div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mt-1 text-sm font-medium text-accent-green underline disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Change photo'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">Personal info</h2>
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-sm font-medium text-accent-green underline">
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm text-ink">
              Name
              <input
                value={form.name ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="rounded-md border border-line px-3 py-2"
              />
            </label>
            {FIELDS.map((f) => (
              <label key={f.key} className="flex flex-col gap-1 text-sm text-ink">
                {f.label}
                <input
                  value={form[f.key] ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="rounded-md border border-line px-3 py-2"
                />
              </label>
            ))}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-accent-green px-3 py-2 text-sm font-medium text-surface disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <dl className="flex flex-col gap-2 text-sm">
            <Row label="Name" value={organizer.name || '-'} />
            <Row label="Email" value={organizer.email || '-'} />
            {FIELDS.map((f) => (
              <Row key={f.key} label={f.label} value={(organizer[f.key] as string) || '-'} />
            ))}
          </dl>
        )}

        {message && <p className="mt-3 text-sm text-muted">{message}</p>}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-muted">ID (admin-assigned)</h2>
        <dl className="flex flex-col gap-2 text-sm">
          <Row label="ID number" value={organizer.id_number || '-'} />
          <Row label="ID valid until" value={organizer.id_valid_until || '-'} />
        </dl>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-line pb-2">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
```

- [ ] **Step 5: Restyle the organizer ID card page**

Replace the full contents of `src/app/organizer/id-card/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { organizerApi } from '@/lib/api/organizer.api';
import { Card } from '@/lib/ui/Card';
import type { Organizer } from '@/lib/types';

export default function OrganizerIdCardPage() {
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    organizerApi
      .profile()
      .then(async (res) => {
        if (res.success && res.data) {
          setOrganizer(res.data);
          const qrValue = `PLAYER:${res.data.organizer_id ?? res.data.id}`;
          setQrDataUrl(await QRCode.toDataURL(qrValue, { width: 160, margin: 1 }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted">Loading ID card…</p>;
  if (!organizer) return <p className="text-corner-red">ID card not available.</p>;

  const idNumber = organizer.id_number || (organizer.organizer_id ? `#${organizer.organizer_id}` : organizer.id.slice(0, 8));

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      <Card accent="green" className="p-5">
        <div className="flex items-center gap-4">
          {organizer.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={organizer.photo} alt="" className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-lg bg-bg" />
          )}
          <div>
            <div className="font-bold text-ink">{organizer.name}</div>
            <div className="text-xs text-muted">{idNumber}</div>
            <div className="text-xs font-medium text-accent-green">Organizer</div>
          </div>
        </div>

        {qrDataUrl && (
          <div className="mt-4 flex flex-col items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="Organizer QR code" width={160} height={160} />
            <span className="text-xs text-muted">Scan to verify</span>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-2 text-sm font-semibold text-muted">Organization details</h2>
        <dl className="flex flex-col gap-2 text-sm">
          <Row label="District" value={organizer.district || 'N/A'} />
          <Row label="State" value={organizer.state || 'N/A'} />
        </dl>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
```

- [ ] **Step 6: Build, lint, visual check, commit**

Run: `npm run build && npm run lint` — both clean.
Manual check: organizer nav's active tab is green (not blue) — this is the one visible role-color difference from the player side.

```bash
git add src/app/organizer/OrganizerNav.tsx src/app/organizer/layout.tsx src/app/organizer/page.tsx src/app/organizer/profile/page.tsx src/app/organizer/id-card/page.tsx
git commit -m "feat: design system rollout — organizer foundation pages"
```

---

### Task 6: Organizer events — list, create, registrations

**Files:**
- Modify: `src/app/organizer/events/page.tsx`
- Modify: `src/app/organizer/events/new/page.tsx`
- Modify: `src/app/organizer/events/[id]/registrations/page.tsx`

**Interfaces:**
- Consumes: `Card`, `StatusBadge` from Task 1.

- [ ] **Step 1: Restyle the events list**

Replace the full contents of `src/app/organizer/events/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { organizerApi } from '@/lib/api/organizer.api';
import { Card } from '@/lib/ui/Card';
import type { Event } from '@/lib/types';

export default function OrganizerEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    organizerApi
      .events()
      .then((res) => {
        if (res.success && res.data) setEvents(res.data);
        else setError(res.message || 'Could not load events');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted">Loading events…</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-ink">Events</h1>
        <Link href="/organizer/events/new" className="text-sm font-medium text-accent-green underline">
          + Create event
        </Link>
      </div>

      {error && <p className="mb-3 text-corner-red">{error}</p>}

      {events.length === 0 ? (
        <p className="text-sm text-muted">No events yet. Create your first event to get started.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((e) => (
            <Card as="li" key={e.event_id}>
              <div className="font-semibold text-ink">{e.event_name}</div>
              {(e.venue || e.location) && <div className="text-sm text-muted">{e.venue || e.location}</div>}
              {e.event_date && <div className="text-xs text-muted">{new Date(e.event_date).toLocaleDateString()}</div>}
              <div className="mt-1 text-xs font-medium text-muted">
                {e.player_count ?? 0} player{e.player_count === 1 ? '' : 's'} registered
              </div>

              <div className="mt-3 flex flex-wrap gap-4 text-sm font-medium">
                <Link href={`/organizer/events/${e.event_id}/registrations`} className="text-accent-green underline">
                  Registrations
                </Link>
                <Link href={`/organizer/events/${e.event_id}/batches`} className="text-accent-green underline">
                  Batches
                </Link>
                <Link href={`/organizer/events/${e.event_id}/lists/create`} className="text-accent-green underline">
                  Attendance lists
                </Link>
                <Link href={`/organizer/events/${e.event_id}/scan-attendance`} className="text-accent-green underline">
                  Scan attendance
                </Link>
                <Link href={`/organizer/events/${e.event_id}/rapid-mode`} className="text-accent-green underline">
                  Rapid mode
                </Link>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Restyle the create-event form**

Replace the full contents of `src/app/organizer/events/new/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { organizerApi } from '@/lib/api/organizer.api';
import { Card } from '@/lib/ui/Card';

export default function NewEventPage() {
  const router = useRouter();
  const [eventName, setEventName] = useState('');
  const [venue, setVenue] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [description, setDescription] = useState('');
  const [bannerFile, setBannerFile] = useState<File | undefined>(undefined);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!eventName.trim()) {
      setValidationError('Event name is required.');
      return;
    }
    setValidationError(null);

    setSubmitting(true);
    const res = await organizerApi.createEvent({
      event_name: eventName.trim(),
      venue: venue.trim() || undefined,
      event_date: eventDate || undefined,
      description: description.trim() || undefined,
      banner_image_file: bannerFile,
    });
    setSubmitting(false);

    if (res.success) {
      router.push('/organizer/events');
    } else {
      setError(res.message || 'Could not create event');
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-ink">New Event</h1>

      <Card as="form" className="flex flex-col gap-4">
        <form onSubmit={handleSubmit} className="contents">
          <label className="flex flex-col gap-1 text-sm text-ink">
            Event name
            <input
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              className="rounded-md border border-line px-3 py-2"
            />
          </label>
          {validationError && <p className="text-corner-red">{validationError}</p>}

          <label className="flex flex-col gap-1 text-sm text-ink">
            Venue
            <input
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="rounded-md border border-line px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink">
            Event date
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="rounded-md border border-line px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="rounded-md border border-line px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink">
            Banner image
            <input type="file" accept="image/*" onChange={(e) => setBannerFile(e.target.files?.[0])} className="text-sm" />
          </label>

          {error && <p className="text-corner-red">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-accent-green px-3 py-2 text-sm font-medium text-surface disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create event'}
          </button>
        </form>
      </Card>
    </div>
  );
}
```

Note: `<Card as="form">` combined with an inner plain `<form className="contents">` wrapping the fields — this is because `Card`'s own `as` prop already renders the outer element as `<form>`, and the nested `<form className="contents">` is there only so `onSubmit`/`noValidate`-style form semantics stay attached correctly without double-nesting real `<form>` tags. If this feels awkward during implementation, the simpler fix is: don't use `Card`'s `as` prop here at all — just wrap a plain `<form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-md border border-line bg-surface p-4">` directly (skip the `Card` component for this one page, since it's a form, not a display card). Either is acceptable; prefer the simpler plain-form version if the `as="form"` version causes any lint/hydration complaint.

- [ ] **Step 3: Restyle the registrations page**

Replace the full contents of `src/app/organizer/events/[id]/registrations/page.tsx`:

```tsx
'use client';

import { use, useEffect, useState } from 'react';
import { organizerApi } from '@/lib/api/organizer.api';
import { StatusBadge } from '@/lib/ui/StatusBadge';
import type { Registration } from '@/lib/types';

function categoryLabel(r: Registration): string {
  if (r.event_category === 'SENI') {
    return r.seni_category || r.event_category || '-';
  }
  return [r.event_category, r.age_category, r.weight_category].filter(Boolean).join(' · ') || '-';
}

export default function OrganizerEventRegistrationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  async function refresh() {
    const res = await organizerApi.registrations(id);
    if (res.success && res.data) {
      setRegistrations(res.data);
      setLoadError(null);
    } else {
      setLoadError(res.message || 'Could not load registrations');
    }
  }

  useEffect(() => {
    organizerApi
      .registrations(id)
      .then((res) => {
        if (res.success && res.data) {
          setRegistrations(res.data);
          setLoadError(null);
        } else {
          setLoadError(res.message || 'Could not load registrations');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStatus(registrationId: string, status: 'approved' | 'rejected') {
    setBusyId(registrationId);
    setActionMessage(null);
    const res = await organizerApi.updateRegistrationStatus(registrationId, status, id);
    setBusyId(null);
    if (res.success) {
      setActionMessage(status === 'approved' ? 'Registration approved.' : 'Registration rejected.');
      refresh();
    } else {
      setActionMessage(res.message || 'Update failed');
    }
  }

  async function handleAttendance(registrationId: string) {
    setBusyId(registrationId);
    setActionMessage(null);
    const res = await organizerApi.markAttendance(registrationId, id);
    setBusyId(null);
    if (res.success) {
      setActionMessage('Attendance marked.');
      refresh();
    } else {
      setActionMessage(res.message || 'Could not mark attendance');
    }
  }

  if (loading) return <p className="text-muted">Loading registrations…</p>;
  if (loadError) return <p className="text-corner-red">{loadError}</p>;

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-ink">Registrations</h1>

      {actionMessage && <p className="mb-3 text-sm text-muted">{actionMessage}</p>}

      {registrations.length === 0 ? (
        <p className="text-sm text-muted">No registrations yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-4 py-2 font-medium">Player</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Attendance</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => {
                const busy = busyId === r.registration_id;
                return (
                  <tr key={r.registration_id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2">
                      <div className="font-medium text-ink">{r.player_name || 'Unknown'}</div>
                      {r.email && <div className="text-xs text-muted">{r.email}</div>}
                    </td>
                    <td className="px-4 py-2 text-muted">{categoryLabel(r)}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={r.status || 'pending'} />
                    </td>
                    <td className="px-4 py-2">{r.attendance_status === 'present' && <StatusBadge status="present" />}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleStatus(r.registration_id, 'approved')}
                          disabled={busy || r.status === 'approved'}
                          className="rounded-md border border-line px-2 py-1 text-xs font-medium text-ink disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatus(r.registration_id, 'rejected')}
                          disabled={busy || r.status === 'rejected'}
                          className="rounded-md border border-line px-2 py-1 text-xs font-medium text-ink disabled:opacity-50"
                        >
                          Reject
                        </button>
                        {r.attendance_status !== 'present' && (
                          <button
                            onClick={() => handleAttendance(r.registration_id)}
                            disabled={busy}
                            className="rounded-md border border-line px-2 py-1 text-xs font-medium text-ink disabled:opacity-50"
                          >
                            Mark attendance
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Build, lint, visual check, commit**

Run: `npm run build && npm run lint` — both clean.

```bash
git add src/app/organizer/events/page.tsx src/app/organizer/events/new/page.tsx "src/app/organizer/events/[id]/registrations/page.tsx"
git commit -m "feat: design system rollout — organizer events + registrations"
```

---

### Task 7: Organizer batches — list/referee-assign, create, certificates (plain-card treatment, not bracket)

**Files:**
- Modify: `src/app/organizer/events/[id]/batches/page.tsx`
- Modify: `src/app/organizer/events/[id]/batches/create/page.tsx`
- Modify: `src/app/organizer/events/[id]/batches/certificates/page.tsx`

**Interfaces:**
- Consumes: `Card` from Task 1.

**Note:** these three pages list batches/players/certificates — none of them render an actual bracket (that's Task 8, batch-*manage*). They get the plain `Card` treatment like every other list page.

- [ ] **Step 1: Restyle the batches list**

Replace the full contents of `src/app/organizer/events/[id]/batches/page.tsx`:

```tsx
'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { organizerApi } from '@/lib/api/organizer.api';
import { Card } from '@/lib/ui/Card';
import type { Batch, Referee } from '@/lib/types';

export default function EventBatchesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [batches, setBatches] = useState<Batch[]>([]);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const loadBatches = useCallback(async () => {
    const res = await organizerApi.eventBatches(id);
    if (res.success && res.data) {
      setBatches(res.data);
    } else {
      setError(res.message || 'Could not load batches');
    }
  }, [id]);

  useEffect(() => {
    Promise.all([organizerApi.eventBatches(id), organizerApi.referees()])
      .then(([batchesRes, refereesRes]) => {
        if (batchesRes.success && batchesRes.data) setBatches(batchesRes.data);
        else setError(batchesRes.message || 'Could not load batches');

        if (refereesRes.success && refereesRes.data) setReferees(refereesRes.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAssign(batchId: string, refereeId: string) {
    setAssigningId(batchId);
    setError(null);
    setMessage(null);
    const res = await organizerApi.assignReferee(batchId, refereeId || null);
    if (res.success) {
      setMessage('Referee updated.');
      await loadBatches();
    } else {
      setError(res.message || 'Could not update referee');
    }
    setAssigningId(null);
  }

  if (loading) return <p className="text-muted">Loading batches…</p>;

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-ink">Batches</h1>

      <div className="mb-4 flex gap-4 text-sm">
        <Link href={`/organizer/events/${id}/batches/create`} className="font-medium text-accent-green underline">
          + Create batch
        </Link>
        <Link href={`/organizer/events/${id}/batches/certificates`} className="font-medium text-accent-green underline">
          View certificates
        </Link>
      </div>

      {error && <p className="mb-3 text-corner-red">{error}</p>}
      {message && <p className="mb-3 text-muted">{message}</p>}

      {batches.length === 0 ? (
        <p className="text-sm text-muted">No batches yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {batches.map((b) => (
            <Card as="li" key={b.batch_id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-ink">{b.batch_name}</div>
                  {b.batch_label && <div className="text-sm text-muted">{b.batch_label}</div>}
                  <div className="text-xs text-muted">{b.player_count ?? 0} players</div>
                </div>
                <Link href={`/organizer/batches/${b.batch_id}/manage`} className="shrink-0 text-sm font-medium text-accent-green underline">
                  Manage
                </Link>
              </div>

              <label className="mt-3 flex flex-col gap-1 text-sm text-ink">
                Referee ({b.referee_name || 'Unassigned'})
                <select
                  value={b.referee_id ?? ''}
                  disabled={assigningId === b.batch_id}
                  onChange={(e) => handleAssign(b.batch_id, e.target.value)}
                  className="rounded-md border border-line px-3 py-2 disabled:opacity-50"
                >
                  <option value="">Unassigned</option>
                  {referees.map((r) => (
                    <option key={r.referee_id} value={r.referee_id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Restyle the create-batch page**

Replace the full contents of `src/app/organizer/events/[id]/batches/create/page.tsx`:

```tsx
'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { organizerApi } from '@/lib/api/organizer.api';
import { Card } from '@/lib/ui/Card';
import type { FilteredPlayer } from '@/lib/types';
import { WEIGHT_CATEGORIES_BY_AGE, SIMPLE_WEIGHT_AGES } from '@/lib/player/registrationCategories';

const AGE_CATEGORIES = ['Senior', 'Junior', 'Pre-Junior', 'Pre-Teen', 'Singa', 'Maccan', 'Master-1', 'Master-2'];
const SENI_TYPES = ['TUNGGAL', 'SOLO', 'GANDA', 'REGU'];

export default function CreateBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [eventCategory, setEventCategory] = useState('');
  const [ageCategory, setAgeCategory] = useState('');
  const [weightCategory, setWeightCategory] = useState('');
  const [weightText, setWeightText] = useState('');
  const [seniType, setSeniType] = useState('');

  const [hasSearched, setHasSearched] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [players, setPlayers] = useState<FilteredPlayer[]>([]);
  const [total, setTotal] = useState(0);
  const [byesRequired, setByesRequired] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [batchName, setBatchName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const useWeightSelect = eventCategory === 'TANDING' && !!ageCategory && !SIMPLE_WEIGHT_AGES.includes(ageCategory);
  const weightValue = useWeightSelect ? weightCategory : weightText.trim();

  function computeLabel(): string {
    const parts = [eventCategory, ageCategory, weightValue, seniType].filter(Boolean);
    return parts.length ? parts.join(' | ') : 'Custom Batch';
  }

  async function handleShowPlayers() {
    setLoadingPlayers(true);
    setError(null);
    setHasSearched(true);
    const res = await organizerApi.getFilteredPlayers(id, {
      event_category: eventCategory || undefined,
      age_category: ageCategory || undefined,
      weight_category: weightValue || undefined,
      seni_type: seniType || undefined,
    });
    setLoadingPlayers(false);
    if (res.success && res.data) {
      setPlayers(res.data.players);
      setTotal(res.data.total);
      setByesRequired(res.data.byes_required);
      setSelected(new Set(res.data.players.map((p) => p.player_id)));
    } else {
      setPlayers([]);
      setTotal(0);
      setByesRequired(0);
      setSelected(new Set());
      setError(res.message || 'Could not load players');
    }
  }

  function toggle(playerId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  async function handleCreate() {
    if (selected.size === 0) return;
    setCreating(true);
    setError(null);
    const label = computeLabel();
    const finalName = batchName.trim() || label;
    const res = await organizerApi.createBatch({
      event_id: id,
      batch_name: finalName,
      category_label: label,
      player_ids: Array.from(selected),
    });
    setCreating(false);
    if (res.success) {
      router.push(`/organizer/events/${id}/batches`);
    } else {
      setError(res.message || 'Could not create batch');
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-lg font-bold text-ink">Create Batch</h1>

      <Card className="mb-4 flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted">Filter players</h2>

        <label className="flex flex-col gap-1 text-sm text-ink">
          Event category
          <select
            value={eventCategory}
            onChange={(e) => {
              setEventCategory(e.target.value);
              setAgeCategory('');
              setWeightCategory('');
              setWeightText('');
              setSeniType('');
            }}
            className="rounded-md border border-line px-3 py-2"
          >
            <option value="">Any</option>
            <option value="TANDING">TANDING</option>
            <option value="SENI">SENI</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink">
          Age category
          <select
            value={ageCategory}
            onChange={(e) => {
              setAgeCategory(e.target.value);
              setWeightCategory('');
              setWeightText('');
            }}
            className="rounded-md border border-line px-3 py-2"
          >
            <option value="">Any</option>
            {AGE_CATEGORIES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink">
          Weight category
          {useWeightSelect ? (
            <select
              value={weightCategory}
              onChange={(e) => setWeightCategory(e.target.value)}
              className="rounded-md border border-line px-3 py-2"
            >
              <option value="">Any</option>
              {(WEIGHT_CATEGORIES_BY_AGE[ageCategory] ?? []).map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={weightText}
              onChange={(e) => setWeightText(e.target.value)}
              placeholder="Weight category (optional)"
              className="rounded-md border border-line px-3 py-2"
            />
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink">
          Seni type
          <select
            value={seniType}
            onChange={(e) => setSeniType(e.target.value)}
            className="rounded-md border border-line px-3 py-2"
          >
            <option value="">Any</option>
            {SENI_TYPES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={handleShowPlayers}
          disabled={loadingPlayers}
          className="rounded-md bg-accent-green px-3 py-2 text-sm font-medium text-surface disabled:opacity-50"
        >
          {loadingPlayers ? 'Loading…' : 'Show players'}
        </button>
      </Card>

      {hasSearched && (
        <Card className="mb-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-muted">
              Players ({total}) — {selected.size} selected
            </h2>
            <div className="flex gap-3">
              <button type="button" onClick={() => setSelected(new Set(players.map((p) => p.player_id)))} className="text-sm font-medium text-accent-green underline">
                Select all
              </button>
              <button type="button" onClick={() => setSelected(new Set())} className="text-sm font-medium text-accent-green underline">
                Deselect all
              </button>
            </div>
          </div>

          {byesRequired > 0 && <p className="mb-2 text-sm text-muted">Byes required: {byesRequired}</p>}

          {loadingPlayers ? (
            <p className="text-sm text-muted">Loading players…</p>
          ) : players.length === 0 ? (
            <p className="text-sm text-muted">No players match these filters.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {players.map((p) => (
                <li key={p.registration_id} className="flex items-center gap-2 border-b border-line pb-2 text-sm">
                  <input type="checkbox" checked={selected.has(p.player_id)} onChange={() => toggle(p.player_id)} />
                  <div>
                    <div className="font-medium text-ink">{p.player_name}</div>
                    <div className="text-xs text-muted">
                      {[p.event_category, p.age_category, p.weight_category, p.seni_category].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-ink">
          Batch name (optional)
          <input
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            placeholder={computeLabel()}
            className="rounded-md border border-line px-3 py-2"
          />
        </label>

        {error && <p className="text-sm text-corner-red">{error}</p>}

        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || selected.size === 0}
          className="rounded-md bg-accent-green px-3 py-2 text-sm font-medium text-surface disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Create batch'}
        </button>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Restyle the batch certificates page**

Replace the full contents of `src/app/organizer/events/[id]/batches/certificates/page.tsx`:

```tsx
'use client';

import { use, useEffect, useState } from 'react';
import { organizerApi } from '@/lib/api/organizer.api';
import { Card } from '@/lib/ui/Card';
import type { Batch } from '@/lib/types';

export default function OrganizerCertificatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);

  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [batchesError, setBatchesError] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState('');

  const [certificates, setCertificates] = useState<Record<string, unknown>[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [certsError, setCertsError] = useState<string | null>(null);

  const [viewBusyId, setViewBusyId] = useState<string | null>(null);
  const [viewMessage, setViewMessage] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);

  useEffect(() => {
    organizerApi
      .eventBatches(eventId)
      .then((res) => {
        if (res.success && res.data) setBatches(res.data);
        else setBatchesError(res.message || 'Could not load batches');
      })
      .finally(() => setLoadingBatches(false));
  }, [eventId]);

  useEffect(() => {
    if (!selectedBatchId) return;
    organizerApi
      .getCertificates(eventId, selectedBatchId)
      .then((res) => {
        if (res.success && res.data) {
          setCertificates(res.data);
          setCertsError(null);
        } else {
          setCertsError(res.message || 'Could not load certificates');
        }
      })
      .finally(() => setLoadingCerts(false));
  }, [eventId, selectedBatchId]);

  async function handleView(cert: Record<string, unknown>) {
    const rawId = cert.cert_id ?? cert.certificate_id;
    if (!rawId) return;
    const certId = String(rawId);
    setViewBusyId(certId);
    setViewMessage(null);
    const res = await organizerApi.mintCertificateUrl(certId);
    setViewBusyId(null);
    if (res.success && res.data) {
      window.open(res.data.url, '_blank', 'noopener,noreferrer');
    } else {
      setViewMessage(res.message || 'Could not open certificate');
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenerateMessage(null);
    const res = await organizerApi.generateCertificates();
    setGenerating(false);
    setGenerateMessage(res.message || (res.success ? 'Done.' : 'Could not generate certificates.'));
  }

  if (loadingBatches) return <p className="text-muted">Loading batches…</p>;

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-ink">Certificates</h1>

      {batchesError ? (
        <p className="mb-4 text-corner-red">{batchesError}</p>
      ) : batches.length === 0 ? (
        <p className="mb-4 text-sm text-muted">No batches for this event yet.</p>
      ) : (
        <div className="mb-4 flex flex-col gap-1">
          <label htmlFor="batch-select" className="text-sm font-medium text-muted">
            Batch
          </label>
          <select
            id="batch-select"
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="rounded-md border border-line px-3 py-2"
          >
            <option value="">Select a batch…</option>
            {batches.map((b) => (
              <option key={b.batch_id} value={b.batch_id}>
                {b.batch_name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-4">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink disabled:opacity-50"
        >
          {generating ? 'Generating…' : 'Generate certificates'}
        </button>
        {generateMessage && <p className="mt-2 text-sm text-muted">{generateMessage}</p>}
      </div>

      {selectedBatchId &&
        (loadingCerts ? (
          <p className="text-muted">Loading certificates…</p>
        ) : certsError ? (
          <p className="text-corner-red">{certsError}</p>
        ) : certificates.length === 0 ? (
          <p className="text-sm text-muted">No certificates for this batch yet.</p>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {certificates.map((c) => {
                const certId = String(c.cert_id ?? c.certificate_id ?? '');
                const playerName = (c.player_name as string) || 'Unknown player';
                const levelOrPosition = (c.level as string) || (c.position as string) || (c.certificate_type as string) || '-';
                return (
                  <Card as="li" key={certId}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-ink">{playerName}</div>
                        <div className="text-xs uppercase text-muted">{levelOrPosition}</div>
                      </div>
                      <button
                        onClick={() => handleView(c)}
                        disabled={viewBusyId === certId}
                        className="shrink-0 rounded-md border border-line px-2 py-1 text-xs font-medium text-ink disabled:opacity-50"
                      >
                        View
                      </button>
                    </div>
                  </Card>
                );
              })}
            </ul>
            {viewMessage && <p className="mt-3 text-sm text-muted">{viewMessage}</p>}
          </>
        ))}
    </div>
  );
}
```

- [ ] **Step 4: Build, lint, visual check, commit**

Run: `npm run build && npm run lint` — both clean.

```bash
git add "src/app/organizer/events/[id]/batches/page.tsx" "src/app/organizer/events/[id]/batches/create/page.tsx" "src/app/organizer/events/[id]/batches/certificates/page.tsx"
git commit -m "feat: design system rollout — organizer batches (list, create, certificates)"
```

---

### Task 8: Organizer batch-manage — the real bracket page

**Files:**
- Modify: `src/app/organizer/batches/[id]/manage/page.tsx`

**Interfaces:**
- Consumes: `Card`, `StatusBadge`, `BracketList`, `BracketRow` from Task 1.

This is the one page where the Bracket Board treatment actually applies — matches genuinely grouped by round, tabular mono scores. Everything else on the page (the referee card, the inline record/advance/replace panels) stays plain `Card`.

- [ ] **Step 1: Restyle batch-manage**

Replace the full contents of `src/app/organizer/batches/[id]/manage/page.tsx`:

```tsx
'use client';

import { use, useEffect, useState } from 'react';
import { organizerApi } from '@/lib/api/organizer.api';
import { Card } from '@/lib/ui/Card';
import { StatusBadge } from '@/lib/ui/StatusBadge';
import { BracketList, BracketRow } from '@/lib/ui/Bracket';
import type { Batch, BatchPlayer, OrganizerMatch, Referee } from '@/lib/types';

type Panel = { matchId: string; type: 'record' | 'advance' | 'replace' };
type ActionMessage = { matchId: string; text: string; error?: boolean };

const DOT_COLOR: Record<string, string> = {
  scheduled: 'bg-muted',
  in_progress: 'bg-accent-blue',
  completed: 'bg-accent-green',
};

export default function BatchManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [batch, setBatch] = useState<Batch | null>(null);
  const [matches, setMatches] = useState<OrganizerMatch[]>([]);
  const [players, setPlayers] = useState<BatchPlayer[]>([]);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedRefereeId, setSelectedRefereeId] = useState('');
  const [savingReferee, setSavingReferee] = useState(false);
  const [refereeMessage, setRefereeMessage] = useState<string | null>(null);

  const [panel, setPanel] = useState<Panel | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<ActionMessage | null>(null);

  const [recordWinnerId, setRecordWinnerId] = useState('');
  const [recordScore1, setRecordScore1] = useState('');
  const [recordScore2, setRecordScore2] = useState('');
  const [advanceWinnerId, setAdvanceWinnerId] = useState('');
  const [replaceOldId, setReplaceOldId] = useState('');
  const [replaceNewId, setReplaceNewId] = useState('');

  useEffect(() => {
    Promise.all([
      organizerApi.batchDetail(id),
      organizerApi.batchMatches(id),
      organizerApi.batchPlayers(id),
      organizerApi.referees(),
    ]).then(([b, m, p, r]) => {
      if (b.success && b.data) {
        setBatch(b.data);
        setSelectedRefereeId(b.data.referee_id ?? '');
      } else {
        setError(b.message || 'Could not load batch');
      }
      if (m.success && m.data) setMatches(m.data);
      if (p.success && p.data) setPlayers(p.data);
      if (r.success && r.data) setReferees(r.data);
      setLoading(false);
    });
  }, [id]);

  async function refreshMatches() {
    const res = await organizerApi.batchMatches(id);
    if (res.success && res.data) setMatches(res.data);
  }

  async function refreshBatch() {
    const res = await organizerApi.batchDetail(id);
    if (res.success && res.data) {
      setBatch(res.data);
      setSelectedRefereeId(res.data.referee_id ?? '');
    }
  }

  async function handleSaveReferee() {
    setSavingReferee(true);
    setRefereeMessage(null);
    const res = await organizerApi.assignReferee(id, selectedRefereeId || null);
    setSavingReferee(false);
    if (res.success) {
      setRefereeMessage('Referee updated.');
      refreshBatch();
    } else {
      setRefereeMessage(res.message || 'Could not update referee');
    }
  }

  function openPanel(matchId: string, type: Panel['type']) {
    setPanel({ matchId, type });
    setActionMessage(null);
    setRecordWinnerId('');
    setRecordScore1('');
    setRecordScore2('');
    setAdvanceWinnerId('');
    setReplaceOldId('');
    setReplaceNewId('');
  }

  function closePanel() {
    setPanel(null);
  }

  async function handleStart(match: OrganizerMatch) {
    setBusy(true);
    setActionMessage(null);
    const res = await organizerApi.startConducting(id, match.match_id);
    setBusy(false);
    if (res.success) {
      setActionMessage({ matchId: match.match_id, text: 'Match started.' });
      refreshMatches();
    } else {
      setActionMessage({ matchId: match.match_id, text: res.message || 'Could not start match', error: true });
    }
  }

  async function handleReopen(match: OrganizerMatch) {
    if (!window.confirm('Reopen this completed match?')) return;
    setBusy(true);
    setActionMessage(null);
    const res = await organizerApi.reopenMatch(id, match.match_id);
    setBusy(false);
    if (res.success) {
      setActionMessage({ matchId: match.match_id, text: 'Match reopened.' });
      refreshMatches();
    } else {
      setActionMessage({ matchId: match.match_id, text: res.message || 'Could not reopen match', error: true });
    }
  }

  async function submitRecord(match: OrganizerMatch) {
    if (!recordWinnerId) {
      setActionMessage({ matchId: match.match_id, text: 'Select a winner first.', error: true });
      return;
    }
    setBusy(true);
    const res = await organizerApi.recordMatchResult(id, match.match_id, {
      winner_id: recordWinnerId,
      player1_score: recordScore1 !== '' ? Number(recordScore1) : undefined,
      player2_score: recordScore2 !== '' ? Number(recordScore2) : undefined,
    });
    setBusy(false);
    if (res.success) {
      setActionMessage({ matchId: match.match_id, text: 'Result recorded.' });
      setPanel(null);
      refreshMatches();
    } else {
      setActionMessage({ matchId: match.match_id, text: res.message || 'Could not record result', error: true });
    }
  }

  async function submitAdvance(match: OrganizerMatch) {
    if (!advanceWinnerId) {
      setActionMessage({ matchId: match.match_id, text: 'Select a winner first.', error: true });
      return;
    }
    setBusy(true);
    const res = await organizerApi.forceAdvanceMatch(id, match.match_id, advanceWinnerId);
    setBusy(false);
    if (res.success) {
      setActionMessage({ matchId: match.match_id, text: 'Match advanced.' });
      setPanel(null);
      refreshMatches();
    } else {
      setActionMessage({ matchId: match.match_id, text: res.message || 'Could not force advance', error: true });
    }
  }

  async function submitReplace(match: OrganizerMatch) {
    if (!replaceOldId || !replaceNewId) {
      setActionMessage({ matchId: match.match_id, text: 'Select who to replace and a replacement.', error: true });
      return;
    }
    setBusy(true);
    const res = await organizerApi.replaceParticipant(id, match.match_id, replaceOldId, replaceNewId);
    setBusy(false);
    if (res.success) {
      setActionMessage({ matchId: match.match_id, text: 'Participant replaced.' });
      setPanel(null);
      refreshMatches();
    } else {
      setActionMessage({ matchId: match.match_id, text: res.message || 'Could not replace participant', error: true });
    }
  }

  function winnerName(match: OrganizerMatch): string | null {
    if (!match.winner_id) return null;
    if (match.winner_id === match.player1_id) return match.player1_name ?? null;
    if (match.winner_id === match.player2_id) return match.player2_name ?? null;
    return null;
  }

  if (loading) return <p className="text-muted">Loading batch…</p>;
  if (error) return <p className="text-corner-red">{error}</p>;
  if (!batch) return <p className="text-corner-red">Batch not found.</p>;

  const rounds = Array.from(new Set(matches.map((m) => m.round_number ?? 0))).sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold text-ink">{batch.batch_name}</h1>
        {batch.category && <p className="text-sm text-muted">{batch.category}</p>}
      </div>

      <Card>
        <h2 className="mb-2 text-sm font-semibold text-muted">Referee</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedRefereeId}
            onChange={(e) => setSelectedRefereeId(e.target.value)}
            className="rounded-md border border-line px-3 py-2 text-sm"
          >
            <option value="">Unassigned</option>
            {referees.map((r) => (
              <option key={r.referee_id} value={r.referee_id}>
                {r.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleSaveReferee}
            disabled={savingReferee}
            className="rounded-md bg-accent-green px-3 py-2 text-sm font-medium text-surface disabled:opacity-50"
          >
            {savingReferee ? 'Saving…' : 'Save'}
          </button>
        </div>
        {refereeMessage && <p className="mt-2 text-sm text-muted">{refereeMessage}</p>}
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted">Matches</h2>
        {matches.length === 0 ? (
          <p className="text-sm text-muted">No matches yet.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {rounds.map((round) => (
              <Card key={round}>
                <h3 className="mb-3 text-xs font-semibold uppercase text-muted">Round {round}</h3>
                <BracketList>
                  {matches
                    .filter((m) => (m.round_number ?? 0) === round)
                    .map((match, i) => {
                      const canStart = match.status === 'scheduled' && !!match.player1_id && !!match.player2_id;
                      const canRecord = match.status === 'scheduled' || match.status === 'in_progress';
                      const canReopen = match.status === 'completed';
                      const canAdvance = match.status !== 'completed';
                      const canReplace = match.status !== 'completed';
                      const eligibleReplacements = players.filter(
                        (p) => p.player_id !== match.player1_id && p.player_id !== match.player2_id,
                      );
                      const w = winnerName(match);
                      const isPanelHere = panel?.matchId === match.match_id;

                      return (
                        <div key={match.match_id} className="flex flex-col gap-2">
                          <BracketRow number={i + 1} dotColor={DOT_COLOR[match.status ?? ''] ?? 'bg-muted'}>
                            <div className="flex flex-1 items-center justify-between gap-3 text-sm">
                              <span className="font-medium text-ink">
                                {match.player1_name ?? 'TBD'}
                                {match.player1_score !== undefined && match.player2_score !== undefined && (
                                  <span className="ml-2 font-mono text-xs font-bold text-ink">
                                    {match.player1_score}–{match.player2_score}
                                  </span>
                                )}
                                <span className="mx-2 text-xs text-muted">vs</span>
                                {match.player2_name ?? 'TBD'}
                              </span>
                              <StatusBadge status={match.status ?? 'scheduled'} />
                            </div>
                          </BracketRow>
                          {w && <div className="pl-7 text-xs text-muted">Winner: {w}</div>}

                          <div className="flex flex-wrap gap-2 pl-7">
                            {canStart && (
                              <button onClick={() => handleStart(match)} disabled={busy} className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50">
                                Start
                              </button>
                            )}
                            {canRecord && (
                              <button
                                onClick={() => (isPanelHere && panel?.type === 'record' ? closePanel() : openPanel(match.match_id, 'record'))}
                                disabled={busy}
                                className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
                              >
                                Record result
                              </button>
                            )}
                            {canReopen && (
                              <button onClick={() => handleReopen(match)} disabled={busy} className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50">
                                Reopen
                              </button>
                            )}
                            {canAdvance && (
                              <button
                                onClick={() => (isPanelHere && panel?.type === 'advance' ? closePanel() : openPanel(match.match_id, 'advance'))}
                                disabled={busy}
                                className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
                              >
                                Force advance
                              </button>
                            )}
                            {canReplace && (
                              <button
                                onClick={() => (isPanelHere && panel?.type === 'replace' ? closePanel() : openPanel(match.match_id, 'replace'))}
                                disabled={busy}
                                className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
                              >
                                Replace participant
                              </button>
                            )}
                          </div>

                          {isPanelHere && panel?.type === 'record' && (
                            <div className="ml-7 flex flex-col gap-2 rounded-md border border-line bg-bg p-3">
                              <div className="flex flex-col gap-1 text-sm text-ink">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`record-winner-${match.match_id}`}
                                    checked={!!match.player1_id && recordWinnerId === match.player1_id}
                                    onChange={() => setRecordWinnerId(match.player1_id ?? '')}
                                  />
                                  {match.player1_name ?? 'TBD'}
                                </label>
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`record-winner-${match.match_id}`}
                                    checked={!!match.player2_id && recordWinnerId === match.player2_id}
                                    onChange={() => setRecordWinnerId(match.player2_id ?? '')}
                                  />
                                  {match.player2_name ?? 'TBD'}
                                </label>
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  placeholder="Player 1 score"
                                  value={recordScore1}
                                  onChange={(e) => setRecordScore1(e.target.value)}
                                  className="w-full rounded-md border border-line px-3 py-2 font-mono text-sm"
                                />
                                <input
                                  type="number"
                                  placeholder="Player 2 score"
                                  value={recordScore2}
                                  onChange={(e) => setRecordScore2(e.target.value)}
                                  className="w-full rounded-md border border-line px-3 py-2 font-mono text-sm"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => submitRecord(match)} disabled={busy} className="rounded-md bg-accent-green px-3 py-2 text-sm font-medium text-surface disabled:opacity-50">
                                  Submit
                                </button>
                                <button onClick={closePanel} className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {isPanelHere && panel?.type === 'advance' && (
                            <div className="ml-7 flex flex-col gap-2 rounded-md border border-line bg-bg p-3">
                              <div className="flex flex-col gap-1 text-sm text-ink">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`advance-winner-${match.match_id}`}
                                    checked={!!match.player1_id && advanceWinnerId === match.player1_id}
                                    onChange={() => setAdvanceWinnerId(match.player1_id ?? '')}
                                  />
                                  {match.player1_name ?? 'TBD'}
                                </label>
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`advance-winner-${match.match_id}`}
                                    checked={!!match.player2_id && advanceWinnerId === match.player2_id}
                                    onChange={() => setAdvanceWinnerId(match.player2_id ?? '')}
                                  />
                                  {match.player2_name ?? 'TBD'}
                                </label>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => submitAdvance(match)} disabled={busy} className="rounded-md bg-accent-green px-3 py-2 text-sm font-medium text-surface disabled:opacity-50">
                                  Confirm
                                </button>
                                <button onClick={closePanel} className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {isPanelHere && panel?.type === 'replace' && (
                            <div className="ml-7 flex flex-col gap-2 rounded-md border border-line bg-bg p-3">
                              <div className="flex flex-col gap-1 text-sm text-ink">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`replace-old-${match.match_id}`}
                                    checked={!!match.player1_id && replaceOldId === match.player1_id}
                                    onChange={() => setReplaceOldId(match.player1_id ?? '')}
                                  />
                                  Replace {match.player1_name ?? 'TBD'}
                                </label>
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`replace-old-${match.match_id}`}
                                    checked={!!match.player2_id && replaceOldId === match.player2_id}
                                    onChange={() => setReplaceOldId(match.player2_id ?? '')}
                                  />
                                  Replace {match.player2_name ?? 'TBD'}
                                </label>
                              </div>
                              <select
                                value={replaceNewId}
                                onChange={(e) => setReplaceNewId(e.target.value)}
                                className="rounded-md border border-line px-3 py-2 text-sm"
                              >
                                <option value="">Select replacement</option>
                                {eligibleReplacements.map((p) => (
                                  <option key={p.player_id} value={p.player_id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                              <div className="flex gap-2">
                                <button onClick={() => submitReplace(match)} disabled={busy} className="rounded-md bg-accent-green px-3 py-2 text-sm font-medium text-surface disabled:opacity-50">
                                  Confirm
                                </button>
                                <button onClick={closePanel} className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {actionMessage?.matchId === match.match_id && (
                            <p className={`ml-7 text-sm ${actionMessage.error ? 'text-corner-red' : 'text-muted'}`}>{actionMessage.text}</p>
                          )}
                        </div>
                      );
                    })}
                </BracketList>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Build, lint, visual check, commit**

Run: `npm run build && npm run lint` — both clean.
Manual check: matches within a round show a vertical connector line with colored dots (gray=scheduled, blue=in-progress, green=completed) and the score, when present, renders in monospace — this is the one page in the whole app using the Bracket Board treatment.

```bash
git add "src/app/organizer/batches/[id]/manage/page.tsx"
git commit -m "feat: design system rollout — organizer batch-manage (Bracket Board treatment)"
```

---

### Task 9: Organizer attendance/QR pages — create-list, scan-attendance, scan-list, rapid-mode

**Files:**
- Modify: `src/app/organizer/events/[id]/lists/create/page.tsx`
- Modify: `src/app/organizer/events/[id]/scan-attendance/page.tsx`
- Modify: `src/app/organizer/lists/[id]/scan/page.tsx`
- Modify: `src/app/organizer/events/[id]/rapid-mode/page.tsx`

**Interfaces:**
- Consumes: `Card`, `BracketList`, `BracketRow` from Task 1. Rapid-mode's player roster is the second (and last) place `BracketList`/`BracketRow` is used — per the spec, this table genuinely is the sequence being built into a bracket.

- [ ] **Step 1: Restyle the create-attendance-list page**

Replace the full contents of `src/app/organizer/events/[id]/lists/create/page.tsx`:

```tsx
'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { organizerApi } from '@/lib/api/organizer.api';
import { Card } from '@/lib/ui/Card';
import type { AttendanceList } from '@/lib/types';

const MODES = ['Enter', 'Leave', 'Lunch', 'Other'];

export default function CreateAttendanceListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [purpose, setPurpose] = useState('');
  const [mode, setMode] = useState(MODES[0]);
  const [uniqueOnly, setUniqueOnly] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [lists, setLists] = useState<AttendanceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  async function refreshLists() {
    const res = await organizerApi.getAttendanceLists(id);
    if (res.success && res.data) {
      setLists(res.data);
      setListError(null);
    } else {
      setListError(res.message || 'Could not load past lists');
    }
  }

  useEffect(() => {
    organizerApi
      .getAttendanceLists(id)
      .then((res) => {
        if (res.success && res.data) {
          setLists(res.data);
          setListError(null);
        } else {
          setListError(res.message || 'Could not load past lists');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!purpose.trim()) {
      setError('Purpose is required.');
      return;
    }

    setSubmitting(true);
    const res = await organizerApi.createAttendanceList({
      event_id: id,
      purpose: purpose.trim(),
      mode,
      unique_only: uniqueOnly,
    });
    setSubmitting(false);

    if (res.success) {
      setMessage('Attendance list created.');
      setPurpose('');
      setMode(MODES[0]);
      setUniqueOnly(true);
      refreshLists();
    } else {
      setError(res.message || 'Could not create attendance list');
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-ink">Create Attendance List</h1>

      <Card as="div" className="flex flex-col gap-4">
        <form onSubmit={handleSubmit} className="contents">
          <label className="flex flex-col gap-1 text-sm text-ink">
            Purpose
            <input value={purpose} onChange={(e) => setPurpose(e.target.value)} className="rounded-md border border-line px-3 py-2" />
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink">
            Mode
            <select value={mode} onChange={(e) => setMode(e.target.value)} className="rounded-md border border-line px-3 py-2">
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={uniqueOnly} onChange={(e) => setUniqueOnly(e.target.checked)} />
            Unique scan per player
          </label>

          {error && <p className="text-corner-red">{error}</p>}
          {message && <p className="text-muted">{message}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-accent-green px-3 py-2 text-sm font-medium text-surface disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create list'}
          </button>
        </form>
      </Card>

      <h2 className="mb-3 mt-6 text-sm font-semibold text-muted">Past lists</h2>

      {loading ? (
        <p className="text-muted">Loading lists…</p>
      ) : (
        <>
          {listError && <p className="mb-3 text-corner-red">{listError}</p>}

          {lists.length === 0 ? (
            <p className="text-sm text-muted">No attendance lists yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {lists.map((l) => (
                <Card as="li" key={l.list_id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-ink">{l.purpose}</div>
                      <div className="text-sm text-muted">{l.mode}</div>
                      <div className="mt-1 text-xs font-medium text-muted">{l.scan_count ?? 0} scans</div>
                      {l.created_at && <div className="text-xs text-muted">{new Date(l.created_at).toLocaleDateString()}</div>}
                    </div>
                    <Link href={`/organizer/lists/${l.list_id}/scan`} className="shrink-0 rounded-md bg-accent-green px-3 py-1.5 text-xs font-semibold text-surface">
                      Scan
                    </Link>
                  </div>
                </Card>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
```

(Same `Card as="div"` + inner plain `<form className="contents">` note as Task 6 Step 2 applies here — swap to a plain `<form>` element with the card's classes directly if that reads more simply during implementation.)

- [ ] **Step 2: Restyle the scan-attendance page**

Replace the full contents of `src/app/organizer/events/[id]/scan-attendance/page.tsx`:

```tsx
'use client';

import { use, useState } from 'react';
import { organizerApi } from '@/lib/api/organizer.api';
import { QrScanner } from '@/lib/qr/QrScanner';
import { Card } from '@/lib/ui/Card';

export default function ScanAttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);

  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleScan(qrData: string) {
    if (busy || result) return;
    setBusy(true);
    const res = await organizerApi.scanAttendance(qrData, eventId);
    setBusy(false);
    setResult({ ok: res.success, message: res.success ? 'Attendance marked!' : res.message || 'Failed to mark attendance' });
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-lg font-bold text-ink">Scan attendance</h1>

      {!result && <QrScanner onScan={handleScan} active={!busy} />}

      {result && (
        <Card accent={result.ok ? 'green' : 'red'} className="mt-4">
          <p className="mb-3 text-sm font-medium text-ink">{result.message}</p>
          <button onClick={() => setResult(null)} className="rounded-md bg-accent-green px-3 py-2 text-xs font-medium text-surface">
            {result.ok ? 'Scan more' : 'Try again'}
          </button>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Restyle the scan-list page**

Replace the full contents of `src/app/organizer/lists/[id]/scan/page.tsx`:

```tsx
'use client';

import { use, useEffect, useRef, useState } from 'react';
import { organizerApi } from '@/lib/api/organizer.api';
import { QrScanner } from '@/lib/qr/QrScanner';

interface ScannedEntry {
  key: string;
  name: string;
  timestamp: string;
  status: 'success' | 'duplicate' | 'error';
  message: string;
}

export default function ScanListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: listId } = use(params);

  const [recentScans, setRecentScans] = useState<ScannedEntry[]>([]);
  const [scanCount, setScanCount] = useState(0);
  const [lastResult, setLastResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const nextKey = useRef(0);

  useEffect(() => {
    organizerApi.getAttendanceListScans(listId).then((res) => {
      if (res.success && res.data) {
        setRecentScans(
          res.data.map((s) => ({
            key: `initial-${nextKey.current++}`,
            name: s.player_name,
            timestamp: new Date(s.scanned_at).toLocaleTimeString(),
            status: 'success' as const,
            message: 'Already recorded',
          })),
        );
        setScanCount(res.data.length);
      }
    });
  }, [listId]);

  async function handleScan(qrData: string) {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);
    setLastResult(null);

    const res = await organizerApi.scanForList(listId, qrData);
    const ok = res.success;
    const msg = res.message || (ok ? 'Scanned successfully' : 'Scan failed');
    setLastResult({ ok, msg });
    if (ok) setScanCount((c) => c + 1);

    const playerName = res.data?.player_name || qrData.slice(0, 20);
    setRecentScans((prev) => [
      {
        key: `scan-${nextKey.current++}`,
        name: playerName,
        timestamp: new Date().toLocaleTimeString(),
        status: ok ? 'success' : msg.toLowerCase().includes('already') ? 'duplicate' : 'error',
        message: msg,
      },
      ...prev.slice(0, 49),
    ]);

    setProcessing(false);
    setTimeout(() => setScanned(false), 1500);
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-lg font-bold text-ink">Scan list</h1>
        <span className="text-sm text-muted">{scanCount} scans recorded</span>
      </div>

      <QrScanner onScan={handleScan} active={!scanned} />

      {lastResult && (
        <div className={`mt-4 rounded-md p-3 text-sm font-medium text-surface ${lastResult.ok ? 'bg-accent-green' : 'bg-corner-red'}`}>
          {lastResult.msg}
        </div>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-muted">Recent scans</h2>
        {recentScans.length === 0 ? (
          <p className="text-sm text-muted">No scans yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {recentScans.map((s) => (
              <li
                key={s.key}
                className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                  s.status === 'success'
                    ? 'border-accent-green/30 bg-accent-green/10'
                    : s.status === 'duplicate'
                      ? 'border-status-pending/30 bg-status-pending/10'
                      : 'border-corner-red/30 bg-corner-red/10'
                }`}
              >
                <div>
                  <div className="font-medium text-ink">{s.name}</div>
                  <div className="text-xs text-muted">{s.message}</div>
                </div>
                <span className="text-xs text-muted">{s.timestamp}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Restyle the rapid-mode page**

Replace the full contents of `src/app/organizer/events/[id]/rapid-mode/page.tsx`:

```tsx
'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { organizerApi } from '@/lib/api/organizer.api';
import { QrScanner } from '@/lib/qr/QrScanner';
import { Card } from '@/lib/ui/Card';
import { BracketList, BracketRow } from '@/lib/ui/Bracket';
import {
  TANDING_AGE_CATEGORIES,
  SENI_AGE_CATEGORIES,
  WEIGHT_CATEGORIES_BY_AGE,
  SIMPLE_WEIGHT_AGES,
  SENI_CATEGORIES,
} from '@/lib/player/registrationCategories';

interface ScannedPlayer {
  player_id: string;
  player_name: string;
  state?: string;
  district?: string;
  sendToBye: boolean;
}

export default function RapidModePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const router = useRouter();

  const [eventCategory, setEventCategory] = useState<'' | 'TANDING' | 'SENI'>('');
  const [ageCategory, setAgeCategory] = useState('');
  const [weightCategory, setWeightCategory] = useState('');
  const [weightText, setWeightText] = useState('');
  const [seniType, setSeniType] = useState('');
  const [categoryLocked, setCategoryLocked] = useState(false);

  const [paused, setPaused] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const [players, setPlayers] = useState<ScannedPlayer[]>([]);
  const [batchName, setBatchName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ageOptions = eventCategory === 'TANDING' ? TANDING_AGE_CATEGORIES : SENI_AGE_CATEGORIES;
  const useWeightSelect = eventCategory === 'TANDING' && !!ageCategory && !SIMPLE_WEIGHT_AGES.includes(ageCategory);
  const weightValue = useWeightSelect ? weightCategory : weightText.trim();

  function categoryLabel(): string {
    const parts = ['On-spot', eventCategory, ageCategory, weightValue, seniType].filter(Boolean);
    return parts.join(' | ');
  }

  function resetCategory() {
    if (!window.confirm('Change category? This clears all scanned players.')) return;
    setPlayers([]);
    setCategoryLocked(false);
    setEventCategory('');
    setAgeCategory('');
    setWeightCategory('');
    setWeightText('');
    setSeniType('');
  }

  async function handleScan(qrData: string) {
    if (scanning) return;
    setScanning(true);
    setScanMessage(null);
    const res = await organizerApi.getPlayerByQR(qrData, eventId);
    setScanning(false);

    if (!res.success || !res.data) {
      setScanMessage(res.message || 'Player not found');
      return;
    }
    if (players.some((p) => p.player_id === res.data!.id)) {
      setScanMessage('This player is already in the batch.');
      return;
    }
    if (players.length === 0) setCategoryLocked(true);
    setPlayers((prev) => [
      ...prev,
      {
        player_id: res.data!.id,
        player_name: res.data!.player_name,
        state: res.data!.state,
        district: res.data!.district,
        sendToBye: false,
      },
    ]);
    setScanMessage(`Added: ${res.data.player_name}`);
  }

  function toggleBye(playerId: string) {
    setPlayers((prev) => prev.map((p) => (p.player_id === playerId ? { ...p, sendToBye: !p.sendToBye } : p)));
  }
  function removePlayer(playerId: string) {
    setPlayers((prev) => {
      const next = prev.filter((p) => p.player_id !== playerId);
      if (next.length === 0) setCategoryLocked(false);
      return next;
    });
  }
  const selectAll = () => setPlayers((prev) => prev.map((p) => ({ ...p, sendToBye: false })));
  const deselectAll = () => setPlayers((prev) => prev.map((p) => ({ ...p, sendToBye: true })));

  const activeCount = players.filter((p) => !p.sendToBye).length;
  const byesRequired = activeCount < 2 ? 0 : Math.pow(2, Math.ceil(Math.log2(activeCount))) - activeCount;

  async function handleCreateBatch() {
    const activePlayers = players.filter((p) => !p.sendToBye);
    if (activePlayers.length < 2) {
      setError('Need at least 2 active players to create a batch.');
      return;
    }
    setCreating(true);
    setError(null);
    const label = categoryLabel();
    const res = await organizerApi.createBatch({
      event_id: eventId,
      batch_name: batchName.trim() || label,
      category_label: label,
      player_ids: activePlayers.map((p) => p.player_id),
    });
    setCreating(false);
    if (res.success) {
      router.push(`/organizer/events/${eventId}/batches`);
    } else {
      setError(res.message || 'Could not create batch');
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-lg font-bold text-ink">Rapid mode</h1>

      <Card className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">Category</h2>
          {categoryLocked && (
            <button onClick={resetCategory} className="text-xs font-medium text-corner-red underline">
              Change category
            </button>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <select
            value={eventCategory}
            disabled={categoryLocked}
            onChange={(e) => {
              setEventCategory(e.target.value as 'TANDING' | 'SENI');
              setAgeCategory('');
              setWeightCategory('');
              setWeightText('');
              setSeniType('');
            }}
            className="rounded-md border border-line px-3 py-2 disabled:opacity-50"
          >
            <option value="">Event category</option>
            <option value="TANDING">TANDING</option>
            <option value="SENI">SENI</option>
          </select>

          {eventCategory && (
            <select
              value={ageCategory}
              disabled={categoryLocked}
              onChange={(e) => {
                setAgeCategory(e.target.value);
                setWeightCategory('');
                setWeightText('');
              }}
              className="rounded-md border border-line px-3 py-2 disabled:opacity-50"
            >
              <option value="">Age category</option>
              {ageOptions.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          )}

          {eventCategory === 'TANDING' &&
            ageCategory &&
            (useWeightSelect ? (
              <select
                value={weightCategory}
                disabled={categoryLocked}
                onChange={(e) => setWeightCategory(e.target.value)}
                className="rounded-md border border-line px-3 py-2 disabled:opacity-50"
              >
                <option value="">Weight category</option>
                {(WEIGHT_CATEGORIES_BY_AGE[ageCategory] ?? []).map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={weightText}
                disabled={categoryLocked}
                onChange={(e) => setWeightText(e.target.value)}
                placeholder="Weight (kg)"
                className="rounded-md border border-line px-3 py-2 disabled:opacity-50"
              />
            ))}

          {eventCategory === 'SENI' && ageCategory && (
            <select
              value={seniType}
              disabled={categoryLocked}
              onChange={(e) => setSeniType(e.target.value)}
              className="rounded-md border border-line px-3 py-2 disabled:opacity-50"
            >
              <option value="">Seni type</option>
              {SENI_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
        </div>
        {(eventCategory || ageCategory) && <p className="mt-3 text-xs text-muted">{categoryLabel()}</p>}
      </Card>

      <Card className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">Scan players</h2>
          <button onClick={() => setPaused((p) => !p)} className="text-xs font-medium text-accent-green underline">
            {paused ? 'Resume camera' : 'Pause camera'}
          </button>
        </div>
        {!paused ? <QrScanner onScan={handleScan} active={!scanning} /> : <p className="text-sm text-muted">Scanner paused.</p>}
        {scanMessage && <p className="mt-2 text-sm text-muted">{scanMessage}</p>}
      </Card>

      <Card className="mb-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-muted">
            Players ({players.length}) — {activeCount} active
          </h2>
          <div className="flex gap-3">
            <button onClick={selectAll} className="text-xs font-medium text-accent-green underline">
              Select all
            </button>
            <button onClick={deselectAll} className="text-xs font-medium text-accent-green underline">
              Deselect all
            </button>
          </div>
        </div>
        {byesRequired > 0 && <p className="mb-2 text-sm text-muted">Byes required: {byesRequired}</p>}
        {players.length === 0 ? (
          <p className="text-sm text-muted">No players scanned yet.</p>
        ) : (
          <BracketList>
            {players.map((p, i) => (
              <BracketRow key={p.player_id} number={i + 1} dotColor={p.sendToBye ? 'bg-status-pending' : 'bg-accent-green'}>
                <div className="flex flex-1 items-center justify-between gap-2 text-sm">
                  <div>
                    <span className="font-medium text-ink">{p.player_name}</span>
                    <span className="ml-2 text-xs text-muted">
                      {[p.state, p.district].filter(Boolean).join(' · ') || '-'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 text-xs text-muted">
                      <input type="checkbox" checked={p.sendToBye} onChange={() => toggleBye(p.player_id)} />
                      BYE
                    </label>
                    <button onClick={() => removePlayer(p.player_id)} className="text-xs text-corner-red underline">
                      Remove
                    </button>
                  </div>
                </div>
              </BracketRow>
            ))}
          </BracketList>
        )}
      </Card>

      <Card>
        <label className="mb-3 flex flex-col gap-1 text-sm text-ink">
          Batch name (optional)
          <input
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            placeholder={categoryLabel() || 'Custom Batch'}
            className="rounded-md border border-line px-3 py-2"
          />
        </label>
        {error && <p className="mb-2 text-sm text-corner-red">{error}</p>}
        <button
          onClick={handleCreateBatch}
          disabled={creating || activeCount < 2}
          className="rounded-md bg-accent-green px-3 py-2 text-sm font-medium text-surface disabled:opacity-50"
        >
          {creating ? 'Creating…' : `Create batch & go to manage (${activeCount} players)`}
        </button>
      </Card>
    </div>
  );
}
```

Note: rapid-mode's roster switched from a `<table>` to `BracketList`/`BracketRow` (dropping the State/District columns into a single inline sub-line) — this is a genuine layout change from the pre-design-system version, not just a class swap, because the spec explicitly names this table as a Bracket Board context. If a literal table with the tree-line down the side reads better once real data is in front of it, that's a reasonable on-the-spot adjustment; the important constraint from the spec is dot-per-row + tabular numbering, not the exact markup shape.

- [ ] **Step 5: Build, lint, visual check, commit**

Run: `npm run build && npm run lint` — both clean.
Manual check: rapid-mode's scanned-player list shows the same tree-line/dot treatment as batch-manage's match list (green dot = active, amber = BYE) — this confirms the Bracket Board treatment is consistent across both of its two intended uses.

```bash
git add "src/app/organizer/events/[id]/lists/create/page.tsx" "src/app/organizer/events/[id]/scan-attendance/page.tsx" "src/app/organizer/lists/[id]/scan/page.tsx" "src/app/organizer/events/[id]/rapid-mode/page.tsx"
git commit -m "feat: design system rollout — organizer QR/attendance pages (complete)"
```

---

## Done criteria

All 9 tasks complete, each with its own passing build/lint/visual-checklist/commit. At that point every page in `sports-web` reflects `docs/M7_DESIGN_SYSTEM.md`, and the rollout is finished — no further design-system work is pending unless the checklist notes above (certificate palette, `Card as="form"` awkwardness, bracket line offsets, rapid-mode table-vs-bracket-list) surfaced something worth a follow-up decision.
