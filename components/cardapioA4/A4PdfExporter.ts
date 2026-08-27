/**
 * A4PdfExporter.ts
 *
 * PDF VETORIAL do menu A4 (jsPDF): texto selecionável e nítido em qualquer
 * zoom, com as mesmas fontes embutidas do A3 (Liberation Sans ≈ Arial;
 * Archivo Black ≈ Arial Black).
 *
 * O desenho espelha o CardapioA4Renderer (mesmas medidas em px @3px/mm,
 * convertidas para pt), mas sai APENAS O CONTEÚDO sobre fundo chapado na
 * cor do tema: sem arte de fundo, sem chancela e sem decoração (parafusos
 * e linhas de destaque) — rápido de gerar e pronto para compor a arte no
 * Corel (o retângulo de fundo é vetor, fácil de remover/trocar lá).
 */

import { jsPDF } from 'jspdf';
import {
  CardapioGroup,
  splitGroups,
  calcFontSize,
  getGroupWeight,
  parseValorComposto,
  VARIANTES_EMPILHA_MIN,
  PrecoVariante,
  LINHAS_SENS,
  aplicarLinhas,
} from '../../utils/cardapioParser';
import {
  CANVAS_W, CANVAS_H,
  SAFE_L, SAFE_T, SAFE_W, SAFE_H,
  COL_PAD_H, COL_PAD_V, FOOTER_H, DIVIDER_W,
  calcSingleCol,
  calcHeaderH, calcEmpresaFs, quebrarNomeEmpresa,
  FontesA4, resolveFontesA4,
} from './cardapioA4Config';
import { CardapioTema, resolveTema } from '../../utils/cardapioTema';
import {
  hexToRgb,
  setFillColorPdf,
  withOpacityPdf,
  linhaDegradePdf,
} from '../../utils/pdfVetorial';
import {
  carregarFontesVetor,
  medirTextoVetor,
  quebrarTextoVetor,
  textoVetorPdf,
  FonteVetor,
} from '../../utils/pdfTextoVetor';
import type { A4RenderOptions } from './CardapioA4Renderer';

// px do renderer (3 px/mm) → pt do PDF (72 pt/in ÷ 25.4 mm/in ÷ 3)
const K = 72 / 25.4 / 3;

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

function linhaPontilhada(
  doc: jsPDF,
  T: CardapioTema,
  x1: number,
  x2: number,
  y: number
) {
  if (x2 <= x1) return;
  withOpacityPdf(doc, 0.8, () => {
    const [r, g, b] = hexToRgb(T.corTextoSuave);
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(1.5 * K);
    doc.setLineDashPattern([1.5 * K, 3 * K], 0);
    doc.line(x1 * K, y * K, x2 * K, y * K);
    doc.setLineDashPattern([], 0);
  });
}

