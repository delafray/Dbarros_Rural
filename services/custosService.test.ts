import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do client ANTES do import do service (padrão do repo — authService.test).
// Builder encadeável: cada método devolve o próprio mock; o await resolve
// com o resultado configurado em __result.
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

import { supabase } from './supabaseClient';
import { custosService, normalizarFornecedor, normalizarItem } from './custosService';

beforeEach(() => {
    state.results = [];
    state.calls = [];
    builders.length = 0;
    vi.clearAllMocks();
});

// ────────────────────────────────────────────────────────────────────────────
// Helpers puros
// ────────────────────────────────────────────────────────────────────────────

describe('normalizarFornecedor (RF-028: CNPJ é a chave — não pode ser lixo)', () => {
    it('limpa máscara e mantém 14 dígitos', () => {
        const f = normalizarFornecedor({ cnpj: '00.394.460/0058-87', razao_social: 'X' });
        expect(f.cnpj).toBe('00394460005887');
    });
    it('CNPJ vazio vira null (MEI/pessoa sem CNPJ é permitido)', () => {
        expect(normalizarFornecedor({ cnpj: '' }).cnpj).toBeNull();
        expect(normalizarFornecedor({ cnpj: null }).cnpj).toBeNull();
        expect(normalizarFornecedor({ cnpj: undefined }).cnpj).toBeNull();
    });
    it('CNPJ presente e inválido é ERRO, não silêncio', () => {
        expect(() => normalizarFornecedor({ cnpj: '11111111111111' })).toThrow(/inválido/);
        expect(() => normalizarFornecedor({ cnpj: '123' })).toThrow(/inválido/);
    });
});

describe('normalizarItem (RNF-002: aceita sujo, grava limpo)', () => {
    it('descrição é a única obrigação', () => {
        expect(() => normalizarItem({ edicao_id: 'e1', descricao: '' })).toThrow(/descrição/);
        expect(() => normalizarItem({ edicao_id: 'e1', descricao: '   ' })).toThrow(/descrição/);
    });
    it('números sujos caem para defaults seguros', () => {
        const i = normalizarItem({
            edicao_id: 'e1',
            descricao: '  Piso  ',
            quantidade: NaN,
            fator: -2,
            preco_unitario_orcado: Number('abc'),
        });
        expect(i.descricao).toBe('Piso');
        expect(i.quantidade).toBe(1);
        expect(i.fator).toBe(1);
        expect(i.preco_unitario_orcado).toBeNull();
    });
    it('valores válidos passam intactos (7 seguranças × 16 diárias)', () => {
        const i = normalizarItem({
            edicao_id: 'e1', descricao: 'Segurança',
            quantidade: 7, fator: 16, preco_unitario_orcado: 200,
        });
        expect(i.quantidade).toBe(7);
        expect(i.fator).toBe(16);
        expect(i.preco_unitario_orcado).toBe(200);
    });
    it('preço zero é válido (item a cotar)', () => {
        const i = normalizarItem({ edicao_id: 'e1', descricao: 'ART', preco_unitario_orcado: 0 });
        expect(i.preco_unitario_orcado).toBe(0);
    });
});

// ────────────────────────────────────────────────────────────────────────────
// Service (client mockado)
// ────────────────────────────────────────────────────────────────────────────

describe('custosService.buscarProdutos (RF-049)', () => {
    it('chama a RPC com o termo aparado', async () => {
        state.results.push({ data: [{ id: 'p1', nome: 'Cadeira' }], error: null });
        const r = await custosService.buscarProdutos('  cadera  ');
        expect(supabase.rpc).toHaveBeenCalledWith('custos_buscar_produtos', {
            p_termo: 'cadera', p_limite: 20,
        });
        expect(r).toHaveLength(1);
    });
    it('termo curto não vai ao banco (autocomplete só a partir de 2 letras)', async () => {
        const r = await custosService.buscarProdutos('c');
        expect(supabase.rpc).not.toHaveBeenCalled();
        expect(r).toEqual([]);
    });
    it('erro do banco é propagado, nunca engolido', async () => {
        state.results.push({ data: null, error: new Error('boom') });
        await expect(custosService.buscarProdutos('tenda')).rejects.toThrow('boom');
    });
});

