import { describe, it, expect } from 'vitest';
import {
  resolveAreaUtil,
  fitLogoCm,
  calcExportPxPerCm,
  medirBloco,
  calcLonaLayout,
  resolveFontesLona,
  fontesLonaSaoPadrao,
  FONTES_LONA_PADRAO,
  LONA_PADRAO,
  EXPORT_PX_PER_CM,
  MAX_CANVAS_SIDE,
  MIN_ITEM_FONT_CM,
  LonaBloco,
} from './cardapioLonaConfig';
import { CardapioGroup } from '../../utils/cardapioParser';

const grupo = (n: number, categoria = 'CAT'): CardapioGroup => ({
  categoria,
  itens: Array.from({ length: n }, (_, i) => ({
    item: `Item ${i}`,
    valor: 'R$ 10,00',
    descricao: '',
  })),
});

const bloco = (over: Partial<LonaBloco> = {}): LonaBloco => ({
  menuId: 'm1',
  titulo: 'CHARLES',
  grupos: [grupo(5)],
  logoUrl: null,
  destaque: false,
  logoMaxLarguraCm: 14,
  logoMaxAlturaCm: 7,
  ...over,
});

describe('resolveAreaUtil', () => {
  it('centraliza a área útil quando offsets são nulos (caso 100×300 / 80×210)', () => {
    const r = resolveAreaUtil(LONA_PADRAO);
    expect(r).toEqual({ x: 10, y: 45, w: 80, h: 210 });
  });

  it('respeita offsets explícitos', () => {
    const r = resolveAreaUtil({ ...LONA_PADRAO, utilOffsetXCm: 5, utilOffsetYCm: 20 });
    expect(r.x).toBe(5);
    expect(r.y).toBe(20);
  });

  it('nunca deixa a área útil extrapolar a lona (clamp de offset e dimensão)', () => {
    const r = resolveAreaUtil({
      larguraCm: 100,
      alturaCm: 300,
      utilLarguraCm: 120,   // maior que a lona → reduz
      utilAlturaCm: 210,
      utilOffsetXCm: 50,    // empurraria pra fora → clampa
      utilOffsetYCm: 250,
    });
    expect(r.w).toBe(100);
    expect(r.x).toBe(0);
    expect(r.y).toBe(90); // 300 - 210
  });
});

describe('fitLogoCm (contain — proporção sempre preservada)', () => {
  it('logo larga: a largura máxima manda', () => {
    // 4:1 numa caixa 14×7 → 14×3,5
    const { wCm, hCm } = fitLogoCm(400, 100, 14, 7);
    expect(wCm).toBeCloseTo(14, 10);
    expect(hCm).toBeCloseTo(3.5, 10);
  });

  it('logo alta: a altura máxima manda', () => {
    // 1:2 numa caixa 14×7 → 3,5×7
    const { wCm, hCm } = fitLogoCm(100, 200, 14, 7);
    expect(wCm).toBeCloseTo(3.5, 10);
    expect(hCm).toBeCloseTo(7, 10);
  });

  it('logo quadrada em caixa retangular: lado menor da caixa manda', () => {
    expect(fitLogoCm(300, 300, 14, 7)).toEqual({ wCm: 7, hCm: 7 });
  });

  it('entradas inválidas viram caixa vazia', () => {
    expect(fitLogoCm(0, 100, 14, 7)).toEqual({ wCm: 0, hCm: 0 });
    expect(fitLogoCm(100, 100, 0, 7)).toEqual({ wCm: 0, hCm: 0 });
  });
});

describe('calcExportPxPerCm', () => {
  it('lona 100×300 exporta no alvo cheio (~100dpi)', () => {
    expect(calcExportPxPerCm(100, 300)).toBe(EXPORT_PX_PER_CM);
  });

  it('lona gigante reduz para caber nos limites de canvas', () => {
    const px = calcExportPxPerCm(500, 800);
    expect(px).toBeLessThan(EXPORT_PX_PER_CM);
    expect(800 * px).toBeLessThanOrEqual(MAX_CANVAS_SIDE);
  });
});