function drawColumnPdf(
  doc: jsPDF,
  T: CardapioTema,
  F: FontesA4,
  grupos: CardapioGroup[],
  colX: number,
  startY: number,
  colW: number,
  fs: number,
  singleCol: boolean
): void {
  const catFs   = fs * 1.52 * F.categoria;
  const itemFs  = fs * F.item;
  const priceFs = Math.max(fs * 1.18 * F.preco, 11);
  const descFs  = fs * 0.68 * F.descricao;

  const lin = F.linhas ?? 1;
  const gDesc = (v: number) => aplicarLinhas(v, LINHAS_SENS.descricao, lin);
  const gCat  = (v: number) => aplicarLinhas(v, LINHAS_SENS.categoria, lin);
  const gItem = (v: number) => aplicarLinhas(v, LINHAS_SENS.item, lin);
  const mostrarCategorias = F.mostrarCategorias ?? true;

  let y = startY;

  grupos.forEach((group, gi) => {
    if (mostrarCategorias) {
      const catBaseline = y + catFs * 1.05;
      textoVetorPdf(doc, group.categoria, 'black', catFs * K,
        colX * K, catBaseline * K, { corHex: T.corDouradoClaro });
      y = catBaseline + gCat(fs * 0.46);
    }

    for (const item of group.itens) {
      const variantes = parseValorComposto(item.valor);
      const empilhado = !!variantes && variantes.length >= VARIANTES_EMPILHA_MIN;
      const valorLinha = empilhado ? '' : item.valor;

      const priceW = valorLinha ? medir('black', priceFs, valorLinha) : 0;
      const nameMaxW = colW - (valorLinha ? priceW + 16 : 0);

      const nameBaseY = y + itemFs * 1.05;
      const nameLines = wrap('bold', itemFs, item.item, nameMaxW);
      const nameLh = itemFs * 1.22;
      nameLines.forEach((line, i) => {
        textoVetorPdf(doc, line, 'bold', itemFs * K,
          colX * K, (nameBaseY + i * nameLh) * K, { corHex: T.corTexto });
      });
      const nameBlockH = nameLines.length * nameLh;

      if (valorLinha) {
        const nameSpanW = nameLines.length > 1
          ? nameMaxW
          : medir('bold', itemFs, nameLines[0]);
        const linkY = nameBaseY + Math.max(1, Math.round(itemFs * 0.1));
        linhaPontilhada(doc, T, colX + nameSpanW + 8, colX + colW - priceW - 8, linkY);

        textoVetorPdf(doc, valorLinha, 'black', priceFs * K,
          (colX + colW) * K, nameBaseY * K, { align: 'right', corHex: T.corDouradoClaro });
      }

      y += valorLinha ? Math.max(nameBlockH, priceFs * 1.22) : nameBlockH;

      if (empilhado) {
        const rotFs   = itemFs * 0.9;
        const varPrFs = priceFs * 0.92;
        const indent  = Math.round(fs * 1.1);
        const varLh   = Math.max(rotFs, varPrFs) * Math.max(1.05, gDesc(1.30));
        for (const v of variantes as PrecoVariante[]) {
          const varBaseY = y + Math.max(rotFs, varPrFs) * 1.02;

          const varPriceW = medir('black', varPrFs, v.preco);
          const rotW = medir('bold', rotFs, v.rotulo);
          textoVetorPdf(doc, v.rotulo, 'bold', rotFs * K,
            (colX + indent) * K, varBaseY * K, { corHex: T.corTexto });

          const linkY = varBaseY + Math.max(1, Math.round(rotFs * 0.1));
          linhaPontilhada(doc, T, colX + indent + rotW + 8, colX + colW - varPriceW - 8, linkY);

          textoVetorPdf(doc, v.preco, 'black', varPrFs * K,
            (colX + colW) * K, varBaseY * K, { align: 'right', corHex: T.corDouradoClaro });

          y += varLh;
        }
      }

      if (item.descricao) {
        const descMaxW = colW * 0.85;
        const descLines = wrap('italic', descFs, item.descricao, descMaxW);
        const descLh = descFs * Math.max(1.05, gDesc(1.40));
        withOpacityPdf(doc, 0.88, () => {
          descLines.forEach((line, i) => {
            textoVetorPdf(doc, line, 'italic', descFs * K,
              colX * K, (y + gDesc(fs * 0.07) + descFs * 1.18 + i * descLh) * K,
              { corHex: T.corTextoSuave });
          });
        });
        y += gDesc(fs * 0.07) + descLines.length * descLh;
      }

      y += gItem(fs * 0.50);
    }

    if (singleCol && gi < grupos.length - 1) {
      y += gItem(fs * 0.26);
    }
    y += gItem(fs * 0.60);
  });
}

