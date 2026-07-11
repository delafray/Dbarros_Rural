import React from 'react';
import { TagCategory } from '../../types';
import { Button, Input, Modal } from '../UI';

// ─── Create mode ─────────────────────────────────────────────────────────────

interface CreateCategoryModalProps {
  mode: 'create';
  isOpen: boolean;
  onClose: () => void;
  categories: TagCategory[];
  newCatName: string;
  setNewCatName: (v: string) => void;
  newCatOrder: number;
  setNewCatOrder: (v: number) => void;
  newCatRequired: boolean;
  setNewCatRequired: (v: boolean) => void;
  newCatPeerIds: string[];
  setNewCatPeerIds: (v: string[]) => void;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

// ─── Edit mode ────────────────────────────────────────────────────────────────

interface EditCategoryModalProps {
  mode: 'edit';
  isOpen: boolean;
  onClose: () => void;
  categories: TagCategory[];
  editingCat: TagCategory;
  setEditingCat: (v: TagCategory) => void;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

type CategoryFormModalProps = CreateCategoryModalProps | EditCategoryModalProps;

const CategoryFormModal: React.FC<CategoryFormModalProps> = (props) => {
  const { mode, isOpen, onClose, categories, saving, onSubmit } = props;

  if (mode === 'create') {
    const { newCatName, setNewCatName, newCatOrder, setNewCatOrder, newCatRequired, setNewCatRequired, newCatPeerIds, setNewCatPeerIds } = props;

    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Criar Novo Nível Hierárquico">
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Nome da Categoria"
            placeholder="Ex: Tipologia, Tamanho, Ano..."
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            required
          />
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <input
              type="checkbox"
              id="isCatRequired"
              checked={newCatRequired}
              onChange={e => setNewCatRequired(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isCatRequired" className="text-xs font-bold text-slate-700 cursor-pointer">
              Exigir seleção deste nível no cadastro de fotos
            </label>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Vincular a outros níveis (Obrigatoriedade Compartilhada)</label>
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 max-h-32 overflow-y-auto">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`peer-new-cat-${cat.id}`}
                    checked={newCatPeerIds.includes(cat.id)}
                    onChange={e => {
                      if (e.target.checked) setNewCatPeerIds([...newCatPeerIds, cat.id]);
                      else setNewCatPeerIds(newCatPeerIds.filter(id => id !== cat.id));
                    }}
                    className="w-3 h-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor={`peer-new-cat-${cat.id}`} className="text-[10px] font-bold text-slate-600 truncate uppercase">{cat.name}</label>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-slate-400 italic px-1">Se escolher uma tag em qualquer um desses níveis, este nível será considerado preenchido.</p>
          </div>
          <Input
            label="Nível de Prioridade (1 = Primeiro Filtro)"
            type="number"
            min="1"
            value={newCatOrder}
            onChange={e => setNewCatOrder(parseInt(e.target.value) || 1)}
            required
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>Definir Novo Nível</Button>
          </div>
        </form>
      </Modal>
    );
  }

  // Edit mode
  const { editingCat, setEditingCat } = props;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md" title="Editar Nível Hierárquico">
      <form onSubmit={onSubmit} className="space-y-3.5">
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-slate-500 uppercase pb-0.5">Nome</label>
          <Input
            value={editingCat.name}
            onChange={e => setEditingCat({ ...editingCat, name: e.target.value })}
            required
            className="py-1.5 text-sm font-medium rounded-md"
          />
        </div>

        <div className="flex items-center gap-2 p-2 bg-slate-50/50 rounded-lg border border-slate-100">
          <input
            type="checkbox"
            id="editIsCatRequired"
            checked={editingCat.isRequired}
            onChange={e => setEditingCat({ ...editingCat, isRequired: e.target.checked })}
            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="editIsCatRequired" className="text-[10px] font-bold text-slate-700 cursor-pointer uppercase">
            Obrigatório para Fotos
          </label>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Vincular a outros níveis (Compartilhado)</label>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 p-2 bg-slate-50/50 rounded-lg border border-slate-100 max-h-24 overflow-y-auto">
            {categories.filter(c => c.id !== editingCat.id).map(cat => (
              <div key={cat.id} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id={`peer-edit-cat-${cat.id}`}
                  checked={editingCat.peerCategoryIds?.includes(cat.id)}
                  onChange={e => {
                    const currentPeers = editingCat.peerCategoryIds || [];
                    const nextPeers = e.target.checked
                      ? [...currentPeers, cat.id]
                      : currentPeers.filter(id => id !== cat.id);
                    setEditingCat({ ...editingCat, peerCategoryIds: nextPeers });
                  }}
                  className="w-3 h-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor={`peer-edit-cat-${cat.id}`} className="text-[9px] font-bold text-slate-600 truncate uppercase">{cat.name}</label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-bold text-slate-500 uppercase pb-0.5">Nível de Prioridade</label>
          <Input
            type="number"
            min="1"
            value={editingCat.order}
            onChange={e => setEditingCat({ ...editingCat, order: parseInt(e.target.value) || 1 })}
            required
            className="py-1.5 text-xs font-medium rounded-md"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button className="px-5 py-2 text-[10px] font-bold uppercase" variant="outline" type="button" onClick={onClose}>Cancelar</Button>
          <Button className="px-5 py-2 text-[10px] font-bold uppercase shadow-sm active:scale-95" type="submit" disabled={saving}>Salvar</Button>
        </div>
      </form>
    </Modal>
  );
};

export default CategoryFormModal;
