/**
 * Service do Centro de Custo do Evento — ÚNICO ponto de acesso a dados do
 * módulo (RNF-007: páginas não importam supabase). Tabelas `custos_*` ainda
 * não estão no database.types.ts gerado, por isso os casts `as any` no client;
 * os tipos de domínio vivem em types/custos.ts.
 *
 * Testado em services/custosService.test.ts (RNF-014).
 */

import { supabase } from './supabaseClient';
import { limparCNPJ, validarCNPJ } from '../utils/parseBR';
import type {
    CustoCategoria,
    CustoSecao,
    CustoChecklistResposta,
    CustoComposto,
    CustoEspacoTemplate,
    CustoEspacoTemplateItem,
    CustoFornecedor,
    CustoItem,
    CustoItemInput,
    CustoPerfilEdicao,
    CustoProdutoBusca,
    CustosStatusEdicao,
} from '../types/custos';

const db = supabase as any;

// ────────────────────────────────────────────────────────────────────────────
// Helpers puros (exportados para teste)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Normaliza o payload de fornecedor: CNPJ vira 14 dígitos ou null; CNPJ
 * presente e INVÁLIDO é erro (RF-028 — a chave de dedup não pode ser lixo).
 */
export function normalizarFornecedor<T extends { cnpj?: string | null }>(f: T): T {
    const digitos = limparCNPJ(f.cnpj ?? '');
    if (digitos === '') return { ...f, cnpj: null };
    if (!validarCNPJ(digitos)) {
        throw new Error(`CNPJ inválido: ${f.cnpj}`);
    }
    return { ...f, cnpj: digitos };
}

/**
 * Limpa o input de item para gravação (RNF-002: aceita entrada suja, grava
 * limpo): descrição obrigatória; números inválidos caem para o default.
 */
export function normalizarItem(input: CustoItemInput): CustoItemInput {
    const descricao = (input.descricao ?? '').trim();
    if (!descricao) throw new Error('Item precisa de descrição');
    const num = (v: unknown, def: number, min = 0): number => {
        const n = Number(v);
        return Number.isFinite(n) && n > min ? n : def;
    };
    const preco = Number(input.preco_unitario_orcado);
    return {
        ...input,
        descricao,
        quantidade: num(input.quantidade, 1),
        fator: num(input.fator, 1),
        preco_unitario_orcado:
            Number.isFinite(preco) && preco >= 0 ? preco : null,
    };
}

// ────────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────────

