
import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { Photo, Tag, TagCategory } from '../types';
import { Badge, Button, Card, Input, LoadingSpinner, Modal } from '../components/UI';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { jsPDF } from 'jspdf';

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


const seededShuffle = <T,>(array: T[], seed: number): T[] => {
  const newArray = [...array];
  let m = newArray.length, t, i;

  // Linear Congruential Generator (LCG) for simple, fast, seeded randomness
  // Microsoft Visual C++ constants
  let state = seed;
  const rand = () => {
    state = (state * 214013 + 2531011) & 0x7FFFFFFF;
    return state / 0x7FFFFFFF;
  };

  while (m) {
    i = Math.floor(rand() * m--);
    t = newArray[m];
    newArray[m] = newArray[i];
    newArray[i] = t;
  }

  return newArray;
};

const PHOTOS_PER_PAGE = 24;

const Photos: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [photoIndex, setPhotoIndex] = useState<Array<{ id: string; name: string; tagIds: string[]; userId: string; createdAt: string }>>([]);
  const [hydratedPhotos, setHydratedPhotos] = useState<Photo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [sortByDate, setSortByDate] = useState(false);
  const [usersWithPhotos, setUsersWithPhotos] = useState<Array<{ id: string; name: string }>>([]);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string }>>([]); // For the author dropdown
  const [selectedExportIds, setSelectedExportIds] = useState<Set<string>>(new Set());

  // Pagination state based on filtered results
  const [displayCount, setDisplayCount] = useState(PHOTOS_PER_PAGE);

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    thumbnailUrl: '',
    tagIds: [] as string[],
    localPath: '',
    userId: '', // Author
    selectedFile: null as File | null
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [index, t, c, u, allU] = await Promise.all([
        api.getPhotoIndex(onlyMine),
        api.getTags(),
        api.getTagCategories(),
        api.getUsersWithPhotos(),
        api.getUsers()
      ]);
      setPhotoIndex(index);
      setTags(t);
      setCategories(c.sort((a, b) => a.order - b.order));
      setUsersWithPhotos(u);
      setAllUsers(allU);
    } finally {
      setLoading(false);
    }
  };

  // Seed for deterministic shuffling (generated once per session/mount)
  const shuffleSeed = React.useRef(Math.floor(Math.random() * 2147483647));


  useEffect(() => {
    fetchData();
  }, [onlyMine]);

  // --- Memoized Shuffled Index to Prevent Re-Shuffling on Every Render ---
  const shuffledPhotoIndex = useMemo(() => {
    return seededShuffle(photoIndex, shuffleSeed.current);
  }, [photoIndex]);

  // --- LÓGICA DE FILTRAGEM USANDO O INDEX ---

  const filteredResult = useMemo(() => {
    let currentIds = [...shuffledPhotoIndex];

    // 1. Filtro por texto
    if (searchTerm) {
      currentIds = currentIds.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // 1.2 Filtro por usuário selecionado
    if (selectedUserId !== 'all') {
      currentIds = currentIds.filter(p => p.userId === selectedUserId);
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

    // 3. Sorting
    if (sortByDate) {
      // Sort by created_at DESC (newest first)
      currentIds = [...currentIds].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
    } else {
      // If not sorting by date, maintain the shuffled order from shuffledPhotoIndex
      // To do this, we need to re-apply the original shuffled order to the filtered set.
      // A simpler approach is to just use shuffledPhotoIndex as the base if not sorting by date.
      // However, if filters are applied, the shuffled order is already broken.
      // The current implementation implicitly keeps the order of `currentIds` as it's filtered.
      // If `sortByDate` is false, the order is determined by the filtering process on `shuffledPhotoIndex`.
      // No explicit action needed here for "random" if `sortByDate` is false, as `shuffledPhotoIndex` is the base.
    }

    // Calcular tags disponíveis (Cascata)
    const availableTagsByLevel: { [order: number]: Set<string> } = {};
    let tempIds = [...shuffledPhotoIndex]; // Use a copy for calculating available tags
    if (searchTerm) tempIds = tempIds.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (selectedUserId !== 'all') tempIds = tempIds.filter(p => p.userId === selectedUserId);

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
  }, [shuffledPhotoIndex, categories, tags, selectedTagIds, searchTerm, selectedUserId, sortByDate]);

  // Reset pagination count when filter changes
  useEffect(() => {
    setDisplayCount(PHOTOS_PER_PAGE);
  }, [filteredResult.ids]);

  // --- HYDRATION LOGIC (Fetch full photo details for visible IDs) ---

  const visibleIds = useMemo(() => {
    return filteredResult.ids.slice(0, displayCount);
  }, [filteredResult.ids, displayCount]);

  useEffect(() => {
    let isMounted = true;

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

        // Only update if mounted and the list is actually different
        if (isMounted) {
          if (ordered.length !== hydratedPhotos.length ||
            ordered.some((p, i) => p.id !== hydratedPhotos[i].id)) {
            setHydratedPhotos(ordered);
          }
        }
        return;
      }

      setLoadingMore(true);
      try {
        const newPhotos = await api.getPhotosByIds(newIds);

        if (!isMounted) return;

        const updatedMap = new Map(existingMap);
        newPhotos.forEach(p => updatedMap.set(p.id, p));

        const finalOrdered = visibleIds.map(id => updatedMap.get(id)).filter((p): p is Photo => !!p);
        setHydratedPhotos(finalOrdered);
      } catch (err) {
        console.error("Hydration error:", err);
      } finally {
        if (isMounted) setLoadingMore(false);
      }
    };

    loadVisiblePhotos();

    return () => {
      isMounted = false;
    };
  }, [visibleIds]); // visibleIds captures changes in filteredResult.ids and displayCount

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
      setFormData({
        name: photo.name,
        url: photo.url,
        thumbnailUrl: photo.thumbnailUrl || '',
        tagIds: photo.tagIds || [],
        localPath: photo.localPath || '',
        userId: photo.userId, // Pass the selected author
        selectedFile: null
      });
    } else {
      setEditingPhoto(null);
      setFormData({
        name: '',
        url: '',
        thumbnailUrl: '',
        tagIds: [],
        localPath: '',
        userId: user?.id || '', // Default to current user
        selectedFile: null
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenPreview = (photo: Photo) => {
    setPreviewPhoto(photo);
    setIsPreviewOpen(true);
  };

  const handleExportPDF = async () => {
    // Determine which IDs to export:
    // 1. If selection exists: INTERSECTION of Selection AND Current Filter
    // 2. If no selection: ALL Current Filter results
    let idsToExport: string[] = [];

    if (selectedExportIds.size > 0) {
      // Only export selected items that are currently visible/filtered
      idsToExport = filteredResult.ids.filter(id => selectedExportIds.has(id));
    } else {
      // Export all filtered results
      idsToExport = filteredResult.ids;
    }

    const photosToExportCount = idsToExport.length;

    if (photosToExportCount === 0) {
      alert('Nenhuma foto selecionada ou visível para exportação.');
      return;
    }

    if (photosToExportCount > 30) {
      alert(`Limite de exportação excedido. Selecione no máximo 30 fotos para gerar o PDF. (Atual: ${photosToExportCount})`);
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    setProcessingImage(true);

    try {
      // Helper to load images
      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = src;
          img.onload = () => resolve(img);
          img.onerror = reject;
        });
      };

      // 1. Pre-load Masks and Photo Data in parallel
      const [maskTopo, maskBase, allPhotosToExport] = await Promise.all([
        loadImage('/assets/mascara_topo.jpg'),
        loadImage('/assets/mascara_base.jpg'),
        api.getPhotosByIds(idsToExport)
      ]);

      const totalPhotos = allPhotosToExport.length;
      const loadedImages: Record<string, HTMLImageElement> = {};

      // 2. Parallel Image Loading with Concurrency Limit (e.g., 5)
      const concurrencyLimit = 5;
      for (let i = 0; i < allPhotosToExport.length; i += concurrencyLimit) {
        const batch = allPhotosToExport.slice(i, i + concurrencyLimit);
        await Promise.all(batch.map(async (photo) => {
          try {
            loadedImages[photo.id] = await loadImage(photo.url);
          } catch (e) {
            console.error(`Error pre-loading ${photo.id}`, e);
          }
          // Update progress (5% to 85%)
          setExportProgress(5 + Math.round(((i + batch.length) / totalPhotos) * 80));
        }));
      }

      const addMasks = () => {
        try {
          const topoHeight = (maskTopo.height * pageWidth) / maskTopo.width;
          doc.addImage(maskTopo, 'JPEG', 0, 0, pageWidth, topoHeight);
          const baseHeight = (maskBase.height * pageWidth) / maskBase.width;
          doc.addImage(maskBase, 'JPEG', 0, pageHeight - baseHeight, pageWidth, baseHeight);
          return { topoHeight, baseHeight };
        } catch (e) {
          return { topoHeight: 0, baseHeight: 0 };
        }
      };

      let masks = addMasks();
      const photosPerPage = 2;
      const marginY = 10;

      // 3. Instant PDF Compilation (Images are already in memory)
      for (let i = 0; i < allPhotosToExport.length; i++) {
        const photo = allPhotosToExport[i];
        const img = loadedImages[photo.id];

        if (i > 0 && i % photosPerPage === 0) {
          doc.addPage();
          masks = addMasks();
        }

        const relativeIdx = i % photosPerPage;
        const availableHeight = pageHeight - masks.topoHeight - masks.baseHeight - (marginY * 3);
        const slotHeight = availableHeight / photosPerPage;
        const slotY = masks.topoHeight + marginY + (relativeIdx * (slotHeight + marginY));

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        doc.text(photo.name.toUpperCase(), margin, slotY + 5);

        if (img) {
          const imageAreaY = slotY + 8;
          const imageAreaHeight = slotHeight - 12;
          const imageAreaWidth = pageWidth - (margin * 2);

          let drawWidth = imageAreaWidth;
          let drawHeight = (img.height * imageAreaWidth) / img.width;

          if (drawHeight > imageAreaHeight) {
            drawHeight = imageAreaHeight;
            drawWidth = (img.width * imageAreaHeight) / img.height;
          }

          const xOffset = margin + (imageAreaWidth - drawWidth) / 2;
          const yOffset = imageAreaY + (imageAreaHeight - drawHeight) / 2;
          doc.addImage(img, 'JPEG', xOffset, yOffset, drawWidth, drawHeight);
        } else {
          doc.setTextColor(200, 0, 0);
          doc.text("[Erro ao carregar imagem]", margin, slotY + 15);
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(150);
        const pageNum = doc.internal.pages.length - 1;
        doc.text(`Página ${pageNum}`, pageWidth / 2, pageHeight - (masks.baseHeight / 2), { align: 'center' });

        // Final rapid progress update
        setExportProgress(85 + Math.round(((i + 1) / totalPhotos) * 15));
      }

      doc.save(`galeria_exportada_${new Date().getTime()}.pdf`);
      setExportProgress(100);
      setTimeout(() => {
        setSelectedExportIds(new Set());
        setExportProgress(0);
      }, 500);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar PDF. Verifique se as imagens das máscaras e das fotos estão acessíveis.');
    } finally {
      setProcessingImage(false);
    }
  };

  const selectAllFiltered = () => {
    setSelectedExportIds(new Set(filteredResult.ids));
  };

  const handleClearSelection = () => {
    setSelectedExportIds(new Set());
  };

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedExportIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  const effectiveSelectionCount = useMemo(() => {
    if (selectedExportIds.size === 0) return 0;
    return filteredResult.ids.filter(id => selectedExportIds.has(id)).length;
  }, [selectedExportIds, filteredResult.ids]);



  const headerActions = (
    <div className="flex gap-2">
      {/* Select All Button - Always visible, disabled if no results */}
      <Button
        variant={filteredResult.ids.length > 0 ? 'default' : 'outline'}
        onClick={selectAllFiltered}
        disabled={filteredResult.ids.length === 0}
        className={`py-2 px-4 text-xs font-bold transition-all ${filteredResult.ids.length === 0
          ? 'opacity-50 cursor-not-allowed border-slate-200 text-slate-400 bg-slate-50'
          : 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 border-blue-600 hover:bg-blue-700 hover:border-blue-700'
          }`}
      >
        {selectedExportIds.size > 0 && selectedExportIds.size === filteredResult.ids.length ? 'Todos Selecionados' : `Selecionar Tudo (${filteredResult.ids.length})`}
      </Button>

      {/* Clear All Button - Always visible, disabled if no filters/selections active */}
      <Button
        variant="outline"
        onClick={() => {
          setSelectedTagIds([]);
          setSelectedExportIds(new Set());
          setSearchTerm('');
          if (user?.isAdmin) {
            setOnlyMine(false);
            setSelectedUserId('all');
          }
          // Note: We DO NOT reset sortByDate here, as requested by user.
        }}
        disabled={selectedTagIds.length === 0 && selectedExportIds.size === 0 && searchTerm === '' && selectedUserId === 'all' && !onlyMine}
        className={`py-2 px-4 text-xs font-bold transition-all ${selectedTagIds.length > 0 || selectedExportIds.size > 0 || searchTerm !== '' || (user?.isAdmin && (selectedUserId !== 'all' || onlyMine))
          ? 'text-white bg-red-500 border-red-500 hover:bg-red-600 hover:border-red-600 shadow-lg shadow-red-500/30'
          : 'text-slate-400 border-slate-200 bg-white opacity-50 cursor-not-allowed'
          }`}
      >
        Limpar Tudo
      </Button>


    </div>
  );

  return (
    <Layout title="Galeria Estruturada" headerActions={headerActions}>
      <div className="flex flex-col gap-2">
        <Card className="p-3">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-2 border-b border-slate-100 pb-2">
            <div className="flex-1 w-full max-w-md">
              <Input
                placeholder="Pesquisar por nome do projeto..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="py-1.5"
              />
            </div>
            {user?.isAdmin && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    id="onlyMine"
                    checked={onlyMine}
                    onChange={e => {
                      setOnlyMine(e.target.checked);
                      if (e.target.checked) setSelectedUserId('all');
                    }}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <label htmlFor="onlyMine" className="text-xs font-medium text-slate-600 cursor-pointer select-none">
                    Apenas meus registros
                  </label>
                </div>

                <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-lg border border-slate-200">
                  <label htmlFor="userFilter" className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Autor:</label>
                  <select
                    id="userFilter"
                    value={selectedUserId}
                    onChange={(e) => {
                      setSelectedUserId(e.target.value);
                      if (e.target.value !== 'all') setOnlyMine(false);
                    }}
                    className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Todos os Autores</option>
                    {usersWithPhotos.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200" title="Ordena do mais recente para o mais antigo">
                  <input
                    type="checkbox"
                    id="sortByDate"
                    checked={sortByDate}
                    onChange={e => setSortByDate(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <label htmlFor="sortByDate" className="text-xs font-medium text-slate-600 cursor-pointer select-none">
                    Ordem de Cadastro
                  </label>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              {!user?.isVisitor && (
                <Button onClick={() => handleOpenModal()} className="py-1.5 text-xs">+ Novo Registro</Button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 4h18M3 12h18m-7 8h7" /></svg>
              Matriz de Filtragem Hierárquica
            </h3>

            <div className="flex flex-col gap-0.5">
              {categories.map((cat) => (
                <div key={cat.id} className="group relative flex flex-col md:flex-row md:items-center bg-white border border-slate-200 rounded-xl px-3 py-0.5 transition-all hover:border-blue-400 hover:shadow-md">
                  <div className="md:w-36 flex-shrink-0 flex items-center gap-2 mb-1 md:mb-0 border-b md:border-b-0 md:border-r border-slate-100 pb-1 md:pb-0 md:pr-3">
                    <span className="w-5 h-5 bg-blue-600 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-sm">
                      {cat.order}
                    </span>
                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">{cat.name}</h4>
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
                          className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1.5 ${isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-blue-400 hover:text-blue-600'
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
                className={`overflow-hidden group flex flex-col h-full hover:ring-2 transition-all cursor-pointer shadow-sm bg-white ${selectedExportIds.has(photo.id) ? 'ring-2 ring-blue-500 bg-blue-50/30' : 'hover:ring-blue-500'}`}
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

                  {/* Selection Checkbox */}
                  <div
                    className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${selectedExportIds.has(photo.id) ? 'bg-blue-600 border-blue-600' : 'bg-white/20 border-white/50 backdrop-blur-sm group-hover:bg-white/40'}`}
                    onClick={(e) => toggleSelection(e, photo.id)}
                  >
                    {selectedExportIds.has(photo.id) && (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  <div className="absolute top-2 right-2 flex gap-1">
                    {!user?.isVisitor && (
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
                    )}
                    {photo.localPath && (
                      <button onClick={(e) => copyToClipboard(e, photo.localPath!)} className="p-1.5 bg-slate-800/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-slate-900" title="Caminho local"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg></button>
                    )}
                    {!user?.isVisitor && (
                      <button onClick={(e) => handleDelete(e, photo.id)} className="p-1.5 bg-red-600/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-700" title="Excluir"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
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
        {loadingMore && <div className="py-8 text-center"><LoadingSpinner /></div>}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPhoto ? 'Editar Arquivo' : 'Novo Registro'} maxWidth="max-w-[95vw]">
        <form onSubmit={handleSave} className="flex flex-col gap-6 max-h-[85vh]">
          <div className="flex flex-col lg:flex-row gap-10 overflow-y-auto pr-4 pb-4 scrollbar-thin">
            <div className="w-full lg:w-96 flex-shrink-0 space-y-6">
              {/* Author Selection */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">Autoria do Registro</label>
                <select
                  className="w-full rounded-xl border-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-2 px-3 font-bold text-slate-700 bg-white"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                >
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.id === user?.id ? '(Você)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Image Upload/Preview */}
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
      </div >

      <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-8 border-t border-slate-100 bg-white mt-auto">
        <div className="bg-blue-50 px-5 py-3 rounded-2xl border border-blue-100"><p className="text-[10px] font-bold text-blue-700 leading-tight uppercase">Salvamento com compactação inteligente ativa</p></div>
        <div className="flex gap-4 w-full sm:w-auto">
          <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)} className="flex-1 sm:flex-none py-4 px-10">Cancelar</Button>
          <Button type="submit" disabled={saving || !formData.url || processingImage} className="flex-1 sm:flex-none px-20 py-4 shadow-2xl shadow-blue-500/30 text-base font-black uppercase tracking-widest">
            {saving ? 'Gravando...' : 'Finalizar Registro'}
          </Button>
        </div>
      </div>
    </form >
      </Modal >
  <Modal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title={previewPhoto?.name || 'Vistas'} maxWidth="max-w-4xl">
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-full max-h-[60vh] bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-2xl">
        <img
          src={previewPhoto?.url}
          alt={previewPhoto?.name}
          className="max-w-full max-h-[60vh] object-contain cursor-zoom-out"
          onClick={() => setIsPreviewOpen(false)}
        />
        <button
          onClick={() => setIsPreviewOpen(false)}
          className="absolute top-4 right-4 p-1.5 bg-black/40 text-white rounded-full hover:bg-black/60 transition-all shadow-xl backdrop-blur-md border border-white/10"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5 mt-1 max-w-full overflow-hidden">
        {previewPhoto?.tagIds.map(tagId => {
          const tag = tags.find(t => t.id === tagId);
          const cat = categories.find(c => c.id === tag?.categoryId);
          return (
            <span key={tagId} className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[9px] font-black uppercase whitespace-nowrap">
              {cat?.name}: {tag?.name}
            </span>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-1">
        {previewPhoto?.userName && (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 mr-2">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Cadastrado por:</span>
            <span className="text-[9px] font-bold text-slate-600">{previewPhoto.userName}</span>
          </div>
        )}
        <Button variant="outline" onClick={() => window.open(previewPhoto?.url, '_blank')} className="flex items-center gap-2 py-2 px-6 text-[10px] font-black uppercase tracking-widest">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Original
        </Button>
        {!user?.isVisitor && (
          <Button onClick={() => { setIsPreviewOpen(false); handleOpenModal(previewPhoto); }} className="py-2 px-8 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20">
            Editar
          </Button>
        )}
      </div>
    </div>
  </Modal>

{/* Export Action Bar */ }
{
  selectedExportIds.size > 0 && (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
      <div className="bg-slate-900 border border-slate-700 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 backdrop-blur-xl">
        <div className="flex flex-col">
          <span className="text-sm font-bold">{effectiveSelectionCount} {effectiveSelectionCount === 1 ? 'Foto para PDF' : 'Fotos para PDF'}</span>
          <span className="text-[10px] text-slate-400">
            {selectedExportIds.size !== effectiveSelectionCount
              ? `(Filtrado de ${selectedExportIds.size} selecionadas)`
              : 'Pronto para gerar PDF'}
          </span>
        </div>
        <div className="h-8 w-px bg-slate-700"></div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setSelectedExportIds(new Set())} className="text-white border-slate-600 hover:bg-slate-800 py-1.5 px-4 text-xs h-9">
            Cancelar
          </Button>
          <Button onClick={handleExportPDF} className="bg-blue-600 hover:bg-blue-700 py-1.5 px-6 text-xs h-9 shadow-lg shadow-blue-500/20 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Gerar PDF
          </Button>
        </div>
      </div>
    </div >
  )
}
{/* Progress UI Overlay */ }
{
  exportProgress > 0 && (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <Card className="max-w-md w-full p-8 space-y-6 text-center shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="space-y-2">
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Gerando PDF Profissional</h3>
          <p className="text-sm text-slate-500 font-medium">Isso pode levar alguns segundos dependendo da quantidade de fotos.</p>
        </div>

        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-black inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-50">
                Processando
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-black inline-block text-blue-600">
                {exportProgress}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-slate-100 border border-slate-200">
            <div
              style={{ width: `${exportProgress}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-300 ease-out"
            ></div>
          </div>
        </div>

        <div className="flex justify-center items-center gap-3 text-slate-400">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Otimizando Imagens...</span>
        </div>
      </Card>
    </div>
  )
}
    </Layout >
  );
};

export default Photos;
