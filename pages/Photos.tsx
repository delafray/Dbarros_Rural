
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


// Extract shortcode from any Instagram URL format
const extractInstagramShortcode = (url: string): string | null => {
  const match = url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
};

// Extract video ID from any YouTube URL format (watch, shorts, embed, etc)
const extractYouTubeId = (url: string): string | null => {
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|shorts\/|watch\?v=)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
};

// Fetch thumbnail from Instagram via Supabase Edge Function (server-side, bypasses CORS)
const fetchInstagramThumbnail = async (instagramUrl: string): Promise<string | null> => {
  const shortcode = extractInstagramShortcode(instagramUrl);
  if (!shortcode) return null;

  try {
    const resp = await fetch(
      'https://zamknopwowugrjapoman.supabase.co/functions/v1/instagram-thumbnail',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: instagramUrl }),
      }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.thumbnailUrl || null;
  } catch {
    return null;
  }
};

// Helper to check if a YouTube thumbnail is valid (not the 120x90 placeholder)
const isValidYouTubeThumb = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // YouTube returns a 120x90 placeholder if the requested resolution doesn't exist
      resolve(img.width > 120);
    };
    img.onerror = () => resolve(false);
    img.src = url;
  });
};

// Fetch thumbnail from YouTube with fallback logic
const fetchYouTubeThumbnail = async (youtubeUrl: string): Promise<string | null> => {
  const videoId = extractYouTubeId(youtubeUrl);
  if (!videoId) return null;

  const maxResUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  const hqResUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  // Try maxres first, then fallback to hq
  const isMaxResValid = await isValidYouTubeThumb(maxResUrl);
  if (isMaxResValid) return maxResUrl;

  return hqResUrl; // hqdefault is almost always available
};

