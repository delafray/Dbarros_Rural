/**
 * a3DuploLayout.ts
 *
 * Lógica PURA de distribuição do A3 Duplo (sem React/DOM), extraída do
 * A3DuploCanvas para permitir testes unitários. O componente mede as alturas
 * reais no DOM e delega a distribuição para cá.
 *
 * Estratégia: testa combinações em ordem de preferência (fonte máxima primeiro)
 * e retorna a primeira em que tudo cabe nas 2 páginas A3.
 */

import { CardapioGroup, LINHAS_MIN, LINHAS_MAX } from '../../utils/cardapioParser';

// Helpers do "juntar linhas" moraram aqui; foram compartilhados com a Lona
// e agora vivem no cardapioParser — re-export mantém os imports existentes.
export { LINHAS_MIN, LINHAS_MAX, LINHAS_SENS, aplicarLinhas } from '../../utils/cardapioParser';

export interface A3DuploMenuData {
  id?: string;
  titulo?: string;
  empresa: string;
  itens: CardapioGroup[];
  /** Marcado na listagem: vai fixo no início da primeira página */
  destaque?: boolean;
}

// ─── Fontes ajustáveis do A3 (px na escala 100%) ────────────────────────────
// O usuário ajusta no preview; a distribuição re-mede e re-calcula, reduzindo
// a escala global se necessário para respeitar as novas proporções.
export interface FontesA3 {
  empresa: number;
  titulo: number;
  categoria: number;
  item: number;
  descricao: number;
  preco: number;
  /** Afastamento extra do topo das páginas, em mm (0 = padrão) */
  topoMm: number;
  /** Compressão vertical entre linhas/itens (1 = padrão; ver LINHAS_MIN/MAX) */
  linhas: number;
  /** Exibe os títulos de categoria (DOCES, LANCHES...) em todos os cardápios */
  mostrarCategorias: boolean;
}

/** Chaves numéricas de tamanho de fonte (px) — usadas nos botões ± do painel */
export type FonteNumKey = 'empresa' | 'titulo' | 'categoria' | 'item' | 'descricao' | 'preco';

export const FONTES_A3_PADRAO: FontesA3 = {
  empresa: 26,
  titulo: 15,
  categoria: 15,
  item: 12.5,
  descricao: 9.5,
  preco: 13,
  topoMm: 0,
  linhas: 1,
  mostrarCategorias: true,
};

export function resolveFontes(f?: Partial<FontesA3> | null): FontesA3 {
  if (!f) return { ...FONTES_A3_PADRAO };
  const out = { ...FONTES_A3_PADRAO };
  (['empresa', 'titulo', 'categoria', 'item', 'descricao', 'preco', 'topoMm', 'linhas'] as const)
    .forEach((k) => {
      const v = f[k];
      if (typeof v === 'number' && v >= 0) out[k] = v;
    });
  if (typeof f.mostrarCategorias === 'boolean') out.mostrarCategorias = f.mostrarCategorias;
  // Fontes precisam ser positivas (topoMm pode ser 0)
  (['empresa', 'titulo', 'categoria', 'item', 'descricao', 'preco'] as const).forEach((k) => {
    if (out[k] <= 0) out[k] = FONTES_A3_PADRAO[k];
  });
  out.linhas = Math.min(LINHAS_MAX, Math.max(LINHAS_MIN, out.linhas));
  return out;
}

export function fontesSaoPadrao(f: FontesA3): boolean {
  return (Object.keys(FONTES_A3_PADRAO) as (keyof FontesA3)[]).every(
    (k) => f[k] === FONTES_A3_PADRAO[k]
  );
}

// ─── Passos de busca ────────────────────────────────────────────────────────
export const COL_CHOICES = [2, 3, 4];
export const SCALE_STEPS: number[] = (() => {
  const arr: number[] = [];
  for (let s = 1.0; s >= 0.5 - 1e-9; s -= 0.05) arr.push(Math.round(s * 100) / 100);
  return arr;
})();
export const SPACING_STEPS = [1.0, 0.85, 0.7, 0.55];
export const SPACING_COMPACT = 0.5; // usado na medição auxiliar

