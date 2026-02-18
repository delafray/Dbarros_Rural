import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { Tag, TagCategory } from '../types';
import { Card, LoadingSpinner, Button, Input, Modal } from '../components/UI';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const Tags: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatOrder, setNewCatOrder] = useState<number>(1);
  const [newCatRequired, setNewCatRequired] = useState(false);
  const [newCatGroup, setNewCatGroup] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagOrder, setNewTagOrder] = useState<number | ''>('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [saving, setSaving] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateCatModalOpen, setIsCreateCatModalOpen] = useState(false);
  const [isCreateTagModalOpen, setIsCreateTagModalOpen] = useState(false);
  const [isCollisionModalOpen, setIsCollisionModalOpen] = useState(false);
  const [pendingTagData, setPendingTagData] = useState<{ name: string, categoryId: string, order: number } | null>(null);
  const [editingCat, setEditingCat] = useState<TagCategory | null>(null);

  // Obter lista de grupos comuns existentes para sugestão
  const commonGroups = useMemo(() => {
    const groups = categories
      .map(c => c.commonGroup)
      .filter((g): g is string => !!g);
    return Array.from(new Set(groups)).sort();
  }, [categories]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cats, t] = await Promise.all([api.getTagCategories(), api.getTags()]);
      const sortedCats = cats.sort((a, b) => (a.order - b.order) || (a.createdAt || '').localeCompare(b.createdAt || ''));
      const sortedTags = t.sort((a, b) => (a.order - b.order) || a.createdAt.localeCompare(b.createdAt));
      setCategories(sortedCats);
      setTags(sortedTags);
      if (sortedCats.length > 0 && !selectedCatId) setSelectedCatId(sortedCats[0].id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.isVisitor) {
      fetchData();
    }
  }, [user]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setSaving(true);
    try {
      await api.createTagCategory(newCatName.trim(), newCatOrder, newCatRequired, newCatGroup.trim());
      setNewCatName('');
      setNewCatOrder(categories.length + 2);
      setNewCatRequired(false);
      setNewCatGroup('');
      setIsCreateCatModalOpen(false);
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
      await api.updateTagCategory(editingCat.id, {
        name: editingCat.name,
        order: editingCat.order,
        isRequired: editingCat.isRequired,
        commonGroup: editingCat.commonGroup
      });
      setIsEditModalOpen(false);
      setEditingCat(null);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao atualizar categoria: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim() || !selectedCatId) return;

    const currentTagsInCat = tags.filter(t => t.categoryId === selectedCatId);
    let finalOrder = typeof newTagOrder === 'number' ? newTagOrder : (
      currentTagsInCat.length > 0 ? Math.max(...currentTagsInCat.map(t => t.order)) + 1 : 1
    );

    const collision = currentTagsInCat.find(t => t.order === finalOrder);

    if (collision) {
      setPendingTagData({ name: newTagName.trim(), categoryId: selectedCatId, order: finalOrder });
      setIsCollisionModalOpen(true);
      return;
    }

    setSaving(true);
    try {
      await api.createTag(newTagName.trim(), selectedCatId, finalOrder);
      setNewTagName('');
      setNewTagOrder('');
      setIsCreateTagModalOpen(false);
      await fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteRegistration = async (shift: boolean) => {
    if (!pendingTagData) return;
    setSaving(true);
    try {
      if (shift) {
        const currentTagsInCat = tags.filter(t => t.categoryId === pendingTagData.categoryId);
        const tagsToShift = currentTagsInCat.filter(t => t.order >= pendingTagData.order);
        for (const t of tagsToShift) {
          await api.updateTag(t.id, { order: t.order + 1 });
        }
      }

      await api.createTag(pendingTagData.name, pendingTagData.categoryId, pendingTagData.order);
      setNewTagName('');
      setNewTagOrder('');
      setIsCreateTagModalOpen(false);
      setIsCollisionModalOpen(false);
      setPendingTagData(null);
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

  if (user?.isVisitor) {
    return (
      <Layout title="Acesso Negado">
        <div className="text-center py-12">
          <h2 className="text-xl font-bold text-red-600">Visitantes não têm permissão para gerenciar tags.</h2>
          <p className="text-slate-500 mt-2">Esta seção é reservada para administradores e editores.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Hierarquia de Tags">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6 md:sticky md:top-6 self-start z-10">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3 leading-none">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Níveis Ativos</h3>
              {user?.canManageTags && (
                <Button
                  onClick={() => setIsCreateCatModalOpen(true)}
                  className="py-1 px-3 text-[10px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 h-7"
                >
                  + Novo Nível
                </Button>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-[9px] font-black text-slate-400 uppercase px-1">Ordem Ativa</p>
              {categories.map(cat => (
                <div
                  key={cat.id}
                  className={`flex items-center justify-between p-2 rounded-xl border-2 transition-all ${selectedCatId === cat.id
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                    : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200 hover:bg-blue-50'
                    }`}
                >
                  <button
                    onClick={() => {
                      setSelectedCatId(cat.id);
                      document.getElementById(`level-${cat.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="flex-1 text-left flex items-center gap-3 py-1"
                  >
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${selectedCatId === cat.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {cat.order}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-bold text-xs">{cat.name}</span>
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        {cat.isRequired && (
                          <span className={`text-[8px] font-black uppercase tracking-tighter shrink-0 ${selectedCatId === cat.id ? 'text-white/70' : 'text-red-500'}`}>* Obrigatório</span>
                        )}
                        {cat.commonGroup && (
                          <span className={`text-[8px] font-bold truncate opacity-60 italic ${selectedCatId === cat.id ? 'text-white' : 'text-slate-500'}`}>({cat.commonGroup})</span>
                        )}
                      </div>
                    </div>
                  </button>

                  {user?.canManageTags && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditModal(cat)} className={`${selectedCatId === cat.id ? 'text-white/60 hover:text-white' : 'text-slate-300 hover:text-blue-500'} p-1`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button onClick={() => handleDeleteCategory(cat.id)} className={`${selectedCatId === cat.id ? 'text-white/60 hover:text-red-300' : 'text-slate-300 hover:text-red-500'} p-1`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Tag creation sidebar card removed in favor of Modal */}
        </div>

        <div className="md:col-span-2">
          {loading ? <LoadingSpinner /> : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-2xl border border-blue-100 text-blue-700 mb-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-xs font-medium">Os filtros da galeria seguirão a numeração abaixo. O Nível 1 filtra o Nível 2, e assim por diante.</p>
              </div>

              {categories.map(cat => (
                <Card key={cat.id} id={`level-${cat.id}`} className={`transition-all duration-500 ${selectedCatId === cat.id ? 'ring-2 ring-blue-500 shadow-lg scroll-mt-24' : ''}`}>
                  <div className="px-6 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-4">
                      <span className="bg-slate-800 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter">Nível {cat.order}</span>
                      <div className="flex flex-col">
                        <h3 className="text-lg font-bold text-slate-800">{cat.name}</h3>
                        <div className="flex items-center gap-2 mt-[-2px]">
                          {cat.isRequired && (
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Seleção Obrigatória</span>
                          )}
                          {cat.commonGroup && (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Grupo: {cat.commonGroup}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {user?.canManageTags && (
                        <button
                          onClick={() => {
                            setSelectedCatId(cat.id);
                            const currentTags = tags.filter(t => t.categoryId === cat.id);
                            const next = currentTags.length > 0 ? Math.max(...currentTags.map(t => t.order)) + 1 : 1;
                            setNewTagOrder(next);
                            setIsCreateTagModalOpen(true);
                          }}
                          className="px-3 py-1 bg-white border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm"
                          title="CADASTRAR SUB TAG"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                          SUB TAG ITEM {cat.order} {cat.name}
                        </button>
                      )}
                      <span className="text-xs font-semibold text-slate-400 uppercase">{tags.filter(t => t.categoryId === cat.id).length} OPÇÕES</span>
                    </div>
                  </div>
                  <div className="p-4 flex flex-wrap gap-x-3 gap-y-2">
                    {tags
                      .filter(t => t.categoryId === cat.id)
                      .sort((a, b) => (a.order - b.order) || a.createdAt.localeCompare(b.createdAt))
                      .map(tag => (
                        <div key={tag.id} className="group flex items-center bg-white text-slate-700 pr-2 pl-3 py-1 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
                          {user?.canManageTags && (
                            <input
                              type="number"
                              defaultValue={tag.order}
                              onBlur={async (e) => {
                                const newOrder = parseInt(e.target.value);
                                if (isNaN(newOrder) || newOrder === tag.order) return;

                                try {
                                  // Update DB
                                  await api.updateTag(tag.id, { order: newOrder });
                                  // Refresh all data to trigger a clean re-sort of everything
                                  await fetchData();
                                } catch (err) {
                                  console.error('Failed to update tag order:', err);
                                  fetchData();
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              className="w-10 h-6 text-[10px] font-black bg-slate-100 border-none rounded focus:ring-1 focus:ring-blue-500 mr-2 text-center"
                              title="Clique fora ou aperte Enter para salvar e reordenar"
                            />
                          )}
                          <span className="font-bold text-sm mr-2">{tag.name}</span>
                          {user?.canManageTags && (
                            <button
                              onClick={() => handleDeleteTag(tag.id)}
                              className="text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          )}
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

      <Modal isOpen={isCreateCatModalOpen} onClose={() => setIsCreateCatModalOpen(false)} title="Criar Novo Nível Hierárquico">
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <datalist id="commonGroupsList">
            {commonGroups.map(group => (
              <option key={group} value={group} />
            ))}
          </datalist>
          <Input
            label="Nome da Categoria"
            placeholder="Ex: Tipologia, Tamanho, Ano..."
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            required
          />
          <Input
            label="Grupo Comum (Opcional)"
            placeholder="Ex: Tamanho (Agrupa níveis 3 e 4)"
            value={newCatGroup}
            onChange={e => setNewCatGroup(e.target.value)}
            list="commonGroupsList"
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
          <Input
            label="Nível de Prioridade (1 = Primeiro Filtro)"
            type="number"
            min="1"
            value={newCatOrder}
            onChange={e => setNewCatOrder(parseInt(e.target.value) || 1)}
            required
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={() => setIsCreateCatModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>Definir Novo Nível</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isCreateTagModalOpen}
        onClose={() => setIsCreateTagModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-red-600 font-black uppercase tracking-tighter text-xl">
            <span>SUB TAG ITEM {categories.find(c => c.id === selectedCatId)?.order}</span>
            <span>{categories.find(c => c.id === selectedCatId)?.name}</span>
          </div>
        }
      >
        <form onSubmit={handleCreateTag} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-red-500 uppercase tracking-widest pl-1">Nome da Nova Sub-Tag</label>
            <Input
              placeholder="Ex: Construído, 20m²..."
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              className="py-1 text-lg font-bold border-red-200 focus:border-red-500 focus:ring-red-500"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Ordem de Exibição (Opcional)</label>
            <Input
              type="number"
              placeholder="Ex: 5"
              value={newTagOrder}
              onChange={e => setNewTagOrder(e.target.value === '' ? '' : parseInt(e.target.value))}
              className="py-1 text-sm font-bold border-red-100 focus:border-red-500 focus:ring-red-500 bg-red-50/30"
            />
            <p className="text-[10px] text-red-600 font-black uppercase tracking-tighter pl-1 animate-pulse">
              Você pode mudar a exibição na galeria (opcional)
            </p>
          </div>
          <div className="flex justify-end pt-2">
            <Button className="px-10 py-3 font-black uppercase tracking-widest bg-red-600 hover:bg-red-700 h-auto text-sm" type="submit" disabled={saving}>
              {saving ? 'Registrando...' : 'Confirmar Registro'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Custom Collision Modal */}
      <Modal
        isOpen={isCollisionModalOpen}
        onClose={() => setIsCollisionModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-red-600 font-black uppercase tracking-tighter text-xl">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span>Conflito de Ordem</span>
          </div>
        }
      >
        <div className="space-y-6 py-2">
          <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
            <p className="text-slate-700 font-medium text-center">
              A posição <span className="font-black text-red-600 text-xl">#{pendingTagData?.order}</span> já está ocupada. Como deseja prosseguir?
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Button
              onClick={() => handleExecuteRegistration(true)}
              className="py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest flex flex-col items-center justify-center gap-1 h-auto"
              disabled={saving}
            >
              <span className="text-lg">Readequar</span>
              <span className="text-[10px] opacity-80 font-bold lowercase italic text-white/70">Empurrar as outras tags para frente</span>
            </Button>

            <Button
              onClick={() => handleExecuteRegistration(false)}
              className="py-4 bg-slate-800 hover:bg-slate-900 text-white font-black uppercase tracking-widest flex flex-col items-center justify-center gap-1 h-auto"
              disabled={saving}
            >
              <span className="text-lg">Continuar</span>
              <span className="text-[10px] opacity-80 font-bold lowercase italic text-white/70">Manter ambas na posição {pendingTagData?.order}</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsCollisionModalOpen(false)}
              className="py-3 border-2 border-slate-200 text-slate-500 font-black uppercase tracking-widest h-auto text-sm"
              disabled={saving}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Nível Hierárquico">
        {editingCat && (
          <form onSubmit={handleUpdateCategory} className="space-y-4">
            <Input
              label="Nome"
              value={editingCat.name}
              onChange={e => setEditingCat({ ...editingCat, name: e.target.value })}
              required
            />
            <Input
              label="Grupo Comum (Opcional)"
              placeholder="Ex: Tamanho"
              value={editingCat.commonGroup || ''}
              onChange={e => setEditingCat({ ...editingCat, commonGroup: e.target.value })}
              list="commonGroupsList"
            />
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <input
                type="checkbox"
                id="editIsCatRequired"
                checked={editingCat.isRequired}
                onChange={e => setEditingCat({ ...editingCat, isRequired: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="editIsCatRequired" className="text-xs font-bold text-slate-700 cursor-pointer text-red-600 uppercase">
                Seleção Obrigatória para Fotos
              </label>
            </div>
            <Input
              label="Nível de Prioridade"
              type="number"
              min="1"
              value={editingCat.order}
              onChange={e => setEditingCat({ ...editingCat, order: parseInt(e.target.value) || 1 })}
              required
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>Salvar Alterações</Button>
            </div>
          </form>
        )}
      </Modal>
    </Layout >
  );
};

export default Tags;