// Compress an image URL (fetched externally) into a data URL for upload
const compressExternalImage = (imageUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      // Resize to max MAX_DIMENSION
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) { height = Math.round(height * MAX_DIMENSION / width); width = MAX_DIMENSION; }
        else { width = Math.round(width * MAX_DIMENSION / height); height = MAX_DIMENSION; }
      }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Canvas error');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', QUALITY));
    };
    img.onerror = reject;
    img.src = imageUrl;
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
  const [photoIndex, setPhotoIndex] = useState<Array<{ id: string; name: string; tagIds: string[]; userId: string; videoUrl?: string; createdAt: string }>>([]);
  const [hydratedPhotos, setHydratedPhotos] = useState<Photo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [pdfLimit, setPdfLimit] = useState<number>(30);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [sortByDate, setSortByDate] = useState(false);
  const [usersWithPhotos, setUsersWithPhotos] = useState<Array<{ id: string; name: string }>>([]);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string }>>([]); // For the author dropdown
  const [selectedExportIds, setSelectedExportIds] = useState<Set<string>>(new Set());
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: '',
    message: ''
  });
  const [videoPreviewDataUrl, setVideoPreviewDataUrl] = useState<string>(''); // Compressed thumbnail preview for video mode
  const [fetchingThumbnail, setFetchingThumbnail] = useState(false);

  // Pagination state based on filtered results
  const [displayCount, setDisplayCount] = useState(PHOTOS_PER_PAGE);
  const [gridCols, setGridCols] = useState(window.innerWidth < 640 ? 2 : 5); // Responsive default

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    thumbnailUrl: '',
    tagIds: [] as string[],
    localPath: '',
    videoUrl: '', // Link original do Instagram
    userId: '', // Author
    selectedFile: null as File | null
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [index, t, c, u, allU, configLimit] = await Promise.all([
        api.getPhotoIndex(onlyMine),
        api.getTags(),
        api.getTagCategories(),
        api.getUsersWithPhotos(),
        api.getUsers(),
        api.getSystemConfig('pdf_limit') // Fetch system config for pdf_limit
      ]);

      if (configLimit) setPdfLimit(parseInt(configLimit));

      setPhotoIndex(index);
      setTags(t.sort((a, b) => (a.order - b.order) || a.createdAt.localeCompare(b.createdAt)));
      setCategories(c.filter(cat => cat.name !== '__SYSCONFIG__').sort((a, b) => (a.order - b.order) || (a.createdAt || '').localeCompare(b.createdAt || '')));
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
    return seededShuffle(photoIndex, shuffleSeed.current).filter(p => p && typeof p === 'object' && 'id' in p);
  }, [photoIndex]);

  // --- LÓGICA DE FILTRAGEM USANDO O INDEX ---

  const filteredResult = useMemo(() => {
    let currentIds = [...shuffledPhotoIndex];

    // 1. Filtro por texto
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      currentIds = currentIds.filter(p => p.name?.toLowerCase().includes(lowerSearch));
    }

    // 1.2 Filtro por usuário selecionado
    if (selectedUserId !== 'all') {
      currentIds = currentIds.filter(p => p.userId === selectedUserId);
    }

    // 2. Filtro Hierárquico
    categories.forEach((cat) => {
      if (!cat || !cat.id) return;
      const catTags = tags.filter(t => t && t.categoryId === cat.id);
      const selectedInCat = selectedTagIds.filter(id => catTags.some(t => t.id === id));
      if (selectedInCat.length > 0) {
        currentIds = currentIds.filter(p =>
          Array.isArray(p.tagIds) && selectedInCat.some(tagId => p.tagIds.includes(tagId))
        );
      }
    });

    // 3. Sorting
    if (sortByDate) {
      currentIds = [...currentIds].sort((a, b) => {
        const dateA = new Date(a?.createdAt || 0).getTime();
        const dateB = new Date(b?.createdAt || 0).getTime();
        return dateB - dateA;
      });
    }

    // Calcular tags disponíveis (Cascata)
    const availableTagsByLevel: { [order: number]: Set<string> } = {};
    let tempIds = [...shuffledPhotoIndex];
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      tempIds = tempIds.filter(p => p.name?.toLowerCase().includes(lowerSearch));
    }
    if (selectedUserId !== 'all') tempIds = tempIds.filter(p => p.userId === selectedUserId);

    categories.forEach((cat) => {
      if (!cat) return;
      const currentAvailableTags = new Set<string>();
      tempIds.forEach(p => {
        if (Array.isArray(p.tagIds)) {
          p.tagIds.forEach(tid => currentAvailableTags.add(tid));
        }
      });
      availableTagsByLevel[cat.order] = currentAvailableTags;

      const catTags = tags.filter(t => t && t.categoryId === cat.id);
      const selectedInCat = selectedTagIds.filter(id => catTags.some(t => t.id === id));
      if (selectedInCat.length > 0) {
        tempIds = tempIds.filter(p => Array.isArray(p.tagIds) && selectedInCat.some(tagId => p.tagIds.includes(tagId)));
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
        videoUrl: photo.videoUrl || '',
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
        videoUrl: '',
        userId: user?.id || '', // Default to current user
        selectedFile: null
      });
    }
    setVideoPreviewDataUrl(photo && photo.videoUrl ? photo.url : '');
    setIsModalOpen(true);
  };

  const handleOpenPreview = (photo: Photo) => {
    setPreviewPhoto(photo);
    setIsPreviewOpen(true);
  };

  const handleFetchThumbnail = async () => {
    const url = formData.videoUrl.trim();
    if (!url) return;

    const instagramShortcode = extractInstagramShortcode(url);
    const youtubeId = extractYouTubeId(url);

    if (!instagramShortcode && !youtubeId) {
      setErrorModal({
        isOpen: true,
        title: 'Link inválido',
        message: 'O link não parece ser um Reel do Instagram ou um vídeo do YouTube. Verifique o URL e tente novamente.'
      });
      return;
    }

    setFetchingThumbnail(true);
    setVideoPreviewDataUrl('');

    try {
      let ogImageUrl: string | null = null;

      if (instagramShortcode) {
        ogImageUrl = await fetchInstagramThumbnail(url);
      } else if (youtubeId) {
        ogImageUrl = await fetchYouTubeThumbnail(url);
      }

      if (!ogImageUrl) {
        setErrorModal({
          isOpen: true,
          title: 'Capa não encontrada',
          message: 'Não foi possível buscar a capa. Certifique-se que o vídeo é público e o link está correto.'
        });
        return;
      }

      // Compress the image via canvas (always attempt for YouTube too to ensure local storage version)
      try {
        const compressed = await compressExternalImage(`https://api.allorigins.win/raw?url=${encodeURIComponent(ogImageUrl)}`);
        setVideoPreviewDataUrl(compressed);
      } catch {
        // If allorigins fails, try YouTube directly (YouTube usually allows direct img crossOrigin)
        if (youtubeId) {
          try {
            const compressed = await compressExternalImage(ogImageUrl);
            setVideoPreviewDataUrl(compressed);
          } catch {
            setVideoPreviewDataUrl(ogImageUrl);
          }
        } else {
          setVideoPreviewDataUrl(ogImageUrl);
        }
      }
    } finally {
      setFetchingThumbnail(false);
    }
  };

  const handleExportPDF = async () => {
    // Determine which IDs to export:
    // Strictly INTERSECTION of Selection AND Current Filter (Redundancy of bottom popup)
    const idsToExport = filteredResult.ids.filter(id => selectedExportIds.has(id));

    const photosToExportCount = idsToExport.length;

    if (photosToExportCount === 0) {
      setErrorModal({
        isOpen: true,
        title: 'Atenção',
        message: 'Nenhuma foto selecionada ou visível para exportação.'
      });
      return;
    }

    if (photosToExportCount > pdfLimit) {
      setErrorModal({
        isOpen: true,
        title: 'Limite de Exportação',
        message: `Limite de exportação excedido. Selecione no máximo ${pdfLimit} fotos para gerar o PDF. (Atual: ${photosToExportCount})`
      });
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 6; // Further reduced to maximize width as requested

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
      const marginY = 4;

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
        doc.setTextColor(30, 41, 59); // Slate-800
        doc.text(photo.name, margin, slotY + 2); // Title at top of slot

        // Meta Info (Tags and Author) for PDF
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139); // Slate-500
        const tagNames = photo.tagIds.map(id => tags.find(t => t.id === id)?.name).filter(Boolean).join(' • ');
        const authorText = photo.userName ? ` | Cadastrado por: ${photo.userName}` : '';
        doc.text(`${tagNames}${authorText}`, margin, slotY + 6);

        if (img) {
          const imageAreaY = slotY + 9; // Shifted from 5 to 9 to give space for meta info
          const imageAreaHeight = slotHeight - 11; // Adjusted from 7 to 11 to fit within slot
          const imageAreaWidth = pageWidth - (margin * 2);

          let drawWidth = imageAreaWidth;
          let drawHeight = (img.height * imageAreaWidth) / img.width;

          if (drawHeight > imageAreaHeight) {
            drawHeight = imageAreaHeight;
            drawWidth = (img.width * imageAreaHeight) / img.height;
          }

          const xOffset = margin + (imageAreaWidth - drawWidth) / 2;
          const yOffset = imageAreaY; // PINNED to top to standardize gap with title
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

    // Detect video mode: category order=1 and tag order=1 selected
    const cat1 = categories.find(c => c.order === 1);
    const videoTag = cat1 ? tags.find(t => t.categoryId === cat1.id && t.order === 1) : null;
    const isVideoMode = !!(videoTag && formData.tagIds.includes(videoTag.id));

    if (isVideoMode) {
      if (!formData.videoUrl.trim()) {
        setErrorModal({ isOpen: true, title: 'Link obrigatório', message: 'Cole o link do Instagram Reel para continuar.' });
        return;
      }
    } else {
      if (!formData.url) {
        setErrorModal({ isOpen: true, title: 'Imagem obrigatória', message: 'Escolha uma foto para continuar.' });
        return;
      }
    }

    // Validation for Mandatory Categories (with Peer support)
    const processedGroups = new Set<string>();
    const missingRequirements: string[] = [];

    categories.filter(cat => cat.isRequired).forEach(cat => {
      const peerGroupIds = [cat.id, ...(cat.peerCategoryIds || [])].sort();
      const groupKey = peerGroupIds.join('|');
      if (processedGroups.has(groupKey)) return;
      processedGroups.add(groupKey);
      const allTagsInGroup = tags.filter(t => peerGroupIds.includes(t.categoryId)).map(t => t.id);
      const isSatisfied = formData.tagIds.some(id => allTagsInGroup.includes(id));
      if (!isSatisfied) {
        const groupNames = categories.filter(c => peerGroupIds.includes(c.id)).map(c => `"${c.name}"`).join(' ou ');
        missingRequirements.push(groupNames);
      }
    });

    if (missingRequirements.length > 0) {
      const list = missingRequirements.join('\n- ');
      setErrorModal({
        isOpen: true,
        title: 'Campos Obrigatórios',
        message: `A seleção nos seguintes grupos/níveis é obrigatória:\n- ${list}`
      });
      return;
    }

    setSaving(true);
    try {
      let finalUrl = formData.url;
      let finalThumbUrl = formData.thumbnailUrl;
      let finalVideoUrl = formData.videoUrl;

      if (isVideoMode && formData.videoUrl.trim()) {
        if (!videoPreviewDataUrl) {
          setErrorModal({ isOpen: true, title: 'Capa obrigatória', message: 'Clique em "Buscar Capa" para validar e carregar a imagem do vídeo antes de salvar.' });
          setSaving(false);
          return;
        }

        const isFreshCapture = videoPreviewDataUrl.startsWith('data:');

        if (isFreshCapture) {
          setProcessingImage(true);
          // Upload the pre-fetched and compressed thumbnail to Supabase Storage
          try {
            const thumbBlob = dataURLtoBlob(videoPreviewDataUrl);
            const thumbFile = new File([thumbBlob], `video_thumb_${Date.now()}.jpg`, { type: 'image/jpeg' });
            finalUrl = await api.uploadPhotoFile(thumbFile);
            finalThumbUrl = finalUrl;
          } catch {
            // Fallback: store the data URL directly (not ideal but functional)
            finalUrl = videoPreviewDataUrl;
            finalThumbUrl = videoPreviewDataUrl;
          }
          setProcessingImage(false);
        } else {
          // If not a fresh capture, we use the existing URL (which was set to videoPreviewDataUrl in handleOpenModal)
          finalUrl = formData.url;
          finalThumbUrl = formData.thumbnailUrl;
        }
      } else if (formData.selectedFile) {
        // Normal photo upload
        const blob = dataURLtoBlob(formData.url);
        const fileToUpload = new File([blob], formData.selectedFile.name, { type: blob.type });
        finalUrl = await api.uploadPhotoFile(fileToUpload);
        const thumbDataUrl = await generateThumbnail(formData.selectedFile);
        const thumbBlob = dataURLtoBlob(thumbDataUrl);
        const thumbToUpload = new File([thumbBlob], `thumb_${formData.selectedFile.name}`, { type: thumbBlob.type });
        finalThumbUrl = await api.uploadPhotoFile(thumbToUpload);
      }

      const saveData = { ...formData, url: finalUrl, thumbnailUrl: finalThumbUrl, videoUrl: finalVideoUrl };
      if (editingPhoto) {
        await api.updatePhoto(editingPhoto.id, saveData);
        // Invalidate hydration cache for this specific photo
        setHydratedPhotos(prev => prev.filter(p => p.id !== editingPhoto.id));
      } else {
        await api.createPhoto(saveData);
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
      setProcessingImage(false);
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
      {/* Grid Zoom Slider */}
      <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-xl shadow-sm">
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
        </svg>
        <input
          type="range"
          min="2"
          max="10"
          value={gridCols}
          onChange={(e) => setGridCols(parseInt(e.target.value))}
          className="w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          title="Zoom da Grade"
        />
        <span className="text-[10px] font-bold text-slate-500 w-4">{gridCols}</span>
      </div>


      {/* Botão de Redundância: Gerar PDF */}
      <Button
        variant="primary"
        onClick={handleExportPDF}
        disabled={effectiveSelectionCount === 0}
        className={`py-2 px-4 text-xs font-bold transition-all whitespace-nowrap shadow-sm ${effectiveSelectionCount === 0
          ? 'opacity-50 cursor-not-allowed shadow-none'
          : effectiveSelectionCount > pdfLimit
            ? 'bg-red-600 text-white border-red-600 shadow-red-500/30 hover:bg-red-700'
            : 'bg-blue-600 text-white border-blue-600 shadow-blue-500/30 hover:bg-blue-700'
          }`}
      >
        Gerar PDF ({effectiveSelectionCount})
      </Button>

      {/* Select All Button - Always visible, disabled if no results */}
      <Button
        variant="primary"
        onClick={selectAllFiltered}
        disabled={filteredResult.ids.length === 0}
        className={`py-2 px-4 text-xs font-bold transition-all whitespace-nowrap shadow-sm ${effectiveSelectionCount === 0
          ? 'opacity-50 shadow-none'
          : effectiveSelectionCount > pdfLimit
            ? 'bg-red-600 text-white border-red-600 shadow-red-500/30 hover:bg-red-700'
            : 'bg-blue-600 text-white border-blue-600 shadow-blue-500/30 hover:bg-blue-700'
          } ${filteredResult.ids.length === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
      >
        {effectiveSelectionCount > 0 && effectiveSelectionCount === filteredResult.ids.length ? 'Todos Selecionados' : `Selecionar Tudo (${filteredResult.ids.length})`}
      </Button>

      {/* Clear All Button - Always visible, disabled if no filters/selections active */}
      {(() => {
        const hasActiveFilters = selectedTagIds.length > 0 || selectedExportIds.size > 0 || searchTerm !== '' || (user?.isAdmin && (selectedUserId !== 'all' || onlyMine));
        return (
          <Button
            variant="primary"
            onClick={() => {
              setSelectedTagIds([]);
              setSelectedExportIds(new Set());
              setSearchTerm('');
              if (user?.isAdmin) {
                setOnlyMine(false);
                setSelectedUserId('all');
              }
            }}
            disabled={!hasActiveFilters}
            className={`py-2 px-4 text-xs font-bold transition-all whitespace-nowrap shadow-sm ${!hasActiveFilters
              ? 'opacity-50 shadow-none cursor-not-allowed'
              : effectiveSelectionCount > pdfLimit
                ? 'bg-red-600 text-white border-red-600 shadow-red-500/30 hover:bg-red-700'
                : 'bg-blue-600 text-white border-blue-600 shadow-blue-500/30 hover:bg-blue-700'
              }`}
          >
            Limpar Tudo
          </Button>
        );
      })()}


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
                <Button
                  onClick={() => handleOpenModal()}
                  variant="danger"
                  className="py-1.5 text-xs font-bold shadow-sm hover:scale-105 transition-transform"
                >
                  + Novo Registro
                </Button>
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
          <div
            className="grid gap-4 transition-all duration-300 ease-in-out"
            style={{
              gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`
            }}
          >
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
                    className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center before:content-[''] before:absolute before:-inset-3 ${selectedExportIds.has(photo.id) ? 'bg-blue-600 border-blue-600' : 'bg-white/20 border-white/50 backdrop-blur-sm group-hover:bg-white/40'}`}
                    onClick={(e) => toggleSelection(e, photo.id)}
                  >
                    {selectedExportIds.has(photo.id) && (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  <div className="absolute top-2 right-2 flex gap-1">
                    {/* Botão de Play (Novo) */}
                    {photo.videoUrl && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(photo.videoUrl, '_blank', 'noopener,noreferrer');
                        }}
                        className="p-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:from-purple-700 hover:to-pink-700"
                        title="Abrir vídeo no Instagram"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </button>
                    )}

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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          <div className="flex flex-col md:flex-row md:items-center gap-4 w-full min-w-0">
            <div className="flex items-center gap-4 flex-shrink-0">
              <span className="text-lg font-black text-slate-800 whitespace-nowrap">{editingPhoto ? 'EDITAR' : 'NOVO REGISTRO'}</span>
              <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
              <div className="hidden lg:flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                <div className="w-1.5 h-4 bg-blue-600 rounded-full mr-2"></div>
                Atribuição
              </div>
            </div>

            <div className="flex-1 flex gap-2 min-w-0">
              <input
                placeholder="Título do Registro..."
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium focus:ring-1 focus:ring-blue-400 outline-none transition-all"
                required
              />
              <input
                placeholder="Caminho (Local)..."
                value={formData.localPath}
                onChange={e => setFormData({ ...formData, localPath: e.target.value })}
                className="hidden sm:block flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-mono focus:ring-1 focus:ring-blue-400 outline-none transition-all"
              />
            </div>
          </div>
        }
        maxWidth="max-w-[95vw]"
      >
        {(() => {
          // Compute video mode for the modal UI
          const cat1 = categories.find(c => c.order === 1);
          const videoTag = cat1 ? tags.find(t => t.categoryId === cat1.id && t.order === 1) : null;
          const isVideoMode = !!(videoTag && formData.tagIds.includes(videoTag.id));
          return (
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

                  {/* Image Upload / Video Link - Conditional */}
                  <div className="space-y-3">
                    {isVideoMode ? (
                      // Video mode: show Instagram link input + fetch button + preview
                      <div className="space-y-3">
                        {/* Link input + fetch button */}
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <input
                              type="url"
                              placeholder="Link do Instagram (Reel) ou YouTube..."
                              value={formData.videoUrl}
                              onChange={e => { setFormData({ ...formData, videoUrl: e.target.value }); setVideoPreviewDataUrl(''); }}
                              className="flex-1 min-w-0 bg-white border border-purple-200 rounded-xl px-3 py-2 text-[11px] font-mono focus:ring-2 focus:ring-purple-400 outline-none transition-all placeholder:text-slate-300"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (formData.videoUrl.trim()) window.open(formData.videoUrl, '_blank', 'noopener,noreferrer');
                              }}
                              disabled={!formData.videoUrl.trim()}
                              className="px-3 py-2 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-xl hover:bg-slate-200 disabled:opacity-50 transition-all border border-slate-200"
                              title="Testar se o link abre corretamente"
                            >
                              🔗 Testar
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={handleFetchThumbnail}
                            disabled={!formData.videoUrl.trim() || fetchingThumbnail}
                            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-black rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/20"
                          >
                            {fetchingThumbnail ? '⏳ Buscando Capa...' : (formData.url && isVideoMode ? '🔄 Atualizar Capa Automática' : '🔍 Buscar Capa Automaticamente')}
                          </button>
                        </div>

                        {/* Thumbnail preview area */}
                        <div className={`aspect-video rounded-2xl overflow-hidden border-2 border-dashed flex items-center justify-center transition-all ${videoPreviewDataUrl ? 'border-green-300 bg-green-50' : 'border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50'}`}>
                          {videoPreviewDataUrl ? (
                            <div className="relative w-full h-full group/vidprev">
                              <img src={videoPreviewDataUrl} alt="Capa do vídeo" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
                                  <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                </div>
                              </div>
                              <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                                <span className="bg-green-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                                  {videoPreviewDataUrl.startsWith('data:') ? '✓ Capa capturada e comprimida' : '✓ Capa atual do registro'}
                                </span>
                                <button type="button" onClick={() => setVideoPreviewDataUrl('')} className="bg-black/50 text-white text-[9px] px-2 py-0.5 rounded-full">Trocar</button>
                              </div>
                            </div>
                          ) : fetchingThumbnail ? (
                            <div className="flex flex-col items-center gap-3 text-purple-500">
                              <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                              <span className="text-[10px] font-bold">Buscando capa...</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-3 p-6">
                              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <div className="flex flex-col items-center gap-2">
                                <span className="text-[10px] font-black text-purple-700 uppercase tracking-widest text-center">Busque a capa ou suba manualmente</span>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => document.getElementById('manual-video-thumb')?.click()}
                                    className="px-3 py-1.5 bg-white border border-purple-200 text-purple-600 text-[9px] font-black rounded-lg hover:bg-purple-50 transition-all flex items-center gap-1.5"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    UPLOAD MANUAL
                                  </button>
                                  <input
                                    id="manual-video-thumb"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        setProcessingImage(true);
                                        try {
                                          const compressed = await processAndCompressImage(file);
                                          setVideoPreviewDataUrl(compressed);
                                        } finally {
                                          setProcessingImage(false);
                                        }
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      // Photo mode: normal image upload
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
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {categories.map(cat => {
                      // Disable other cat-1 tags when video mode is active
                      const cat1 = categories.find(c => c.order === 1);
                      const videoTag = cat1 ? tags.find(t => t.categoryId === cat1.id && t.order === 1) : null;
                      const isVideoMode = !!(videoTag && formData.tagIds.includes(videoTag.id));
                      const isCat1 = cat.order === 1;

                      return (
                        <div key={cat.id} className="flex flex-col bg-white border border-slate-200 rounded-3xl overflow-hidden group/cat hover:border-blue-200 transition-all">
                          <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="bg-slate-800 text-white text-[9px] font-black px-1.5 py-0.5 rounded">NÍVEL {cat.order}</span>
                              <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{cat.name}</h4>
                              {cat.isRequired && <span className="text-[10px] text-red-600 font-black animate-pulse">*</span>}
                              {isVideoMode && isCat1 && <span className="text-[9px] text-purple-600 font-black bg-purple-50 px-1.5 py-0.5 rounded">🎬 VÍDEO</span>}
                            </div>
                          </div>
                          <div className="p-4 flex flex-wrap gap-x-2 gap-y-1 min-h-[80px]">
                            {tags.filter(t => t.categoryId === cat.id).map(tag => {
                              const isSelected = formData.tagIds.includes(tag.id);
                              // Disable non-video tags in cat-1 when video mode is active
                              const isVideoTag = videoTag && tag.id === videoTag.id;
                              const isDisabled = isVideoMode && isCat1 && !isVideoTag;
                              return (
                                <button
                                  key={tag.id}
                                  type="button"
                                  disabled={isDisabled}
                                  onClick={() => !isDisabled && toggleModalTag(tag.id)}
                                  className={`px-4 py-2 rounded-2xl text-[10px] font-black border transition-all flex items-center gap-2 ${isDisabled
                                    ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-50'
                                    : isSelected
                                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                                      : 'bg-white border-slate-100 text-slate-400 hover:border-blue-400 hover:text-blue-600'
                                    }`}
                                >
                                  {isSelected && !isDisabled && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
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
              </div >

              <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-8 border-t border-slate-100 bg-white mt-auto">
                <div className="bg-blue-50 px-5 py-3 rounded-2xl border border-blue-100"><p className="text-[10px] font-bold text-blue-700 leading-tight uppercase">Salvamento com compactação inteligente ativa</p></div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)} className="flex-1 sm:flex-none py-2 px-6 text-xs h-10">Cancelar</Button>
                  <Button type="submit" disabled={saving || (!isVideoMode && !formData.url) || processingImage} className="flex-1 sm:flex-none px-10 py-2 shadow-xl shadow-blue-500/20 text-xs font-black uppercase tracking-widest h-10">
                    {saving || processingImage ? 'Processando...' : 'Finalizar Registro'}
                  </Button>
                </div>
              </div>
            </form>
          );
        })()}
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

      {/* Export Action Bar */}
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
                <Button
                  onClick={handleExportPDF}
                  className={`py-1.5 px-6 text-xs h-9 shadow-lg flex items-center gap-2 transition-all ${effectiveSelectionCount > pdfLimit
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                    }`}
                >
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
      {/* Progress UI Overlay */}
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
      <Modal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
        title={errorModal.title}
        maxWidth="max-w-md"
      >
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center shadow-inner">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="text-center space-y-2">
            <div className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-line">
              {errorModal.message}
            </div>
          </div>
          <Button variant="danger" onClick={() => setErrorModal({ ...errorModal, isOpen: false })} className="w-full py-3 shadow-lg shadow-red-500/20 font-black uppercase tracking-widest text-[10px]">
            Entendi
          </Button>
        </div>
      </Modal>
    </Layout >
  );
};

export default Photos;
