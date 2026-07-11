// ============================================================
// types.ts — Tipos do módulo CadastroCliente
// Extraídos verbatim do topo de pages/CadastroCliente.tsx
// ============================================================

export type TabType = 'dados' | 'enderecos' | 'contatos' | 'contratos';
export type TipoPessoa = 'PF' | 'PJ';

export interface Endereco {
    id: string;
    tema: string;
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
}

export interface Contato {
    id: string;
    nome: string;
    email: string;
    telefone: string;
    cargo: string;
    principal: boolean;
}

export interface StandVinculado {
    id: string;
    stand_nr: string;
    tipo_venda: string;
    opcionais_selecionados: Record<string, boolean> | null;
    planilha_configuracoes?: {
        edicao_id: string | null;
        opcionais_ativos: string[] | null;
        eventos_edicoes?: { titulo: string; eventos?: { nome: string } | null } | null;
    } | null;
}

export interface AtendimentoVinculado {
    id: string;
    edicao_id: string;
    contato_nome: string | null;
    telefone: string | null;
    ultima_obs: string | null;
    ultima_obs_at: string | null;
    data_retorno: string | null;
    eventos_edicoes?: { titulo: string; eventos?: { nome: string } | null } | null;
    contatos?: { nome: string | null; telefone: string | null } | null;
    users?: { name: string | null } | null;
}

// Dados básicos do formulário
export interface DadosCliente {
    nome: string;
    cpf: string;
    rg: string;
    dataNascimento: string;
    razaoSocial: string;
    nomeFantasia: string;
    cnpj: string;
    inscricaoEstadual: string;
    responsavelEmpresa: string;
    cpfResponsavel: string;
}

// Preview retornado pela BrasilAPI ao buscar CNPJ
export interface CnpjPreview {
    razao_social: string;
    nome_fantasia: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
    email: string;
    ddd_telefone_1: string;
}
