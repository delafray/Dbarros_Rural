import { describe, it, expect } from 'vitest';
import {
    getCategoriaOfStandNr,
    getPrecoForCombo,
    calculateRowTotals,
    CategoriaCalc,
    EstandeCalc,
} from './planilhaCalc';

const catFixa: CategoriaCalc = {
    tag: 'NAMING',
    prefix: 'Naming',
    standBase: 20000,
    combos: [25000, 30000, 35000],
};

const catAreaLivre: CategoriaCalc = {
    tag: 'AREA LIVRE',
    prefix: 'AL',
    tipo_precificacao: 'area_livre',
    preco_m2: 150,
    combos_adicionais: [1000, 2000],
};

const rowBase: EstandeCalc = {
    stand_nr: 'Naming 01',
    tipo_venda: 'STAND PADRÃO',
    opcionais_selecionados: {},
    desconto: 0,
    valor_pago: 0,
};

describe('getCategoriaOfStandNr', () => {
    const cats: CategoriaCalc[] = [
        { tag: 'AL', prefix: 'AL' },
        { tag: 'AL PREMIUM', prefix: 'AL PREMIUM' },
        { tag: 'NAMING', prefix: 'Naming' },
    ];

    it('encontra pela correspondência de prefixo + espaço', () => {
        expect(getCategoriaOfStandNr('Naming 05', cats)?.tag).toBe('NAMING');
        expect(getCategoriaOfStandNr('AL 03', cats)?.tag).toBe('AL');
    });

    it('prefixo mais longo tem prioridade (AL PREMIUM antes de AL)', () => {
        expect(getCategoriaOfStandNr('AL PREMIUM 02', cats)?.tag).toBe('AL PREMIUM');
    });

    it('case-insensitive', () => {
        expect(getCategoriaOfStandNr('naming 01', cats)?.tag).toBe('NAMING');
    });

    it('retorna undefined para stand sem categoria', () => {
        expect(getCategoriaOfStandNr('XYZ 01', cats)).toBeUndefined();
    });

    it('não casa prefixo colado sem espaço (Naming01 ≠ Naming 01)', () => {
        expect(getCategoriaOfStandNr('Naming01', cats)).toBeUndefined();
    });
});

describe('getPrecoForCombo — categoria fixa', () => {
    it('STAND PADRÃO usa standBase', () => {
        expect(getPrecoForCombo(catFixa, rowBase, 'STAND PADRÃO')).toBe(20000);
    });

    it('COMBO N usa combos[N-1]', () => {
        expect(getPrecoForCombo(catFixa, rowBase, 'COMBO 01')).toBe(25000);
        expect(getPrecoForCombo(catFixa, rowBase, 'COMBO 03')).toBe(35000);
    });

    it('COMBO inexistente → 0', () => {
        expect(getPrecoForCombo(catFixa, rowBase, 'COMBO 09')).toBe(0);
    });

    it('cortesia/permuta (tipo com *) → 0', () => {
        expect(getPrecoForCombo(catFixa, rowBase, 'STAND PADRÃO*')).toBe(0);
        expect(getPrecoForCombo(catFixa, rowBase, '*COMBO 01')).toBe(0);
    });

    it('sem categoria → 0', () => {
        expect(getPrecoForCombo(undefined, rowBase, 'STAND PADRÃO')).toBe(0);
    });

    it('tipo de venda desconhecido → 0', () => {
        expect(getPrecoForCombo(catFixa, rowBase, 'DISPONÍVEL')).toBe(0);
    });
});

