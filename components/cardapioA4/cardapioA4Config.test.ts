import { describe, it, expect } from 'vitest';
import {
  calcSingleCol,
  TWO_COL_ITEM_THRESHOLD,
  quebrarNomeEmpresa,
  EMPRESA_QUEBRA_LEN,
  calcEmpresaFs,
  resolveFontesA4,
} from './cardapioA4Config';

describe('calcSingleCol — decisão de colunas do menu A4', () => {
  it('usa coluna única até o limiar automático', () => {
    expect(calcSingleCol(1)).toBe(true);
    expect(calcSingleCol(TWO_COL_ITEM_THRESHOLD)).toBe(true);
  });

  it('usa duas colunas acima do limiar automático', () => {
    expect(calcSingleCol(TWO_COL_ITEM_THRESHOLD + 1)).toBe(false);
    expect(calcSingleCol(50)).toBe(false);
  });

  it('forcarUmaColuna vence o limiar — coluna única mesmo com muitos itens', () => {
    expect(calcSingleCol(TWO_COL_ITEM_THRESHOLD + 1, true)).toBe(true);
    expect(calcSingleCol(50, true)).toBe(true);
  });

  it('forcarUmaColuna false/null/undefined mantém o comportamento automático', () => {
    expect(calcSingleCol(TWO_COL_ITEM_THRESHOLD + 1, false)).toBe(false);
    expect(calcSingleCol(TWO_COL_ITEM_THRESHOLD + 1, null)).toBe(false);
    expect(calcSingleCol(TWO_COL_ITEM_THRESHOLD + 1, undefined)).toBe(false);
    expect(calcSingleCol(TWO_COL_ITEM_THRESHOLD, false)).toBe(true);
  });
});

describe('quebrarNomeEmpresa — nome longo em 2 linhas no cabeçalho', () => {
  it('nome curto fica em 1 linha', () => {
    expect(quebrarNomeEmpresa('CHARLES')).toEqual(['CHARLES']);
    expect(quebrarNomeEmpresa('CRISTINAMISK BUFFET')).toEqual(['CRISTINAMISK BUFFET']);
  });

  it('nome longo parte no espaço mais próximo do meio', () => {
    const linhas = quebrarNomeEmpresa(
      'TABELA EXCLUSIVA ESTANDE / EXPOSITOR PAVILHÃO B / CAMAROTE'
    );
    expect(linhas).toHaveLength(2);
    expect(linhas.join(' ')).toBe('TABELA EXCLUSIVA ESTANDE / EXPOSITOR PAVILHÃO B / CAMAROTE');
    // quebra razoavelmente equilibrada (nenhuma linha com tudo)
    expect(linhas[0].length).toBeGreaterThan(15);
    expect(linhas[1].length).toBeGreaterThan(15);
  });

  it('nome longo SEM espaços não quebra (não parte palavra)', () => {
    const nome = 'X'.repeat(EMPRESA_QUEBRA_LEN + 10);
    expect(quebrarNomeEmpresa(nome)).toEqual([nome]);
  });

  it('calcEmpresaFs usa a linha mais longa — nome quebrado ganha fonte maior', () => {
    // 38 chars → 2 linhas: 'SUPERMERCADO CENTRAL' (20) + 'DA FAZENDA BONITA'
    const longo = 'SUPERMERCADO CENTRAL DA FAZENDA BONITA';
    const fsQuebrado = calcEmpresaFs(longo, 5);
    const fsCurto = calcEmpresaFs('NOME COM VINTE CHARS', 5); // 20 chars, 1 linha
    expect(fsQuebrado).toBeGreaterThan(22); // sem a quebra ficaria no piso de 22
    expect(fsQuebrado).toBe(fsCurto);
  });
});

describe('resolveFontesA4 — juntar linhas e mostrar categorias', () => {
  it('default 1, aceita o campo e clampa no intervalo', () => {
    expect(resolveFontesA4(null).linhas).toBe(1);
    expect(resolveFontesA4({ item: 1.2 }).linhas).toBe(1); // JSON antigo
    expect(resolveFontesA4({ linhas: 0.85 }).linhas).toBe(0.85);
    expect(resolveFontesA4({ linhas: 0.1 }).linhas).toBe(0.7);
    expect(resolveFontesA4({ linhas: 9 }).linhas).toBe(1.3);
  });

  it('mostrarCategorias: default true (JSON antigo) e aceita false', () => {
    expect(resolveFontesA4(null).mostrarCategorias).toBe(true);
    expect(resolveFontesA4({ item: 1.2 }).mostrarCategorias).toBe(true);
    expect(resolveFontesA4({ mostrarCategorias: false }).mostrarCategorias).toBe(false);
  });
});