describe('fontes da lona', () => {
  it('resolve parciais sobre o padrão e ignora valores inválidos', () => {
    const f = resolveFontesLona({ item: 1.2, preco: -1 });
    expect(f.item).toBe(1.2);
    expect(f.preco).toBe(1);
    expect(fontesLonaSaoPadrao(f)).toBe(false);
    expect(fontesLonaSaoPadrao({ ...FONTES_LONA_PADRAO })).toBe(true);
  });
});

describe('medirBloco', () => {
  it('bloco com logo tem altura fixa (logo em cm) e não conta título no peso', () => {
    const comLogo = medirBloco(
      bloco({ logoUrl: 'x.png' }),
      0.25, // ratio h/w → 14×3,5 na caixa 14×7
      resolveFontesLona(null)
    );
    const semLogo = medirBloco(bloco(), null, resolveFontesLona(null));
    expect(comLogo.fixoCm).toBeGreaterThan(3.5); // logo + respiro
    expect(semLogo.fixoCm).toBe(0);
    expect(semLogo.pesoEm).toBeGreaterThan(comLogo.pesoEm); // título entra no peso
  });

  it('bloco destaque pesa pela coluna interna mais cheia, não pela soma', () => {
    const grupos = [grupo(10, 'DOSES'), grupo(10, 'GARRAFAS'), grupo(10, 'COMBOS')];
    const dest = medirBloco(bloco({ destaque: true, grupos }), null, resolveFontesLona(null));
    const normal = medirBloco(bloco({ grupos }), null, resolveFontesLona(null));
    expect(dest.pesoEm).toBeLessThan(normal.pesoEm);
  });
});

describe('calcLonaLayout', () => {
  const fontes = resolveFontesLona(null);

  it('separa destaques das colunas e preenche a altura útil', () => {
    const medidos = [
      medirBloco(bloco({ menuId: 'bar', destaque: true, grupos: [grupo(8), grupo(8)] }), null, fontes),
      ...Array.from({ length: 6 }, (_, i) =>
        medirBloco(bloco({ menuId: `m${i}`, grupos: [grupo(6)] }), null, fontes)
      ),
    ];
    const layout = calcLonaLayout(medidos, 2, 210);
    expect(layout.destaques).toHaveLength(1);
    expect(layout.colunas).toHaveLength(2);
    expect(layout.colunas.flat()).toHaveLength(6);
    expect(layout.fonteCm).toBeGreaterThan(0);
  });

  it('colunas ficam aproximadamente balanceadas', () => {
    const medidos = Array.from({ length: 8 }, (_, i) =>
      medirBloco(bloco({ menuId: `m${i}`, grupos: [grupo(4 + (i % 3))] }), null, fontes)
    );
    const layout = calcLonaLayout(medidos, 2, 210);
    const alturas = layout.colunas.map((col) =>
      col.reduce((s, b) => s + b.fixoCm + b.pesoEm * layout.fonteCm, 0)
    );
    const razao = Math.max(...alturas) / Math.min(...alturas);
    expect(razao).toBeLessThan(1.6);
  });

  it('conteúdo demais dispara o aviso de fonte abaixo do mínimo legível', () => {
    const medidos = Array.from({ length: 30 }, (_, i) =>
      medirBloco(bloco({ menuId: `m${i}`, grupos: [grupo(20)] }), null, fontes)
    );
    const layout = calcLonaLayout(medidos, 1, 100); // área útil baixa de propósito
    expect(layout.fonteCm).toBeLessThan(MIN_ITEM_FONT_CM);
    expect(layout.abaixoDoMinimo).toBe(true);
  });

  it('caso só-destaques também calcula fonte finita', () => {
    const medidos = [
      medirBloco(bloco({ destaque: true, grupos: [grupo(10)] }), null, fontes),
    ];
    const layout = calcLonaLayout(medidos, 2, 210);
    expect(Number.isFinite(layout.fonteCm)).toBe(true);
    expect(layout.fonteCm).toBeGreaterThan(0);
  });
});
