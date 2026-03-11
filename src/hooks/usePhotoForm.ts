import React, { useState } from 'react';
import { api } from '../../services/api';
import { deletePhotoStorageFiles } from '../../services/api/photoService';
import { Photo, Tag, TagCategory } from '../../types';
import {
  dataURLtoBlob,
  generateThumbnail,
  extractInstagramShortcode,
  extractYouTubeId,
  fetchInstagramThumbnail,
  fetchYouTubeThumbnail,
  processAndCompressImage,
  compressExternalImage
} from '../utils/imageUtils';

interface FormData {
  name: string;
  url: string;
  thumbnailUrl: string;
  tagIds: string[];
  localPath: string;
  storageLocation: string;
  videoUrl: string;
  userId: string;
  selectedFile: File | null;
}

const EMPTY_FORM: FormData = {
  name: '', url: '', thumbnailUrl: '', tagIds: [],
  localPath: '', storageLocation: '', videoUrl: '',
  userId: '', selectedFile: null
};

interface UsePhotoFormParams {
  userId: string;
  categories: TagCategory[];
  tags: Tag[];
  showAlert: (title: string, message: string, type: 'info' | 'success' | 'error' | 'confirm', onConfirm?: () => void) => void;
  fetchData: () => Promise<void>;
  setHydratedPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
}

