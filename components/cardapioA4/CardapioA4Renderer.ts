/**
 * CardapioA4Renderer.ts
 * PNG export using modern-screenshot — rasterizes the actual preview DOM
 * via <foreignObject> SVG → guaranteed 1:1 visual match with preview.
 *
 * Scale 1 → 810×1071 px  (preview quality)
 * Scale 2 → 1620×2142 px (~150 DPI)
 * Scale 4 → 3240×4284 px (~300 DPI, print ready)
 */

import { domToPng } from 'modern-screenshot';
import { CANVAS_W, CANVAS_H } from './cardapioA4Config';

export async function exportMenuA4(
  element: HTMLElement,
  filename: string,
  scale = 1,
  onProgress?: (status: string) => void
): Promise<void> {
  onProgress?.('Preparando fontes...');
  // Ensure all web fonts are loaded before rasterizing
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  onProgress?.('Renderizando A4...');
  // Force natural canvas dimensions — ignores any `transform: scale()` on ancestors.
  const dataUrl = await domToPng(element, {
    width: CANVAS_W,
    height: CANVAS_H,
    scale,
    backgroundColor: '#011464',
    style: {
      transform: 'none',
      transformOrigin: '0 0',
    },
  });

  onProgress?.('Preparando download...');
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  onProgress?.('Concluído!');
}

export const A4_RENDER_SCALES = {
  PREVIEW: 1,   // 810×1071
  MEDIUM:  2,   // 1620×2142  (~150dpi)
  HIGH:    4,   // 3240×4284  (~300dpi)
} as const;
