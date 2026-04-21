/**
 * CardapioA4Renderer.ts
 * Pure Canvas2D renderer for A4 cardápio export.
 * Includes bleed area in exported PNG (standard for print).
 * Bleed marks are drawn as crop-mark lines at safe area corners.
 *
 * Scale 1  → 810 × 1071 px  (preview quality)
 * Scale 2  → 1620 × 2142 px (~150 DPI equivalent)
 * Scale 4  → 3240 × 4284 px (~300 DPI — print ready)
 */

import { CardapioGroup, splitGroups, calcFontSize, getGroupWeight } from '../../utils/cardapioParser';

const TWO_COL_ITEM_THRESHOLD = 18;

export const CANVAS_W  = 810;
export const CANVAS_H  = 1071;
export const BLEED_PX  = 90;

const SAFE_L  = BLEED_PX;
const SAFE_T  = BLEED_PX;
const SAFE_W  = CANVAS_W - BLEED_PX * 2;
const SAFE_H  = CANVAS_H - BLEED_PX * 2;

const GOLD        = '#D4AF37';
const GOLD_BRIGHT = '#FFE066';
const TEXT_WHITE  = '#FFFFFF';
const TEXT_GRAY   = '#b8cce0';
const COL_PAD_H   = 22;
const COL_PAD_V   = 12;
const FOOTER_H    = 124;  // chancela scaled to 630px wide → ≈124px high
const DIVIDER_W   = 2;
const SCREW_SIZE  = 20;
const SCREW_INSET = 12;

function calcHeaderH(totalItens: number): number {
  if (totalItens >= 20) return 106;
  if (totalItens >= 14) return 118;
  if (totalItens >= 10) return 130;
  return 146;
}

function calcEmpresaFs(empresa: string, totalItens: number): number {
  const availW   = SAFE_W - COL_PAD_H * 2;
  const byLength = Math.min(60, Math.floor(availW / Math.max(empresa.length, 1)));
  const pressure = Math.min(0.35, Math.max(0, (totalItens - 6) * 0.028));
  return Math.max(20, Math.floor(byLength * (1 - pressure)));
}

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

// ─── Primitives ───────────────────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#011464';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const vig = ctx.createRadialGradient(
    CANVAS_W / 2, CANVAS_H * 0.4, CANVAS_H * 0.25,
    CANVAS_W / 2, CANVAS_H * 0.4, CANVAS_H * 0.85
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function drawAccentLines(ctx: CanvasRenderingContext2D) {
  const makeGrad = (y: number) => {
    const g = ctx.createLinearGradient(SAFE_L, y, SAFE_L + SAFE_W, y);
    g.addColorStop(0, 'rgba(212,175,55,0)');
    g.addColorStop(0.2, GOLD);
    g.addColorStop(0.8, GOLD);
    g.addColorStop(1, 'rgba(212,175,55,0)');
    return g;
  };
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = makeGrad(SAFE_T + 8);
  ctx.fillRect(SAFE_L, SAFE_T + 8, SAFE_W, 3);
  ctx.fillStyle = makeGrad(CANVAS_H - BLEED_PX - 8 - 3);
  ctx.fillRect(SAFE_L, CANVAS_H - BLEED_PX - 8 - 3, SAFE_W, 3);
  ctx.globalAlpha = 1;
}

function drawScrew(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const r = SCREW_SIZE / 2;
  const rg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
  rg.addColorStop(0, '#f8e878');
  rg.addColorStop(0.55, GOLD);
  rg.addColorStop(1, '#7a5f00');

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = rg;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(26,14,0,0.65)';
  ctx.fill();
}

