/**
 * PainelDuploRenderer.ts
 *
 * Arquivo final:   990 mm × 2 120 mm  (sangria 10 mm em todos os lados)
 * Área útil:       970 mm × 2 100 mm  (após corte)
 *
 * Pixels a 0.8 px/mm (scale=1):
 *   PANEL_W  = 792 px  =   990 mm
 *   PANEL_H  = 1696 px = 2 120 mm
 *   BLEED    =   8 px  =    10 mm
 *   USEFUL_W = 776 px  =   970 mm
 */

import { CANVAS_W, CANVAS_H } from '../cardapio/CardapioCanvas';
import { renderCardapioToDataURL } from '../cardapio/CardapioRenderer';
import { CardapioGroup } from '../../utils/cardapioParser';

// ── Constantes ────────────────────────────────────────────────────────────────
const BLEED    = 8;                     // 10 mm * 0.8 px/mm
const USEFUL_W = 776;                   // 970 mm * 0.8 px/mm
const MENU_H   = 880;                   // 1100 mm * 0.8 px/mm (top half)
const LOGO_H   = 800;                   // 1000 mm * 0.8 px/mm (bottom half)
const BG       = '#011464';             // mesmo fundo do banner

// Canvas completo de cada painel (scale=1)
const PANEL_W = USEFUL_W + (BLEED * 2); // 792 px => 990 mm
const PANEL_H = MENU_H + LOGO_H + (BLEED * 2); // 1696 px => 2120 mm

// Linhas de corte (onde as marcas de corte são desenhadas)
const CX1 = BLEED;
const CX2 = PANEL_W - BLEED;
const CY1 = BLEED;
const CY2 = PANEL_H - BLEED;

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target!.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Marca de corte em L num canto do conteúdo. */
function drawCropMark(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  dx: -1 | 1, dy: -1 | 1,
  armLen = 14, gap = 3,
) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.80)';
  ctx.lineWidth   = 0.7;
  ctx.beginPath();
  ctx.moveTo(x + dx * gap, y);
  ctx.lineTo(x + dx * (gap + armLen), y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y + dy * gap);
  ctx.lineTo(x, y + dy * (gap + armLen));
  ctx.stroke();
  ctx.restore();
}

// ── Renderizador principal ────────────────────────────────────────────────────
async function renderPanel(
  bannerImg: HTMLImageElement,
  logoFile: File | null,
  side: 'esquerda' | 'direita',
  scale: number,
): Promise<HTMLCanvasElement> {
  const canvas  = document.createElement('canvas');
  canvas.width  = PANEL_W * scale;
  canvas.height = PANEL_H * scale;
  const ctx     = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  // 1. Preenche tudo com BG — sangria de 1cm fica com a cor do banner
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, PANEL_W, PANEL_H);

  // 2. Corta o banner ao meio e cola na área útil EXATA limitando pelass sangrias
  const SRC_HALF_W = CANVAS_W / 2;
  const srcX = side === 'esquerda' ? 0 : SRC_HALF_W * scale;

  ctx.drawImage(
    bannerImg,
    srcX, 0, SRC_HALF_W * scale, CANVAS_H * scale, // Pega a metade do Canvas fonte
    BLEED, BLEED, USEFUL_W, MENU_H,                // Estampa exato na área útil: 970mm x 1100mm
  );

  // 3. Imagem de logos (metade inferior)
  const logoY = BLEED + MENU_H;
  if (logoFile) {
    const url     = await fileToDataUrl(logoFile);
    const logoImg = await loadImage(url);
    ctx.drawImage(logoImg, BLEED, logoY, USEFUL_W, LOGO_H); // Exato na área útil inferior
  } else {
    ctx.fillStyle    = 'rgba(255,255,255,0.06)';
    ctx.fillRect(BLEED, logoY, USEFUL_W, LOGO_H);
    ctx.fillStyle    = 'rgba(255,255,255,0.22)';
    ctx.font         = 'bold 18px Arial';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`📷  ${side}.png`, PANEL_W / 2, logoY + LOGO_H / 2);
  }

  // 4. Costura dourada discreta na junção menu → logos
  const seamH  = 4;
  const seamY  = logoY - Math.floor(seamH / 2);
  const seamG  = ctx.createLinearGradient(CX1, 0, CX2, 0);
  seamG.addColorStop(0,   'rgba(212,175,55,0)');
  seamG.addColorStop(0.08, 'rgba(212,175,55,0.40)');
  seamG.addColorStop(0.5,  'rgba(212,175,55,0.48)');
  seamG.addColorStop(0.92, 'rgba(212,175,55,0.40)');
  seamG.addColorStop(1,   'rgba(212,175,55,0)');
  ctx.fillStyle = seamG;
  ctx.fillRect(BLEED, seamY, USEFUL_W, seamH); // Aplica apenas dentro da linha de corte lateral

  // 5. Marcas de corte nos 4 cantos do conteúdo útil
  drawCropMark(ctx, CX1, CY1, -1, -1); // superior-esquerdo
  drawCropMark(ctx, CX2, CY1,  1, -1); // superior-direito
  drawCropMark(ctx, CX1, CY2, -1,  1); // inferior-esquerdo
  drawCropMark(ctx, CX2, CY2,  1,  1); // inferior-direito

  return canvas;
}

// ── API pública ───────────────────────────────────────────────────────────────

export async function renderPainelPreview(
  titulo: string,
  empresa: string,
  grupos: CardapioGroup[],
  logoEsq: File | null,
  logoDir: File | null,
): Promise<[string, string]> {
  const bannerUrl = await renderCardapioToDataURL(titulo, empresa, grupos, 1);
  const bannerImg = await loadImage(bannerUrl);

  const [leftCanvas, rightCanvas] = await Promise.all([
    renderPanel(bannerImg, logoEsq, 'esquerda', 1),
    renderPanel(bannerImg, logoDir, 'direita',  1),
  ]);

  return [
    leftCanvas.toDataURL('image/png'),
    rightCanvas.toDataURL('image/png'),
  ];
}

export async function exportPainelDuplo(
  titulo: string,
  empresa: string,
  grupos: CardapioGroup[],
  logoEsq: File | null,
  logoDir: File | null,
  scale: number,
  onProgress?: (msg: string) => void,
): Promise<void> {
  const slug = empresa.toLowerCase().replace(/\s+/g, '-') || 'painel';

  onProgress?.('Renderizando banner...');
  const bannerUrl = await renderCardapioToDataURL(titulo, empresa, grupos, scale);
  const bannerImg = await loadImage(bannerUrl);

  onProgress?.('Montando painel esquerdo...');
  const leftCanvas = await renderPanel(bannerImg, logoEsq, 'esquerda', scale);
  triggerDownload(leftCanvas.toDataURL('image/png'), `painel-esquerdo-${slug}.png`);

  await new Promise((r) => setTimeout(r, 600));

  onProgress?.('Montando painel direito...');
  const rightCanvas = await renderPanel(bannerImg, logoDir, 'direita', scale);
  triggerDownload(rightCanvas.toDataURL('image/png'), `painel-direito-${slug}.png`);

  onProgress?.('Concluído!');
}

function triggerDownload(dataUrl: string, filename: string) {
  const a      = document.createElement('a');
  a.href       = dataUrl;
  a.download   = filename;
  a.click();
}

export { PANEL_W, PANEL_H };
