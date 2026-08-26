import { describe, it, expect } from 'vitest';
import {
  A3DuploMenuData,
  EmpresaMeasurement,
  MeasurementMatrix,
  LayoutResult,
  COL_CHOICES,
  SCALE_STEPS,
  SPACING_STEPS,
  calcularLayout,
  tentarLayout,
  resolveH,
  resolveFontes,
  fontesSaoPadrao,
  aplicarLinhas,
  calcularFatorPreenchimento,
  proximoFillScale,
  FILL_MAX,
  LINHAS_SENS,
  LINHAS_MIN,
  LINHAS_MAX,
  FONTES_A3_PADRAO,
} from './a3DuploLayout';
import type { CardapioGroup } from '../../utils/cardapioParser';

// Altura útil real da página A3 no componente: (420 - 2*15)mm * 96/25.4 ≈ 1474px
const PAGE_H = (420 - 2 * 15) * (96 / 25.4);

// ─── RNG determinístico (mulberry32) para casos reproduzíveis ────────────────
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const int = (rng: () => number, min: number, max: number) =>
  min + Math.floor(rng() * (max - min + 1));

function gerarMenus(rng: () => number): A3DuploMenuData[] {
  const nEmpresas = int(rng, 3, 12);
  return Array.from({ length: nEmpresas }, (_, e) => ({
    id: `m${e}`,
    empresa: `EMPRESA ${e}`,
    titulo: rng() > 0.5 ? `Título ${e}` : undefined,
    itens: Array.from({ length: int(rng, 1, 6) }, (_, g): CardapioGroup => ({
      categoria: `CAT ${e}-${g}`,
      itens: Array.from({ length: int(rng, 2, 10) }, (_, i) => ({
        item: `Item ${e}-${g}-${i}`,
        valor: 'R$ 10,00',
        descricao: rng() > 0.6 ? 'descrição do item' : '',
      })),
    })),
  }));
}

/**
 * Medições sintéticas que imitam o DOM: coluna mais estreita (mais colunas)
 * → mais quebra de linha → blocos mais altos; espaçamento compacto ≈ 72%.
 */
function medirFake(menus: A3DuploMenuData[]): MeasurementMatrix {
  const matrix: MeasurementMatrix = {};
  for (const n of COL_CHOICES) {
    const wrapFactor = 1 + (n - 2) * 0.18;
    matrix[n] = menus.map((m): EmpresaMeasurement => {
      const groupsH_full = m.itens.map(
        (g) => (26 + g.itens.length * 24) * wrapFactor
      );
      const groupsH_compact = groupsH_full.map((h) => h * 0.72);
      const headerH_full = 60;
      const headerH_compact = 52;
      return {
        headerH_full,
        headerH_compact,
        groupsH_full,
        groupsH_compact,
        blockH_full: headerH_full + groupsH_full.reduce((a, b) => a + b, 0),
        blockH_compact: headerH_compact + groupsH_compact.reduce((a, b) => a + b, 0),
      };
    });
  }
  return matrix;
}

/** Recalcula a altura de cada coluna do resultado a partir das medições. */
function alturasColunas(
  layout: LayoutResult,
  menus: A3DuploMenuData[],
  matrix: MeasurementMatrix
): number[][] {
  const meas = matrix[layout.numColunas];
  return layout.paginas.map((pagina) =>
    pagina.map((coluna) =>
      coluna.reduce((total, bloco) => {
        const m = meas[bloco.menuIdx];
        const menu = menus[bloco.menuIdx];
        const header = resolveH(m.headerH_full, m.headerH_compact, layout.spacing);
        const gruposH = bloco.grupos.reduce((s, g) => {
          const gi = menu.itens.indexOf(g);
          return s + resolveH(m.groupsH_full[gi], m.groupsH_compact[gi], layout.spacing);
        }, 0);
        return total + (header + gruposH) * layout.scale;
      }, 0)
    )
  );
}

