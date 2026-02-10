import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface User {
    id: string;
    name: string;
    email: string;
    isAdmin: boolean;
    isVisitor: boolean;
    isActive: boolean;
    createdAt: string;
}

// Hash password using SHA-256
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const authService = {
    // Register new user
    register: async (name: string, email: string, password: string, isAdmin: boolean = false, isVisitor: boolean = false): Promise<User> => {
        const passwordHash = await hashPassword(password);

        const { data, error } = await supabase
            .from('users')
            .insert({
                name,
                email,
                password_hash: passwordHash,
                is_admin: isAdmin,
                is_visitor: isVisitor,
                is_active: true
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to register user: ${error.message}`);

        return {
            id: data.id,
            name: data.name,
            email: data.email,
            isAdmin: data.is_admin,
            isVisitor: data.is_visitor,
            isActive: data.is_active,
            createdAt: data.created_at
        };
    },

    // Login user
    login: async (identifier: string, password: string): Promise<User> => {
        const passwordHash = await hashPassword(password);

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .or(`email.eq.${identifier},name.ilike.${identifier}`)
            .eq('password_hash', passwordHash)
            .single();

        if (error || !data) {
            throw new Error('E-mail, usuário ou senha inválidos');
        }

        if (data.is_active === false) {
            throw new Error('Conta inativa. Contate o administrador.');
        }

        const user: User = {
            id: data.id,
            name: data.name,
            email: data.email,
            isAdmin: data.is_admin,
            isVisitor: data.is_visitor,
            isActive: data.is_active,
            createdAt: data.created_at
        };

        // Store user in localStorage
        localStorage.setItem('subcontrol_user', JSON.stringify(user));

        return user;
    },

    // Logout user
    logout: (): void => {
        localStorage.removeItem('subcontrol_user');
        localStorage.removeItem('subcontrol_auth');
    },

    // Get current logged in user
    getCurrentUser: (): User | null => {
        const userJson = localStorage.getItem('subcontrol_user');
        if (!userJson) return null;

        try {
            return JSON.parse(userJson) as User;
        } catch {
            return null;
        }
    },

    // Get all users (admin only)
    getAllUsers: async (): Promise<User[]> => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw new Error(`Failed to fetch users: ${error.message}`);

        return data.map(row => ({
            id: row.id,
            name: row.name,
            email: row.email,
            isAdmin: row.is_admin,
            isVisitor: row.is_visitor,
            isActive: row.is_active,
            createdAt: row.created_at
        }));
    },

    // Update user
    updateUser: async (userId: string, updates: Partial<{ name: string; email: string; isAdmin: boolean; isVisitor: boolean; isActive: boolean; password?: string }>): Promise<void> => {
        const updateData: any = {};
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.email !== undefined) updateData.email = updates.email;
        if (updates.isAdmin !== undefined) updateData.is_admin = updates.isAdmin;
        if (updates.isVisitor !== undefined) updateData.is_visitor = updates.isVisitor;
        if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

        if (updates.password) {
            updateData.password_hash = await hashPassword(updates.password);
        }

        const { error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId);

        if (error) throw new Error(`Failed to update user: ${error.message}`);
    },

    // Update user admin status
    updateUserAdmin: async (userId: string, isAdmin: boolean): Promise<void> => {
        const { error } = await supabase
            .from('users')
            .update({ is_admin: isAdmin })
            .eq('id', userId);

        if (error) throw new Error(`Failed to update user: ${error.message}`);
    },

    // Delete user
    deleteUser: async (userId: string): Promise<void> => {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

        if (error) throw new Error(`Failed to delete user: ${error.message}`);
    }
};
