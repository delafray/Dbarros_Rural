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
  A3DuploMenuData,
  LayoutResult,
  FontesA3,
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

// ─── Fontes (cache do base64 por sessão) ─────────────────────────────────────
const FONT_FILES = [
  { file: 'LiberationSans-Regular.ttf', family: 'LiberationSans', style: 'normal' },
  { file: 'LiberationSans-Bold.ttf',    family: 'LiberationSans', style: 'bold' },
  { file: 'LiberationSans-Italic.ttf',  family: 'LiberationSans', style: 'italic' },
  { file: 'ArchivoBlack-Regular.ttf',   family: 'ArchivoBlack',   style: 'normal' },
] as const;

const fontCache = new Map<string, string>();

async function fetchFontBase64(file: string): Promise<string> {
  const cached = fontCache.get(file);
  if (cached) return cached;
  const res = await fetch(`/fonts/${file}`);
  if (!res.ok) throw new Error(`Fonte não encontrada: /fonts/${file}`);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  const b64 = btoa(bin);
  fontCache.set(file, b64);
  return b64;
}

async function registrarFontes(doc: jsPDF): Promise<void> {
  for (const f of FONT_FILES) {
    const b64 = await fetchFontBase64(f.file);
    doc.addFileToVFS(f.file, b64);
    doc.addFont(f.file, f.family, f.style);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function setTextColor(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setTextColor(r, g, b);
}

function withOpacity(doc: jsPDF, opacity: number, fn: () => void) {
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity, 'stroke-opacity': opacity }));
  fn();
  doc.restoreGraphicsState();
}

/** Quebra texto na largura (px), com a fonte/tamanho já configurados no doc. */
function wrap(doc: jsPDF, text: string, maxWidthPx: number): string[] {
  const lines = doc.splitTextToSize(text, maxWidthPx * K) as string[];
  return lines.length ? lines : [''];
}

async function carregarFundo(url: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const data = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = data;
    });
    return { data, w: img.naturalWidth, h: img.naturalHeight };
  } catch {
    return null;
  }
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

  // ── Cabeçalho (título + empresa + underline) ──────────────────────────
  if (menu.titulo && !isContinuacao) {
    const size = f.titulo * scale;
    doc.setFont('LiberationSans', 'bold');
    doc.setFontSize(size * K);
    setTextColor(doc, t.corDouradoClaro);
    doc.text((menu.titulo || '').toUpperCase(), cx * K, (y + size * 0.95) * K, { align: 'center' });
    y += size * 1.15 + 2;
  }

  {
    const size = f.empresa * scale;
    doc.setFont('ArchivoBlack', 'normal');
    doc.setFontSize(size * K);
    setTextColor(doc, t.corDouradoClaro);
    const nome = `${(menu.empresa || '').toUpperCase()}${isContinuacao ? ' ›' : ''}`;
    const linhas = wrap(doc, nome, colWPx);
    linhas.forEach((l, i) => {
      doc.text(l, cx * K, (y + size * 0.88 + i * size * 1.05) * K, { align: 'center' });
    });
    y += linhas.length * size * 1.05;
  }

  // Underline dourado (gradiente vira linha sólida com alpha)
  {
    const w = colWPx * 0.6;
    y += 6;
    withOpacity(doc, 0.8, () => {
      const [r, g, b] = hexToRgb(t.corDourado);
      doc.setFillColor(r, g, b);
      doc.rect((cx - w / 2) * K, y * K, w * K, 2 * K, 'F');
    });
    y += 2 + 6;
  }

  y += 10 * scale * spacing; // marginBottom do cabeçalho

  // ── Grupos ────────────────────────────────────────────────────────────
  grupos.forEach((grupo, gi) => {
    if (gi > 0) y += 12 * scale * spacing; // gap entre grupos

    // Categoria
    {
      const size = f.categoria * scale;
      doc.setFont('ArchivoBlack', 'normal');
      doc.setFontSize(size * K);
      setTextColor(doc, t.corDouradoClaro);
      doc.setCharSpace(0.4 * K);
      doc.text((grupo.categoria || '').toUpperCase(), xPx * K, (y + size * 0.88) * K);
      doc.setCharSpace(0);
      y += size * 1.15 + 6 * scale * spacing;
    }

    // Itens
    grupo.itens.forEach((item) => {
      const itemSize = f.item * scale;
      const precoSize = f.preco * scale;
      const descSize = f.descricao * scale;

      // mede o preço primeiro
      let precoW = 0;
      if (item.valor) {
        doc.setFont('ArchivoBlack', 'normal');
        doc.setFontSize(precoSize * K);
        precoW = doc.getTextWidth(item.valor) / K;
      }

      // nome (pode quebrar)
      doc.setFont('LiberationSans', 'bold');
      doc.setFontSize(itemSize * K);
      const nomeMaxW = item.valor ? colWPx - precoW - 16 : colWPx;
      const nomeLinhas = wrap(doc, item.item || '', nomeMaxW);
      const baseline1 = y + itemSize * 0.88;

      setTextColor(doc, t.corTexto);
      nomeLinhas.forEach((l, i) => {
        doc.text(l, xPx * K, (baseline1 + i * itemSize * 1.15) * K);
      });

      // pontilhado + preço (alinhados no baseline da 1ª linha)
      if (item.valor) {
        doc.setFont('LiberationSans', 'bold');
        doc.setFontSize(itemSize * K);
        const nomeW = doc.getTextWidth(nomeLinhas[0]) / K;
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

        doc.setFont('ArchivoBlack', 'normal');
        doc.setFontSize(precoSize * K);
        setTextColor(doc, t.corDouradoClaro);
        doc.text(item.valor, (xPx + colWPx) * K, baseline1 * K, { align: 'right' });
      }

      y += Math.max(nomeLinhas.length * itemSize * 1.15, precoSize * 1.15);

      // descrição (abaixo, largura total)
      if (item.descricao) {
        y += 2;
        doc.setFont('LiberationSans', 'italic');
        doc.setFontSize(descSize * K);
        setTextColor(doc, t.corTextoSuave);
        const descLinhas = wrap(doc, item.descricao, colWPx);
        descLinhas.forEach((l, i) => {
          doc.text(l, xPx * K, (y + descSize * 0.88 + i * descSize * 1.3) * K);
        });
        y += descLinhas.length * descSize * 1.3;
      }

      y += 5 * scale * spacing; // margem entre itens
    });
  });

  y += 15 * scale * spacing; // marginBottom do bloco
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
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a3', compress: true });
  await registrarFontes(doc);

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
