import { describe, it, expect } from 'vitest';
import { parseDataFlexivel, buildDayTimestamp, formatDateBR, formatDateTimeBR } from './dateUtils';

describe('parseDataFlexivel', () => {
    it('DD/MM/YYYY é interpretado como data local', () => {
        expect(parseDataFlexivel('15/11/2026')).toBe(new Date(2026, 10, 15).getTime());
    });

    it('YYYY-MM-DD é interpretado como meia-noite LOCAL (não UTC)', () => {
        // new Date("2026-11-15") daria UTC midnight (3h antes em UTC-3) — o bug que corrigimos
        expect(parseDataFlexivel('2026-11-15')).toBe(new Date(2026, 10, 15).getTime());
    });

    it('ISO e DD/MM da MESMA data ordenam como iguais (bug de ordenação corrigido)', () => {
        expect(parseDataFlexivel('2026-11-15')).toBe(parseDataFlexivel('15/11/2026'));
    });

    it('ISO completo com hora é aceito', () => {
        expect(parseDataFlexivel('2026-11-15T12:30:00Z')).toBe(Date.parse('2026-11-15T12:30:00Z'));
    });

    it('null/undefined/inválido → Infinity (fim da ordenação)', () => {
        expect(parseDataFlexivel(null)).toBe(Infinity);
        expect(parseDataFlexivel(undefined)).toBe(Infinity);
        expect(parseDataFlexivel('não é data')).toBe(Infinity);
        expect(parseDataFlexivel('99/99/lixo')).toBe(Infinity);
    });

    it('ordena corretamente uma lista mista', () => {
        const datas = ['16/11/2026', '2026-11-14', null, '2026-11-15'];
        const sorted = [...datas].sort((a, b) => parseDataFlexivel(a) - parseDataFlexivel(b));
        expect(sorted).toEqual(['2026-11-14', '2026-11-15', '16/11/2026', null]);
    });
});

describe('buildDayTimestamp', () => {
    it('produz timestamp ISO válido (sem o espaço bugado antes do T)', () => {
        const ts = buildDayTimestamp('2026-11-15', '10:00');
        expect(ts).toBe('2026-11-15T10:00:00Z');
        expect(isNaN(new Date(ts!).getTime())).toBe(false);
    });

    it('o formato antigo com espaço era inválido (regressão do bug N1)', () => {
        expect(isNaN(new Date('2026-11-15 T10:00:00Z').getTime())).toBe(true);
    });

    it('data vazia → null', () => {
        expect(buildDayTimestamp('', '10:00')).toBeNull();
    });

    it('round-trip com o split("T") usado na exibição', () => {
        const ts = buildDayTimestamp('2026-11-15', '18:00')!;
        expect(ts.split('T')[0]).toBe('2026-11-15');
    });
});

describe('formatDateBR', () => {
    it('date-only formata por partes sem deslocar o dia', () => {
        expect(formatDateBR('2026-11-15')).toBe('15/11/2026');
        expect(formatDateBR('2026-01-01')).toBe('01/01/2026'); // viraria 31/12 no bug UTC
    });

    it('null/inválido → travessão', () => {
        expect(formatDateBR(null)).toBe('—');
        expect(formatDateBR('lixo')).toBe('—');
    });
});

describe('formatDateTimeBR', () => {
    it('formata timestamp completo como DD/MM/AA HH:MM', () => {
        const out = formatDateTimeBR('2026-11-15T14:30:00');
        expect(out).toMatch(/^15\/11\/26,? 14:30$/);
    });

    it('null/inválido → travessão', () => {
        expect(formatDateTimeBR(null)).toBe('—');
        expect(formatDateTimeBR('lixo')).toBe('—');
    });
});
