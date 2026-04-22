/**
 * CardapioA4Renderer.ts
 * Pure Canvas2D renderer for menu A4 — pixel-perfect, no DOM rasterization.
 * Replaces modern-screenshot to eliminate text-wrap divergence in PNG export.
 *
 * Scale 1 → 810×1071 px  (preview)
 * Scale 2 → 1620×2142 px (~150 DPI)
 * Scale 4 → 3240×4284 px (~300 DPI)
 */

import {
  CardapioGroup,
  splitGroups,
  calcFontSize,
  getGroupWeight,
} from '../../utils/cardapioParser';

import {
  CANVAS_W, CANVAS_H, BLEED_PX,
  SAFE_L, SAFE_T, SAFE_W, SAFE_H,
  GOLD, GOLD_BRIGHT, TEXT_WHITE, TEXT_GRAY,
  FONT_REGULAR, FONT_BLACK,
  COL_PAD_H, COL_PAD_V, FOOTER_H, DIVIDER_W, SCREW_SIZE, SCREW_INSET,
  TWO_COL_ITEM_THRESHOLD,
  calcHeaderH, calcEmpresaFs,
} from './cardapioA4Config';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ─── Drawing primitives ──────────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#011464';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Vignette — matches radial-gradient(ellipse at 50% 40%, transparent 45%, rgba(0,0,0,0.26) 100%)
  const cx = CANVAS_W / 2;
  const cy = CANVAS_H * 0.4;
  const r  = Math.hypot(Math.max(cx, CANVAS_W - cx), Math.max(cy, CANVAS_H - cy));
  const vig = ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.26)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function drawAccentLine(ctx: CanvasRenderingContext2D, y: number) {
  const g = ctx.createLinearGradient(SAFE_L, y, SAFE_L + SAFE_W, y);
  g.addColorStop(0,   'rgba(212,175,55,0)');
  g.addColorStop(0.2, GOLD);
  g.addColorStop(0.8, GOLD);
  g.addColorStop(1,   'rgba(212,175,55,0)');
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = g;
  ctx.fillRect(SAFE_L, y, SAFE_W, 3);
  ctx.globalAlpha = 1;
}

function drawScrew(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const r = SCREW_SIZE / 2;
  const hlX = cx - r * 0.28;
  const hlY = cy - r * 0.28;
  const rg = ctx.createRadialGradient(hlX, hlY, 0, cx, cy, r);
  rg.addColorStop(0,    '#f8e878');
  rg.addColorStop(0.55, GOLD);
  rg.addColorStop(1,    '#7a5f00');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = rg;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = '#1a0e00';
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  titulo: string,
  empresa: string,
  headerH: number,
  totalItens: number,
  headerTop: number
) {
  const cx        = SAFE_L + SAFE_W / 2;
  const midY      = headerTop + headerH / 2 - 5;
  const empresaFs = calcEmpresaFs(empresa, totalItens);
  const tituloFs  = Math.max(10, Math.floor(headerH * 0.115));
  const underlineW = Math.max(80, Math.min(SAFE_W * 0.62, empresa.length * 18));

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  // Empresa com glow dourado
  ctx.font        = `900 ${empresaFs}px ${FONT_BLACK}`;
  ctx.shadowColor = `${GOLD}60`;
  ctx.shadowBlur  = 35;
  ctx.fillStyle   = GOLD_BRIGHT;
  ctx.fillText(empresa, cx, midY);
  ctx.shadowBlur  = 0;

  // Título acima (se houver)
  if (titulo) {
    const titleY = midY - empresaFs * 0.45 - 10 - tituloFs / 2;
    ctx.font        = `700 ${tituloFs}px ${FONT_REGULAR}`;
    ctx.globalAlpha = 0.88;
    ctx.fillStyle   = GOLD_BRIGHT;
    ctx.fillText(titulo, cx, titleY);
    ctx.globalAlpha = 1;
  }

  // Underline gold abaixo do empresa
  const underY = midY + empresaFs * 0.45 + Math.max(4, headerH * 0.04);
  const ug = ctx.createLinearGradient(cx - underlineW / 2, underY, cx + underlineW / 2, underY);
  ug.addColorStop(0,   'rgba(212,175,55,0)');
  ug.addColorStop(0.5, GOLD);
  ug.addColorStop(1,   'rgba(212,175,55,0)');
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = ug;
  ctx.fillRect(cx - underlineW / 2, underY, underlineW, 1.5);
  ctx.globalAlpha = 1;
}

