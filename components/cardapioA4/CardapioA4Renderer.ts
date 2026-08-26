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
  parseValorComposto,
  formatValorInline,
  VARIANTES_EMPILHA_MIN,
  PrecoVariante,
  LINHAS_SENS,
  aplicarLinhas,
} from '../../utils/cardapioParser';

import {
  CANVAS_W, CANVAS_H, BLEED_PX,
  SAFE_L, SAFE_T, SAFE_W, SAFE_H,
  FONT_REGULAR, FONT_BLACK,
  COL_PAD_H, COL_PAD_V, FOOTER_H, DIVIDER_W, SCREW_SIZE, SCREW_INSET,
  calcSingleCol,
  calcHeaderH, calcEmpresaFs, quebrarNomeEmpresa,
  FontesA4, resolveFontesA4,
} from './cardapioA4Config';

import {
  CardapioTema,
  CardapioRenderOptions,
  resolveTema,
  withAlpha,
  coverRect,
} from '../../utils/cardapioTema';
import { wrapText, loadImage, drawScrew } from '../../utils/canvasHelpers';

/** Opções do A4: tema/fundo/chancela do projeto + fontes/colunas do menu */
export type A4RenderOptions = CardapioRenderOptions & {
  fontesA4?: Partial<FontesA4> | null;
  /** Força coluna única mesmo acima do limiar automático de itens */
  forcarUmaColuna?: boolean;
};

// ─── Drawing primitives ──────────────────────────────────────────────────────

