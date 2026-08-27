/**
 * A3PdfExporter.ts
 *
 * Gera o PDF do A3 Duplo DIRETO em vetor (jsPDF), sem passar pelo diálogo de
 * impressão do navegador — imune ao "Microsoft Print to PDF" (que rasteriza
 * tudo em imagens picotadas, como aconteceu no cardápio do Pompeu 2026).
 *
 * Fontes embutidas (públicas, licença OFL):
 *  - Liberation Sans (métricas idênticas à Arial) — regular / bold / italic
 *  - Archivo Black (substituta visual da Arial Black)
 *
 * O desenho espelha o EmpresaBlock do A3DuploCanvas (mesmos tamanhos, margens
 * e espaçamentos). Brilhos/sombras de texto e o vignette não existem em PDF
 * vetorial — o resultado impresso é o mesmo, mais limpo.
 */

import { jsPDF } from 'jspdf';
import { CardapioTema } from '../../utils/cardapioTema';
import {
  parseValorComposto,
  VARIANTES_EMPILHA_MIN,
  PrecoVariante,
} from '../../utils/cardapioParser';
import {
  A3DuploMenuData,
  LayoutResult,
  FontesA3,
  LINHAS_SENS,
  aplicarLinhas,
} from './a3DuploLayout';

// ─── Geometria (px @96dpi, igual ao canvas) → convertida para pt ─────────────
const MM_TO_PX = 96 / 25.4;
const A3_W_MM = 297;
const A3_H_MM = 420;
const PAGE_PAD_MM = 15;
const COL_GAP_MM = 10;

const PAGE_W_PX = A3_W_MM * MM_TO_PX;
const PAGE_H_PX = A3_H_MM * MM_TO_PX;
const PAD_PX = PAGE_PAD_MM * MM_TO_PX;
const GAP_PX = COL_GAP_MM * MM_TO_PX;

const K = 72 / 96; // px → pt

// ─── Helpers compartilhados (utils/pdfVetorial + texto em curvas) ────────────
import {
  hexToRgb,
  withOpacityPdf as withOpacity,
  carregarImagemPdf as carregarFundo,
  linhaDegradePdf,
} from '../../utils/pdfVetorial';
import {
  carregarFontesVetor,
  medirTextoVetor,
  quebrarTextoVetor,
  textoVetorPdf,
  FonteVetor,
} from '../../utils/pdfTextoVetor';

// TODO O TEXTO sai como CURVAS (sem fontes no arquivo): o Corel abre sem
// diálogo de substituição e sem cortar pontas de letras na conversão.

/** Quebra texto na largura (px) usando as métricas reais da fonte. */
function wrap(fonte: FonteVetor, sizePx: number, text: string, maxWidthPx: number): string[] {
  return quebrarTextoVetor(text, fonte, sizePx * K, maxWidthPx * K);
}

/** Largura do texto em px. */
function medir(fonte: FonteVetor, sizePx: number, text: string): number {
  return medirTextoVetor(text, fonte, sizePx * K) / K;
}

// ─── Desenho de um bloco de empresa (espelha EmpresaBlock) ───────────────────
interface DrawCtx {
  doc: jsPDF;
  t: CardapioTema;
  f: FontesA3;
  scale: number;
  spacing: number;
}

