/**
 * Memória curta das escritas otimistas feitas neste navegador (linha × campo × instante).
 *
 * Problema: a célula/estande pinta na hora (otimista) e grava no banco; o realtime devolve a
 * linha inteira do banco. Em cliques rápidos, o eco de uma gravação ANTERIOR chega depois da
 * marcação seguinte e a sobrescreve por um instante (parece atraso/pisca). Regra: um campo
 * escrito aqui há menos de JANELA_MS é autoridade local — o eco do realtime não o sobrescreve.
 * Passada a janela, o realtime volta a valer (consistência entre usuários).
 */
export const JANELA_MS = 4000;

type Registro = Map<string, number>; // campo → instante da escrita local
const porLinha = new Map<string, Registro>();

export function marcarEscritaLocal(id: string, campos: Record<string, unknown>, agora: number = Date.now()): void {
    const reg = porLinha.get(id) ?? new Map<string, number>();
    for (const campo of Object.keys(campos)) reg.set(campo, agora);
    porLinha.set(id, reg);
}

export function campoRecemEscrito(id: string, campo: string, agora: number = Date.now()): boolean {
    const t = porLinha.get(id)?.get(campo);
    return t !== undefined && agora - t < JANELA_MS;
}

/**
 * Mescla um eco do realtime numa linha local, preservando os campos recém-escritos aqui.
 * Devolve o mesmo objeto `local` se nada mudar (evita re-render à toa).
 */
export function mesclarEcoRealtime<T extends { id: string }>(local: T, eco: Partial<T>, agora: number = Date.now()): T {
    let mudou = false;
    const saida: T = { ...local };
    for (const campo of Object.keys(eco) as (keyof T & string)[]) {
        if (campoRecemEscrito(local.id, campo, agora)) continue;
        if (saida[campo] !== eco[campo]) {
            (saida as Record<string, unknown>)[campo] = eco[campo];
            mudou = true;
        }
    }
    return mudou ? saida : local;
}

/** Só para testes. */
export function limparEscritasLocais(): void {
    porLinha.clear();
}
