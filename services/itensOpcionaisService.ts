import { supabase } from './supabaseClient';
import { Database } from '../database.types';

export type ItemOpcional = Database['public']['Tables']['itens_opcionais']['Row'];
export type ItemOpcionalInsert = Database['public']['Tables']['itens_opcionais']['Insert'];
export type ItemOpcionalUpdate = Database['public']['Tables']['itens_opcionais']['Update'];

export const itensOpcionaisService = {
    async getItens() {
        const { data, error } = await supabase
            .from('itens_opcionais')
            .select('*')
            .order('nome');

        if (error) throw error;
        return data || [];
    },

    async upsertItem(item: ItemOpcionalInsert) {
        const { data, error } = await supabase
            .from('itens_opcionais')
            .upsert(item)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteItem(id: string) {
        const { error } = await supabase
            .from('itens_opcionais')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
