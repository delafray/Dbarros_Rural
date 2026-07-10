/**
 * cardapioTema.ts
 *
 * Tema visual dos cardápios (banner, A4, painel duplo e A3), configurável
 * por projeto de evento. `TEMA_PADRAO` reproduz exatamente o visual
 * hardcoded original — projetos sem tema continuam idênticos.
 */

export interface CardapioTema {
  /** Cor de fundo dos painéis (era '#011464') */
  corFundo: string;
  /** Cor de destaque — linhas, underlines, parafusos (era GOLD '#D4AF37') */
  corDourado: string;
  /** Destaque claro — empresa, categorias, preços (era GOLD_BRIGHT '#FFE066') */
  corDouradoClaro: string;
  /** Texto principal — nomes de itens (era '#FFFFFF') */
  corTexto: string;
  /** Texto suave — descrições e pontilhados (era '#b8cce0') */
  corTextoSuave: string;
}

export const TEMA_PADRAO: CardapioTema = {
  corFundo: '#011464',
  corDourado: '#D4AF37',
  corDouradoClaro: '#FFE066',
  corTexto: '#FFFFFF',
  corTextoSuave: '#b8cce0',
};

/** Opções de renderização por projeto, repassadas aos renderers/previews. */
export interface CardapioRenderOptions {
  tema?: Partial<CardapioTema> | null;
  /** Imagem de fundo (bucket público cardapio-assets); null = cor sólida */
  fundoUrl?: string | null;
  /** Chancela/rodapé do A4; null = /chancela.png padrão */
  chancelaUrl?: string | null;
}

/** Merge do tema parcial salvo no projeto com os defaults. */
export function resolveTema(tema?: Partial<CardapioTema> | null): CardapioTema {
  if (!tema) return TEMA_PADRAO;
  const out = { ...TEMA_PADRAO };
  (Object.keys(TEMA_PADRAO) as (keyof CardapioTema)[]).forEach((k) => {
    const v = tema[k];
    if (typeof v === 'string' && v.trim()) out[k] = v.trim();
  });
  return out;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return { r: 0, g: 0, b: 0 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** '#RRGGBB' + alpha 0..1 → 'rgba(r,g,b,a)' (p/ gradientes com transparência). */
export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Clareia (t > 0, em direção ao branco) ou escurece (t < 0) uma cor hex. */
export function shade(hex: string, t: number): string {
  const { r, g, b } = parseHex(hex);
  const mix = (c: number) =>
    Math.round(t >= 0 ? c + (255 - c) * t : c * (1 + t));
  return `#${[mix(r), mix(g), mix(b)]
    .map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0'))
    .join('')}`;
}

/**
 * Tons do parafuso decorativo (brilho/sombra do gradiente radial).
 * Com o dourado padrão devolve as constantes originais (visual idêntico);
 * com dourado custom deriva tons coerentes.
 */
export function screwColors(t: CardapioTema): { hi: string; lo: string } {
  if (t.corDourado.toLowerCase() === TEMA_PADRAO.corDourado.toLowerCase()) {
    return { hi: '#f8e878', lo: '#7a5f00' };
  }
  return { hi: shade(t.corDourado, 0.5), lo: shade(t.corDourado, -0.55) };
}

/**
 * Retângulo destino de uma imagem em modo "cover" (mesma math do CSS
 * background-size: cover + center) — usado igual no canvas e no preview DOM
 * para que export e preview não divirjam.
 */
export function coverRect(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number
): { dx: number; dy: number; dw: number; dh: number } {
  const s = Math.max(boxW / imgW, boxH / imgH);
  const dw = imgW * s;
  const dh = imgH * s;
  return { dx: (boxW - dw) / 2, dy: (boxH - dh) / 2, dw, dh };
}
