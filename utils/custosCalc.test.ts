import { describe, it, expect } from 'vitest';
import {
    calcularTotalItem,
    ratearPorQuantidade,
    calcularCustoComposto,
    custosGeraisACobrir,
    calcularProjecao,
    semaforoOrcamento,
    breakEvenUnidades,
    type ItemCusto,
} from './custosCalc';

describe('calcularTotalItem', () => {
    it('multiplica quantidade × unitário com centavos exatos', () => {
        expect(calcularTotalItem(3, 333.33)).toBe(999.99); // clássico do float
        expect(calcularTotalItem(25, 32.5)).toBe(812.5);
    });
    it('aceita entrada suja sem propagar lixo (RNF-002)', () => {
        expect(calcularTotalItem(null, 10)).toBe(0);
        expect(calcularTotalItem('abc', 10)).toBe(0);
        expect(calcularTotalItem(undefined, undefined)).toBe(0);
        expect(calcularTotalItem(NaN, 5)).toBe(0);
        expect(calcularTotalItem(-2, 10)).toBe(0); // quantidade negativa não existe
        expect(calcularTotalItem(2, -10)).toBe(0);
    });
    it('aceita strings numéricas (grade estilo planilha)', () => {
        expect(calcularTotalItem('4', '2.5')).toBe(10);
    });
});

describe('ratearPorQuantidade — o exemplo canônico do usuário', () => {
    it('bar com 100 m de 1.000 m recebe exatamente 10% do custo (RF-033)', () => {
        const r = ratearPorQuantidade(50_000, [
            { compostoId: 'bar', quantidade: 100 },
            { compostoId: 'stands', quantidade: 900 },
        ]);
        expect(r.get('bar')).toBe(5_000);
        expect(r.get('stands')).toBe(45_000);
    });

    it('INVARIANTE: soma das parcelas === valor total, mesmo com dízima', () => {
        // 100 ÷ 3: cada parte "vale" 33,333... — conservação exige 100,00 exato
        const r = ratearPorQuantidade(100, [
            { compostoId: 'a', quantidade: 1 },
            { compostoId: 'b', quantidade: 1 },
            { compostoId: 'c', quantidade: 1 },
        ]);
        const soma = [...r.values()].reduce((s, v) => s + Math.round(v * 100), 0);
        expect(soma).toBe(10_000); // centavos exatos
    });

    it('resíduo de arredondamento vai para a maior parcela', () => {
        const r = ratearPorQuantidade(0.1, [
            { compostoId: 'grande', quantidade: 2 },
            { compostoId: 'pequeno', quantidade: 1 },
        ]);
        // 10 centavos: floor(10*2/3)=6, floor(10*1/3)=3, resíduo 1 → grande
        expect(r.get('grande')).toBe(0.07);
        expect(r.get('pequeno')).toBe(0.03);
    });

    it('propriedade: conservação vale para casos aleatórios', () => {
        for (let i = 0; i < 200; i++) {
            const total = Math.round(Math.random() * 1_000_000) / 100;
            const n = 1 + Math.floor(Math.random() * 8);
            const parcelas = Array.from({ length: n }, (_, k) => ({
                compostoId: `c${k}`,
                quantidade: Math.random() * 500 + 0.01,
            }));
            const r = ratearPorQuantidade(total, parcelas);
            const somaCent = [...r.values()].reduce((s, v) => s + Math.round(v * 100), 0);
            expect(somaCent).toBe(Math.round(total * 100));
        }
    });

    it('compostos repetidos acumulam na mesma chave', () => {
        const r = ratearPorQuantidade(300, [
            { compostoId: 'bar', quantidade: 1 },
            { compostoId: 'bar', quantidade: 1 },
            { compostoId: 'stand', quantidade: 1 },
        ]);
        expect(r.get('bar')).toBe(200);
        expect(r.get('stand')).toBe(100);
    });

    it('casos de borda retornam mapa vazio (sem NaN)', () => {
        expect(ratearPorQuantidade(0, [{ compostoId: 'a', quantidade: 1 }]).size).toBe(0);
        expect(ratearPorQuantidade(-10, [{ compostoId: 'a', quantidade: 1 }]).size).toBe(0);
        expect(ratearPorQuantidade(NaN, [{ compostoId: 'a', quantidade: 1 }]).size).toBe(0);
        expect(ratearPorQuantidade(100, []).size).toBe(0);
        expect(ratearPorQuantidade(100, [{ compostoId: 'a', quantidade: 0 }]).size).toBe(0);
        expect(ratearPorQuantidade(100, [{ compostoId: 'a', quantidade: NaN }]).size).toBe(0);
    });
});

