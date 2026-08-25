/**
 * CardapioLonaRenderer.ts
 * Renderer Canvas2D da Lona de cardápio (dimensões livres, ex.: 100×300cm).
 *
 * Preview e export usam ESTE mesmo código (muda só o px/cm), então não há
 * divergência de layout — o que se vê é o que sai no arquivo.
 *
 * Modos de fundo (decisão do usuário no export):
 *  - 'imagem'       arte da lona por baixo do conteúdo (arquivo final completo)
 *  - 'cor'          cor sólida do tema (sem arte enviada)
 *  - 'transparente' só o conteúdo, com alpha — para compor em vetor no Corel
 */

import { CardapioGroup } from '../../utils/cardapioParser';
import {
  CardapioTema,
  resolveTema,
  withAlpha,
  coverRect,
} from '../../utils/cardapioTema';
import { wrapText, loadImage } from '../../utils/canvasHelpers';
import {
  PX_PER_CM,
  calcExportPxPerCm,
  LonaDimensoes,
  resolveAreaUtil,
  fitLogoCm,
  FontesLona,
  resolveFontesLona,
  LonaBloco,
  medirBloco,
  calcLonaLayout,
  BlocoMedido,
  LonaLayout,
  BLOCO_GAP_CM,
  COL_GAP_CM,
  UTIL_PAD_CM,
  LOGO_GAP_CM,
  TITULO_WEIGHT_EM,
  calcColunasDestaque,
} from './cardapioLonaConfig';

const FONT_REGULAR = 'Arial, Helvetica, sans-serif';
const FONT_BLACK = '"Arial Black", Impact, Arial, Helvetica, sans-serif';

export type LonaFundoModo = 'imagem' | 'cor' | 'transparente';

export interface LonaRenderOptions {
  tema?: Partial<CardapioTema> | null;
  /** Arte de fundo da lona (usada quando fundoModo = 'imagem') */
  fundoUrl?: string | null;
  fundoModo?: LonaFundoModo;
  fontes?: Partial<FontesLona> | null;
  /** Guia tracejada da área útil (só no preview) */
  mostrarGuia?: boolean;
  /** px por cm; default PX_PER_CM (preview) */
  pxPerCm?: number;
}

export interface LonaRenderResult {
  dataUrl: string;
  /** Fonte base calculada, em cm (1 "em" dos itens) */
  fonteCm: number;
  /** true quando o auto-fit ficou abaixo do mínimo legível */
  abaixoDoMinimo: boolean;
  larguraPx: number;
  alturaPx: number;
}

interface LogoCarregada {
  img: HTMLImageElement;
  ratio: number; // altura/largura natural
}

async function carregarLogos(blocos: LonaBloco[]): Promise<Map<string, LogoCarregada>> {
  const out = new Map<string, LogoCarregada>();
  await Promise.all(
    blocos
      .filter((b) => b.logoUrl)
      .map(async (b) => {
        try {
          const img = await loadImage(b.logoUrl!);
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          if (w > 0 && h > 0) out.set(b.menuId, { img, ratio: h / w });
        } catch (e) {
          console.warn('[CardapioLonaRenderer] logo não carregou:', b.logoUrl, e);
        }
      })
  );
  return out;
}

// ─── Desenho de conteúdo ─────────────────────────────────────────────────────

