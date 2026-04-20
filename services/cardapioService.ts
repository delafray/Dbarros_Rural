// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck - table 'cardapios' not yet in generated types (database.types.ts)
import { supabase } from './supabaseClient';
import type { CardapioGroup } from '../utils/cardapioParser';

export interface Cardapio {
  id: string;
  titulo: string;
  empresa: string;
  conteudo_raw: string;
  itens: CardapioGroup[];
  created_at: string;
  updated_at: string;
}

export interface CardapioInput {
  titulo: string;
  empresa: string;
  conteudo_raw: string;
  itens: CardapioGroup[];
}

// Helper: typed query builder bypassing generated types for this new table
const table = () => supabase.from('cardapios' as never);

export const cardapioService = {
  async listar(): Promise<Cardapio[]> {
    const { data, error } = await table()
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data as Cardapio[]) ?? [];
  },

  async buscar(id: string): Promise<Cardapio | null> {
    const { data, error } = await table()
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as Cardapio;
  },

  async salvar(input: CardapioInput): Promise<Cardapio> {
    const { data, error } = await table()
      .insert([input])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Cardapio;
  },

  async atualizar(id: string, input: Partial<CardapioInput>): Promise<Cardapio> {
    const { data, error } = await table()
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Cardapio;
  },

  async excluir(id: string): Promise<void> {
    const { error } = await table()
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  },
};
