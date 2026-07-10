// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck - table 'cardapio_projetos' not yet in generated types (database.types.ts)
import { supabase } from './supabaseClient';
import type { CardapioTema } from '../utils/cardapioTema';
import type { FontesA3 } from '../components/a3Duplo/a3DuploLayout';

export interface CardapioProjeto {
  id: string;
  nome: string;
  edicao_id: string | null;
  tema: Partial<CardapioTema> | null;
  fundo_banner_url: string | null;
  fundo_a4_url: string | null;
  fundo_a3_url: string | null;
  chancela_url: string | null;
  /** Tamanhos de fonte custom do A3 Duplo; null = padrão */
  fontes_a3: Partial<FontesA3> | null;
  created_at: string;
  updated_at: string;
}

export interface CardapioProjetoInput {
  nome: string;
  edicao_id?: string | null;
  tema?: Partial<CardapioTema> | null;
  fundo_banner_url?: string | null;
  fundo_a4_url?: string | null;
  fundo_a3_url?: string | null;
  chancela_url?: string | null;
  fontes_a3?: Partial<FontesA3> | null;
}

export type CardapioAssetTipo = 'fundo-banner' | 'fundo-a4' | 'fundo-a3' | 'chancela';

export interface CardapioProjetoComContagens extends CardapioProjeto {
  totalBanners: number;
  totalA4: number;
}

const BUCKET = 'cardapio-assets';

// Helper: typed query builder bypassing generated types for this new table
const table = () => supabase.from('cardapio_projetos' as never);

export const cardapioProjetosService = {
  async listar(): Promise<CardapioProjeto[]> {
    const { data, error } = await table()
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data as CardapioProjeto[]) ?? [];
  },

  /** Lista projetos com o total de banners e menus A4 de cada um. */
  async listarComContagens(): Promise<CardapioProjetoComContagens[]> {
    const [projetos, bannersRes, a4Res] = await Promise.all([
      this.listar(),
      supabase.from('cardapios' as never).select('projeto_id'),
      supabase.from('menus_a4' as never).select('projeto_id'),
    ]);

    if (bannersRes.error) throw new Error(bannersRes.error.message);
    if (a4Res.error) throw new Error(a4Res.error.message);

    const count = (rows: { projeto_id: string | null }[] | null) => {
      const map = new Map<string, number>();
      for (const r of rows ?? []) {
        if (r.projeto_id) map.set(r.projeto_id, (map.get(r.projeto_id) || 0) + 1);
      }
      return map;
    };
    const banners = count(bannersRes.data as never);
    const a4s = count(a4Res.data as never);

    return projetos.map((p) => ({
      ...p,
      totalBanners: banners.get(p.id) || 0,
      totalA4: a4s.get(p.id) || 0,
    }));
  },

  async buscar(id: string): Promise<CardapioProjeto | null> {
    const { data, error } = await table()
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as CardapioProjeto;
  },

  async criar(input: CardapioProjetoInput): Promise<CardapioProjeto> {
    const { data, error } = await table()
      .insert([input])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as CardapioProjeto;
  },

  async atualizar(id: string, input: Partial<CardapioProjetoInput>): Promise<CardapioProjeto> {
    const { data, error } = await table()
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as CardapioProjeto;
  },

  /** ⚠️ ON DELETE CASCADE: apaga também os banners e menus A4 do projeto. */
  async excluir(id: string): Promise<void> {
    const { error } = await table()
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  },

  /**
   * Sobe fundo/chancela para o bucket público cardapio-assets e devolve a
   * URL pública (mesmo padrão de photoService.uploadPhotoFile).
   */
  async uploadAsset(file: File, tipo: CardapioAssetTipo): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const filePath = `${tipo}/${Date.now()}_${randomSuffix}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file);

    if (uploadError) throw new Error(`Falha no upload: ${uploadError.message}`);

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    return publicUrl;
  },
};
