'use client';

import Link from 'next/link';

const CARDS = [
  {
    href: '/prototype-a',
    name: 'Concept A — Premium Sports Platform',
    summary:
      'Light neutral canvas, deep-navy text, electric-blue primary action with a restrained ember accent. Refined profile header, six semantic stat tiles, structured VS match cards, spacious two-column grid.',
    tags: ['Light', 'Grid', 'Stat tiles', 'Structured match cards'],
  },
  {
    href: '/prototype-b',
    name: 'Concept B — Editorial Competition Hub',
    summary:
      'Dark competition-first canvas. Prominent welcome/profile area, a visually emphasised NEXT BOUT hero, compact mono statistic strip, prioritised quick actions, editorial type scale.',
    tags: ['Dark', 'Editorial', 'Featured next bout', 'Compact stats'],
  },
  {
    href: '/prototype-c',
    name: 'Concept C — Matchday Poster / Ticket Stub',
    summary:
      'Cream paper canvas, giant fight-night typography, ticket-stub next bout with perforation, X-style scoreboard strip, Duolingo-style league ladder, Komoot-style stamp trophy cabinet.',
    tags: ['Poster', 'Ticket stub', 'Scoreboard', 'League ladder'],
  },
  {
    href: '/prototype-d',
    name: 'Concept D — Season Clubhouse (balanced)',
    summary:
      'Warm-neutral canvas, navy season band with progress ring, featured next bout, grouped schedule tabs, standings-style record table, profile + progress + honours rail. Restrained teal accent.',
    tags: ['Balanced', 'Standings table', 'Progress rail', 'Recommended'],
  },
  {
    href: '/prototype-d/events',
    name: 'Concept D — Events (player)',
    summary:
      'Same Season Clubhouse language applied to the real Events page: search, All/Open/Registered/Pending chips with counts, date/venue/category rows, Register CTA, rejected re-register hint.',
    tags: ['Concept D', 'Events', 'Filters', 'Register'],
  },
  {
    href: '/prototype-d/matches',
    name: 'Concept D — Matches (player)',
    summary:
      'Same language applied to the real Matches page: Next-bout feature, All/Upcoming/Live/Completed chips with counts, You-vs-opponent cards, scores on completed bouts.',
    tags: ['Concept D', 'Matches', 'VS cards', 'Scores'],
  },
  {
    href: '/login/prototype',
    name: 'Login prototype (already reviewed)',
    summary:
      'Split-screen login direction built earlier in this redesign pass — shares the same navy/blue/ember language so the dashboard and the sign-in read as one product.',
    tags: ['Split-screen', 'Sports identity'],
  },
];

export default function PrototypeIndexPage() {
  return (
    <div className="idx">
      <header className="idx-head">
        <p className="eyebrow">MegaSportsX · UI redesign review</p>
        <h1>Design prototypes</h1>
        <p className="lede">
          Isolated preview routes for the front-end redesign. Each concept is fully interactive — use
          the toolbar in each page to switch <strong>populated / empty / loading / error</strong> states
          and <strong>desktop / mobile</strong> viewports. Production routes are untouched.
        </p>
      </header>

      <div className="cards">
        {CARDS.map((c) => (
          <Link key={c.href} href={c.href} className="card">
            <h2>{c.name}</h2>
            <p>{c.summary}</p>
            <div className="tags">
              {c.tags.map((t) => (
                <span className="tag" key={t}>{t}</span>
              ))}
            </div>
            <span className="go">Open prototype →</span>
          </Link>
        ))}
      </div>

      <p className="foot">
        All prototype pages render sample data only and make no backend calls. Real routes remain at{' '}
        <Link href="/login">/login</Link> and <Link href="/player">/player</Link>.
      </p>

      <style jsx>{`
        .idx { max-width: 1080px; margin: 0 auto; padding: 48px 24px 64px; }
        .eyebrow {
          font-family: var(--font-mono); font-size: 11px; font-weight: 700;
          letter-spacing: 2px; text-transform: uppercase; color: var(--color-muted);
          margin: 0 0 8px;
        }
        h1 { font-size: 34px; font-weight: 800; letter-spacing: -0.6px; margin: 0 0 12px; }
        .lede { font-size: 15px; line-height: 1.6; color: var(--color-muted); max-width: 62ch; margin: 0 0 32px; }
        .lede :global(strong) { color: var(--color-ink); }
        .cards { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 900px) { .cards { grid-template-columns: repeat(3, 1fr); } }
        :global(.card) {
          display: flex; flex-direction: column; gap: 10px; text-decoration: none;
          background: var(--color-surface); border: 1px solid var(--color-line);
          border-radius: 16px; padding: 20px;
          transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
        }
        :global(.card:hover) {
          border-color: var(--color-accent-blue); transform: translateY(-2px);
          box-shadow: 0 14px 30px -18px rgba(22, 24, 29, 0.4);
        }
        .card h2 { font-size: 17px; font-weight: 800; margin: 0; }
        .card p { font-size: 13.5px; line-height: 1.6; color: var(--color-muted); margin: 0; }
        .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: auto; }
        .tag {
          font-family: var(--font-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.8px;
          text-transform: uppercase; color: var(--color-muted);
          border: 1px solid var(--color-line); border-radius: 999px; padding: 4px 9px;
        }
        .go { font-size: 13px; font-weight: 800; color: var(--color-accent-blue); }
        .foot { font-size: 12.5px; color: var(--color-muted); margin: 32px 0 0; }
        .foot :global(a) { color: var(--color-ink); font-weight: 700; }
      `}</style>
    </div>
  );
}
