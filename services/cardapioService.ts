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
  projeto_id: string | null;
  /** Marcação única por projeto: aparece primeiro na 1ª página do A3 Duplo */
  destaque: boolean;
  created_at: string;
  updated_at: string;
}

export interface CardapioInput {
  titulo: string;
  empresa: string;
  conteudo_raw: string;
  itens: CardapioGroup[];
  projeto_id?: string | null;
}

// Helper: typed query builder bypassing generated types for this new table
const table = () => supabase.from('cardapios' as never);

export const cardapioService = {
  async listar(projetoId?: string): Promise<Cardapio[]> {
    let query = table()
      .select('*')
      .order('destaque', { ascending: false })
      .order('created_at', { ascending: false });
    if (projetoId) query = query.eq('projeto_id', projetoId);

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    return (data as Cardapio[]) ?? [];
  },

  /**
   * Marca o cardápio como destaque do projeto (1º na primeira página do A3).
   * Marcação única: desmarca os demais antes. Passe id=null para só desmarcar.
   */
  async definirDestaque(projetoId: string, id: string | null): Promise<void> {
    const { error: clearError } = await table()
      .update({ destaque: false })
      .eq('projeto_id', projetoId)
      .eq('destaque', true);
    if (clearError) throw new Error(clearError.message);

    if (id) {
      const { error } = await table()
        .update({ destaque: true })
        .eq('id', id);
      if (error) throw new Error(error.message);
    }
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
