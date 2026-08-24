import { describe, it, expect } from 'vitest';
import { calcSingleCol, TWO_COL_ITEM_THRESHOLD } from './cardapioA4Config';

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
