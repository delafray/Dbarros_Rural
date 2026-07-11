import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { Photo } from '../types';
import { Button, Card, LoadingSpinner } from '../components/UI';
import { AlertModal, AlertType } from '../components/AlertModal';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

import { usePhotoFilters } from '../src/hooks/usePhotoFilters';
import { usePdfExport } from '../src/hooks/usePdfExport';
import { useFullscreenLightbox } from '../src/hooks/useFullscreenLightbox';
import { usePhotosData } from '../src/hooks/usePhotosData';
import { usePhotoForm } from '../src/hooks/usePhotoForm';

import FullscreenOverlay from '../components/photos/FullscreenOverlay';
import { PdfProgressModal, PdfActionsModal } from '../components/photos/PdfModals';
import PhotoFormModal from '../components/photos/PhotoFormModal';
import PhotoPreviewModal from '../components/photos/PhotoPreviewModal';

// Returns Tailwind classes for PDF/selection action buttons based on selection count vs limit.
// When count === 0 → muted blue (inactive). When count > limit → red (warning). Otherwise → blue (active).
const getPdfButtonClasses = (count: number, limit: number) => {
  if (count === 0) return '!bg-blue-100 !text-blue-700 !border-blue-200 shadow-none hover:!bg-blue-200 transition-colors cursor-pointer';
  if (count > limit) return '!bg-red-600 !text-white !border-red-600 shadow-red-500/30 hover:!bg-red-700 cursor-pointer';
  return '!bg-blue-600 !text-white !border-blue-600 shadow-blue-500/30 hover:!bg-blue-700 cursor-pointer';
};

