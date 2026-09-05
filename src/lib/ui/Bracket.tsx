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
