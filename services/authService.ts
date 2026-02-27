import { supabase } from './supabaseClient';
import { Database } from '../database.types';

// Using shared supabase client from ./supabaseClient

export interface User {
    id: string;
    name: string;
    email: string;
    isAdmin: boolean;
    isVisitor: boolean;
    isActive: boolean;
    createdAt: string;
    expiresAt?: string;
    isTemp: boolean;
    canManageTags: boolean;
    isProjetista: boolean;
}


export const authService = {
    // Check if biometric login is supported
    checkBiometricSupport: () => {
        return !!(window.PublicKeyCredential &&
            window.crypto &&
            window.crypto.subtle);
    },

    // Register new user via RPC
    register: async (name: string, email: string, password: string, isAdmin: boolean = false, isVisitor: boolean = false, canManageTags: boolean = false, isProjetista: boolean = false): Promise<User> => {
        // Use RPC to create user bypassing rate limits and confirmation emails
        const { data: userId, error: rpcError } = await (supabase as any).rpc('create_user_admin', {
            user_name: name,
            user_email: email,
            user_password: password,
            is_admin_flag: isAdmin,
            is_visitor_flag: isVisitor,
            can_manage_tags_flag: canManageTags,
            is_projetista_flag: isProjetista
        });

        if (rpcError) throw new Error(`Falha ao registrar usuário: ${rpcError.message}`);

        // Fetch the created user profile
        const { data, error: fetchError } = await (supabase as any)
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (fetchError || !data) {
            throw new Error(`Usuário criado, mas erro ao buscar perfil: ${fetchError?.message}`);
        }

        return {
            id: data.id,
            name: data.name,
            email: data.email,
            isAdmin: data.is_admin ?? false,
            isVisitor: data.is_visitor ?? false,
            isActive: data.is_active ?? true,
            createdAt: data.created_at ?? '',
            expiresAt: data.expires_at ?? undefined,
            isTemp: data.is_temp ?? false,
            canManageTags: data.can_manage_tags ?? false,
            isProjetista: data.is_projetista ?? false
        };
    },

    // Login (Existing logic) - using identifier (email or name)
    login: async (identifier: string, password: string): Promise<User> => {
        // 1. Resolve identifier to email
        const { data: profile, error: profileError } = await (supabase as any)
            .from('users')
            .select('*')
            .or(`email.ilike.${identifier},name.ilike.${identifier}`)
            .limit(1)
            .maybeSingle();

        if (profileError) throw new Error(`Erro ao buscar perfil: ${profileError.message}`);
        if (!profile) throw new Error('Usuário não encontrado.');

        // 2. Security Checks
        if (profile.is_active === false) throw new Error('Sua conta está desativada.');

        if (profile.expires_at) {
            const expirationDate = new Date(profile.expires_at);
            if (expirationDate < new Date()) throw new Error('Sua conta temporária expirou.');
        }

        // 3. Authenticate with resolved email
        const { error: authError } = await supabase.auth.signInWithPassword({
            email: profile.email,
            password
        });

        if (authError) throw new Error(`Falha na autenticação: ${authError.message}`);

        return {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            isAdmin: profile.is_admin ?? false,
            isVisitor: profile.is_visitor ?? false,
            isActive: profile.is_active ?? true,
            createdAt: profile.created_at ?? '',
            expiresAt: profile.expires_at ?? undefined,
            isTemp: profile.is_temp ?? false,
            canManageTags: profile.can_manage_tags ?? false,
            isProjetista: profile.is_projetista ?? false
        };
    },

    logout: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    getCurrentUser: async (): Promise<User | null> => {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) return null;

        const { data, error } = await (supabase as any)
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error || !data) return null;

        if (data.is_active === false || (data.expires_at && new Date(data.expires_at) < new Date())) {
            await supabase.auth.signOut();
            return null;
        }

        return {
            id: data.id,
            name: data.name,
            email: data.email,
            isAdmin: data.is_admin ?? false,
            isVisitor: data.is_visitor ?? false,
            isActive: data.is_active ?? true,
            createdAt: data.created_at ?? '',
            expiresAt: data.expires_at ?? undefined,
            isTemp: data.is_temp ?? false,
            canManageTags: data.can_manage_tags ?? false,
            isProjetista: data.is_projetista ?? false
        };
    },

    getAllUsers: async (): Promise<User[]> => {
        const { data, error } = await (supabase as any)
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((user: any) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            isAdmin: user.is_admin ?? false,
            isVisitor: user.is_visitor ?? false,
            isActive: user.is_active ?? true,
            createdAt: user.created_at ?? '',
            expiresAt: user.expires_at ?? undefined,
            isTemp: user.is_temp ?? false,
            canManageTags: user.can_manage_tags ?? false,
            isProjetista: user.is_projetista ?? false
        }));
    },

    updateUser: async (id: string, updates: Partial<User>): Promise<void> => {
        const { user } = (await supabase.auth.getUser()).data;
        const isAdmin = user?.id !== id;

        // Map frontend fields to database fields
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.email !== undefined) dbUpdates.email = updates.email;
        if (updates.isAdmin !== undefined) dbUpdates.is_admin = updates.isAdmin;
        if (updates.isVisitor !== undefined) dbUpdates.is_visitor = updates.isVisitor;
        if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
        if (updates.canManageTags !== undefined) dbUpdates.can_manage_tags = updates.canManageTags;
        if (updates.isProjetista !== undefined) dbUpdates.is_projetista = updates.isProjetista;

        const { error } = await (supabase as any)
            .from('users')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;
    }
};
