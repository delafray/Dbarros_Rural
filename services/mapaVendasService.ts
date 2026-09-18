import { supabase } from './supabaseClient';
import type { EstandeMapa, MapaPublicado } from '../utils/mapaCalc';

const BUCKET_FUNDO = 'edicao-docs';
/** Assinatura do fundo: 24 h; renova 1 h antes de vencer (só a equipe vê o mapa; a URL não é adivinhável). */
export const FUNDO_ASSINATURA_S = 24 * 3600;
const FUNDO_MARGEM_S = 3600;
const PREFIXO_CACHE_FUNDO = 'mapa-fundo-url:';

export function chaveCacheFundo(path: string, versao?: string | null): string {
    return `${PREFIXO_CACHE_FUNDO}${path}|${versao ?? ''}`;
}

function lerCacheFundo(chave: string, agora: number): string | null {
    try {
        const raw = globalThis.localStorage?.getItem(chave);
        if (!raw) return null;
        const c = JSON.parse(raw) as { url?: unknown; exp?: unknown };
        return typeof c.url === 'string' && typeof c.exp === 'number' && c.exp > agora ? c.url : null;
    } catch {
        return null; // storage bloqueado/corrompido: segue sem cache
    }
}

function gravarCacheFundo(chave: string, url: string, exp: number): void {
    try {
        globalThis.localStorage?.setItem(chave, JSON.stringify({ url, exp }));
    } catch {
        /* sem espaço ou storage bloqueado: só perde o cache */
    }
}
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

    /**
     * URL assinada do fundo. A URL é guardada em localStorage pelo prazo da assinatura:
     * uma URL nova a cada abertura (token diferente) fazia o navegador baixar o PNG
     * (1 MB) toda vez; com a MESMA URL o cache HTTP do navegador passa a valer.
     * `versao` (gerado_em do mapa) entra na chave: mapa republicado → URL nova → fundo novo.
     */
    async getFundoUrl(path: string | null | undefined, versao?: string | null): Promise<string | null> {
        if (!path) return null;
        const chave = chaveCacheFundo(path, versao);
        const agora = Date.now();
        const emCache = lerCacheFundo(chave, agora);
        if (emCache) return emCache;
        const { data, error } = await supabase.storage.from(BUCKET_FUNDO).createSignedUrl(path, FUNDO_ASSINATURA_S);
        if (error || !data?.signedUrl) return null; // fundo é opcional: mapa funciona só com os polígonos
        gravarCacheFundo(chave, data.signedUrl, agora + (FUNDO_ASSINATURA_S - FUNDO_MARGEM_S) * 1000);
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