// Empresa fixada no início da primeira página (ignora ordem/balanceamento).
// Vem do flag "destaque" marcado na listagem (antes era hardcoded 'BAR').
export function isPinned(menu: A3DuploMenuData): boolean {
  return !!menu.destaque;
}

export function resolveH(full: number, compact: number, spacing: number): number {
  // Interpolação linear entre spacing=1.0 (full) e spacing=0.5 (compact)
  const t = (1 - spacing) / (1 - SPACING_COMPACT);
  return full * (1 - t) + compact * t;
}

/**
 * Botão "Preencher página": quanto as FONTES podem crescer (ou precisam
 * encolher) para a coluna mais alta do layout atual ocupar a página inteira.
 * Usa as medições vigentes — que já refletem "juntar linhas" e categorias
 * ocultas. Retorna null se não houver como calcular (ex: medições ausentes).
 */
export function calcularFatorPreenchimento(
  menus: A3DuploMenuData[],
  layout: LayoutResult,
  measurements: MeasurementMatrix,
  pageContentH: number
): number | null {
  const meas = measurements[layout.numColunas];
  if (!meas || pageContentH <= 0) return null;

  let hMax = 0;
  for (const pagina of layout.paginas) {
    for (const coluna of pagina) {
      let h = 0;
      for (const bloco of coluna) {
        const m = meas[bloco.menuIdx];
        const menu = menus[bloco.menuIdx];
        if (!m || !menu) return null;
        const header = resolveH(m.headerH_full, m.headerH_compact, layout.spacing);
        const gruposH = bloco.grupos.reduce((s, g) => {
          const gi = (menu.itens || []).indexOf(g);
          if (gi < 0) return s;
          return s + resolveH(m.groupsH_full[gi] || 0, m.groupsH_compact[gi] || 0, layout.spacing);
        }, 0);
        h += (header + gruposH) * layout.scale;
      }
      if (h > hMax) hMax = h;
    }
  }

  if (hMax <= 0) return null;
  return pageContentH / hMax;
}

/** Teto do preenchimento automático (fillScale) — evita fontes gigantes */
export const FILL_MAX = 1.6;

/**
 * Um passo da convergência do preenchimento automático: devolve o próximo
 * fillScale, ou null quando está convergido/estável.
 * - Se o auto-fit teve que encolher (resultScale < 1) com fill > 1, devolve
 *   o excesso ao fill (mantém as medições coerentes com o que se desenha).
 * - Senão, cresce em direção ao fator de preenchimento com folga de 3% e
 *   passo máximo de 30% — respeitando o teto, o nº de iterações e o fallback.
 */
export function proximoFillScale(o: {
  fillScale: number;
  resultScale: number;
  fallback?: boolean;
  iter: number;
  fator: number | null;
}): number | null {
  const { fillScale, resultScale, fallback, iter, fator } = o;
  const mudou = (next: number) => (Math.abs(next - fillScale) / fillScale >= 0.01 ? next : null);

  if (resultScale < 1 && fillScale > 1) {
    return mudou(Math.max(1, fillScale * resultScale));
  }
  if (iter >= 5 || fillScale >= FILL_MAX || fallback) return null;
  if (!fator || fator <= 1.04) return null;
  return mudou(Math.min(FILL_MAX, fillScale * Math.min(fator * 0.97, 1.3)));
}

// ─── Tipos ──────────────────────────────────────────────────────────────────
export interface EmpresaMeasurement {
  blockH_full: number;
  blockH_compact: number;
  headerH_full: number;
  headerH_compact: number;
  groupsH_full: number[];
  groupsH_compact: number[];
}

export type MeasurementMatrix = Record<number, EmpresaMeasurement[]>;

export interface ColumnContent {
  menuIdx: number;
  grupos: CardapioGroup[];
  isContinuacao: boolean;
}

