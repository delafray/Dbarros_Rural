import { describe, it, expect } from 'vitest';
import { formatBRL, formatBRLNumber } from './formatCurrency';

// O Intl usa NBSP ( ) entre "R$" e o número — normalizamos para comparar
const norm = (s: string) => s.replace(/ /g, ' ');

describe('formatBRL', () => {
    it('formata valores com símbolo e separadores pt-BR', () => {
        expect(norm(formatBRL(1234.56))).toBe('R$ 1.234,56');
        expect(norm(formatBRL(0.5))).toBe('R$ 0,50');
        expect(norm(formatBRL(1000000))).toBe('R$ 1.000.000,00');
    });
    it('trata null/undefined/zero como R$ 0,00', () => {
        expect(norm(formatBRL(0))).toBe('R$ 0,00');
        expect(norm(formatBRL(null))).toBe('R$ 0,00');
        expect(norm(formatBRL(undefined))).toBe('R$ 0,00');
    });
    it('formata negativos', () => {
        expect(norm(formatBRL(-99.9))).toBe('-R$ 99,90');
    });
});

describe('formatBRLNumber', () => {
    it('formata sem símbolo, sempre com 2 casas', () => {
        expect(formatBRLNumber(1234.5)).toBe('1.234,50');
        expect(formatBRLNumber(20000)).toBe('20.000,00');
    });
    it('arredonda para 2 casas', () => {
        expect(formatBRLNumber(10.555)).toBe('10,56');
        expect(formatBRLNumber(10.554)).toBe('10,55');
    });
    it('trata null/undefined como 0,00', () => {
        expect(formatBRLNumber(null)).toBe('0,00');
        expect(formatBRLNumber(undefined)).toBe('0,00');
    });
});
