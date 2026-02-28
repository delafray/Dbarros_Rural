import { supabase } from './supabaseClient';
import { Database } from '../database.types';

export type Cliente = Database['public']['Tables']['clientes']['Row'];
export type ClienteComContatos = Cliente & {
    contatos?: Array<{ telefone: string | null; principal: boolean | null }>;
};

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
    }
};
