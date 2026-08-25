// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck - table 'cardapio_lonas' not yet in generated types (database.types.ts)
import { supabase } from './supabaseClient';
import type { LonaBlocoConfig } from '../components/cardapioLona/cardapioLonaConfig';

export interface CardapioLona {
  id: string;
  projeto_id: string;
  nome: string;
  largura_cm: number;
  altura_cm: number;
  util_largura_cm: number;
  util_altura_cm: number;
  util_offset_x_cm: number | null;
  util_offset_y_cm: number | null;
  fundo_url: string | null;
  logo_max_largura_cm: number;
  logo_max_altura_cm: number;
  colunas: number;
  blocos: LonaBlocoConfig[];
  /** Partial<FontesLona>; null = padrão */
  fontes: Record<string, number> | null;
  created_at: string;
  updated_at: string;
}

export interface CardapioLonaInput {
  projeto_id: string;
  nome: string;
  largura_cm?: number;
  altura_cm?: number;
  util_largura_cm?: number;
  util_altura_cm?: number;
  util_offset_x_cm?: number | null;
  util_offset_y_cm?: number | null;
  fundo_url?: string | null;
  logo_max_largura_cm?: number;
  logo_max_altura_cm?: number;
  colunas?: number;
  blocos?: LonaBlocoConfig[];
  fontes?: Record<string, number> | null;
}

const table = () => supabase.from('cardapio_lonas' as never);

export const lonaService = {
  async listar(projetoId: string): Promise<CardapioLona[]> {
    const { data, error } = await table()
      .select('*')
      .eq('projeto_id', projetoId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data as CardapioLona[]) ?? [];
  },

  async buscar(id: string): Promise<CardapioLona | null> {
    const { data, error } = await table()
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return data as CardapioLona;
  },

  async criar(input: CardapioLonaInput): Promise<CardapioLona> {
    const { data, error } = await table()
      .insert([input])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as CardapioLona;
  },

  async atualizar(id: string, input: Partial<CardapioLonaInput>): Promise<CardapioLona> {
    const { data, error } = await table()
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as CardapioLona;
  },

  async excluir(id: string): Promise<void> {
    const { error } = await table()
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  },
};
