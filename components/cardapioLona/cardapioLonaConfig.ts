/**
 * cardapioLonaConfig.ts
 *
 * SOURCE OF TRUTH da geometria e do layout da Lona de cardápio.
 * A unidade-fonte é o CENTÍMETRO (dimensões físicas da lona impressa);
 * a conversão para pixels acontece só na borda (preview/export).
 *
 * Diferente do A4, a lona não tem preview DOM: o preview É o renderer
 * (canvas → dataURL), então não existe risco de divergência preview/export.
 */

import { CardapioGroup, getGroupWeight, PesoFontes } from '../../utils/cardapioParser';
import { CardapioTema, shade } from '../../utils/cardapioTema';

// ─── Escalas ──────────────────────────────────────────────────────────────────
/** Escala base do preview: 4 px/cm (lona 100×300cm → 400×1200px) */
export const PX_PER_CM = 4;
/** Alvo do export: 40 px/cm ≈ 101,6 dpi — resolução típica de lona */
export const EXPORT_PX_PER_CM = 40;
/** Limites de canvas dos navegadores (lado e área) com folga de segurança */
export const MAX_CANVAS_SIDE = 16000;
export const MAX_CANVAS_AREA = 200_000_000; // 200MP

/**
 * px/cm efetivo do export para uma lona LxA: usa o alvo de 40 px/cm,
 * reduzindo apenas se estourar os limites de canvas do navegador.
 */
export function calcExportPxPerCm(larguraCm: number, alturaCm: number): number {
  const bySide = MAX_CANVAS_SIDE / Math.max(larguraCm, alturaCm);
  const byArea = Math.sqrt(MAX_CANVAS_AREA / (larguraCm * alturaCm));
  return Math.min(EXPORT_PX_PER_CM, Math.floor(Math.min(bySide, byArea)));
}

// ─── Dimensões e área útil ────────────────────────────────────────────────────
export interface LonaDimensoes {
  larguraCm: number;
  alturaCm: number;
  utilLarguraCm: number;
  utilAlturaCm: number;
  /** null/undefined = área útil centrada na horizontal */
  utilOffsetXCm?: number | null;
  /** null/undefined = área útil centrada na vertical */
  utilOffsetYCm?: number | null;
}

export const LONA_PADRAO: LonaDimensoes = {
  larguraCm: 100,
  alturaCm: 300,
  utilLarguraCm: 80,
  utilAlturaCm: 210,
  utilOffsetXCm: null,
  utilOffsetYCm: null,
};

