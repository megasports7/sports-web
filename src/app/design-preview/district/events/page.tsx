'use client';

/**
 * DESIGN PREVIEW ONLY — district secretary Events page (frontend, mock
 * data). Same kit as the dashboard/players previews; nothing is wired.
 */
import {
  PreviewShell,
  SectionCard,
  StatCard,
} from '@/components/design-preview/ui';

const EVENTS = [
  { name: 'admin-dsc-event', date: 'Nov 2026 · NTR', batches: 2, matches: '5/9 decided', pending: 3, regs: 12 },
  { name: 'org3', date: 'Dec 2026 · NTR', batches: 1, matches: '4/4 decided', pending: 0, regs: 8 },
  { name: 'winter-cup-ntr', date: 'Jan 2027 · NTR', batches: 0, matches: '—', pending: 5, regs: 5 },
];

export default function DistrictEventsPreview() {
  return (
    <PreviewShell
      roleLabel="District Secretary"
      scopeLabel="NTR district"
      accentVar="var(--color-role-district-secretary)"
      nav={['Dashboard', 'Players', 'Events', 'Profile']}
      active="Events"
    >
      <div className="head">
        <div>
          <h1>Events</h1>
          <p>Events assigned to NTR district — 3 in scope.</p>
        </div>
        <span className="scope-pill">NTR district</span>
      </div>

      <div className="stats">
        <StatCard label="In scope" value="3" hint="Assigned to NTR" />
        <StatCard label="Need review" value="2" hint="Pending approvals" alert />
        <StatCard label="Fully decided" value="1" hint="Ready for certificates" />
      </div>

      <SectionCard title="All events" actionLabel="—">
        <div className="search-row">
          <span className="search">Search events…</span>
          <span className="chip on">All</span>
          <span className="chip">Active</span>
          <span className="chip">Pending review</span>
        </div>
        {EVENTS.map((e) => (
          <div key={e.name} className="event-row">
            <span className={`bar ${e.pending > 0 ? 'warn' : 'ok'}`} />
            <div className="event-main">
              <strong>{e.name}</strong>
              <span>
                {e.date} · {e.regs} registrations · {e.batches} batches · {e.matches}
              </span>
            </div>
            <span className="pending">{e.pending > 0 ? `${e.pending} pending` : 'Clear'}</span>
            <span className="open">Open →</span>
          </div>
        ))}
      </SectionCard>

      <style jsx>{`
        .head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .head h1 {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.3px;
          margin: 0;
        }
        .head p {
          margin: 4px 0 0;
          font-size: 14.5px;
          color: var(--color-muted);
        }
        .scope-pill {
          font-size: 12px;
          font-weight: 700;
          border-radius: 999px;
          padding: 4px 12px;
          background: color-mix(in srgb, var(--color-role-district-secretary) 12%, transparent);
          color: var(--color-role-district-secretary);
          white-space: nowrap;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 10px;
        }
        .search-row {
          display: flex;
          gap: 6px;
          align-items: center;
          margin-bottom: 10px;
        }
        .search {
          flex: 1;
          border: 1px solid var(--color-line);
          border-radius: 8px;
          padding: 7px 11px;
          font-size: 13.5px;
          color: var(--color-muted);
        }
        .chip {
          border: 1px solid var(--color-line);
          border-radius: 999px;
          padding: 5px 13px;
          font-size: 13px;
          font-weight: 600;
          color: var(--color-muted);
          white-space: nowrap;
        }
        .chip.on {
          background: var(--color-ink);
          color: #fff;
          border-color: var(--color-ink);
        }
        .event-row {
          display: flex;
          gap: 10px;
          align-items: center;
          padding: 12px 4px;
          border-bottom: 1px solid var(--color-line);
        }
        .event-row:last-child {
          border-bottom: none;
        }
        .bar {
          width: 4px;
          align-self: stretch;
          border-radius: 4px;
        }
        .bar.warn {
          background: var(--color-status-pending);
        }
        .bar.ok {
          background: var(--color-accent-green);
        }
        .event-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .event-main strong {
          font-size: 15.5px;
        }
        .event-main span {
          font-size: 13px;
          color: var(--color-muted);
        }
        .pending {
          font-size: 13px;
          font-weight: 700;
          color: var(--color-muted);
          white-space: nowrap;
        }
        .open {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--color-accent-blue);
          white-space: nowrap;
        }
      `}</style>
    </PreviewShell>
  );
}
