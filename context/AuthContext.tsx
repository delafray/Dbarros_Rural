import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User } from '../services/authService';
import { supabase } from '../services/supabaseClient';

interface AuthContextType {
    user: User | null;
    login: (identifier: string, password: string) => Promise<void>;
    logout: () => void;
    register: (name: string, email: string, password: string, isAdmin: boolean) => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const syncUser = async (isInitial = false) => {
            if (isInitial) setIsLoading(true);
            try {
                const currentUser = await authService.getCurrentUser();
                if (mounted) {
                    setUser(currentUser);
                }
            } catch (err: any) {
                console.error("Auth sync error:", err);
                if (mounted) {
                    setUser(null);
                }
            } finally {
                if (mounted && isInitial) setIsLoading(false);
            }
        };

        syncUser(true);

        // Listen for Supabase auth state changes natively
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                if (mounted) setUser(null);
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                syncUser(false); // Background sync, no global loading
            }
        });

        // Realtime subscription for user updates (kick if inactive or expired)
        let channel: any = null;
        if (user?.id) {
            channel = supabase.channel(`public:users:${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'users',
                        filter: `id=eq.${user.id}`
                    },
                    (payload) => {
                        const newUser = payload.new as any;
                        if (newUser.is_active === false) {
                            handleForceLogout('Seu acesso foi desativado pelo administrador.');
                            return;
                        }
                        if (newUser.expires_at) {
                            const expirationDate = new Date(newUser.expires_at);
                            if (expirationDate < new Date()) {
                                handleForceLogout('Sua conta temporária expirou.');
                                return;
                            }
                        }
                    }
                )
                .subscribe();
        }

        // Periodic check for local expiration (every 1 minute)
        const interval = setInterval(async () => {
            if (!user?.expiresAt) return;

            const expirationDate = new Date(user.expiresAt);
            if (expirationDate < new Date()) {
                handleForceLogout('Sua conta temporária expirou.');
            }
        }, 60000); // 1 minute

        return () => {
            mounted = false;
            authListener.subscription.unsubscribe();
            if (channel) supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [user?.id]); // Re-subscribe only when user ID changes

    const handleForceLogout = async (message: string) => {
        await authService.logout();
        setUser(null);
        alert(message);
        window.location.href = '#/login';
    };

    const login = async (identifier: string, password: string) => {
        await authService.login(identifier, password);
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
    };

    const logout = async () => {
        await authService.logout();
        setUser(null);
    };

    const register = async (name: string, email: string, password: string, isAdmin: boolean) => {
        await authService.register(name, email, password, isAdmin);
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
