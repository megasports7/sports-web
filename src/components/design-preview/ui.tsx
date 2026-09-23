'use client';

/**
 * DESIGN PREVIEW kit — reusable visual primitives for secretary dashboard
 * previews (mock data only). When a preview is approved, the real pages
 * adopt these primitives against live endpoints; until then nothing here
 * reads APIs, auth, or route params.
 */

export function PreviewShell({
  roleLabel,
  scopeLabel,
  accentVar,
  nav,
  active,
  children,
}: {
  roleLabel: string;
  scopeLabel: string;
  accentVar: string;
  nav: string[];
  active: string;
  children: React.ReactNode;
}) {
  return (
    <div className="shell">
      <div className="preview-banner">Design preview — mock data, buttons not wired</div>
      <div className="body">
        <aside className="side">
          <div className="brand">
            <span className="dot" />
            <div>
              <strong>{roleLabel}</strong>
              <span>{scopeLabel}</span>
            </div>
          </div>
          {nav.map((n) => (
            <span key={n} className={n === active ? 'item on' : 'item'}>
              {n}
            </span>
          ))}
          <span className="item sign">Sign out</span>
        </aside>
        <main className="main">{children}</main>
      </div>
      <style jsx>{`
        .shell {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .preview-banner {
          background: var(--color-ink);
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          text-align: center;
          padding: 6px 12px;
          letter-spacing: 0.3px;
        }
        .body {
          flex: 1;
          display: flex;
          align-items: stretch;
        }
        .side {
          width: 220px;
          flex-shrink: 0;
          background: var(--color-surface);
          border-right: 1px solid var(--color-line);
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .brand {
          display: flex;
          gap: 10px;
          align-items: center;
          padding: 4px 8px 14px;
        }
        .brand strong {
          display: block;
          font-size: 13.5px;
        }
        .brand span {
          font-size: 11.5px;
          color: var(--color-muted);
        }
        .dot {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: ${accentVar};
          flex-shrink: 0;
        }
        .item {
          border-radius: 9px;
          padding: 8px 12px;
          font-size: 13.5px;
          font-weight: 600;
          color: var(--color-muted);
          cursor: default;
        }
        .item.on {
          background: color-mix(in srgb, ${accentVar} 10%, transparent);
          color: ${accentVar};
        }
        .item.sign {
          margin-top: auto;
        }
        .main {
          flex: 1;
          min-width: 0;
          padding: 20px 28px 40px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          max-width: 1100px;
        }
        @media (max-width: 760px) {
          .side {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  alert = false,
  fraction,
}: {
  label: string;
  value: string;
  hint: string;
  alert?: boolean;
  fraction?: { value: number; total: number };
}) {
  const pct = fraction ? Math.round((fraction.value / fraction.total) * 100) : 0;
  return (
    <div className="stat">
      <span className="label">{label}</span>
      {fraction ? (
        <div className="fraction">
          <strong className={alert ? 'alert' : ''}>{fraction.value}</strong>
          <span>/ {fraction.total}</span>
        </div>
      ) : (
        <strong className={alert ? 'value alert' : 'value'}>{value}</strong>
      )}
      {fraction && (
        <span className="track">
          <span className="fill" style={{ width: `${pct}%` }} />
        </span>
      )}
      <span className="hint">{hint}</span>
      <style jsx>{`
        .stat {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 14px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: var(--color-muted);
        }
        .value {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .value.alert {
          color: var(--color-corner-red);
        }
        .fraction {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .fraction strong {
          font-size: 28px;
          font-weight: 800;
          line-height: 1;
          letter-spacing: -0.5px;
        }
        .fraction strong.alert {
          color: var(--color-corner-red);
        }
        .fraction span {
          font-size: 15px;
          font-weight: 700;
          color: var(--color-muted);
        }
        .track {
          height: 4px;
          border-radius: 999px;
          background: var(--color-line);
          overflow: hidden;
          margin-top: 5px;
        }
        .fill {
          display: block;
          height: 100%;
          border-radius: 999px;
          background: var(--color-accent-green);
        }
        .hint {
          font-size: 12px;
          color: var(--color-muted);
        }
      `}</style>
    </div>
  );
}

export function SectionCard({
  title,
  actionLabel,
  children,
}: {
  title: string;
  actionLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card">
      <div className="card-head">
        <h2>{title}</h2>
        <span className="action">{actionLabel} →</span>
      </div>
      {children}
      <style jsx>{`
        .card {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 14px;
          padding: 16px 18px;
        }
        .card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .card-head h2 {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: #3a3d45;
          margin: 0;
        }
        .action {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--color-accent-blue);
          cursor: default;
        }
      `}</style>
    </section>
  );
}

const PILL_STYLE: Record<string, { bg: string; fg: string }> = {
  pending: { bg: '#fef3c7', fg: '#92400e' },
  'pending review': { bg: '#fef3c7', fg: '#92400e' },
  approved: { bg: '#dcfce7', fg: '#166534' },
  completed: { bg: '#dcfce7', fg: '#166534' },
  active: { bg: '#dcfce7', fg: '#166534' },
  in_progress: { bg: '#e0f2fe', fg: '#075985' },
  scheduled: { bg: '#f1f5f9', fg: '#475569' },
  rejected: { bg: '#fee2e2', fg: '#991b1b' },
};

export function StatusPill({ status }: { status: string }) {
  const s = PILL_STYLE[status] ?? { bg: 'var(--color-line)', fg: 'var(--color-muted)' };
  return (
    <span className="pill">
      {status}
      <style jsx>{`
        .pill {
          display: inline-block;
          border-radius: 999px;
          padding: 2px 10px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
          background: ${s.bg};
          color: ${s.fg};
        }
      `}</style>
    </span>
  );
}