/** Gera o PDF vetorial do menu A4 (página 210×297mm). */
export async function gerarPdfMenuA4(
  titulo: string,
  empresa: string,
  grupos: CardapioGroup[],
  opts: A4RenderOptions = {}
): Promise<Blob> {
  // putOnlyUsedFonts: sem ela o jsPDF declara as fontes-padrão do PDF
  // (Times/Symbol/ZapfDingbats) mesmo sem uso e o Corel pede substituição
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true, putOnlyUsedFonts: true });
  await carregarFontesVetor();

  const T = resolveTema(opts.tema);
  const F = resolveFontesA4(opts.fontesA4);

  // ── Fundo CHAPADO na cor do tema — sem arte, sem decoração ──
  // (a arte/chancela entram depois na composição no Corel; o retângulo é
  // vetor e pode ser removido/trocado lá em um clique)
  setFillColorPdf(doc, T.corFundo);
  doc.rect(0, 0, CANVAS_W * K, CANVAS_H * K, 'F');

  // ── Layout (idêntico ao renderer) ──
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

  const headerTop  = SAFE_T + COL_PAD_V;
  const contentTop = headerTop + headerH;
  const footerTop  = SAFE_T + SAFE_H - FOOTER_H;

  // ── Cabeçalho: título + empresa (até 2 linhas) + underline ──
  const cx        = SAFE_L + SAFE_W / 2;
  const midY      = headerTop + headerH / 2 - 5;
  const empresaFs = calcEmpresaFs(empresa, totalItens) * F.empresa;
  const tituloFs  = Math.max(10, Math.floor(headerH * 0.115)) * F.titulo;
  const underlineW = Math.max(80, Math.min(SAFE_W * 0.62, empresa.length * 18));

  const linhasNome = quebrarNomeEmpresa(empresa);
  const lhNome = empresaFs * 0.95;
  const posY = linhasNome.length === 1 ? [midY] : [midY - lhNome / 2, midY + lhNome / 2];

  // Baseline ≈ centro vertical + 0.36em (equivale ao textBaseline 'middle')
  linhasNome.forEach((l, i) => {
    textoVetorPdf(doc, l, 'black', empresaFs * K,
      cx * K, (posY[i] + empresaFs * 0.36) * K, { align: 'center', corHex: T.corDouradoClaro });
  });

  if (titulo) {
    const titleY = posY[0] - empresaFs * 0.45 - 10 - tituloFs / 2;
    withOpacityPdf(doc, 0.88, () => {
      textoVetorPdf(doc, titulo, 'bold', tituloFs * K,
        cx * K, (titleY + tituloFs * 0.36) * K, { align: 'center', corHex: T.corDouradoClaro });
    });
  }

  const underY = posY[posY.length - 1] + empresaFs * 0.45 + Math.max(4, headerH * 0.04);
  linhaDegradePdf(doc, T.corDourado, (cx - underlineW / 2) * K, underY * K, underlineW * K, 1.5 * K, 0.7);

  // ── Conteúdo ──
  if (singleCol) {
    const colX = SAFE_L + COL_PAD_H;
    const colW = SAFE_W - COL_PAD_H * 2;
    drawColumnPdf(doc, T, F, leftGrupos, colX, contentTop, colW, fs, true);
  } else {
    const midX = SAFE_L + SAFE_W / 2;
    const innerPad = Math.round(COL_PAD_H * 1.3);

    const leftColX  = SAFE_L + COL_PAD_H;
    const leftColW  = (midX - leftColX) - innerPad;
    const rightColX = midX + innerPad;
    const rightColW = (SAFE_L + SAFE_W - COL_PAD_H) - rightColX;

    drawColumnPdf(doc, T, F, leftGrupos,  leftColX,  contentTop, leftColW,  fs, false);
    drawColumnPdf(doc, T, F, rightGrupos, rightColX, contentTop, rightColW, fs, false);

    withOpacityPdf(doc, 0.9, () => {
      setFillColorPdf(doc, T.corDourado);
      doc.rect((midX - DIVIDER_W / 2) * K, (contentTop + 4) * K, DIVIDER_W * K, (footerTop - 8 - contentTop - 4) * K, 'F');
    });
  }

  // Rodapé: sem chancela — a faixa fica livre para a composição no Corel

  return doc.output('blob');
}

/** Exporta o menu A4 como PDF vetorial e dispara o download. */
export async function exportMenuA4PdfVetorial(
  titulo: string,
  empresa: string,
  grupos: CardapioGroup[],
  filename: string,
  onProgress?: (status: string) => void,
  opts: A4RenderOptions = {}
): Promise<void> {
  onProgress?.('Gerando PDF vetorial...');
  const blob = await gerarPdfMenuA4(titulo, empresa, grupos, opts);

  onProgress?.('Preparando download...');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${filename}.pdf`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  onProgress?.('Concluído!');
}
