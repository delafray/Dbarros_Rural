import { supabase } from './supabaseClient';

export type OrigemTipo = 'stand_categoria' | 'item_opcional' | 'avulso';
export type ImagemTipo = 'imagem' | 'logo';
export type AvulsoStatus = 'pendente' | 'solicitado' | 'recebido';
export type StandStatus = 'pendente' | 'solicitado' | 'completo';
export type ComputedStatus = 'sem_config' | 'pendente' | 'solicitado' | 'completo';

export interface ItemRecebimento {
    id: string;
    estande_id: string;
    imagem_config_id: string;
    recebido: boolean;
    atualizado_em: string;
}

// estandeId → { imagemConfigId → recebido }
export type RecebimentosMap = Record<string, Record<string, boolean>>;

export interface ImagemConfig {
    id: string;
    edicao_id: string;
    origem_tipo: OrigemTipo;
    origem_ref: string;
    tipo: ImagemTipo;
    descricao: string;
    dimensoes: string | null;
    avulso_status: AvulsoStatus;
    avulso_obs: string | null;
    criado_em: string;
}

export interface StandImagemStatus {
    id: string;
    estande_id: string;
    status: StandStatus;
    observacoes: string | null;
    atualizado_em: string;
    pendente_em: string | null;
    solicitado_em: string | null;
    completo_em: string | null;
}

export interface ConfigsByOrigem {
    stand_categoria: Set<string>;
    item_opcional: Set<string>;
}

// Tabelas novas ainda não refletidas em database.types.ts — cast necessário
const db = supabase as any;

