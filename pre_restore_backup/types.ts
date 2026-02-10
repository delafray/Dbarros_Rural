
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

export interface Customer {
  id: string;
  userId: string;
  name: string;
  email: string;
  status: CustomerStatus;
  notes?: string;
  createdAt: string;
}

export interface Plan {
  id: string;
  userId: string;
  name: string;
  price: number;
  active: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  customerId: string;
  planId: string;
  startDate: string;
  nextRenewal: string;
  status: SubscriptionStatus;
}

export interface Payment {
  id: string;
  userId: string;
  subscriptionId: string;
  amount: number;
  paidAt: string;
}

export interface TagCategory {
  id: string;
  userId: string;
  name: string;
  order: number; // Campo de hierarquia manual (1, 2, 3...)
}

export interface Tag {
  id: string;
  userId: string;
  name: string;
  categoryId: string; // Referência à categoria pai
}

export interface Photo {
  id: string;
  userId: string;
  name: string;
  url: string; // Base64 string para o mock
  tagIds: string[];
  localPath?: string; // Novo campo para caminho do Windows/Rede
  createdAt: string;
}

export interface DashboardStats {
  totalCustomers: number;
  activeSubscriptions: number;
  overdueSubscriptions: number;
  mrr: number;
}

export interface SubControlService {
  // Customers
  getCustomers: () => Promise<Customer[]>;
  createCustomer: (data: Omit<Customer, 'id' | 'createdAt'>) => Promise<Customer>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;

  // Plans
  getPlans: () => Promise<Plan[]>;
  createPlan: (data: Omit<Plan, 'id'>) => Promise<Plan>;
  updatePlan: (id: string, data: Partial<Plan>) => Promise<Plan>;
  deletePlan: (id: string) => Promise<void>;

  // Subscriptions
  getSubscriptions: () => Promise<Subscription[]>;
  createSubscription: (data: Omit<Subscription, 'id'>) => Promise<Subscription>;
  updateSubscription: (id: string, data: Partial<Subscription>) => Promise<Subscription>;
  deleteSubscription: (id: string) => Promise<void>;

  // Payments
  getPayments: () => Promise<Payment[]>;
  createPayment: (data: Omit<Payment, 'id'>) => Promise<Payment>;
  listPaymentsBySubscription: (subscriptionId: string) => Promise<Payment[]>;

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
  getPhotos: () => Promise<Photo[]>;
  createPhoto: (data: Omit<Photo, 'id' | 'createdAt'>) => Promise<Photo>;
  updatePhoto: (id: string, data: Partial<Photo>) => Promise<Photo>;
  deletePhoto: (id: string) => Promise<void>;
  searchPhotos: (primaryTagIds: string[], subTagIds: string[], page?: number, limit?: number) => Promise<PaginatedPhotos>;
  getAvailableTags: (primaryTagIds: string[], subTagIds: string[]) => Promise<string[]>;
}

export interface PaginatedPhotos {
  photos: Photo[];
  total: number;
}