describe('calcularCustoComposto — estande do usuário (RF-034/Q-021)', () => {
    const itens: ItemCusto[] = [
        // diretos do estande
        { quantidade: 1, valorUnitario: 1200, alocacao: 'direto', compostoId: 'estande' },   // tenda 5x5
        { quantidade: 1, valorUnitario: 150, alocacao: 'direto', compostoId: 'estande' },    // mesa
        { quantidade: 4, valorUnitario: 25, alocacao: 'direto', compostoId: 'estande' },     // cadeiras
        // direto de OUTRO composto — não entra
        { quantidade: 1, valorUnitario: 9999, alocacao: 'direto', compostoId: 'bar' },
        // verba fechada — NUNCA entra no composto
        { quantidade: 1, valorUnitario: 8000, alocacao: 'verba_fechada', compostoId: null },
    ];

    it('custo = diretos do composto + parcela rateada, e SÓ isso', () => {
        const parcelas = new Map([['estande', 812.5]]); // piso 25m² rateado
        const c = calcularCustoComposto('estande', itens, parcelas);
        expect(c.direto).toBe(1450);
        expect(c.rateado).toBe(812.5);
        expect(c.total).toBe(2262.5);
    });

    it('composto sem parcelas rateadas tem rateado 0', () => {
        const c = calcularCustoComposto('estande', itens, new Map());
        expect(c.rateado).toBe(0);
        expect(c.total).toBe(c.direto);
    });
});

describe('custosGeraisACobrir (Q-021 — a faixa de aviso)', () => {
    it('soma apenas verba fechada', () => {
        const itens: ItemCusto[] = [
            { quantidade: 1, valorUnitario: 8000, alocacao: 'verba_fechada', compostoId: null },  // frete
            { quantidade: 1, valorUnitario: 3000, alocacao: 'verba_fechada', compostoId: null },  // ART
            { quantidade: 1, valorUnitario: 500, alocacao: 'direto', compostoId: 'bar' },
            { quantidade: 10, valorUnitario: 30, alocacao: 'indireto_rateavel', compostoId: null },
        ];
        expect(custosGeraisACobrir(itens)).toBe(11_000);
    });
    it('vazio → 0', () => {
        expect(custosGeraisACobrir([])).toBe(0);
    });
});

describe('calcularProjecao (RF-039 — EAC do rel. 10)', () => {
    it('EAC = contratado + orçado das linhas não contratadas', () => {
        const p = calcularProjecao([
            { orcado: 10_000, contratado: 9_000, realizado: 4_500, estaContratado: true },
            { orcado: 5_000, contratado: 0, realizado: 0, estaContratado: false },
        ]);
        expect(p.orcado).toBe(15_000);
        expect(p.contratado).toBe(9_000);
        expect(p.realizado).toBe(4_500);
        expect(p.projecaoFinal).toBe(14_000); // 9.000 fechado + 5.000 estimado
        expect(p.desvio).toBe(-1_000);        // vai fechar ABAIXO do orçado
        expect(p.desvioPercent).toBe(-6.67);
    });

    it('estouro aparece como desvio positivo', () => {
        const p = calcularProjecao([
            { orcado: 1_000, contratado: 1_300, realizado: 0, estaContratado: true },
        ]);
        expect(p.projecaoFinal).toBe(1_300);
        expect(p.desvio).toBe(300);
        expect(p.desvioPercent).toBe(30);
    });

    it('lista vazia e valores sujos não explodem', () => {
        const vazio = calcularProjecao([]);
        expect(vazio.projecaoFinal).toBe(0);
        expect(vazio.desvioPercent).toBe(0);
        const sujo = calcularProjecao([
            { orcado: NaN as unknown as number, contratado: -5, realizado: NaN as unknown as number, estaContratado: false },
        ]);
        expect(sujo.orcado).toBe(0);
        expect(sujo.projecaoFinal).toBe(0);
    });
});

describe('semaforoOrcamento (rel. 13: 80%/100%)', () => {
    it('faixas verde/amarelo/vermelho', () => {
        expect(semaforoOrcamento(700, 1000)).toBe('verde');
        expect(semaforoOrcamento(800, 1000)).toBe('amarelo');
        expect(semaforoOrcamento(999.99, 1000)).toBe('amarelo');
        expect(semaforoOrcamento(1000, 1000)).toBe('vermelho');
        expect(semaforoOrcamento(1500, 1000)).toBe('vermelho');
    });
    it('orçado zero: qualquer gasto é vermelho; sem gasto é verde', () => {
        expect(semaforoOrcamento(0, 0)).toBe('verde');
        expect(semaforoOrcamento(1, 0)).toBe('vermelho');
    });
});

describe('breakEvenUnidades (RF-040 — "33 estandes, você tem 20")', () => {
    it('exemplo da deliberação: 170 mil ÷ margem 5.250 ≈ 33 estandes', () => {
        expect(breakEvenUnidades(170_000, 5_250)).toBe(33);
    });
    it('sem custos gerais → 0; margem nula/negativa → Infinity', () => {
        expect(breakEvenUnidades(0, 5_000)).toBe(0);
        expect(breakEvenUnidades(-1, 5_000)).toBe(0);
        expect(breakEvenUnidades(10_000, 0)).toBe(Infinity);
        expect(breakEvenUnidades(10_000, -50)).toBe(Infinity);
    });
});
