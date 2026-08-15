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
import {
    custosService,
    normalizarFornecedor,
    normalizarItem,
    montarMapaCotacao,
    type PedidoComItens,
} from './custosService';

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
    it('getEdicoesSelecao: junta nome do evento-pai, ano desc; pai nulo cai no título', async () => {
        state.results.push({
            data: [
                { id: 'e1', titulo: 'ExpoLeite Perdizes 2024', ano: 2024, data_inicio: null, evento: { nome: 'Agroleite Perdizes' } },
                { id: 'e2', titulo: 'Avulso 2023', ano: 2023, data_inicio: null, evento: null },
            ],
            error: null,
        });
        const r = await custosService.getEdicoesSelecao();
        expect(builders[0].order).toHaveBeenCalledWith('ano', { ascending: false });
        expect(r[0].eventoNome).toBe('Agroleite Perdizes');
        expect(r[1].eventoNome).toBe('Avulso 2023');
        state.results.push({ data: null, error: new Error('rls-ed') });
        await expect(custosService.getEdicoesSelecao()).rejects.toThrow('rls-ed');
        state.results.push({ data: null, error: null });
        expect(await custosService.getEdicoesSelecao()).toEqual([]);
    });

    it('getSecoes: ativas por ordem; createSecao com defaults; erros propagados', async () => {
        state.results.push({ data: [{ id: 's1', slug: 'julgamento' }], error: null });
        const secoes = await custosService.getSecoes();
        expect(builders[0].order).toHaveBeenCalledWith('ordem');
        expect(secoes).toHaveLength(1);
        state.results.push({ data: { id: 's2' }, error: null });
        await custosService.createSecao({ nome: 'Julgamento Nelore', nome_curto: 'Nelore', slug: 'julgamento-nelore', parent_id: 's1' });
        expect(builders[1].insert).toHaveBeenCalledWith(
            expect.objectContaining({ slug: 'julgamento-nelore', parent_id: 's1', ordem: 999 }),
        );
        state.results.push({ data: null, error: null });
        expect(await custosService.getSecoes()).toEqual([]);
        state.results.push({ data: null, error: new Error('rls-sec') });
        await expect(custosService.createSecao({ nome: 'X', nome_curto: 'X', slug: 'x' })).rejects.toThrow('rls-sec');
    });

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

describe('pedidos e cotações (RF-002/011/029)', () => {
    it('createPedido: pedido + N:N com quantidades; vazio é erro', async () => {
        state.results.push({ data: { id: 'ped1' }, error: null });
        state.results.push({ data: null, error: null });
        const p = await custosService.createPedido({
            edicaoId: 'ed1', nome: 'Tendas', categoriaId: 'cat-t',
            itens: [{ itemId: 'i1', quantidade: 29 }, { itemId: 'i2', quantidade: 1000 }],
        });
        expect(p.id).toBe('ped1');
        expect(builders[1].insert).toHaveBeenCalledWith([
            { pedido_id: 'ped1', item_id: 'i1', quantidade: 29 },
            { pedido_id: 'ped1', item_id: 'i2', quantidade: 1000 },
        ]);
        await expect(custosService.createPedido({ edicaoId: 'ed1', nome: 'X', itens: [] }))
            .rejects.toThrow(/1 item/);
    });

    it('registrarCotacaoImportada: upsert por (pedido,fornecedor), linhas substituídas, exclusão SIM/NÃO interpretada', async () => {
        state.results.push({ data: { id: 'cot1' }, error: null });  // upsert cotacao
        state.results.push({ data: null, error: null });            // delete linhas antigas
        state.results.push({ data: null, error: null });            // insert linhas
        state.results.push({ data: null, error: null });            // upsert exclusao 1
        state.results.push({ data: null, error: null });            // upsert exclusao 2
        await custosService.registrarCotacaoImportada({
            edicaoId: 'ed1', pedidoId: 'ped1', fornecedorId: 'f1',
            linhas: [{ itemId: 'i1', precoUnitario: 2761, quantidade: 29 }],
            exclusoes: [
                { chave: 'frete', resposta: 'NÃO — R$ 1.200' },
                { chave: 'art', resposta: 'sim, inclusa' },
            ],
        });
        expect(builders[0].upsert).toHaveBeenCalledWith(
            expect.objectContaining({ pedido_id: 'ped1', fornecedor_id: 'f1', status: 'recebida' }),
            { onConflict: 'pedido_id,fornecedor_id' },
        );
        expect(builders[1].delete).toHaveBeenCalled();
        expect(builders[3].upsert).toHaveBeenCalledWith(
            expect.objectContaining({ chave: 'frete', incluso: false }),
            expect.anything(),
        );
        expect(builders[4].upsert).toHaveBeenCalledWith(
            expect.objectContaining({ chave: 'art', incluso: true }),
            expect.anything(),
        );
    });

    it('marcarVencedor: item vira contratado (split award por linha)', async () => {
        state.results.push({ data: { id: 'l1', preco_unitario: 2761 }, error: null });
        state.results.push({ data: null, error: null });
        await custosService.marcarVencedor('cot1', 'i1');
        expect(builders[1].update).toHaveBeenCalledWith({ status: 'contratado' });
        expect(builders[1].eq).toHaveBeenCalledWith('id', 'i1');
    });

    it('getPedidos filtra pela edição com joins de cotações', async () => {
        state.results.push({ data: [], error: null });
        await custosService.getPedidos('ed1');
        expect(builders[0].eq).toHaveBeenCalledWith('edicao_id', 'ed1');
    });
});

