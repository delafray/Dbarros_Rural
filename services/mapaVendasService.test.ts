/**
 * Testes do mapaVendasService com banco mockado (molde do custosService.test.ts).
 * Inclui os testes de segurança: erro de RLS do banco é propagado, nunca engolido.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Result = { data: unknown; error: unknown };
const state: { results: Result[]; calls: { table?: string; method?: string; args?: unknown }[] } = { results: [], calls: [] };

function makeBuilder(table: string): any {
    const b: any = {};
    for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single', 'maybeSingle']) {
        b[m] = vi.fn((...args: unknown[]) => { state.calls.push({ table, method: m, args }); return b; });
    }
    b.then = (resolve: (r: Result) => void) => resolve(state.results.shift() ?? { data: null, error: null });
    return b;
}

const storage = { createSignedUrl: vi.fn() };
vi.mock('./supabaseClient', () => ({
    supabase: {
        from: vi.fn((table: string) => makeBuilder(table)),
        storage: { from: vi.fn(() => storage) },
    },
}));

import { mapaVendasService, chaveCacheFundo, FUNDO_ASSINATURA_S } from './mapaVendasService';

beforeEach(() => { state.results = []; state.calls = []; vi.clearAllMocks(); });

const estandes = [{ codigo: 'P-01', stand_nr: 'P 01', familia: 'P', pontos: [[0, 0], [1, 0], [1, 1]], centro: [0.5, 0.5] as [number, number] }];

describe('getMapaAtivo', () => {
    it('lê só o mapa ativo da edição, com colunas explícitas', async () => {
        state.results.push({ data: { id: 'm1', edicao_id: 'ed1', versao: 'ALT 01', view_box: '0 0 10 10', fundo_path: null, estandes }, error: null });
        const r = await mapaVendasService.getMapaAtivo('ed1');
        expect(state.calls[0]).toMatchObject({ table: 'planilha_mapa', method: 'select' });
        expect(String(state.calls[0].args![0])).not.toContain('*');
        expect(state.calls.some((c) => c.method === 'eq' && (c.args as unknown[])[0] === 'ativo' && (c.args as unknown[])[1] === true)).toBe(true);
        expect(r?.estandes).toHaveLength(1);
    });
    it('sem mapa publicado devolve null', async () => {
        state.results.push({ data: null, error: null });
        expect(await mapaVendasService.getMapaAtivo('ed1')).toBeNull();
    });
    it('estandes que não são array viram lista vazia', async () => {
        state.results.push({ data: { id: 'm1', estandes: 'lixo' }, error: null });
        expect((await mapaVendasService.getMapaAtivo('ed1'))?.estandes).toEqual([]);
    });
    it('propaga erro de RLS (papel sem acesso não recebe dado silencioso)', async () => {
        state.results.push({ data: null, error: new Error('permission denied for table planilha_mapa') });
        await expect(mapaVendasService.getMapaAtivo('ed1')).rejects.toThrow('permission denied');
    });
});

describe('getFundoUrl', () => {
    // localStorage falso (vitest roda em node)
    const store = new Map<string, string>();
    beforeEach(() => {
        store.clear();
        (globalThis as any).localStorage = {
            getItem: (k: string) => store.get(k) ?? null,
            setItem: (k: string, v: string) => { store.set(k, v); },
        };
    });
    it('sem path devolve null sem tocar o storage', async () => {
        expect(await mapaVendasService.getFundoUrl(null)).toBeNull();
        expect(storage.createSignedUrl).not.toHaveBeenCalled();
    });
    it('gera URL assinada do bucket edicao-docs', async () => {
        storage.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://x/fundo' }, error: null });
        expect(await mapaVendasService.getFundoUrl('ed1/mapa-fundo.png')).toBe('https://x/fundo');
        expect(storage.createSignedUrl).toHaveBeenCalledWith('ed1/mapa-fundo.png', FUNDO_ASSINATURA_S);
    });
    it('reaproveita a URL assinada guardada (navegador não baixa o fundo de novo)', async () => {
        storage.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://x/fundo?token=1' }, error: null });
        expect(await mapaVendasService.getFundoUrl('ed1/mapa-fundo.png', '2026-09-18')).toBe('https://x/fundo?token=1');
        storage.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://x/fundo?token=2' }, error: null });
        expect(await mapaVendasService.getFundoUrl('ed1/mapa-fundo.png', '2026-09-18')).toBe('https://x/fundo?token=1');
        expect(storage.createSignedUrl).toHaveBeenCalledTimes(1);
    });
    it('mapa republicado (gerado_em novo) ganha URL nova', async () => {
        storage.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://x/fundo?token=1' }, error: null });
        await mapaVendasService.getFundoUrl('ed1/mapa-fundo.png', 'v1');
        storage.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://x/fundo?token=2' }, error: null });
        expect(await mapaVendasService.getFundoUrl('ed1/mapa-fundo.png', 'v2')).toBe('https://x/fundo?token=2');
        expect(storage.createSignedUrl).toHaveBeenCalledTimes(2);
    });
    it('cache vencido ou corrompido é ignorado e a URL é reassinada', async () => {
        store.set(chaveCacheFundo('ed1/mapa-fundo.png', 'v1'), JSON.stringify({ url: 'https://x/velha', exp: Date.now() - 1 }));
        store.set(chaveCacheFundo('ed1/mapa-fundo.png', 'v2'), '{lixo');
        storage.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://x/nova' }, error: null });
        expect(await mapaVendasService.getFundoUrl('ed1/mapa-fundo.png', 'v1')).toBe('https://x/nova');
        expect(await mapaVendasService.getFundoUrl('ed1/mapa-fundo.png', 'v2')).toBe('https://x/nova');
        expect(storage.createSignedUrl).toHaveBeenCalledTimes(2);
    });
    it('sem localStorage (bloqueado) funciona igual, só sem cache', async () => {
        (globalThis as any).localStorage = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
        storage.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://x/fundo' }, error: null });
        expect(await mapaVendasService.getFundoUrl('ed1/mapa-fundo.png')).toBe('https://x/fundo');
    });
    it('fundo ausente não derruba o mapa (devolve null)', async () => {
        storage.createSignedUrl.mockResolvedValue({ data: null, error: new Error('not found') });
        expect(await mapaVendasService.getFundoUrl('ed1/x.png')).toBeNull();
    });
});

describe('publicarMapa', () => {
    it('desativa o anterior e insere o novo com fundo padrão', async () => {
        state.results.push({ data: null, error: null });
        state.results.push({ data: { id: 'm2', edicao_id: 'ed1', versao: 'ALT 02', view_box: '0 0 1 1', fundo_path: 'ed1/mapa-fundo.png', estandes }, error: null });
        const r = await mapaVendasService.publicarMapa({ edicaoId: 'ed1', versao: 'ALT 02', viewBox: '0 0 1 1', estandes });
        const upd = state.calls.find((c) => c.method === 'update');
        expect(upd?.args).toEqual([{ ativo: false }]);
        const ins = state.calls.find((c) => c.method === 'insert');
        expect((ins?.args as any)[0]).toMatchObject({ edicao_id: 'ed1', ativo: true, fundo_path: 'ed1/mapa-fundo.png' });
        expect(r.id).toBe('m2');
    });
    it('recusa mapa vazio antes de tocar o banco', async () => {
        await expect(mapaVendasService.publicarMapa({ edicaoId: 'ed1', versao: 'x', viewBox: '0 0 1 1', estandes: [] })).rejects.toThrow('sem estandes');
        expect(state.calls).toHaveLength(0);
    });
    it('usuário sem permissão de escrita: erro de RLS é propagado', async () => {
        state.results.push({ data: null, error: new Error('new row violates row-level security policy') });
        await expect(mapaVendasService.publicarMapa({ edicaoId: 'ed1', versao: 'x', viewBox: '0 0 1 1', estandes })).rejects.toThrow('row-level security');
    });
});