function drawEmpresaBlock(
  ctx: DrawCtx,
  menu: A3DuploMenuData,
  grupos: A3DuploMenuData['itens'],
  isContinuacao: boolean,
  xPx: number,
  yPx: number,
  colWPx: number
): number {
  const { doc, t, f, scale, spacing } = ctx;
  let y = yPx;
  const cx = xPx + colWPx / 2;

  // Controle "juntar linhas" — mesmos fatores do EmpresaBlock
  const lin = f.linhas ?? 1;
  const gDesc = (v: number) => aplicarLinhas(v, LINHAS_SENS.descricao, lin);
  const gCat  = (v: number) => aplicarLinhas(v, LINHAS_SENS.categoria, lin);
  const gItem = (v: number) => aplicarLinhas(v, LINHAS_SENS.item, lin);
  const mostrarCategorias = f.mostrarCategorias ?? true;

  // ── Cabeçalho (título + empresa + underline) ──────────────────────────
  if (menu.titulo && !isContinuacao) {
    const size = f.titulo * scale;
    textoVetorPdf(doc, (menu.titulo || '').toUpperCase(), 'bold', size * K,
      cx * K, (y + size * 0.95) * K, { align: 'center', corHex: t.corDouradoClaro });
    y += size * 1.15 + 2;
  }

  {
    const size = f.empresa * scale;
    const nome = `${(menu.empresa || '').toUpperCase()}${isContinuacao ? ' ›' : ''}`;
    const linhas = wrap('black', size, nome, colWPx);
    linhas.forEach((l, i) => {
      textoVetorPdf(doc, l, 'black', size * K,
        cx * K, (y + size * 0.88 + i * size * 1.05) * K, { align: 'center', corHex: t.corDouradoClaro });
    });
    y += linhas.length * size * 1.05;
  }

  // Underline dourado com pontas esvanecidas (mesmo degradê do preview)
  {
    const w = colWPx * 0.6;
    y += 6;
    linhaDegradePdf(doc, t.corDourado, (cx - w / 2) * K, y * K, w * K, 2 * K, 0.8);
    y += 2 + 6;
  }

  y += gCat(10 * scale * spacing); // marginBottom do cabeçalho

  // ── Grupos ────────────────────────────────────────────────────────────
  grupos.forEach((grupo, gi) => {
    if (gi > 0) y += gItem(12 * scale * spacing); // gap entre grupos

    // Categoria (ocultável pelo controle do painel)
    if (mostrarCategorias) {
      const size = f.categoria * scale;
      textoVetorPdf(doc, (grupo.categoria || '').toUpperCase(), 'black', size * K,
        xPx * K, (y + size * 0.88) * K, { corHex: t.corDouradoClaro });
      y += size * 1.15 + gCat(6 * scale * spacing);
    }

    // Itens
    grupo.itens.forEach((item) => {
      const itemSize = f.item * scale;
      const precoSize = f.preco * scale;
      const descSize = f.descricao * scale;

      // Valor composto (tamanhos) SEMPRE empilha: nome em linha própria +
      // uma sublinha por tamanho (mesma regra do EmpresaBlock/A4)
      const variantes = parseValorComposto(item.valor);
      const empilhado = !!variantes && variantes.length >= VARIANTES_EMPILHA_MIN;
      const valorLinha = empilhado ? '' : item.valor;

      // mede o preço primeiro
      const precoW = valorLinha ? medir('black', precoSize, valorLinha) : 0;

      // nome (pode quebrar)
      const nomeMaxW = valorLinha ? colWPx - precoW - 16 : colWPx;
      const nomeLinhas = wrap('bold', itemSize, item.item || '', nomeMaxW);
      const baseline1 = y + itemSize * 0.88;

      nomeLinhas.forEach((l, i) => {
        textoVetorPdf(doc, l, 'bold', itemSize * K,
          xPx * K, (baseline1 + i * itemSize * 1.15) * K, { corHex: t.corTexto });
      });

      // pontilhado + preço (alinhados no baseline da 1ª linha)
      if (valorLinha) {
        const nomeW = medir('bold', itemSize, nomeLinhas[0]);
        const x1 = xPx + nomeW + 8;
        const x2 = xPx + colWPx - precoW - 8;
        if (x2 > x1) {
          withOpacity(doc, 0.55, () => {
            const [r, g, b] = hexToRgb(t.corTextoSuave);
            doc.setDrawColor(r, g, b);
            doc.setLineWidth(1 * K);
            doc.setLineDashPattern([1.5 * K, 3 * K], 0);
            doc.line(x1 * K, baseline1 * K, x2 * K, baseline1 * K);
            doc.setLineDashPattern([], 0);
          });
        }

        textoVetorPdf(doc, valorLinha, 'black', precoSize * K,
          (xPx + colWPx) * K, baseline1 * K, { align: 'right', corHex: t.corDouradoClaro });
      }

      y += valorLinha
        ? Math.max(nomeLinhas.length * itemSize * 1.15, precoSize * 1.15)
        : nomeLinhas.length * itemSize * 1.15;

      // Sublinhas de variantes: rótulo … preço, indentadas (espelha o DOM:
      // fontes *0.9/*0.92, indent 1.2×item, linha 1.3×)
      if (empilhado) {
        const rotSize = itemSize * 0.9;
        const varPrecoSize = precoSize * 0.92;
        const indent = itemSize * 1.2;
        const varLh = Math.max(rotSize, varPrecoSize) * Math.max(1.05, gDesc(1.3));
        for (const v of variantes as PrecoVariante[]) {
          const varBase = y + rotSize * 0.88;

          const vPrecoW = medir('black', varPrecoSize, v.preco);
          const rotW = medir('bold', rotSize, v.rotulo);
          textoVetorPdf(doc, v.rotulo, 'bold', rotSize * K,
            (xPx + indent) * K, varBase * K, { corHex: t.corTexto });

          const x1 = xPx + indent + rotW + 8;
          const x2 = xPx + colWPx - vPrecoW - 8;
          if (x2 > x1) {
            withOpacity(doc, 0.55, () => {
              const [r, g, b] = hexToRgb(t.corTextoSuave);
              doc.setDrawColor(r, g, b);
              doc.setLineWidth(1 * K);
              doc.setLineDashPattern([1.5 * K, 3 * K], 0);
              doc.line(x1 * K, varBase * K, x2 * K, varBase * K);
              doc.setLineDashPattern([], 0);
            });
          }

          textoVetorPdf(doc, v.preco, 'black', varPrecoSize * K,
            (xPx + colWPx) * K, varBase * K, { align: 'right', corHex: t.corDouradoClaro });

          y += varLh;
        }
      }

      // descrição (abaixo, largura total)
      if (item.descricao) {
        const descLh = descSize * Math.max(1.05, gDesc(1.3));
        y += gDesc(2);
        const descLinhas = wrap('italic', descSize, item.descricao, colWPx);
        descLinhas.forEach((l, i) => {
          textoVetorPdf(doc, l, 'italic', descSize * K,
            xPx * K, (y + descSize * 0.88 + i * descLh) * K, { corHex: t.corTextoSuave });
        });
        y += descLinhas.length * descLh;
      }

      y += gItem(5 * scale * spacing); // margem entre itens
    });
  });

  y += gItem(15 * scale * spacing); // marginBottom do bloco
  return y;
}

