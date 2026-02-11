
import {
  Tag,
  TagCategory,
  Photo,
  GalleryService
} from '../types';

const STORAGE_KEYS = {
  TAG_CATEGORIES: 'gallery_tag_categories',
  TAGS: 'gallery_tags',
  PHOTOS: 'gallery_photos',
  AUTH: 'gallery_auth'
};

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

const getStorageItem = <T,>(key: string, defaultValue: T): T => {
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : defaultValue;
};

const setStorageItem = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const seedData = () => {
  if (!localStorage.getItem(STORAGE_KEYS.TAG_CATEGORIES)) {
    const categories: TagCategory[] = [
      { id: 'cat1', name: 'Tipologia', order: 1, userId: 'system', createdAt: new Date().toISOString() },
      { id: 'cat2', name: 'Tamanho', order: 2, userId: 'system', createdAt: new Date().toISOString() },
      { id: 'cat3', name: 'Custo', order: 3, userId: 'system', createdAt: new Date().toISOString() },
    ];
    setStorageItem(STORAGE_KEYS.TAG_CATEGORIES, categories);

    const tags: Tag[] = [
      { id: 't1', name: 'Construído', categoryId: 'cat1', userId: 'system', createdAt: new Date().toISOString() },
      { id: 't2', name: 'Básico', categoryId: 'cat1', userId: 'system', createdAt: new Date().toISOString() },
      { id: 't3', name: 'Semiconstruído', categoryId: 'cat1', userId: 'system', createdAt: new Date().toISOString() },
      { id: 't4', name: '20m²', categoryId: 'cat2', userId: 'system', createdAt: new Date().toISOString() },
      { id: 't5', name: '30m²', categoryId: 'cat2', userId: 'system', createdAt: new Date().toISOString() },
      { id: 't6', name: '40m²', categoryId: 'cat2', userId: 'system', createdAt: new Date().toISOString() },
      { id: 't7', name: 'Baixo Custo', categoryId: 'cat3', userId: 'system', createdAt: new Date().toISOString() },
      { id: 't8', name: 'Médio Custo', categoryId: 'cat3', userId: 'system', createdAt: new Date().toISOString() },
      { id: 't9', name: 'Alto Custo', categoryId: 'cat3', userId: 'system', createdAt: new Date().toISOString() },
    ];
    setStorageItem(STORAGE_KEYS.TAGS, tags);
  }
};

seedData();

export const mockService: GalleryService = {
  getTagCategories: async () => { await delay(); return getStorageItem(STORAGE_KEYS.TAG_CATEGORIES, []); },
  createTagCategory: async (name, order) => {
    await delay();
    const categories = getStorageItem<TagCategory[]>(STORAGE_KEYS.TAG_CATEGORIES, []);
    const newCat: TagCategory = { id: Math.random().toString(36).substr(2, 9), name, order, userId: 'system', createdAt: new Date().toISOString() };
    setStorageItem(STORAGE_KEYS.TAG_CATEGORIES, [...categories, newCat]);
    return newCat;
  },
  updateTagCategory: async (id, data) => {
    await delay();
    const categories = getStorageItem<TagCategory[]>(STORAGE_KEYS.TAG_CATEGORIES, []);
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Category not found');
    categories[index] = { ...categories[index], ...data };
    setStorageItem(STORAGE_KEYS.TAG_CATEGORIES, categories);
    return categories[index];
  },
  deleteTagCategory: async (id) => {
    await delay();
    const categories = getStorageItem<TagCategory[]>(STORAGE_KEYS.TAG_CATEGORIES, []);
    const tags = getStorageItem<Tag[]>(STORAGE_KEYS.TAGS, []);
    setStorageItem(STORAGE_KEYS.TAG_CATEGORIES, categories.filter(c => c.id !== id));
    setStorageItem(STORAGE_KEYS.TAGS, tags.filter(t => t.categoryId !== id));
  },

  getTags: async () => { await delay(); return getStorageItem(STORAGE_KEYS.TAGS, []); },
  createTag: async (name, categoryId) => {
    await delay();
    const tags = getStorageItem<Tag[]>(STORAGE_KEYS.TAGS, []);
    const newTag: Tag = { id: Math.random().toString(36).substr(2, 9), name, categoryId, userId: 'system', createdAt: new Date().toISOString() };
    setStorageItem(STORAGE_KEYS.TAGS, [...tags, newTag]);
    return newTag;
  },
  deleteTag: async (id) => {
    await delay();
    const tags = getStorageItem<Tag[]>(STORAGE_KEYS.TAGS, []);
    setStorageItem(STORAGE_KEYS.TAGS, tags.filter(t => t.id !== id));
  },

  getPhotoIndex: async (onlyMine) => {
    await delay();
    const photos = getStorageItem(STORAGE_KEYS.PHOTOS, []) as Photo[];
    const filtered = onlyMine ? photos.filter(p => p.userId === 'mock-admin') : photos;
    return filtered.map(p => ({
      id: p.id,
      name: p.name,
      tagIds: Array.isArray(p.tagIds) ? p.tagIds : [],
      userId: p.userId || 'unknown',
      userName: p.userName || 'Sistema'
    }));
  },
  getPhotosByIds: async (ids) => {
    await delay();
    const photos = getStorageItem(STORAGE_KEYS.PHOTOS, []) as Photo[];
    return ids.map(id => photos.find(p => p.id === id)).filter((p): p is Photo => !!p);
  },
  getPhotos: async () => {
    await delay();
    return getStorageItem(STORAGE_KEYS.PHOTOS, []);
  },
  uploadPhotoFile: async (file) => {
    await delay();
    return URL.createObjectURL(file);
  },
  createPhoto: async (data) => {
    await delay();
    const photos = getStorageItem(STORAGE_KEYS.PHOTOS, []);
    const newPhoto: Photo = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      userId: 'mock-admin',
      createdAt: new Date().toISOString()
    };
    photos.push(newPhoto);
    setStorageItem(STORAGE_KEYS.PHOTOS, photos);
    return newPhoto;
  },
  updatePhoto: async (id, data) => {
    await delay();
    const photos = getStorageItem(STORAGE_KEYS.PHOTOS, []) as Photo[];
    const index = photos.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Photo not found');
    photos[index] = { ...photos[index], ...data };
    setStorageItem(STORAGE_KEYS.PHOTOS, photos);
    return photos[index];
  },
  deletePhoto: async (id) => {
    await delay();
    const photos = getStorageItem(STORAGE_KEYS.PHOTOS, []) as Photo[];
    const filtered = photos.filter(p => p.id !== id);
    setStorageItem(STORAGE_KEYS.PHOTOS, filtered);
  },
  getUsersWithPhotos: async () => {
    await delay();
    const photos = getStorageItem<Photo[]>(STORAGE_KEYS.PHOTOS, []);
    const userMap = new Map<string, string>();

    photos.forEach(p => {
      if (p.userId && p.userName) {
        userMap.set(p.userId, p.userName);
      }
    });

    return Array.from(userMap.entries()).map(([id, name]) => ({ id, name }));
  }
};
