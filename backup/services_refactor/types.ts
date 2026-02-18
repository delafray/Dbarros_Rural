
export type CustomerStatus = 'ativo' | 'inativo';
export type SubscriptionStatus = 'ativa' | 'vencida' | 'cancelada';

export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, password: string, isAdmin: boolean) => Promise<void>;
  isLoading: boolean;
}

export interface TagCategory {
  id: string;
  userId: string;
  name: string;
  order: number;
  isRequired: boolean;
  peerCategoryIds?: string[];
  createdAt: string;
}

export interface Tag {
  id: string;
  userId: string;
  name: string;
  categoryId: string; // Referência à categoria pai
  order: number; // Novo campo de ordenação manual
  createdAt: string;
}

export interface Photo {
  id: string;
  userId: string;
  name: string;
  url: string; // Base64 ou URL da imagem/capa
  tagIds: string[];
  localPath?: string;
  thumbnailUrl?: string;
  videoUrl?: string; // Link original do Instagram
  createdAt: string;
  userName?: string;
}

export interface GalleryService {
  // Tag Categories
  getTagCategories: () => Promise<TagCategory[]>;
  createTagCategory: (name: string, order: number, isRequired?: boolean, peerCategoryIds?: string[]) => Promise<TagCategory>;
  updateTagCategory: (id: string, data: Partial<TagCategory>) => Promise<TagCategory>;
  deleteTagCategory: (id: string) => Promise<void>;

  // Tags
  getTags: () => Promise<Tag[]>;
  createTag: (name: string, categoryId: string, order?: number) => Promise<Tag>;
  updateTag: (id: string, data: Partial<Tag>) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;

  // Photos
  getPhotoIndex: (onlyMine?: boolean) => Promise<Array<{ id: string; name: string; tagIds: string[]; userId: string; userName?: string; createdAt: string }>>;
  getPhotosByIds: (ids: string[]) => Promise<Photo[]>;
  getPhotos: () => Promise<Photo[]>;
  uploadPhotoFile: (file: File) => Promise<string>;
  createPhoto: (data: Omit<Photo, 'id' | 'createdAt'>) => Promise<Photo>;
  updatePhoto: (id: string, data: Partial<Photo>) => Promise<Photo>;
  deletePhoto: (id: string) => Promise<void>;

  // Users
  getUsersWithPhotos: () => Promise<Array<{ id: string; name: string }>>;
  getUsers: () => Promise<Array<{ id: string; name: string }>>;

  // System Config
  getSystemConfig: (key: string) => Promise<string | null>;
  updateSystemConfig: (key: string, value: string) => Promise<void>;
}