// ─── API pública ─────────────────────────────────────────────────────────────
export interface GerarPdfA3Options {
  menus: A3DuploMenuData[];
  layout: LayoutResult;
  fontes: FontesA3;
  tema: CardapioTema;
  fundoUrl?: string | null;
}

export async function gerarPdfA3(o: GerarPdfA3Options): Promise<Blob> {
  // putOnlyUsedFonts: sem ela o jsPDF declara as fontes-padrão do PDF
  // (Times/Symbol/ZapfDingbats) mesmo sem uso e o Corel pede substituição
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a3', compress: true, putOnlyUsedFonts: true });
  await carregarFontesVetor();

  const fundo = o.fundoUrl ? await carregarFundo(o.fundoUrl) : null;
  const topoPx = (o.fontes.topoMm ?? 0) * MM_TO_PX;
  const numCols = o.layout.numColunas;
  const colWPx = (PAGE_W_PX - 2 * PAD_PX - (numCols - 1) * GAP_PX) / numCols;

  const ctx: DrawCtx = {
    doc,
    t: o.tema,
    f: o.fontes,
    scale: o.layout.scale,
    spacing: o.layout.spacing,
  };

  o.layout.paginas.forEach((pagina, pi) => {
    if (pi > 0) doc.addPage('a3', 'portrait');

    // Fundo: cor sólida sempre; imagem em cover por cima (mesmo layering do preview)
    const [r, g, b] = hexToRgb(o.tema.corFundo);
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, PAGE_W_PX * K, PAGE_H_PX * K, 'F');
    if (fundo && fundo.w > 0 && fundo.h > 0) {
      const s = Math.max(PAGE_W_PX / fundo.w, PAGE_H_PX / fundo.h);
      const dw = fundo.w * s;
      const dh = fundo.h * s;
      const dx = (PAGE_W_PX - dw) / 2;
      const dy = (PAGE_H_PX - dh) / 2;
      const fmt = fundo.data.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(fundo.data, fmt, dx * K, dy * K, dw * K, dh * K);
    }

    pagina.forEach((coluna, ci) => {
      const x = PAD_PX + ci * (colWPx + GAP_PX);
      let y = PAD_PX + topoPx;
      coluna.forEach((bloco) => {
        const menu = o.menus[bloco.menuIdx];
        y = drawEmpresaBlock(ctx, menu, bloco.grupos, bloco.isContinuacao, x, y, colWPx);
      });
    });
  });

  return doc.output('blob');
}

/** Nome de arquivo amigável: "Cardápio A3 - EVENTO - N parceiros.pdf" */
export function nomeArquivoPdfA3(nomeProjeto: string | null | undefined, totalEmpresas: number): string {
  const evento = (nomeProjeto || 'Evento').trim();
  const plural = totalEmpresas === 1 ? 'parceiro' : 'parceiros';
  const nome = `Cardápio A3 - ${evento} - ${totalEmpresas} ${plural}.pdf`;
  return nome.replace(/[\\/:*?"<>|]/g, '-');
}
