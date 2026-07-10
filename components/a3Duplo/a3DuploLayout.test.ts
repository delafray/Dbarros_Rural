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