describe('custosService.saveFornecedor (upsert por CNPJ, RF-028)', () => {
    it('CNPJ novo → insert', async () => {
        state.results.push({ data: null, error: null });                      // busca por cnpj: nada
        state.results.push({ data: { id: 'f1', cnpj: '00394460005887' }, error: null }); // insert
        const r = await custosService.saveFornecedor({ cnpj: '00.394.460/0058-87', razao_social: 'Nova' });
        expect(r.id).toBe('f1');
        expect(state.calls.filter(c => c.table === 'custos_fornecedores')).toHaveLength(2);
    });
    it('CNPJ existente → update do registro achado (dedup)', async () => {
        state.results.push({ data: { id: 'f-velho' }, error: null });         // busca por cnpj: achou
        state.results.push({ data: { id: 'f-velho', razao_social: 'Atualizada' }, error: null }); // update
        const r = await custosService.saveFornecedor({ cnpj: '00394460005887', razao_social: 'Atualizada' });
        expect(r.id).toBe('f-velho');
        const b = builders[1];
        expect(b.update).toHaveBeenCalled();
        expect(b.eq).toHaveBeenCalledWith('id', 'f-velho');
    });
    it('CNPJ inválido nem chega ao banco', async () => {
        await expect(custosService.saveFornecedor({ cnpj: '11111111111111', razao_social: 'X' }))
            .rejects.toThrow(/inválido/);
        expect(supabase.from).not.toHaveBeenCalled();
    });
});

describe('custosService.criarEventoComEdicao (RPC atômica, Bloco 3)', () => {
    it('repassa parâmetros e desembrulha o retorno em array', async () => {
        state.results.push({ data: [{ evento_id: 'ev1', edicao_id: 'ed1' }], error: null });
        const r = await custosService.criarEventoComEdicao({
            nomeEvento: 'Rodeio X', tituloEdicao: 'Rodeio X 2026', ano: 2026, status: 'simulacao',
        });
        expect(supabase.rpc).toHaveBeenCalledWith('custos_criar_evento_com_edicao', {
            p_nome_evento: 'Rodeio X',
            p_titulo_edicao: 'Rodeio X 2026',
            p_ano: 2026,
            p_status: 'simulacao',
            p_evento_id: null,
        });
        expect(r).toEqual({ evento_id: 'ev1', edicao_id: 'ed1' });
    });
});

describe('custosService.instanciarTemplate (RF-050: template → composto + itens)', () => {
    it('cria o composto e copia os itens do descritivo-padrão', async () => {
        state.results.push({ data: { id: 'comp1' }, error: null });   // insert composto
        state.results.push({                                          // itens do template
            data: [
                { descricao: 'Tenda', formato: '5x5', quantidade: 1, categoria_id: 'cat-t', produto_id: null },
                { descricao: 'Piso', formato: 'm2', quantidade: 25, categoria_id: 'cat-p', produto_id: null },
            ],
            error: null,
        });
        state.results.push({ data: null, error: null });              // insert itens
        const comp = await custosService.instanciarTemplate({
            edicaoId: 'ed1', templateId: 'tpl1', nome: 'Estandes Expositores', quantidade: 19,
        });
        expect(comp.id).toBe('comp1');
        // 3º builder = insert em custos_itens com os 2 itens vinculados ao composto
        const insertItens = builders[2];
        expect(insertItens.insert).toHaveBeenCalledWith([
            expect.objectContaining({ composto_id: 'comp1', descricao: 'Tenda', edicao_id: 'ed1' }),
            expect.objectContaining({ composto_id: 'comp1', descricao: 'Piso', quantidade: 25 }),
        ]);
    });
    it('template sem itens cria só o composto (sem insert vazio)', async () => {
        state.results.push({ data: { id: 'comp2' }, error: null });
        state.results.push({ data: [], error: null });
        await custosService.instanciarTemplate({ edicaoId: 'ed1', templateId: 'tpl2', nome: 'Bar' });
        expect(builders).toHaveLength(2); // nenhum 3º from() para itens
    });
});

describe('custosService.createItem / updateItem (a grade, digitou-salvou)', () => {
    it('createItem normaliza antes de gravar', async () => {
        state.results.push({ data: { id: 'i1' }, error: null });
        await custosService.createItem({ edicao_id: 'ed1', descricao: ' Gelo ', quantidade: NaN });
        expect(builders[0].insert).toHaveBeenCalledWith(
            expect.objectContaining({ descricao: 'Gelo', quantidade: 1 }),
        );
    });
    it('updateItem faz PATCH pontual por id', async () => {
        state.results.push({ data: { id: 'i1', quantidade: 30 }, error: null });
        await custosService.updateItem('i1', { quantidade: 30 });
        expect(builders[0].update).toHaveBeenCalledWith({ quantidade: 30 });
        expect(builders[0].eq).toHaveBeenCalledWith('id', 'i1');
    });
});

