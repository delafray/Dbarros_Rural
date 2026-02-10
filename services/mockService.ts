
import { 
  Customer, 
  Plan, 
  Subscription, 
  Payment, 
  Tag,
  TagCategory,
  Photo,
  SubControlService 
} from '../types';

const STORAGE_KEYS = {
  CUSTOMERS: 'subcontrol_customers',
  PLANS: 'subcontrol_plans',
  SUBSCRIPTIONS: 'subcontrol_subscriptions',
  PAYMENTS: 'subcontrol_payments',
  TAG_CATEGORIES: 'subcontrol_tag_categories',
  TAGS: 'subcontrol_tags',
  PHOTOS: 'subcontrol_photos',
  AUTH: 'subcontrol_auth'
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
  if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
    const customers: Customer[] = [
      { id: '1', name: 'João Silva', email: 'joao@email.com', status: 'ativo', notes: 'Cliente VIP', createdAt: new Date().toISOString() },
      { id: '2', name: 'Maria Santos', email: 'maria@email.com', status: 'ativo', notes: '', createdAt: new Date().toISOString() },
      { id: '3', name: 'Pedro Oliveira', email: 'pedro@email.com', status: 'inativo', notes: 'Solicitou cancelamento', createdAt: new Date().toISOString() },
    ];
    setStorageItem(STORAGE_KEYS.CUSTOMERS, customers);
  }

  if (!localStorage.getItem(STORAGE_KEYS.PLANS)) {
    const plans: Plan[] = [
      { id: '1', name: 'Plano Básico', price: 49.90, active: true },
      { id: '2', name: 'Plano Premium', price: 99.90, active: true },
    ];
    setStorageItem(STORAGE_KEYS.PLANS, plans);
  }

  if (!localStorage.getItem(STORAGE_KEYS.TAG_CATEGORIES)) {
    const categories: TagCategory[] = [
      { id: 'cat1', name: 'Tipologia', order: 1 },
      { id: 'cat2', name: 'Tamanho', order: 2 },
      { id: 'cat3', name: 'Custo', order: 3 },
    ];
    setStorageItem(STORAGE_KEYS.TAG_CATEGORIES, categories);

    const tags: Tag[] = [
      { id: 't1', name: 'Construído', categoryId: 'cat1' },
      { id: 't2', name: 'Básico', categoryId: 'cat1' },
      { id: 't3', name: 'Semiconstruído', categoryId: 'cat1' },
      { id: 't4', name: '20m²', categoryId: 'cat2' },
      { id: 't5', name: '30m²', categoryId: 'cat2' },
      { id: 't6', name: '40m²', categoryId: 'cat2' },
      { id: 't7', name: 'Baixo Custo', categoryId: 'cat3' },
      { id: 't8', name: 'Médio Custo', categoryId: 'cat3' },
      { id: 't9', name: 'Alto Custo', categoryId: 'cat3' },
    ];
    setStorageItem(STORAGE_KEYS.TAGS, tags);
  }
};

seedData();

