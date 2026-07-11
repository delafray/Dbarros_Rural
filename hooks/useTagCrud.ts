import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Tag, TagCategory } from '../types';
import { AlertType } from '../components/AlertModal';

interface UseTagCrudOptions {
  userId: string | undefined;
  showAlert: (title: string, message: string, type?: AlertType, onConfirm?: () => void) => void;
}

export function useTagCrud({ userId, showAlert }: UseTagCrudOptions) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedCatId, setSelectedCatId] = useState('');
  const [saving, setSaving] = useState(false);
  const [pdfLimit, setPdfLimit] = useState<number>(30);
  const [lastSavedLimit, setLastSavedLimit] = useState<number>(30);
  const [configSaving, setConfigSaving] = useState(false);

  // Collision flow
  const [isCollisionModalOpen, setIsCollisionModalOpen] = useState(false);
  const [pendingTagData, setPendingTagData] = useState<{ name: string; categoryId: string; order: number } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!userId) return;
      const [cats, t, configLimit] = await Promise.all([
        api.getTagCategories(userId),
        api.getTags(userId),
        api.getSystemConfig('pdf_limit')
      ]);

      if (configLimit) {
        const val = parseInt(configLimit);
        setPdfLimit(val);
        setLastSavedLimit(val);
      }

      const sortedCats = cats
        .filter(c => c.name !== '__SYSCONFIG__')
        .sort((a, b) => (a.order - b.order) || (a.createdAt || '').localeCompare(b.createdAt || ''));
      const sortedTags = t.sort((a, b) => (a.order - b.order) || a.createdAt.localeCompare(b.createdAt));
      setCategories(sortedCats);
      setTags(sortedTags);
      if (sortedCats.length > 0 && !selectedCatId) setSelectedCatId(sortedCats[0].id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleSaveConfig = async () => {
    if (!userId) return;
    setConfigSaving(true);
    try {
      await api.updateSystemConfig(userId, 'pdf_limit', String(pdfLimit));
      setLastSavedLimit(pdfLimit);
    } catch (err: any) {
      console.error('Failed to update PDF limit:', err);
      showAlert('Erro Operacional', 'Erro ao salvar limite de PDF: ' + err.message, 'error');
    } finally {
      setTimeout(() => setConfigSaving(false), 800);
    }
  };

  const handleCreateCategory = async (
    e: React.FormEvent,
    newCatName: string,
    newCatOrder: number,
    newCatRequired: boolean,
    newCatPeerIds: string[],
    onSuccess: () => void
  ) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    if (!userId) return;
    setSaving(true);
    try {
      await api.createTagCategory(userId, newCatName.trim(), newCatOrder, newCatRequired, newCatPeerIds);
      onSuccess();
      await fetchData();
    } catch (err: any) {
      console.error(err);
      showAlert('Erro', 'Erro ao criar categoria: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCategory = async (
    e: React.FormEvent,
    editingCat: TagCategory,
    onSuccess: () => void
  ) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateTagCategory(editingCat.id, {
        name: editingCat.name,
        order: editingCat.order,
        isRequired: editingCat.isRequired,
        peerCategoryIds: editingCat.peerCategoryIds
      });
      onSuccess();
      await fetchData();
    } catch (err: any) {
      console.error(err);
      showAlert('Erro', 'Erro ao atualizar categoria: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTag = async (
    e: React.FormEvent,
    newTagName: string,
    catId: string,
    newTagOrder: number | '',
    onSuccess: () => void
  ) => {
    e.preventDefault();
    if (!newTagName.trim() || !catId) return;

    const currentTagsInCat = tags.filter(t => t.categoryId === catId);
    const finalOrder = typeof newTagOrder === 'number' ? newTagOrder : (
      currentTagsInCat.length > 0 ? Math.max(...currentTagsInCat.map(t => t.order)) + 1 : 1
    );

    const collision = currentTagsInCat.find(t => t.order === finalOrder);

    if (collision) {
      setPendingTagData({ name: newTagName.trim(), categoryId: catId, order: finalOrder });
      setIsCollisionModalOpen(true);
      return;
    }

    if (!userId) return;
    setSaving(true);
    try {
      await api.createTag(userId, newTagName.trim(), catId, finalOrder);
      onSuccess();
      await fetchData();
    } catch (err: any) {
      console.error(err);
      showAlert('Erro', 'Erro ao criar tag: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteRegistration = async (shift: boolean, onSuccess: () => void) => {
    if (!pendingTagData) return;
    setSaving(true);
    try {
      if (!userId) return;
      if (shift) {
        const currentTagsInCat = tags.filter(t => t.categoryId === pendingTagData.categoryId);
        const tagsToShift = currentTagsInCat.filter(t => t.order >= pendingTagData.order);
        for (const t of tagsToShift) {
          await api.updateTag(t.id, { order: t.order + 1 });
        }
      }

      await api.createTag(userId, pendingTagData.name, pendingTagData.categoryId, pendingTagData.order);
      setIsCollisionModalOpen(false);
      setPendingTagData(null);
      onSuccess();
      await fetchData();
    } catch (err: any) {
      console.error(err);
      showAlert('Erro', 'Erro ao registrar tag: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTag = async (
    e: React.FormEvent,
    editingTag: Tag,
    onSuccess: () => void
  ) => {
    e.preventDefault();
    if (!editingTag.name.trim()) return;
    setSaving(true);
    try {
      await api.updateTag(editingTag.id, {
        name: editingTag.name,
        order: editingTag.order
      });
      onSuccess();
      await fetchData();
    } catch (err: any) {
      console.error(err);
      showAlert('Erro', 'Erro ao atualizar tag: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = (id: string) => {
    showAlert('Excluir Nível', 'Tem certeza que deseja excluir esta categoria e todas as suas tags? A ação não pode ser desfeita e pode corromper fotos baseadas nessa árvore de filtro caso existam.', 'confirm', async () => {
      await api.deleteTagCategory(id);
      fetchData();
    });
  };

  const handleDeleteTag = (id: string) => {
    showAlert('Excluir Sub-tag', 'Tem certeza que deseja excluir esta tag de filtro permanentemente?', 'confirm', async () => {
      await api.deleteTag(id);
      fetchData();
    });
  };

  return {
    loading,
    categories,
    tags,
    selectedCatId,
    setSelectedCatId,
    saving,
    pdfLimit,
    setPdfLimit,
    lastSavedLimit,
    configSaving,
    isCollisionModalOpen,
    setIsCollisionModalOpen,
    pendingTagData,
    fetchData,
    handleSaveConfig,
    handleCreateCategory,
    handleUpdateCategory,
    handleCreateTag,
    handleExecuteRegistration,
    handleUpdateTag,
    handleDeleteCategory,
    handleDeleteTag,
  };
}