function drawDottedLink(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number
) {
  if (x2 <= x1) return;
  ctx.save();
  ctx.setLineDash([1.5, 3]);
  ctx.strokeStyle = 'rgba(184,204,224,0.8)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

function drawColumn(
  ctx: CanvasRenderingContext2D,
  grupos: CardapioGroup[],
  colX: number,
  startY: number,
  colW: number,
  fs: number,
  singleCol: boolean
) {
  const catFs   = fs * 1.52;
  const itemFs  = fs;
  const priceFs = Math.max(fs * 1.18, 11);
  const descFs  = fs * 0.68;

  let y = startY;

  grupos.forEach((group, gi) => {
    // ── Categoria ─────────────────────────────────────────────────────
    ctx.font         = `900 ${catFs}px ${FONT_BLACK}`;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor  = `${GOLD_BRIGHT}45`;
    ctx.shadowBlur   = 12;
    ctx.fillStyle    = GOLD_BRIGHT;
    const catBaseline = y + catFs * 1.05;
    ctx.fillText(group.categoria, colX, catBaseline);
    ctx.shadowBlur = 0;
    // Respiro extra: compensa baseline/line-box do canvas ser mais apertado que o DOM
    y = catBaseline + fs * 0.46;

    // ── Itens ─────────────────────────────────────────────────────────
    for (const item of group.itens) {
      // Medir preço primeiro pra reservar espaço
      ctx.font = `900 ${priceFs}px ${FONT_BLACK}`;
      const priceW = item.valor ? ctx.measureText(item.valor).width : 0;
      const gapName = item.descricao ? (singleCol ? 16 : 6) : 16;
      const nameMaxW = colW - (item.valor ? priceW + gapName : 0);

      // Nome do item (pode quebrar se tiver descricao; senão fica em 1 linha)
      ctx.font         = `700 ${itemFs}px ${FONT_REGULAR}`;
      ctx.fillStyle    = TEXT_WHITE;
      ctx.textBaseline = 'alphabetic';
      const nameBaseY = y + itemFs * 1.05;

      // Sempre faz wrap — respeita nameMaxW (espelha flex:'0 1 auto' + minWidth:0 do CSS)
      const nameLines = wrapText(ctx, item.item, nameMaxW);
      const nameLh = itemFs * 1.22;
      nameLines.forEach((line, i) => {
        ctx.fillText(line, colX, nameBaseY + i * nameLh);
      });
      const nameBlockH = nameLines.length * nameLh;

      // Dotted link (só quando NÃO tem descricao)
      // Alinha no baseline da 1a linha (mesmo do preço). Multi-linha → nome ocupa nameMaxW, quase não sobra espaço.
      if (!item.descricao && item.valor) {
        const nameSpanW = nameLines.length > 1
          ? nameMaxW
          : ctx.measureText(nameLines[0]).width;
        const linkY = nameBaseY + Math.max(1, Math.round(itemFs * 0.1));
        drawDottedLink(ctx, colX + nameSpanW + 8, colX + colW - priceW - 8, linkY);
      }

      // Preço — alinhado à direita no baseline da primeira linha do nome
      if (item.valor) {
        ctx.font         = `900 ${priceFs}px ${FONT_BLACK}`;
        ctx.fillStyle    = GOLD_BRIGHT;
        ctx.textAlign    = 'right';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(item.valor, colX + colW, nameBaseY);
        ctx.textAlign    = 'left';
      }

      y += Math.max(nameBlockH, priceFs * 1.22);

      // Descrição (se houver)
      if (item.descricao) {
        ctx.font         = `italic ${descFs}px ${FONT_REGULAR}`;
        ctx.fillStyle    = TEXT_GRAY;
        ctx.textBaseline = 'alphabetic';
        ctx.globalAlpha  = 0.88;

        const descMaxW = colW * 0.85;
        const descLines = wrapText(ctx, item.descricao, descMaxW);
        const descLh = descFs * 1.40;
        descLines.forEach((line, i) => {
          ctx.fillText(line, colX, y + fs * 0.07 + descFs * 1.18 + i * descLh);
        });
        y += fs * 0.07 + descLines.length * descLh;
        ctx.globalAlpha = 1;
      }

      y += fs * 0.50; // margin-bottom do item
    }

    // Separador/margem entre categorias
    if (singleCol && gi < grupos.length - 1) {
      y += fs * 0.26;
    }
    y += fs * 0.60; // margin-bottom do grupo
  });
}

async function drawFooterChancela(
  ctx: CanvasRenderingContext2D,
  footerTop: number
) {
  // Linha de separação superior (sutil)
  ctx.fillStyle = `${GOLD}18`;
  ctx.fillRect(SAFE_L, footerTop, SAFE_W, 1);

  try {
    const img = await loadImage('/chancela.png');
    const boxW = SAFE_W;
    const boxH = FOOTER_H;
    const imgW = img.naturalWidth  || img.width;
    const imgH = img.naturalHeight || img.height;
    if (imgW > 0 && imgH > 0) {
      const s = Math.min(boxW / imgW, boxH / imgH);
      const dw = imgW * s;
      const dh = imgH * s;
      const dx = SAFE_L + (boxW - dw) / 2;
      const dy = footerTop + (boxH - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
    }
  } catch (e) {
    console.warn('[CardapioA4Renderer] chancela.png não carregou:', e);
  }
}

function drawCropMarks(ctx: CanvasRenderingContext2D) {
  const ML = 16;
  const GAP = 5;
  const SR = SAFE_L + SAFE_W;
  const SB = SAFE_T + SAFE_H;
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  // top-left
  ctx.fillRect(SAFE_L - GAP - ML, SAFE_T, ML, 1);
  ctx.fillRect(SAFE_L, SAFE_T - GAP - ML, 1, ML);
  // top-right
  ctx.fillRect(SR + GAP, SAFE_T, ML, 1);
  ctx.fillRect(SR, SAFE_T - GAP - ML, 1, ML);
  // bottom-left
  ctx.fillRect(SAFE_L - GAP - ML, SB, ML, 1);
  ctx.fillRect(SAFE_L, SB + GAP, 1, ML);
  // bottom-right
  ctx.fillRect(SR + GAP, SB, ML, 1);
  ctx.fillRect(SR, SB + GAP, 1, ML);
}

// ─── Public API ──────────────────────────────────────────────────────────────

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

  // Garante fontes carregadas antes de medir/desenhar
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  // Layout metrics — espelha CardapioA4Canvas
  const totalItens = grupos.reduce((s, g) => s + g.itens.length, 0);
  const singleCol  = totalItens <= TWO_COL_ITEM_THRESHOLD;
  const [leftGrupos, rightGrupos] = singleCol ? [grupos, []] : splitGroups(grupos);

  const headerH = calcHeaderH(totalItens);
  const availH  = SAFE_H - headerH - COL_PAD_V * 2 - FOOTER_H - 10;

  let fs: number;
  if (singleCol) {
    const totalWeight = grupos.reduce((s, g) => s + getGroupWeight(g), 0);
    const ideal = totalWeight > 0 ? (availH * 0.98) / totalWeight : 26;
    fs = Math.max(8, Math.min(26, ideal));
  } else {
    fs = Math.min(calcFontSize(grupos, availH * 0.52), 20);
  }

  // ── Draw ──────────────────────────────────────────────────────────
  drawBackground(ctx);

  drawAccentLine(ctx, SAFE_T + 8);
  drawAccentLine(ctx, CANVAS_H - BLEED_PX - 8 - 3);

  const screwOff = BLEED_PX + SCREW_INSET + SCREW_SIZE / 2;
  drawScrew(ctx, screwOff, screwOff);
  drawScrew(ctx, CANVAS_W - screwOff, screwOff);
  drawScrew(ctx, screwOff, CANVAS_H - screwOff);
  drawScrew(ctx, CANVAS_W - screwOff, CANVAS_H - screwOff);

  const headerTop  = SAFE_T + COL_PAD_V;
  const contentTop = headerTop + headerH;
  const footerTop  = SAFE_T + SAFE_H - FOOTER_H;

  drawHeader(ctx, titulo, empresa, headerH, totalItens, headerTop);

  if (singleCol) {
    const colX = SAFE_L + COL_PAD_H;
    const colW = SAFE_W - COL_PAD_H * 2;
    drawColumn(ctx, leftGrupos, colX, contentTop, colW, fs, true);
  } else {
    // 2 colunas com divider central
    const midX = SAFE_L + SAFE_W / 2;
    const innerPad = Math.round(COL_PAD_H * 1.3);

    const leftColX  = SAFE_L + COL_PAD_H;
    const leftColW  = (midX - leftColX) - innerPad;
    const rightColX = midX + innerPad;
    const rightColW = (SAFE_L + SAFE_W - COL_PAD_H) - rightColX;

    drawColumn(ctx, leftGrupos,  leftColX,  contentTop, leftColW,  fs, false);
    drawColumn(ctx, rightGrupos, rightColX, contentTop, rightColW, fs, false);

    // Gold divider entre as colunas
    const divX  = midX - DIVIDER_W / 2;
    const divTop = contentTop + 4;
    const divBot = footerTop - 8;
    const dg = ctx.createLinearGradient(0, divTop, 0, divBot);
    dg.addColorStop(0,    'rgba(212,175,55,0)');
    dg.addColorStop(0.05, GOLD);
    dg.addColorStop(0.95, GOLD);
    dg.addColorStop(1,    'rgba(212,175,55,0)');
    ctx.fillStyle = dg;
    ctx.fillRect(divX, divTop, DIVIDER_W, divBot - divTop);
  }

  await drawFooterChancela(ctx, footerTop);

  drawCropMarks(ctx);

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
  onProgress?.('Desenhando menu A4...');
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
  PREVIEW: 1,
  MEDIUM:  2,
  HIGH:    4,
} as const;
