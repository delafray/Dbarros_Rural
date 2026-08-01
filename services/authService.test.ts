import { describe, it, expect, vi } from 'vitest';

// O supabaseClient dá throw se faltarem as env vars (VITE_SUPABASE_*), o que
// aconteceria ao importar o authService no ambiente de teste. Como as funções
// testadas aqui são puras e não tocam o Supabase, mockamos o módulo inteiro.
vi.mock('./supabaseClient', () => ({ supabase: {} }));

import { sanitizeFilterValue, generateTempBase, gerarSenhaTemp } from './authService';

describe('sanitizeFilterValue (barreira anti-injeção no filtro .or do login)', () => {
    it('remove os curingas % e * que casariam com qualquer usuário via ilike', () => {
        expect(sanitizeFilterValue('%')).toBe('');
        expect(sanitizeFilterValue('admin%')).toBe('admin');
        expect(sanitizeFilterValue('*')).toBe('');
        expect(sanitizeFilterValue('a*b%c')).toBe('abc');
    });

    it('remove os metacaracteres que quebrariam o parser do PostgREST', () => {
        // vírgula separa condições; parênteses agrupam; aspas e backslash escapam
        expect(sanitizeFilterValue("a,b(c)d'e\"f\\g")).toBe('abcdefg');
    });

    it('remove quebras de linha e tabs', () => {
        expect(sanitizeFilterValue('a\nb\rc\td')).toBe('abcd');
    });

    it('tentativa de injeção não sobrevive à sanitização', () => {
        // payload clássico: fechar o ilike e injetar outra condição
        const malicioso = 'x%,is_admin.eq.true';
        expect(sanitizeFilterValue(malicioso)).toBe('xis_admin.eq.true');
        // sem vírgula nem % o valor vira um único termo literal, não uma nova condição
        expect(sanitizeFilterValue(malicioso)).not.toContain(',');
        expect(sanitizeFilterValue(malicioso)).not.toContain('%');
    });

    it('preserva caracteres válidos de email e nome', () => {
        expect(sanitizeFilterValue('joao.silva@empresa.com')).toBe('joao.silva@empresa.com');
        expect(sanitizeFilterValue('Maria Souza-Lima')).toBe('Maria Souza-Lima');
        expect(sanitizeFilterValue('user_123')).toBe('user_123');
    });
});

describe('generateTempBase (prefixo de login de visitante temporário)', () => {
    it('usa a primeira palavra + o ano presente no título', () => {
        expect(generateTempBase('Barra Mansa 2026')).toBe('barra2026');
    });

    it('trunca a primeira palavra em 8 caracteres', () => {
        expect(generateTempBase('Expozebu 2027')).toBe('expozebu2027');
        expect(generateTempBase('Superlongapalavra 2025')).toBe('superlon2025');
    });

    it('remove acentos', () => {
        expect(generateTempBase('São Paulo 2026')).toBe('sao2026');
    });

    it('usa o ano atual quando o título não tem ano', () => {
        const anoAtual = String(new Date().getFullYear());
        expect(generateTempBase('Expo Rural')).toBe(`expo${anoAtual}`);
    });

    it('cai em "visitante" (truncado em 8 chars) quando o título não tem letras', () => {
        const anoAtual = String(new Date().getFullYear());
        // o fallback 'visitante' também passa pelo slice(0,8) → 'visitant'
        expect(generateTempBase('12345')).toBe(`visitant${anoAtual}`);
    });
});

describe('gerarSenhaTemp (senha de visitante via CSPRNG)', () => {
    it('tem o comprimento pedido', () => {
        expect(gerarSenhaTemp(12)).toHaveLength(12);
        expect(gerarSenhaTemp(20)).toHaveLength(20);
        expect(gerarSenhaTemp()).toHaveLength(12); // default
    });

    it('usa apenas o alfabeto sem caracteres ambíguos (0/O, 1/l/I)', () => {
        const senha = gerarSenhaTemp(200);
        expect(senha).toMatch(/^[abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/);
    });

    it('não repete a mesma senha em chamadas consecutivas', () => {
        const senhas = new Set(Array.from({ length: 50 }, () => gerarSenhaTemp(12)));
        // com 12 chars de ~54 símbolos, colisão em 50 amostras é praticamente impossível
        expect(senhas.size).toBe(50);
    });
});
