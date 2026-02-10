
import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { Photo, Tag, TagCategory } from '../types';
import { Card, LoadingSpinner, Badge, Button, Input, Modal } from '../components/UI';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const MAX_DIMENSION = 1280;
const THUMB_SIZE = 300;
const QUALITY = 0.8;

const dataURLtoBlob = (dataurl: string) => {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

const generateThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > THUMB_SIZE) { height *= THUMB_SIZE / width; width = THUMB_SIZE; }
        } else {
          if (height > THUMB_SIZE) { width *= THUMB_SIZE / height; height = THUMB_SIZE; }
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas error');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

const PHOTOS_PER_PAGE = 24;

const Photos: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [photoIndex, setPhotoIndex] = useState<Array<{ id: string; name: string; tagIds: string[] }>>([]);
  const [hydratedPhotos, setHydratedPhotos] = useState<Photo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);

  // Pagination state based on filtered results
  const [displayCount, setDisplayCount] = useState(PHOTOS_PER_PAGE);

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    thumbnailUrl: '',
    tagIds: [] as string[],
    localPath: '',
    selectedFile: null as File | null
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [index, t, c] = await Promise.all([
        api.getPhotoIndex(onlyMine),
        api.getTags(),
        api.getTagCategories()
      ]);
      setPhotoIndex(index);
      setTags(t);
      setCategories(c.sort((a, b) => a.order - b.order));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [onlyMine]);

  // --- LÓGICA DE FILTRAGEM USANDO O INDEX ---

  const filteredResult = useMemo(() => {
    let currentIds = [...photoIndex];

    // 1. Filtro por texto
    if (searchTerm) {
      currentIds = currentIds.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // 2. Filtro Hierárquico
    categories.forEach((cat) => {
      const catTags = tags.filter(t => t.categoryId === cat.id);
      const selectedInCat = selectedTagIds.filter(id => catTags.some(t => t.id === id));
      if (selectedInCat.length > 0) {
        currentIds = currentIds.filter(p =>
          selectedInCat.some(tagId => p.tagIds.includes(tagId))
        );
      }
    });

    // Calcular tags disponíveis (Cascata)
    const availableTagsByLevel: { [order: number]: Set<string> } = {};
    let tempIds = photoIndex;
    if (searchTerm) tempIds = tempIds.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    categories.forEach((cat) => {
      const currentAvailableTags = new Set<string>();
      tempIds.forEach(p => p.tagIds.forEach(tid => currentAvailableTags.add(tid)));
      availableTagsByLevel[cat.order] = currentAvailableTags;

      const catTags = tags.filter(t => t.categoryId === cat.id);
      const selectedInCat = selectedTagIds.filter(id => catTags.some(t => t.id === id));
      if (selectedInCat.length > 0) {
        tempIds = tempIds.filter(p => selectedInCat.some(tagId => p.tagIds.includes(tagId)));
      }
    });

    return {
      ids: currentIds.map(p => p.id),
      availableTagsByLevel
    };
  }, [photoIndex, categories, tags, selectedTagIds, searchTerm]);

  // Reset pagination count when filter changes
  useEffect(() => {
    setDisplayCount(PHOTOS_PER_PAGE);
  }, [filteredResult.ids]);

  // --- HYDRATION LOGIC (Fetch full photo details for visible IDs) ---

  const visibleIds = useMemo(() => {
    return filteredResult.ids.slice(0, displayCount);
  }, [filteredResult.ids, displayCount]);

  useEffect(() => {
    if (visibleIds.length === 0) {
      setHydratedPhotos([]);
      return;
    }

    const loadVisiblePhotos = async () => {
      // Determine which IDs we don't have yet in hydratedPhotos
      const existingMap = new Map(hydratedPhotos.map(p => [p.id, p]));
      const newIds = visibleIds.filter(id => !existingMap.has(id));

      if (newIds.length === 0) {
        // We have everyone, just ensure the order and subset are correct
        const ordered = visibleIds.map(id => existingMap.get(id)).filter((p): p is Photo => !!p);
        // Only update if the list is actually different (different length or different IDs)
        if (ordered.length !== hydratedPhotos.length ||
          ordered.some((p, i) => p.id !== hydratedPhotos[i].id)) {
          setHydratedPhotos(ordered);
        }
        return;
      }

      setLoadingMore(true);
      try {
        const newPhotos = await api.getPhotosByIds(newIds);
        const updatedMap = new Map(existingMap);
        newPhotos.forEach(p => updatedMap.set(p.id, p));

        const finalOrdered = visibleIds.map(id => updatedMap.get(id)).filter((p): p is Photo => !!p);
        setHydratedPhotos(finalOrdered);
      } catch (err) {
        console.error("Hydration error:", err);
      } finally {
        setLoadingMore(false);
      }
    };

    loadVisiblePhotos();
  }, [visibleIds]); // visibleIds already captures changes in filteredResult.ids and displayCount

  const loadMore = () => {
    if (displayCount < filteredResult.ids.length) {
      setDisplayCount(prev => prev + PHOTOS_PER_PAGE);
    }
  };

  // --- HANDLERS ---

  const processAndCompressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_DIMENSION) { height *= MAX_DIMENSION / width; width = MAX_DIMENSION; }
          } else {
            if (height > MAX_DIMENSION) { width *= MAX_DIMENSION / height; height = MAX_DIMENSION; }
          }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('Canvas error');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', QUALITY));
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessingImage(true);
    try {
      const compressedUrl = await processAndCompressImage(file);

      // Como o navegador não fornece o caminho real por segurança,
      // criamos um placeholder automático baseado no nome do arquivo
      // Ex: se o arquivo for "projeto_sala.jpg", vira "C:\PROJETOS\projeto_sala.jpg"
      const autoPath = `C:\\PROJETOS\\${file.name}`;

      setFormData(prev => ({
        ...prev,
        url: compressedUrl,
        name: prev.name || file.name.split('.')[0],
        localPath: prev.localPath || autoPath,
        selectedFile: file
      }));
    } finally {
      setProcessingImage(false);
    }
  };

  const handleOpenModal = (photo: Photo | null = null) => {
    if (photo) {
      setEditingPhoto(photo);
      setFormData({ name: photo.name, url: photo.url, thumbnailUrl: photo.thumbnailUrl || '', tagIds: photo.tagIds, localPath: photo.localPath || '', selectedFile: null });
    } else {
      setEditingPhoto(null);
      setFormData({ name: '', url: '', thumbnailUrl: '', tagIds: [], localPath: '', selectedFile: null });
    }
    setIsModalOpen(true);
  };

  const handleOpenPreview = (photo: Photo) => {
    setPreviewPhoto(photo);
    setIsPreviewOpen(true);
  };

  const toggleFilterTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const toggleModalTag = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId) ? prev.tagIds.filter(id => id !== tagId) : [...prev.tagIds, tagId]
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.url) return alert('Escolha uma foto');
    setSaving(true);
    try {
      let finalUrl = formData.url;
      let finalThumbUrl = formData.thumbnailUrl;

      // Se for um novo registro ou uma nova foto carregada, faz o upload para o Storage
      if (formData.selectedFile) {
        // Upload original
        const blob = dataURLtoBlob(formData.url);
        const fileToUpload = new File([blob], formData.selectedFile.name, { type: blob.type });
        finalUrl = await api.uploadPhotoFile(fileToUpload);

        // Gerar e Upload miniatura
        const thumbDataUrl = await generateThumbnail(formData.selectedFile);
        const thumbBlob = dataURLtoBlob(thumbDataUrl);
        const thumbToUpload = new File([thumbBlob], `thumb_${formData.selectedFile.name}`, { type: thumbBlob.type });
        finalThumbUrl = await api.uploadPhotoFile(thumbToUpload);
      }

      if (editingPhoto) await api.updatePhoto(editingPhoto.id, { ...formData, url: finalUrl, thumbnailUrl: finalThumbUrl });
      else await api.createPhoto({ ...formData, url: finalUrl, thumbnailUrl: finalThumbUrl });

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Excluir?')) return;
    await api.deletePhoto(id);
    fetchData();
  };

  const copyToClipboard = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    alert('Caminho copiado!');
  };

  return (
    <Layout title="Galeria Estruturada">
      <div className="flex flex-col gap-4">
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4 border-b border-slate-100 pb-4">
            <div className="flex-1 w-full max-w-md">
              <Input
                placeholder="Pesquisar por nome do projeto..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="py-1.5"
              />
            </div>
            {user?.isAdmin && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  id="onlyMine"
                  checked={onlyMine}
                  onChange={e => setOnlyMine(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="onlyMine" className="text-xs font-medium text-slate-600 cursor-pointer select-none">
                  Apenas meus registros
                </label>
              </div>
            )}
            <div className="flex gap-2">
              {selectedTagIds.length > 0 && (
                <Button variant="outline" onClick={() => setSelectedTagIds([])} className="text-red-500 border-red-100 py-1.5 text-xs">Limpar Tudo</Button>
              )}
              <Button onClick={() => handleOpenModal()} className="py-1.5 text-xs">+ Novo Registro</Button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 4h18M3 12h18m-7 8h7" /></svg>
              Matriz de Filtragem Hierárquica
            </h3>

            <div className="flex flex-col gap-1">
              {categories.map((cat) => (
                <div key={cat.id} className="group relative flex flex-col md:flex-row md:items-center bg-slate-50/30 border border-slate-100 rounded-xl px-3 py-1 transition-all hover:border-blue-100 hover:bg-white">
                  <div className="md:w-36 flex-shrink-0 flex items-center gap-2 mb-1 md:mb-0 border-b md:border-b-0 md:border-r border-slate-100 pb-1 md:pb-0 md:pr-3">
                    <span className="w-4 h-4 bg-slate-800 text-white text-[8px] font-black rounded flex items-center justify-center">
                      {cat.order}
                    </span>
                    <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-tighter truncate">{cat.name}</h4>
                  </div>

                  <div className="flex-1 md:pl-4 flex flex-wrap gap-x-1.5 gap-y-1 py-0.5">
                    {tags.filter(t => t.categoryId === cat.id).map(tag => {
                      const isSelected = selectedTagIds.includes(tag.id);
                      const isAvailable = filteredResult.availableTagsByLevel[cat.order]?.has(tag.id);

                      if (!isAvailable && !isSelected) return null;

                      return (
                        <button
                          key={tag.id}
                          onClick={() => toggleFilterTag(tag.id)}
                          className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border transition-all flex items-center gap-1 ${isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm scale-105'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'
                            }`}
                        >
                          {isSelected && <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                          {tag.name}
                        </button>
                      );
                    })}
                    {tags.filter(t => t.categoryId === cat.id).length === 0 && (
                      <span className="text-[9px] text-slate-300 italic">Sem tags</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {loading ? <LoadingSpinner /> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {hydratedPhotos.map((photo, idx) => (
              <Card
                key={photo.id}
                className="overflow-hidden group flex flex-col h-full hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer shadow-sm bg-white"
                onClick={() => handleOpenPreview(photo)}
                ref={idx === hydratedPhotos.length - 1 ? (el) => {
                  if (el) {
                    const observer = new IntersectionObserver((entries) => {
                      if (entries[0].isIntersecting && displayCount < filteredResult.ids.length && !loadingMore) {
                        loadMore();
                        observer.disconnect();
                      }
                    }, { threshold: 0.1 });
                    observer.observe(el);
                  }
                } : undefined}
              >
                <div className="relative aspect-[4/3] bg-slate-50 overflow-hidden">
                  <img src={photo.thumbnailUrl || photo.url} alt={photo.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenModal(photo);
                      }}
                      className="p-1.5 bg-blue-600/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-blue-700"
                      title="Editar registro"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    {photo.localPath && (
                      <button onClick={(e) => copyToClipboard(e, photo.localPath!)} className="p-1.5 bg-slate-800/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-slate-900" title="Copiar caminho local"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg></button>
                    )}
                    <button onClick={(e) => handleDelete(e, photo.id)} className="p-1.5 bg-red-600/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-700" title="Excluir"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <h4 className="text-[10px] font-black text-slate-800 truncate mb-2">{photo.name}</h4>
                  <div className="flex flex-wrap gap-1 mt-auto">
                    {photo.tagIds.slice(0, 3).map(tagId => {
                      const tag = tags.find(t => t.id === tagId);
                      const cat = categories.find(c => c.id === tag?.categoryId);
                      return (
                        <span key={tagId} className="px-1 py-0.5 bg-slate-50 text-slate-400 border border-slate-100 rounded text-[7px] font-black uppercase">
                          {cat?.order}.{tag?.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        {loadingMore && <div className="py-8 text-center"><LoadingSpinner /></div>}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPhoto ? 'Editar Arquivo' : 'Novo Registro'} maxWidth="max-w-[95vw]">
        <form onSubmit={handleSave} className="flex flex-col gap-6 max-h-[85vh]">
          <div className="flex flex-col lg:flex-row gap-10 overflow-y-auto pr-4 pb-4 scrollbar-thin">
            <div className="w-full lg:w-96 flex-shrink-0 space-y-6">
              <div className="space-y-3">
                <div className={`aspect-video lg:aspect-square bg-slate-50 border-2 border-dashed rounded-3xl overflow-hidden flex items-center justify-center relative transition-all duration-300 ${formData.url ? 'border-blue-200' : 'border-slate-200 hover:border-blue-400'}`}>
                  {formData.url ? (
                    <div className="w-full h-full relative group/preview">
                      <img src={formData.url} className="w-full h-full object-cover" alt="Preview" />
                      {!editingPhoto && !processingImage && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                          <button type="button" onClick={() => setFormData(p => ({ ...p, url: '', name: '' }))} className="bg-white px-6 py-2 rounded-xl font-black text-[10px] uppercase shadow-2xl">Trocar</button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="cursor-pointer p-10 text-center w-full h-full flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 transition-all hover:scale-110 shadow-sm"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg></div>
                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Upload Imagem</span>
                      <input type="file" className="sr-only" accept="image/*" onChange={handleFileUpload} disabled={processingImage} />
                    </label>
                  )}
                </div>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-5 shadow-sm">
                <Input label="Título do Registro" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">Caminho do Arquivo (Disco)</label>
                  <textarea className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-mono min-h-[100px] resize-none focus:ring-2 focus:ring-blue-500" placeholder="H:\PROJETOS\..." value={formData.localPath} onChange={e => setFormData({ ...formData, localPath: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center tracking-tighter"><div className="w-2 h-6 bg-blue-600 rounded-full mr-3"></div>Atribuição Hierárquica</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {categories.map(cat => (
                  <div key={cat.id} className="flex flex-col bg-white border border-slate-200 rounded-3xl overflow-hidden group/cat hover:border-blue-200 transition-all">
                    <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-800 text-white text-[9px] font-black px-1.5 py-0.5 rounded">NÍVEL {cat.order}</span>
                        <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{cat.name}</h4>
                      </div>
                    </div>
                    <div className="p-4 flex flex-wrap gap-x-2 gap-y-1 min-h-[80px]">
                      {tags.filter(t => t.categoryId === cat.id).map(tag => {
                        const isSelected = formData.tagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleModalTag(tag.id)}
                            className={`px-4 py-2 rounded-2xl text-[10px] font-black border transition-all flex items-center gap-2 ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-400 hover:text-blue-600'
                              }`}
                          >
                            {isSelected && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-8 border-t border-slate-100 bg-white mt-auto">
            <div className="bg-blue-50 px-5 py-3 rounded-2xl border border-blue-100"><p className="text-[10px] font-bold text-blue-700 leading-tight uppercase">Salvamento com compactação inteligente ativa</p></div>
            <div className="flex gap-4 w-full sm:w-auto">
              <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)} className="flex-1 sm:flex-none py-4 px-10">Cancelar</Button>
              <Button type="submit" disabled={saving || !formData.url || processingImage} className="flex-1 sm:flex-none px-20 py-4 shadow-2xl shadow-blue-500/30 text-base font-black uppercase tracking-widest">
                {saving ? 'Gravando...' : 'Finalizar Registro'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
      <Modal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title={previewPhoto?.name || 'Vistas'} maxWidth="max-w-7xl">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-full max-h-[80vh] bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center">
            <img
              src={previewPhoto?.url}
              alt={previewPhoto?.name}
              className="max-w-full max-h-[80vh] object-contain cursor-zoom-out"
              onClick={() => setIsPreviewOpen(false)}
            />
            <button
              onClick={() => setIsPreviewOpen(false)}
              className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-all shadow-xl backdrop-blur-md"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {previewPhoto?.tagIds.map(tagId => {
              const tag = tags.find(t => t.id === tagId);
              const cat = categories.find(c => c.id === tag?.categoryId);
              return (
                <Badge key={tagId} color="blue">
                  {cat?.name}: {tag?.name}
                </Badge>
              );
            })}
          </div>
          <div className="flex gap-4 mt-2">
            <Button variant="outline" onClick={() => window.open(previewPhoto?.url, '_blank')} className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Abrir Original
            </Button>
            <Button onClick={() => { setIsPreviewOpen(false); handleOpenModal(previewPhoto); }}>
              Editar Registro
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default Photos;
