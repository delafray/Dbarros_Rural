/**
 * cardapioA4Config.ts
 *
 * SOURCE OF TRUTH for all layout constants and helper functions
 * shared between CardapioA4Canvas.tsx (preview) and CardapioA4Renderer.ts (PNG export).
 *
 * ⚠️  NEVER duplicate these values in either file — always import from here.
 */

// ─── Canvas dimensions ────────────────────────────────────────────────────────
export const CANVAS_W = 810;
export const CANVAS_H = 1071;
export const BLEED_PX = 90; // 30mm × 3px/mm

export const SAFE_L = BLEED_PX;
export const SAFE_T = BLEED_PX;
export const SAFE_W = CANVAS_W - BLEED_PX * 2; // 630px = 210mm
export const SAFE_H = CANVAS_H - BLEED_PX * 2; // 891px = 297mm
export const SAFE_R = SAFE_L + SAFE_W;
export const SAFE_B = SAFE_T + SAFE_H;

// ─── Design tokens ────────────────────────────────────────────────────────────
export const GOLD        = '#D4AF37';
export const GOLD_BRIGHT = '#FFE066';
export const TEXT_WHITE  = '#FFFFFF';
export const TEXT_GRAY   = '#b8cce0';

// ─── Font stacks (must be identical in preview & renderer) ───────────────────
export const FONT_REGULAR = 'Arial, Helvetica, sans-serif';
export const FONT_BLACK   = '"Arial Black", Impact, Arial, Helvetica, sans-serif';

// ─── Layout spacing ───────────────────────────────────────────────────────────
export const COL_PAD_H = 28;  // horizontal padding per column (px)
export const COL_PAD_V = 14;  // vertical padding above content (px)
export const FOOTER_H  = 124; // chancela 10458×2051 scaled to 630px → 123.5px
export const DIVIDER_W = 2;   // two-column gold divider width
export const SCREW_SIZE  = 20;
export const SCREW_INSET = 12;

// ─── Adaptive layout ─────────────────────────────────────────────────────────
export const TWO_COL_ITEM_THRESHOLD = 18;

// ─── Shared helper functions ──────────────────────────────────────────────────
/** Header block height — shrinks as item count grows to reclaim space for content. */
export function calcHeaderH(totalItens: number): number {
  if (totalItens >= 20) return 100;
  if (totalItens >= 14) return 116;
  if (totalItens >= 10) return 128;
  return 142;
}

/** Empresa name font size — scales with name length and item-count pressure. */
export function calcEmpresaFs(empresa: string, totalItens: number): number {
  const availW   = SAFE_W - COL_PAD_H * 2;
  const byLength = Math.min(64, Math.floor(availW / Math.max(empresa.length, 1)));
  const pressure = Math.min(0.3, Math.max(0, (totalItens - 6) * 0.025));
  return Math.max(22, Math.floor(byLength * (1 - pressure)));
}