export const mockService: SubControlService = {
  getCustomers: async () => { await delay(); return getStorageItem(STORAGE_KEYS.CUSTOMERS, []); },
  createCustomer: async (data) => {
    await delay();
    const customers = getStorageItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
    const newCustomer: Customer = { ...data, id: Math.random().toString(36).substr(2, 9), createdAt: new Date().toISOString() };
    setStorageItem(STORAGE_KEYS.CUSTOMERS, [...customers, newCustomer]);
    return newCustomer;
  },
  updateCustomer: async (id, data) => {
    await delay();
    const customers = getStorageItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
    const index = customers.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Customer not found');
    customers[index] = { ...customers[index], ...data };
    setStorageItem(STORAGE_KEYS.CUSTOMERS, customers);
    return customers[index];
  },
  deleteCustomer: async (id) => {
    await delay();
    const customers = getStorageItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
    setStorageItem(STORAGE_KEYS.CUSTOMERS, customers.filter(c => c.id !== id));
  },

  getPlans: async () => { await delay(); return getStorageItem(STORAGE_KEYS.PLANS, []); },
  createPlan: async (data) => {
    await delay();
    const plans = getStorageItem<Plan[]>(STORAGE_KEYS.PLANS, []);
    const newPlan: Plan = { ...data, id: Math.random().toString(36).substr(2, 9) };
    setStorageItem(STORAGE_KEYS.PLANS, [...plans, newPlan]);
    return newPlan;
  },
  updatePlan: async (id, data) => {
    await delay();
    const plans = getStorageItem<Plan[]>(STORAGE_KEYS.PLANS, []);
    const index = plans.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Plan not found');
    plans[index] = { ...plans[index], ...data };
    setStorageItem(STORAGE_KEYS.PLANS, plans);
    return plans[index];
  },
  deletePlan: async (id) => {
    await delay();
    const plans = getStorageItem<Plan[]>(STORAGE_KEYS.PLANS, []);
    setStorageItem(STORAGE_KEYS.PLANS, plans.filter(p => p.id !== id));
  },

  getSubscriptions: async () => {
    await delay();
    const subs = getStorageItem<Subscription[]>(STORAGE_KEYS.SUBSCRIPTIONS, []);
    const today = new Date();
    const updatedSubs = subs.map(s => (s.status === 'ativa' && new Date(s.nextRenewal) < today) ? { ...s, status: 'vencida' as const } : s);
    setStorageItem(STORAGE_KEYS.SUBSCRIPTIONS, updatedSubs);
    return updatedSubs;
  },
  createSubscription: async (data) => {
    await delay();
    const subs = getStorageItem<Subscription[]>(STORAGE_KEYS.SUBSCRIPTIONS, []);
    const newSub: Subscription = { ...data, id: Math.random().toString(36).substr(2, 9) };
    setStorageItem(STORAGE_KEYS.SUBSCRIPTIONS, [...subs, newSub]);
    return newSub;
  },
  updateSubscription: async (id, data) => {
    await delay();
    const subs = getStorageItem<Subscription[]>(STORAGE_KEYS.SUBSCRIPTIONS, []);
    const index = subs.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Subscription not found');
    subs[index] = { ...subs[index], ...data };
    setStorageItem(STORAGE_KEYS.SUBSCRIPTIONS, subs);
    return subs[index];
  },
  deleteSubscription: async (id) => {
    await delay();
    const subs = getStorageItem<Subscription[]>(STORAGE_KEYS.SUBSCRIPTIONS, []);
    setStorageItem(STORAGE_KEYS.SUBSCRIPTIONS, subs.filter(s => s.id !== id));
  },

  getPayments: async () => { await delay(); return getStorageItem(STORAGE_KEYS.PAYMENTS, []); },
  createPayment: async (data) => {
    await delay();
    const payments = getStorageItem<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
    const newPayment: Payment = { ...data, id: Math.random().toString(36).substr(2, 9) };
    setStorageItem(STORAGE_KEYS.PAYMENTS, [...payments, newPayment]);

    const subs = getStorageItem<Subscription[]>(STORAGE_KEYS.SUBSCRIPTIONS, []);
    const subIndex = subs.findIndex(s => s.id === data.subscriptionId);
    if (subIndex !== -1) {
      const nextRenewal = new Date(subs[subIndex].nextRenewal);
      nextRenewal.setDate(nextRenewal.getDate() + 30);
      subs[subIndex] = { ...subs[subIndex], status: 'ativa', nextRenewal: nextRenewal.toISOString() };
      setStorageItem(STORAGE_KEYS.SUBSCRIPTIONS, subs);
    }
    return newPayment;
  },
  listPaymentsBySubscription: async (subscriptionId) => {
    await delay();
    const payments = getStorageItem<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
    return payments.filter(p => p.subscriptionId === subscriptionId);
  },

  getTagCategories: async () => { await delay(); return getStorageItem(STORAGE_KEYS.TAG_CATEGORIES, []); },
  createTagCategory: async (name, order) => {
    await delay();
    const categories = getStorageItem<TagCategory[]>(STORAGE_KEYS.TAG_CATEGORIES, []);
    const newCat: TagCategory = { id: Math.random().toString(36).substr(2, 9), name, order };
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
    const newTag: Tag = { id: Math.random().toString(36).substr(2, 9), name, categoryId };
    setStorageItem(STORAGE_KEYS.TAGS, [...tags, newTag]);
    return newTag;
  },
  deleteTag: async (id) => {
    await delay();
    const tags = getStorageItem<Tag[]>(STORAGE_KEYS.TAGS, []);
    setStorageItem(STORAGE_KEYS.TAGS, tags.filter(t => t.id !== id));
  },

  getPhotos: async () => { await delay(); return getStorageItem(STORAGE_KEYS.PHOTOS, []); },
  createPhoto: async (data) => {
    await delay();
    const photos = getStorageItem<Photo[]>(STORAGE_KEYS.PHOTOS, []);
    const newPhoto: Photo = { ...data, id: Math.random().toString(36).substr(2, 9), createdAt: new Date().toISOString() };
    setStorageItem(STORAGE_KEYS.PHOTOS, [...photos, newPhoto]);
    return newPhoto;
  },
  updatePhoto: async (id, data) => {
    await delay();
    const photos = getStorageItem<Photo[]>(STORAGE_KEYS.PHOTOS, []);
    const index = photos.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Photo not found');
    photos[index] = { ...photos[index], ...data };
    setStorageItem(STORAGE_KEYS.PHOTOS, photos);
    return photos[index];
  },
  deletePhoto: async (id) => {
    await delay();
    const photos = getStorageItem<Photo[]>(STORAGE_KEYS.PHOTOS, []);
    setStorageItem(STORAGE_KEYS.PHOTOS, photos.filter(p => p.id !== id));
  }
};
