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
};
