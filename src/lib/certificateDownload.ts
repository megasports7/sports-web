/**
 * Client-side certificate download, ported from mobile's
 * PlayerCertificates.tsx viewer (template PNG + cover-box overlays).
 *
 * Mobile renders the card in React Native and captures it with
 * react-native-view-shot. On web there is no view-shot equivalent without a
 * heavy dependency, so this module draws the same composition onto a
 * <canvas> at the template's native resolution (2749x1944, landscape) and
 * downloads it as JPEG. All coordinates below are fractions verified against
 * the real template art in the mobile source comments — keep them in sync if
 * the templates ever change.
 *
 * No new dependencies: plain canvas + system serif/sans fonts (the mobile
 * Google Fonts have no exact web-bundled equivalent here; Georgia italic
 * carries the formal tone).
 */

export type CertLevel = 'gold' | 'silver' | 'bronze' | 'participation';

const BG: Record<CertLevel, string> = {
  gold: '/certs/cert-gold.png',
  silver: '/certs/cert-silver.png',
  bronze: '/certs/cert-bronze.png',
  participation: '/certs/cert-participation.png',
};

export function certBackgroundFor(level: string | undefined): string {
  const v = (level || '').toLowerCase();
  if (v === 'gold' || v === 'silver' || v === 'bronze') return BG[v as CertLevel];
  return BG.participation;
}

/** Tier-aware wording, same contract as mobile's certDescriptionFor. */
export function certDescriptionFor(level: string | undefined, eventName: string): string {
  switch ((level || '').toLowerCase()) {
    case 'gold':
      return `for winning the Gold Medal in ${eventName}`;
    case 'silver':
      return `for winning the Silver Medal in ${eventName}`;
    case 'bronze':
      return `for winning the Bronze Medal in ${eventName}`;
    default:
      return `for participating in ${eventName}`;
  }
}

export interface CertRenderInput {
  level?: string;
  playerName: string;
  eventName: string;
  signName?: string | null;
  signDesignation?: string | null;
  sign2Name?: string | null;
  sign2Designation?: string | null;
  photoUrl?: string | null;
  fileName?: string;
}

type Ctx = CanvasRenderingContext2D & { letterSpacing?: string };

function loadImage(src: string, cors = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}

/** Largest font size (from `start`, stepping down) that fits maxWidth. */
function fitFont(
  ctx: Ctx,
  text: string,
  maxWidth: number,
  start: number,
  style: (px: number) => string,
  minScale = 0.5,
): string {
  let px = start;
  ctx.font = style(px);
  while (px * minScale < px && ctx.measureText(text).width > maxWidth) {
    px -= 2;
    if (px <= start * minScale) break;
    ctx.font = style(px);
  }
  return style(px);
}

function wrapLines(ctx: Ctx, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(trial).width <= maxWidth || !cur) {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines - 1) {
        // Last allowed line: append the rest, caller shrinks font to fit.
        lines.push([cur, ...words.slice(words.indexOf(w) + 1)].join(' '));
        return lines;
      }
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines);
}

