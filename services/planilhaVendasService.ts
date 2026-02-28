import { supabase } from './supabaseClient';
import { Database } from '../database.types';

export type PlanilhaConfig = Database['public']['Tables']['planilha_configuracoes']['Row'];
export type PlanilhaConfigInsert = Database['public']['Tables']['planilha_configuracoes']['Insert'];
export type PlanilhaEstande = Database['public']['Tables']['planilha_vendas_estandes']['Row'];
export type PlanilhaEstandeInsert = Database['public']['Tables']['planilha_vendas_estandes']['Insert'];

export interface CategoriaSetup {
    tag: string;
    prefix: string;
    cor: string;
    count: number;
    standBase?: number;
    combos?: number[];
    comboNames?: string[]; // Nomes customizados pros combos (usualmente salvo só no index 0)
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
        const estandes: PlanilhaEstandeInsert[] = [];

        categorias.forEach(cat => {
            for (let i = 1; i <= cat.count; i++) {
                estandes.push({
                    config_id: configId,
                    stand_nr: planilhaVendasService.buildStandNr(cat, i),
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
     * Gera o stand_nr de uma categoria para um número (1-indexed).
     * Regra: se tem prefix → "PREFIX NN"; se não tem → "TAG NN"
     */
    buildStandNr(cat: CategoriaSetup, n: number): string {
        const id = (cat.prefix || cat.tag || '').trim();
        const num = String(n).padStart(2, '0');
        return id ? `${id} ${num}` : num;
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

        const toInsert: PlanilhaEstandeInsert[] = [];
        const toDelete: string[] = [];
        const validStandNrs = new Set<string>();

        // Mapeia todos os estandes que DEVEM existir, e decide quem será inserido
        for (const cat of categorias) {
            for (let i = 1; i <= cat.count; i++) {
                const standNr = planilhaVendasService.buildStandNr(cat, i);
                validStandNrs.add(standNr);
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
        }

        // Identifica estandes EXISTENTES que não estão no mapeamento de válidos (são órfãos/excedentes)
        (existentes || []).forEach(e => {
            if (!validStandNrs.has(e.stand_nr)) {
                // Remove-os apenas se estiverem sem dados
                const isEmpty =
                    !e.cliente_id &&
                    !e.cliente_nome_livre &&
                    (!e.tipo_venda || e.tipo_venda === 'DISPONÍVEL') &&
                    (!e.opcionais_selecionados || !Object.values(e.opcionais_selecionados as Record<string, string>).some(v => !!v));
                if (isEmpty) {
                    toDelete.push(e.id);
                }
            }
        });

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