/** Draw standard print crop marks at safe-area corners */
function drawCropMarks(ctx: CanvasRenderingContext2D) {
  const MARK_LEN = 16;
  const GAP = 5;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 0.75;

  const corners = [
    { x: SAFE_L, y: SAFE_T, dx: -1, dy: -1 },   // top-left
    { x: SAFE_L + SAFE_W, y: SAFE_T, dx: 1, dy: -1 },    // top-right
    { x: SAFE_L, y: SAFE_T + SAFE_H, dx: -1, dy: 1 },    // bottom-left
    { x: SAFE_L + SAFE_W, y: SAFE_T + SAFE_H, dx: 1, dy: 1 }, // bottom-right
  ];

  for (const { x, y, dx, dy } of corners) {
    // Horizontal mark
    ctx.beginPath();
    ctx.moveTo(x + dx * GAP, y);
    ctx.lineTo(x + dx * (GAP + MARK_LEN), y);
    ctx.stroke();
    // Vertical mark
    ctx.beginPath();
    ctx.moveTo(x, y + dy * GAP);
    ctx.lineTo(x, y + dy * (GAP + MARK_LEN));
    ctx.stroke();
  }
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  titulo: string,
  empresa: string,
  headerH: number,
  totalItens: number
) {
  const empresaFs = calcEmpresaFs(empresa, totalItens);
  const tituloFs  = Math.max(10, Math.floor(headerH * 0.11));
  const cx        = CANVAS_W / 2;
  const hasTitle  = !!titulo;

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  const empresaY = hasTitle
    ? SAFE_T + COL_PAD_V + headerH * 0.38 + tituloFs * 0.6 + empresaFs * 0.5
    : SAFE_T + COL_PAD_V + headerH * 0.5;

  if (hasTitle) {
    const titleY = SAFE_T + COL_PAD_V + headerH * 0.28;
    ctx.font      = `700 ${tituloFs}px Arial, Helvetica, sans-serif`;
    ctx.fillStyle = GOLD_BRIGHT;
    ctx.globalAlpha = 0.88;
    ctx.fillText(titulo, cx, titleY);
    ctx.globalAlpha = 1;
  }

  ctx.font        = `900 ${empresaFs}px "Arial Black", Impact, Helvetica, sans-serif`;
  ctx.shadowColor = `${GOLD}55`;
  ctx.shadowBlur  = 25;
  ctx.fillStyle   = GOLD_BRIGHT;
  ctx.fillText(empresa, cx, empresaY);
  ctx.shadowBlur  = 0;

  const underW = Math.max(70, Math.min(SAFE_W * 0.58, empresa.length * 17));
  const underY = empresaY + empresaFs * 0.54 + 5;
  const ug = ctx.createLinearGradient(cx - underW / 2, 0, cx + underW / 2, 0);
  ug.addColorStop(0, 'rgba(212,175,55,0)');
  ug.addColorStop(0.5, GOLD);
  ug.addColorStop(1, 'rgba(212,175,55,0)');
  ctx.globalAlpha = 0.7;
  ctx.fillStyle   = ug;
  ctx.fillRect(cx - underW / 2, underY, underW, 1.5);
  ctx.globalAlpha = 1;
}

