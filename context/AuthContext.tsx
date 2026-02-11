import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User } from '../services/authService';

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
    }, []);

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
