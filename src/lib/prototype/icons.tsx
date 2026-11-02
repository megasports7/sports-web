/**
 * PROTOTYPE-ONLY icon family shared by the player-dashboard design concepts
 * (A: premium light, B: editorial dark).
 *
 * Deliberately hand-rolled inline SVG like the rest of the app (no icon
 * dependency was introduced, per the web AGENTS conventions): one 20x20 grid,
 * 1.5 stroke, currentColor, round caps/joins, explicit width/height on every
 * element so sizing never depends on stylesheet scoping.
 *
 * Colour comes from the parent (currentColor), so the same glyph reads
 * correctly on light and dark surfaces.
 */
type IconProps = { size?: number };

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function IconEvents({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <rect x="3" y="4.5" width="14" height="12" rx="2" {...stroke} />
      <path d="M3 8h14M7 3v3M13 3v3" {...stroke} />
    </svg>
  );
}

export function IconBout({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="11" r="6" {...stroke} />
      <path d="M10 7.6V11l2.6 1.6M8.6 2.6h2.8" {...stroke} />
    </svg>
  );
}

export function IconTrophy({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M6 3h8v4a4 4 0 0 1-8 0V3Z" {...stroke} />
      <path d="M6 4H3.6A1.6 1.6 0 0 0 3 7l2 1.6M14 4h2.4A1.6 1.6 0 0 1 17 7l-2 1.6" {...stroke} />
      <path d="M10 11v3.2M7.4 17h5.2" {...stroke} />
    </svg>
  );
}

export function IconMedal({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="12.4" r="4.6" {...stroke} />
      <path d="M7.6 8.2 6.2 3h7.6l-1.4 5.2" {...stroke} />
      <path d="M8.4 12.4h3.2" {...stroke} />
    </svg>
  );
}

export function IconStar({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M10 2.8l2.3 4.7 5.2.7-3.8 3.6.9 5.2-4.6-2.5-4.6 2.5.9-5.2L2.5 8.2l5.2-.7L10 2.8Z"
        {...stroke}
      />
    </svg>
  );
}

export function IconAward({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="8" r="5.2" {...stroke} />
      <path d="M10 5.6l1 2 2.2.3-1.6 1.5.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.5 2.2-.3 1-2Z" {...stroke} />
      <path d="M7.6 12.6 6.6 17.4l3.4-1.8 3.4 1.8-1-4.8" {...stroke} />
    </svg>
  );
}

export function IconIdCard({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <rect x="2.8" y="4.4" width="14.4" height="11.2" rx="2" {...stroke} />
      <circle cx="7.4" cy="9.2" r="1.7" {...stroke} />
      <path d="M5.2 13.6c.4-1.8 1.4-2.6 2.5-2.6s2.1.8 2.5 2.6M12.8 8.4h2.6M12.8 11h2.6" {...stroke} />
    </svg>
  );
}

export function IconProfile({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="7" r="3.3" {...stroke} />
      <path d="M3.8 17c.7-4 3.1-6.1 6.2-6.1s5.5 2.1 6.2 6.1" {...stroke} />
    </svg>
  );
}

export function IconPin({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 2.6c-3.1 0-5.6 2.4-5.6 5.6 0 4.2 5.6 9.2 5.6 9.2s5.6-5 5.6-9.2c0-3.2-2.5-5.6-5.6-5.6Z" {...stroke} />
      <circle cx="10" cy="8.1" r="2" {...stroke} />
    </svg>
  );
}

export function IconClock({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="7" {...stroke} />
      <path d="M10 6v4.2l2.8 1.7" {...stroke} />
    </svg>
  );
}

export function IconArrowRight({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3.5 10h12M11 5.5 15.5 10 11 14.5" {...stroke} />
    </svg>
  );
}

export function IconChevronRight({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="m7.5 4.5 6 5.5-6 5.5" {...stroke} />
    </svg>
  );
}

export function IconMenu({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 5.5h14M3 10h14M3 14.5h14" {...stroke} strokeWidth={1.7} />
    </svg>
  );
}

export function IconClose({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="m5 5 10 10M15 5 5 15" {...stroke} strokeWidth={1.7} />
    </svg>
  );
}

export function IconSignOut({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M8 3.5H5.2A1.7 1.7 0 0 0 3.5 5.2v9.6a1.7 1.7 0 0 0 1.7 1.7H8" {...stroke} />
      <path d="M11.5 6.8 15.2 10l-3.7 3.2M15 10H8" {...stroke} />
    </svg>
  );
}

export function IconCheck({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="m4.5 10.5 3.5 3.5 7.5-8" {...stroke} strokeWidth={1.8} />
    </svg>
  );
}

/** Basketball-style ball used as the shared brand mark in the prototypes. */
export function IconBrandMark({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="11" cy="11" r="9.2" fill="var(--color-ink)" />
      <path d="M11 1.8v18.4M1.8 11h18.4M4.4 4.4l13.2 13.2M17.6 4.4 4.4 17.6" stroke="#fff" strokeWidth="1.1" fill="none" />
    </svg>
  );
}