export interface RetanguloCm {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Resolve a área útil em cm a partir do canto superior esquerdo da lona.
 * Offsets nulos centralizam; a área nunca extrapola os limites da lona
 * (dimensões maiores que a lona são reduzidas, offsets são "clampados").
 */
export function resolveAreaUtil(d: LonaDimensoes): RetanguloCm {
  const w = Math.min(d.utilLarguraCm, d.larguraCm);
  const h = Math.min(d.utilAlturaCm, d.alturaCm);
  const cx = (d.larguraCm - w) / 2;
  const cy = (d.alturaCm - h) / 2;
  const x = d.utilOffsetXCm == null ? cx : Math.min(Math.max(0, d.utilOffsetXCm), d.larguraCm - w);
  const y = d.utilOffsetYCm == null ? cy : Math.min(Math.max(0, d.utilOffsetYCm), d.alturaCm - h);
  return { x, y, w, h };
}

// ─── Logo proporcional ────────────────────────────────────────────────────────
/** Limites globais padrão da caixa de logo (cm) */
export const LOGO_MAX_LARGURA_CM_PADRAO = 14;
export const LOGO_MAX_ALTURA_CM_PADRAO = 7;

/**
 * Encaixa a logo na caixa de limites máximos preservando a proporção
 * (modo "contain": o limite mais restritivo manda). Escala para cima ou
 * para baixo — a caixa em cm expressa o tamanho físico desejado na lona.
 */
export function fitLogoCm(
  imgW: number,
  imgH: number,
  maxLarguraCm: number,
  maxAlturaCm: number
): { wCm: number; hCm: number } {
  if (imgW <= 0 || imgH <= 0 || maxLarguraCm <= 0 || maxAlturaCm <= 0) {
    return { wCm: 0, hCm: 0 };
  }
  const s = Math.min(maxLarguraCm / imgW, maxAlturaCm / imgH);
  return { wCm: imgW * s, hCm: imgH * s };
}

// ─── Fontes ajustáveis por lona (multiplicadores; 1 = padrão) ────────────────
export interface FontesLona {
  titulo: number;
  categoria: number;
  item: number;
  descricao: number;
  preco: number;
}

export const FONTES_LONA_PADRAO: FontesLona = {
  titulo: 1,
  categoria: 1,
  item: 1,
  descricao: 1,
  preco: 1,
};

export function resolveFontesLona(f?: Partial<FontesLona> | null): FontesLona {
  if (!f) return { ...FONTES_LONA_PADRAO };
  const out = { ...FONTES_LONA_PADRAO };
  (Object.keys(FONTES_LONA_PADRAO) as (keyof FontesLona)[]).forEach((k) => {
    const v = f[k];
    if (typeof v === 'number' && v > 0) out[k] = v;
  });
  return out;
}

export function fontesLonaSaoPadrao(f: FontesLona): boolean {
  return (Object.keys(FONTES_LONA_PADRAO) as (keyof FontesLona)[]).every(
    (k) => f[k] === FONTES_LONA_PADRAO[k]
  );
}

// ─── Blocos ───────────────────────────────────────────────────────────────────
/** Configuração de um bloco salva na lona (referencia um menu A4 do projeto) */
export interface LonaBlocoConfig {
  menu_id: string;
  /** Bloco especial (ex.: BAR, vinhos): largura total, categorias em colunas */
  destaque?: boolean;
  /** Overrides dos limites globais de logo da lona (cm) */
  logo_max_largura_cm?: number | null;
  logo_max_altura_cm?: number | null;
}

/** Bloco resolvido para layout (conteúdo do menu + config da lona) */
export interface LonaBloco {
  menuId: string;
  titulo: string;
  grupos: CardapioGroup[];
  logoUrl: string | null;
  destaque: boolean;
  logoMaxLarguraCm: number;
  logoMaxAlturaCm: number;
}

// ─── Layout ───────────────────────────────────────────────────────────────────
/** Espaçamentos em cm (fixos, independem da fonte) */
export const BLOCO_GAP_CM = 2.5;   // respiro vertical entre blocos
export const COL_GAP_CM = 3;       // respiro horizontal entre colunas
export const UTIL_PAD_CM = 1;      // respiro interno da área útil
export const LOGO_GAP_CM = 0.8;    // respiro entre logo e itens do bloco

/** Peso em "em" do cabeçalho do bloco quando não há logo (título em texto) */
export const TITULO_WEIGHT_EM = 2.6;

/** Colunas internas do bloco destaque (estilo BAR da referência) */
export function calcColunasDestaque(grupos: CardapioGroup[]): number {
  return Math.max(1, Math.min(3, grupos.length));
}

/** Mínimo legível: itens com menos de 0,7cm de letra disparam aviso no editor */
export const MIN_ITEM_FONT_CM = 0.7;

// ─── Contraste automático ─────────────────────────────────────────────────────
/** Modo salvo por lona: auto detecta pela arte; claro/escuro forçam a paleta */
export type ContrasteModo = 'auto' | 'claro' | 'escuro';

/** Paleta de texto: 'claro' = texto claro (fundo escuro), 'escuro' = o oposto */
export type PaletaTexto = 'claro' | 'escuro';

/** Razão de contraste mínima para leitura confortável (WCAG AA, texto normal) */
export const CONTRASTE_MINIMO = 4.5;

/** Acima desta luminância média o fundo é considerado claro → texto escuro */
export const LIMIAR_FUNDO_CLARO = 0.4;

/** Opacidade máxima do véu de contraste (scrim) atrás da área útil */
export const SCRIM_OPACIDADE_MAX = 0.8;

/** Luminância relativa WCAG (sRGB linearizado); r/g/b em 0–255 → 0..1 */
export function luminanciaRelativa(r: number, g: number, b: number): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Luminância relativa de uma cor '#RRGGBB' (ou '#RGB') */
export function luminanciaHex(hex: string): number {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return 0;
  return luminanciaRelativa((n >> 16) & 255, (n >> 8) & 255, n & 255);
}

/** Razão de contraste WCAG entre duas luminâncias (1..21) */
export function razaoContraste(l1: number, l2: number): number {
  const [claro, escuro] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (claro + 0.05) / (escuro + 0.05);
}

/**
 * Luminância do fundo depois do véu de contraste (mistura linear —
 * aproximação suficiente para decidir aviso, não para render).
 */
export function luminanciaComScrim(
  lumFundo: number,
  paleta: PaletaTexto,
  opacidade: number
): number {
  if (opacidade <= 0) return lumFundo;
  const lumScrim = paleta === 'claro' ? 0 : 1; // scrim escuro sob texto claro
  return lumFundo * (1 - opacidade) + lumScrim * opacidade;
}

/** Decide a paleta pela luminância média da arte na área útil */
export function escolherPaleta(lumMediaFundo: number): PaletaTexto {
  return lumMediaFundo > LIMIAR_FUNDO_CLARO ? 'escuro' : 'claro';
}

/**
 * Variante do tema para texto ESCURO (fundo claro): itens quase-pretos,
 * descrições em cinza e destaque num dourado escurecido legível sobre claro.
 * A paleta 'claro' é o próprio tema resolvido (visual atual).
 */
export function paletaTextoEscuro(T: CardapioTema): CardapioTema {
  return {
    ...T,
    corTexto: '#1c1c1c',
    corTextoSuave: '#454545',
    corDouradoClaro: shade(T.corDourado, -0.3),
  };
}

export interface BlocoMedido {
  bloco: LonaBloco;
  /** Altura fixa (cm) que não escala com a fonte: logo + respiro */
  fixoCm: number;
  /** Peso do conteúdo em "em" (multiplicado pela fonte para virar altura) */
  pesoEm: number;
}

/**
 * Mede um bloco: parte fixa (logo em cm) + peso do conteúdo em "em".
 * `logoRatio` = altura/largura natural da imagem (null = sem logo carregada).
 */
export function medirBloco(
  bloco: LonaBloco,
  logoRatio: number | null,
  fontes: FontesLona
): BlocoMedido {
  const m: PesoFontes = {
    categoria: fontes.categoria,
    item: fontes.item,
    descricao: fontes.descricao,
    preco: fontes.preco,
  };
  let fixoCm = 0;
  let pesoEm = 0;

  if (bloco.logoUrl && logoRatio && logoRatio > 0) {
    const { hCm } = fitLogoCm(1, logoRatio, bloco.logoMaxLarguraCm, bloco.logoMaxAlturaCm);
    fixoCm += hCm + LOGO_GAP_CM;
  } else {
    pesoEm += TITULO_WEIGHT_EM * fontes.titulo;
  }

  if (bloco.destaque) {
    // Categorias lado a lado: conta a coluna interna mais pesada
    const nCols = calcColunasDestaque(bloco.grupos);
    const porColuna: number[] = new Array(nCols).fill(0);
    bloco.grupos.forEach((g, i) => {
      porColuna[i % nCols] += getGroupWeight(g, undefined, m);
    });
    pesoEm += Math.max(...porColuna, 0);
  } else {
    pesoEm += bloco.grupos.reduce((s, g) => s + getGroupWeight(g, undefined, m), 0);
  }

  return { bloco, fixoCm, pesoEm };
}

export interface LonaLayout {
  /** Blocos destaque no topo, largura total, na ordem dada */
  destaques: BlocoMedido[];
  /** Colunas de blocos normais (ordem preservada dentro de cada coluna) */
  colunas: BlocoMedido[][];
  /** Tamanho de fonte base em cm (1 "em" do conteúdo) */
  fonteCm: number;
  /** true quando a fonte ficou abaixo do mínimo legível */
  abaixoDoMinimo: boolean;
}

/**
 * Distribui blocos normais nas colunas (greedy: próxima coluna mais vazia,
 * preservando a ordem de leitura dentro de cada coluna) e calcula por
 * ponto-fixo a fonte base que preenche a altura útil disponível.
 */
export function calcLonaLayout(
  medidos: BlocoMedido[],
  nColunas: number,
  utilAlturaCm: number
): LonaLayout {
  const destaques = medidos.filter((b) => b.bloco.destaque);
  const normais = medidos.filter((b) => !b.bloco.destaque);

  const availCm = utilAlturaCm - UTIL_PAD_CM * 2;

  // Ponto de partida generoso; 4 iterações bastam para convergir
  let fonteCm = 2;
  let colunas: BlocoMedido[][] = [];

  for (let iter = 0; iter < 4; iter++) {
    // Altura consumida pelos destaques (largura total, empilhados no topo)
    const destaquesCm = destaques.reduce(
      (s, b) => s + b.fixoCm + b.pesoEm * fonteCm + BLOCO_GAP_CM,
      0
    );
    const availColCm = Math.max(0, availCm - destaquesCm);

    // Distribuição greedy pela coluna mais vazia (na fonte atual)
    colunas = Array.from({ length: Math.max(1, nColunas) }, () => []);
    const alturas = new Array(colunas.length).fill(0);
    for (const b of normais) {
      let melhor = 0;
      for (let c = 1; c < colunas.length; c++) {
        if (alturas[c] < alturas[melhor]) melhor = c;
      }
      colunas[melhor].push(b);
      alturas[melhor] += b.fixoCm + b.pesoEm * fonteCm + BLOCO_GAP_CM;
    }

    // Fonte que faz a coluna mais cheia caber exatamente na altura útil
    let pior = Infinity;
    for (const col of colunas) {
      const fixo = col.reduce((s, b) => s + b.fixoCm + BLOCO_GAP_CM, 0);
      const peso = col.reduce((s, b) => s + b.pesoEm, 0);
      if (peso > 0) pior = Math.min(pior, (availColCm - fixo) / peso);
    }
    // Caso "só destaques": eles são o único consumidor da altura útil
    const pesoDestaques = destaques.reduce((s, b) => s + b.pesoEm, 0);
    if (normais.length === 0 && pesoDestaques > 0) {
      const fixoDestaques = destaques.reduce((s, b) => s + b.fixoCm + BLOCO_GAP_CM, 0);
      pior = Math.min(pior, (availCm - fixoDestaques) / pesoDestaques);
    }
    if (!Number.isFinite(pior)) pior = fonteCm; // sem conteúdo escalável

    fonteCm = Math.max(0.1, Math.min(3, pior));
  }

  return {
    destaques,
    colunas,
    fonteCm,
    abaixoDoMinimo: fonteCm < MIN_ITEM_FONT_CM,
  };
}