export async function downloadCertificateImage(input: CertRenderInput): Promise<void> {
  const template = await loadImage(certBackgroundFor(input.level)).catch(() => {
    throw new Error('Certificate template could not be loaded');
  });
  const W = template.naturalWidth || 2749;
  const H = template.naturalHeight || 1944;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d') as Ctx | null;
  if (!ctx) throw new Error('Canvas is not available in this browser');

  const R = (fx: number, fy: number, fw: number, fh: number) =>
    [fx * W, fy * H, fw * W, fh * H] as const;

  ctx.drawImage(template, 0, 0, W, H);

  // Photo overlay (optional) — top-right, mirrors mobile's photoOverlay.
  if (input.photoUrl) {
    try {
      const photo = await loadImage(input.photoUrl, true);
      const [px, py, pw, ph] = R(0.885, 0.09, 0.08, 0.075);
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px, py, pw, ph);
      // Cover-fit the photo into the box.
      const s = Math.max(pw / photo.naturalWidth, ph / photo.naturalHeight);
      const dw = photo.naturalWidth * s;
      const dh = photo.naturalHeight * s;
      ctx.beginPath();
      ctx.rect(px, py, pw, ph);
      ctx.clip();
      ctx.drawImage(photo, px + (pw - dw) / 2, py + (ph - dh) / 2, dw, dh);
      ctx.restore();
    } catch {
      // CORS-blocked or unreachable photo must never break the download —
      // the certificate renders without it, same as mobile's null branch.
    }
  }

  const COVER = '#fdfdfd';

  // Name cover box + real name (over the template's baked-in sample name).
  {
    const [bx, by, bw, bh] = R(0.18, 0.34, 0.64, 0.175);
    ctx.fillStyle = COVER;
    ctx.fillRect(bx, by, bw, bh);
    const name = (input.playerName || 'Player').trim() || 'Player';
    const pad = bw * 0.06;
    ctx.fillStyle = '#1a2a4a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = fitFont(
      ctx,
      name,
      bw - pad * 2,
      Math.round(bh * 0.42),
      (px) => `italic 700 ${px}px Georgia, 'Times New Roman', serif`,
      0.5,
    );
    ctx.fillText(name, bx + bw / 2, by + bh / 2, bw - pad * 2);
  }

  // Description cover box + tier-aware wording (up to 2 lines).
  {
    const [bx, by, bw, bh] = R(0.12, 0.563, 0.76, 0.16);
    ctx.fillStyle = COVER;
    ctx.fillRect(bx, by, bw, bh);
    const desc = certDescriptionFor(input.level, input.eventName || 'Event');
    const pad = bw * 0.05;
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let px = Math.round(bh * 0.16);
    const style = (p: number) => `italic 600 ${p}px Georgia, serif`;
    ctx.font = style(px);
    let lines = wrapLines(ctx, desc, bw - pad * 2, 2);
    while (lines.some((l) => ctx.measureText(l).width > bw - pad * 2) && px > 10) {
      px -= 2;
      ctx.font = style(px);
      lines = wrapLines(ctx, desc, bw - pad * 2, 2);
    }
    const lh = px * 1.3;
    const startY = by + bh / 2 - ((lines.length - 1) * lh) / 2;
    lines.forEach((l, i) => ctx.fillText(l, bx + bw / 2, startY + i * lh));
  }

  // Signature blocks — only when a signatory exists (mirrors mobile: no
  // blank boxes; the template's own sample stays underneath otherwise).
  const sigs: { x: number; name?: string | null; title?: string | null }[] = [
    { x: 0.15, name: input.signName, title: input.signDesignation },
    { x: 0.61, name: input.sign2Name, title: input.sign2Designation },
  ];
  for (const sig of sigs) {
    if (!sig.name?.trim()) continue;
    const [bx, by, bw, bh] = R(sig.x, 0.77, 0.24, 0.08);
    ctx.fillStyle = COVER;
    ctx.fillRect(bx, by, bw, bh);
    const pad = bw * 0.06;
    ctx.textAlign = 'center';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.max(1, Math.round(bw * 0.004))}px`;
    const lines: { text: string; font: string; color: string }[] = [
      {
        text: sig.name.trim().toUpperCase(),
        font: `700 ${Math.round(bh * 0.24)}px Arial, Helvetica, sans-serif`,
        color: '#222222',
      },
    ];
    if (sig.title?.trim()) {
      lines.push({
        text: sig.title.trim(),
        font: `${Math.round(bh * 0.18)}px Arial, Helvetica, sans-serif`,
        color: '#777777',
      });
    }
    const lh = bh * 0.3;
    const startY = by + bh / 2 - ((lines.length - 1) * lh) / 2;
    lines.forEach((l, i) => {
      ctx.font = fitFont(ctx, l.text, bw - pad * 2, parseInt(l.font.match(/(\d+)px/)?.[1] || '20', 10), (p) =>
        l.font.replace(/(\d+)px/, `${p}px`),
      );
      ctx.fillStyle = l.color;
      ctx.fillText(l.text, bx + bw / 2, startY + i * lh);
    });
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.92),
  );
  if (!blob) throw new Error('Could not render certificate image');

  const safe = (input.playerName || 'player')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .slice(0, 40) || 'player';
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = input.fileName || `certificate_${safe}_${Date.now()}.jpg`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
