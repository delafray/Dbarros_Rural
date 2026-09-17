import { supabase } from './supabaseClient';
import type { EstandeMapa, MapaPublicado } from '../utils/mapaCalc';

const BUCKET_FUNDO = 'edicao-docs';
const COLUNAS = 'id, edicao_id, versao, view_box, fundo_path, estandes, gerado_em';

export interface PublicarMapaInput {
    edicaoId: string;
    versao: string;
    viewBox: string;
    estandes: EstandeMapa[];
    fundoPath?: string | null;
}

/**
 * Acesso à tabela planilha_mapa (migration 20260917000001) e ao fundo no storage.
 * A tabela ainda não está em database.types.ts (gerado) — por isso o cast em `from`.
 */
export const mapaVendasService = {
    async getMapaAtivo(edicaoId: string): Promise<MapaPublicado | null> {
        const { data, error } = await (supabase as any)
            .from('planilha_mapa')
            .select(COLUNAS)
            .eq('edicao_id', edicaoId)
            .eq('ativo', true)
            .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return { ...data, estandes: Array.isArray(data.estandes) ? data.estandes : [] } as MapaPublicado;
    },

    async getFundoUrl(path: string | null | undefined): Promise<string | null> {
        if (!path) return null;
        const { data, error } = await supabase.storage.from(BUCKET_FUNDO).createSignedUrl(path, 3600);
        if (error || !data?.signedUrl) return null; // fundo é opcional: mapa funciona só com os polígonos
        return data.signedUrl;
    },

    /** Publica um mapa novo: desativa o ativo anterior e insere o novo. Só master (RLS). */
    async publicarMapa(input: PublicarMapaInput): Promise<MapaPublicado> {
        if (!input.estandes.length) throw new Error('Mapa sem estandes.');
        const { error: offError } = await (supabase as any)
            .from('planilha_mapa')
            .update({ ativo: false })
            .eq('edicao_id', input.edicaoId)
            .eq('ativo', true);
        if (offError) throw offError;

        const { data, error } = await (supabase as any)
            .from('planilha_mapa')
            .insert({
                edicao_id: input.edicaoId,
                versao: input.versao,
                ativo: true,
                view_box: input.viewBox,
                fundo_path: input.fundoPath ?? `${input.edicaoId}/mapa-fundo.png`,
                estandes: input.estandes,
            })
            .select(COLUNAS)
            .single();
        if (error) throw error;
        return data as MapaPublicado;
    },
};
