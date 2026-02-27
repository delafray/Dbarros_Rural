import { supabase } from './supabaseClient';

export type TarefaStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
export type TarefaPrioridade = 'baixa' | 'media' | 'alta' | 'urgente';

export interface Tarefa {
    id: string;
    edicao_id: string;
    titulo: string;
    descricao: string | null;
    status: TarefaStatus;
    prioridade: TarefaPrioridade;
    data_prazo: string | null;
    user_id: string | null;
    responsavel_id: string | null;
    ultima_obs: string | null;
    ultima_obs_at: string | null;
    created_at: string;
    updated_at: string;
    // Joined
    users?: { name: string | null } | null;
    responsavel?: { name: string | null } | null;
    eventos_edicoes?: { titulo: string; eventos: { nome: string } | null } | null;
}

export interface TarefaHistorico {
    id: string;
    tarefa_id: string;
    descricao: string;
    status_anterior: string | null;
    status_novo: string | null;
    user_id: string | null;
    created_at: string;
    // Joined
    users?: { name: string | null } | null;
}

export type TarefaInsert = Omit<Tarefa, 'id' | 'created_at' | 'updated_at' | 'users' | 'responsavel'>;
export type HistoricoTarefaInsert = Omit<TarefaHistorico, 'id' | 'created_at' | 'users'>;

export const tarefasService = {
    /** Lista todas as tarefas de uma edição */
    async getByEdicao(edicaoId: string): Promise<Tarefa[]> {
        const { data, error } = await supabase
            .from('tarefas')
            .select('*, users:user_id(name), responsavel:responsavel_id(name), eventos_edicoes(titulo, eventos(nome))')
            .eq('edicao_id', edicaoId)
            .order('prioridade', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data as any[] || []) as Tarefa[];
    },

    /** Lista tarefas de múltiplas edições (modo "todos os eventos ativos") */
    async getByEdicoes(edicaoIds: string[]): Promise<Tarefa[]> {
        if (edicaoIds.length === 0) return [];
        const { data, error } = await supabase
            .from('tarefas')
            .select('*, users:user_id(name), responsavel:responsavel_id(name), eventos_edicoes(titulo, eventos(nome))')
            .in('edicao_id', edicaoIds)
            .order('prioridade', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data as any[] || []) as Tarefa[];
    },

    /** Cria nova tarefa e registra entrada inicial no histórico */
    async create(data: TarefaInsert): Promise<Tarefa> {
        const { data: { user } } = await supabase.auth.getUser();

        const { data: inserted, error } = await supabase
            .from('tarefas')
            .insert({
                ...data,
                user_id: user?.id || null,
                updated_at: new Date().toISOString(),
            })
            .select('*, users:user_id(name), responsavel:responsavel_id(name)')
            .single();

        if (error) throw error;

        // Histórico inicial
        await supabase.from('tarefas_historico').insert({
            tarefa_id: inserted.id,
            descricao: 'Tarefa criada.',
            status_anterior: null,
            status_novo: data.status,
            user_id: user?.id || null,
        });

        return inserted as any as Tarefa;
    },

    /** Atualiza campos da tarefa */
    async update(id: string, data: Partial<TarefaInsert>): Promise<void> {
        const { error } = await supabase
            .from('tarefas')
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
    },

    /** Remove tarefa (cascade historico) */
    async delete(id: string): Promise<void> {
        const { error } = await supabase.from('tarefas').delete().eq('id', id);
        if (error) throw error;
    },

    /** Histórico da tarefa, mais recente primeiro */
    async getHistorico(tarefaId: string): Promise<TarefaHistorico[]> {
        const { data, error } = await supabase
            .from('tarefas_historico')
            .select('*, users:user_id(name)')
            .eq('tarefa_id', tarefaId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data as any[] || []) as TarefaHistorico[];
    },

    /** Adiciona entrada no histórico e atualiza snapshot na tarefa pai */
    async addHistorico(entry: HistoricoTarefaInsert, statusAnterior?: TarefaStatus): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();

        const { data: hist, error: histError } = await supabase
            .from('tarefas_historico')
            .insert({ ...entry, user_id: user?.id || null })
            .select()
            .single();

        if (histError) throw histError;

        // Atualiza snapshot desnormalizado
        const updatePayload: Record<string, unknown> = {
            ultima_obs: entry.descricao,
            ultima_obs_at: hist.created_at,
            updated_at: new Date().toISOString(),
        };
        if (entry.status_novo) {
            updatePayload.status = entry.status_novo;
        }

        const { error: updateError } = await supabase
            .from('tarefas')
            .update(updatePayload)
            .eq('id', entry.tarefa_id);

        if (updateError) throw updateError;
    },
};

// ── Cores por prioridade ──────────────────────────────────────
export const prioridadeBg: Record<TarefaPrioridade, string> = {
    baixa:   '#E8F5C8',
    media:   '#FFE066',
    alta:    '#FFB347',
    urgente: '#FFC7CE',
};

export const prioridadeText: Record<TarefaPrioridade, string> = {
    baixa:   '#3A5E00',
    media:   '#5C4600',
    alta:    '#7B3800',
    urgente: '#9C0006',
};

export const prioridadeLabel: Record<TarefaPrioridade, string> = {
    baixa:   'Baixa',
    media:   'Média',
    alta:    'Alta',
    urgente: 'Urgente',
};

// ── Cores por status ─────────────────────────────────────────
export const statusBg: Record<TarefaStatus, string> = {
    pendente:     '#DBEAFE',
    em_andamento: '#FEF9C3',
    concluida:    '#DCFCE7',
    cancelada:    '#F1F5F9',
};

export const statusText: Record<TarefaStatus, string> = {
    pendente:     '#1D4ED8',
    em_andamento: '#92400E',
    concluida:    '#15803D',
    cancelada:    '#64748B',
};

export const statusLabel: Record<TarefaStatus, string> = {
    pendente:     'Pendente',
    em_andamento: 'Em andamento',
    concluida:    'Concluída',
    cancelada:    'Cancelada',
};

export const PRIORIDADES: TarefaPrioridade[] = ['baixa', 'media', 'alta', 'urgente'];
export const STATUSES: TarefaStatus[] = ['pendente', 'em_andamento', 'concluida', 'cancelada'];
