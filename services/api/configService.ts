import { supabase } from '../supabaseClient';

export const configService = {
    getSystemConfig: async (key: string) => {
        try {
            const { data: cat } = await supabase
                .from('tag_categories')
                .select('id')
                .eq('name', '__SYSCONFIG__')
                .limit(1)
                .maybeSingle();

            if (!cat) return null;

            const { data: tag } = await supabase
                .from('tags')
                .select('order')
                .eq('category_id', cat.id)
                .eq('name', key)
                .limit(1)
                .maybeSingle();

            return tag ? String((tag as any).order) : null;
        } catch (err) {
            console.error('Error fetching system config:', err);
            return null;
        }
    },

    updateSystemConfig: async (userId: string, key: string, value: string) => {
        try {
            const valNumber = parseInt(value);
            if (isNaN(valNumber)) throw new Error('Value must be a number');

            let { data: cat } = await supabase
                .from('tag_categories')
                .select('id')
                .eq('name', '__SYSCONFIG__')
                .limit(1)
                .maybeSingle();

            if (!cat) {
                const { data: newCat, error: catErr } = await supabase
                    .from('tag_categories')
                    .insert({
                        name: '__SYSCONFIG__',
                        order: 999,
                        user_id: userId
                    })
                    .select()
                    .single();
                if (catErr) throw catErr;
                cat = newCat;
            }

            const { data: tag } = await supabase
                .from('tags')
                .select('id')
                .eq('category_id', cat.id)
                .eq('name', key)
                .limit(1)
                .maybeSingle();

            if (tag) {
                await supabase
                    .from('tags')
                    .update({ order: valNumber } as any)
                    .eq('id', tag.id);
            } else {
                await supabase
                    .from('tags')
                    .insert({
                        name: key,
                        category_id: cat.id,
                        order: valNumber,
                        user_id: userId
                    } as any);
            }
        } catch (err) {
            console.error('Error updating system config:', err);
            throw err;
        }
    }
};
