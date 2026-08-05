/**
 * Testes das funções de ESPAÇOS do recomeço (R1/R2 — RF-056/057/058):
 * grupos, catálogo leve, espaço exclusivo, renomear/arquivar/promover e a
 * cópia do grupo_id na instanciação. Mock no padrão do custosService.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

type Result = { data: unknown; error: unknown };
const state: { results: Result[]; calls: { table?: string; rpc?: string; args?: unknown }[] } = {
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
        rpc: vi.fn((fn: string, args: unknown) => {
            state.calls.push({ rpc: fn, args });
            return Promise.resolve(state.results.shift() ?? { data: null, error: null });
        }),
    },
}));

import { custosService } from './custosService';

beforeEach(() => {
    state.results = [];
    state.calls = [];
    builders.length = 0;
    vi.clearAllMocks();
});

describe('getGrupos / getProdutosCatalogo (RF-057/058)', () => {
    it('getGrupos lê os grupos ativos da tabela certa', async () => {
        state.results.push({ data: [{ id: 'g1', nome: 'Tenda / Telhado' }], error: null });
        const r = await custosService.getGrupos();
        expect(state.calls[0].table).toBe('custos_produto_grupos');
        expect(r).toHaveLength(1);
    });
    it('getGrupos: data null vira []', async () => {
        state.results.push({ data: null, error: null });
        expect(await custosService.getGrupos()).toEqual([]);
    });
    it('getGrupos propaga erro', async () => {
        state.results.push({ data: null, error: new Error('boom-grupos') });
        await expect(custosService.getGrupos()).rejects.toThrow('boom-grupos');
    });
    it('getProdutosCatalogo lê o catálogo leve', async () => {
        state.results.push({ data: [{ id: 'p1', nome: 'Tenda', grupo_id: 'g1', frequencia_uso: 85 }], error: null });
        const r = await custosService.getProdutosCatalogo();
        expect(state.calls[0].table).toBe('custos_produtos');
        expect(r[0].frequencia_uso).toBe(85);
    });
    it('getProdutosCatalogo: data null vira []', async () => {
        state.results.push({ data: null, error: null });
        expect(await custosService.getProdutosCatalogo()).toEqual([]);
    });
    it('getProdutosCatalogo propaga erro', async () => {
        state.results.push({ data: null, error: new Error('boom-cat') });
        await expect(custosService.getProdutosCatalogo()).rejects.toThrow('boom-cat');
    });
});

describe('createComposto (RF-056 — espaço exclusivo do evento)', () => {
    it('insere composto SEM template (template_id null explícito)', async () => {
        state.results.push({ data: { id: 'c1', template_id: null, nome: 'Stand da Rádio' }, error: null });
        const r = await custosService.createComposto({ edicaoId: 'e1', nome: 'Stand da Rádio' });
        expect(state.calls[0].table).toBe('custos_compostos');
        expect(builders[0].insert).toHaveBeenCalledWith(expect.objectContaining({
            edicao_id: 'e1', template_id: null, nome: 'Stand da Rádio', quantidade: 1, porte: null,
        }));
        expect(r.id).toBe('c1');
    });
    it('propaga erro do banco', async () => {
        state.results.push({ data: null, error: new Error('rls-comp') });
        await expect(custosService.createComposto({ edicaoId: 'e1', nome: 'X' })).rejects.toThrow('rls-comp');
    });
});

describe('updateComposto / deleteComposto / updateTemplate', () => {
    it('updateComposto grava o patch e devolve o registro', async () => {
        state.results.push({ data: { id: 'c1', nome: 'Novo nome' }, error: null });
        const r = await custosService.updateComposto('c1', { nome: 'Novo nome' });
        expect(builders[0].update).toHaveBeenCalledWith({ nome: 'Novo nome' });
        expect(r.nome).toBe('Novo nome');
    });
    it('updateComposto propaga erro', async () => {
        state.results.push({ data: null, error: new Error('upd-comp') });
        await expect(custosService.updateComposto('c1', { nome: 'X' })).rejects.toThrow('upd-comp');
    });
    it('deleteComposto exclui pela id', async () => {
        state.results.push({ data: null, error: null });
        await custosService.deleteComposto('c1');
        expect(state.calls[0].table).toBe('custos_compostos');
        expect(builders[0].delete).toHaveBeenCalled();
    });
    it('deleteComposto propaga erro', async () => {
        state.results.push({ data: null, error: new Error('del-comp') });
        await expect(custosService.deleteComposto('c1')).rejects.toThrow('del-comp');
    });
    it('updateTemplate arquiva com ativo=false (reversível)', async () => {
        state.results.push({ data: { id: 't1', ativo: false }, error: null });
        const r = await custosService.updateTemplate('t1', { ativo: false });
        expect(builders[0].update).toHaveBeenCalledWith({ ativo: false });
        expect(r.ativo).toBe(false);
    });
    it('updateTemplate propaga erro', async () => {
        state.results.push({ data: null, error: new Error('upd-tpl') });
        await expect(custosService.updateTemplate('t1', { nome: 'X' })).rejects.toThrow('upd-tpl');
    });
});

describe('promoverCompostoATemplate (exclusivo → padrão, RF-056)', () => {
    it('cria o template, copia o descritivo (com grupo) e vincula o composto', async () => {
        state.results.push({ data: { id: 'c1', nome: 'Choperia', porte: '100 m2' }, error: null });   // select composto
        state.results.push({ data: { id: 'tpl-novo', nome: 'Choperia' }, error: null });              // insert template
        state.results.push({                                                                          // select itens
            data: [{ id: 'i1', grupo_id: 'g2', categoria_id: 'cat1', produto_id: 'p1', descricao: 'Piso deck', formato: null, quantidade: 100 }],
            error: null,
        });
        state.results.push({ data: null, error: null });                                              // insert template itens
        state.results.push({ data: null, error: null });                                              // update composto
        const tpl = await custosService.promoverCompostoATemplate('c1');
        expect(tpl.id).toBe('tpl-novo');
        expect(builders[1].insert).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Choperia', porte: '100 m2' }));
        expect(builders[3].insert).toHaveBeenCalledWith([expect.objectContaining({
            template_id: 'tpl-novo', grupo_id: 'g2', produto_id: 'p1', descricao: 'Piso deck', quantidade: 100, ordem: 10,
        })]);
        expect(builders[4].update).toHaveBeenCalledWith({ template_id: 'tpl-novo' });
    });
    it('espaço sem itens: promove sem inserir descritivo', async () => {
        state.results.push({ data: { id: 'c2', nome: 'Vazio', porte: null }, error: null });
        state.results.push({ data: { id: 'tpl2' }, error: null });
        state.results.push({ data: [], error: null });
        state.results.push({ data: null, error: null });                                              // update composto
        const tpl = await custosService.promoverCompostoATemplate('c2');
        expect(tpl.id).toBe('tpl2');
        expect(state.calls.filter(c => c.table === 'custos_espaco_template_itens')).toHaveLength(0);
    });
    it('propaga erro da criação do template', async () => {
        state.results.push({ data: { id: 'c3', nome: 'X', porte: null }, error: null });
        state.results.push({ data: null, error: new Error('sem-permissao') });
        await expect(custosService.promoverCompostoATemplate('c3')).rejects.toThrow('sem-permissao');
    });
});

describe('instanciarTemplate copia o grupo_id do descritivo (Bloco 19)', () => {
    it('itens instanciados levam grupo_id do template', async () => {
        state.results.push({ data: { id: 'comp9' }, error: null });
        state.results.push({
            data: [{ id: 't1', template_id: 'tpl', grupo_id: 'g7', categoria_id: null, produto_id: 'p9', descricao: 'Box Truss', formato: null, quantidade: 26, ordem: 10 }],
            error: null,
        });
        state.results.push({ data: null, error: null });
        await custosService.instanciarTemplate({ edicaoId: 'e1', templateId: 'tpl', nome: 'Pórtico' });
        expect(builders[2].insert).toHaveBeenCalledWith([expect.objectContaining({
            composto_id: 'comp9', grupo_id: 'g7', produto_id: 'p9',
        })]);
    });
});
