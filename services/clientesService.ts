import { supabase } from './supabaseClient';
import { Database } from '../database.types';

export type Cliente = Database['public']['Tables']['clientes']['Row'];

export const clientesService = {
    async getClientes() {
        const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .order('nome_fantasia');

        if (error) throw error;
        return data || [];
    },
    async getClienteById(id: string) {
        const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }
};