describe('custosService.saveChecklistResposta (upsert edição+chave)', () => {
    it('usa onConflict correto para não duplicar resposta', async () => {
        state.results.push({ data: { id: 'r1' }, error: null });
        await custosService.saveChecklistResposta({
            edicao_id: 'ed1', chave: 'limpeza', marcado: true, quantidade: 30,
        });
        expect(builders[0].upsert).toHaveBeenCalledWith(
            expect.objectContaining({ chave: 'limpeza', quantidade: 30 }),
            { onConflict: 'edicao_id,chave' },
        );
    });
});

describe('getters da grade e do catálogo (filtros e ordenação certos)', () => {
    it('getCategorias: só ativas, por ordem', async () => {
        state.results.push({ data: [{ id: 'c1' }], error: null });
        const r = await custosService.getCategorias();
        expect(builders[0].eq).toHaveBeenCalledWith('ativo', true);
        expect(builders[0].order).toHaveBeenCalledWith('ordem');
        expect(r).toHaveLength(1);
    });
    it('getFornecedores: ativos por razão social', async () => {
        state.results.push({ data: [], error: null });
        const r = await custosService.getFornecedores();
        expect(builders[0].order).toHaveBeenCalledWith('razao_social');
        expect(r).toEqual([]);
    });
    it('getItens/getCompostos: filtram pela edição', async () => {
        state.results.push({ data: [], error: null });
        state.results.push({ data: [], error: null });
        await custosService.getItens('ed9');
        await custosService.getCompostos('ed9');
        expect(builders[0].eq).toHaveBeenCalledWith('edicao_id', 'ed9');
        expect(builders[1].eq).toHaveBeenCalledWith('edicao_id', 'ed9');
    });
    it('getEspacosTemplate: traz itens embutidos', async () => {
        state.results.push({ data: [{ id: 't1', itens: [] }], error: null });
        const r = await custosService.getEspacosTemplate();
        expect(builders[0].select).toHaveBeenCalledWith('*, itens:custos_espaco_template_itens(*)');
        expect(r[0].itens).toEqual([]);
    });
    it('getChecklist e getPerfil: por edição; perfil ausente vira null', async () => {
        state.results.push({ data: [], error: null });
        state.results.push({ data: null, error: null });
        await custosService.getChecklist('ed1');
        const p = await custosService.getPerfil('ed1');
        expect(p).toBeNull();
        expect(builders[1].maybeSingle).toHaveBeenCalled();
    });
    it('erros dos getters são propagados', async () => {
        state.results.push({ data: null, error: new Error('rls') });
        await expect(custosService.getItens('ed1')).rejects.toThrow('rls');
        state.results.push({ data: null, error: new Error('rls2') });
        await expect(custosService.getCategorias()).rejects.toThrow('rls2');
    });
});

describe('savePerfil, deleteItem, registrarUsoProduto, saveFornecedor com id', () => {
    it('savePerfil: upsert por edicao_id com timestamp', async () => {
        state.results.push({ data: { edicao_id: 'ed1' }, error: null });
        await custosService.savePerfil({ edicao_id: 'ed1', publico_esperado: 5000 });
        expect(builders[0].upsert).toHaveBeenCalledWith(
            expect.objectContaining({ edicao_id: 'ed1', publico_esperado: 5000, atualizado_em: expect.any(String) }),
            { onConflict: 'edicao_id' },
        );
    });
    it('deleteItem: delete por id, erro propagado', async () => {
        state.results.push({ data: null, error: null });
        await custosService.deleteItem('i7');
        expect(builders[0].delete).toHaveBeenCalled();
        expect(builders[0].eq).toHaveBeenCalledWith('id', 'i7');
        state.results.push({ data: null, error: new Error('pago') });
        await expect(custosService.deleteItem('i8')).rejects.toThrow('pago');
    });
    it('registrarUsoProduto: lê a frequência e grava +1', async () => {
        state.results.push({ data: { frequencia_uso: 41 }, error: null });
        state.results.push({ data: null, error: null });
        await custosService.registrarUsoProduto('p1');
        expect(builders[1].update).toHaveBeenCalledWith({ frequencia_uso: 42 });
    });
    it('saveFornecedor com id existente vai direto ao update', async () => {
        state.results.push({ data: { id: 'f1' }, error: null });
        await custosService.saveFornecedor({ id: 'f1', razao_social: 'Editada', cnpj: null });
        expect(builders[0].update).toHaveBeenCalled();
        expect(builders[0].eq).toHaveBeenCalledWith('id', 'f1');
        expect(builders).toHaveLength(1); // sem busca de dedup
    });
});
