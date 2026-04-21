/**
 * CardapioRenderer.ts
 * Pure Canvas2D renderer for cardápio export.
 * Draws everything directly — no html2canvas, no CSS capture issues.
 * Output is pixel-perfect at any scale/resolution.
 */

import {
  CardapioGroup,
  splitGroups,
  calcFontSize,
} from '../../utils/cardapioParser';

// ─── Layout constants (must match CardapioCanvas.tsx visually) ───────────────
export const CANVAS_W = 1600;
export const CANVAS_H = 880;

const GOLD       = '#D4AF37';
const GOLD_BRIGHT = '#FFE066';
const TEXT_WHITE  = '#FFFFFF';
const TEXT_GRAY   = '#b8cce0';
const COL_PAD_H   = 44;
const COL_PAD_V   = 14;
const DIVIDER_W   = 3;
const SCREW_SIZE  = 28;
const SCREW_INSET = 20;
const APPROX_COL_W = (CANVAS_W / 2) - COL_PAD_H - Math.round(COL_PAD_H * 0.7);

// ─── Helpers (shared with Canvas component) ───────────────────────────────────
function calcHeaderH(totalItens: number): number {
  if (totalItens >= 14) return 128;
  if (totalItens >= 10) return 144;
  if (totalItens >= 7)  return 158;
  return 172;
}

function calcEmpresaFs(empresa: string, totalItens: number, colW = APPROX_COL_W): number {
  const byLength = Math.min(68, Math.floor(colW / Math.max(empresa.length, 1)));
  const pressure = Math.min(0.42, Math.max(0, (totalItens - 4) * 0.036));
  return Math.max(24, Math.floor(byLength * (1 - pressure)));
}

/** Wrap text to fit within maxWidth, returns array of lines */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [''];
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