describe('juntar linhas / mostrar categorias (fontes_a3)', () => {
  it('resolveFontes: padrão tem linhas=1 e categorias visíveis (compatível com fontes_a3 antigos)', () => {
    expect(resolveFontes(null)).toMatchObject({ linhas: 1, mostrarCategorias: true });
    // JSON salvo antes da feature (sem os campos novos) → defaults
    expect(resolveFontes({ item: 14 })).toMatchObject({ item: 14, linhas: 1, mostrarCategorias: true });
  });

  it('resolveFontes: aceita os campos novos e clampa linhas no intervalo', () => {
    const f = resolveFontes({ linhas: 0.9, mostrarCategorias: false });
    expect(f.linhas).toBe(0.9);
    expect(f.mostrarCategorias).toBe(false);
    expect(resolveFontes({ linhas: 0.1 }).linhas).toBe(LINHAS_MIN);
    expect(resolveFontes({ linhas: 5 }).linhas).toBe(LINHAS_MAX);
  });

  it('fontesSaoPadrao detecta mudança nos campos novos', () => {
    expect(fontesSaoPadrao({ ...FONTES_A3_PADRAO })).toBe(true);
    expect(fontesSaoPadrao({ ...FONTES_A3_PADRAO, linhas: 0.9 })).toBe(false);
    expect(fontesSaoPadrao({ ...FONTES_A3_PADRAO, mostrarCategorias: false })).toBe(false);
  });

  it('aplicarLinhas: descrição (já colada) encolhe menos que o espaço entre itens', () => {
    // 90% → descrição recua só 5%; espaço entre itens recua os 10% cheios
    expect(aplicarLinhas(10, LINHAS_SENS.descricao, 0.9)).toBeCloseTo(9.5);
    expect(aplicarLinhas(10, LINHAS_SENS.item, 0.9)).toBeCloseTo(9);
    // aumentar segue a mesma proporção
    expect(aplicarLinhas(10, LINHAS_SENS.item, 1.2)).toBeCloseTo(12);
    // 100% = neutro
    expect(aplicarLinhas(10, LINHAS_SENS.item, 1)).toBe(10);
  });
});

describe('calcularFatorPreenchimento (preenchimento automático)', () => {
  const grupo: CardapioGroup = {
    categoria: 'CAT',
    itens: [{ item: 'Item', valor: 'R$ 10,00', descricao: '' }],
  };
  const menus: A3DuploMenuData[] = [{ id: 'm0', empresa: 'X', itens: [grupo] }];
  const matrix: MeasurementMatrix = {
    2: [{
      headerH_full: 50, headerH_compact: 40,
      groupsH_full: [350], groupsH_compact: [260],
      blockH_full: 400, blockH_compact: 300,
    }],
  };
  const layoutBase: LayoutResult = {
    scale: 1,
    spacing: 1,
    numColunas: 2,
    paginas: [[[{ menuIdx: 0, grupos: [grupo], isContinuacao: false }]]],
  };

  it('página com sobra → fator > 1 (coluna de 400 numa página de 1000 → 2.5)', () => {
    expect(calcularFatorPreenchimento(menus, layoutBase, matrix, 1000)).toBeCloseTo(2.5);
  });

  it('conteúdo estourado → fator < 1 (encolher para caber)', () => {
    expect(calcularFatorPreenchimento(menus, layoutBase, matrix, 200)).toBeCloseTo(0.5);
  });

  it('respeita o scale já aplicado pelo layout', () => {
    const comScale: LayoutResult = { ...layoutBase, scale: 0.8 };
    // coluna: 400 * 0.8 = 320 → 1000/320 = 3.125
    expect(calcularFatorPreenchimento(menus, comScale, matrix, 1000)).toBeCloseTo(3.125);
  });

  it('retorna null sem medições da configuração de colunas ou altura inválida', () => {
    expect(calcularFatorPreenchimento(menus, { ...layoutBase, numColunas: 3 }, matrix, 1000)).toBeNull();
    expect(calcularFatorPreenchimento(menus, layoutBase, matrix, 0)).toBeNull();
  });
});