export const custosService = {
    // ── Catálogo (nível empresa) ────────────────────────────────────────────
    async getCategorias(): Promise<CustoCategoria[]> {
        const { data, error } = await db
            .from('custos_categorias')
            .select('*')
            .eq('ativo', true)
            .order('ordem');
        if (error) throw error;
        return data ?? [];
    },

    /** Seções/centros de custo (RF-055): Julgamento (por raça), Estrutura, Diversos. */
    async getSecoes(): Promise<CustoSecao[]> {
        const { data, error } = await db
            .from('custos_secoes')
            .select('*')
            .eq('ativo', true)
            .order('ordem');
        if (error) throw error;
        return data ?? [];
    },

    /** Raça nova, seção nova — lista aberta (RF-055). */
    async createSecao(s: { nome: string; nome_curto: string; slug: string; parent_id?: string | null; ordem?: number }): Promise<CustoSecao> {
        const { data, error } = await db
            .from('custos_secoes')
            .insert({ ...s, parent_id: s.parent_id ?? null, ordem: s.ordem ?? 999 })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    /** Busca "Mercado Livre" (RF-049): typo, sinônimo, prefixo, popularidade. */
    async buscarProdutos(termo: string, limite = 20): Promise<CustoProdutoBusca[]> {
        const t = termo.trim();
        if (t.length < 2) return [];
        const { data, error } = await db.rpc('custos_buscar_produtos', {
            p_termo: t,
            p_limite: limite,
        });
        if (error) throw error;
        return data ?? [];
    },

    /** Selecionou no autocomplete → alimenta o ranking de popularidade. */
    async registrarUsoProduto(produtoId: string): Promise<void> {
        const { data: atual, error: e1 } = await db
            .from('custos_produtos')
            .select('frequencia_uso')
            .eq('id', produtoId)
            .single();
        if (e1) throw e1;
        const { error: e2 } = await db
            .from('custos_produtos')
            .update({ frequencia_uso: (atual?.frequencia_uso ?? 0) + 1 })
            .eq('id', produtoId);
        if (e2) throw e2;
    },

    // ── Fornecedores ────────────────────────────────────────────────────────
    async getFornecedores(): Promise<CustoFornecedor[]> {
        const { data, error } = await db
            .from('custos_fornecedores')
            .select('*')
            .eq('ativo', true)
            .order('razao_social');
        if (error) throw error;
        return data ?? [];
    },

    /** Upsert por CNPJ (RF-028): CNPJ existente atualiza, novo cria. */
    async saveFornecedor(f: Partial<CustoFornecedor>): Promise<CustoFornecedor> {
        const payload = normalizarFornecedor(f);
        if (payload.id) {
            const { data, error } = await db
                .from('custos_fornecedores')
                .update(payload)
                .eq('id', payload.id)
                .select()
                .single();
            if (error) throw error;
            return data;
        }
        if (payload.cnpj) {
            const { data: existente } = await db
                .from('custos_fornecedores')
                .select('id')
                .eq('cnpj', payload.cnpj)
                .maybeSingle();
            if (existente?.id) {
                const { data, error } = await db
                    .from('custos_fornecedores')
                    .update(payload)
                    .eq('id', existente.id)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }
        }
        const { data, error } = await db
            .from('custos_fornecedores')
            .insert(payload)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // ── Edição: criação atômica, perfil, checklist ──────────────────────────
    /** RPC atômica (Bloco 3): nunca cria pai sem edição nem edição sem pai. */
    async criarEventoComEdicao(params: {
        nomeEvento: string;
        tituloEdicao: string;
        ano: number;
        status?: CustosStatusEdicao;
        eventoId?: string | null;
    }): Promise<{ evento_id: string; edicao_id: string }> {
        const { data, error } = await db.rpc('custos_criar_evento_com_edicao', {
            p_nome_evento: params.nomeEvento,
            p_titulo_edicao: params.tituloEdicao,
            p_ano: params.ano,
            p_status: params.status ?? 'rascunho',
            p_evento_id: params.eventoId ?? null,
        });
        if (error) throw error;
        return Array.isArray(data) ? data[0] : data;
    },

    async getPerfil(edicaoId: string): Promise<CustoPerfilEdicao | null> {
        const { data, error } = await db
            .from('custos_perfil_edicao')
            .select('*')
            .eq('edicao_id', edicaoId)
            .maybeSingle();
        if (error) throw error;
        return data;
    },

    async savePerfil(perfil: Partial<CustoPerfilEdicao> & { edicao_id: string }): Promise<CustoPerfilEdicao> {
        const { data, error } = await db
            .from('custos_perfil_edicao')
            .upsert({ ...perfil, atualizado_em: new Date().toISOString() }, { onConflict: 'edicao_id' })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async getChecklist(edicaoId: string): Promise<CustoChecklistResposta[]> {
        const { data, error } = await db
            .from('custos_checklist_respostas')
            .select('*')
            .eq('edicao_id', edicaoId);
        if (error) throw error;
        return data ?? [];
    },

    /** Ticou/desticou/quantificou — upsert por (edição, chave). */
    async saveChecklistResposta(r: Partial<CustoChecklistResposta> & { edicao_id: string; chave: string }): Promise<CustoChecklistResposta> {
        const { data, error } = await db
            .from('custos_checklist_respostas')
            .upsert({ ...r, atualizado_em: new Date().toISOString() }, { onConflict: 'edicao_id,chave' })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // ── Espaços/compostos (RF-032/050) ──────────────────────────────────────
    async getEspacosTemplate(): Promise<(CustoEspacoTemplate & { itens: CustoEspacoTemplateItem[] })[]> {
        const { data, error } = await db
            .from('custos_espacos_template')
            .select('*, itens:custos_espaco_template_itens(*)')
            .eq('ativo', true)
            .order('nome');
        if (error) throw error;
        return data ?? [];
    },

    async getCompostos(edicaoId: string): Promise<CustoComposto[]> {
        const { data, error } = await db
            .from('custos_compostos')
            .select('*')
            .eq('edicao_id', edicaoId)
            .order('criado_em');
        if (error) throw error;
        return data ?? [];
    },

    /**
     * Instancia um template na edição (RF-050): cria o composto e copia os
     * itens do descritivo-padrão para a grade, já vinculados a ele.
     */
    async instanciarTemplate(params: {
        edicaoId: string;
        templateId: string;
        nome: string;
        quantidade?: number;
        porte?: string | null;
    }): Promise<CustoComposto> {
        const { data: composto, error: e1 } = await db
            .from('custos_compostos')
            .insert({
                edicao_id: params.edicaoId,
                template_id: params.templateId,
                nome: params.nome,
                quantidade: params.quantidade ?? 1,
                porte: params.porte ?? null,
            })
            .select()
            .single();
        if (e1) throw e1;

        const { data: itensTpl, error: e2 } = await db
            .from('custos_espaco_template_itens')
            .select('*')
            .eq('template_id', params.templateId)
            .order('ordem');
        if (e2) throw e2;

        if (itensTpl && itensTpl.length > 0) {
            const linhas = itensTpl.map((t: CustoEspacoTemplateItem) => ({
                edicao_id: params.edicaoId,
                composto_id: composto.id,
                categoria_id: t.categoria_id,
                produto_id: t.produto_id,
                descricao: t.descricao,
                formato: t.formato,
                quantidade: t.quantidade,
            }));
            const { error: e3 } = await db.from('custos_itens').insert(linhas);
            if (e3) throw e3;
        }
        return composto;
    },

    // ── Itens: a grade (digitou-salvou) ─────────────────────────────────────
    async getItens(edicaoId: string): Promise<CustoItem[]> {
        const { data, error } = await db
            .from('custos_itens')
            .select('*')
            .eq('edicao_id', edicaoId)
            .order('criado_em');
        if (error) throw error;
        return data ?? [];
    },

    async createItem(input: CustoItemInput): Promise<CustoItem> {
        const payload = normalizarItem(input);
        const { data, error } = await db
            .from('custos_itens')
            .insert(payload)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    /** Digitou-salvou: PATCH de um campo da linha (RNF-001). */
    async updateItem(id: string, patch: Partial<CustoItemInput>): Promise<CustoItem> {
        const { data, error } = await db
            .from('custos_itens')
            .update(patch)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    /** Excluir é barato em rascunho/orçado (Q-025 — o banco barra o resto). */
    async deleteItem(id: string): Promise<void> {
        const { error } = await db.from('custos_itens').delete().eq('id', id);
        if (error) throw error;
    },

    // ── Pedidos de orçamento e cotações (RF-002/011/036) ────────────────────
    async getPedidos(edicaoId: string): Promise<PedidoComItens[]> {
        const { data, error } = await db
            .from('custos_pedidos')
            .select('*, itens:custos_pedido_itens(item_id, quantidade), cotacoes:custos_cotacoes(*, fornecedor:custos_fornecedores(id, razao_social, cnpj), linhas:custos_cotacao_linhas(*))')
            .eq('edicao_id', edicaoId)
            .order('criado_em');
        if (error) throw error;
        return data ?? [];
    },

    /** Agrupamento do modal (RF-036): itens marcados viram um pedido. */
    async createPedido(params: {
        edicaoId: string;
        nome: string;
        categoriaId?: string | null;
        itens: { itemId: string; quantidade: number }[];
    }): Promise<{ id: string }> {
        if (params.itens.length === 0) throw new Error('Pedido precisa de ao menos 1 item');
        const { data: pedido, error: e1 } = await db
            .from('custos_pedidos')
            .insert({
                edicao_id: params.edicaoId,
                nome: params.nome,
                categoria_id: params.categoriaId ?? null,
            })
            .select()
            .single();
        if (e1) throw e1;
        const { error: e2 } = await db.from('custos_pedido_itens').insert(
            params.itens.map(i => ({
                pedido_id: pedido.id,
                item_id: i.itemId,
                quantidade: i.quantidade,
            })),
        );
        if (e2) throw e2;
        return pedido;
    },

    /**
     * Importação da planilha devolvida (RF-029): upsert da cotação por
     * (pedido, fornecedor), linhas substituídas, exclusões gravadas.
     */
    async registrarCotacaoImportada(params: {
        edicaoId: string;
        pedidoId: string;
        fornecedorId: string;
        linhas: { itemId: string; precoUnitario: number; quantidade: number }[];
        exclusoes: { chave: string; resposta: string }[];
    }): Promise<{ id: string }> {
        const { data: cot, error: e1 } = await db
            .from('custos_cotacoes')
            .upsert({
                edicao_id: params.edicaoId,
                pedido_id: params.pedidoId,
                fornecedor_id: params.fornecedorId,
                status: 'recebida',
            }, { onConflict: 'pedido_id,fornecedor_id' })
            .select()
            .single();
        if (e1) throw e1;

        const { error: eDel } = await db
            .from('custos_cotacao_linhas').delete().eq('cotacao_id', cot.id);
        if (eDel) throw eDel;
        if (params.linhas.length > 0) {
            const { error: e2 } = await db.from('custos_cotacao_linhas').insert(
                params.linhas.map(l => ({
                    cotacao_id: cot.id,
                    item_id: l.itemId,
                    quantidade: l.quantidade,
                    preco_unitario: l.precoUnitario,
                })),
            );
            if (e2) throw e2;
        }
        for (const ex of params.exclusoes) {
            const { error: e3 } = await db
                .from('custos_cotacao_exclusoes')
                .upsert({
                    cotacao_id: cot.id,
                    chave: ex.chave,
                    observacao: ex.resposta,
                    incluso: /^\s*sim/i.test(ex.resposta) ? true : /^\s*n[aã]o/i.test(ex.resposta) ? false : null,
                }, { onConflict: 'cotacao_id,chave' });
            if (e3) throw e3;
        }
        return cot;
    },

    // ── Descritivo-padrão dos espaços (RF-050 — editor de template) ─────────
    async addTemplateItem(item: {
        template_id: string; descricao: string; quantidade: number;
        formato?: string | null; categoria_id?: string | null; produto_id?: string | null; ordem?: number;
    }): Promise<CustoEspacoTemplateItem> {
        const { data, error } = await db
            .from('custos_espaco_template_itens')
            .insert({ ...item, formato: item.formato ?? null, categoria_id: item.categoria_id ?? null, produto_id: item.produto_id ?? null, ordem: item.ordem ?? 0 })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateTemplateItem(id: string, patch: Partial<Pick<CustoEspacoTemplateItem, 'descricao' | 'quantidade' | 'formato' | 'categoria_id' | 'ordem'>>): Promise<CustoEspacoTemplateItem> {
        const { data, error } = await db
            .from('custos_espaco_template_itens')
            .update(patch)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteTemplateItem(id: string): Promise<void> {
        const { error } = await db.from('custos_espaco_template_itens').delete().eq('id', id);
        if (error) throw error;
    },

    async createTemplate(t: { nome: string; descricao?: string | null; porte?: string | null }): Promise<CustoEspacoTemplate> {
        const { data, error } = await db
            .from('custos_espacos_template')
            .insert({ nome: t.nome, descricao: t.descricao ?? null, porte: t.porte ?? null })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // ── Pagamentos com parcelas (Q-009 — o REALIZADO de verdade) ────────────
    async getPagamentos(edicaoId: string): Promise<CustoPagamento[]> {
        const { data, error } = await db
            .from('custos_pagamentos')
            .select('*')
            .eq('edicao_id', edicaoId)
            .order('data_vencimento', { ascending: true, nullsFirst: false });
        if (error) throw error;
        return data ?? [];
    },

    /**
     * Cria N parcelas iguais (resto de centavos na 1ª) a partir do total,
     * com vencimentos mensais a partir da 1ª data.
     */
    async criarParcelas(params: {
        edicaoId: string; contratacaoId?: string | null;
        valorTotal: number; parcelas: number; primeiroVencimento: string | null;
    }): Promise<void> {
        const n = Math.max(1, Math.floor(params.parcelas));
        if (!Number.isFinite(params.valorTotal) || params.valorTotal <= 0) {
            throw new Error('Valor total inválido');
        }
        const totalCent = Math.round(params.valorTotal * 100);
        const base = Math.floor(totalCent / n);
        const linhas = Array.from({ length: n }, (_, i) => {
            const cent = i === 0 ? totalCent - base * (n - 1) : base;
            let venc: string | null = null;
            if (params.primeiroVencimento) {
                const d = new Date(`${params.primeiroVencimento}T00:00:00Z`);
                d.setUTCMonth(d.getUTCMonth() + i);
                venc = d.toISOString().slice(0, 10);
            }
            return {
                edicao_id: params.edicaoId,
                contratacao_id: params.contratacaoId ?? null,
                parcela_num: i + 1,
                parcelas_total: n,
                valor: cent / 100,
                data_vencimento: venc,
                status: 'previsto',
            };
        });
        const { error } = await db.from('custos_pagamentos').insert(linhas);
        if (error) throw error;
    },

    /** Marca pago (imutável depois — Q-025, a RLS trava UPDATE de linha paga). */
    async marcarPago(id: string, dataPagamento: string): Promise<void> {
        const { error } = await db
            .from('custos_pagamentos')
            .update({ status: 'pago', data_pagamento: dataPagamento })
            .eq('id', id);
        if (error) throw error;
    },

    /** Split award (RF-011): marca a linha vencedora e o item vira 'contratado'. */
    async marcarVencedor(cotacaoId: string, itemId: string): Promise<void> {
        const { data: linha, error: e1 } = await db
            .from('custos_cotacao_linhas')
            .select('id, preco_unitario')
            .eq('cotacao_id', cotacaoId)
            .eq('item_id', itemId)
            .single();
        if (e1) throw e1;
        const { error: e2 } = await db
            .from('custos_itens')
            .update({ status: 'contratado' })
            .eq('id', itemId);
        if (e2) throw e2;
        void linha;
    },
};

export interface CustoPagamento {
    id: string;
    edicao_id: string;
    contratacao_id: string | null;
    parcela_num: number;
    parcelas_total: number;
    valor: number;
    data_vencimento: string | null;
    data_pagamento: string | null;
    status: 'previsto' | 'agendado' | 'pago' | 'cancelado';
    criado_em: string;
}

export interface PedidoComItens {
    id: string;
    edicao_id: string;
    nome: string;
    categoria_id: string | null;
    criado_em: string;
    itens: { item_id: string; quantidade: number }[];
    cotacoes: {
        id: string;
        fornecedor_id: string;
        status: string;
        frete: number | null;
        fornecedor: { id: string; razao_social: string; cnpj: string | null } | null;
        linhas: { item_id: string; quantidade: number; preco_unitario: number; total: number | null }[];
    }[];
}

// ────────────────────────────────────────────────────────────────────────────
// Mapa de cotação (RF-011/052) — puro, exportado para teste
// ────────────────────────────────────────────────────────────────────────────

export interface LinhaMapa {
    itemId: string;
    descricao: string;
    quantidade: number;
    /** preço unitário por fornecedor (fornecedorId → preço) */
    precos: Record<string, number>;
    menorFornecedorId: string | null;
}

export interface MapaCotacao {
    fornecedores: { id: string; nome: string; totalAllIn: number; cobertura: string }[];
    linhas: LinhaMapa[];
    /** soma escolhendo o menor preço por item (sugestão, não imposição — rel. 05) */
    totalMenorPorItem: number;
}

export function montarMapaCotacao(
    itensPedido: { itemId: string; descricao: string; quantidade: number }[],
    cotacoes: PedidoComItens['cotacoes'],
): MapaCotacao {
    const linhas: LinhaMapa[] = itensPedido.map(it => {
        const precos: Record<string, number> = {};
        for (const c of cotacoes) {
            const l = c.linhas.find(x => x.item_id === it.itemId);
            if (l) precos[c.fornecedor_id] = l.preco_unitario;
        }
        let menor: string | null = null;
        for (const [fid, p] of Object.entries(precos)) {
            if (menor === null || p < precos[menor]) menor = fid;
        }
        return { itemId: it.itemId, descricao: it.descricao, quantidade: it.quantidade, precos, menorFornecedorId: menor };
    });

    const fornecedores = cotacoes.map(c => {
        const cobertos = linhas.filter(l => c.fornecedor_id in l.precos).length;
        const totalItens = linhas.reduce((s, l) => {
            const p = l.precos[c.fornecedor_id];
            return p !== undefined ? s + p * l.quantidade : s;
        }, 0);
        return {
            id: c.fornecedor_id,
            nome: c.fornecedor?.razao_social ?? '?',
            totalAllIn: Math.round((totalItens + (c.frete ?? 0)) * 100) / 100,  // RF-052
            cobertura: `${cobertos}/${linhas.length}`,
        };
    });

    const totalMenorPorItem = Math.round(linhas.reduce((s, l) => {
        if (!l.menorFornecedorId) return s;
        return s + l.precos[l.menorFornecedorId] * l.quantidade;
    }, 0) * 100) / 100;

    return { fornecedores, linhas, totalMenorPorItem };
}
