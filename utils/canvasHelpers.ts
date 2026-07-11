/**
 * canvasHelpers.ts
 *
 * Primitivas Canvas2D compartilhadas pelos renderers de cardápio
 * (banner, A4 e painel duplo). Antes cada renderer tinha a própria cópia.
 */

import { CardapioTema, screwColors } from './cardapioTema';

/** Quebra texto para caber em maxWidth, medindo com a fonte atual do ctx. */
export function wrapText(
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

/** Carrega imagem com CORS anônimo (necessário p/ drawImage + toDataURL). */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export interface ScrewStyle {
  /** Diâmetro do parafuso em px */
  size: number;
  /** Deslocamento do brilho (fração do raio): banner 0.3, A4 0.28 */
  highlightOffset: number;
  /** Alpha do anel de sombra: banner 0.45, A4 0.5 */
  ringAlpha: number;
  /** Raio do ponto central: banner 3.5, A4 2.5 */
  dotRadius: number;
}

/**
 * Parafuso decorativo dourado (gradiente radial + anel + ponto central).
 * Os presets de estilo preservam byte a byte o visual original de cada formato.
 */
export function drawScrew(
  ctx: CanvasRenderingContext2D,
  t: CardapioTema,
  cx: number,
  cy: number,
  style: ScrewStyle
) {
  const r = style.size / 2;
  const { hi, lo } = screwColors(t);
  const rg = ctx.createRadialGradient(
    cx - r * style.highlightOffset,
    cy - r * style.highlightOffset,
    0,
    cx,
    cy,
    r
  );
  rg.addColorStop(0, hi);
  rg.addColorStop(0.55, t.corDourado);
  rg.addColorStop(1, lo);

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = rg;
  ctx.fill();

  // Anel de sombra
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(0,0,0,${style.ringAlpha})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Ponto central (#1a0e00 a 65% — mesmo resultado das duas versões antigas)
  ctx.beginPath();
  ctx.arc(cx, cy, style.dotRadius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(26,14,0,0.65)';
  ctx.fill();
}
