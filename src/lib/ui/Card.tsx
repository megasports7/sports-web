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