describe('proximoFillScale (convergência do preenchimento)', () => {
  it('cresce com folga de 3% e passo máximo de 30%', () => {
    // sobra grande (fator 2.5) → passo limitado a +30%
    expect(proximoFillScale({ fillScale: 1, resultScale: 1, iter: 0, fator: 2.5 })).toBeCloseTo(1.3);
    // sobra pequena (fator 1.1) → cresce 1.1*0.97 ≈ +6.7%
    expect(proximoFillScale({ fillScale: 1, resultScale: 1, iter: 0, fator: 1.1 })).toBeCloseTo(1.067);
  });

  it('para quando está preenchido (fator ≤ 1.04), no teto, no limite de iterações ou em fallback', () => {
    expect(proximoFillScale({ fillScale: 1.2, resultScale: 1, iter: 0, fator: 1.03 })).toBeNull();
    expect(proximoFillScale({ fillScale: FILL_MAX, resultScale: 1, iter: 0, fator: 2 })).toBeNull();
    expect(proximoFillScale({ fillScale: 1.2, resultScale: 1, iter: 5, fator: 2 })).toBeNull();
    expect(proximoFillScale({ fillScale: 1.2, resultScale: 1, iter: 0, fator: 2, fallback: true })).toBeNull();
    expect(proximoFillScale({ fillScale: 1, resultScale: 1, iter: 0, fator: null })).toBeNull();
  });

  it('devolve o excesso quando o auto-fit precisou encolher, sem descer de 1', () => {
    expect(proximoFillScale({ fillScale: 1.3, resultScale: 0.9, iter: 0, fator: null })).toBeCloseTo(1.17);
    expect(proximoFillScale({ fillScale: 1.05, resultScale: 0.5, iter: 0, fator: null })).toBe(1);
    // fill já em 1 e conteúdo grande → não mexe (encolher é papel do scale do layout)
    expect(proximoFillScale({ fillScale: 1, resultScale: 0.8, iter: 0, fator: null })).toBeNull();
  });

  it('a sequência converge em poucas iterações (sobra 1.5x → página quase cheia)', () => {
    let fill = 1;
    let iter = 0;
    let fator = 1.5; // página 50% mais alta que o conteúdo
    while (iter < 10) {
      const next = proximoFillScale({ fillScale: fill, resultScale: 1, iter, fator });
      if (next === null) break;
      fator = fator * (fill / next); // conteúdo cresce → sobra diminui proporcionalmente
      fill = next;
      iter++;
    }
    expect(iter).toBeLessThanOrEqual(5);
    expect(fill).toBeLessThanOrEqual(FILL_MAX);
    expect(fator).toBeLessThanOrEqual(1.05); // página quase cheia ao convergir
  });

  it('sobra muito grande para no teto FILL_MAX (trava anti-fonte-gigante)', () => {
    let fill = 1;
    let iter = 0;
    let fator = 2.5;
    while (iter < 10) {
      const next = proximoFillScale({ fillScale: fill, resultScale: 1, iter, fator });
      if (next === null) break;
      fator = fator * (fill / next);
      fill = next;
      iter++;
    }
    expect(fill).toBe(FILL_MAX);
  });
});

const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);

