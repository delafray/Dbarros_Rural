import { describe, it, expect } from 'vitest';
import { roundCentavos, somaMonetaria, addMonetario } from './money';

describe('roundCentavos', () => {
    it('arredonda para 2 casas', () => {
        expect(roundCentavos(10.555)).toBe(10.56);
        expect(roundCentavos(10.554)).toBe(10.55);
        expect(roundCentavos(0.1 + 0.2)).toBe(0.3);
    });
});

describe('somaMonetaria', () => {
    it('soma sem drift de float', () => {
        // 10× R$0,10 em float puro = 0.9999999999999999
        expect(somaMonetaria(Array(10).fill(0.1))).toBe(1);
        expect(somaMonetaria([0.1, 0.2])).toBe(0.3);
    });

    it('aceita valores negativos (descontos)', () => {
        expect(somaMonetaria([20000, -500])).toBe(19500);
        expect(somaMonetaria([0.3, -0.1])).toBe(0.2);
    });

    it('lista vazia → 0', () => {
        expect(somaMonetaria([])).toBe(0);
    });

    it('soma realista de planilha (100 estandes de R$ 1.234,56)', () => {
        expect(somaMonetaria(Array(100).fill(1234.56))).toBe(123456);
    });
});

describe('addMonetario', () => {
    it('acumulação incremental sem drift', () => {
        let acc = 0;
        for (let i = 0; i < 100; i++) acc = addMonetario(acc, 0.1);
        expect(acc).toBe(10);
    });
});
