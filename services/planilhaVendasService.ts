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
    standBase?: number;
    combos?: number[];
    ordem?: number;
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
            .select('*')
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
        const estandes: Database['public']['Tables']['planilha_vendas_estandes']['Insert'][] = [];

        categorias.forEach(cat => {
            for (let i = 0; i < cat.count; i++) {
                const num = String(i + 1).padStart(2, '0');
                estandes.push({
                    config_id: configId,
                    stand_nr: `${cat.prefix} ${num}`,
                    tipo_venda: 'DISPONÍVEL',
                    opcionais_selecionados: {},
                    desconto: 0,
                    valor_pago: 0,
                });
            }
        });

        const { error: deleteError } = await supabase
            .from('planilha_vendas_estandes')
            .delete()
            .eq('config_id', configId);

        if (deleteError) throw deleteError;

        const { data, error } = await supabase
            .from('planilha_vendas_estandes')
            .insert(estandes)
            .select();

        if (error) throw error;
        return data;
    },

    /**
     * Sincroniza os estandes de uma planilha já existente com as categorias atualizadas.
     * - Insere estandes novos para categorias novas ou com count aumentado.
     * - Remove estandes excedentes de categorias com count reduzido (apenas os sem dados).
     */
    async syncEstandes(configId: string, categorias: CategoriaSetup[]) {
        const { data: existentes, error } = await supabase
            .from('planilha_vendas_estandes')
            .select('*')
            .eq('config_id', configId);

        if (error) throw error;

        const existentesMap = new Map<string, PlanilhaEstande>();
        (existentes || []).forEach(e => existentesMap.set(e.stand_nr, e));

        const toInsert: Database['public']['Tables']['planilha_vendas_estandes']['Insert'][] = [];
        const toDelete: string[] = [];

        for (const cat of categorias) {
            const existingForCat = (existentes || [])
                .filter(e => e.stand_nr.startsWith(`${cat.prefix} `))
                .sort((a, b) => a.stand_nr.localeCompare(b.stand_nr, undefined, { numeric: true }));

            // Insert missing stands
            for (let i = 0; i < cat.count; i++) {
                const standNr = `${cat.prefix} ${String(i + 1).padStart(2, '0')}`;
                if (!existentesMap.has(standNr)) {
                    toInsert.push({
                        config_id: configId,
                        stand_nr: standNr,
                        tipo_venda: 'DISPONÍVEL',
                        opcionais_selecionados: {},
                        desconto: 0,
                        valor_pago: 0,
                    });
                }
            }

            // Delete stands beyond count that have no data
            if (existingForCat.length > cat.count) {
                const excedentes = existingForCat.slice(cat.count);
                excedentes.forEach(e => {
                    const isEmpty =
                        !e.cliente_id &&
                        !e.cliente_nome_livre &&
                        e.tipo_venda === 'DISPONÍVEL' &&
                        (!e.opcionais_selecionados || Object.keys(e.opcionais_selecionados as object).length === 0);
                    if (isEmpty) toDelete.push(e.id);
                });
            }
        }

        if (toInsert.length > 0) {
            const { error: insertError } = await supabase
                .from('planilha_vendas_estandes')
                .insert(toInsert);
            if (insertError) throw insertError;
        }

        if (toDelete.length > 0) {
            const { error: deleteError } = await supabase
                .from('planilha_vendas_estandes')
                .delete()
                .in('id', toDelete);
            if (deleteError) throw deleteError;
        }

        return { inserted: toInsert.length, deleted: toDelete.length };
    },
};
