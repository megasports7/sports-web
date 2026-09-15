# M7 — Web Application Design System

## Context

`docs/M7_CONTRACT.md` covers architecture and backend — Phases 0 through 3.5 are complete and proven there. This document covers **visual design only**: no data flow, no routes, no API changes. It exists because the visual pass was deliberately deferred until both roles' backends were proven (per M7_CONTRACT.md's own timing notes on Phases 2/3), and that point has now been reached.

Direction was settled through a visual brainstorming session: three mocked directions were compared side by side in a browser, not decided from text descriptions alone.

## Subject grounding

This app manages pencak silat (Indonesian martial arts) tournaments — brackets, weight/age categories, matches scored red-corner-vs-blue-corner, certificates, attendance. Design choices below are grounded in that real subject matter, not generic "sports app" conventions: red/blue corner tagging is authentic to how the sport is actually scored; the bracket tree-structure is real tournament data (round/match numbers), not a decorative flourish.

## The merge rule

Two directions were shown; the approved direction is a deliberate merge of both, applied to different content, not a single compromise blend:

- **Match Day** (energetic, closest to mobile's existing visual DNA) is the **default treatment** for everything: dashboards, lists, forms, profile, certificates, ID cards.
- **Bracket Board** (structural, status-only color, tabular numerals) applies **specifically where the data is genuinely a bracket or ordered sequence**: organizer's batch-manage page (matches grouped by round), player's matches page, rapid-mode's scanned-player roster table.
- Both share the *same* foundation — color tokens, card style, borders, type. The difference is which structural devices layer on top where the content actually earns them. This is one design system, not two apps stitched together.

**Rule of thumb for any new page:** if the content is a literal bracket/ordered list of rounds-and-matches, it gets tree-line connectors and tabular mono scores. Everything else gets plain flat cards with a left-edge accent bar. When in doubt, default to Match Day.

## Color tokens

| Name | Hex | Role |
|---|---|---|
| `ink` | `#16181D` | Primary text |
| `muted` | `#6B7280` | Secondary text |
| `bg` | `#FAFAF9` | Page background — warm off-white, never stark `#fff` |
| `surface` | `#FFFFFF` | Card background |
| `line` | `#E7E5E0` | Borders — warm-toned, not cold gray |
| `accent-blue` | `#0091EA` | Primary interactive color; player-role continuity with mobile's `#0ea5e9`; also the blue-corner match tag and the "in-progress" status color |
| `accent-green` | `#00C853` | Organizer-role continuity with mobile's `#22c55e`/`#00E676`; also "completed"/success status |
| `accent-violet` | `#6C3CE9` | Tertiary — sparing use only (a certificate/special highlight, never a default button color) |
| `corner-red` | `#E8492D` | Red-corner match tag only — not used anywhere else |
| `status-pending` | `#D4A017` | "Pending"/"needs action" status only |

**Rule:** color is functional, never decorative. Every use ties to a real meaning — role, match status, or corner. No gradients, no color used just because it looks nice. This is a deliberate departure from mobile's own gradient-heavy treatment, not an oversight — see M7_CONTRACT.md's original architecture notes on "inspired by, not copied."

## Typography

- **Space Grotesk** (loaded via `next/font/google`, replacing the create-next-app default Geist) — every heading, UI label, and body text. One family carries the whole app's voice. Chosen deliberately over the default Geist specifically so the app doesn't read as an unstyled template.
- **JetBrains Mono** (via `next/font/google`) — reserved *only* for tabular numeric contexts: match scores (`3–1`) and round/match numbers (`01`, `02`). Never for names, labels, categories, or general small text — monospace-for-everything-small is a generic tell; monospace-for-things-that-must-align-as-columns is the actual justified use, and the only one used here.
- No separate display face — Space Grotesk at larger weights/sizes carries headline moments (e.g. dashboard stat numbers), consistent with "you don't need a different typeface for display vs. body."

## Layout & components

- **Alignment:** left-aligned throughout. This is a utility dashboard, not a marketing site — no centered hero treatment anywhere.
- **Cards:** flat, single 1px `line`-colored border. No soft drop-shadow (the generic "SaaS-card kit" look — every card the same rounded-corner-plus-shadow-plus-gradient-wash — is explicitly rejected). Status or role is conveyed by a 3px left-edge accent bar instead.
- **Bracket contexts only:** an absolute-positioned 1px vertical connector line with a small colored dot per row (status-colored), tabular mono numerals right-aligned for scores.
- **Nav** (`PlayerNav`/`OrganizerNav`, already built in Phases 1–3): restyle with these tokens in place — active-tab and sign-out treatment updated, no structural/behavioral change.
- **No new dependency.** Plain Tailwind utility classes plus the two Google Fonts already covers everything above — no component library (shadcn/ui or similar), consistent with this project's "no heavy engineering" stance through every prior phase.

## Principles

1. **Color is functional, not decorative** — every accent ties to role, status, or corner; nothing is colored just for visual interest.
2. **The bracket is real, so it gets to look like one** — tree-structure and tabular numerals appear only where the underlying data genuinely is a bracket; everywhere else stays a plain card.
3. **Warm-neutral foundation, not stark or cold** — off-white over pure white, warm-toned borders and muted text, avoiding the generic gray-SaaS read.
4. **One typeface for voice, one for data** — Space Grotesk carries every word in the app; JetBrains Mono appears only where digits must align in a column.

## Rollout — explicitly not all pages at once

Per explicit direction during this session: build **one pilot page first** — the player dashboard, the smallest and most representative surface for the default Match Day treatment — and get it confirmed in real, running code before touching anything else. Only after that confirmation does the writing-plans implementation plan sequence the remaining ~23 pages (grouped sensibly: player role, then organizer role, with bracket-context pages as their own checkpoint given the extra structural component involved).

This document's job is to settle every token and pattern decision *before* that rollout starts, so applying it to each subsequent page is mechanical repetition of an already-approved system, not a fresh design decision every time.

## Out of scope for this pass

- No new UI/component library.
- No dark mode — mobile is light-only; matching that for v1.
- No change to data flow, routes, or the API layer. This is a restyle of pages whose backend behavior is already built and proven (M7_CONTRACT.md Phases 0–3.5) — functionality does not change.
