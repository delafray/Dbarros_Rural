import { supabase } from './supabaseClient';
import { Database, Json } from '../database.types';

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
    is_stand?: boolean; // false = não é stand (ex: merchandising) — ignora na contagem de stands
    // Área Livre
    tipo_precificacao?: 'fixo' | 'area_livre'; // default = 'fixo'
    preco_m2?: number;          // preço/m² de referência (centavos) — só area_livre
    combos_adicionais?: number[]; // adicional fixo por combo (centavos) — só area_livre
    precos_fixados?: boolean;       // true = preços travados, não recalcular automaticamente
}

// Extensão com campos de área livre (adicionados pela migration 20260310000002)
export type PlanilhaEstandeAL = PlanilhaEstande & {
    area_m2?: number | null;
    preco_m2_override?: number | null;
    total_override?: number | null;
    combo_overrides?: Record<string, number> | null;
};

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

        // RPC transacional (migration 20260702000001): DELETE + INSERT em uma
        // única transação — falha no meio não apaga mais os estandes existentes.
        const { data, error } = await (supabase as any).rpc('regenerate_estandes', {
            p_config_id: configId,
            p_stand_nrs: estandes.map(e => e.stand_nr),
        });

        if (error) throw error;
        return (data ?? []) as PlanilhaEstande[];
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
                // Remove-os apenas se estiverem sem dados na planilha principal (ignora campos de AL)
                const hasALData = e.area_m2 != null || e.preco_m2_override != null || e.total_override != null ||
                    (e.combo_overrides != null && typeof e.combo_overrides === 'object' && Object.keys(e.combo_overrides as Record<string, unknown>).length > 0);
                const isEmpty =
                    !e.cliente_id &&
                    !e.cliente_nome_livre &&
                    (!e.tipo_venda || e.tipo_venda === 'DISPONÍVEL') &&
                    (!e.opcionais_selecionados || !Object.values(e.opcionais_selecionados as Record<string, string>).some(v => !!v)) &&
                    !hasALData;
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

    // ── Área Livre ──────────────────────────────────────────────

    /** Busca estandes de uma categoria por prefix, filtrando com ilike. */
    async getEstandesAL(configId: string, prefix: string) {
        const { data, error } = await supabase
            .from('planilha_vendas_estandes')
            .select('*')
            .eq('config_id', configId)
            .ilike('stand_nr', `${prefix} %`)
            .order('stand_nr');

        if (error) throw error;
        return (data || []) as PlanilhaEstandeAL[];
    },

    /** Salva em paralelo todos os estandes AL (area_m2, overrides). */
    async saveEstandesAL(
        estandes: Array<{
            id: string;
            area_m2: number | null;
            preco_m2_is_override: boolean;
            preco_m2: number | null;
            total_override: number | null;
            combo_overrides: Record<string, number>;
        }>,
    ) {
        const results = await Promise.all(
            estandes.map((r) =>
                supabase
                    .from('planilha_vendas_estandes')
                    .update({
                        area_m2: r.area_m2,
                        preco_m2_override: r.preco_m2_is_override ? r.preco_m2 : null,
                        total_override: r.total_override,
                        combo_overrides: Object.keys(r.combo_overrides).length > 0
                            ? (r.combo_overrides as unknown as Json)
                            : null,
                    } as any)
                    .eq('id', r.id),
            ),
        );
        const erros = results.filter((r) => r.error);
        if (erros.length > 0) {
            throw new Error(`Falha ao salvar ${erros.length} de ${estandes.length} estandes.`);
        }
    },

    /** Atualiza a lista de categorias_config em planilha_configuracoes. */
    async saveCategoriasConfig(configId: string, categorias: CategoriaSetup[]) {
        const { error } = await supabase
            .from('planilha_configuracoes')
            .update({ categorias_config: categorias as unknown as Json })
            .eq('id', configId);
        if (error) throw error;
    },

    /** Desmarca uma categoria como area_livre, voltando para 'fixo'. */
    async unmarkAreaLivre(configId: string, categorias: CategoriaSetup[], tag: string) {
        const updatedCats = categorias.map((c) =>
            c.tag === tag
                ? { ...c, tipo_precificacao: 'fixo' as const, preco_m2: undefined, combos_adicionais: undefined, comboNames: undefined }
                : c,
        );
        await planilhaVendasService.saveCategoriasConfig(configId, updatedCats);
        return updatedCats;
    },
};