export interface LayoutResult {
  scale: number;
  spacing: number;
  numColunas: number;
  paginas: ColumnContent[][][];
  fallback?: boolean;
}

// ─── Algoritmo de distribuição ──────────────────────────────────────────────

type Chunk = { menuIdx: number; grupos: CardapioGroup[]; isContinuacao: boolean; h: number };
type EmpresaChunked = { idx: number; chunks: Chunk[]; altTotal: number };

export function quebrarEmpresa(
  menu: A3DuploMenuData,
  idx: number,
  meas: EmpresaMeasurement,
  scale: number,
  spacing: number,
  pageH: number
): Chunk[] | null {
  const blockH = resolveH(meas.blockH_full, meas.blockH_compact, spacing) * scale;
  const grupos = menu.itens || [];

  if (blockH <= pageH) {
    return [{ menuIdx: idx, grupos, isContinuacao: false, h: blockH }];
  }

  const chunks: Chunk[] = [];
  const headerH = resolveH(meas.headerH_full, meas.headerH_compact, spacing) * scale;
  let currentGrupos: CardapioGroup[] = [];
  let currentH = headerH;

  for (let gi = 0; gi < grupos.length; gi++) {
    const gh = resolveH(meas.groupsH_full[gi] || 0, meas.groupsH_compact[gi] || 0, spacing) * scale;
    if (headerH + gh > pageH) return null;

    if (currentH + gh > pageH && currentGrupos.length > 0) {
      chunks.push({
        menuIdx: idx,
        grupos: currentGrupos,
        isContinuacao: chunks.length > 0,
        h: currentH,
      });
      currentGrupos = [];
      currentH = headerH;
    }
    currentGrupos.push(grupos[gi]);
    currentH += gh;
  }
  if (currentGrupos.length > 0) {
    chunks.push({
      menuIdx: idx,
      grupos: currentGrupos,
      isContinuacao: chunks.length > 0,
      h: currentH,
    });
  }
  return chunks;
}

