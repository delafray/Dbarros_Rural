import { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { Photo, Tag, TagCategory } from '../../types';

const PHOTOS_PER_PAGE = 24;

interface UsePhotosDataParams {
  userId: string | undefined;
  onlyMine: boolean;
}

export function usePhotosData({ userId, onlyMine }: UsePhotosDataParams) {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [photoIndex, setPhotoIndex] = useState<Array<{ id: string; name: string; tagIds: string[]; userId: string; videoUrl?: string; createdAt: string }>>([]);
  const [hydratedPhotos, setHydratedPhotos] = useState<Photo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [usersWithPhotos, setUsersWithPhotos] = useState<Array<{ id: string; name: string }>>([]);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [pdfLimit, setPdfLimit] = useState<number>(30);
  const [displayCount, setDisplayCount] = useState(PHOTOS_PER_PAGE);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!userId) {
        console.warn("User ID not found, skipping fetch");
        return;
      }

      const [index, t, c, u, allU, configLimit] = await Promise.all([
        api.getPhotoIndex(userId, onlyMine),
        api.getTags(userId),
        api.getTagCategories(userId),
        api.getUsersWithPhotos(),
        api.getUsers(),
        api.getSystemConfig('pdf_limit')
      ]);

      if (configLimit) {
        const parsedLimit = parseInt(configLimit);
        if (!isNaN(parsedLimit)) setPdfLimit(parsedLimit);
      }

      setPhotoIndex(index);
      setTags(t);
      setCategories(c.filter(cat => cat.name !== '__SYSCONFIG__').sort((a, b) => (a.order - b.order) || (a.createdAt || '').localeCompare(b.createdAt || '')));
      setUsersWithPhotos(u);
      setAllUsers(allU);
    } catch (err) {
      console.error("Critical error in fetchData:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId, onlyMine]);

  // Reset pagination count when filter changes (caller should pass filteredIds)
  const resetDisplayCount = () => setDisplayCount(PHOTOS_PER_PAGE);

  const loadMore = (totalFilteredIds: number) => {
    if (displayCount < totalFilteredIds) {
      setDisplayCount(prev => prev + PHOTOS_PER_PAGE);
    }
  };

  return {
    loading,
    loadingMore,
    setLoadingMore,
    photoIndex,
    hydratedPhotos,
    setHydratedPhotos,
    tags,
    categories,
    usersWithPhotos,
    allUsers,
    pdfLimit,
    displayCount,
    resetDisplayCount,
    loadMore,
    fetchData,
  };
}
