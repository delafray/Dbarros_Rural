import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SESSION_DURATION = 12 * 60 * 60 * 1000; // 12 horas em milissegundos
const LOGIN_TIME_KEY = 'gallery_login_time';


export interface User {
    id: string;
    name: string;
    email: string;
    isAdmin: boolean;
    isVisitor: boolean;
    isActive: boolean;
    createdAt: string;
    expiresAt?: string;
    isTemp?: boolean;
}

// Hash password using bcrypt
async function hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
}

// Compare password with hash
async function comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
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
            createdAt: data.created_at,
            expiresAt: data.expires_at,
            isTemp: data.is_temp
        };
    },

    // Login user
    login: async (identifier: string, password: string): Promise<User> => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .or(`email.eq.${identifier},name.ilike.${identifier}`)
            .limit(1)
            .maybeSingle();

        if (error || !data) {
            throw new Error('E-mail, usuário ou senha inválidos');
        }

        if (data.is_active === false) {
            throw new Error('Conta inativa. Contate o administrador.');
        }

        if (data.expires_at) {
            const expirationDate = new Date(data.expires_at);
            if (expirationDate < new Date()) {
                throw new Error('Conta temporária expirada.');
            }
        }

        // Verificar senha com bcrypt
        const isValidPassword = await comparePassword(password, data.password_hash);

        if (!isValidPassword) {
            throw new Error('E-mail, usuário ou senha inválidos');
        }

        const user: User = {
            id: data.id,
            name: data.name,
            email: data.email,
            isAdmin: data.is_admin,
            isVisitor: data.is_visitor,
            isActive: data.is_active,
            createdAt: data.created_at,
            expiresAt: data.expires_at,
            isTemp: data.is_temp
        };

        // Store user and login time in localStorage
        localStorage.setItem('gallery_user', JSON.stringify(user));
        localStorage.setItem(LOGIN_TIME_KEY, Date.now().toString());


        return user;
    },

    // Create temporary user
    createTempUser: async (days: number): Promise<{ user: User, passwordRaw: string }> => {
        const tempName = `temp_${Math.random().toString(36).substring(7)}`;
        const tempEmail = `${tempName}@temp.local`;
        const tempPassword = Math.random().toString(36).substring(2, 10);
        const passwordHash = await hashPassword(tempPassword);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);

        const { data, error } = await supabase
            .from('users')
            .insert({
                name: tempName,
                email: tempEmail,
                password_hash: passwordHash,
                is_admin: false,
                is_visitor: true,
                is_active: true,
                is_temp: true,
                expires_at: expiresAt.toISOString()
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to create temp user: ${error.message}`);

        return {
            user: {
                id: data.id,
                name: data.name,
                email: data.email,
                isAdmin: data.is_admin,
                isVisitor: data.is_visitor,
                isActive: data.is_active,
                createdAt: data.created_at,
                expiresAt: data.expires_at,
                isTemp: data.is_temp
            },
            passwordRaw: tempPassword
        };
    },

    // Logout user
    logout: (): void => {
        localStorage.removeItem('gallery_user');
        localStorage.removeItem(LOGIN_TIME_KEY);
    },


    // Get current logged in user
    getCurrentUser: (): User | null => {
        const userJson = localStorage.getItem('gallery_user');
        const loginTime = localStorage.getItem(LOGIN_TIME_KEY);

        if (!userJson || !loginTime) return null;

        // Check for session expiration
        const currentTime = Date.now();
        const sessionAge = currentTime - parseInt(loginTime, 10);

        if (sessionAge > SESSION_DURATION) {
            authService.logout();
            return null;
        }

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
            createdAt: row.created_at,
            expiresAt: row.expires_at,
            isTemp: row.is_temp
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

    // Terminate temporary user immediately
    terminateTempUser: async (userId: string): Promise<void> => {
        const { error } = await supabase
            .from('users')
            .update({
                is_active: false,
                expires_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) throw new Error(`Failed to terminate user: ${error.message}`);
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
