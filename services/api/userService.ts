import { supabase } from '../supabaseClient';

export const userService = {
    getUsersWithPhotos: async () => {
        const { data, error } = await supabase
            .from('photos')
            .select('user_id, users(name)')
            .not('user_id', 'is', null);

        if (error) throw new Error(`Failed to fetch users with photos: ${error.message}`);

        const userMap = new Map<string, string>();
        (data as any[]).forEach((row: any) => {
            if (row.user_id && row.users?.name) {
                userMap.set(row.user_id, row.users.name);
            } else if (row.user_id) {
                userMap.set(row.user_id, 'Usuário Desconhecido');
            }
        });

        return Array.from(userMap.entries()).map(([id, name]) => ({ id, name }));
    },

    getUsers: async () => {
        const { data, error } = await supabase
            .from('users')
            .select('id, name')
            .neq('is_visitor', true)
            .neq('is_temp', true)
            .order('name');
        if (error) throw new Error(`Failed to fetch users: ${error.message}`);

        return data.map(u => ({ id: u.id, name: u.name }));
    }
};
