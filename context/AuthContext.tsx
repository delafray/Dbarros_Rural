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
        // Check if user is already logged in
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);
        setIsLoading(false);

        // Realtime subscription for user updates (kick if inactive or expired)
        const channel = supabase.channel('public:users')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'users',
                    filter: currentUser ? `id=eq.${currentUser.id}` : undefined
                },
                (payload) => {
                    const newUser = payload.new as any;

                    // Check if deactivated
                    if (newUser.is_active === false) {
                        handleForceLogout('Seu acesso foi desativado pelo administrador.');
                        return;
                    }

                    // Check if expired (if date changed)
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

        // Periodic check for local expiration (every 1 minute)
        const interval = setInterval(() => {
            const user = authService.getCurrentUser();
            if (!user) {
                // If user was logged in but now getCurrentUser returns null (session expired), sync state
                if (currentUser) setUser(null);
                return;
            }

            if (user.expiresAt) {
                const expirationDate = new Date(user.expiresAt);
                if (expirationDate < new Date()) {
                    handleForceLogout('Sua conta temporária expirou.');
                }
            }
        }, 60000); // 1 minute

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [user?.id]); // Re-subscribe when user changes

    const handleForceLogout = (message: string) => {
        authService.logout();
        setUser(null);
        alert(message);
        window.location.href = '#/login';
    };

    const login = async (identifier: string, password: string) => {
        const user = await authService.login(identifier, password);
        setUser(user);
        localStorage.setItem('gallery_auth', 'true'); // For backward compatibility
    };

    const logout = () => {
        authService.logout();
        setUser(null);
    };

    const register = async (name: string, email: string, password: string, isAdmin: boolean) => {
        const newUser = await authService.register(name, email, password, isAdmin);
        setUser(newUser);
        localStorage.setItem('gallery_auth', 'true');
        localStorage.setItem('gallery_user', JSON.stringify(newUser));
        localStorage.setItem('gallery_login_time', Date.now().toString());

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