function drawDivider(ctx: CanvasRenderingContext2D, colStartY: number) {
  const x     = CANVAS_W / 2;
  const yEnd  = CANVAS_H - BLEED_PX - FOOTER_H - 8;
  const g = ctx.createLinearGradient(0, colStartY, 0, yEnd);
  g.addColorStop(0,    'rgba(212,175,55,0)');
  g.addColorStop(0.06, GOLD);
  g.addColorStop(0.94, GOLD);
  g.addColorStop(1,    'rgba(212,175,55,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - DIVIDER_W / 2, colStartY, DIVIDER_W, yEnd - colStartY);
}

function drawColumn(
  ctx: CanvasRenderingContext2D,
  grupos: CardapioGroup[],
  colX: number,
  startY: number,
  colW: number,
  fs: number,
  singleCol = false
) {
  const catFs   = fs * 1.52;
  const itemFs  = fs * 1.0;
  const priceFs = Math.max(fs * 1.18, 11);
  const descFs  = fs * 0.68;

  let y = startY;

  for (let gi = 0; gi < grupos.length; gi++) {
    const group = grupos[gi];
    ctx.font        = `900 ${catFs}px "Arial Black", Arial, Helvetica, sans-serif`;
    ctx.textAlign   = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor = `${GOLD_BRIGHT}50`;
    ctx.shadowBlur  = 7;
    ctx.fillStyle   = GOLD_BRIGHT;
    ctx.fillText(group.categoria, colX, y, colW);
    ctx.shadowBlur  = 0;
    y += catFs * 1.1 + fs * 0.22;

    // Decorative underline below category in single-col mode
    if (singleCol) {
      const uw = colW * 0.55;
      const ug = ctx.createLinearGradient(colX, 0, colX + uw, 0);
      ug.addColorStop(0, `${GOLD}90`);
      ug.addColorStop(1, 'rgba(212,175,55,0)');
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = ug;
      ctx.fillRect(colX, y, uw, 1);
      ctx.globalAlpha = 1;
      y += fs * 0.22;
    }

    for (const item of group.itens) {
      ctx.font = `900 ${priceFs}px "Arial Black", Arial, Helvetica, sans-serif`;
      const priceW   = ctx.measureText(item.valor).width;
      const nameMaxW = colW - priceW - (singleCol ? 20 : 10);

      ctx.font        = `700 ${itemFs}px Arial, Helvetica, sans-serif`;
      ctx.fillStyle   = TEXT_WHITE;
      ctx.textBaseline = 'alphabetic';
      const itemBaseY = y + itemFs * 0.82;

      const nameLines = wrapText(ctx, item.item, nameMaxW);
      nameLines.forEach((line, i) => ctx.fillText(line, colX, itemBaseY + i * itemFs * 1.2));
      const nameH = nameLines.length * itemFs * 1.2;

      ctx.font         = `900 ${priceFs}px "Arial Black", Arial, Helvetica, sans-serif`;
      ctx.fillStyle    = GOLD_BRIGHT;
      ctx.textAlign    = 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.shadowColor  = `${GOLD}40`;
      ctx.shadowBlur   = 4;
      ctx.fillText(item.valor, colX + colW, itemBaseY);
      ctx.shadowBlur   = 0;
      ctx.textAlign    = 'left';

      y += Math.max(nameH, priceFs * 1.2);

      if (item.descricao) {
        ctx.font        = `italic ${descFs}px Arial, Helvetica, sans-serif`;
        ctx.fillStyle   = TEXT_GRAY;
        ctx.textBaseline = 'top';
        ctx.globalAlpha = 0.88;
        const descLines = wrapText(ctx, item.descricao, colW);
        descLines.forEach((line, i) => {
          ctx.fillText(line, colX, y + fs * 0.06 + i * descFs * 1.35);
        });
        y += descLines.length * descFs * 1.35 + fs * 0.06;
        ctx.globalAlpha = 1;
      }

      y += fs * 0.3;
    }

    // Subtle separator between groups in single-col mode
    if (singleCol && gi < grupos.length - 1) {
      ctx.globalAlpha = 0.08;
      ctx.fillStyle   = '#ffffff';
      ctx.fillRect(colX, y + fs * 0.1, colW, 1);
      ctx.globalAlpha = 1;
      y += fs * 0.28;
    } else {
      y += fs * 0.42;
    }
  }
}

/** Load an image from URL into an HTMLImageElement */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export async function renderMenuA4ToDataURL(
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
  ctx.scale(scale, scale);

  const totalItens = grupos.reduce((s, g) => s + g.itens.length, 0);
  const headerH    = calcHeaderH(totalItens);
  const availH     = SAFE_H - headerH - COL_PAD_V * 2 - FOOTER_H - 10;
  const singleCol  = totalItens <= TWO_COL_ITEM_THRESHOLD;

  const fs = singleCol
    ? Math.max(8, Math.min(24, grupos.reduce((s, g) => s + getGroupWeight(g), 0) > 0
        ? (availH * 0.86) / grupos.reduce((s, g) => s + getGroupWeight(g), 0)
        : 24))
    : Math.min(calcFontSize(grupos, availH * 0.52), 20);

  drawBackground(ctx);
  drawAccentLines(ctx);
  drawCropMarks(ctx);

  const so = BLEED_PX + SCREW_INSET + SCREW_SIZE / 2;
  drawScrew(ctx, so, so);
  drawScrew(ctx, CANVAS_W - so, so);
  drawScrew(ctx, so, CANVAS_H - so);
  drawScrew(ctx, CANVAS_W - so, CANVAS_H - so);

  drawHeader(ctx, titulo, empresa, headerH, totalItens);

  const colStartY = SAFE_T + COL_PAD_V + headerH + 4;

  const [leftGrupos, rightGrupos] = singleCol ? [grupos, []] : splitGroups(grupos);
  const midX = CANVAS_W / 2;

  if (singleCol) {
    const colX = SAFE_L + COL_PAD_H;
    const colW = SAFE_W - COL_PAD_H * 2;
    drawColumn(ctx, leftGrupos, colX, colStartY, colW, fs, true);
  } else {
    drawDivider(ctx, colStartY);
    const leftColX  = SAFE_L + COL_PAD_H;
    const leftColW  = midX - DIVIDER_W / 2 - SAFE_L - COL_PAD_H - Math.round(COL_PAD_H * 1.3);
    const rightColX = midX + DIVIDER_W / 2 + Math.round(COL_PAD_H * 1.3);
    const rightColW = SAFE_L + SAFE_W - rightColX - COL_PAD_H;
    drawColumn(ctx, leftGrupos,  leftColX,  colStartY, leftColW,  fs, false);
    drawColumn(ctx, rightGrupos, rightColX, colStartY, rightColW, fs, false);
  }

  // ── Chancela footer ────────────────────────────────────────────────────────
  try {
    const chancelaImg = await loadImage('/chancela.png');
    const footerY = CANVAS_H - BLEED_PX - FOOTER_H + 2;
    // Thin separator line
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(SAFE_L, footerY - 1, SAFE_W, 1);
    ctx.globalAlpha = 1;
    // Draw chancela scaled to safe width
    const chScaleW = SAFE_W;
    const chScaleH = Math.round(SAFE_W * (chancelaImg.naturalHeight / chancelaImg.naturalWidth));
    const chY = footerY + Math.round((FOOTER_H - chScaleH) / 2);
    ctx.drawImage(chancelaImg, SAFE_L, chY, chScaleW, chScaleH);
  } catch {
    // Chancela not available — skip silently
  }

  return canvas.toDataURL('image/png');
}

export async function exportMenuA4(
  titulo: string,
  empresa: string,
  grupos: CardapioGroup[],
  filename: string,
  scale = 1,
  onProgress?: (status: string) => void
): Promise<void> {
  onProgress?.('Renderizando A4...');
  const dataUrl = await renderMenuA4ToDataURL(titulo, empresa, grupos, scale);
  onProgress?.('Preparando download...');
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href     = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  onProgress?.('Concluído!');
}

export const A4_RENDER_SCALES = {
  PREVIEW: 1,   // 810×1071px
  MEDIUM:  2,   // 1620×2142px (~150dpi)
  HIGH:    4,   // 3240×4284px (~300dpi print)
} as const;
