/**
 * Tipos do módulo Centro de Custo do Evento — espelham o schema aplicado em
 * 04/08/2026 (supabase/migrations/20260804120000_modulo_custos_fase0.sql +
 * Bloco 15 fator). Mantidos à mão até o database.types.ts ser regenerado.
 */

// Enums do banco
export type CustosStatusItem =
    | 'rascunho' | 'orcado' | 'cotado' | 'contratado' | 'realizado' | 'cancelado';
export type CustosStatusCotacao =
    | 'rascunho' | 'enviada' | 'recebida' | 'vencida' | 'descartada';
export type CustosStatusContratacao = 'ativa' | 'cancelada' | 'aditada' | 'concluida';
export type CustosDriverRateio = 'quantidade' | 'valor' | 'percentual' | 'direto';
export type CustosFaceStatus = 'embutido' | 'a_parte' | 'na';
export type CustosStatusPagamento = 'previsto' | 'agendado' | 'pago' | 'cancelado';
export type CustosStatusEdicao = 'rascunho' | 'simulacao' | 'confirmada' | 'encerrada';
export type CustosAlocacao = 'direto' | 'medivel' | 'verba_fechada';

// ── Nível empresa (catálogo) ────────────────────────────────────────────────

/** Seção/centro de custo do usuário (RF-055): Julgamento (por raça), Estrutura, Diversos. */
export interface CustoSecao {
    id: string;
    nome: string;
    nome_curto: string;
    slug: string;
    parent_id: string | null;
    ordem: number;
    ativo: boolean;
    criado_em: string;
}

export interface CustoCategoria {
    id: string;
    nome: string;
    slug: string;
    pacote_unico: boolean;   // RF-024 (ex.: Programação Visual)
    ordem: number;
    ativo: boolean;
    criado_em: string;
}

export interface CustoFornecedor {
    id: string;
    cnpj: string | null;     // 14 dígitos, chave de dedup (RF-028)
    razao_social: string;
    nome_fantasia: string | null;
    email: string | null;
    telefone: string | null;
    cidade: string | null;
    uf: string | null;
    km_base: number | null;
    observacoes: string | null;
    ativo: boolean;
    criado_em: string;
}

export interface CustoProduto {
    id: string;
    nome: string;
    descricao: string | null;
    unidade: string;
    categoria_id: string | null;
    frequencia_uso: number;  // ranking do autocomplete (RF-031/049)
    ativo: boolean;
    criado_em: string;
}

/** Resultado da RPC custos_buscar_produtos (busca "Mercado Livre", RF-049). */
export interface CustoProdutoBusca {
    id: string;
    nome: string;
    unidade: string;
    frequencia_uso: number;
    score: number;
}

export interface CustoEspacoTemplate {
    id: string;
    nome: string;            // "Bar", "CAEX", "Stand básico"...
    descricao: string | null;
    porte: string | null;
    ativo: boolean;
    criado_em: string;
}

export interface CustoEspacoTemplateItem {
    id: string;
    template_id: string;
    produto_id: string | null;
    categoria_id: string | null;
    descricao: string;
    quantidade: number;
    formato: string | null;
    ordem: number;
    criado_em: string;
}

// ── Nível edição ────────────────────────────────────────────────────────────

/** Camada 0 — perfil que dimensiona o questionário (RF-042). */
export interface CustoPerfilEdicao {
    edicao_id: string;
    local_publico: boolean | null;
    publico_esperado: number | null;
    tem_animais: boolean;
    tem_show: boolean;
    vende_alcool: boolean;
    cobra_ingresso: boolean;
    tem_estruturas: boolean;
    local_fechado: boolean;
    atualizado_em: string;
}

export interface CustoChecklistResposta {
    id: string;
    edicao_id: string;
    chave: string;           // 'art', 'bombeiros', 'limpeza', 'caixas'...
    marcado: boolean;
    quantidade: number | null;
    modalidade: string | null;
    prazo_limite: string | null;   // date ISO
    observacao: string | null;
    atualizado_em: string;
}

/** Instância de espaço na edição (RF-032): "Estandes Expositores", "Bar"... */
export interface CustoComposto {
    id: string;
    edicao_id: string;
    template_id: string | null;
    nome: string;
    porte: string | null;
    quantidade: number;
    criado_em: string;
}

/** Item de necessidade — a linha da grade (RF-001/031/053). */
export interface CustoItem {
    id: string;
    edicao_id: string;
    composto_id: string | null;
    categoria_id: string | null;
    secao_id: string | null;       // centro de custo (RF-055)
    produto_id: string | null;
    descricao: string;
    formato: string | null;
    quantidade: number;
    fator: number;                 // 2ª dimensão: diárias/viagens (RF-053)
    fator_rotulo: string | null;   // "diárias", "viagens"...
    unidade: string;
    porte: string | null;
    alocacao: CustosAlocacao;      // 3 gavetas (Q-021)
    driver_rateio: CustosDriverRateio;
    percentual_rateio: number | null;
    avulso: boolean;               // RF-004 (bombeiros etc.)
    prazo_limite: string | null;
    status: CustosStatusItem;
    preco_unitario_orcado: number | null;
    total_orcado: number | null;   // gerado pelo banco (qtd × fator × unit)
    baseline_preco_unitario: number | null;
    baseline_quantidade: number | null;
    baseline_congelado_em: string | null;
    criado_por: string | null;
    criado_em: string;
    atualizado_em: string;
}

/** Campos editáveis pela grade (o resto é do banco/trigger). */
export type CustoItemInput = Partial<Pick<CustoItem,
    | 'composto_id' | 'categoria_id' | 'secao_id' | 'produto_id' | 'descricao' | 'formato'
    | 'quantidade' | 'fator' | 'fator_rotulo' | 'unidade' | 'porte'
    | 'alocacao' | 'driver_rateio' | 'percentual_rateio' | 'avulso'
    | 'prazo_limite' | 'status' | 'preco_unitario_orcado'
>> & { edicao_id: string };
