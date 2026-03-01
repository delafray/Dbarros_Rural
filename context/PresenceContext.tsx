import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';

// Tempo sem interação para considerar "inativo" (em ms)
const IDLE_TIMEOUT_MS = 60_000; // 60 segundos

export interface OnlineUser {
    user_id: string;
    name: string;
    active: boolean; // true = usando agora; false = parado/aba minimizada
    sessionCount: number; // quantas sessões ativas (tabs/dispositivos) tem este usuário
}

interface PresenceContextType {
    onlineUsers: OnlineUser[]; // apenas usuários ativos (filtrado)
}

const PresenceContext = createContext<PresenceContextType>({ onlineUsers: [] });

export const PresenceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isActiveRef = useRef(false);

    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase.channel('app-online-users');
        channelRef.current = channel;

        // ── Atualiza a lista de presença ──────────────────────────────
        const syncUsers = () => {
            const state = channel.presenceState<OnlineUser>();
            // Agrupa por user_id e conta sessões ativas
            const grouped = new Map<string, { name: string; count: number }>();
            for (const entries of Object.values(state)) {
                for (const entry of entries as OnlineUser[]) {
                    if (!entry.active) continue;
                    const prev = grouped.get(entry.user_id);
                    grouped.set(entry.user_id, {
                        name: entry.name,
                        count: (prev?.count ?? 0) + 1,
                    });
                }
            }
            const result: OnlineUser[] = [];
            grouped.forEach((val, uid) => {
                result.push({ user_id: uid, name: val.name, active: true, sessionCount: val.count });
            });
            setOnlineUsers(result);
        };

        channel
            .on('presence', { event: 'sync' }, syncUsers)
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // Começa como ativo
                    await channel.track({ user_id: user.id, name: user.name, active: true });
                    isActiveRef.current = true;
                }
            });

        // ── Marcar como ativo / inativo ───────────────────────────────
        const markActive = async () => {
            if (!isActiveRef.current) {
                isActiveRef.current = true;
                await channelRef.current?.track({ user_id: user.id, name: user.name, active: true });
            }
            // Reinicia o timer de inatividade
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            idleTimerRef.current = setTimeout(markIdle, IDLE_TIMEOUT_MS);
        };

        const markIdle = async () => {
            if (isActiveRef.current) {
                isActiveRef.current = false;
                await channelRef.current?.track({ user_id: user.id, name: user.name, active: false });
            }
        };

        // ── Page Visibility API — aba minimizada ou em segundo plano ──
        const handleVisibility = () => {
            if (document.hidden) {
                markIdle();
            } else {
                markActive();
            }
        };

        // Eventos de atividade do usuário
        const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;
        ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, markActive, { passive: true }));
        document.addEventListener('visibilitychange', handleVisibility);

        // Inicia o timer de inatividade
        idleTimerRef.current = setTimeout(markIdle, IDLE_TIMEOUT_MS);

        return () => {
            ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, markActive));
            document.removeEventListener('visibilitychange', handleVisibility);
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [user?.id]);

    return (
        <PresenceContext.Provider value={{ onlineUsers }}>
            {children}
        </PresenceContext.Provider>
    );
};

export const usePresence = () => useContext(PresenceContext);
