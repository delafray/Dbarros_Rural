/**
 * Testes da GESTÃO DE PRODUTOS (RF-059): trava de exclusão em uso, histórico
 * de renomeação (nome original preservado), desativar/reativar, unidades.
 * Mock no padrão do custosService.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

type Result = { data: unknown; error: unknown; count?: number | null };
const state: { results: Result[]; calls: { table?: string; rpc?: string }[] } = {
    results: [],
    calls: [],
};

function makeBuilder(): any {
    const b: any = {};
    const chain = [
        'select', 'insert', 'update', 'delete', 'upsert',
        'eq', 'order', 'single', 'maybeSingle',
    ];
    for (const m of chain) b[m] = vi.fn(() => b);
    b.then = (resolve: (r: Result) => void) =>
        resolve(state.results.shift() ?? { data: null, error: null });
    return b;
}

const builders: any[] = [];
vi.mock('./supabaseClient', () => ({
    supabase: {
        from: vi.fn((table: string) => {
            state.calls.push({ table });
            const b = makeBuilder();
            builders.push(b);
            return b;
        }),
        rpc: vi.fn(() => Promise.resolve(state.results.shift() ?? { data: null, error: null })),
    },
}));

import { custosService } from './custosService';

beforeEach(() => {
    state.results = [];
    state.calls = [];
    builders.length = 0;
    vi.clearAllMocks();
});

describe('getUnidades / getProdutosGestao / getNomeHistorico', () => {
    it('getUnidades lê unidades ativas', async () => {
        state.results.push({ data: [{ id: 'u1', sigla: 'm2' }], error: null });
        const r = await custosService.getUnidades();
        expect(state.calls[0].table).toBe('custos_unidades');
        expect(r[0].sigla).toBe('m2');
    });
    it('getProdutosGestao inclui inativos (sem filtro de ativo)', async () => {
        state.results.push({ data: [{ id: 'p1', ativo: false }], error: null });
        const r = await custosService.getProdutosGestao();
        expect(builders[0].eq).not.toHaveBeenCalled();
        expect(r).toHaveLength(1);
    });
    it('getNomeHistorico devolve [] quando vazio', async () => {
        state.results.push({ data: null, error: null });
        expect(await custosService.getNomeHistorico()).toEqual([]);
    });
    it('propagam erro', async () => {
        state.results.push({ data: null, error: new Error('e-uni') });
        await expect(custosService.getUnidades()).rejects.toThrow('e-uni');
        state.results.push({ data: null, error: new Error('e-hist') });
        await expect(custosService.getNomeHistorico()).rejects.toThrow('e-hist');
    });
});

describe('contarUsoProduto (a trava do RF-059)', () => {
    it('conta itens de evento e de template', async () => {
        state.results.push({ data: null, error: null, count: 7 });
        state.results.push({ data: null, error: null, count: 2 });
        const r = await custosService.contarUsoProduto('p1');
        expect(r).toEqual({ emEventos: 7, emTemplates: 2 });
        expect(state.calls.map(c => c.table)).toEqual(['custos_itens', 'custos_espaco_template_itens']);
    });
    it('count null vira 0', async () => {
        state.results.push({ data: null, error: null, count: null });
        state.results.push({ data: null, error: null, count: null });
        expect(await custosService.contarUsoProduto('p1')).toEqual({ emEventos: 0, emTemplates: 0 });
    });
});

describe('createProduto', () => {
    it('cria com origem manual e defaults', async () => {
        state.results.push({ data: { id: 'novo' }, error: null });
        const r = await custosService.createProduto({ nome: '  Piso vinílico  ' });
        expect(builders[0].insert).toHaveBeenCalledWith(expect.objectContaining({
            nome: 'Piso vinílico', unidade: 'un', origem: 'manual',
        }));
        expect(r.id).toBe('novo');
    });
    it('nome vazio é erro', async () => {
        await expect(custosService.createProduto({ nome: '   ' })).rejects.toThrow(/nome/);
    });
});

describe('renomearProduto (preserva o nome original — RF-059)', () => {
    it('grava o histórico ANTES de renomear', async () => {
        state.results.push({ data: { id: 'p1', nome: 'Tenda velha' }, error: null });   // select atual
        state.results.push({ data: null, error: null });                                // insert histórico
        state.results.push({ data: { id: 'p1', nome: 'Tenda nova' }, error: null });    // update
        const r = await custosService.renomearProduto('p1', ' Tenda nova ');
        expect(state.calls.map(c => c.table)).toEqual([
            'custos_produtos', 'custos_produto_nome_historico', 'custos_produtos',
        ]);
        expect(builders[1].insert).toHaveBeenCalledWith({
            produto_id: 'p1', nome_anterior: 'Tenda velha', nome_novo: 'Tenda nova',
        });
        expect(r.nome).toBe('Tenda nova');
    });
    it('mesmo nome: não grava histórico nem atualiza', async () => {
        state.results.push({ data: { id: 'p1', nome: 'Igual' }, error: null });
        const r = await custosService.renomearProduto('p1', 'Igual');
        expect(r.nome).toBe('Igual');
        expect(state.calls).toHaveLength(1);
    });
    it('nome vazio é erro', async () => {
        await expect(custosService.renomearProduto('p1', '  ')).rejects.toThrow(/vazio/);
    });
    it('falha no histórico aborta o rename (nome original nunca se perde)', async () => {
        state.results.push({ data: { id: 'p1', nome: 'X' }, error: null });
        state.results.push({ data: null, error: new Error('rls-hist') });
        await expect(custosService.renomearProduto('p1', 'Y')).rejects.toThrow('rls-hist');
        expect(state.calls).toHaveLength(2);  // update nunca aconteceu
    });
});

describe('deleteProduto (em uso em evento NÃO exclui)', () => {
    it('em uso em evento → erro EM_USO, sem delete', async () => {
        state.results.push({ data: null, error: null, count: 3 });
        state.results.push({ data: null, error: null, count: 0 });
        await expect(custosService.deleteProduto('p1')).rejects.toThrow(/EM_USO.*3 item/);
        expect(state.calls.filter(c => c.table === 'custos_produtos')).toHaveLength(0);
    });
    it('em uso só em template também bloqueia (avisa onde)', async () => {
        state.results.push({ data: null, error: null, count: 0 });
        state.results.push({ data: null, error: null, count: 2 });
        await expect(custosService.deleteProduto('p1')).rejects.toThrow(/descritivo\(s\) de espaço/);
    });
    it('sem uso → exclui de verdade', async () => {
        state.results.push({ data: null, error: null, count: 0 });
        state.results.push({ data: null, error: null, count: 0 });
        state.results.push({ data: null, error: null });
        await custosService.deleteProduto('p1');
        const del = state.calls[state.calls.length - 1];
        expect(del.table).toBe('custos_produtos');
        expect(builders[2].delete).toHaveBeenCalled();
    });
});

describe('setProdutoAtivo (a alternativa segura)', () => {
    it('desativa e devolve o registro', async () => {
        state.results.push({ data: { id: 'p1', ativo: false }, error: null });
        const r = await custosService.setProdutoAtivo('p1', false);
        expect(builders[0].update).toHaveBeenCalledWith({ ativo: false });
        expect(r.ativo).toBe(false);
    });
    it('propaga erro', async () => {
        state.results.push({ data: null, error: new Error('e-ativo') });
        await expect(custosService.setProdutoAtivo('p1', true)).rejects.toThrow('e-ativo');
    });
});