// ─── Drawing primitives ───────────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#011464';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Subtle vignette for depth
  const vig = ctx.createRadialGradient(
    CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.3,
    CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.85
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function drawAccentLines(ctx: CanvasRenderingContext2D) {
  const makeGrad = (y: number) => {
    const g = ctx.createLinearGradient(0, y, CANVAS_W, y);
    g.addColorStop(0,   'rgba(212,175,55,0)');
    g.addColorStop(0.2,  GOLD);
    g.addColorStop(0.8,  GOLD);
    g.addColorStop(1,   'rgba(212,175,55,0)');
    return g;
  };
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = makeGrad(0);
  ctx.fillRect(0, 0, CANVAS_W, 4);
  ctx.globalAlpha = 1;
}

function drawScrew(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const r = SCREW_SIZE / 2;
  const rg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
  rg.addColorStop(0,   '#f8e878');
  rg.addColorStop(0.55, GOLD);
  rg.addColorStop(1,   '#7a5f00');

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = rg;
  ctx.fill();

  // Shadow ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(26,14,0,0.65)';
  ctx.fill();
}

function drawDivider(ctx: CanvasRenderingContext2D, headerH: number) {
  const x = CANVAS_W / 2;
  const yStart = headerH + 4;
  const yEnd   = CANVAS_H - 12;
  const g = ctx.createLinearGradient(0, yStart, 0, yEnd);
  g.addColorStop(0,    'rgba(212,175,55,0)');
  g.addColorStop(0.08,  GOLD);
  g.addColorStop(0.92,  GOLD);
  g.addColorStop(1,    'rgba(212,175,55,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - DIVIDER_W / 2, yStart, DIVIDER_W, yEnd - yStart);
}

/**
 * Draw titulo + empresa centered within the horizontal slice [colX, colX+colW].
 * Called once per side so each half is independent after center cut.
 */
function drawHalfHeader(
  ctx: CanvasRenderingContext2D,
  titulo: string,
  empresa: string,
  headerH: number,
  totalItens: number,
  colX: number,
  colW: number
) {
  const empresaFs = calcEmpresaFs(empresa, totalItens, colW * 0.92);
  const tituloFs  = Math.max(12, Math.floor(headerH * 0.13));
  const cx        = colX + colW / 2;
  const hasTitle  = !!titulo;

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  let empresaY: number;

  if (hasTitle) {
    // empresaY is computed from the ORIGINAL title position so it never moves
    const empresaY = headerH * 0.30 + tituloFs * 0.7 + empresaFs * 0.54;
    // Title moves up independently
    const titleY   = headerH * 0.24;

    ctx.font        = `700 ${tituloFs}px Arial, Helvetica, sans-serif`;
    ctx.fillStyle   = GOLD_BRIGHT;
    ctx.globalAlpha = 0.88;
    ctx.fillText(titulo, cx, titleY);
    ctx.globalAlpha = 1;

    // Use the fixed empresaY below
    Object.assign(ctx, {});
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // Empresa with glow
    ctx.font        = `900 ${empresaFs}px "Arial Black", Impact, Helvetica, sans-serif`;
    ctx.shadowColor = `${GOLD}55`;
    ctx.shadowBlur  = 28;
    ctx.fillStyle   = GOLD_BRIGHT;
    ctx.fillText(empresa, cx, empresaY);
    ctx.shadowBlur  = 0;

    // Gold underline
    const underW = Math.max(100, Math.min(colW * 0.75, empresa.length * 22));
    const underY = empresaY + empresaFs * 0.56 + 6;
    const ug = ctx.createLinearGradient(cx - underW / 2, 0, cx + underW / 2, 0);
    ug.addColorStop(0, 'rgba(212,175,55,0)');
    ug.addColorStop(0.5, GOLD);
    ug.addColorStop(1, 'rgba(212,175,55,0)');
    ctx.globalAlpha = 0.72;
    ctx.fillStyle   = ug;
    ctx.fillRect(cx - underW / 2, underY, underW, 2);
    ctx.globalAlpha = 1;
    return; // early return — empresa already drawn
  } else {
    empresaY = headerH * 0.50;
  }

  // Empresa with glow
  ctx.font        = `900 ${empresaFs}px "Arial Black", Impact, Helvetica, sans-serif`;
  ctx.shadowColor = `${GOLD}55`;
  ctx.shadowBlur  = 28;
  ctx.fillStyle   = GOLD_BRIGHT;
  ctx.fillText(empresa, cx, empresaY);
  ctx.shadowBlur  = 0;

  // Gold underline
  const underW = Math.max(100, Math.min(colW * 0.75, empresa.length * 22));
  const underY = empresaY + empresaFs * 0.56 + 6;
  const ug = ctx.createLinearGradient(cx - underW / 2, 0, cx + underW / 2, 0);
  ug.addColorStop(0, 'rgba(212,175,55,0)');
  ug.addColorStop(0.5, GOLD);
  ug.addColorStop(1, 'rgba(212,175,55,0)');
  ctx.globalAlpha = 0.72;
  ctx.fillStyle   = ug;
  ctx.fillRect(cx - underW / 2, underY, underW, 2);
  ctx.globalAlpha = 1;
}


function drawColumn(
  ctx: CanvasRenderingContext2D,
  grupos: CardapioGroup[],
  colX: number,
  startY: number,
  colW: number,
  fs: number
) {
  const catFs   = fs * 1.52;
  const itemFs  = fs * 1.02;
  const priceFs = Math.max(fs * 1.22, 11.5);
  const descFs  = fs * 0.68;

  let y = startY;

  for (const group of grupos) {
    // ── Category header ──────────────────────────────────────────────
    ctx.font        = `900 ${catFs}px "Arial Black", Arial, Helvetica, sans-serif`;
    ctx.textAlign   = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor = `${GOLD_BRIGHT}50`;
    ctx.shadowBlur  = 8;
    ctx.fillStyle   = GOLD_BRIGHT;
    ctx.fillText(group.categoria, colX, y, colW);
    ctx.shadowBlur  = 0;
    y += catFs * 1.15 + fs * 0.30;

    // ── Items ──────────────────────────────────────────────────────────
    for (const item of group.itens) {
      // Measure price width to reserve space
      ctx.font = `900 ${priceFs}px "Arial Black", Arial, Helvetica, sans-serif`;
      const priceW    = ctx.measureText(item.valor).width;
      const nameMaxW  = colW - priceW - 12;

      // Item name (may wrap)
      ctx.font        = `700 ${itemFs}px Arial, Helvetica, sans-serif`;
      ctx.fillStyle   = TEXT_WHITE;
      ctx.textBaseline = 'alphabetic';
      const itemBaseY = y + itemFs * 0.85; // baseline position

      const nameLines = wrapText(ctx, item.item, nameMaxW);
      nameLines.forEach((line, i) => {
        ctx.fillText(line, colX, itemBaseY + i * itemFs * 1.2);
      });
      const nameH = nameLines.length * itemFs * 1.2;

      // Price — right-aligned, baseline aligned with name's first line
      ctx.font        = `900 ${priceFs}px "Arial Black", Arial, Helvetica, sans-serif`;
      ctx.fillStyle   = GOLD_BRIGHT;
      ctx.textAlign   = 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.shadowColor = `${GOLD}40`;
      ctx.shadowBlur  = 5;
      ctx.fillText(item.valor, colX + colW, itemBaseY);
      ctx.shadowBlur  = 0;
      ctx.textAlign   = 'left';

      // Advance y by the taller of name or price
      const rowH = Math.max(nameH, priceFs * 1.2);
      y += rowH;

      // Description (may wrap)
      if (item.descricao) {
        ctx.font        = `italic ${descFs}px Arial, Helvetica, sans-serif`;
        ctx.fillStyle   = TEXT_GRAY;
        ctx.textBaseline = 'top';
        ctx.globalAlpha = 0.9;

        const descLines = wrapText(ctx, item.descricao, colW);
        descLines.forEach((line, i) => {
          ctx.fillText(line, colX, y + fs * 0.06 + i * descFs * 1.3);
        });
        y += descLines.length * descFs * 1.3 + fs * 0.06;
        ctx.globalAlpha = 1;
      }

      y += fs * 0.34; // item bottom margin
    }

    y += fs * 0.42; // group bottom margin
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Render the cardápio to a PNG data URL using Canvas2D.
 * @param scale  1 = 1600×880px | 2 = 3200×1760px | 4 = 6400×3520px
 */
export async function renderCardapioToDataURL(
  titulo: string,
  empresa: string,
  grupos: CardapioGroup[],
  scale = 1
): Promise<string> {
  const W = CANVAS_W * scale;
  const H = CANVAS_H * scale;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Scale all drawing calls uniformly
  ctx.scale(scale, scale);

  const totalItens = grupos.reduce((s, g) => s + g.itens.length, 0);
  const headerH    = calcHeaderH(totalItens);
  const availH     = CANVAS_H - headerH - COL_PAD_V * 2 - 8;
  const fs         = calcFontSize(grupos, availH);

  // ── Draw layers ──────────────────────────────────────────────────────
  drawBackground(ctx);
  drawAccentLines(ctx);

  const sr = SCREW_SIZE / 2;
  drawScrew(ctx, SCREW_INSET + sr + 15, SCREW_INSET + sr);                   // top-left
  drawScrew(ctx, CANVAS_W - SCREW_INSET - sr - 10, SCREW_INSET + sr);         // top-right (shifted left)
  drawScrew(ctx, SCREW_INSET + sr + 15, CANVAS_H - SCREW_INSET - sr);         // bottom-left
  drawScrew(ctx, CANVAS_W - SCREW_INSET - sr - 10, CANVAS_H - SCREW_INSET - sr); // bottom-right (shifted left)

  // Divisor central removido — cada painel é cortado ao meio independentemente

  const [leftGrupos, rightGrupos] = splitGroups(grupos);
  const midX      = CANVAS_W / 2;
  const colStartY = headerH + Math.round(COL_PAD_V * 0.5); // mirrors CSS paddingTop: COL_PADDING_V * 0.5

  // Left column — shifted right +20px from original padding
  const leftColX  = COL_PAD_H + 20;
  const leftColW  = midX - (COL_PAD_H + 20) - Math.round(COL_PAD_H * 1.6);

  // Right column
  const rightColX = midX + Math.round(COL_PAD_H * 1.6);
  const rightEdge  = CANVAS_W - (COL_PAD_H + SCREW_SIZE);
  const rightColW = rightEdge - rightColX;

  // Right column items/categories start 20px closer to the inner edge
  // rightColW grows by same 20px so price position (rightTextX + rightTextW) stays unchanged
  const rightTextX = rightColX - 20;
  const rightTextW = rightColW + 20;

  // ── Per-half headers (replicated so each side survives a center cut) ──
  drawHalfHeader(ctx, titulo, empresa, headerH, totalItens, leftColX,  leftColW);
  drawHalfHeader(ctx, titulo, empresa, headerH, totalItens, rightColX, rightColW); // header centered as before

  // ── Column content ────────────────────────────────────────────────────
  drawColumn(ctx, leftGrupos,  leftColX,  colStartY, leftColW,  fs);
  drawColumn(ctx, rightGrupos, rightTextX, colStartY, rightTextW, fs); // items -20px left, prices unchanged


  return canvas.toDataURL('image/png');
}

/**
 * Render and download as PNG file.
 */
export async function exportCardapioRenderer(
  titulo: string,
  empresa: string,
  grupos: CardapioGroup[],
  filename: string,
  scale = 1,
  onProgress?: (status: string) => void
): Promise<void> {
  onProgress?.('Desenhando cardápio...');
  const dataUrl = await renderCardapioToDataURL(titulo, empresa, grupos, scale);

  onProgress?.('Preparando download...');
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href     = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  onProgress?.('Concluído!');
}

export const RENDER_SCALES = {
  PREVIEW: 1,
  MEDIUM:  2,
  HIGH:    4,
} as const;