/** Desenha grupos de um bloco a partir de (x, y); devolve o y final. */
function drawGrupos(
  ctx: CanvasRenderingContext2D,
  T: CardapioTema,
  F: FontesLona,
  grupos: CardapioGroup[],
  x: number,
  y: number,
  w: number,
  fs: number
): number {
  const catFs = fs * 1.42 * F.categoria;
  const itemFs = fs * F.item;
  const priceFs = fs * 1.12 * F.preco;
  const descFs = fs * 0.68 * F.descricao;

  grupos.forEach((group) => {
    // Categoria
    ctx.font = `900 ${catFs}px ${FONT_BLACK}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = T.corDouradoClaro;
    const catBaseline = y + catFs * 1.05;
    ctx.fillText(group.categoria, x, catBaseline);
    y = catBaseline + fs * 0.5;

    // Itens
    for (const item of group.itens) {
      ctx.font = `900 ${priceFs}px ${FONT_BLACK}`;
      const priceW = item.valor ? ctx.measureText(item.valor).width : 0;
      const nameMaxW = w - (item.valor ? priceW + fs * 0.8 : 0);

      ctx.font = `700 ${itemFs}px ${FONT_REGULAR}`;
      ctx.fillStyle = T.corTexto;
      const nameBaseY = y + itemFs * 1.05;
      const nameLines = wrapText(ctx, item.item, nameMaxW);
      const nameLh = itemFs * 1.22;
      nameLines.forEach((line, i) => ctx.fillText(line, x, nameBaseY + i * nameLh));
      const nameBlockH = nameLines.length * nameLh;

      if (item.valor) {
        // Pontilhado entre nome e preço
        const nameSpanW = nameLines.length > 1
          ? nameMaxW
          : ctx.measureText(nameLines[0]).width;
        const linkY = nameBaseY + Math.max(1, Math.round(itemFs * 0.1));
        const x1 = x + nameSpanW + fs * 0.4;
        const x2 = x + w - priceW - fs * 0.4;
        if (x2 > x1) {
          ctx.save();
          ctx.setLineDash([fs * 0.12, fs * 0.24]);
          ctx.strokeStyle = withAlpha(T.corTextoSuave, 0.8);
          ctx.lineWidth = Math.max(1, fs * 0.08);
          ctx.beginPath();
          ctx.moveTo(x1, linkY);
          ctx.lineTo(x2, linkY);
          ctx.stroke();
          ctx.restore();
        }

        ctx.font = `900 ${priceFs}px ${FONT_BLACK}`;
        ctx.fillStyle = T.corDouradoClaro;
        ctx.textAlign = 'right';
        ctx.fillText(item.valor, x + w, nameBaseY);
        ctx.textAlign = 'left';
      }

      y += Math.max(nameBlockH, priceFs * 1.22);

      if (item.descricao) {
        ctx.font = `italic ${descFs}px ${FONT_REGULAR}`;
        ctx.fillStyle = T.corTextoSuave;
        ctx.globalAlpha = 0.88;
        const descLines = wrapText(ctx, item.descricao, w * 0.85);
        const descLh = descFs * 1.4;
        descLines.forEach((line, i) => {
          ctx.fillText(line, x, y + fs * 0.07 + descFs * 1.18 + i * descLh);
        });
        y += fs * 0.07 + descLines.length * descLh;
        ctx.globalAlpha = 1;
      }

      y += fs * 0.5;
    }

    y += fs * 0.6;
  });

  return y;
}

/** Desenha um bloco (logo/título + grupos); devolve o y final. */
function drawBloco(
  ctx: CanvasRenderingContext2D,
  T: CardapioTema,
  F: FontesLona,
  medido: BlocoMedido,
  logo: LogoCarregada | undefined,
  x: number,
  y: number,
  w: number,
  fs: number,
  pxPerCm: number
): number {
  const b = medido.bloco;

  if (b.logoUrl && logo) {
    const { wCm, hCm } = fitLogoCm(1, logo.ratio, b.logoMaxLarguraCm, b.logoMaxAlturaCm);
    const dw = Math.min(wCm * pxPerCm, w);
    const dh = dw > 0 ? dw * logo.ratio : hCm * pxPerCm;
    const dx = x + (w - dw) / 2;
    ctx.drawImage(logo.img, dx, y, dw, dh);
    y += dh + LOGO_GAP_CM * pxPerCm;
  } else {
    const tituloFs = fs * 1.7 * F.titulo;
    ctx.font = `900 ${tituloFs}px ${FONT_BLACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = T.corDouradoClaro;
    ctx.fillText(b.titulo, x + w / 2, y + tituloFs * 1.05);
    ctx.textAlign = 'left';
    y += TITULO_WEIGHT_EM * F.titulo * fs;
  }

  if (b.destaque) {
    const nCols = calcColunasDestaque(b.grupos);
    const gap = COL_GAP_CM * pxPerCm * 0.7;
    const colW = (w - gap * (nCols - 1)) / nCols;
    let maxY = y;
    // Mesma distribuição round-robin usada em medirBloco
    const porColuna: CardapioGroup[][] = Array.from({ length: nCols }, () => []);
    b.grupos.forEach((g, i) => porColuna[i % nCols].push(g));
    porColuna.forEach((grupos, c) => {
      const fim = drawGrupos(ctx, T, F, grupos, x + c * (colW + gap), y, colW, fs);
      maxY = Math.max(maxY, fim);
    });
    return maxY;
  }

  return drawGrupos(ctx, T, F, b.grupos, x, y, w, fs);
}

// ─── API pública ─────────────────────────────────────────────────────────────

export async function renderLonaToDataURL(
  dim: LonaDimensoes,
  blocos: LonaBloco[],
  nColunas: number,
  opts: LonaRenderOptions = {}
): Promise<LonaRenderResult> {
  const pxPerCm = opts.pxPerCm ?? PX_PER_CM;
  const W = Math.round(dim.larguraCm * pxPerCm);
  const H = Math.round(dim.alturaCm * pxPerCm);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const T = resolveTema(opts.tema);
  const F = resolveFontesLona(opts.fontes);
  const fundoModo: LonaFundoModo = opts.fundoModo ?? (opts.fundoUrl ? 'imagem' : 'cor');

  // Fundo
  if (fundoModo === 'cor') {
    ctx.fillStyle = T.corFundo;
    ctx.fillRect(0, 0, W, H);
  } else if (fundoModo === 'imagem' && opts.fundoUrl) {
    ctx.fillStyle = T.corFundo;
    ctx.fillRect(0, 0, W, H);
    try {
      const img = await loadImage(opts.fundoUrl);
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      if (iw > 0 && ih > 0) {
        const { dx, dy, dw, dh } = coverRect(iw, ih, W, H);
        ctx.drawImage(img, dx, dy, dw, dh);
      }
    } catch (e) {
      console.warn('[CardapioLonaRenderer] fundo não carregou:', e);
    }
  }
  // 'transparente': não pinta nada — alpha preservado para compor no Corel

  // Layout
  const logos = await carregarLogos(blocos);
  const medidos = blocos.map((b) =>
    medirBloco(b, logos.get(b.menuId)?.ratio ?? null, F)
  );
  const layout: LonaLayout = calcLonaLayout(medidos, nColunas, dim.utilAlturaCm);
  const fs = layout.fonteCm * pxPerCm;

  const util = resolveAreaUtil(dim);
  const utilX = util.x * pxPerCm;
  const utilY = util.y * pxPerCm;
  const utilW = util.w * pxPerCm;
  const utilH = util.h * pxPerCm;

  const padPx = UTIL_PAD_CM * pxPerCm;
  const contentX = utilX + padPx;
  const contentW = utilW - padPx * 2;
  let y = utilY + padPx;

  // Blocos destaque: largura total, empilhados no topo
  for (const medido of layout.destaques) {
    y = drawBloco(ctx, T, F, medido, logos.get(medido.bloco.menuId), contentX, y, contentW, fs, pxPerCm);
    y += BLOCO_GAP_CM * pxPerCm;
  }

  // Colunas de blocos normais
  const nCols = layout.colunas.length;
  const gapPx = COL_GAP_CM * pxPerCm;
  const colW = (contentW - gapPx * (nCols - 1)) / nCols;
  layout.colunas.forEach((col, c) => {
    const colX = contentX + c * (colW + gapPx);
    let colY = y;
    for (const medido of col) {
      colY = drawBloco(ctx, T, F, medido, logos.get(medido.bloco.menuId), colX, colY, colW, fs, pxPerCm);
      colY += BLOCO_GAP_CM * pxPerCm;
    }
  });

  // Guia da área útil (preview)
  if (opts.mostrarGuia) {
    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(255,60,60,0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(utilX, utilY, utilW, utilH);
    ctx.restore();
  }

  return {
    dataUrl: canvas.toDataURL('image/png'),
    fonteCm: layout.fonteCm,
    abaixoDoMinimo: layout.abaixoDoMinimo,
    larguraPx: W,
    alturaPx: H,
  };
}

function baixar(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** Export PNG na resolução de impressão (~100dpi, limitado pelo canvas). */
export async function exportLonaPng(
  dim: LonaDimensoes,
  blocos: LonaBloco[],
  nColunas: number,
  filename: string,
  onProgress?: (status: string) => void,
  opts: LonaRenderOptions = {}
): Promise<void> {
  onProgress?.('Desenhando lona...');
  const pxPerCm = calcExportPxPerCm(dim.larguraCm, dim.alturaCm);
  const r = await renderLonaToDataURL(dim, blocos, nColunas, {
    ...opts,
    mostrarGuia: false,
    pxPerCm,
  });
  onProgress?.('Preparando download...');
  baixar(r.dataUrl, `${filename}.png`);
  onProgress?.('Concluído!');
}

/**
 * Export PDF nas dimensões físicas da lona (página em mm), com o PNG de
 * impressão embutido — mesma abordagem raster do A4.
 */
export async function exportLonaPdf(
  dim: LonaDimensoes,
  blocos: LonaBloco[],
  nColunas: number,
  filename: string,
  onProgress?: (status: string) => void,
  opts: LonaRenderOptions = {}
): Promise<void> {
  onProgress?.('Desenhando lona...');
  const pxPerCm = calcExportPxPerCm(dim.larguraCm, dim.alturaCm);
  const r = await renderLonaToDataURL(dim, blocos, nColunas, {
    ...opts,
    mostrarGuia: false,
    pxPerCm,
  });

  onProgress?.('Gerando PDF...');
  const { jsPDF } = await import('jspdf');
  const wMm = dim.larguraCm * 10;
  const hMm = dim.alturaCm * 10;
  const doc = new jsPDF({
    orientation: wMm >= hMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [wMm, hMm],
    compress: true,
  });
  doc.addImage(r.dataUrl, 'PNG', 0, 0, wMm, hMm);
  doc.save(`${filename}.pdf`);
  onProgress?.('Concluído!');
}