describe('templates (editor do descritivo-padrão) e pagamentos (Q-009)', () => {
    it('addTemplateItem aplica defaults; update/delete por id; erros propagados', async () => {
        state.results.push({ data: { id: 't1' }, error: null });
        await custosService.addTemplateItem({ template_id: 'tpl1', descricao: 'Tenda', quantidade: 1 });
        expect(builders[0].insert).toHaveBeenCalledWith(
            expect.objectContaining({ template_id: 'tpl1', formato: null, ordem: 0 }),
        );
        state.results.push({ data: { id: 't1', quantidade: 25 }, error: null });
        await custosService.updateTemplateItem('t1', { quantidade: 25 });
        expect(builders[1].eq).toHaveBeenCalledWith('id', 't1');
        state.results.push({ data: null, error: null });
        await custosService.deleteTemplateItem('t1');
        expect(builders[2].delete).toHaveBeenCalled();
        state.results.push({ data: null, error: new Error('rls-tpl') });
        await expect(custosService.addTemplateItem({ template_id: 'x', descricao: 'y', quantidade: 1 }))
            .rejects.toThrow('rls-tpl');
    });

    it('createTemplate cria espaço novo com defaults null', async () => {
        state.results.push({ data: { id: 'tplN' }, error: null });
        await custosService.createTemplate({ nome: 'Camarote' });
        expect(builders[0].insert).toHaveBeenCalledWith(
            { nome: 'Camarote', descricao: null, porte: null },
        );
    });

    it('criarParcelas: 3 parcelas de 1000,01 — resto de centavo na 1ª, vencimentos mensais', async () => {
        state.results.push({ data: null, error: null });
        await custosService.criarParcelas({
            edicaoId: 'ed1', valorTotal: 1000.01, parcelas: 3, primeiroVencimento: '2026-09-10',
        });
        const linhas = (builders[0].insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(linhas).toHaveLength(3);
        expect(linhas[0]).toMatchObject({ parcela_num: 1, valor: 333.35, data_vencimento: '2026-09-10' });
        expect(linhas[1]).toMatchObject({ parcela_num: 2, valor: 333.33, data_vencimento: '2026-10-10' });
        expect(linhas[2]).toMatchObject({ parcela_num: 3, valor: 333.33, data_vencimento: '2026-11-10' });
        const soma = linhas.reduce((s: number, l: { valor: number }) => s + Math.round(l.valor * 100), 0);
        expect(soma).toBe(100_001); // conservação exata
    });

    it('criarParcelas: valor inválido é erro; sem vencimento gera null', async () => {
        await expect(custosService.criarParcelas({
            edicaoId: 'ed1', valorTotal: 0, parcelas: 2, primeiroVencimento: null,
        })).rejects.toThrow(/inválido/);
        state.results.push({ data: null, error: null });
        await custosService.criarParcelas({
            edicaoId: 'ed1', valorTotal: 100, parcelas: 1, primeiroVencimento: null,
        });
        const linhas = (builders[0].insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(linhas[0].data_vencimento).toBeNull();
    });

    it('getPagamentos filtra pela edição; marcarPago grava status+data', async () => {
        state.results.push({ data: [], error: null });
        await custosService.getPagamentos('ed1');
        expect(builders[0].eq).toHaveBeenCalledWith('edicao_id', 'ed1');
        state.results.push({ data: null, error: null });
        await custosService.marcarPago('pg1', '2026-08-04');
        expect(builders[1].update).toHaveBeenCalledWith({ status: 'pago', data_pagamento: '2026-08-04' });
        state.results.push({ data: null, error: new Error('imutavel') });
        await expect(custosService.marcarPago('pg2', '2026-08-04')).rejects.toThrow('imutavel');
    });
});

describe('montarMapaCotacao (RF-011/052 — o mapa item × fornecedor)', () => {
    const itens = [
        { itemId: 'i1', descricao: 'Tenda 5x5', quantidade: 29 },
        { itemId: 'i2', descricao: 'Piso', quantidade: 1000 },
        { itemId: 'i3', descricao: 'Elétrica', quantidade: 1 },
    ];
    const cotacoes: PedidoComItens['cotacoes'] = [
        {
            id: 'cA', fornecedor_id: 'fA', status: 'recebida', frete: 1200,
            fornecedor: { id: 'fA', razao_social: 'Fornecedor A', cnpj: null },
            linhas: [
                { item_id: 'i1', quantidade: 29, preco_unitario: 2800, total: null },
                { item_id: 'i2', quantidade: 1000, preco_unitario: 30, total: null },
                { item_id: 'i3', quantidade: 1, preco_unitario: 2800, total: null },
            ],
        },
        {
            id: 'cB', fornecedor_id: 'fB', status: 'recebida', frete: null,
            fornecedor: { id: 'fB', razao_social: 'Fornecedor B', cnpj: null },
            linhas: [
                { item_id: 'i1', quantidade: 29, preco_unitario: 2761, total: null },
                { item_id: 'i3', quantidade: 1, preco_unitario: 2600, total: null },
            ],
        },
    ];

    it('menor preço por item + cobertura parcial ("2/3") + all-in com frete', () => {
        const mapa = montarMapaCotacao(itens, cotacoes);
        expect(mapa.linhas[0].menorFornecedorId).toBe('fB');   // 2761 < 2800
        expect(mapa.linhas[1].menorFornecedorId).toBe('fA');   // só A cotou piso
        expect(mapa.linhas[2].menorFornecedorId).toBe('fB');

        const fA = mapa.fornecedores.find(f => f.id === 'fA')!;
        const fB = mapa.fornecedores.find(f => f.id === 'fB')!;
        expect(fA.cobertura).toBe('3/3');
        expect(fB.cobertura).toBe('2/3');
        // A: 29×2800 + 1000×30 + 2800 + frete 1200 = 115.200 (all-in RF-052)
        expect(fA.totalAllIn).toBe(115_200);
        // B: 29×2761 + 2600 = 82.669 (sem frete informado — o alerta é da UI)
        expect(fB.totalAllIn).toBe(82_669);
    });

    it('cenário "menor por item" é sugestão calculada (rel. 05)', () => {
        const mapa = montarMapaCotacao(itens, cotacoes);
        // i1 B 29×2761 + i2 A 1000×30 + i3 B 2600 = 112.669
        expect(mapa.totalMenorPorItem).toBe(112_669);
    });

    it('sem cotações: mapa vazio sem explodir', () => {
        const mapa = montarMapaCotacao(itens, []);
        expect(mapa.fornecedores).toEqual([]);
        expect(mapa.linhas[0].menorFornecedorId).toBeNull();
        expect(mapa.totalMenorPorItem).toBe(0);
    });

    it('fornecedor sem join vira "?" e frete null conta como 0', () => {
        const mapa = montarMapaCotacao(itens.slice(0, 1), [{
            id: 'cX', fornecedor_id: 'fX', status: 'recebida', frete: null,
            fornecedor: null,
            linhas: [{ item_id: 'i1', quantidade: 29, preco_unitario: 100, total: null }],
        }]);
        expect(mapa.fornecedores[0].nome).toBe('?');
        expect(mapa.fornecedores[0].totalAllIn).toBe(2900);
    });
});

describe('ramos restantes de pedidos/cotações', () => {
    it('registrarCotacaoImportada sem linhas: não insere; resposta neutra → incluso null', async () => {
        state.results.push({ data: { id: 'cot2' }, error: null });  // upsert cotacao
        state.results.push({ data: null, error: null });            // delete linhas
        state.results.push({ data: null, error: null });            // upsert exclusao neutra
        await custosService.registrarCotacaoImportada({
            edicaoId: 'ed1', pedidoId: 'ped1', fornecedorId: 'f1',
            linhas: [],
            exclusoes: [{ chave: 'validade', resposta: '30/09/2026' }],
        });
        expect(builders).toHaveLength(3); // cotacao + delete + exclusao (sem insert de linhas)
        expect(builders[2].upsert).toHaveBeenCalledWith(
            expect.objectContaining({ chave: 'validade', incluso: null }),
            expect.anything(),
        );
    });

    it('createPedido sem categoria grava null; erro no N:N é propagado', async () => {
        state.results.push({ data: { id: 'ped2' }, error: null });
        state.results.push({ data: null, error: new Error('fk') });
        await expect(custosService.createPedido({
            edicaoId: 'ed1', nome: 'Solto', itens: [{ itemId: 'i1', quantidade: 1 }],
        })).rejects.toThrow('fk');
        expect(builders[0].insert).toHaveBeenCalledWith(
            expect.objectContaining({ categoria_id: null }),
        );
    });

    it('data null nos getters vira lista vazia (PostgREST caprichoso)', async () => {
        state.results.push({ data: null, error: null });
        expect(await custosService.getPedidos('ed1')).toEqual([]);
        state.results.push({ data: null, error: null });
        expect(await custosService.getFornecedores()).toEqual([]);
        state.results.push({ data: null, error: null });
        expect(await custosService.getEspacosTemplate()).toEqual([]);
        state.results.push({ data: null, error: null });
        expect(await custosService.getChecklist('ed1')).toEqual([]);
        state.results.push({ data: null, error: null });
        expect(await custosService.getCompostos('ed1')).toEqual([]);
    });

    it('fornecedor SEM cnpj vai direto ao insert (sem busca de dedup)', async () => {
        state.results.push({ data: { id: 'f9' }, error: null });
        const r = await custosService.saveFornecedor({ razao_social: 'Diarista', cnpj: null });
        expect(r.id).toBe('f9');
        expect(builders).toHaveLength(1);
        expect(builders[0].insert).toHaveBeenCalled();
    });

    it('registrarUsoProduto propaga erro de leitura', async () => {
        state.results.push({ data: null, error: new Error('nf') });
        await expect(custosService.registrarUsoProduto('p1')).rejects.toThrow('nf');
    });

    it('erros de upsert de cotação e de marcarVencedor são propagados', async () => {
        state.results.push({ data: null, error: new Error('rls-cot') });
        await expect(custosService.registrarCotacaoImportada({
            edicaoId: 'e', pedidoId: 'p', fornecedorId: 'f', linhas: [], exclusoes: [],
        })).rejects.toThrow('rls-cot');
        state.results.push({ data: null, error: new Error('sem-linha') });
        await expect(custosService.marcarVencedor('c', 'i')).rejects.toThrow('sem-linha');
    });
});