function drawBackground(
  ctx: CanvasRenderingContext2D,
  T: CardapioTema,
  fundoImg?: HTMLImageElement | null
) {
  ctx.fillStyle = T.corFundo;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  if (fundoImg) {
    const imgW = fundoImg.naturalWidth  || fundoImg.width;
    const imgH = fundoImg.naturalHeight || fundoImg.height;
    if (imgW > 0 && imgH > 0) {
      const { dx, dy, dw, dh } = coverRect(imgW, imgH, CANVAS_W, CANVAS_H);
      ctx.drawImage(fundoImg, dx, dy, dw, dh);
    }
  }

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

function drawAccentLine(ctx: CanvasRenderingContext2D, T: CardapioTema, y: number) {
  const g = ctx.createLinearGradient(SAFE_L, y, SAFE_L + SAFE_W, y);
  g.addColorStop(0,   withAlpha(T.corDourado, 0));
  g.addColorStop(0.2, T.corDourado);
  g.addColorStop(0.8, T.corDourado);
  g.addColorStop(1,   withAlpha(T.corDourado, 0));
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = g;
  ctx.fillRect(SAFE_L, y, SAFE_W, 3);
  ctx.globalAlpha = 1;
}

// Preset visual do parafuso do A4 (helper compartilhado em canvasHelpers)
const SCREW_STYLE = { size: SCREW_SIZE, highlightOffset: 0.28, ringAlpha: 0.5, dotRadius: 2.5 };

function drawHeader(
  ctx: CanvasRenderingContext2D,
  T: CardapioTema,
  F: FontesA4,
  titulo: string,
  empresa: string,
  headerH: number,
  totalItens: number,
  headerTop: number
) {
  const cx        = SAFE_L + SAFE_W / 2;
  const midY      = headerTop + headerH / 2 - 5;
  const empresaFs = calcEmpresaFs(empresa, totalItens) * F.empresa;
  const tituloFs  = Math.max(10, Math.floor(headerH * 0.115)) * F.titulo;
  const underlineW = Math.max(80, Math.min(SAFE_W * 0.62, empresa.length * 18));

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  // Empresa com glow dourado — nome longo quebra em 2 linhas centradas
  const linhas = quebrarNomeEmpresa(empresa);
  const lh = empresaFs * 0.95;
  const posY = linhas.length === 1 ? [midY] : [midY - lh / 2, midY + lh / 2];
  ctx.font        = `900 ${empresaFs}px ${FONT_BLACK}`;
  ctx.shadowColor = `${T.corDourado}60`;
  ctx.shadowBlur  = 35;
  ctx.fillStyle   = T.corDouradoClaro;
  linhas.forEach((l, i) => ctx.fillText(l, cx, posY[i]));
  ctx.shadowBlur  = 0;

  // Título acima (se houver) — ancorado no topo da primeira linha
  if (titulo) {
    const titleY = posY[0] - empresaFs * 0.45 - 10 - tituloFs / 2;
    ctx.font        = `700 ${tituloFs}px ${FONT_REGULAR}`;
    ctx.globalAlpha = 0.88;
    ctx.fillStyle   = T.corDouradoClaro;
    ctx.fillText(titulo, cx, titleY);
    ctx.globalAlpha = 1;
  }

  // Underline gold abaixo da última linha do empresa
  const underY = posY[posY.length - 1] + empresaFs * 0.45 + Math.max(4, headerH * 0.04);
  const ug = ctx.createLinearGradient(cx - underlineW / 2, underY, cx + underlineW / 2, underY);
  ug.addColorStop(0,   withAlpha(T.corDourado, 0));
  ug.addColorStop(0.5, T.corDourado);
  ug.addColorStop(1,   withAlpha(T.corDourado, 0));
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = ug;
  ctx.fillRect(cx - underlineW / 2, underY, underlineW, 1.5);
  ctx.globalAlpha = 1;
}

function drawDottedLink(
  ctx: CanvasRenderingContext2D,
  T: CardapioTema,
  x1: number,
  x2: number,
  y: number
) {
  if (x2 <= x1) return;
  ctx.save();
  ctx.setLineDash([1.5, 3]);
  ctx.strokeStyle = withAlpha(T.corTextoSuave, 0.8);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

function drawColumn(
  ctx: CanvasRenderingContext2D,
  T: CardapioTema,
  F: FontesA4,
  grupos: CardapioGroup[],
  colX: number,
  startY: number,
  colW: number,
  fs: number,
  singleCol: boolean
) {
  const catFs   = fs * 1.52 * F.categoria;
  const itemFs  = fs * F.item;
  const priceFs = Math.max(fs * 1.18 * F.preco, 11);
  const descFs  = fs * 0.68 * F.descricao;

  // Controle "juntar linhas" — mesmos fatores do A3/Lona
  const lin = F.linhas ?? 1;
  const gDesc = (v: number) => aplicarLinhas(v, LINHAS_SENS.descricao, lin);
  const gCat  = (v: number) => aplicarLinhas(v, LINHAS_SENS.categoria, lin);
  const gItem = (v: number) => aplicarLinhas(v, LINHAS_SENS.item, lin);
  const mostrarCategorias = F.mostrarCategorias ?? true;

  let y = startY;

  grupos.forEach((group, gi) => {
    // ── Categoria (ocultável) ─────────────────────────────────────────
    if (mostrarCategorias) {
      ctx.font         = `900 ${catFs}px ${FONT_BLACK}`;
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.shadowColor  = `${T.corDouradoClaro}45`;
      ctx.shadowBlur   = 12;
      ctx.fillStyle    = T.corDouradoClaro;
      const catBaseline = y + catFs * 1.05;
      ctx.fillText(group.categoria, colX, catBaseline);
      ctx.shadowBlur = 0;
      // Respiro extra: compensa baseline/line-box do canvas mais apertado que o DOM
      y = catBaseline + gCat(fs * 0.46);
    }

    // ── Itens ─────────────────────────────────────────────────────────
    for (const item of group.itens) {
      // Valor composto (tamanhos) SEMPRE empilha: nome em linha própria +
      // uma sublinha por tamanho (inline quebrava com fonte grande)
      const variantes = parseValorComposto(item.valor);
      const empilhado = !!variantes && variantes.length >= VARIANTES_EMPILHA_MIN;
      const valorLinha = empilhado ? '' : variantes ? formatValorInline(variantes) : item.valor;

      // Medir preço primeiro pra reservar espaço
      ctx.font = `900 ${priceFs}px ${FONT_BLACK}`;
      const priceW = valorLinha ? ctx.measureText(valorLinha).width : 0;
      const nameMaxW = colW - (valorLinha ? priceW + 16 : 0);

      // Nome do item (pode quebrar se tiver descricao; senão fica em 1 linha)
      ctx.font         = `700 ${itemFs}px ${FONT_REGULAR}`;
      ctx.fillStyle    = T.corTexto;
      ctx.textAlign    = 'left'; // header desenha em 'center'; garante à esquerda
      ctx.textBaseline = 'alphabetic';
      const nameBaseY = y + itemFs * 1.05;

      // Sempre faz wrap — respeita nameMaxW (espelha flex:'0 1 auto' + minWidth:0 do CSS)
      const nameLines = wrapText(ctx, item.item, nameMaxW);
      const nameLh = itemFs * 1.22;
      nameLines.forEach((line, i) => {
        ctx.fillText(line, colX, nameBaseY + i * nameLh);
      });
      const nameBlockH = nameLines.length * nameLh;

      // Dotted link em TODOS os itens com preço — descrição fica embaixo
      // (mesmo padrão do A3). Alinha no baseline da 1a linha (mesmo do preço).
      if (valorLinha) {
        const nameSpanW = nameLines.length > 1
          ? nameMaxW
          : ctx.measureText(nameLines[0]).width;
        const linkY = nameBaseY + Math.max(1, Math.round(itemFs * 0.1));
        drawDottedLink(ctx, T, colX + nameSpanW + 8, colX + colW - priceW - 8, linkY);
      }

      // Preço — alinhado à direita no baseline da primeira linha do nome
      if (valorLinha) {
        ctx.font         = `900 ${priceFs}px ${FONT_BLACK}`;
        ctx.fillStyle    = T.corDouradoClaro;
        ctx.textAlign    = 'right';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(valorLinha, colX + colW, nameBaseY);
        ctx.textAlign    = 'left';
      }

      y += valorLinha ? Math.max(nameBlockH, priceFs * 1.22) : nameBlockH;

      // Sublinhas de variantes (item empilhado): rótulo … preço, indentadas
      if (empilhado) {
        const rotFs     = itemFs * 0.9;
        const varPrFs   = priceFs * 0.92;
        const indent    = Math.round(fs * 1.1);
        const varLh     = Math.max(rotFs, varPrFs) * Math.max(1.05, gDesc(1.30));
        for (const v of variantes as PrecoVariante[]) {
          const varBaseY = y + Math.max(rotFs, varPrFs) * 1.02;

          ctx.font         = `900 ${varPrFs}px ${FONT_BLACK}`;
          const varPriceW  = ctx.measureText(v.preco).width;

          ctx.font         = `700 ${rotFs}px ${FONT_REGULAR}`;
          ctx.fillStyle    = T.corTexto;
          ctx.textBaseline = 'alphabetic';
          const rotW = ctx.measureText(v.rotulo).width;
          ctx.fillText(v.rotulo, colX + indent, varBaseY);

          const linkY = varBaseY + Math.max(1, Math.round(rotFs * 0.1));
          drawDottedLink(ctx, T, colX + indent + rotW + 8, colX + colW - varPriceW - 8, linkY);

          ctx.font      = `900 ${varPrFs}px ${FONT_BLACK}`;
          ctx.fillStyle = T.corDouradoClaro;
          ctx.textAlign = 'right';
          ctx.fillText(v.preco, colX + colW, varBaseY);
          ctx.textAlign = 'left';

          y += varLh;
        }
      }

      // Descrição (se houver)
      if (item.descricao) {
        ctx.font         = `italic ${descFs}px ${FONT_REGULAR}`;
        ctx.fillStyle    = T.corTextoSuave;
        ctx.textBaseline = 'alphabetic';
        ctx.globalAlpha  = 0.88;

        const descMaxW = colW * 0.85;
        const descLines = wrapText(ctx, item.descricao, descMaxW);
        const descLh = descFs * Math.max(1.05, gDesc(1.40));
        descLines.forEach((line, i) => {
          ctx.fillText(line, colX, y + gDesc(fs * 0.07) + descFs * 1.18 + i * descLh);
        });
        y += gDesc(fs * 0.07) + descLines.length * descLh;
        ctx.globalAlpha = 1;
      }

      y += gItem(fs * 0.50); // margin-bottom do item
    }

    // Separador/margem entre categorias
    if (singleCol && gi < grupos.length - 1) {
      y += gItem(fs * 0.26);
    }
    y += gItem(fs * 0.60); // margin-bottom do grupo
  });
}

async function drawFooterChancela(
  ctx: CanvasRenderingContext2D,
  T: CardapioTema,
  footerTop: number,
  chancelaUrl: string
) {
  // Linha de separação superior (sutil)
  ctx.fillStyle = `${T.corDourado}18`;
  ctx.fillRect(SAFE_L, footerTop, SAFE_W, 1);

  try {
    const img = await loadImage(chancelaUrl);
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
    console.warn('[CardapioA4Renderer] chancela não carregou:', e);
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
  scale = 1,
  opts: A4RenderOptions = {}
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

  const T = resolveTema(opts.tema);
  const F = resolveFontesA4(opts.fontesA4);

  // Fundo custom do projeto (se falhar, segue com cor sólida)
  let fundoImg: HTMLImageElement | null = null;
  if (opts.fundoUrl) {
    try {
      fundoImg = await loadImage(opts.fundoUrl);
    } catch (e) {
      console.warn('[CardapioA4Renderer] fundo não carregou:', e);
    }
  }

  // Layout metrics — espelha CardapioA4Canvas
  const totalItens = grupos.reduce((s, g) => s + g.itens.length, 0);
  const singleCol  = calcSingleCol(totalItens, opts.forcarUmaColuna);
  const [leftGrupos, rightGrupos] = singleCol ? [grupos, []] : splitGroups(grupos, undefined, F);

  const headerH = calcHeaderH(totalItens);
  const availH  = SAFE_H - headerH - COL_PAD_V * 2 - FOOTER_H - 10;

  let fs: number;
  if (singleCol) {
    const totalWeight = grupos.reduce((s, g) => s + getGroupWeight(g, undefined, F), 0);
    const ideal = totalWeight > 0 ? (availH * 0.98) / totalWeight : 26;
    fs = Math.max(8, Math.min(26, ideal));
  } else {
    fs = Math.min(calcFontSize(grupos, availH * 0.52, undefined, F), 20);
  }

  // ── Draw ──────────────────────────────────────────────────────────
  drawBackground(ctx, T, fundoImg);

  drawAccentLine(ctx, T, SAFE_T + 8);
  drawAccentLine(ctx, T, CANVAS_H - BLEED_PX - 8 - 3);

  const screwOff = BLEED_PX + SCREW_INSET + SCREW_SIZE / 2;
  drawScrew(ctx, T, screwOff, screwOff, SCREW_STYLE);
  drawScrew(ctx, T, CANVAS_W - screwOff, screwOff, SCREW_STYLE);
  drawScrew(ctx, T, screwOff, CANVAS_H - screwOff, SCREW_STYLE);
  drawScrew(ctx, T, CANVAS_W - screwOff, CANVAS_H - screwOff, SCREW_STYLE);

  const headerTop  = SAFE_T + COL_PAD_V;
  const contentTop = headerTop + headerH;
  const footerTop  = SAFE_T + SAFE_H - FOOTER_H;

  drawHeader(ctx, T, F, titulo, empresa, headerH, totalItens, headerTop);

  if (singleCol) {
    const colX = SAFE_L + COL_PAD_H;
    const colW = SAFE_W - COL_PAD_H * 2;
    drawColumn(ctx, T, F, leftGrupos, colX, contentTop, colW, fs, true);
  } else {
    // 2 colunas com divider central
    const midX = SAFE_L + SAFE_W / 2;
    const innerPad = Math.round(COL_PAD_H * 1.3);

    const leftColX  = SAFE_L + COL_PAD_H;
    const leftColW  = (midX - leftColX) - innerPad;
    const rightColX = midX + innerPad;
    const rightColW = (SAFE_L + SAFE_W - COL_PAD_H) - rightColX;

    drawColumn(ctx, T, F, leftGrupos,  leftColX,  contentTop, leftColW,  fs, false);
    drawColumn(ctx, T, F, rightGrupos, rightColX, contentTop, rightColW, fs, false);

    // Gold divider entre as colunas
    const divX  = midX - DIVIDER_W / 2;
    const divTop = contentTop + 4;
    const divBot = footerTop - 8;
    const dg = ctx.createLinearGradient(0, divTop, 0, divBot);
    dg.addColorStop(0,    withAlpha(T.corDourado, 0));
    dg.addColorStop(0.05, T.corDourado);
    dg.addColorStop(0.95, T.corDourado);
    dg.addColorStop(1,    withAlpha(T.corDourado, 0));
    ctx.fillStyle = dg;
    ctx.fillRect(divX, divTop, DIVIDER_W, divBot - divTop);
  }

  await drawFooterChancela(ctx, T, footerTop, opts.chancelaUrl || '/chancela.png');

  drawCropMarks(ctx);

  return canvas.toDataURL('image/png');
}

export async function exportMenuA4(
  titulo: string,
  empresa: string,
  grupos: CardapioGroup[],
  filename: string,
  scale = 1,
  onProgress?: (status: string) => void,
  opts: A4RenderOptions = {}
): Promise<void> {
  onProgress?.('Desenhando menu A4...');
  const dataUrl = await renderMenuA4ToDataURL(titulo, empresa, grupos, scale, opts);

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

/**
 * Exporta o menu como PDF A4 embutindo o PNG de 300dpi do próprio renderer —
 * saída pixel-idêntica ao preview (mesma abordagem raster do PNG Alta 4×;
 * o PDF vetorial ficou pausado, ver PENDENTE-PDF-VETORIAL-A3.md).
 */
export async function exportMenuA4Pdf(
  titulo: string,
  empresa: string,
  grupos: CardapioGroup[],
  filename: string,
  onProgress?: (status: string) => void,
  opts: A4RenderOptions = {}
): Promise<void> {
  onProgress?.('Desenhando menu A4...');
  const dataUrl = await renderMenuA4ToDataURL(
    titulo, empresa, grupos, A4_RENDER_SCALES.HIGH, opts
  );

  onProgress?.('Gerando PDF...');
  const { jsPDF } = await import('jspdf');
  // Canvas de 630×891px a 3px/mm mapeia exato na página A4 (210×297mm)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.addImage(dataUrl, 'PNG', 0, 0, 210, 297);
  doc.save(`${filename}.pdf`);

  onProgress?.('Concluído!');
}