export const imagensService = {
    // ── Configuração ────────────────────────────────────────────

    async getConfig(edicaoId: string): Promise<ImagemConfig[]> {
        const { data, error } = await db
            .from('edicao_imagens_config')
            .select('*')
            .eq('edicao_id', edicaoId)
            .order('criado_em');
        if (error) throw error;
        return (data || []) as ImagemConfig[];
    },

    async addConfig(entry: {
        edicao_id: string;
        origem_tipo: OrigemTipo;
        origem_ref: string;
        tipo: ImagemTipo;
        descricao: string;
        dimensoes?: string | null;
    }): Promise<ImagemConfig> {
        const { data, error } = await db
            .from('edicao_imagens_config')
            .insert({ ...entry, dimensoes: entry.dimensoes ?? null })
            .select()
            .single();
        if (error) throw error;
        return data as ImagemConfig;
    },

    async removeConfig(id: string): Promise<void> {
        const { error } = await db
            .from('edicao_imagens_config')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async updateConfig(id: string, fields: {
        tipo: ImagemTipo;
        descricao: string;
        dimensoes: string | null;
    }): Promise<ImagemConfig> {
        const { data, error } = await db
            .from('edicao_imagens_config')
            .update(fields)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as ImagemConfig;
    },

    // Atualiza origem_ref quando uma tag de categoria é renomeada
    async updateOrigemRef(edicaoId: string, oldRef: string, newRef: string): Promise<void> {
        const { error } = await db
            .from('edicao_imagens_config')
            .update({ origem_ref: newRef })
            .eq('edicao_id', edicaoId)
            .eq('origem_tipo', 'stand_categoria')
            .eq('origem_ref', oldRef);
        if (error) throw error;
    },

    async updateAvulsoStatus(id: string, status: AvulsoStatus, obs?: string): Promise<void> {
        const { error } = await db
            .from('edicao_imagens_config')
            .update({ avulso_status: status, avulso_obs: obs ?? null })
            .eq('id', id);
        if (error) throw error;
    },

    // ── Status por estande ───────────────────────────────────────

    async getStatusByConfig(configId: string): Promise<Record<string, StandImagemStatus>> {
        const { data: estandes } = await supabase
            .from('planilha_vendas_estandes')
            .select('id')
            .eq('config_id', configId);

        if (!estandes || estandes.length === 0) return {};

        const estandeIds = estandes.map((e) => e.id);
        const { data, error } = await db
            .from('stand_imagens_status')
            .select('*')
            .in('estande_id', estandeIds);

        if (error) throw error;

        const map: Record<string, StandImagemStatus> = {};
        ((data || []) as StandImagemStatus[]).forEach((s) => {
            map[s.estande_id] = s;
        });
        return map;
    },

    async upsertStatus(
        estandeId: string,
        status: StandStatus,
        obs?: string,
        existingTimestamps?: { pendente_em?: string | null; solicitado_em?: string | null; completo_em?: string | null },
        clearTimestamps?: Array<'pendente_em' | 'solicitado_em' | 'completo_em'>,
    ): Promise<void> {
        const now = new Date().toISOString();
        const tsKey = `${status}_em` as 'pendente_em' | 'solicitado_em' | 'completo_em';
        // Preserva o timestamp se ja foi registrado — so grava na primeira vez
        const tsValue = existingTimestamps?.[tsKey] ?? now;
        const payload: Record<string, unknown> = {
            estande_id: estandeId,
            status,
            observacoes: obs ?? null,
            atualizado_em: now,
            [tsKey]: tsValue,
        };
        // Limpa timestamps de status superiores ao reverter
        if (clearTimestamps) {
            clearTimestamps.forEach((k) => { payload[k] = null; });
        }
        const { error } = await db
            .from('stand_imagens_status')
            .upsert(payload, { onConflict: 'estande_id' });
        if (error) throw error;
    },

    // ── Helper: monta set indexado por origem ────────────────────

    buildConfigsByOrigem(configs: ImagemConfig[]): ConfigsByOrigem {
        const stand_categoria = new Set<string>();
        const item_opcional = new Set<string>();
        configs.forEach((c) => {
            if (c.origem_tipo === 'stand_categoria') stand_categoria.add(c.origem_ref);
            else if (c.origem_tipo === 'item_opcional') item_opcional.add(c.origem_ref);
        });
        return { stand_categoria, item_opcional };
    },

    // ── Recebimentos individuais por item ────────────────────────

    async getRecebimentos(configId: string): Promise<RecebimentosMap> {
        const { data: estandes } = await supabase
            .from('planilha_vendas_estandes')
            .select('id')
            .eq('config_id', configId);

        if (!estandes || estandes.length === 0) return {};

        const ids = estandes.map((e) => e.id);
        const { data, error } = await db
            .from('stand_imagem_recebimentos')
            .select('*')
            .in('estande_id', ids);

        if (error) throw error;

        const map: RecebimentosMap = {};
        ((data || []) as ItemRecebimento[]).forEach((r) => {
            if (!map[r.estande_id]) map[r.estande_id] = {};
            map[r.estande_id][r.imagem_config_id] = r.recebido;
        });
        return map;
    },

    async getRecebimentosByEstande(estandeId: string): Promise<Record<string, boolean>> {
        const { data, error } = await db
            .from('stand_imagem_recebimentos')
            .select('imagem_config_id, recebido')
            .eq('estande_id', estandeId);
        if (error) throw error;
        const map: Record<string, boolean> = {};
        ((data || []) as { imagem_config_id: string; recebido: boolean }[]).forEach((r) => {
            map[r.imagem_config_id] = r.recebido;
        });
        return map;
    },

    async setRecebimento(
        estandeId: string,
        imagemConfigId: string,
        recebido: boolean,
    ): Promise<void> {
        const { error } = await db
            .from('stand_imagem_recebimentos')
            .upsert(
                {
                    estande_id: estandeId,
                    imagem_config_id: imagemConfigId,
                    recebido,
                    atualizado_em: new Date().toISOString(),
                },
                { onConflict: 'estande_id,imagem_config_id' },
            );
        if (error) throw error;
    },

    // Computa status geral a partir dos recebimentos individuais
    computeStandStatus(
        estandeRecebimentos: Record<string, boolean>,
        applicableConfigIds: string[],
    ): StandStatus {
        if (applicableConfigIds.length === 0) return 'pendente';
        const received = applicableConfigIds.filter((id) => estandeRecebimentos[id]).length;
        if (received === applicableConfigIds.length) return 'completo';
        if (received > 0) return 'solicitado';
        return 'pendente';
    },

    // ── Helper: status computado de um estande ───────────────────

    computeStatus(
        opcionaisSelecionados: Record<string, string> | null,
        categoryTag: string | undefined,
        configsByOrigem: ConfigsByOrigem,
        manualStatus: StandStatus | undefined,
    ): ComputedStatus {
        const hasCategoria = categoryTag
            ? configsByOrigem.stand_categoria.has(categoryTag)
            : false;

        const sel = opcionaisSelecionados || {};
        const hasOpcional = Object.entries(sel).some(
            ([nome, val]) =>
                (val === 'x' || val === '*') &&
                configsByOrigem.item_opcional.has(nome),
        );

        if (!hasCategoria && !hasOpcional) return 'sem_config';
        if (manualStatus === 'solicitado') return 'solicitado';
        if (manualStatus === 'completo') return 'completo';
        return 'pendente';
    },
};
