
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Tag, TagCategory } from '../types';
import { Card, LoadingSpinner, Button, Input, Modal } from '../components/UI';
import Layout from '../components/Layout';

const Tags: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatOrder, setNewCatOrder] = useState<number>(1);
  const [newTagName, setNewTagName] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [saving, setSaving] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<TagCategory | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cats, t] = await Promise.all([api.getTagCategories(), api.getTags()]);
      const sortedCats = cats.sort((a, b) => a.order - b.order);
      setCategories(sortedCats);
      setTags(t);
      if (sortedCats.length > 0 && !selectedCatId) setSelectedCatId(sortedCats[0].id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setSaving(true);
    try {
      await api.createTagCategory(newCatName.trim(), newCatOrder);
      setNewCatName('');
      setNewCatOrder(categories.length + 2);
      await fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat) return;
    setSaving(true);
    try {
      await api.updateTagCategory(editingCat.id, { name: editingCat.name, order: editingCat.order });
      setIsEditModalOpen(false);
      setEditingCat(null);
      await fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim() || !selectedCatId) return;
    setSaving(true);
    try {
      await api.createTag(newTagName.trim(), selectedCatId);
      setNewTagName('');
      await fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Excluir esta categoria e todas as suas tags?')) return;
    await api.deleteTagCategory(id);
    fetchData();
  };

  const handleDeleteTag = async (id: string) => {
    if (!window.confirm('Excluir esta tag?')) return;
    await api.deleteTag(id);
    fetchData();
  };

  const openEditModal = (cat: TagCategory) => {
    setEditingCat({ ...cat });
    setIsEditModalOpen(true);
  };

  return (
    <Layout title="Hierarquia de Tags">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Gerenciar Hierarquia</h3>
            <form onSubmit={handleCreateCategory} className="space-y-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-blue-600 uppercase">Nova Categoria de Nível</p>
              <Input 
                label="Nome da Categoria"
                placeholder="Ex: Tipologia, Tamanho..." 
                value={newCatName} 
                onChange={e => setNewCatName(e.target.value)}
                required
              />
              <Input 
                label="Prioridade (1 = Primário)"
                type="number"
                min="1"
                value={newCatOrder} 
                onChange={e => setNewCatOrder(parseInt(e.target.value) || 1)}
                required
              />
              <Button className="w-full" type="submit" disabled={saving}>
                Definir Categoria
              </Button>
            </form>
            
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase px-1">Ordem de Filtro</p>
              {categories.map(cat => (
                <div key={cat.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${selectedCatId === cat.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                  <button onClick={() => setSelectedCatId(cat.id)} className="flex-1 text-left flex items-center gap-3">
                    <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-black ${selectedCatId === cat.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                      {cat.order}
                    </span>
                    <span className="font-bold">{cat.name}</span>
                  </button>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditModal(cat)} className={`${selectedCatId === cat.id ? 'text-white/60 hover:text-white' : 'text-slate-300 hover:text-blue-500'} p-1`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={() => handleDeleteCategory(cat.id)} className={`${selectedCatId === cat.id ? 'text-white/60 hover:text-red-300' : 'text-slate-300 hover:text-red-500'} p-1`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {selectedCatId && (
            <Card className="p-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Adicionar Tags ao Nível {categories.find(c => c.id === selectedCatId)?.order}</h3>
              <form onSubmit={handleCreateTag} className="space-y-4">
                <Input 
                  placeholder="Ex: Construído, 20m²..." 
                  value={newTagName} 
                  onChange={e => setNewTagName(e.target.value)}
                  required
                />
                <Button className="w-full" variant="secondary" type="submit" disabled={saving}>
                  Registrar Sub-Tag
                </Button>
              </form>
            </Card>
          )}
        </div>

        <div className="md:col-span-2">
          {loading ? <LoadingSpinner /> : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-2xl border border-blue-100 text-blue-700 mb-4">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 <p className="text-xs font-medium">Os filtros da galeria seguirão a numeração abaixo. O Nível 1 filtra o Nível 2, e assim por diante.</p>
              </div>
              
              {categories.map(cat => (
                <Card key={cat.id} className={selectedCatId === cat.id ? 'ring-2 ring-blue-500 shadow-lg' : ''}>
                  <div className="px-6 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-4">
                       <span className="bg-slate-800 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter">Nível {cat.order}</span>
                       <h3 className="text-lg font-bold text-slate-800">{cat.name}</h3>
                    </div>
                    <span className="text-xs font-semibold text-slate-400 uppercase">{tags.filter(t => t.categoryId === cat.id).length} OPÇÕES</span>
                  </div>
                  <div className="p-4 flex flex-wrap gap-x-2 gap-y-1">
                    {tags.filter(t => t.categoryId === cat.id).map(tag => (
                      <div key={tag.id} className="group flex items-center bg-white text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
                        <span className="font-bold text-sm">{tag.name}</span>
                        <button 
                          onClick={() => handleDeleteTag(tag.id)}
                          className="ml-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                    {tags.filter(t => t.categoryId === cat.id).length === 0 && (
                      <p className="text-sm text-slate-400 italic">Cadastre sub-tags para este nível hierárquico.</p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Nível Hierárquico">
         {editingCat && (
            <form onSubmit={handleUpdateCategory} className="space-y-4">
               <Input 
                  label="Nome"
                  value={editingCat.name}
                  onChange={e => setEditingCat({...editingCat, name: e.target.value})}
                  required
               />
               <Input 
                  label="Nível de Prioridade"
                  type="number"
                  min="1"
                  value={editingCat.order}
                  onChange={e => setEditingCat({...editingCat, order: parseInt(e.target.value) || 1})}
                  required
               />
               <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={saving}>Salvar Alterações</Button>
               </div>
            </form>
         )}
      </Modal>
    </Layout>
  );
};

export default Tags;
