import { describe, it, expect, vi } from 'vitest';

// planilhaVendasService (importado pelo hook só para o tipo CategoriaSetup)
// puxa o supabaseClient, que dá throw sem as env vars. Mockamos a cadeia.
vi.mock('../services/supabaseClient', () => ({ supabase: {} }));

import {
    calcTotal,
    calcCombo,
    applyAtualizarPrecos,
    applyM2Change,
    applyPrecoM2Change,
    applyComboChange,
    type ALRow,
} from './useAreaLivreCalculations';

function makeRow(over: Partial<ALRow> = {}): ALRow {
    return {
        id: 'r1',
        stand_nr: '01',
        cliente_id: null,
        cliente_nome_livre: null,
        area_m2: 10,
        preco_m2: 150,
        preco_m2_is_override: false,
        total_override: null,
        combo_overrides: {},
        total_stale: false,
        ...over,
    };
}

describe('calcTotal', () => {
    it('usa area_m2 * preco_m2 quando não há override', () => {
        expect(calcTotal(makeRow({ area_m2: 10, preco_m2: 150 }))).toBe(1500);
    });
    it('prioriza o total_override, mesmo com área/preço nulos', () => {
        expect(calcTotal(makeRow({ total_override: 999, area_m2: null, preco_m2: null }))).toBe(999);
    });
    it('retorna 0 quando falta área ou preço e não há override', () => {
        expect(calcTotal(makeRow({ area_m2: null }))).toBe(0);
        expect(calcTotal(makeRow({ preco_m2: null }))).toBe(0);
    });
});

describe('calcCombo', () => {
    const comboNames = ['COMBO A', 'COMBO B'];
    it('soma o adicional do combo ao total base', () => {
        const row = makeRow({ area_m2: 10, preco_m2: 100 }); // total 1000
        expect(calcCombo(row, 0, comboNames, [200, 300])).toBe(1200);
        expect(calcCombo(row, 1, comboNames, [200, 300])).toBe(1300);
    });
    it('usa o override do combo quando presente (pela label)', () => {
        const row = makeRow({ combo_overrides: { 'COMBO A': 777 } });
        expect(calcCombo(row, 0, comboNames, [200])).toBe(777);
    });
    it('trata combosAdicionais ausente como adicional 0', () => {
        const row = makeRow({ area_m2: 10, preco_m2: 100 });
        expect(calcCombo(row, 0, comboNames, undefined)).toBe(1000);
    });
    it('gera label default COMBO 0N quando o nome está vazio', () => {
        const row = makeRow({ combo_overrides: { 'COMBO 01': 55 } });
        expect(calcCombo(row, 0, [], [0])).toBe(55);
    });
});

describe('applyM2Change', () => {
    it('só altera o row alvo (imutável: outros mantêm identidade)', () => {
        const outro = makeRow({ id: 'r2' });
        const rows = [makeRow({ id: 'r1' }), outro];
        const res = applyM2Change(rows, 'r1', 20);
        expect(res[1]).toBe(outro); // mesma referência
        expect(res[0].area_m2).toBe(20);
    });
    it('limpar o m² (null) zera overrides e stale', () => {
        const rows = [makeRow({ total_override: 500, combo_overrides: { X: 1 }, total_stale: true })];
        const [r] = applyM2Change(rows, 'r1', null);
        expect(r.area_m2).toBeNull();
        expect(r.total_override).toBeNull();
        expect(r.combo_overrides).toEqual({});
        expect(r.total_stale).toBe(false);
    });
    it('marca total_stale quando muda o m² e já existe override', () => {
        const rows = [makeRow({ total_override: 500 })];
        expect(applyM2Change(rows, 'r1', 20)[0].total_stale).toBe(true);
        const semOverride = [makeRow({ total_override: null, combo_overrides: {} })];
        expect(applyM2Change(semOverride, 'r1', 20)[0].total_stale).toBe(false);
    });
});

describe('applyPrecoM2Change', () => {
    it('marca is_override apenas quando o valor difere da referência da categoria', () => {
        const rows = [makeRow()];
        expect(applyPrecoM2Change(rows, 'r1', 150, 150)[0].preco_m2_is_override).toBe(false);
        expect(applyPrecoM2Change(rows, 'r1', 200, 150)[0].preco_m2_is_override).toBe(true);
        expect(applyPrecoM2Change(rows, 'r1', null, 150)[0].preco_m2_is_override).toBe(false);
    });
});

describe('applyComboChange', () => {
    it('grava o override e remove (delete) quando val é null, sem mutar o original', () => {
        const original = makeRow({ combo_overrides: {} });
        const gravado = applyComboChange([original], 'r1', 0, 88, ['COMBO A']);
        expect(gravado[0].combo_overrides).toEqual({ 'COMBO A': 88 });
        expect(original.combo_overrides).toEqual({}); // imutável

        const limpo = applyComboChange(gravado, 'r1', 0, null, ['COMBO A']);
        expect(limpo[0].combo_overrides).toEqual({});
    });
});

describe('applyAtualizarPrecos', () => {
    it('recalcula todos os rows com o novo preço/m² e reseta stale/override', () => {
        const rows = [makeRow({ area_m2: 10 }), makeRow({ id: 'r2', area_m2: null })];
        const res = applyAtualizarPrecos(rows, 200, [50], ['COMBO A']);
        expect(res[0].preco_m2).toBe(200);
        expect(res[0].total_override).toBe(2000); // 10 * 200
        expect(res[0].combo_overrides).toEqual({ 'COMBO A': 2050 }); // 2000 + 50
        expect(res[0].preco_m2_is_override).toBe(false);
        expect(res[0].total_stale).toBe(false);
        expect(res[1].total_override).toBe(0); // área nula → base 0
    });
});
