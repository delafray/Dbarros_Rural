import { supabase } from './supabaseClient';

export interface Atendimento {
    id: string;
    edicao_id: string;
    cliente_id: string | null;
    cliente_nome: string | null;
    contato_id: string | null;
    contato_nome: string | null;
    telefone: string | null;
    probabilidade: number | null;
    data_retorno: string | null;
    ultima_obs: string | null;
    ultima_obs_at: string | null;
    resolvido: boolean;
    created_at: string;
    updated_at: string;
    user_id?: string | null;
    // Joined via query
    clientes?: {
        razao_social: string | null;
        nome_completo: string | null;
        nome_fantasia: string | null;
        tipo_pessoa: string | null;
        contatos?: Array<{ id: string; nome: string | null; telefone: string | null; email: string | null; principal: boolean | null }>;
    } | null;
    contatos?: { id: string; nome: string | null; telefone: string | null; email: string | null; principal: boolean | null } | null;
    eventos_edicoes?: { id: string; titulo: string; eventos: { nome: string } | null } | null;
    users?: { name: string | null } | null;
}

export interface AtendimentoHistorico {
    id: string;
    atendimento_id: string;
    descricao: string;
    probabilidade: number | null;
    data_retorno: string | null;
    resolvido: boolean | null;
    user_id: string | null;
    created_at: string;
    // Joined
    users?: { name: string | null } | null;
}

export type AtendimentoInsert = Omit<Atendimento, 'id' | 'created_at' | 'updated_at' | 'clientes' | 'contatos' | 'users'>;
export type HistoricoInsert = Omit<AtendimentoHistorico, 'id' | 'created_at'>;