describe('calcularLayout (distribuição do A3 Duplo)', () => {
  it('nunca estoura a altura da página (60 cenários aleatórios)', () => {
    for (const seed of SEEDS) {
      const rng = mulberry32(seed);
      const menus = gerarMenus(rng);
      const matrix = medirFake(menus);
      const layout = calcularLayout(menus, matrix, PAGE_H);
      if (layout.fallback) continue; // estouro explícito e sinalizado na UI
      for (const pagina of alturasColunas(layout, menus, matrix)) {
        for (const alturaCol of pagina) {
          expect(alturaCol, `seed ${seed}`).toBeLessThanOrEqual(PAGE_H + 0.001);
        }
      }
    }
  });

  it('nenhuma categoria se perde nem duplica, e a ordem interna é mantida', () => {
    for (const seed of SEEDS) {
      const rng = mulberry32(seed);
      const menus = gerarMenus(rng);
      const layout = calcularLayout(menus, medirFake(menus), PAGE_H);

      const vistosPorMenu = new Map<number, CardapioGroup[]>();
      for (const pagina of layout.paginas) {
        for (const coluna of pagina) {
          for (const bloco of coluna) {
            const lista = vistosPorMenu.get(bloco.menuIdx) ?? [];
            lista.push(...bloco.grupos);
            vistosPorMenu.set(bloco.menuIdx, lista);
          }
        }
      }
      menus.forEach((menu, idx) => {
        // mesmos grupos, exatamente uma vez, na ordem original
        expect(vistosPorMenu.get(idx), `seed ${seed} menu ${idx}`).toEqual(menu.itens);
      });
    }
  });

  it('a empresa com destaque abre a coluna 0 da primeira página', () => {
    for (const seed of SEEDS) {
      const rng = mulberry32(seed);
      const menus = gerarMenus(rng);
      const destacado = int(rng, 0, menus.length - 1);
      menus[destacado].destaque = true;

      const layout = calcularLayout(menus, medirFake(menus), PAGE_H);
      if (layout.fallback) continue;

      const primeiroBloco = layout.paginas[0][0][0];
      expect(primeiroBloco.menuIdx, `seed ${seed}`).toBe(destacado);
      expect(primeiroBloco.isContinuacao).toBe(false);
    }
  });

  it('a fonte escolhida é a MAIOR possível (nenhuma escala acima caberia)', () => {
    for (const seed of SEEDS.slice(0, 25)) {
      const rng = mulberry32(seed);
      const menus = gerarMenus(rng);
      const matrix = medirFake(menus);
      const layout = calcularLayout(menus, matrix, PAGE_H);
      if (layout.fallback) continue;

      const escalasMaiores = SCALE_STEPS.filter((s) => s > layout.scale);
      for (const scale of escalasMaiores) {
        for (const spacing of SPACING_STEPS) {
          for (const numCols of COL_CHOICES) {
            expect(
              tentarLayout(menus, matrix[numCols], scale, spacing, numCols, PAGE_H),
              `seed ${seed}: escala ${scale} caberia (spacing ${spacing}, ${numCols} col) mas foi escolhida ${layout.scale}`
            ).toBeNull();
          }
        }
      }
    }
  });

  it('conteúdo pequeno mantém fonte 100%', () => {
    const menus: A3DuploMenuData[] = [
      { empresa: 'A', itens: [{ categoria: 'C', itens: [{ item: 'x', valor: '1', descricao: '' }] }] },
      { empresa: 'B', itens: [{ categoria: 'C', itens: [{ item: 'y', valor: '1', descricao: '' }] }] },
    ];
    const layout = calcularLayout(menus, medirFake(menus), PAGE_H);
    expect(layout.fallback).toBeUndefined();
    expect(layout.scale).toBe(1.0);
    expect(layout.spacing).toBe(1.0);
  });

  it('fontes maiores (blocos mais altos) reduzem a escala global para caber', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const rng = mulberry32(seed);
      const menus = gerarMenus(rng);
      const base = medirFake(menus);

      // Simula o usuário aumentando fontes: todos os blocos ficam 30% mais altos
      const maior: MeasurementMatrix = {};
      for (const n of COL_CHOICES) {
        maior[n] = base[n].map((m) => ({
          headerH_full: m.headerH_full * 1.3,
          headerH_compact: m.headerH_compact * 1.3,
          groupsH_full: m.groupsH_full.map((h) => h * 1.3),
          groupsH_compact: m.groupsH_compact.map((h) => h * 1.3),
          blockH_full: m.blockH_full * 1.3,
          blockH_compact: m.blockH_compact * 1.3,
        }));
      }

      const layoutBase = calcularLayout(menus, base, PAGE_H);
      const layoutMaior = calcularLayout(menus, maior, PAGE_H);
      if (layoutBase.fallback || layoutMaior.fallback) continue;

      // A escala nunca aumenta; e o novo layout continua sem estourar
      expect(layoutMaior.scale, `seed ${seed}`).toBeLessThanOrEqual(layoutBase.scale);
      for (const pagina of alturasColunas(layoutMaior, menus, maior)) {
        for (const alturaCol of pagina) {
          expect(alturaCol, `seed ${seed}`).toBeLessThanOrEqual(PAGE_H + 0.001);
        }
      }
    }
  });

  it('conteúdo impossível cai no fallback sinalizado (estouro)', () => {
    // Uma única categoria mais alta que a página mesmo compacta a 50%
    const menus: A3DuploMenuData[] = [{
      empresa: 'GIGANTE',
      itens: [{
        categoria: 'ÚNICA',
        itens: Array.from({ length: 500 }, (_, i) => ({ item: `i${i}`, valor: '1', descricao: '' })),
      }],
    }];
    const layout = calcularLayout(menus, medirFake(menus), PAGE_H);
    expect(layout.fallback).toBe(true);
  });
});
