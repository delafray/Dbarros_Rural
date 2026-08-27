/**
 * A4PdfExporter.ts
 *
 * PDF VETORIAL do menu A4 (jsPDF): texto selecionável e nítido em qualquer
 * zoom, com as mesmas fontes embutidas do A3 (Liberation Sans ≈ Arial;
 * Archivo Black ≈ Arial Black).
 *
 * O desenho espelha o CardapioA4Renderer (mesmas medidas em px @3px/mm,
 * convertidas para pt). Efeitos raster (vignette, glow dos textos e o
 * degradê das linhas) não existem em vetor — saem como cor sólida, mais
 * limpos na impressão. Fundo custom e chancela entram como imagem.
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
  CANVAS_W, CANVAS_H, BLEED_PX,
  SAFE_L, SAFE_T, SAFE_W, SAFE_H,
  COL_PAD_H, COL_PAD_V, FOOTER_H, DIVIDER_W, SCREW_SIZE, SCREW_INSET,
  calcSingleCol,
  calcHeaderH, calcEmpresaFs, quebrarNomeEmpresa,
  FontesA4, resolveFontesA4,
} from './cardapioA4Config';
import { CardapioTema, resolveTema, coverRect } from '../../utils/cardapioTema';
import {
  registrarFontesPdf,
  hexToRgb,
  setTextColorPdf,
  setFillColorPdf,
  withOpacityPdf,
  carregarImagemPdf,
} from '../../utils/pdfVetorial';
import type { A4RenderOptions } from './CardapioA4Renderer';

// px do renderer (3 px/mm) → pt do PDF (72 pt/in ÷ 25.4 mm/in ÷ 3)
const K = 72 / 25.4 / 3;

const FONTE_REGULAR = 'LiberationSans';
const FONTE_BLACK = 'ArchivoBlack';

/** Quebra texto na largura (px), com a fonte/tamanho já configurados no doc. */
function wrap(doc: jsPDF, text: string, maxWidthPx: number): string[] {
  const lines = doc.splitTextToSize(text, maxWidthPx * K) as string[];
  return lines.length ? lines : [''];
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

function drawParafuso(doc: jsPDF, T: CardapioTema, cx: number, cy: number) {
  setFillColorPdf(doc, T.corDourado);
  doc.circle(cx * K, cy * K, (SCREW_SIZE / 2) * K, 'F');
  withOpacityPdf(doc, 0.65, () => {
    doc.setFillColor(26, 14, 0);
    doc.circle(cx * K, cy * K, 2.5 * K, 'F');
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
      doc.setFont(FONTE_BLACK, 'normal');
      doc.setFontSize(catFs * K);
      setTextColorPdf(doc, T.corDouradoClaro);
      const catBaseline = y + catFs * 1.05;
      doc.text(group.categoria, colX * K, catBaseline * K);
      y = catBaseline + gCat(fs * 0.46);
    }

    for (const item of group.itens) {
      const variantes = parseValorComposto(item.valor);
      const empilhado = !!variantes && variantes.length >= VARIANTES_EMPILHA_MIN;
      const valorLinha = empilhado ? '' : item.valor;

      doc.setFont(FONTE_BLACK, 'normal');
      doc.setFontSize(priceFs * K);
      const priceW = valorLinha ? doc.getTextWidth(valorLinha) / K : 0;
      const nameMaxW = colW - (valorLinha ? priceW + 16 : 0);

      doc.setFont(FONTE_REGULAR, 'bold');
      doc.setFontSize(itemFs * K);
      setTextColorPdf(doc, T.corTexto);
      const nameBaseY = y + itemFs * 1.05;
      const nameLines = wrap(doc, item.item, nameMaxW);
      const nameLh = itemFs * 1.22;
      nameLines.forEach((line, i) => {
        doc.text(line, colX * K, (nameBaseY + i * nameLh) * K);
      });
      const nameBlockH = nameLines.length * nameLh;

      if (valorLinha) {
        const nameSpanW = nameLines.length > 1
          ? nameMaxW
          : doc.getTextWidth(nameLines[0]) / K;
        const linkY = nameBaseY + Math.max(1, Math.round(itemFs * 0.1));
        linhaPontilhada(doc, T, colX + nameSpanW + 8, colX + colW - priceW - 8, linkY);

        doc.setFont(FONTE_BLACK, 'normal');
        doc.setFontSize(priceFs * K);
        setTextColorPdf(doc, T.corDouradoClaro);
        doc.text(valorLinha, (colX + colW) * K, nameBaseY * K, { align: 'right' });
      }

      y += valorLinha ? Math.max(nameBlockH, priceFs * 1.22) : nameBlockH;

      if (empilhado) {
        const rotFs   = itemFs * 0.9;
        const varPrFs = priceFs * 0.92;
        const indent  = Math.round(fs * 1.1);
        const varLh   = Math.max(rotFs, varPrFs) * Math.max(1.05, gDesc(1.30));
        for (const v of variantes as PrecoVariante[]) {
          const varBaseY = y + Math.max(rotFs, varPrFs) * 1.02;

          doc.setFont(FONTE_BLACK, 'normal');
          doc.setFontSize(varPrFs * K);
          const varPriceW = doc.getTextWidth(v.preco) / K;

          doc.setFont(FONTE_REGULAR, 'bold');
          doc.setFontSize(rotFs * K);
          setTextColorPdf(doc, T.corTexto);
          const rotW = doc.getTextWidth(v.rotulo) / K;
          doc.text(v.rotulo, (colX + indent) * K, varBaseY * K);

          const linkY = varBaseY + Math.max(1, Math.round(rotFs * 0.1));
          linhaPontilhada(doc, T, colX + indent + rotW + 8, colX + colW - varPriceW - 8, linkY);

          doc.setFont(FONTE_BLACK, 'normal');
          doc.setFontSize(varPrFs * K);
          setTextColorPdf(doc, T.corDouradoClaro);
          doc.text(v.preco, (colX + colW) * K, varBaseY * K, { align: 'right' });

          y += varLh;
        }
      }

      if (item.descricao) {
        doc.setFont(FONTE_REGULAR, 'italic');
        doc.setFontSize(descFs * K);
        setTextColorPdf(doc, T.corTextoSuave);
        const descMaxW = colW * 0.85;
        const descLines = wrap(doc, item.descricao, descMaxW);
        const descLh = descFs * Math.max(1.05, gDesc(1.40));
        withOpacityPdf(doc, 0.88, () => {
          descLines.forEach((line, i) => {
            doc.text(line, colX * K, (y + gDesc(fs * 0.07) + descFs * 1.18 + i * descLh) * K);
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
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
  await registrarFontesPdf(doc);

  const T = resolveTema(opts.tema);
  const F = resolveFontesA4(opts.fontesA4);

  // ── Fundo: cor sólida + arte em cover (mesmo layering do renderer) ──
  setFillColorPdf(doc, T.corFundo);
  doc.rect(0, 0, CANVAS_W * K, CANVAS_H * K, 'F');
  if (opts.fundoUrl) {
    const fundo = await carregarImagemPdf(opts.fundoUrl);
    if (fundo && fundo.w > 0 && fundo.h > 0) {
      const { dx, dy, dw, dh } = coverRect(fundo.w, fundo.h, CANVAS_W, CANVAS_H);
      const fmt = fundo.data.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(fundo.data, fmt, dx * K, dy * K, dw * K, dh * K);
    }
  }

  // ── Linhas de destaque (degradê vira sólido com alpha) ──
  withOpacityPdf(doc, 0.8, () => {
    setFillColorPdf(doc, T.corDourado);
    doc.rect(SAFE_L * K, (SAFE_T + 8) * K, SAFE_W * K, 3 * K, 'F');
    doc.rect(SAFE_L * K, (CANVAS_H - BLEED_PX - 8 - 3) * K, SAFE_W * K, 3 * K, 'F');
  });

  // ── Parafusos decorativos ──
  const screwOff = BLEED_PX + SCREW_INSET + SCREW_SIZE / 2;
  drawParafuso(doc, T, screwOff, screwOff);
  drawParafuso(doc, T, CANVAS_W - screwOff, screwOff);
  drawParafuso(doc, T, screwOff, CANVAS_H - screwOff);
  drawParafuso(doc, T, CANVAS_W - screwOff, CANVAS_H - screwOff);

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

  doc.setFont(FONTE_BLACK, 'normal');
  doc.setFontSize(empresaFs * K);
  setTextColorPdf(doc, T.corDouradoClaro);
  linhasNome.forEach((l, i) => {
    doc.text(l, cx * K, posY[i] * K, { align: 'center', baseline: 'middle' });
  });

  if (titulo) {
    const titleY = posY[0] - empresaFs * 0.45 - 10 - tituloFs / 2;
    doc.setFont(FONTE_REGULAR, 'bold');
    doc.setFontSize(tituloFs * K);
    withOpacityPdf(doc, 0.88, () => {
      doc.text(titulo, cx * K, titleY * K, { align: 'center', baseline: 'middle' });
    });
  }

  const underY = posY[posY.length - 1] + empresaFs * 0.45 + Math.max(4, headerH * 0.04);
  withOpacityPdf(doc, 0.7, () => {
    setFillColorPdf(doc, T.corDourado);
    doc.rect((cx - underlineW / 2) * K, underY * K, underlineW * K, 1.5 * K, 'F');
  });

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

  // ── Rodapé: linha de separação + chancela (imagem contain) ──
  withOpacityPdf(doc, 0.094, () => {
    setFillColorPdf(doc, T.corDourado);
    doc.rect(SAFE_L * K, footerTop * K, SAFE_W * K, 1 * K, 'F');
  });
  const chancela = await carregarImagemPdf(opts.chancelaUrl || '/chancela.png');
  if (chancela && chancela.w > 0 && chancela.h > 0) {
    const s = Math.min(SAFE_W / chancela.w, FOOTER_H / chancela.h);
    const dw = chancela.w * s;
    const dh = chancela.h * s;
    const dx = SAFE_L + (SAFE_W - dw) / 2;
    const dy = footerTop + (FOOTER_H - dh) / 2;
    const fmt = chancela.data.startsWith('data:image/png') ? 'PNG' : 'JPEG';
    doc.addImage(chancela.data, fmt, dx * K, dy * K, dw * K, dh * K);
  }

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
