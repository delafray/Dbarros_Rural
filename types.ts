
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
  order: number; // Campo de hierarquia manual (1, 2, 3...)
  createdAt: string;
}

export interface Tag {
  id: string;
  userId: string;
  name: string;
  categoryId: string; // Referência à categoria pai
  createdAt: string;
}

export interface Photo {
  id: string;
  userId: string;
  name: string;
  url: string; // Base64 string para o mock ou URL real
  tagIds: string[];
  localPath?: string; // Novo campo para caminho do Windows/Rede
  thumbnailUrl?: string; // Nova miniatura
  createdAt: string;
  userName?: string;
}

export interface GalleryService {
  // Tag Categories
  getTagCategories: () => Promise<TagCategory[]>;
  createTagCategory: (name: string, order: number) => Promise<TagCategory>;
  updateTagCategory: (id: string, data: Partial<TagCategory>) => Promise<TagCategory>;
  deleteTagCategory: (id: string) => Promise<void>;

  // Tags
  getTags: () => Promise<Tag[]>;
  createTag: (name: string, categoryId: string) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;

  // Photos
  getPhotoIndex: (onlyMine?: boolean) => Promise<Array<{ id: string; name: string; tagIds: string[]; userId: string; userName?: string }>>;
  getPhotosByIds: (ids: string[]) => Promise<Photo[]>;
  getPhotos: () => Promise<Photo[]>;
  uploadPhotoFile: (file: File) => Promise<string>;
  createPhoto: (data: Omit<Photo, 'id' | 'userId' | 'createdAt'>) => Promise<Photo>;
  updatePhoto: (id: string, data: Partial<Photo>) => Promise<Photo>;
  deletePhoto: (id: string) => Promise<void>;

  // Users
  getUsersWithPhotos: () => Promise<Array<{ id: string; name: string }>>;
}