export function tentarLayout(
  menus: A3DuploMenuData[],
  meas: EmpresaMeasurement[],
  scale: number,
  spacing: number,
  numCols: number,
  pageH: number
): ColumnContent[][][] | null {
  const empresas: EmpresaChunked[] = [];
  for (let i = 0; i < menus.length; i++) {
    const chunks = quebrarEmpresa(menus[i], i, meas[i], scale, spacing, pageH);
    if (!chunks) return null;
    if (chunks.length > numCols) return null;
    const altTotal = chunks.reduce((s, c) => s + c.h, 0);
    empresas.push({ idx: i, chunks, altTotal });
  }

  // Separa empresas pinadas (destaque) das demais. Pinadas vão 100% na página 0.
  const pinned = empresas.filter((e) => isPinned(menus[e.idx]));
  const others = empresas.filter((e) => !isPinned(menus[e.idx]));
  others.sort((a, b) => b.altTotal - a.altTotal);

  const pagEmpresas: EmpresaChunked[][] = [[], []];
  const pagAlturas = [0, 0];
  for (const p of pinned) {
    pagEmpresas[0].push(p);
    pagAlturas[0] += p.altTotal;
  }
  for (const e of others) {
    const p = pagAlturas[0] <= pagAlturas[1] ? 0 : 1;
    pagEmpresas[p].push(e);
    pagAlturas[p] += e.altTotal;
  }

  const paginas: ColumnContent[][][] = [];
  for (let pi = 0; pi < pagEmpresas.length; pi++) {
    const empresasDaPag = pagEmpresas[pi];
    // pinadas ficam no início; demais, ordenadas desc
    const pinadasDaPag = empresasDaPag.filter((e) => isPinned(menus[e.idx]));
    const othersDaPag = empresasDaPag.filter((e) => !isPinned(menus[e.idx]));
    othersDaPag.sort((a, b) => b.altTotal - a.altTotal);

    const colunas: ColumnContent[][] = Array.from({ length: numCols }, () => []);
    const alturasCol = new Array(numCols).fill(0);

    let falhou = false;

    // Aloca pinadas nas colunas iniciais em sequência
    let proximaCol = 0;
    for (const emp of pinadasDaPag) {
      const k = emp.chunks.length;
      if (proximaCol + k > numCols) { falhou = true; break; }
      for (let j = 0; j < k; j++) {
        if (alturasCol[proximaCol + j] + emp.chunks[j].h > pageH) { falhou = true; break; }
      }
      if (falhou) break;
      for (let j = 0; j < k; j++) {
        const c = emp.chunks[j];
        colunas[proximaCol + j].push({
          menuIdx: c.menuIdx, grupos: c.grupos, isContinuacao: c.isContinuacao,
        });
        alturasCol[proximaCol + j] += c.h;
      }
      proximaCol += k;
    }
    if (falhou) return null;

    for (const emp of othersDaPag) {
      if (emp.chunks.length === 1) {
        const c = emp.chunks[0];
        let bestCol = -1;
        let bestH = Infinity;
        for (let ci = 0; ci < numCols; ci++) {
          if (alturasCol[ci] + c.h <= pageH && alturasCol[ci] < bestH) {
            bestH = alturasCol[ci];
            bestCol = ci;
          }
        }
        if (bestCol === -1) { falhou = true; break; }
        colunas[bestCol].push({ menuIdx: c.menuIdx, grupos: c.grupos, isContinuacao: c.isContinuacao });
        alturasCol[bestCol] += c.h;
      } else {
        const k = emp.chunks.length;
        let startBest = -1;
        let maxFreeBest = -Infinity;
        for (let start = 0; start + k <= numCols; start++) {
          let ok = true;
          let freeSum = 0;
          for (let j = 0; j < k; j++) {
            if (alturasCol[start + j] + emp.chunks[j].h > pageH) { ok = false; break; }
            freeSum += (pageH - alturasCol[start + j]);
          }
          if (ok && freeSum > maxFreeBest) {
            maxFreeBest = freeSum;
            startBest = start;
          }
        }
        if (startBest === -1) { falhou = true; break; }
        for (let j = 0; j < k; j++) {
          const c = emp.chunks[j];
          colunas[startBest + j].push({
            menuIdx: c.menuIdx, grupos: c.grupos, isContinuacao: c.isContinuacao,
          });
          alturasCol[startBest + j] += c.h;
        }
      }
    }
    if (falhou) return null;
    paginas.push(colunas);
  }
  return paginas;
}

export function calcularLayout(
  menus: A3DuploMenuData[],
  measurements: MeasurementMatrix,
  pageH: number
): LayoutResult {
  // Ordem: maximiza fonte; se não couber, compacta espaçamento; só depois aumenta colunas; por último reduz fonte.
  for (const scale of SCALE_STEPS) {
    for (const spacing of SPACING_STEPS) {
      for (const numCols of COL_CHOICES) {
        const meas = measurements[numCols];
        if (!meas) continue;
        const result = tentarLayout(menus, meas, scale, spacing, numCols, pageH);
        if (result) return { scale, spacing, numColunas: numCols, paginas: result };
      }
    }
  }
  const scale = SCALE_STEPS[SCALE_STEPS.length - 1];
  const spacing = SPACING_STEPS[SPACING_STEPS.length - 1];
  const numCols = 4;
  const paginas: ColumnContent[][][] = [0, 1].map(() => Array.from({ length: numCols }, () => [] as ColumnContent[]));
  menus.forEach((menu, idx) => {
    const pIdx = idx < Math.ceil(menus.length / 2) ? 0 : 1;
    const cIdx = idx % numCols;
    paginas[pIdx][cIdx].push({ menuIdx: idx, grupos: menu.itens || [], isContinuacao: false });
  });
  return { scale, spacing, numColunas: numCols, paginas, fallback: true };
}