export function usePhotoForm({
  userId,
  categories,
  tags,
  showAlert,
  fetchData,
  setHydratedPhotos,
}: UsePhotoFormParams) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [formData, setFormData] = useState<FormData>({ ...EMPTY_FORM });
  const [videoPreviewDataUrl, setVideoPreviewDataUrl] = useState<string>('');
  const [fetchingThumbnail, setFetchingThumbnail] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessingImage(true);
    try {
      const compressedUrl = await processAndCompressImage(file);
      setFormData(prev => ({
        ...prev,
        url: compressedUrl,
        name: prev.name || file.name.split('.')[0],
        localPath: prev.localPath || '',
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
        storageLocation: photo.storageLocation || '',
        videoUrl: photo.videoUrl || '',
        userId: photo.userId,
        selectedFile: null
      });
    } else {
      setEditingPhoto(null);
      setFormData({ ...EMPTY_FORM, userId });
    }
    setVideoPreviewDataUrl(photo && photo.videoUrl ? photo.url : '');
    setIsModalOpen(true);
  };

  const handleFetchThumbnail = async () => {
    const url = formData.videoUrl.trim();
    if (!url) return;

    const instagramShortcode = extractInstagramShortcode(url);
    const youtubeId = extractYouTubeId(url);

    if (!instagramShortcode && !youtubeId) {
      showAlert('Link invalido', 'O link nao parece ser um Reel do Instagram ou um video do YouTube. Verifique o URL e tente novamente.', 'error');
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
        showAlert('Capa nao encontrada', 'Nao foi possivel buscar a capa. Certifique-se que o video e publico e o link esta correto.', 'error');
        return;
      }

      try {
        const compressed = await compressExternalImage(`https://api.allorigins.win/raw?url=${encodeURIComponent(ogImageUrl)}`);
        setVideoPreviewDataUrl(compressed);
      } catch {
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

  const toggleModalTag = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId) ? prev.tagIds.filter(id => id !== tagId) : [...prev.tagIds, tagId]
    }));
  };

  const isVideoMode = (() => {
    const cat1 = categories.find(c => c.order === 1);
    const videoTag = cat1 ? tags.find(t => t.categoryId === cat1.id && t.order === 1) : null;
    return !!(videoTag && formData.tagIds.includes(videoTag.id));
  })();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const cat1 = categories.find(c => c.order === 1);
    const videoTag = cat1 ? tags.find(t => t.categoryId === cat1.id && t.order === 1) : null;
    const currentVideoMode = !!(videoTag && formData.tagIds.includes(videoTag.id));

    if (currentVideoMode) {
      if (!formData.videoUrl.trim()) {
        showAlert('Link obrigatorio', 'Cole o link do Instagram Reel para continuar.', 'error');
        return;
      }
    } else {
      if (!formData.url) {
        showAlert('Imagem obrigatoria', 'Escolha uma foto para continuar.', 'error');
        return;
      }
    }

    // Validation for Mandatory Categories
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
      showAlert('Campos Obrigatorios', `A selecao nos seguintes grupos/niveis e obrigatoria:\n- ${list}`, 'error');
      return;
    }

    const oldPhotoUrls: (string | undefined)[] = editingPhoto
      ? [editingPhoto.url, editingPhoto.thumbnailUrl]
      : [];

    setSaving(true);
    try {
      let finalUrl = formData.url;
      let finalThumbUrl = formData.thumbnailUrl;
      let finalVideoUrl = formData.videoUrl;
      let storageFilesReplaced = false;

      if (currentVideoMode && formData.videoUrl.trim()) {
        if (!videoPreviewDataUrl) {
          showAlert('Capa obrigatoria', 'Clique em "Buscar Capa" para validar e carregar a imagem do video antes de salvar.', 'error');
          setSaving(false);
          return;
        }

        const isFreshCapture = videoPreviewDataUrl.startsWith('data:');
        if (isFreshCapture) {
          setProcessingImage(true);
          try {
            const thumbBlob = dataURLtoBlob(videoPreviewDataUrl);
            const thumbFile = new File([thumbBlob], `video_thumb_${Date.now()}.jpg`, { type: 'image/jpeg' });
            finalUrl = await api.uploadPhotoFile(userId, thumbFile);
            finalThumbUrl = finalUrl;
            storageFilesReplaced = true;
          } catch {
            finalUrl = videoPreviewDataUrl;
            finalThumbUrl = videoPreviewDataUrl;
          }
          setProcessingImage(false);
        } else {
          finalUrl = formData.url;
          finalThumbUrl = formData.thumbnailUrl;
        }
      } else if (formData.selectedFile) {
        const blob = dataURLtoBlob(formData.url);
        const fileToUpload = new File([blob], formData.selectedFile.name, { type: blob.type });
        finalUrl = await api.uploadPhotoFile(userId, fileToUpload);
        const thumbDataUrl = await generateThumbnail(formData.selectedFile);
        const thumbBlob = dataURLtoBlob(thumbDataUrl);
        const thumbToUpload = new File([thumbBlob], `thumb_${formData.selectedFile.name}`, { type: thumbBlob.type });
        finalThumbUrl = await api.uploadPhotoFile(userId, thumbToUpload);
        storageFilesReplaced = true;
      }

      if (!userId) return;
      const saveData = { ...formData, url: finalUrl, thumbnailUrl: finalThumbUrl, videoUrl: finalVideoUrl };
      if (editingPhoto) {
        await api.updatePhoto(editingPhoto.id, saveData);
        setHydratedPhotos(prev => prev.filter(p => p.id !== editingPhoto.id));
        if (storageFilesReplaced && oldPhotoUrls.length > 0) {
          deletePhotoStorageFiles(oldPhotoUrls);
        }
      } else {
        await api.createPhoto(userId, saveData);
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      showAlert('Erro Operacional', 'Erro ao salvar: ' + err.message, 'error');
    } finally {
      setSaving(false);
      setProcessingImage(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    showAlert('Excluir Arquivo', 'Deseja excluir permanentemente este arquivo multimidia? Esta acao nao pode ser desfeita.', 'confirm', async () => {
      await api.deletePhoto(id);
      fetchData();
    });
  };

  return {
    isModalOpen,
    setIsModalOpen,
    saving,
    processingImage,
    setProcessingImage,
    editingPhoto,
    formData,
    setFormData,
    videoPreviewDataUrl,
    setVideoPreviewDataUrl,
    fetchingThumbnail,
    isVideoMode,
    handleFileUpload,
    handleOpenModal,
    handleFetchThumbnail,
    toggleModalTag,
    handleSave,
    handleDelete,
  };
}
