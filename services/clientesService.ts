import { supabase } from './supabaseClient';
import { Database } from '../database.types';
import type {
    Endereco,
    Contato,
    StandVinculado,
    AtendimentoVinculado,
    DadosCliente,
    TipoPessoa,
} from '../components/cadastroCliente/types';
import { maskCPF, maskCNPJ, maskCEP, maskTelefone, onlyDigits } from '../utils/masks';
import { isTemporaryId } from '../utils/isTemporaryId';

export type Cliente = Database['public']['Tables']['clientes']['Row'];
export type ClienteComContatos = Cliente & {
    contatos?: Array<{ telefone: string | null; principal: boolean | null }>;
};

// Resultado agregado do carregamento completo de um cliente
export interface ClienteCompleto {
    tipoPessoa: TipoPessoa;
    dados: DadosCliente;
    enderecos: Endereco[];
    contatos: Contato[];
    standsVinculados: StandVinculado[];
    atendimentosVinculados: AtendimentoVinculado[];
}

// Payload de salvamento completo
export interface SaveClienteInput {
    clienteId: string | null;
    tipoPessoa: TipoPessoa;
    dados: DadosCliente;
    enderecos: Endereco[];
    contatos: Contato[];
    enderecosToDelete: string[];
    contatosToDelete: string[];
}

// Cliente já existente com o mesmo CPF/CNPJ (bloqueio de duplicidade)
export interface ClienteDuplicado {
    campo: 'cpf' | 'cnpj';
    nome: string;
}

// Resultado do salvamento: duplicado (bloqueado) ou sucesso
export type SaveClienteResult =
    | { status: 'duplicado'; duplicado: ClienteDuplicado }
    | {
          status: 'ok';
          clienteId: string;
          enderecos: Endereco[];
          contatos: Contato[];
      };

// ============================================================
// Tipos auxiliares usados pelo ClienteSelectorWidget
// ============================================================

/** Raw row retornado pelas queries do selector (antes de formatar contato principal) */
export interface ClienteSelectorRow {
    id: string;
    tipo_pessoa: string;
    nome_completo?: string | null;
    razao_social?: string | null;
    nome_fantasia?: string | null;
    cpf?: string | null;
    cnpj?: string | null;
    contatos?: { id: string; nome: string; telefone: string | null; cargo: string | null; principal: boolean; email: string | null }[];
}

/** Payload para criação rápida de cliente PJ com contato principal */
export interface CreateClienteRapidoInput {
    nome: string;
    contato: string;
    cargo?: string;
    telefone?: string;
    email?: string;
}