export const atendimentosService = {
    /** Lista todos os atendimentos de uma edição com join de clientes/contatos */
    async getByEdicao(edicaoId: string): Promise<Atendimento[]> {
        const { data, error } = await supabase
            .from('atendimentos')
            .select('*, clientes(razao_social, nome_completo, nome_fantasia, tipo_pessoa), contatos(nome, telefone, email), users(name)')
            .eq('edicao_id', edicaoId)
            .order('probabilidade', { ascending: false })
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return (data as unknown as any[] || []).map(a => ({
            ...a,
            resolvido: !!a.resolvido
        })) as Atendimento[];
    },

    /** Lista todos os atendimentos pendentes de retorno (para o dashboard) */
    async getPendingRetornos(): Promise<Atendimento[]> {
        const { data, error } = await (supabase
            .from('atendimentos')
            .select(`
                *, 
                clientes(
                    razao_social, 
                    nome_completo, 
                    nome_fantasia, 
                    tipo_pessoa,
                    contatos(id, nome, telefone, email, principal)
                ), 
                contatos(id, nome, telefone, email, principal),
                eventos_edicoes(id, titulo, eventos(nome)),
                users(name)
            `) as any)
            .or('resolvido.eq.false,resolvido.is.null')
            .not('data_retorno', 'is', null)
            .order('data_retorno', { ascending: true });

        if (error) throw error;
        return (data as unknown as any[] || []).map(a => ({
            ...a,
            resolvido: !!a.resolvido
        })) as Atendimento[];
    },

    /** Cria um novo atendimento */
    async create(data: AtendimentoInsert): Promise<Atendimento> {
        const { data: inserted, error } = await supabase
            .from('atendimentos')
            .insert({ ...data, updated_at: new Date().toISOString() })
            .select('*, clientes(razao_social, nome_completo, nome_fantasia), contatos(nome, telefone), users(name)')
            .single();

        if (error) throw error;
        return inserted as any as Atendimento;
    },

    /** Atualiza campos de um atendimento */
    async update(id: string, data: Partial<AtendimentoInsert>): Promise<void> {
        const updatePayload: any = { ...data, updated_at: new Date().toISOString() };

        // Se estivermos definindo uma data de retorno, desmarca como resolvido
        if (data.data_retorno) {
            updatePayload.resolvido = false;
        }

        const { error } = await supabase
            .from('atendimentos')
            .update(updatePayload)
            .eq('id', id);

        if (error) throw error;
    },

    /** Remove um atendimento (cascade deletes histórico) */
    async delete(id: string): Promise<void> {
        const { error } = await supabase.from('atendimentos').delete().eq('id', id);
        if (error) throw error;
    },

    /** Lista todo o histórico de um atendimento (mais recente primeiro) */
    async getHistorico(atendimentoId: string): Promise<AtendimentoHistorico[]> {
        const { data, error } = await supabase
            .from('atendimentos_historico')
            .select('*, users(name)')
            .eq('atendimento_id', atendimentoId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data as any || []) as AtendimentoHistorico[];
    },

    /** Adiciona nova entrada no histórico e atualiza o snapshot na tabela pai */
    async addHistorico(entry: HistoricoInsert): Promise<void> {
        const { data: hist, error: histError } = await supabase
            .from('atendimentos_historico')
            .insert(entry)
            .select()
            .single();

        if (histError) throw histError;

        // Atualiza snapshot desnormalizado no atendimento pai
        const updatePayload: Record<string, unknown> = {
            ultima_obs: entry.descricao,
            ultima_obs_at: hist.created_at,
            updated_at: new Date().toISOString(),
            user_id: entry.user_id,
        };
        if (entry.probabilidade !== null && entry.probabilidade !== undefined) {
            updatePayload.probabilidade = entry.probabilidade;
        }
        if (entry.data_retorno !== undefined) {
            updatePayload.data_retorno = entry.data_retorno;
            // Se tem data de retorno e não foi passado resolvido: true explicitamente, 
            // garante que volte para o dashboard (resolvido = false)
            if (entry.data_retorno !== null && (entry.resolvido === null || entry.resolvido === undefined)) {
                updatePayload.resolvido = false;
            }
        }
        if (entry.resolvido !== null && entry.resolvido !== undefined) {
            updatePayload.resolvido = entry.resolvido;
        }

        const { error: updateError } = await supabase
            .from('atendimentos')
            .update(updatePayload)
            .eq('id', entry.atendimento_id);

        if (updateError) throw updateError;
    },

    /** Retorna o nome de exibição de um atendimento (cliente cadastrado ou nome livre) */
    getNomeExibicao(a: Atendimento): string {
        if (a.clientes) {
            if (a.clientes.tipo_pessoa === 'J') {
                return a.clientes.razao_social || a.clientes.nome_fantasia || a.clientes.nome_completo || a.cliente_nome || '—';
            }
            return a.clientes.nome_completo || a.clientes.nome_fantasia || a.clientes.razao_social || a.cliente_nome || '—';
        }
        return a.cliente_nome || '—';
    },

    /** Retorna o nome do contato para exibição (inteligente: vinculado, principal ou único) */
    getContatoExibicao(a: Atendimento): string {
        // 1. Se tem contato vinculado diretamente no atendimento
        if (a.contatos?.nome) return a.contatos.nome;
        if (a.contato_nome) return a.contato_nome;

        // 2. Se não tem, busca nos contatos do cliente
        if (a.clientes?.contatos && a.clientes.contatos.length > 0) {
            const principal = a.clientes.contatos.find(c => c.principal);
            if (principal?.nome) return principal.nome;

            // Se só tem um contato, usa ele
            if (a.clientes.contatos.length === 1 && a.clientes.contatos[0].nome) {
                return a.clientes.contatos[0].nome;
            }
        }

        return '—';
    },

    /** Formata telefone para a máscara (xx) x xxxx-xxxx ou (xx) xxxx-xxxx */
    formatTelefone(value: string | null | undefined): string {
        if (!value) return '—';
        const cleaned = value.replace(/\D/g, '');

        if (cleaned.length === 11) {
            return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 3)} ${cleaned.substring(3, 7)}-${cleaned.substring(7)}`;
        }
        if (cleaned.length === 10) {
            return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
        }

        return value; // Retorna original se não bater com padrões conhecidos
    },

    /** Retorna o telefone para exibição (seguindo a mesma lógica do contato) */
    getTelefoneExibicao(a: Atendimento): string {
        let rawTel = '—';
        // 1. Vinculado diretamente
        if (a.contatos?.telefone) rawTel = a.contatos.telefone;
        else if (a.telefone) rawTel = a.telefone;

        // 2. Fallback cliente
        else if (a.clientes?.contatos && a.clientes.contatos.length > 0) {
            const principal = a.clientes.contatos.find(c => c.principal);
            if (principal?.telefone) rawTel = principal.telefone;
            else if (a.clientes.contatos.length === 1 && a.clientes.contatos[0].telefone) {
                rawTel = a.clientes.contatos[0].telefone;
            }
        }

        return this.formatTelefone(rawTel);
    },

    /** Limita texto com reticências */
    limitText(text: string | null | undefined, limit: number): string {
        if (!text) return '—';
        if (text.length <= limit) return text;
        return text.substring(0, limit) + '...';
    },

    /** Busca outras edições de eventos (exceto a atual) para importação, ordenadas pela data de início DESC */
    async getOtherEditions(excludeEdicaoId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('eventos_edicoes')
            .select('*, eventos(nome)')
            .neq('id', excludeEdicaoId)
            .order('data_inicio', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    /** Importa atendimentos de outras edições para a edição atual com desduplicação */
    async importFromEditions(targetEdicaoId: string, sourceEdicaoIds: string[]): Promise<void> {
        // 1. Busca atendimentos das fontes
        const { data: sourceData, error: sourceError } = await supabase
            .from('atendimentos')
            .select('*')
            .in('edicao_id', sourceEdicaoIds);

        if (sourceError) throw sourceError;
        if (!sourceData || sourceData.length === 0) return;

        // 2. Busca atendimentos atuais para evitar duplicatas
        const { data: currentData, error: currentError } = await supabase
            .from('atendimentos')
            .select('cliente_id, cliente_nome')
            .eq('edicao_id', targetEdicaoId);

        if (currentError) throw currentError;

        const alreadyExists = new Set<string>();
        currentData?.forEach(a => {
            if (a.cliente_id) alreadyExists.add(`id:${a.cliente_id}`);
            else if (a.cliente_nome) alreadyExists.add(`nome:${a.cliente_nome.toLowerCase().trim()}`);
        });

        // 3. Processa e desduplica o sourceData (pode haver o mesmo cliente em edições diferentes)
        const toAdd = new Map<string, any>();
        sourceData.forEach(a => {
            const key = a.cliente_id ? `id:${a.cliente_id}` : `nome:${(a.cliente_nome || '').toLowerCase().trim()}`;
            if (!alreadyExists.has(key) && !toAdd.has(key)) {
                toAdd.set(key, a);
            }
        });

        if (toAdd.size === 0) return;

        // 4. Prepara inserts
        const inserts: AtendimentoInsert[] = Array.from(toAdd.values()).map(a => ({
            edicao_id: targetEdicaoId,
            cliente_id: a.cliente_id,
            cliente_nome: a.cliente_nome,
            contato_id: a.contato_id,
            contato_nome: a.contato_nome,
            telefone: a.telefone,
            probabilidade: null, // Reseta probabilidade na importação
            data_retorno: null,
            ultima_obs: 'Importado de outra edição',
            ultima_obs_at: new Date().toISOString(),
            resolvido: false,
        }));

        // 5. Inserção em massa
        const { data: inserted, error: insertError } = await supabase
            .from('atendimentos')
            .insert(inserts)
            .select('id');

        if (insertError) throw insertError;

        // 6. Registra histórico inicial para os importados
        const { data: { user } } = await supabase.auth.getUser();
        const histories: HistoricoInsert[] = (inserted || []).map(a => ({
            atendimento_id: a.id,
            descricao: 'Atendimento importado de edição anterior.',
            probabilidade: null,
            data_retorno: null,
            resolvido: false,
            user_id: user?.id || null,
        }));

        if (histories.length > 0) {
            await supabase.from('atendimentos_historico').insert(histories);
        }
    },
};

/** Mapa de cor de fundo por probabilidade (0-100, de 10 em 10) */
export const probBgColor: Record<number, string> = {
    0: '#FFC7CE',
    10: '#FFB3B3',
    20: '#FFB347',
    30: '#FFC966',
    40: '#FFE066',
    50: '#FFFACC',
    60: '#E8F5C8',
    70: '#D4EDAA',
    80: '#B7E4A0',
    90: '#8ED88A',
    100: '#C6EFCE',
};

export const probTextColor: Record<number, string> = {
    0: '#9C0006',
    10: '#9C0006',
    20: '#7B3800',
    30: '#6B3A00',
    40: '#5C4600',
    50: '#636003',
    60: '#3A5E00',
    70: '#2E5300',
    80: '#1F4A00',
    90: '#155A12',
    100: '#276221',
};
