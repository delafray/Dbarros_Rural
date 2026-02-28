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
    },

    /** Propaga rename do item para opcionais_selecionados nos estandes e origem_ref nas configs de imagem */
    async renameItemReferences(oldNome: string, newNome: string): Promise<void> {
        const { error } = await supabase.rpc('rename_opcional_item', {
            old_nome: oldNome,
            new_nome: newNome,
        });
        if (error) throw error;
    },

    /** Retorna lista de planilhas (edições) que têm este item em opcionais_ativos */
    async getPlanilhasUsingItem(itemId: string): Promise<{ titulo: string; evento: string }[]> {
        const { data, error } = await supabase
            .from('planilha_config')
            .select('edicao_id, eventos_edicoes(titulo, eventos(nome))')
            .contains('opcionais_ativos', [itemId]) as any;

        if (error) throw error;
        return (data || []).map((row: any) => ({
            titulo: row.eventos_edicoes?.titulo || '—',
            evento: row.eventos_edicoes?.eventos?.nome || '—',
        }));
    }
};
