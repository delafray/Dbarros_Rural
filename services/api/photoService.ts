import { supabase } from '../supabaseClient';
import type { TablesInsert, TablesUpdate } from '../../database.types';
import type { Photo } from '../../types';

export const photoService = {
    getPhotoIndex: async (userId: string, onlyMine?: boolean) => {
        let query = supabase
            .from('photos')
            .select(`
        id,
        name,
        user_id,
        created_at,
        video_url,
        url,
        thumbnail_url,
        users (
          name
        ),
        photo_tags (
          tag_id
        )
      `);

        if (onlyMine) {
            query = query.eq('user_id', userId);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await (query as any);
        if (error) throw new Error(`Failed to fetch index: ${error.message}`);

        return (data as any[]).map(row => ({
            id: row.id,
            name: row.name,
            userId: row.user_id,
            userName: Array.isArray(row.users) ? row.users[0]?.name : (row.users as any)?.name,
            tagIds: (row.photo_tags || []).map((pt: any) => pt.tag_id),
            videoUrl: row.video_url,
            url: row.url,
            thumbnailUrl: row.thumbnail_url,
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

        const photoMap = new Map<string, Photo>((data as any[]).map(row => [row.id, {
            id: row.id,
            userId: row.user_id || '',
            name: row.name,
            userName: row.users?.name,
            url: row.url,
            thumbnailUrl: row.thumbnail_url || undefined,
            localPath: row.local_path || undefined,
            videoUrl: row.video_url || undefined,
            tagIds: (row.photo_tags || []).map((pt: any) => pt.tag_id),
            createdAt: row.created_at
        }]));

        return ids.map(id => photoMap.get(id)).filter((p): p is Photo => !!p);
    },

    getPhotos: async (userId: string) => {
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
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(`Failed to fetch photos: ${error.message}`);

        return (data as any[]).map(row => ({
            id: row.id,
            userId: row.user_id || '',
            name: row.name,
            userName: row.users?.name,
            url: row.url,
            thumbnailUrl: row.thumbnail_url,
            localPath: row.local_path,
            videoUrl: row.video_url,
            tagIds: row.photo_tags.map((pt: any) => pt.tag_id),
            createdAt: row.created_at
        }));
    },

    uploadPhotoFile: async (userId: string, file: File) => {
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

    createPhoto: async (userId: string, data: Omit<Photo, 'id' | 'createdAt' | 'userId'>) => {
        const insertData: TablesInsert<'photos'> = {
            user_id: userId,
            name: data.name,
            url: data.url,
            thumbnail_url: data.thumbnailUrl || null,
            local_path: data.localPath || null,
            // @ts-ignore
            video_url: data.videoUrl || null
        };

        const { data: newPhoto, error: photoError } = await supabase
            .from('photos')
            .insert(insertData)
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
            userId: newPhoto.user_id || '',
            name: newPhoto.name,
            url: newPhoto.url,
            thumbnailUrl: newPhoto.thumbnail_url || undefined,
            localPath: newPhoto.local_path || undefined,
            videoUrl: (newPhoto as any).video_url || undefined,
            tagIds: data.tagIds,
            createdAt: newPhoto.created_at
        };
    },

    updatePhoto: async (id: string, data: Partial<Photo>) => {
        const updateData: TablesUpdate<'photos'> = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.url !== undefined) updateData.url = data.url;
        if (data.thumbnailUrl !== undefined) updateData.thumbnail_url = data.thumbnailUrl;
        if (data.localPath !== undefined) updateData.local_path = data.localPath;
        if (data.userId !== undefined) updateData.user_id = data.userId;
        // @ts-ignore
        if (data.videoUrl !== undefined) updateData.video_url = data.videoUrl;

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
            userId: photoWithTags.user_id || '',
            name: photoWithTags.name,
            url: photoWithTags.url,
            thumbnailUrl: photoWithTags.thumbnail_url || undefined,
            localPath: photoWithTags.local_path || undefined,
            videoUrl: (photoWithTags as any).video_url || undefined,
            tagIds: (photoWithTags.photo_tags as any[]).map((pt: any) => pt.tag_id),
            createdAt: photoWithTags.created_at
        };
    },

    deletePhoto: async (id: string) => {
        const { error } = await supabase
            .from('photos')
            .delete()
            .eq('id', id);

        if (error) throw new Error(`Failed to delete photo: ${error.message}`);
    }
};
