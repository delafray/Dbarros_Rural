import { supabase } from './supabaseClient';
import { CardapioGroup } from '../utils/cardapioParser';

interface MenuA4Payload {
  titulo: string;
  empresa: string;
  conteudo_raw: string;
  itens: CardapioGroup[];
}

export const menuA4Service = {
  async listar() {
    const { data, error } = await (supabase as any)
      .from('menus_a4')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
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
