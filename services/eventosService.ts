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
        if (user) payload.user_id = user.id;

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

    async getEdicoes(eventoId: string) {
        const { data, error } = await supabase
            .from('eventos_edicoes')
            .select('*')
            .eq('evento_id', eventoId)
            .order('ano', { ascending: false });

        if (error) throw error;
        return data as EventoEdicao[];
    },

    async saveEdicao(edicao: Partial<EventoEdicao>) {
        const { data: { user } } = await supabase.auth.getUser();

        const payload = { ...edicao };
        if (user) payload.user_id = user.id;

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
    }
};
