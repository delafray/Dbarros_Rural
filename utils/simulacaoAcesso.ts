import { User } from '../services/authService';

// Simulação de visão (pedido do usuário 14/08): o dono do sistema pode ver o
// app como Admin (Bruno) ou Usuário (Luciene) sem trocar de login. Só muda o
// que a INTERFACE mostra — a sessão/RLS continuam sendo do usuário real.
// null = sem simulação (acesso real, Super Admin).
export type NivelSimulacao = 'admin' | 'usuario' | null;

export const proximoNivel = (nivel: NivelSimulacao): NivelSimulacao => {
    if (nivel === null) return 'admin';
    if (nivel === 'admin') return 'usuario';
    return null;
};

export const rotuloNivel = (nivel: NivelSimulacao): string => {
    if (nivel === null) return 'Super Admin';
    if (nivel === 'admin') return 'Admin';
    return 'Usuário';
};

// O e-mail é trocado por um fictício para que travas por e-mail (RF-060,
// podeVerCentroCusto) também respondam à simulação.
export const aplicarSimulacao = (user: User | null, nivel: NivelSimulacao): User | null => {
    if (!user || nivel === null) return user;
    return {
        ...user,
        isAdmin: nivel === 'admin',
        canManageTags: false,
        isProjetista: false,
        isVisitor: false,
        email: `simulacao-${nivel}@interno.local`,
    };
};
