import React, { useState } from 'react';
import { TagCategory, Tag } from '../types';
import { Card, LoadingSpinner, Button } from '../components/UI';
import { AlertModal, AlertType } from '../components/AlertModal';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useTagCrud } from '../hooks/useTagCrud';
import CategoryFormModal from '../components/tags/CategoryFormModal';
import TagFormModal from '../components/tags/TagFormModal';
import CollisionModal from '../components/tags/CollisionModal';
import { api } from '../services/api';

const Tags: React.FC = () => {
  const { user } = useAuth();

  // Alert State
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; type: AlertType; onConfirm?: () => void }>({ isOpen: false, title: '', message: '', type: 'info' });
  const showAlert = (title: string, message: string, type: AlertType = 'info', onConfirm?: () => void) => setAlertState({ isOpen: true, title, message, type, onConfirm });

  const crud = useTagCrud({ userId: user?.isVisitor ? undefined : user?.id, showAlert });

  // Modal open states
  const [isCreateCatModalOpen, setIsCreateCatModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateTagModalOpen, setIsCreateTagModalOpen] = useState(false);
  const [isEditTagModalOpen, setIsEditTagModalOpen] = useState(false);

  // Form states for create category
  const [newCatName, setNewCatName] = useState('');
  const [newCatOrder, setNewCatOrder] = useState<number>(1);
  const [newCatRequired, setNewCatRequired] = useState(false);
  const [newCatPeerIds, setNewCatPeerIds] = useState<string[]>([]);

  // Form states for create tag
  const [newTagName, setNewTagName] = useState('');
  const [newTagOrder, setNewTagOrder] = useState<number | ''>('');

  // Edit states
  const [editingCat, setEditingCat] = useState<TagCategory | null>(null);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

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

  const headerActions = user?.isAdmin ? (
    <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-1 duration-500 hidden sm:flex">
      <div className="flex items-center gap-2">
        <label htmlFor="pdfLimitHeader" className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap leading-none">
          Limite PDF:
        </label>
        <input
          id="pdfLimitHeader"
          type="number"
          min="1"
          className="w-12 h-8 px-1 text-[11px] font-bold border-2 border-slate-100 rounded-lg focus:border-blue-500 focus:bg-white outline-none transition-all text-center bg-slate-50"
          value={crud.pdfLimit}
          onChange={(e) => crud.setPdfLimit(parseInt(e.target.value) || 0)}
          title="Limite de fotos por PDF"
        />
      </div>
      <div className="w-px h-4 bg-slate-100"></div>
      <Button
        onClick={crud.handleSaveConfig}
        disabled={crud.configSaving || crud.pdfLimit === crud.lastSavedLimit}
        className={`h-8 px-4 text-[9px] font-black uppercase tracking-widest transition-all shadow-sm ${crud.pdfLimit === crud.lastSavedLimit
          ? 'bg-green-500 border-green-500 cursor-default opacity-100 text-white'
          : crud.configSaving
            ? 'bg-blue-400 border-blue-400 cursor-wait'
            : 'bg-blue-600 border-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95'
          }`}
      >
        {crud.pdfLimit === crud.lastSavedLimit ? 'Salvo!' : crud.configSaving ? '...' : 'Salvar'}
      </Button>
    </div>
  ) : null;

  return (
    <Layout title="Hierarquia de Tags" headerActions={headerActions}>
      <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        {/* Botão Voltar Exclusivo Mobile */}
        <Button onClick={() => window.location.hash = '#/fotos'} className="sm:hidden px-4 py-2 w-full flex items-center justify-center text-[11px] font-black uppercase tracking-widest gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm border border-blue-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar para Galeria
        </Button>
      </div>

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

            <div className="space-y-1.5 max-h-[30vh] overflow-y-auto pr-1 md:max-h-none md:overflow-visible">
              <p className="text-[9px] font-black text-slate-400 uppercase px-1">Ordem Ativa</p>
              {crud.categories.map(cat => (
                <div
                  key={cat.id}
                  className={`flex items-center justify-between p-1.5 rounded-lg border-2 transition-all ${crud.selectedCatId === cat.id
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                    : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200 hover:bg-blue-50'
                    }`}
                >
                  <button
                    onClick={() => {
                      crud.setSelectedCatId(cat.id);
                      document.getElementById(`level-${cat.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="flex-1 text-left flex items-center gap-2 py-0.5"
                  >
                    <span className={`text-[9px] font-black px-1 py-0.5 rounded ${crud.selectedCatId === cat.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {cat.order}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-bold text-xs leading-tight">{cat.name}</span>
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        {cat.isRequired && (
                          <span className={`text-[9px] font-black uppercase tracking-tighter shrink-0 ${crud.selectedCatId === cat.id ? 'text-white/70' : 'text-red-500'}`}>* Obrigatório</span>
                        )}
                      </div>
                    </div>
                  </button>

                  {user?.canManageTags && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditModal(cat)} className={`${crud.selectedCatId === cat.id ? 'text-white/60 hover:text-white' : 'text-slate-300 hover:text-blue-500'} p-1`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button onClick={() => crud.handleDeleteCategory(cat.id)} className={`${crud.selectedCatId === cat.id ? 'text-white/60 hover:text-red-300' : 'text-slate-300 hover:text-red-500'} p-1`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="md:col-span-2">
          {crud.loading ? <LoadingSpinner /> : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100/50 text-blue-700 mb-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-[10px] font-medium italic">Os filtros seguem a numeração: Nível 1 filtra o Nível 2 sucessivamente.</p>
              </div>

              {crud.categories.map(cat => (
                <Card key={cat.id} id={`level-${cat.id}`} className={`transition-all duration-500 ${crud.selectedCatId === cat.id ? 'ring-2 ring-blue-500 shadow-lg scroll-mt-24' : ''}`}>
                  <div className="px-5 py-3 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center bg-slate-50/50 gap-3">
                    <div className="flex items-center gap-3">
                      <span className="bg-slate-800 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter shrink-0">Nível {cat.order}</span>
                      <div className="flex flex-col">
                        <h3 className="text-sm font-bold text-slate-800 leading-tight">{cat.name}</h3>
                        <div className="flex items-center gap-2 mt-[-2px]">
                          {cat.isRequired && (
                            <span className="text-[9px] font-black text-red-500 uppercase tracking-widest shrink-0">Obrigatório</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                      {user?.canManageTags && (
                        <button
                          onClick={() => {
                            crud.setSelectedCatId(cat.id);
                            const currentTags = crud.tags.filter(t => t.categoryId === cat.id);
                            const next = currentTags.length > 0 ? Math.max(...currentTags.map(t => t.order)) + 1 : 1;
                            setNewTagOrder(next);
                            setIsCreateTagModalOpen(true);
                          }}
                          className="px-3 py-1.5 sm:py-1 bg-white border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm flex-1 sm:flex-none"
                          title="ADICIONAR NOVO ITEM"
                        >
                          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                          <span className="hidden sm:inline">ITEM EM {cat.name}</span>
                          <span className="sm:hidden">NOVO ITEM</span>
                        </button>
                      )}
                      <span className="text-[10px] font-semibold text-slate-400 uppercase leading-none whitespace-nowrap">{crud.tags.filter(t => t.categoryId === cat.id).length} OPÇÕES</span>
                    </div>
                  </div>
                  <div className="p-3.5 flex flex-wrap gap-2">
                    {crud.tags
                      .filter(t => t.categoryId === cat.id)
                      .sort((a, b) => (a.order - b.order) || a.createdAt.localeCompare(b.createdAt))
                      .map(tag => (
                        <div key={tag.id} className="group flex items-center bg-white text-slate-700 pr-1.5 pl-2 py-1 rounded-lg border border-slate-200 shadow-sm hover:border-blue-300 transition-all">
                          {user?.canManageTags && (
                            <input
                              type="number"
                              defaultValue={tag.order}
                              onBlur={async (e) => {
                                const newOrder = parseInt(e.target.value);
                                if (isNaN(newOrder) || newOrder === tag.order) return;
                                try {
                                  await api.updateTag(tag.id, { order: newOrder });
                                  await crud.fetchData();
                                } catch (err) {
                                  console.error('Failed to update tag order:', err);
                                  crud.fetchData();
                                }
                              }}
                              className="w-7 h-5 text-[10px] font-black bg-slate-100 border-none rounded focus:ring-1 focus:ring-blue-500 mr-1.5 text-center"
                              title="Ordem"
                            />
                          )}
                          <span className="font-bold text-xs mr-1">{tag.name}</span>
                          {user?.canManageTags && (
                            <div className="flex items-center gap-0.5 ml-0.5 border-l border-slate-100 pl-1 opacity-100 sm:opacity-50 sm:group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingTag({ ...tag });
                                  setIsEditTagModalOpen(true);
                                }}
                                className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 sm:p-0.5"
                                title="Editar"
                              >
                                <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                              <button
                                onClick={() => crud.handleDeleteTag(tag.id)}
                                className="text-slate-300 hover:text-red-500 transition-colors p-1.5 sm:p-0.5"
                                title="Excluir"
                              >
                                <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    {crud.tags.filter(t => t.categoryId === cat.id).length === 0 && (
                      <p className="text-sm text-slate-400 italic">Cadastre sub-tags para este nível hierárquico.</p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <CategoryFormModal
        mode="create"
        isOpen={isCreateCatModalOpen}
        onClose={() => setIsCreateCatModalOpen(false)}
        categories={crud.categories}
        newCatName={newCatName}
        setNewCatName={setNewCatName}
        newCatOrder={newCatOrder}
        setNewCatOrder={setNewCatOrder}
        newCatRequired={newCatRequired}
        setNewCatRequired={setNewCatRequired}
        newCatPeerIds={newCatPeerIds}
        setNewCatPeerIds={setNewCatPeerIds}
        saving={crud.saving}
        onSubmit={(e) => crud.handleCreateCategory(e, newCatName, newCatOrder, newCatRequired, newCatPeerIds, () => {
          setNewCatName('');
          setNewCatOrder(crud.categories.length + 2);
          setNewCatRequired(false);
          setNewCatPeerIds([]);
          setIsCreateCatModalOpen(false);
        })}
      />

      <CategoryFormModal
        mode="edit"
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        categories={crud.categories}
        editingCat={editingCat!}
        setEditingCat={setEditingCat as (v: TagCategory) => void}
        saving={crud.saving}
        onSubmit={(e) => editingCat && crud.handleUpdateCategory(e, editingCat, () => {
          setIsEditModalOpen(false);
          setEditingCat(null);
        })}
      />

      <TagFormModal
        mode="create"
        isOpen={isCreateTagModalOpen}
        onClose={() => setIsCreateTagModalOpen(false)}
        categories={crud.categories}
        selectedCatId={crud.selectedCatId}
        newTagName={newTagName}
        setNewTagName={setNewTagName}
        newTagOrder={newTagOrder}
        setNewTagOrder={setNewTagOrder}
        saving={crud.saving}
        onSubmit={(e) => crud.handleCreateTag(e, newTagName, crud.selectedCatId, newTagOrder, () => {
          setNewTagName('');
          setNewTagOrder('');
          setIsCreateTagModalOpen(false);
        })}
      />

      <TagFormModal
        mode="edit"
        isOpen={isEditTagModalOpen}
        onClose={() => { setIsEditTagModalOpen(false); setEditingTag(null); }}
        categories={crud.categories}
        editingTag={editingTag!}
        setEditingTag={setEditingTag as (v: Tag) => void}
        saving={crud.saving}
        onSubmit={(e) => editingTag && crud.handleUpdateTag(e, editingTag, () => {
          setIsEditTagModalOpen(false);
          setEditingTag(null);
        })}
      />

      <CollisionModal
        isOpen={crud.isCollisionModalOpen}
        onClose={() => crud.setIsCollisionModalOpen(false)}
        pendingOrder={crud.pendingTagData?.order}
        saving={crud.saving}
        onReadequar={() => crud.handleExecuteRegistration(true, () => {
          setNewTagName('');
          setNewTagOrder('');
          setIsCreateTagModalOpen(false);
        })}
        onContinuar={() => crud.handleExecuteRegistration(false, () => {
          setNewTagName('');
          setNewTagOrder('');
          setIsCreateTagModalOpen(false);
        })}
      />

      <AlertModal {...alertState} onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))} />
    </Layout>
  );
};

export default Tags;
