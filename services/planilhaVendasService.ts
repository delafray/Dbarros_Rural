import { supabase } from './supabaseClient';
import { Database } from '../database.types';

export type PlanilhaConfig = Database['public']['Tables']['planilha_configuracoes']['Row'];
export type PlanilhaConfigInsert = Database['public']['Tables']['planilha_configuracoes']['Insert'];
export type PlanilhaEstande = Database['public']['Tables']['planilha_vendas_estandes']['Row'];

export interface CategoriaSetup {
    tag: string;
    prefix: string;
    cor: string;
    count: number;
    standBase: number;
    combos: number[] | Record<string, number>;
}

export const planilhaVendasService = {
    async getConfig(edicaoId: string) {
        const { data, error } = await supabase
            .from('planilha_configuracoes')
            .select('*')
            .eq('edicao_id', edicaoId)
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    async saveConfig(config: PlanilhaConfigInsert) {
        const { data, error } = await supabase
            .from('planilha_configuracoes')
            .upsert(config)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getEstandes(configId: string) {
        const { data, error } = await supabase
            .from('planilha_vendas_estandes')
            .select('*, clientes(nome_fantasia, razao_social)')
            .eq('config_id', configId)
            .order('stand_nr');

        if (error) throw error;
        return data || [];
    },

    async updateEstande(id: string, updates: Partial<PlanilhaEstande>) {
        const { data, error } = await supabase
            .from('planilha_vendas_estandes')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async generateEstandes(configId: string, categorias: CategoriaSetup[]) {
        const estandes: any[] = [];

        categorias.forEach(cat => {
            for (let i = 0; i < cat.count; i++) {
                // Formato: "<prefix> <número com zero à esquerda>" → ex: "Naming 01", "Naming 16"
                const num = String(i + 1).padStart(2, '0');
                const standNr = `${cat.prefix} ${num}`;

                estandes.push({
                    config_id: configId,
                    stand_nr: standNr,
                    tipo_venda: 'DISPONÍVEL',
                    opcionais_selecionados: {},
                    desconto: 0,
                    valor_pago: 0
                });
            }
        });

        // Delete existing ones first
        const { error: deleteError } = await supabase
            .from('planilha_vendas_estandes')
            .delete()
            .eq('config_id', configId);

        if (deleteError) throw deleteError;

        // Insert new ones
        const { data, error } = await supabase
            .from('planilha_vendas_estandes')
            .insert(estandes)
            .select();

        if (error) throw error;
        return data;
    }
};
