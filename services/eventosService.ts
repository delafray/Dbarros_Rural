import { supabase } from './supabaseClient';
import { Database } from '../database.types';

export type Evento = Database['public']['Tables']['eventos']['Row'];
export type EventoEdicao = Database['public']['Tables']['eventos_edicoes']['Row'];

export const eventosService = {
    async getEventos() {
        const { data, error } = await supabase
            .from('eventos')
            .select('*')
            .order('nome');

        if (error) throw error;
        return data;
    },

    async getEventoById(id: string) {
        const { data, error } = await supabase
            .from('eventos')
            .select('*, eventos_edicoes(*)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async saveEvento(evento: Partial<Evento>) {
        const { data: { user } } = await supabase.auth.getUser();

        const payload = { ...evento };
        if (!evento.id && user) {
            payload.user_id = user.id;
        }

        if (evento.id) {
            const { data, error } = await supabase
                .from('eventos')
                .update(payload as any)
                .eq('id', evento.id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            const { data, error } = await supabase
                .from('eventos')
                .insert(payload as any)
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },

    async deleteEvento(id: string) {
        const { error } = await supabase
            .from('eventos')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async getActiveEdicoes() {
        const { data, error } = await supabase
            .from('eventos_edicoes')
            .select(`
                *,
                eventos ( nome )
            `)
            .eq('ativo', true);

        if (error) throw error;

        // Resolver ordenação de data_inicio no frontend para evitar problemas de colação/formato (YYYY-MM-DD vs DD/MM/YYYY)
        const parseDate = (d: string | null) => {
            if (!d) return 0;
            if (d.includes('/')) {
                const parts = d.split('/'); // DD/MM/YYYY
                if (parts.length >= 3) return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
            }
            return new Date(d).getTime() || 0;
        };

        const result = data as (EventoEdicao & { eventos: { nome: string } | null })[];
        return result.sort((a, b) => parseDate(a.data_inicio) - parseDate(b.data_inicio));
    },

    async getAllEdicoes() {
        const { data, error } = await supabase
            .from('eventos_edicoes')
            .select(`
                id, titulo, ano, created_at, proposta_comercial_path, planta_baixa_path,
                eventos ( id, nome )
            `)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return (data as any[]).sort((a, b) => {
            const nA = (a.eventos?.nome || '').toLowerCase();
            const nB = (b.eventos?.nome || '').toLowerCase();
            const cmp = nA.localeCompare(nB, 'pt-BR');
            if (cmp !== 0) return cmp;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }) as (EventoEdicao & { eventos: { id: string; nome: string } | null })[];
    },

    async getEdicoes(eventoId: string) {
        const { data, error } = await supabase
            .from('eventos_edicoes')
            .select('*')
            .eq('evento_id', eventoId)
            .order('ano', { ascending: false });

        if (error) throw error;
        return data as EventoEdicao[];
    },

    async getEdicaoById(id: string) {
        const { data, error } = await supabase
            .from('eventos_edicoes')
            .select('*, eventos(nome)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as (EventoEdicao & { eventos: { nome: string } | null });
    },

    async saveEdicao(edicao: Partial<EventoEdicao>) {
        const { data: { user } } = await supabase.auth.getUser();

        const payload = { ...edicao };
        if (!edicao.id && user) {
            payload.user_id = user.id;
        }

        if (edicao.id) {
            const { data, error } = await supabase
                .from('eventos_edicoes')
                .update(payload as any)
                .eq('id', edicao.id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            const { data, error } = await supabase
                .from('eventos_edicoes')
                .insert(payload as any)
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },

    async deleteEdicao(id: string) {
        const { error } = await supabase
            .from('eventos_edicoes')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async hasPlanilha(edicaoId: string): Promise<boolean> {
        const { data, error } = await supabase
            .from('planilha_configuracoes')
            .select('id')
            .eq('edicao_id', edicaoId)
            .maybeSingle();

        if (error) throw error;
        return !!data;
    }
};
