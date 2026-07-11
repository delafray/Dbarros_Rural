import React from 'react';
import { Tag, TagCategory } from '../../types';
import { Button, Input, Modal } from '../UI';

// ─── Create mode ─────────────────────────────────────────────────────────────

interface CreateTagModalProps {
  mode: 'create';
  isOpen: boolean;
  onClose: () => void;
  categories: TagCategory[];
  selectedCatId: string;
  newTagName: string;
  setNewTagName: (v: string) => void;
  newTagOrder: number | '';
  setNewTagOrder: (v: number | '') => void;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

// ─── Edit mode ────────────────────────────────────────────────────────────────

interface EditTagModalProps {
  mode: 'edit';
  isOpen: boolean;
  onClose: () => void;
  categories: TagCategory[];
  editingTag: Tag;
  setEditingTag: (v: Tag) => void;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

type TagFormModalProps = CreateTagModalProps | EditTagModalProps;

const TagFormModal: React.FC<TagFormModalProps> = (props) => {
  const { mode, isOpen, onClose, categories, saving, onSubmit } = props;

  if (mode === 'create') {
    const { selectedCatId, newTagName, setNewTagName, newTagOrder, setNewTagOrder } = props;

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="max-w-md"
        title={
          <div className="flex items-center gap-2 text-slate-800 font-bold uppercase tracking-tight text-base">
            <span>Adicionar a</span>
            <span className="text-blue-600">{categories.find(c => c.id === selectedCatId)?.name}</span>
          </div>
        }
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-500 uppercase pb-0.5">Nome</label>
            <Input
              placeholder="Ex: Construído, 20m²..."
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              className="py-1.5 text-sm font-medium border-slate-200 focus:border-blue-500 rounded-md"
              required
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase pb-0.5">Ordem</label>
            <Input
              type="number"
              placeholder="Auto"
              value={newTagOrder}
              onChange={e => setNewTagOrder(e.target.value === '' ? '' : parseInt(e.target.value))}
              className="py-1.5 text-xs font-medium border-slate-100 focus:border-blue-400 bg-slate-50/30 rounded-md"
            />
          </div>
          <div className="flex justify-end pt-3">
            <Button className="px-6 py-2 font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-700 h-auto text-[10px] shadow-sm active:scale-95 transition-all" type="submit" disabled={saving}>
              {saving ? '...' : 'Salvar Item'}
            </Button>
          </div>
        </form>
      </Modal>
    );
  }

  // Edit mode
  const { editingTag, setEditingTag } = props;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      title={
        <div className="flex items-center gap-2 text-slate-800 font-bold uppercase tracking-tight text-base">
          <span>Editar em</span>
          <span className="text-blue-600">{categories.find(c => c.id === editingTag.categoryId)?.name}</span>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-slate-500 uppercase pb-0.5">Nome</label>
          <Input
            placeholder="Ex: Construído, 20m²..."
            value={editingTag.name}
            onChange={e => setEditingTag({ ...editingTag, name: e.target.value })}
            className="py-1.5 text-sm font-medium border-slate-200 focus:border-blue-500 rounded-md"
            required
            autoFocus
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-slate-400 uppercase pb-0.5">Ordem</label>
          <Input
            type="number"
            placeholder="Ex: 5"
            value={editingTag.order}
            onChange={e => setEditingTag({ ...editingTag, order: parseInt(e.target.value) || 0 })}
            className="py-1.5 text-xs font-medium border-slate-100 focus:border-blue-400 bg-slate-50/30 rounded-md"
          />
        </div>
        <div className="flex justify-end pt-3">
          <Button className="px-6 py-2 font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-700 h-auto text-[10px] shadow-sm active:scale-95 transition-all" type="submit" disabled={saving}>
            {saving ? '...' : 'Atualizar Item'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TagFormModal;