const Photos: React.FC = () => {
  const { user } = useAuth();

  // Alert State
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; type: AlertType; onConfirm?: () => void }>({ isOpen: false, title: '', message: '', type: 'info' });
  const showAlert = (title: string, message: string, type: AlertType = 'info', onConfirm?: () => void) => setAlertState({ isOpen: true, title, message, type, onConfirm });

  // PDF Actions Modal state
  const [pdfActionModal, setPdfActionModal] = useState<{ isOpen: boolean; blob: Blob | null; fileName: string }>({ isOpen: false, blob: null, fileName: '' });
  const onPdfReady = (blob: Blob, fileName: string) => setPdfActionModal({ isOpen: true, blob, fileName });

  // Preview
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);

  // Selection
  const [selectedExportIds, setSelectedExportIds] = useState<Set<string>>(new Set());
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [gridCols, setGridCols] = useState(window.innerWidth < 640 ? 2 : 5);
  const [tagFontSize, setTagFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('tagFontSize');
    return saved ? Math.max(7, Math.min(14, parseInt(saved, 10))) : 9;
  });

  useEffect(() => { localStorage.setItem('tagFontSize', tagFontSize.toString()); }, [tagFontSize]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) setGridCols(2);
      else if (width < 1024) setGridCols(3);
      else if (width < 1280) setGridCols(4);
      else setGridCols(5);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Data hook
  const data = usePhotosData({ userId: user?.id, onlyMine: false });

  // Filters hook
  const {
    searchTerm, setSearchTerm,
    selectedTagIds, setSelectedTagIds,
    onlyMine, setOnlyMine,
    selectedUserId, setSelectedUserId,
    sortByDate, setSortByDate,
    filteredResult,
    toggleFilterTag,
  } = usePhotoFilters({ photoIndex: data.photoIndex, tags: data.tags, categories: data.categories });

  // Reset display count when filter changes
  useEffect(() => { data.resetDisplayCount(); }, [filteredResult.ids]);

  // Hydration logic
  const visibleIds = useMemo(() => filteredResult.ids.slice(0, data.displayCount), [filteredResult.ids, data.displayCount]);

  useEffect(() => {
    let isMounted = true;
    if (visibleIds.length === 0) { data.setHydratedPhotos([]); return; }
    const loadVisiblePhotos = async () => {
      const existingMap = new Map(data.hydratedPhotos.map(p => [p.id, p]));
      const newIds = visibleIds.filter(id => !existingMap.has(id));
      if (newIds.length === 0) {
        const ordered = visibleIds.map(id => existingMap.get(id)).filter((p): p is Photo => !!p);
        if (isMounted && (ordered.length !== data.hydratedPhotos.length || ordered.some((p, i) => p.id !== data.hydratedPhotos[i].id))) {
          data.setHydratedPhotos(ordered);
        }
        return;
      }
      data.setLoadingMore(true);
      try {
        const newPhotos = await api.getPhotosByIds(newIds);
        if (!isMounted) return;
        const updatedMap = new Map(existingMap);
        newPhotos.forEach(p => updatedMap.set(p.id, p));
        data.setHydratedPhotos(visibleIds.map(id => updatedMap.get(id)).filter((p): p is Photo => !!p));
      } catch (err) { console.error("Hydration error:", err); }
      finally { if (isMounted) data.setLoadingMore(false); }
    };
    loadVisiblePhotos();
    return () => { isMounted = false; };
  }, [visibleIds]);

  // PDF Export
  const { exportProgress, isExporting, handleExportPDF } = usePdfExport({
    filteredResult, selectedExportIds, setSelectedExportIds, pdfLimit: data.pdfLimit, tags: data.tags, showAlert, onPdfReady
  });

  // Photo Form
  const form = usePhotoForm({
    userId: user?.id || '',
    categories: data.categories,
    tags: data.tags,
    showAlert,
    fetchData: data.fetchData,
    setHydratedPhotos: data.setHydratedPhotos,
  });

  // Fullscreen lightbox
  const fs = useFullscreenLightbox();

  // Helper: can the current user edit/delete a specific photo?
  const canEditPhoto = (photo: { userId?: string }) => {
    if (!user) return false;
    if (user.isAdmin) return true;
    if (user.isVisitor) return false;
    if (user.isProjetista) return photo.userId === user.id;
    return photo.userId === user.id;
  };

  const copyToClipboard = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    showAlert('Sucesso', 'Link copiado para a area de transferencia!', 'success');
  };

  const effectiveSelectionCount = useMemo(() => {
    if (selectedExportIds.size === 0) return 0;
    return filteredResult.ids.filter(id => selectedExportIds.has(id)).length;
  }, [selectedExportIds, filteredResult.ids]);

  const selectAllFiltered = () => setSelectedExportIds(new Set(filteredResult.ids));
  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedExportIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const clearAllState = () => {
    setSearchTerm(''); setSelectedTagIds([]); setSelectedExportIds(new Set());
    if (user?.isAdmin || user?.isProjetista) { setOnlyMine(false); setSelectedUserId('all'); }
  };

  // Mobile back button
  const handleMobileBack = (): boolean => {
    if (fs.fsUrl) { fs.closeFullscreen(); return true; }
    if (pdfActionModal.isOpen) { setPdfActionModal(prev => ({ ...prev, isOpen: false })); return true; }
    if (isPreviewOpen) { setIsPreviewOpen(false); return true; }
    if (form.isModalOpen) { form.setIsModalOpen(false); return true; }
    return false;
  };

  const hasActiveFilters = selectedTagIds.length > 0 || selectedExportIds.size > 0 || searchTerm !== '' || ((user?.isAdmin || user?.isProjetista) && (selectedUserId !== 'all' || onlyMine));

  // ─── Header Actions ──────────────────────────────────────────
  const headerActions = (
    <div className="flex gap-2">
      <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-xl shadow-sm">
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
        </svg>
        <input type="range" min="2" max="10" value={gridCols} onChange={(e) => setGridCols(parseInt(e.target.value))}
          className="w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" title="Zoom da Grade" />
        <span className="text-[10px] font-bold text-slate-500 w-4">{gridCols}</span>
      </div>
      <Button variant="primary" onClick={() => { if (effectiveSelectionCount > 0) handleExportPDF(); }}
        className={`py-2 px-4 text-xs font-bold transition-all whitespace-nowrap shadow-sm border ${getPdfButtonClasses(effectiveSelectionCount, data.pdfLimit)}`}>
        Gerar PDF ({effectiveSelectionCount})
      </Button>
      <Button variant="primary" onClick={() => { if (filteredResult.ids.length > 0) selectAllFiltered(); }}
        className={`py-2 px-4 text-xs font-bold transition-all whitespace-nowrap shadow-sm border ${filteredResult.ids.length === 0 ? 'opacity-30 cursor-not-allowed bg-slate-50' : getPdfButtonClasses(effectiveSelectionCount, data.pdfLimit)}`}>
        {effectiveSelectionCount > 0 && effectiveSelectionCount === filteredResult.ids.length ? 'Todos Selecionados' : `Selecionar Tudo (${filteredResult.ids.length})`}
      </Button>
      <Button variant="primary" onClick={() => { if (hasActiveFilters) clearAllState(); }}
        className={`py-2 px-4 text-xs font-bold transition-all whitespace-nowrap shadow-sm border ${getPdfButtonClasses(effectiveSelectionCount, data.pdfLimit)}`}>
        Limpar Tudo
      </Button>
    </div>
  );

  // ─── Mobile Sidebar ──────────────────────────────────────────
  const mobileSidebarContent = (
    <div className="flex flex-col gap-2">
      {!user?.isVisitor && (
        <Button onClick={() => form.handleOpenModal()} variant="danger" className="w-full py-2 text-xs font-bold shadow-sm">+ Novo Registro</Button>
      )}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <input type="text" placeholder="Pesquisar..." className="w-full bg-slate-100 border-none rounded-xl py-2 pl-9 pr-3 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>
      {(user?.isAdmin || user?.isProjetista) && (
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
          <input type="checkbox" id="onlyMineSidebar" checked={onlyMine} onChange={e => { setOnlyMine(e.target.checked); if (e.target.checked) setSelectedUserId('all'); }} className="w-4 h-4 text-blue-600 rounded border-slate-300" />
          <label htmlFor="onlyMineSidebar" className="text-xs font-medium text-slate-600 cursor-pointer select-none">Apenas meus registros</label>
        </div>
      )}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
        <input type="checkbox" id="sortByDateSidebar" checked={sortByDate} onChange={e => setSortByDate(e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-slate-300" />
        <label htmlFor="sortByDateSidebar" className="text-xs font-medium text-slate-600 cursor-pointer select-none">Ordem de Cadastro</label>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">Autor:</label>
        <select value={selectedUserId} onChange={(e) => { setSelectedUserId(e.target.value); if (e.target.value !== 'all') setOnlyMine(false); }}
          className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer flex-1">
          <option value="all">Todos os Autores</option>
          {data.usersWithPhotos.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <Layout title="Galeria Estruturada" headerActions={headerActions} mobileSidebarContent={mobileSidebarContent} onMobileBack={handleMobileBack}>
      <>
        <div className="flex flex-col gap-1 md:gap-2">
          <Card className="p-1 md:p-3">
            {/* Desktop controls */}
            <div className="hidden md:flex flex-col md:flex-row gap-4 items-center justify-between mb-2 border-b border-slate-100 pb-2">
              <div className="flex-1 w-full max-w-md flex gap-2">
                <div className="hidden md:flex flex-1 relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input type="text" placeholder="Pesquisar por nome ou etiqueta..." className="w-full bg-slate-100 border-none rounded-2xl py-3 pl-11 pr-4 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(user?.isAdmin || user?.isProjetista) && (
                  <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                    <input type="checkbox" id="onlyMine" checked={onlyMine} onChange={e => { setOnlyMine(e.target.checked); if (e.target.checked) setSelectedUserId('all'); }} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                    <label htmlFor="onlyMine" className="text-xs font-medium text-slate-600 cursor-pointer select-none">Apenas meus registros</label>
                  </div>
                )}
                <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-lg border border-slate-200">
                  <label htmlFor="userFilter" className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Autor:</label>
                  <select id="userFilter" value={selectedUserId} onChange={(e) => { setSelectedUserId(e.target.value); if (e.target.value !== 'all') setOnlyMine(false); }}
                    className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer">
                    <option value="all">Todos os Autores</option>
                    {data.usersWithPhotos.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200" title="Ordena do mais recente para o mais antigo">
                  <input type="checkbox" id="sortByDate" checked={sortByDate} onChange={e => setSortByDate(e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                  <label htmlFor="sortByDate" className="text-xs font-medium text-slate-600 cursor-pointer select-none">Ordem de Cadastro</label>
                </div>
                {!user?.isVisitor && (
                  <Button onClick={() => form.handleOpenModal()} variant="danger" className="hidden md:block py-1.5 md:py-1.5 px-3 md:px-4 text-[10px] md:text-xs font-bold shadow-sm hover:scale-105 transition-transform shrink-0 whitespace-nowrap">
                    + Novo Registro
                  </Button>
                )}
              </div>
            </div>

            {/* Filter matrix */}
            <div className="space-y-1 mt-2">
              <div className="md:hidden flex items-center gap-2 mb-1">
                <span className="text-sm font-black text-slate-700 uppercase tracking-tight shrink-0">Galeria</span>
                <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full whitespace-nowrap">{filteredResult.ids.length} registros</span>
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg px-1.5 py-0.5 ml-auto">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Zoom</span>
                  <button onClick={() => setTagFontSize(s => Math.max(7, s - 1))} className="w-6 h-6 flex items-center justify-center rounded bg-white border border-slate-200 text-slate-600 text-sm font-black hover:bg-blue-50 hover:text-blue-600 active:scale-95 transition-all">&#x2212;</button>
                  <span className="text-[10px] font-bold text-slate-500 min-w-[20px] text-center">{tagFontSize}</span>
                  <button onClick={() => setTagFontSize(s => Math.min(14, s + 1))} className="w-6 h-6 flex items-center justify-center rounded bg-white border border-slate-200 text-slate-600 text-sm font-black hover:bg-blue-50 hover:text-blue-600 active:scale-95 transition-all">+</button>
                </div>
              </div>

              <button className="md:hidden w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all !bg-blue-600 !text-white !border-blue-600 hover:!bg-blue-700 border"
                onClick={() => setShowMobileFilters(!showMobileFilters)}>
                <div className="flex items-center gap-2">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 4h18M3 12h18m-7 8h7" /></svg>
                  Filtro Hierarquico
                </div>
                <svg className={`w-3 h-3 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
              </button>
              <h3 className="hidden md:flex text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] items-center gap-2">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 4h18M3 12h18m-7 8h7" /></svg>
                Matriz de Filtragem Hierarquica
              </h3>
              <div className={`${showMobileFilters ? 'flex' : 'hidden md:flex'} flex-col gap-0.5 animate-in fade-in duration-300`}>
                {(() => {
                  const maxSelectedOrder = selectedTagIds.length > 0 ? Math.max(...selectedTagIds.map(sid => {
                    const t = data.tags.find(tag => tag.id === sid);
                    const c = t ? data.categories.find(cat => cat.id === t.categoryId) : undefined;
                    return c ? c.order : 0;
                  })) : 0;
                  return data.categories.map((cat) => (
                    <div key={cat.id} className="group relative flex flex-col md:flex-row md:items-center bg-white border border-slate-200 rounded-xl px-1.5 md:px-3 py-0.5 transition-all hover:border-blue-400 hover:shadow-md">
                      <div className="md:w-36 flex-shrink-0 flex items-center gap-2 mb-1 md:mb-0 border-b md:border-b-0 md:border-r border-slate-100 pb-1 md:pb-0 md:pr-3">
                        <span className="w-5 h-5 bg-blue-600 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-sm">{cat.order}</span>
                        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">{cat.name}</h4>
                      </div>
                      <div className="flex-1 md:pl-4 flex flex-wrap gap-x-0.5 gap-y-0.5 md:gap-x-1.5 md:gap-y-1 py-0.5">
                        {data.tags.filter(t => t.categoryId === cat.id).map(tag => {
                          const isSelected = selectedTagIds.includes(tag.id);
                          const isAvailable = filteredResult.availableTagsByLevel[cat.order]?.has(tag.id);
                          const isLineage = !isSelected && filteredResult.activeLineageTags?.has(tag.id) && selectedTagIds.length > 0 && cat.order < maxSelectedOrder;
                          if (!isAvailable && !isSelected) return null;
                          let buttonClasses = 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-blue-400 hover:text-blue-600';
                          if (isSelected) buttonClasses = 'bg-blue-600 border-blue-600 text-white shadow-md scale-105';
                          else if (isLineage) buttonClasses = 'bg-slate-50 border-green-300 text-green-600 hover:bg-white hover:border-green-400 hover:text-green-700';
                          return (
                            <button key={tag.id} onClick={() => toggleFilterTag(tag.id)}
                              style={{ fontSize: `${tagFontSize}px`, padding: `${Math.round(tagFontSize * 0.22)}px ${Math.round(tagFontSize * 0.55)}px` }}
                              className={`rounded-full font-bold border transition-all flex items-center gap-1 ${buttonClasses}`}>
                              {isSelected && <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                              {tag.name}
                            </button>
                          );
                        })}
                        {data.tags.filter(t => t.categoryId === cat.id).length === 0 && <span className="text-[9px] text-slate-300 italic">Sem tags</span>}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </Card>

          {/* Photo Grid */}
          {data.loading ? <LoadingSpinner /> : (
            <div className="grid gap-1.5 md:gap-4 transition-all duration-300 ease-in-out" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
              {data.hydratedPhotos.map((photo, idx) => (
                <Card key={photo.id}
                  className={`overflow-hidden group flex flex-col h-full hover:ring-2 transition-all cursor-pointer shadow-sm bg-white ${selectedExportIds.has(photo.id) ? 'ring-2 ring-blue-500 bg-blue-50/30' : 'hover:ring-blue-500'}`}
                  onClick={() => { setPreviewPhoto(photo); setIsPreviewOpen(true); }}
                  ref={idx === data.hydratedPhotos.length - 1 ? (el) => {
                    if (el) {
                      const observer = new IntersectionObserver((entries) => {
                        if (entries[0].isIntersecting && data.displayCount < filteredResult.ids.length && !data.loadingMore) {
                          data.loadMore(filteredResult.ids.length); observer.disconnect();
                        }
                      }, { threshold: 0.1 });
                      observer.observe(el);
                    }
                  } : undefined}>
                  <div className="relative aspect-[4/3] bg-slate-50 overflow-hidden">
                    <img src={photo.thumbnailUrl || photo.url} alt={photo.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center before:content-[''] before:absolute before:-inset-3 ${selectedExportIds.has(photo.id) ? 'bg-blue-600 border-blue-600' : 'bg-white/20 border-white/50 backdrop-blur-sm group-hover:bg-white/40'}`}
                      onClick={(e) => toggleSelection(e, photo.id)}>
                      {selectedExportIds.has(photo.id) && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      )}
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1">
                      {canEditPhoto(photo) && (
                        <button onClick={(e) => { e.stopPropagation(); form.handleOpenModal(photo); }}
                          className="hidden sm:block p-1.5 bg-blue-600/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-blue-700" title="Editar registro">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                      )}
                      {photo.localPath && (
                        <button onClick={(e) => copyToClipboard(e, photo.localPath!)} className="hidden sm:block p-1.5 bg-slate-800/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-slate-900" title="Caminho local">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                        </button>
                      )}
                      {photo.videoUrl && (
                        <button onClick={(e) => { e.stopPropagation(); window.open(photo.videoUrl, '_blank', 'noopener,noreferrer'); }}
                          className="p-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg transition-all shadow-lg hover:from-purple-700 hover:to-pink-700 hover:scale-110" title="Abrir video">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-2 flex flex-col justify-center">
                    <h4 className="text-[10px] font-black text-slate-800 tracking-tight truncate">{photo.name}</h4>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Mobile Sticky Bar */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-t border-slate-200 px-1.5 pt-1.5 flex gap-1.5 shadow-[0_-8px_30px_rgb(0,0,0,0.12)]" style={{ paddingBottom: 'calc(6px + env(safe-area-inset-bottom))' }}>
            <Button variant="outline" onClick={clearAllState}
              className={`flex-[0.6] min-w-0 px-1 h-9 text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all border ${hasActiveFilters ? '!bg-blue-600 !text-white !border-blue-600 shadow-blue-500/30 hover:!bg-blue-700 cursor-pointer' : '!bg-blue-100 !text-blue-700 !border-blue-200 shadow-none hover:!bg-blue-200 transition-colors cursor-pointer'}`}>
              Limpar
            </Button>
            <Button variant="outline" onClick={selectAllFiltered}
              className={`flex-[0.6] min-w-0 px-1 h-9 text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all border ${effectiveSelectionCount > data.pdfLimit ? '!bg-red-600 !text-white !border-red-600 shadow-red-500/30 hover:!bg-red-700 cursor-pointer' : '!bg-blue-600 !text-white !border-blue-600 shadow-blue-500/30 hover:!bg-blue-700 cursor-pointer'}`}>
              Tudo
            </Button>
            <Button onClick={() => { if (effectiveSelectionCount > 0 && !isExporting) handleExportPDF(); }}
              className={`flex-[1.8] min-w-0 whitespace-nowrap px-2 h-9 shadow-lg text-[10px] font-black uppercase tracking-widest transition-all border ${isExporting ? 'opacity-50 cursor-wait' : ''} ${getPdfButtonClasses(effectiveSelectionCount, data.pdfLimit)}`}>
              {isExporting ? 'Aguarde...' : `GERAR PDF (${effectiveSelectionCount})`}
            </Button>
          </div>

          <div className="md:hidden" style={{ height: 'calc(5rem + env(safe-area-inset-bottom))' }}></div>
          {data.loadingMore && <div className="py-8 text-center"><LoadingSpinner /></div>}
        </div>

        {/* Form Modal */}
        <PhotoFormModal
          isOpen={form.isModalOpen}
          onClose={() => form.setIsModalOpen(false)}
          form={form}
          categories={data.categories}
          tags={data.tags}
          allUsers={data.allUsers}
          currentUserId={user?.id}
          copyToClipboard={copyToClipboard}
        />

        {/* Preview Modal */}
        <PhotoPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          photo={previewPhoto}
          canEdit={previewPhoto ? canEditPhoto(previewPhoto) : false}
          onEdit={() => { setIsPreviewOpen(false); if (previewPhoto) form.handleOpenModal(previewPhoto); }}
          onDelete={(e) => { setIsPreviewOpen(false); if (previewPhoto) form.handleDelete(e, previewPhoto.id); }}
          onFullscreen={() => previewPhoto?.url && fs.openFullscreen(previewPhoto.url)}
        />

        {/* Fullscreen Overlay */}
        {fs.fsUrl && <FullscreenOverlay {...fs} fsUrl={fs.fsUrl} />}

        {/* Export Action Bar */}
        {selectedExportIds.size > 0 && (
          <div className="hidden md:block fixed bottom-2 md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce-in w-[95%] md:w-auto max-w-lg">
            <div className="bg-slate-900 border border-slate-700 text-white !px-2 md:px-6 !py-2 md:py-4 rounded-xl shadow-2xl flex items-center justify-between gap-3 backdrop-blur-xl">
              <div className="flex flex-col">
                <span className="text-xs md:text-sm font-bold whitespace-nowrap">{effectiveSelectionCount} {effectiveSelectionCount === 1 ? 'Foto' : 'Fotos'}</span>
                <span className="text-[9px] md:text-[10px] text-slate-400 truncate max-w-[120px] md:max-w-none">{selectedExportIds.size !== effectiveSelectionCount ? `(${selectedExportIds.size} selec.)` : 'Pronto p/ PDF'}</span>
              </div>
              <div className="h-6 w-px bg-slate-700 hidden md:block"></div>
              <div className="flex gap-2 overflow-hidden">
                <Button variant="outline" onClick={() => setSelectedExportIds(new Set())} className="text-slate-300 border-slate-600 hover:bg-slate-800 p-1.5 md:py-1.5 md:px-4 text-[10px] md:text-xs h-8 md:h-9" title="Cancelar selecao">
                  <span className="hidden md:inline">Cancelar</span>
                  <svg className="w-4 h-4 md:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </Button>
                <Button onClick={handleExportPDF}
                  className={`py-1.5 px-4 md:px-6 text-[10px] md:text-xs h-9 md:h-10 shadow-lg flex items-center gap-1.5 md:gap-2 transition-all whitespace-nowrap ${effectiveSelectionCount > data.pdfLimit ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <span className="sm:inline">Gerar PDF</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        <PdfProgressModal isExporting={isExporting} exportProgress={exportProgress} />
        <PdfActionsModal isOpen={pdfActionModal.isOpen} blob={pdfActionModal.blob} fileName={pdfActionModal.fileName}
          onClose={() => setPdfActionModal(prev => ({ ...prev, isOpen: false }))} />
        <AlertModal {...alertState} onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))} />
      </>
    </Layout>
  );
};

export default Photos;