export const clientesService = {
    async getClientes() {
        const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .order('nome_fantasia');

        if (error) throw error;
        return data || [];
    },
    async getClientesComContatos(): Promise<ClienteComContatos[]> {
        const { data, error } = await supabase
            .from('clientes')
            .select('*, contatos(telefone, principal)')
            .order('nome_fantasia');

        if (error) throw error;
        return (data as unknown as ClienteComContatos[]) || [];
    },
    async getClienteById(id: string) {
        const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    // ============================================================
    // Carregamento completo (cliente + relacionamentos)
    // ============================================================
    async fetchClienteCompleto(clienteId: string): Promise<ClienteCompleto> {
        // Consultas independentes em paralelo
        const [
            clientRes,
            endsRes,
            contsRes,
            standsRes,
            atendsRes,
        ] = await Promise.all([
            supabase.from('clientes').select('*').eq('id', clienteId).single(),
            supabase.from('enderecos').select('*').eq('cliente_id', clienteId),
            supabase.from('contatos').select('*').eq('cliente_id', clienteId),
            supabase
                .from('planilha_vendas_estandes')
                .select(`
                    id, stand_nr, tipo_venda, opcionais_selecionados,
                    planilha_configuracoes(
                        edicao_id, opcionais_ativos,
                        eventos_edicoes(titulo, eventos(nome))
                    )
                `)
                .eq('cliente_id', clienteId)
                .not('tipo_venda', 'eq', 'DISPONÍVEL')
                .order('stand_nr'),
            supabase
                .from('atendimentos')
                .select(`
                    id, edicao_id, contato_nome, telefone, ultima_obs, ultima_obs_at, data_retorno,
                    eventos_edicoes(titulo, eventos(nome)),
                    contatos(nome, telefone),
                    users(name)
                `)
                .eq('cliente_id', clienteId)
                .order('ultima_obs_at', { ascending: false }),
        ]);

        if (clientRes.error) throw clientRes.error;
        if (endsRes.error) throw endsRes.error;
        if (contsRes.error) throw contsRes.error;

        const client = clientRes.data;

        const tipoPessoa = (client?.tipo_pessoa as TipoPessoa) ?? 'PJ';
        const dados: DadosCliente = {
            nome: client?.nome_completo || '',
            cpf: client?.cpf ? maskCPF(client.cpf) : '',
            rg: client?.rg || '',
            dataNascimento: client?.data_nascimento || '',
            razaoSocial: client?.razao_social || '',
            nomeFantasia: client?.nome_fantasia || '',
            cnpj: client?.cnpj ? maskCNPJ(client.cnpj) : '',
            inscricaoEstadual: client?.inscricao_estadual || '',
            responsavelEmpresa: (client as any)?.responsavel_empresa || '', // coluna fora do database.types desatualizado (PENDENCIAS item 4)
            cpfResponsavel: (client as any)?.cpf_responsavel ? maskCPF((client as any).cpf_responsavel) : '', // coluna fora do database.types desatualizado (PENDENCIAS item 4)
        };

        const enderecos = ((endsRes.data as Endereco[]) || []).map(e => ({
            ...e,
            cep: e.cep ? maskCEP(e.cep) : '',
        }));

        // Se nenhum for principal, o primeiro será considerado principal
        const contatos = ((contsRes.data as any[]) || []).map((c, idx) => ({
            ...c,
            telefone: c.telefone ? maskTelefone(c.telefone) : '',
            principal: c.principal ?? (idx === 0),
        })) as Contato[];

        const standsVinculados = (standsRes.data as unknown as StandVinculado[]) || [];
        const atendimentosVinculados = (atendsRes.data as unknown as AtendimentoVinculado[]) || [];

        return {
            tipoPessoa,
            dados,
            enderecos,
            contatos,
            standsVinculados,
            atendimentosVinculados,
        };
    },

    // ============================================================
    // Salvamento completo (cliente + endereços + contatos + deleções)
    // ============================================================
    async saveClienteCompleto(input: SaveClienteInput): Promise<SaveClienteResult> {
        const {
            clienteId,
            tipoPessoa,
            dados,
            enderecos,
            contatos,
            enderecosToDelete,
            contatosToDelete,
        } = input;

        // 0. Pegar usuário atual para associar ao registro
        const { data: { user } } = await supabase.auth.getUser();

        // 0.1 Verificar se CPF/CNPJ já existe na base
        if (tipoPessoa === 'PF') {
            const cpfDigits = onlyDigits(dados.cpf);
            if (cpfDigits) {
                const { data: cpfExists } = await supabase
                    .from('clientes')
                    .select('id, nome_completo')
                    .eq('cpf', cpfDigits);

                const pCpf = cpfExists?.find(c => c.id !== clienteId);
                if (pCpf) {
                    return {
                        status: 'duplicado',
                        duplicado: { campo: 'cpf', nome: pCpf.nome_completo || 'Sem Nome' },
                    };
                }
            }
        } else if (tipoPessoa === 'PJ') {
            const cnpjDigits = onlyDigits(dados.cnpj);
            if (cnpjDigits) {
                const { data: cnpjExists } = await supabase
                    .from('clientes')
                    .select('id, razao_social')
                    .eq('cnpj', cnpjDigits);

                const pCnpj = cnpjExists?.find(c => c.id !== clienteId);
                if (pCnpj) {
                    return {
                        status: 'duplicado',
                        duplicado: { campo: 'cnpj', nome: pCnpj.razao_social || 'Sem Razão Social' },
                    };
                }
            }
        }

        // 1. Salvar ou atualizar o Cliente
        const payload = {
            id: clienteId || undefined,
            tipo_pessoa: tipoPessoa,
            nome_completo: tipoPessoa === 'PF' ? dados.nome : null,
            cpf: tipoPessoa === 'PF' ? onlyDigits(dados.cpf) : null,
            rg: tipoPessoa === 'PF' ? dados.rg : null,
            data_nascimento: tipoPessoa === 'PF' ? (dados.dataNascimento || null) : null,
            razao_social: tipoPessoa === 'PJ' ? dados.razaoSocial : null,
            nome_fantasia: dados.nomeFantasia || null,
            cnpj: tipoPessoa === 'PJ' ? onlyDigits(dados.cnpj) : null,
            inscricao_estadual: tipoPessoa === 'PJ' ? dados.inscricaoEstadual : null,
            responsavel_empresa: tipoPessoa === 'PJ' ? (dados.responsavelEmpresa || null) : null,
            cpf_responsavel: tipoPessoa === 'PJ' ? (onlyDigits(dados.cpfResponsavel) || null) : null,
            user_id: user?.id || null,
        };

        const { data: clientData, error: clientError } = await supabase
            .from('clientes')
            .upsert(payload as any) // responsavel_empresa/cpf_responsavel fora do database.types desatualizado (PENDENCIAS item 4)
            .select()
            .single();

        if (clientError) {
            console.error('Erro no upsert de clientes:', clientError);
            throw new Error(`Erro ao salvar dados básicos: ${clientError.message}`);
        }

        const currentClientId = clientData.id;

        // 2. Processar Deleções de Endereços
        if (enderecosToDelete.length > 0) {
            const { error: delEndError } = await supabase
                .from('enderecos')
                .delete()
                .in('id', enderecosToDelete);
            if (delEndError) throw new Error(`Erro ao deletar endereços: ${delEndError.message}`);
        }

        if (contatosToDelete.length > 0) {
            const { error: delContError } = await supabase
                .from('contatos')
                .delete()
                .in('id', contatosToDelete);
            if (delContError) throw new Error(`Erro ao deletar contatos: ${delContError.message}`);
        }

        // 4. Salvar Endereços
        const updatedEnderecos: Endereco[] = [];
        if (enderecos.length > 0) {
            const enderecosToSave = enderecos.map(end => {
                const obj: any = {
                    cliente_id: currentClientId,
                    tema: end.tema || '',
                    cep: onlyDigits(end.cep) || '',
                    logradouro: end.logradouro || '',
                    numero: end.numero || '',
                    complemento: end.complemento || '',
                    bairro: end.bairro || '',
                    cidade: end.cidade || '',
                    estado: end.estado || '',
                };
                if (end.id && !isTemporaryId(end.id)) obj.id = end.id;
                return obj;
            });

            // Para evitar o erro "null value in column id", separamos novos de existentes
            const newEnds = enderecosToSave.filter(e => !e.id);
            const existingEnds = enderecosToSave.filter(e => e.id);

            if (newEnds.length > 0) {
                const { data: savedNew, error: newErr } = await supabase.from('enderecos').insert(newEnds).select();
                if (newErr) throw new Error(`Erro ao inserir novos endereços: ${newErr.message}`);
                if (savedNew) updatedEnderecos.push(...(savedNew as any[]));
            }

            if (existingEnds.length > 0) {
                const { data: savedExt, error: extErr } = await supabase.from('enderecos').upsert(existingEnds).select();
                if (extErr) throw new Error(`Erro ao atualizar endereços existentes: ${extErr.message}`);
                if (savedExt) updatedEnderecos.push(...(savedExt as any[]));
            }
        }
        const enderecosResult = updatedEnderecos.map(e => ({ ...e, cep: e.cep ? maskCEP(e.cep) : '' }));

        // 5. Salvar Contatos
        const updatedContatos: Contato[] = [];
        if (contatos.length > 0) {
            const contatosToSave = contatos.map(cont => {
                const obj: any = {
                    cliente_id: currentClientId,
                    nome: cont.nome || '',
                    email: cont.email || '',
                    telefone: cont.telefone || '',
                    cargo: cont.cargo || '',
                    principal: cont.principal || false,
                };
                if (cont.id && !isTemporaryId(cont.id)) obj.id = cont.id;
                return obj;
            });

            const newConts = contatosToSave.filter(c => !c.id);
            const existingConts = contatosToSave.filter(c => c.id);

            if (newConts.length > 0) {
                const { data: savedNew, error: newErr } = await supabase.from('contatos').insert(newConts).select();
                if (newErr) throw new Error(`Erro ao inserir novos contatos: ${newErr.message}`);
                if (savedNew) updatedContatos.push(...(savedNew as any[]));
            }

            if (existingConts.length > 0) {
                const { data: savedExt, error: extErr } = await supabase.from('contatos').upsert(existingConts).select();
                if (extErr) throw new Error(`Erro ao atualizar contatos existentes: ${extErr.message}`);
                if (savedExt) updatedContatos.push(...(savedExt as any[]));
            }
        }
        const contatosResult = updatedContatos.map(c => ({ ...c, telefone: c.telefone ? maskTelefone(c.telefone) : '' }));

        return {
            status: 'ok',
            clienteId: currentClientId,
            enderecos: enderecosResult,
            contatos: contatosResult,
        };
    },

    // ============================================================
    // Funções usadas pelo ClienteSelectorWidget / useClienteSearch
    // ============================================================

    /** Retorna a contagem total de clientes cadastrados. */
    async countClientes(): Promise<number> {
        const { count } = await supabase
            .from('clientes')
            .select('*', { count: 'exact', head: true });
        return count ?? 0;
    },

    /** Carrega uma página de clientes ordenada por created_at desc. */
    async listClientesPage(page: number, pageSize: number): Promise<ClienteSelectorRow[]> {
        const from = page * pageSize;
        const { data, error } = await supabase
            .from('clientes')
            .select('*, contatos(id, nome, telefone, email, cargo, principal)')
            .order('created_at', { ascending: false })
            .range(from, from + pageSize - 1);

        if (error) throw error;
        return (data || []) as unknown as ClienteSelectorRow[];
    },

    /** Busca clientes no servidor via RPC full-text. */
    async searchClientes(term: string): Promise<ClienteSelectorRow[]> {
        const { data, error } = await (supabase.rpc('search_clientes', { search_term: term }) as any);
        if (error) throw error;
        return (data || []) as ClienteSelectorRow[];
    },

    /**
     * Cria um cliente PJ rápido com um contato principal e devolve o registro
     * completo (cliente + contatos) já pronto para formatar.
     */
    async createClienteRapido(input: CreateClienteRapidoInput): Promise<ClienteSelectorRow> {
        const { data: { user } } = await supabase.auth.getUser();

        const { data: clientData, error: clientError } = await supabase
            .from('clientes')
            .insert({
                tipo_pessoa: 'PJ',
                razao_social: input.nome.trim(),
                nome_fantasia: input.nome.trim(),
                user_id: user?.id || null,
            })
            .select()
            .single();

        if (clientError) throw clientError;

        const { error: contatoError } = await supabase
            .from('contatos')
            .insert({
                cliente_id: clientData.id,
                nome: input.contato.trim(),
                cargo: input.cargo?.trim() || null,
                telefone: input.telefone?.trim() || null,
                email: input.email?.trim() || null,
                principal: true,
            });

        if (contatoError) throw contatoError;

        const { data: fullCliente, error: fetchError } = await supabase
            .from('clientes')
            .select('*, contatos(id, nome, telefone, email, cargo, principal)')
            .eq('id', clientData.id)
            .single();

        if (fetchError) throw fetchError;
        return fullCliente as unknown as ClienteSelectorRow;
    },
};
