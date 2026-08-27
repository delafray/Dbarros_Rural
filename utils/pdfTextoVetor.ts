/**
 * pdfTextoVetor.ts
 *
 * Texto como CURVAS no PDF (via opentype.js): cada glifo vira um caminho
 * vetorial desenhado direto no stream da página — o arquivo final não
 * embute nem referencia NENHUMA fonte. É o formato que o CorelDRAW abre
 * sem diálogo de substituição e sem cortar pontas de letras na conversão.
 *
 * Trade-off: o texto deixa de ser selecionável/pesquisável no leitor —
 * exatamente o que se quer num arquivo de produção gráfica.
 */

import type { jsPDF } from 'jspdf';
import { hexToRgb } from './pdfVetorial';

export type FonteVetor = 'regular' | 'bold' | 'italic' | 'black';

const ARQUIVOS: Record<FonteVetor, string> = {
  regular: 'LiberationSans-Regular.ttf',
  bold: 'LiberationSans-Bold.ttf',
  italic: 'LiberationSans-Italic.ttf',
  black: 'ArchivoBlack-Regular.ttf',
};

// Font do opentype.js (tipado como any — lib sem tipos oficiais)
const cache = new Map<FonteVetor, any>();

/** Carrega e parseia as 4 fontes (uma vez por sessão). */
export async function carregarFontesVetor(): Promise<void> {
  const opentype: any = await import('opentype.js');
  const parse = opentype.parse ?? opentype.default?.parse;
  await Promise.all(
    (Object.keys(ARQUIVOS) as FonteVetor[]).map(async (k) => {
      if (cache.has(k)) return;
      const res = await fetch(`/fonts/${ARQUIVOS[k]}`);
      if (!res.ok) throw new Error(`Fonte não encontrada: /fonts/${ARQUIVOS[k]}`);
      cache.set(k, parse(await res.arrayBuffer()));
    })
  );
}

/** Largura do texto em pt (kerning incluso). */
export function medirTextoVetor(texto: string, fonte: FonteVetor, sizePt: number): number {
  const f = cache.get(fonte);
  if (!f || !texto) return 0;
  return f.getAdvanceWidth(texto, sizePt, { kerning: true });
}

/** Quebra por palavras respeitando a largura (equivale ao wrapText/splitTextToSize). */
export function quebrarTextoVetor(
  texto: string,
  fonte: FonteVetor,
  sizePt: number,
  maxWPt: number
): string[] {
  if (!texto) return [''];
  const palavras = texto.split(' ');
  const linhas: string[] = [];
  let atual = '';
  for (const p of palavras) {
    const teste = atual ? `${atual} ${p}` : p;
    if (medirTextoVetor(teste, fonte, sizePt) > maxWPt && atual) {
      linhas.push(atual);
      atual = p;
    } else {
      atual = teste;
    }
  }
  if (atual) linhas.push(atual);
  return linhas.length ? linhas : [''];
}

/**
 * Desenha o texto como caminho vetorial no stream da página atual.
 * `baselinePt` é a linha-base (mesma convenção do canvas 'alphabetic');
 * coordenadas em pt no sistema y-para-baixo (igual às APIs do jsPDF).
 */
export function textoVetorPdf(
  doc: jsPDF,
  texto: string,
  fonte: FonteVetor,
  sizePt: number,
  xPt: number,
  baselinePt: number,
  opts: { align?: 'left' | 'center' | 'right'; corHex?: string } = {}
): void {
  const f = cache.get(fonte);
  if (!f || !texto) return;

  let x = xPt;
  if (opts.align === 'center' || opts.align === 'right') {
    const w = medirTextoVetor(texto, fonte, sizePt);
    x -= opts.align === 'center' ? w / 2 : w;
  }

  const path = f.getPath(texto, x, baselinePt, sizePt, { kerning: true });
  const pageH = doc.internal.pageSize.getHeight();
  const [r, g, b] = hexToRgb(opts.corHex ?? '#000000');
  const n = (v: number) => v.toFixed(2);

  let out = `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} rg\n`;
  let cx = 0;
  let cy = 0;
  for (const c of path.commands) {
    if (c.type === 'M') {
      out += `${n(c.x)} ${n(pageH - c.y)} m\n`;
      cx = c.x; cy = c.y;
    } else if (c.type === 'L') {
      out += `${n(c.x)} ${n(pageH - c.y)} l\n`;
      cx = c.x; cy = c.y;
    } else if (c.type === 'C') {
      out += `${n(c.x1)} ${n(pageH - c.y1)} ${n(c.x2)} ${n(pageH - c.y2)} ${n(c.x)} ${n(pageH - c.y)} c\n`;
      cx = c.x; cy = c.y;
    } else if (c.type === 'Q') {
      // Quadrática (TrueType) → cúbica (PDF só tem 'c')
      const c1x = cx + (2 / 3) * (c.x1 - cx);
      const c1y = cy + (2 / 3) * (c.y1 - cy);
      const c2x = c.x + (2 / 3) * (c.x1 - c.x);
      const c2y = c.y + (2 / 3) * (c.y1 - c.y);
      out += `${n(c1x)} ${n(pageH - c1y)} ${n(c2x)} ${n(pageH - c2y)} ${n(c.x)} ${n(pageH - c.y)} c\n`;
      cx = c.x; cy = c.y;
    } else if (c.type === 'Z') {
      out += 'h\n';
    }
  }
  out += 'f\n'; // preenchimento nonzero — furos dos glifos via direção do contorno
  (doc as any).internal.out(out);
}
