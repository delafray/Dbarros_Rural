import { describe, it, expect } from 'vitest';
import {
    parseNumeroBR,
    formatBRL,
    parseDataBR,
    limparCNPJ,
    validarCNPJ,
    formatCNPJ,
} from './parseBR';

describe('parseNumeroBR', () => {
    it('formato BR pleno com R$', () => {
        expect(parseNumeroBR('R$ 1.234,56')).toBe(1234.56);
        expect(parseNumeroBR('R$1.234,56')).toBe(1234.56);
        expect(parseNumeroBR('r$ 500,00')).toBe(500);
        expect(parseNumeroBR('1.234.567,89')).toBe(1234567.89);
    });
    it('só vírgula é decimal', () => {
        expect(parseNumeroBR('12,5')).toBe(12.5);
        expect(parseNumeroBR('0,07')).toBe(0.07);
    });
    it('a ambiguidade do ponto (rel. 09): "1.234" é milhar BR, "12.5" é decimal', () => {
        expect(parseNumeroBR('1.234')).toBe(1234);
        expect(parseNumeroBR('12.5')).toBe(12.5);
        expect(parseNumeroBR('1.2345')).toBe(1.2345);
        expect(parseNumeroBR('1.234.567')).toBe(1234567);
    });
    it('negativos: sinal e notação contábil', () => {
        expect(parseNumeroBR('-12,5')).toBe(-12.5);
        expect(parseNumeroBR('(1.234,56)')).toBe(-1234.56);
        expect(parseNumeroBR('+10')).toBe(10);
    });
    it('números já numéricos passam direto', () => {
        expect(parseNumeroBR(42.5)).toBe(42.5);
        expect(parseNumeroBR(NaN)).toBeNull();
        expect(parseNumeroBR(Infinity)).toBeNull();
    });
    it('NBSP do Excel e espaços', () => {
        expect(parseNumeroBR('R$ 1.000,00')).toBe(1000); // contém NBSP
        expect(parseNumeroBR('  250  ')).toBe(250);
    });
    it('lixo vira null, nunca NaN nem exceção (RNF-002)', () => {
        expect(parseNumeroBR('')).toBeNull();
        expect(parseNumeroBR('abc')).toBeNull();
        expect(parseNumeroBR('12a')).toBeNull();
        expect(parseNumeroBR(null)).toBeNull();
        expect(parseNumeroBR(undefined)).toBeNull();
        expect(parseNumeroBR('1,2,3')).toBeNull();
        expect(parseNumeroBR('1,234.56')).toBeNull(); // formato US: ambíguo, rejeita
        expect(parseNumeroBR('1.23.4')).toBeNull();
        expect(parseNumeroBR({})).toBeNull();
    });
});

describe('formatBRL', () => {
    it('formata moeda pt-BR', () => {
        // toLocaleString usa NBSP entre "R$" e o número
        expect(formatBRL(1234.56).replace(/ /g, ' ')).toBe('R$ 1.234,56');
        expect(formatBRL(0).replace(/ /g, ' ')).toBe('R$ 0,00');
    });
    it('entrada inválida vira R$ 0,00', () => {
        expect(formatBRL(NaN)).toBe('R$ 0,00');
        expect(formatBRL(Infinity)).toBe('R$ 0,00');
    });
});

describe('parseDataBR', () => {
    it('dd/mm/aaaa → ISO', () => {
        expect(parseDataBR('05/08/2026')).toBe('2026-08-05');
        expect(parseDataBR('1/2/2026')).toBe('2026-02-01');
    });
    it('ano de 2 dígitos: 00–69 → 20xx, 70–99 → 19xx', () => {
        expect(parseDataBR('10/03/26')).toBe('2026-03-10');
        expect(parseDataBR('10/03/99')).toBe('1999-03-10');
    });
    it('sem ano assume o padrão informado', () => {
        expect(parseDataBR('15/09', 2026)).toBe('2026-09-15');
    });
    it('valida calendário de verdade', () => {
        expect(parseDataBR('31/02/2026')).toBeNull();
        expect(parseDataBR('29/02/2024')).toBe('2024-02-29'); // bissexto
        expect(parseDataBR('29/02/2026')).toBeNull();          // não bissexto
        expect(parseDataBR('00/01/2026')).toBeNull();
        expect(parseDataBR('15/13/2026')).toBeNull();
    });
    it('lixo vira null', () => {
        expect(parseDataBR('')).toBeNull();
        expect(parseDataBR('2026-08-05')).toBeNull(); // ISO não é BR
        expect(parseDataBR('amanhã')).toBeNull();
        expect(parseDataBR(null)).toBeNull();
        expect(parseDataBR(12345)).toBeNull();
    });
});

describe('CNPJ (RF-028)', () => {
    it('valida CNPJ real com e sem máscara', () => {
        // CNPJ da própria Receita Federal (público): 00.394.460/0058-87
        expect(validarCNPJ('00.394.460/0058-87')).toBe(true);
        expect(validarCNPJ('00394460005887')).toBe(true);
    });
    it('rejeita dígito verificador errado', () => {
        expect(validarCNPJ('00.394.460/0058-88')).toBe(false);
        expect(validarCNPJ('00394460005897')).toBe(false);
    });
    it('rejeita sequências repetidas e tamanhos errados', () => {
        expect(validarCNPJ('00.000.000/0000-00')).toBe(false);
        expect(validarCNPJ('11111111111111')).toBe(false);
        expect(validarCNPJ('123')).toBe(false);
        expect(validarCNPJ('')).toBe(false);
        expect(validarCNPJ(null)).toBe(false);
    });
    it('limparCNPJ extrai só dígitos', () => {
        expect(limparCNPJ('12.345.678/0001-95')).toBe('12345678000195');
        expect(limparCNPJ('abc')).toBe('');
        expect(limparCNPJ(null)).toBe('');
        expect(limparCNPJ(12345678000195)).toBe('12345678000195');
    });
    it('formatCNPJ aplica máscara; inválido volta como veio', () => {
        expect(formatCNPJ('00394460005887')).toBe('00.394.460/0058-87');
        expect(formatCNPJ('123')).toBe('123');
        expect(formatCNPJ(null)).toBe('');
    });
});
