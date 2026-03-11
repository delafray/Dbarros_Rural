import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { Photo, Tag, TagCategory } from '../types';
import { Button, Card, LoadingSpinner, Modal } from '../components/UI';
import { AlertModal, AlertType } from '../components/AlertModal';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { processAndCompressImage } from '../src/utils/imageUtils';

import { usePhotoFilters } from '../src/hooks/usePhotoFilters';
import { usePdfExport } from '../src/hooks/usePdfExport';
import { useFullscreenLightbox } from '../src/hooks/useFullscreenLightbox';
import { usePhotosData } from '../src/hooks/usePhotosData';
import { usePhotoForm } from '../src/hooks/usePhotoForm';

import FullscreenOverlay from '../components/photos/FullscreenOverlay';
import { PdfProgressModal, PdfActionsModal } from '../components/photos/PdfModals';

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

  const getPdfButtonClasses = (count: number, limit: number) => {
    if (count === 0) return '!bg-blue-100 !text-blue-700 !border-blue-200 shadow-none hover:!bg-blue-200 transition-colors cursor-pointer';
    if (count > limit) return '!bg-red-600 !text-white !border-red-600 shadow-red-500/30 hover:!bg-red-700 cursor-pointer';
    return '!bg-blue-600 !text-white !border-blue-600 shadow-blue-500/30 hover:!bg-blue-700 cursor-pointer';
  };
  const getTudoButtonClasses = (count: number, limit: number) => {
    if (count > limit) return '!bg-red-600 !text-white !border-red-600 shadow-red-500/30 hover:!bg-red-700 cursor-pointer';
    return '!bg-blue-600 !text-white !border-blue-600 shadow-blue-500/30 hover:!bg-blue-700 cursor-pointer';
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
      {(() => {
        const hasActiveFilters = selectedTagIds.length > 0 || selectedExportIds.size > 0 || searchTerm !== '' || ((user?.isAdmin || user?.isProjetista) && (selectedUserId !== 'all' || onlyMine));
        return (
          <Button variant="primary" onClick={() => { if (hasActiveFilters) clearAllState(); }}
            className={`py-2 px-4 text-xs font-bold transition-all whitespace-nowrap shadow-sm border ${getPdfButtonClasses(effectiveSelectionCount, data.pdfLimit)}`}>
            Limpar Tudo
          </Button>
        );
      })()}
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
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-t border-slate-200 p-1.5 flex gap-1.5 shadow-[0_-8px_30px_rgb(0,0,0,0.12)]">
            {(() => {
              const hasActiveFilters = selectedTagIds.length > 0 || selectedExportIds.size > 0 || searchTerm !== '' || ((user?.isAdmin || user?.isProjetista) && (selectedUserId !== 'all' || onlyMine));
              return (
                <Button variant="outline" onClick={clearAllState}
                  className={`flex-[0.6] min-w-0 px-1 h-9 text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all border ${hasActiveFilters ? '!bg-blue-600 !text-white !border-blue-600 shadow-blue-500/30 hover:!bg-blue-700 cursor-pointer' : '!bg-blue-100 !text-blue-700 !border-blue-200 shadow-none hover:!bg-blue-200 transition-colors cursor-pointer'}`}>
                  Limpar
                </Button>
              );
            })()}
            <Button variant="outline" onClick={selectAllFiltered}
              className={`flex-[0.6] min-w-0 px-1 h-9 text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all border ${getTudoButtonClasses(effectiveSelectionCount, data.pdfLimit)}`}>
              Tudo
            </Button>
            <Button onClick={() => { if (effectiveSelectionCount > 0 && !isExporting) handleExportPDF(); }}
              className={`flex-[1.8] min-w-0 whitespace-nowrap px-2 h-9 shadow-lg text-[10px] font-black uppercase tracking-widest transition-all border ${isExporting ? 'opacity-50 cursor-wait' : ''} ${getPdfButtonClasses(effectiveSelectionCount, data.pdfLimit)}`}>
              {isExporting ? 'Aguarde...' : `GERAR PDF (${effectiveSelectionCount})`}
            </Button>
          </div>

          <div className="md:hidden h-20"></div>
          {data.loadingMore && <div className="py-8 text-center"><LoadingSpinner /></div>}
        </div>

        {/* Form Modal - kept inline due to complex form JSX bindings */}
        <Modal isOpen={form.isModalOpen} onClose={() => form.setIsModalOpen(false)}
          title={
            <div className="flex flex-col md:flex-row md:items-center gap-4 w-full min-w-0">
              <div className="flex items-center gap-4 flex-shrink-0">
                <span className="text-lg font-black text-slate-800 whitespace-nowrap">{form.editingPhoto ? 'EDITAR' : 'NOVO REGISTRO'}</span>
                <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
                <div className="hidden lg:flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  <div className="w-1.5 h-4 bg-blue-600 rounded-full mr-2"></div>Atribuicao
                </div>
              </div>
              <div className="flex-1 flex gap-2 min-w-0">
                <input placeholder="Titulo do Registro..." value={form.formData.name}
                  onChange={e => form.setFormData({ ...form.formData, name: e.target.value })}
                  className="flex-[1.5] min-w-0 bg-white border-2 border-blue-400 rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 shadow-sm outline-none transition-all" required />
                <div className="hidden sm:flex flex-1 min-w-0 relative group items-center">
                  <input placeholder="Caminho (Local)..." value={form.formData.localPath}
                    onChange={e => form.setFormData({ ...form.formData, localPath: e.target.value })}
                    className="w-full min-w-0 bg-white border-2 border-blue-400 rounded-lg px-2.5 py-1 pr-8 text-[11px] font-mono text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 shadow-sm outline-none transition-all" />
                  {form.formData.localPath && (
                    <button type="button" onClick={(e) => copyToClipboard(e, form.formData.localPath!)}
                      className="absolute right-1 p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Copiar caminho local">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                  )}
                </div>
                <input placeholder="Servidor / HD..." title="Servidor ou HD Externo onde esta o arquivo original da foto/video"
                  value={form.formData.storageLocation} onChange={e => form.setFormData({ ...form.formData, storageLocation: e.target.value })}
                  className="hidden md:block flex-[0.8] min-w-0 bg-white border-2 border-slate-300 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500 shadow-sm outline-none transition-all" />
              </div>
            </div>
          } maxWidth="max-w-[95vw]">
          {(() => {
            const cat1 = data.categories.find(c => c.order === 1);
            const videoTag = cat1 ? data.tags.find(t => t.categoryId === cat1.id && t.order === 1) : null;
            const isVideoMode = !!(videoTag && form.formData.tagIds.includes(videoTag.id));
            return (
              <form onSubmit={form.handleSave} className="flex flex-col gap-6 max-h-[85vh]">
                <div className="flex flex-col lg:flex-row gap-10 overflow-y-auto pr-4 pb-4 scrollbar-thin">
                  <div className="w-full lg:w-96 flex-shrink-0 space-y-6">
                    <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">Autoria do Registro</label>
                      <select className="w-full rounded-xl border-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-2 px-3 font-bold text-slate-700 bg-white"
                        value={form.formData.userId} onChange={(e) => form.setFormData({ ...form.formData, userId: e.target.value })}>
                        {data.allUsers.map(u => <option key={u.id} value={u.id}>{u.name} {u.id === user?.id ? '(Voce)' : ''}</option>)}
                      </select>
                    </div>
                    <div className="space-y-3">
                      {isVideoMode ? (
                        <div className="space-y-3">
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                              <input type="url" placeholder="Link do Instagram (Reel) ou YouTube..." value={form.formData.videoUrl}
                                onChange={e => { form.setFormData({ ...form.formData, videoUrl: e.target.value }); form.setVideoPreviewDataUrl(''); }}
                                className="flex-1 min-w-0 bg-white border border-purple-200 rounded-xl px-3 py-2 text-[11px] font-mono focus:ring-2 focus:ring-purple-400 outline-none transition-all placeholder:text-slate-300" />
                              <button type="button" onClick={() => { if (form.formData.videoUrl.trim()) window.open(form.formData.videoUrl, '_blank', 'noopener,noreferrer'); }}
                                disabled={!form.formData.videoUrl.trim()}
                                className="px-3 py-2 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-xl hover:bg-slate-200 disabled:opacity-50 transition-all border border-slate-200" title="Testar se o link abre corretamente">
                                &#x1f517; Testar
                              </button>
                            </div>
                            <button type="button" onClick={form.handleFetchThumbnail} disabled={!form.formData.videoUrl.trim() || form.fetchingThumbnail}
                              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-black rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/20">
                              {form.fetchingThumbnail ? '&#x23F3; Buscando Capa...' : (form.formData.url && isVideoMode ? '&#x1f504; Atualizar Capa Automatica' : '&#x1f50d; Buscar Capa Automaticamente')}
                            </button>
                          </div>
                          <div className={`aspect-video rounded-2xl overflow-hidden border-2 border-dashed flex items-center justify-center transition-all ${form.videoPreviewDataUrl ? 'border-green-300 bg-green-50' : 'border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50'}`}>
                            {form.videoPreviewDataUrl ? (
                              <div className="relative w-full h-full group/vidprev">
                                <img src={form.videoPreviewDataUrl} alt="Capa do video" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-12 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
                                    <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                  </div>
                                </div>
                                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                                  <span className="bg-green-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                                    {form.videoPreviewDataUrl.startsWith('data:') ? '&#x2713; Capa capturada e comprimida' : '&#x2713; Capa atual do registro'}
                                  </span>
                                  <button type="button" onClick={() => form.setVideoPreviewDataUrl('')} className="bg-black/50 text-white text-[9px] px-2 py-0.5 rounded-full">Trocar</button>
                                </div>
                              </div>
                            ) : form.fetchingThumbnail ? (
                              <div className="flex flex-col items-center gap-3 text-purple-500">
                                <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                                <span className="text-[10px] font-bold">Buscando capa...</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-3 p-6">
                                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                  <span className="text-[10px] font-black text-purple-700 uppercase tracking-widest text-center">Busque a capa ou suba manualmente</span>
                                  <div className="flex gap-2">
                                    <button type="button" onClick={() => document.getElementById('manual-video-thumb')?.click()}
                                      className="px-3 py-1.5 bg-white border border-purple-200 text-purple-600 text-[9px] font-black rounded-lg hover:bg-purple-50 transition-all flex items-center gap-1.5">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                      UPLOAD MANUAL
                                    </button>
                                    <input id="manual-video-thumb" type="file" accept="image/*" className="hidden"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          form.setProcessingImage(true);
                                          try { const compressed = await processAndCompressImage(file); form.setVideoPreviewDataUrl(compressed); }
                                          finally { form.setProcessingImage(false); }
                                        }
                                      }} />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div className={`aspect-video lg:aspect-square bg-slate-50 border-2 border-dashed rounded-3xl overflow-hidden flex items-center justify-center relative transition-all duration-300 ${form.formData.url ? 'border-blue-200' : 'border-slate-200 hover:border-blue-400'}`}>
                            {form.formData.url ? (
                              <div className="w-full h-full relative group/preview">
                                <img src={form.formData.url} className="w-full h-full object-cover" alt="Preview" />
                                {!form.processingImage && (
                                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                                    <label className="cursor-pointer bg-white px-6 py-2 rounded-xl font-black text-[10px] uppercase shadow-2xl hover:bg-slate-100 transition-colors">
                                      Trocar Imagem <input type="file" className="sr-only" accept="image/*" onChange={form.handleFileUpload} disabled={form.processingImage} />
                                    </label>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <label className="cursor-pointer p-10 text-center w-full h-full flex flex-col items-center justify-center">
                                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 transition-all hover:scale-110 shadow-sm"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg></div>
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Upload Imagem</span>
                                <input type="file" className="sr-only" accept="image/*" onChange={form.handleFileUpload} disabled={form.processingImage} />
                              </label>
                            )}
                          </div>
                          {form.editingPhoto && form.formData.url && (
                            <div className="flex justify-center mt-1">
                              <label className="cursor-pointer px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors border border-slate-200 flex items-center gap-2 shadow-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                Alterar Imagem Deste Registro
                                <input type="file" className="sr-only" accept="image/*" onChange={form.handleFileUpload} disabled={form.processingImage} />
                              </label>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-col gap-1">
                      {data.categories.map(cat => {
                        const cat1 = data.categories.find(c => c.order === 1);
                        const vTag = cat1 ? data.tags.find(t => t.categoryId === cat1.id && t.order === 1) : null;
                        const isVM = !!(vTag && form.formData.tagIds.includes(vTag.id));
                        const isCat1 = cat.order === 1;
                        return (
                          <div key={cat.id} className="group relative flex flex-col md:flex-row md:items-center bg-white border border-slate-200 rounded-xl px-3 py-0.5 transition-all hover:border-blue-400 hover:shadow-md">
                            <div className="md:w-36 flex-shrink-0 flex items-center gap-2 mb-1 md:mb-0 border-b md:border-b-0 md:border-r border-slate-100 pb-1 md:pb-0 md:pr-3">
                              <span className={`w-5 h-5 ${cat.isRequired ? 'bg-red-600' : 'bg-blue-600'} text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-sm`}>{cat.order}</span>
                              <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">{cat.name}</h4>
                              {isVM && isCat1 && <span className="text-[9px] text-purple-600 font-black bg-purple-50 px-1.5 py-0.5 rounded ml-auto md:ml-0">&#x1f3ac; VIDEO</span>}
                            </div>
                            <div className="flex-1 md:pl-4 flex flex-wrap gap-x-1.5 gap-y-1 py-0.5">
                              {data.tags.filter(t => t.categoryId === cat.id).map(tag => {
                                const isSelected = form.formData.tagIds.includes(tag.id);
                                const isVideoTag = vTag && tag.id === vTag.id;
                                const isDisabled = isVM && isCat1 && !isVideoTag;
                                return (
                                  <button key={tag.id} type="button" disabled={isDisabled} onClick={() => !isDisabled && form.toggleModalTag(tag.id)}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1.5 ${isDisabled ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-50' : isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-blue-400 hover:text-blue-600'}`}>
                                    {isSelected && !isDisabled && <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                                    {tag.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 sm:pt-8 border-t border-slate-100 bg-white mt-auto">
                  <div className="hidden sm:block bg-blue-50 px-5 py-3 rounded-2xl border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-700 leading-tight uppercase">Salvamento com compactacao inteligente ativa</p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" type="button" onClick={() => form.setIsModalOpen(false)} className="flex-1 sm:flex-none py-2 px-4 text-xs h-11 sm:h-10">Cancelar</Button>
                    <Button type="submit" disabled={form.saving || (!isVideoMode && !form.formData.url) || form.processingImage} className="flex-1 sm:flex-none px-6 sm:px-10 py-2 shadow-xl shadow-blue-500/20 text-xs font-black uppercase tracking-widest h-11 sm:h-10">
                      {form.saving || form.processingImage ? 'Processando...' : 'Finalizar'}
                    </Button>
                  </div>
                </div>
              </form>
            );
          })()}
        </Modal>

        {/* Preview Modal */}
        <Modal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title={previewPhoto?.name || 'Vistas'} maxWidth="max-w-4xl">
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-full max-h-[60vh] bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-2xl">
              <img src={previewPhoto?.url} alt={previewPhoto?.name} className="max-w-full max-h-[60vh] object-contain cursor-zoom-out" onClick={() => setIsPreviewOpen(false)} />
              <button onClick={() => setIsPreviewOpen(false)} className="absolute top-4 right-4 p-1.5 bg-black/40 text-white rounded-full hover:bg-black/60 transition-all shadow-xl backdrop-blur-md border border-white/10">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex flex-col items-center gap-2 mt-1 w-full">
              {previewPhoto?.userName && (
                <div className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 rounded-xl border border-blue-200 shadow-sm w-full justify-center">
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Cadastrado por:</span>
                  <span className="text-[11px] font-black text-blue-800">{previewPhoto.userName}</span>
                </div>
              )}
              {previewPhoto?.storageLocation && (
                <div className="flex items-center gap-2 px-5 py-2.5 bg-green-50 rounded-xl border border-green-200 shadow-sm w-full justify-center mt-1">
                  <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">Servidor/HD Original:</span>
                  <span className="text-[11px] font-black text-green-800">{previewPhoto.storageLocation}</span>
                </div>
              )}
              <div className="flex flex-col items-center gap-2.5 w-full">
                {typeof navigator !== 'undefined' && (
                  <Button onClick={async () => {
                    if (!previewPhoto?.url) return;
                    try {
                      const response = await fetch(previewPhoto.url);
                      const blob = await response.blob();
                      const file = new File([blob], previewPhoto.name ? `${previewPhoto.name}.jpg` : 'foto.jpg', { type: blob.type || 'image/jpeg' });
                      const shareData: any = { title: previewPhoto.name || 'Foto da Galeria', files: [file] };
                      const defaultMsg = previewPhoto.name ? `Conforme combinado, segue arquivo referente a "${previewPhoto.name}" para referencia.` : `Conforme combinado, segue arquivo para referencia.`;
                      if (previewPhoto.videoUrl) shareData.text = `${defaultMsg}\nLink do video: ${previewPhoto.videoUrl}`;
                      else shareData.text = defaultMsg;
                      if (navigator.share) await navigator.share(shareData);
                      else throw new Error("Web Share not supported");
                    } catch (error: any) {
                      if (error.name !== 'AbortError') {
                        const fallbackMsg = previewPhoto.name ? `Conforme combinado, segue arquivo referente a "${previewPhoto.name}" para referencia.` : `Conforme combinado, segue arquivo para referencia.`;
                        if (navigator.share) {
                          try { await navigator.share({ title: previewPhoto.name || 'Foto da Galeria', text: previewPhoto.videoUrl ? `${fallbackMsg}\nLink do video: ${previewPhoto.videoUrl}` : `${fallbackMsg}\nLink: ${previewPhoto.url}` }); } catch { }
                        } else {
                          const text = encodeURIComponent(previewPhoto.videoUrl ? `${fallbackMsg}\nLink do video: ${previewPhoto.videoUrl}` : `${fallbackMsg}\nLink: ${previewPhoto.url}`);
                          window.open(`https://wa.me/?text=${text}`, '_blank');
                        }
                      }
                    }
                  }}
                    className="flex items-center justify-center w-full gap-2 py-3 px-6 text-[11px] font-black uppercase tracking-widest bg-[#25D366] hover:bg-[#128C7E] text-white shadow-md shadow-green-500/20 border-none transition-all">
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.788-.703-1.322-1.573-1.477-1.871-.153-.299-.016-.461.133-.611.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                    Compartilhar (WhatsApp)
                  </Button>
                )}
                <Button onClick={() => previewPhoto?.url && fs.openFullscreen(previewPhoto.url)} className="flex items-center justify-center w-full gap-2 py-3 px-6 text-[11px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 border-none transition-all">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                  Ver em Tela Cheia
                </Button>
                {previewPhoto && canEditPhoto(previewPhoto) && (
                  <div className="flex w-full items-center gap-2.5">
                    <Button onClick={() => { setIsPreviewOpen(false); form.handleOpenModal(previewPhoto); }} className="flex-1 py-2.5 px-4 text-[10px] font-black uppercase tracking-widest shadow-md shadow-blue-500/20">Editar</Button>
                    <Button variant="danger" onClick={(e) => { setIsPreviewOpen(false); form.handleDelete(e, previewPhoto.id); }}
                      className="flex-1 py-2.5 px-4 text-[10px] font-black uppercase tracking-widest shadow-md shadow-red-500/20 flex items-center justify-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Excluir
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>

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
