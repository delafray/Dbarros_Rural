import { createClient } from '@supabase/supabase-js';
import type {
  SubControlService,
  Customer,
  Plan,
  Subscription,
  Payment,
  TagCategory,
  Tag,
  Photo
} from '../types';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to get current user ID
function getCurrentUserId(): string {
  const userJson = localStorage.getItem('subcontrol_user');
  if (!userJson) throw new Error('User not authenticated');
  const user = JSON.parse(userJson);
  return user.id;
}

// Helper function to check if user is admin
function isAdmin(): boolean {
  const userJson = localStorage.getItem('subcontrol_user');
  if (!userJson) return false;
  const user = JSON.parse(userJson);
  return user.isAdmin === true;
}

// Helper function to check if user is visitor
function isVisitor(): boolean {
  const userJson = localStorage.getItem('subcontrol_user');
  if (!userJson) return false;
  const user = JSON.parse(userJson);
  return user.isVisitor === true;
}

export const supabaseService: SubControlService = {
  // ==================== CUSTOMERS ====================
  getCustomers: async () => {
    const userId = getCurrentUserId();
    const admin = isAdmin();

    let query = supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    // If not admin, filter by user_id
    if (!admin) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to fetch customers: ${error.message}`);

    return data.map(row => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      email: row.email,
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at
    }));
  },

  createCustomer: async (data) => {
    const userId = getCurrentUserId();

    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert({
        user_id: userId,
        name: data.name,
        email: data.email,
        status: data.status,
        notes: data.notes
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create customer: ${error.message}`);

    return {
      id: newCustomer.id,
      userId: newCustomer.user_id,
      name: newCustomer.name,
      email: newCustomer.email,
      status: newCustomer.status,
      notes: newCustomer.notes,
      createdAt: newCustomer.created_at
    };
  },

  updateCustomer: async (id, data) => {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const { data: updatedCustomer, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update customer: ${error.message}`);

    return {
      id: updatedCustomer.id,
      userId: updatedCustomer.user_id,
      name: updatedCustomer.name,
      email: updatedCustomer.email,
      status: updatedCustomer.status,
      notes: updatedCustomer.notes,
      createdAt: updatedCustomer.created_at
    };
  },

  deleteCustomer: async (id) => {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete customer: ${error.message}`);
  },

  // ==================== PLANS ====================
  getPlans: async () => {
    const userId = getCurrentUserId();
    const admin = isAdmin();

    let query = supabase
      .from('plans')
      .select('*')
      .order('name');

    if (!admin) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to fetch plans: ${error.message}`);

    return data.map(row => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      price: parseFloat(row.price),
      active: row.active
    }));
  },

  createPlan: async (data) => {
    const userId = getCurrentUserId();

    const { data: newPlan, error } = await supabase
      .from('plans')
      .insert({
        user_id: userId,
        name: data.name,
        price: data.price,
        active: data.active
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create plan: ${error.message}`);

    return {
      id: newPlan.id,
      userId: newPlan.user_id,
      name: newPlan.name,
      price: parseFloat(newPlan.price),
      active: newPlan.active
    };
  },

  updatePlan: async (id, data) => {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.active !== undefined) updateData.active = data.active;

    const { data: updatedPlan, error } = await supabase
      .from('plans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update plan: ${error.message}`);

    return {
      id: updatedPlan.id,
      userId: updatedPlan.user_id,
      name: updatedPlan.name,
      price: parseFloat(updatedPlan.price),
      active: updatedPlan.active
    };
  },

  deletePlan: async (id) => {
    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete plan: ${error.message}`);
  },

  // ==================== SUBSCRIPTIONS ====================
  getSubscriptions: async () => {
    const userId = getCurrentUserId();
    const admin = isAdmin();

    let query = supabase
      .from('subscriptions')
      .select('*')
      .order('start_date', { ascending: false });

    if (!admin) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to fetch subscriptions: ${error.message}`);

    return data.map(row => ({
      id: row.id,
      userId: row.user_id,
      customerId: row.customer_id,
      planId: row.plan_id,
      startDate: row.start_date,
      nextRenewal: row.next_renewal,
      status: row.status
    }));
  },

  createSubscription: async (data) => {
    const userId = getCurrentUserId();

    const { data: newSubscription, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        customer_id: data.customerId,
        plan_id: data.planId,
        start_date: data.startDate,
        next_renewal: data.nextRenewal,
        status: data.status
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create subscription: ${error.message}`);

    return {
      id: newSubscription.id,
      userId: newSubscription.user_id,
      customerId: newSubscription.customer_id,
      planId: newSubscription.plan_id,
      startDate: newSubscription.start_date,
      nextRenewal: newSubscription.next_renewal,
      status: newSubscription.status
    };
  },

  updateSubscription: async (id, data) => {
    const updateData: any = {};
    if (data.customerId !== undefined) updateData.customer_id = data.customerId;
    if (data.planId !== undefined) updateData.plan_id = data.planId;
    if (data.startDate !== undefined) updateData.start_date = data.startDate;
    if (data.nextRenewal !== undefined) updateData.next_renewal = data.nextRenewal;
    if (data.status !== undefined) updateData.status = data.status;

    const { data: updatedSubscription, error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update subscription: ${error.message}`);

    return {
      id: updatedSubscription.id,
      userId: updatedSubscription.user_id,
      customerId: updatedSubscription.customer_id,
      planId: updatedSubscription.plan_id,
      startDate: updatedSubscription.start_date,
      nextRenewal: updatedSubscription.next_renewal,
      status: updatedSubscription.status
    };
  },

  deleteSubscription: async (id) => {
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete subscription: ${error.message}`);
  },

  // ==================== PAYMENTS ====================
  getPayments: async () => {
    const userId = getCurrentUserId();
    const admin = isAdmin();

    let query = supabase
      .from('payments')
      .select('*')
      .order('paid_at', { ascending: false });

    if (!admin) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to fetch payments: ${error.message}`);

    return data.map(row => ({
      id: row.id,
      userId: row.user_id,
      subscriptionId: row.subscription_id,
      amount: parseFloat(row.amount),
      paidAt: row.paid_at
    }));
  },

  createPayment: async (data) => {
    const userId = getCurrentUserId();

    const { data: newPayment, error } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        subscription_id: data.subscriptionId,
        amount: data.amount,
        paid_at: data.paidAt
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create payment: ${error.message}`);

    return {
      id: newPayment.id,
      userId: newPayment.user_id,
      subscriptionId: newPayment.subscription_id,
      amount: parseFloat(newPayment.amount),
      paidAt: newPayment.paid_at
    };
  },

  listPaymentsBySubscription: async (subscriptionId) => {
    const userId = getCurrentUserId();
    const admin = isAdmin();

    let query = supabase
      .from('payments')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('paid_at', { ascending: false });

    if (!admin) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to fetch payments: ${error.message}`);

    return data.map(row => ({
      id: row.id,
      userId: row.user_id,
      subscriptionId: row.subscription_id,
      amount: parseFloat(row.amount),
      paidAt: row.paid_at
    }));
  },

  // ==================== TAG CATEGORIES ====================
  getTagCategories: async () => {
    const userId = getCurrentUserId();
    const admin = isAdmin();

    let query = supabase
      .from('tag_categories')
      .select('*')
      .order('created_at', { ascending: true });

    if (!admin && !isVisitor()) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to fetch tag categories: ${error.message}`);

    return data.map(row => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      order: row.order,
      createdAt: row.created_at
    }));
  },

  createTagCategory: async (name, order) => {
    const userId = getCurrentUserId();

    const { data: newCategory, error } = await supabase
      .from('tag_categories')
      .insert({
        user_id: userId,
        name: name,
        order: order
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create tag category: ${error.message}`);

    return {
      id: newCategory.id,
      userId: newCategory.user_id,
      name: newCategory.name,
      order: newCategory.order,
      createdAt: newCategory.created_at
    };
  },

  updateTagCategory: async (id, data) => {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.order !== undefined) updateData.order = data.order;

    const { data: updatedCategory, error } = await supabase
      .from('tag_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update tag category: ${error.message}`);

    return {
      id: updatedCategory.id,
      userId: updatedCategory.user_id,
      name: updatedCategory.name,
      order: updatedCategory.order,
      createdAt: updatedCategory.created_at
    };
  },

  deleteTagCategory: async (id) => {
    const { error } = await supabase
      .from('tag_categories')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete tag category: ${error.message}`);
  },

  // ==================== TAGS ====================
  getTags: async () => {
    const userId = getCurrentUserId();
    const admin = isAdmin();

    let query = supabase
      .from('tags')
      .select('*')
      .order('created_at', { ascending: true });

    if (!admin && !isVisitor()) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to fetch tags: ${error.message}`);

    return data.map(row => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      categoryId: row.category_id,
      createdAt: row.created_at
    }));
  },

  createTag: async (name, categoryId) => {
    const userId = getCurrentUserId();

    const { data: newTag, error } = await supabase
      .from('tags')
      .insert({
        user_id: userId,
        name: name,
        category_id: categoryId
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create tag: ${error.message}`);

    return {
      id: newTag.id,
      userId: newTag.user_id,
      name: newTag.name,
      categoryId: newTag.category_id,
      createdAt: newTag.created_at
    };
  },

  deleteTag: async (id) => {
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete tag: ${error.message}`);
  },

  // ==================== PHOTOS ====================
  getPhotoIndex: async (onlyMine?: boolean) => {
    const userId = getCurrentUserId();
    const admin = isAdmin();

    let query = supabase
      .from('photos')
      .select(`
        id,
        name,
        photo_tags (
          tag_id
        )
      `);

    if ((!admin && !isVisitor()) || onlyMine) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch index: ${error.message}`);

    return data.map(row => ({
      id: row.id,
      name: row.name,
      tagIds: (row.photo_tags || []).map((pt: any) => pt.tag_id)
    }));
  },

  getPhotosByIds: async (ids: string[]) => {
    if (ids.length === 0) return [];

    const { data, error } = await supabase
      .from('photos')
      .select(`
        *,
        users (
          name
        ),
        photo_tags (
          tag_id
        )
      `)
      .in('id', ids);

    if (error) throw new Error(`Failed to fetch photos by IDs: ${error.message}`);

    // Map manually to maintain order of IDs if possible, or just return set
    const photoMap = new Map<string, Photo>(data.map(row => [row.id, {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      userName: row.users?.name,
      url: row.url,
      thumbnailUrl: row.thumbnail_url || undefined,
      localPath: row.local_path || undefined,
      tagIds: (row.photo_tags || []).map((pt: any) => pt.tag_id),
      createdAt: row.created_at
    }]));

    return ids.map(id => photoMap.get(id)).filter((p): p is Photo => !!p);
  },

  getPhotos: async () => {
    const userId = getCurrentUserId();
    const admin = isAdmin();

    let query = supabase
      .from('photos')
      .select(`
        *,
        users (
          name
        ),
        photo_tags (
          tag_id
        )
      `)
      .order('created_at', { ascending: false });

    if (!admin) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to fetch photos: ${error.message}`);

    return data.map(row => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      userName: row.users?.name,
      url: row.url,
      thumbnailUrl: row.thumbnail_url,
      localPath: row.local_path,
      tagIds: row.photo_tags.map((pt: any) => pt.tag_id),
      createdAt: row.created_at
    }));
  },

  uploadPhotoFile: async (file: File) => {
    const userId = getCurrentUserId();
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Failed to upload photo: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(filePath);

    return publicUrl;
  },

  createPhoto: async (data) => {
    const userId = getCurrentUserId();

    // First, create the photo
    const { data: newPhoto, error: photoError } = await supabase
      .from('photos')
      .insert({
        user_id: userId,
        name: data.name,
        url: data.url,
        thumbnail_url: data.thumbnailUrl,
        local_path: data.localPath
      })
      .select()
      .single();

    if (photoError) throw new Error(`Failed to create photo: ${photoError.message}`);

    // Then, create the photo_tags relationships
    if (data.tagIds && data.tagIds.length > 0) {
      const photoTagsData = data.tagIds.map(tagId => ({
        photo_id: newPhoto.id,
        tag_id: tagId
      }));

      const { error: tagsError } = await supabase
        .from('photo_tags')
        .insert(photoTagsData);

      if (tagsError) throw new Error(`Failed to create photo tags: ${tagsError.message}`);
    }

    return {
      id: newPhoto.id,
      userId: newPhoto.user_id,
      name: newPhoto.name,
      url: newPhoto.url,
      thumbnailUrl: newPhoto.thumbnail_url,
      localPath: newPhoto.local_path,
      tagIds: data.tagIds,
      createdAt: newPhoto.created_at
    };
  },

  updatePhoto: async (id, data) => {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.url !== undefined) updateData.url = data.url;
    if (data.thumbnailUrl !== undefined) updateData.thumbnail_url = data.thumbnailUrl;
    if (data.localPath !== undefined) updateData.local_path = data.localPath;

    const { data: updatedPhoto, error: photoError } = await supabase
      .from('photos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (photoError) throw new Error(`Failed to update photo: ${photoError.message}`);

    // If tagIds are provided, update the photo_tags relationships
    if (data.tagIds !== undefined) {
      // Delete existing tags
      await supabase
        .from('photo_tags')
        .delete()
        .eq('photo_id', id);

      // Insert new tags
      if (data.tagIds.length > 0) {
        const photoTagsData = data.tagIds.map(tagId => ({
          photo_id: id,
          tag_id: tagId
        }));

        const { error: tagsError } = await supabase
          .from('photo_tags')
          .insert(photoTagsData);

        if (tagsError) throw new Error(`Failed to update photo tags: ${tagsError.message}`);
      }
    }

    // Fetch the updated photo with tags
    const { data: photoWithTags, error: fetchError } = await supabase
      .from('photos')
      .select(`
        *,
        photo_tags (
          tag_id
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError) throw new Error(`Failed to fetch updated photo: ${fetchError.message}`);

    return {
      id: photoWithTags.id,
      userId: photoWithTags.user_id,
      name: photoWithTags.name,
      url: photoWithTags.url,
      thumbnailUrl: photoWithTags.thumbnail_url,
      localPath: photoWithTags.local_path,
      tagIds: photoWithTags.photo_tags.map((pt: any) => pt.tag_id),
      createdAt: photoWithTags.created_at
    };
  },

  deletePhoto: async (id) => {
    // photo_tags will be deleted automatically via CASCADE
    const { error } = await supabase
      .from('photos')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete photo: ${error.message}`);
  },
};