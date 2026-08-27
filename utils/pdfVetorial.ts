/**
 * pdfVetorial.ts
 *
 * Helpers compartilhados dos exportadores de PDF VETORIAL (jsPDF):
 * fontes embutidas, cores, opacidade e carga de imagem como dataURL.
 * Usado pelo A3 Duplo (A3PdfExporter) e pelo menu A4 (A4PdfExporter).
 *
 * Fontes embutidas (públicas, licença OFL):
 *  - Liberation Sans (métricas idênticas à Arial) — regular / bold / italic
 *  - Archivo Black (substituta visual da Arial Black)
 */

import type { jsPDF } from 'jspdf';

export const PDF_FONT_FILES = [
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

export async function registrarFontesPdf(doc: jsPDF): Promise<void> {
  for (const f of PDF_FONT_FILES) {
    const b64 = await fetchFontBase64(f.file);
    doc.addFileToVFS(f.file, b64);
    doc.addFont(f.file, f.family, f.style);
  }
}

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function setTextColorPdf(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setTextColor(r, g, b);
}

export function setFillColorPdf(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setFillColor(r, g, b);
}

export function withOpacityPdf(doc: jsPDF, opacity: number, fn: () => void) {
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity, 'stroke-opacity': opacity }));
  fn();
  doc.restoreGraphicsState();
}

export interface ImagemPdf {
  data: string;
  w: number;
  h: number;
}

/** Carrega uma imagem como dataURL + dimensões (null em qualquer falha). */
export async function carregarImagemPdf(url: string): Promise<ImagemPdf | null> {
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
