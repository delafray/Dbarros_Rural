import { getSystemInfo } from './core_lic';

// RF-060: enquanto o módulo está em teste restrito em produção, o Centro de
// Custo é visível/acessível SOMENTE para o usuário dono da licença (o mesmo
// e-mail de core_lic). A trava de verdade é a RLS (custos_usuario_autorizado,
// Bloco 25) — aqui é só o espelho de UI (menu + guard de rota).
export const podeVerCentroCusto = (user: { email?: string } | null | undefined): boolean => {
    const email = user?.email?.trim().toLowerCase();
    if (!email) return false;
    return email === getSystemInfo().contact.trim().toLowerCase();
};
