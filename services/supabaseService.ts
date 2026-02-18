import { createClient } from '@supabase/supabase-js';
import type {
  GalleryService,
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
  const userJson = localStorage.getItem('gallery_user');
  if (!userJson) throw new Error('User not authenticated');
  const user = JSON.parse(userJson);
  return user.id;
}

// Helper function to check if user is admin
function isAdmin(): boolean {
  const userJson = localStorage.getItem('gallery_user');
  if (!userJson) return false;
  const user = JSON.parse(userJson);
  return user.isAdmin === true;
}

// Helper function to check if user is visitor
function isVisitor(): boolean {
  const userJson = localStorage.getItem('gallery_user');
  if (!userJson) return false;
  const user = JSON.parse(userJson);
  return user.isVisitor === true;
}

// Helper function to apply user-based filter for non-admin/non-visitor users
function applyUserFilter<T>(query: T, userId: string): T {
  if (!isAdmin() && !isVisitor()) {
    return (query as any).eq('user_id', userId);
  }
  return query;
}

export const supabaseService: GalleryService = {
  // ==================== TAG CATEGORIES ====================
  getTagCategories: async () => {
    const userId = getCurrentUserId();

    let query = supabase
      .from('tag_categories')
      .select('*')
      .order('created_at', { ascending: true });

    query = applyUserFilter(query, userId);

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

    let query = supabase
      .from('tags')
      .select('*')
      .order('order', { ascending: true })
      .order('created_at', { ascending: true });

    query = applyUserFilter(query, userId);

    const { data, error } = await query;

    if (error) throw new Error(`Failed to fetch tags: ${error.message}`);

    return data.map(row => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      categoryId: row.category_id,
      order: row.order || 0,
      createdAt: row.created_at
    }));
  },

  createTag: async (name, categoryId, order) => {
    const userId = getCurrentUserId();

    const { data: newTag, error } = await supabase
      .from('tags')
      .insert({
        user_id: userId,
        name: name,
        category_id: categoryId,
        order: order || 0
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create tag: ${error.message}`);

    return {
      id: newTag.id,
      userId: newTag.user_id,
      name: newTag.name,
      categoryId: newTag.category_id,
      order: newTag.order || 0,
      createdAt: newTag.created_at
    };
  },

  updateTag: async (id, data) => {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.order !== undefined) updateData.order = data.order;
    if (data.categoryId !== undefined) updateData.category_id = data.categoryId;

    const { data: updatedTag, error } = await supabase
      .from('tags')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update tag: ${error.message}`);

    return {
      id: updatedTag.id,
      userId: updatedTag.user_id,
      name: updatedTag.name,
      categoryId: updatedTag.category_id,
      order: updatedTag.order || 0,
      createdAt: updatedTag.created_at
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
        user_id,
        created_at,
        users (
          name
        ),
        photo_tags (
          tag_id
        )
      `);

    if ((!admin && !isVisitor()) || onlyMine) {
      query = query.eq('user_id', userId);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch index: ${error.message}`);

    return data.map(row => ({
      id: row.id,
      name: row.name,
      userId: row.user_id,
      userName: Array.isArray(row.users) ? row.users[0]?.name : (row.users as any)?.name,
      tagIds: (row.photo_tags || []).map((pt: any) => pt.tag_id),
      createdAt: row.created_at
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
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const fileName = `${userId}/${Date.now()}_${randomSuffix}.${fileExt}`;
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
    const currentUserId = getCurrentUserId();
    // Use provided userId if available (and valid?), otherwise default to current user
    const targetUserId = data.userId || currentUserId;

    const { data: newPhoto, error: photoError } = await supabase
      .from('photos')
      .insert({
        user_id: targetUserId,
        name: data.name,
        url: data.url,
        thumbnail_url: data.thumbnailUrl,
        local_path: data.localPath
      })
      .select()
      .single();

    if (photoError) throw new Error(`Failed to create photo: ${photoError.message}`);

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
    if (data.userId !== undefined) updateData.user_id = data.userId;

    const { data: updatedPhoto, error: photoError } = await supabase
      .from('photos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (photoError) throw new Error(`Failed to update photo: ${photoError.message}`);

    if (data.tagIds !== undefined) {
      await supabase
        .from('photo_tags')
        .delete()
        .eq('photo_id', id);

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
    const { error } = await supabase
      .from('photos')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete photo: ${error.message}`);
  },

  // ==================== USERS ====================
  getUsersWithPhotos: async () => {
    const { data, error } = await supabase
      .from('photos')
      .select('user_id, users(name)')
      .not('user_id', 'is', null);

    if (error) throw new Error(`Failed to fetch users with photos: ${error.message}`);

    // De-duplicate users
    const userMap = new Map<string, string>();
    data.forEach((row: any) => {
      if (row.user_id && row.users?.name) {
        userMap.set(row.user_id, row.users.name);
      } else if (row.user_id) {
        // Fallback case
        userMap.set(row.user_id, 'Usuário Desconhecido');
      }
    });

    return Array.from(userMap.entries()).map(([id, name]) => ({ id, name }));
  },

  getUsers: async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name')
      // Exclude visitors and temporary users from the author selection list
      .neq('is_visitor', true)
      .neq('is_temp', true)
      .order('name');

    if (error) throw new Error(`Failed to fetch users: ${error.message}`);

    return data.map(u => ({ id: u.id, name: u.name }));
  },
};