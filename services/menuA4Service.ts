import { supabase } from './supabaseClient';
import { CardapioGroup } from '../utils/cardapioParser';

interface MenuA4Payload {
  titulo: string;
  empresa: string;
  conteudo_raw: string;
  itens: CardapioGroup[];
  projeto_id?: string | null;
  /** Multiplicadores de fonte deste menu (Partial<FontesA4>); null = padrão */
  fontes?: Record<string, number> | null;
}

export const menuA4Service = {
  async listar(projetoId?: string) {
    let query = (supabase as any)
      .from('menus_a4')
      .select('*')
      .order('destaque', { ascending: false })
      .order('created_at', { ascending: false });
    if (projetoId) query = query.eq('projeto_id', projetoId);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  /**
   * Marca o menu como destaque do projeto (1º na primeira página do A3).
   * Marcação única: desmarca os demais antes. Passe id=null para só desmarcar.
   */
  async definirDestaque(projetoId: string, id: string | null) {
    const { error: clearError } = await (supabase as any)
      .from('menus_a4')
      .update({ destaque: false })
      .eq('projeto_id', projetoId)
      .eq('destaque', true);
    if (clearError) throw clearError;

    if (id) {
      const { error } = await (supabase as any)
        .from('menus_a4')
        .update({ destaque: true })
        .eq('id', id);
      if (error) throw error;
    }
  },

  async buscar(id: string) {
    const { data, error } = await (supabase as any)
      .from('menus_a4')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async salvar(payload: MenuA4Payload) {
    const { data, error } = await (supabase as any)
      .from('menus_a4')
      .insert([{ ...payload, updated_at: new Date().toISOString() }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async atualizar(id: string, payload: Partial<MenuA4Payload>) {
    const { data, error } = await (supabase as any)
      .from('menus_a4')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async excluir(id: string) {
    const { error } = await (supabase as any)
      .from('menus_a4')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