describe('getPrecoForCombo — área livre', () => {
    const alRow = (extra: Partial<EstandeCalc>): EstandeCalc => ({
        ...rowBase,
        stand_nr: 'AL 01',
        ...extra,
    });

    it('STAND PADRÃO = área × preço/m² da categoria', () => {
        expect(getPrecoForCombo(catAreaLivre, alRow({ area_m2: 100 }), 'STAND PADRÃO')).toBe(15000);
    });

    it('preco_m2_override da linha vence o da categoria', () => {
        expect(getPrecoForCombo(catAreaLivre, alRow({ area_m2: 100, preco_m2_override: 200 }), 'STAND PADRÃO')).toBe(20000);
    });

    it('total_override vence o cálculo por área', () => {
        expect(getPrecoForCombo(catAreaLivre, alRow({ area_m2: 100, total_override: 9999 }), 'STAND PADRÃO')).toBe(9999);
    });

    it('sem área nem override → 0', () => {
        expect(getPrecoForCombo(catAreaLivre, alRow({}), 'STAND PADRÃO')).toBe(0);
    });

    it('COMBO N = base + adicional do combo', () => {
        // base 100m² × 150 = 15000; adicional combo 1 = 1000
        expect(getPrecoForCombo(catAreaLivre, alRow({ area_m2: 100 }), 'COMBO 01')).toBe(16000);
        expect(getPrecoForCombo(catAreaLivre, alRow({ area_m2: 100 }), 'COMBO 02')).toBe(17000);
    });

    it('combo_override da linha vence tudo', () => {
        const row = alRow({ area_m2: 100, combo_overrides: { 'COMBO 01': 12345 } });
        expect(getPrecoForCombo(catAreaLivre, row, 'COMBO 01')).toBe(12345);
    });
});

describe('calculateRowTotals', () => {
    const opcionais = [
        { id: 'op1', nome: 'ENERGIA', preco_base: 500 },
        { id: 'op2', nome: 'TABLADO', preco_base: 300.1 },
        { id: 'op3', nome: 'TESTEIRA', preco_base: 200.2 },
    ];

    it('linha simples sem opcionais', () => {
        const t = calculateRowTotals(rowBase, catFixa, opcionais, {});
        expect(t).toEqual({
            precoBase: 20000, totalOpcionais: 0, subTotal: 20000,
            desconto: 0, totalVenda: 20000, valorPago: 0, pendente: 20000,
        });
    });

    it('soma apenas opcionais marcados com "x"', () => {
        const row = { ...rowBase, opcionais_selecionados: { ENERGIA: 'x', TABLADO: '', TESTEIRA: 'x' } };
        const t = calculateRowTotals(row, catFixa, opcionais, {});
        expect(t.totalOpcionais).toBe(700.2);
        expect(t.subTotal).toBe(20700.2);
    });

    it('preço da edição sobrepõe o preço-base do opcional', () => {
        const row = { ...rowBase, opcionais_selecionados: { ENERGIA: 'x' } };
        const t = calculateRowTotals(row, catFixa, opcionais, { op1: 800 });
        expect(t.totalOpcionais).toBe(800);
    });

    it('desconto e valor pago fecham a conta (pendente)', () => {
        const row = { ...rowBase, opcionais_selecionados: { ENERGIA: 'x' }, desconto: 500, valor_pago: 10000 };
        const t = calculateRowTotals(row, catFixa, opcionais, {});
        expect(t.subTotal).toBe(20500);
        expect(t.totalVenda).toBe(20000);
        expect(t.pendente).toBe(10000);
    });

    it('sem drift de float: 0.1 + 0.2 de opcionais = exatamente 0.30', () => {
        const ops = [
            { id: 'a', nome: 'A', preco_base: 0.1 },
            { id: 'b', nome: 'B', preco_base: 0.2 },
        ];
        const row = { ...rowBase, opcionais_selecionados: { A: 'x', B: 'x' } };
        const t = calculateRowTotals(row, { tag: 'X', standBase: 0 }, ops, {});
        expect(t.totalOpcionais).toBe(0.3); // 0.1+0.2 em float puro daria 0.30000000000000004
    });

    it('cortesia (*) zera o preço-base mas mantém opcionais', () => {
        const row = { ...rowBase, tipo_venda: 'STAND PADRÃO*', opcionais_selecionados: { ENERGIA: 'x' } };
        const t = calculateRowTotals(row, catFixa, opcionais, {});
        expect(t.precoBase).toBe(0);
        expect(t.totalVenda).toBe(500);
    });
});
