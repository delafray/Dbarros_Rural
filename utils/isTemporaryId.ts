// ============================================================
// isTemporaryId.ts — Distingue IDs temporários (gerados no client)
// de IDs persistidos no banco.
// ============================================================

/**
 * IDs temporários são gerados via Math.random().toString(36).substring(7),
 * resultando em strings curtas (<= 10 caracteres). IDs persistidos (UUIDs)
 * têm tamanho maior que 10. Mesma lógica dos antigos checks `id.length > 10`.
 */
export function isTemporaryId(id: string): boolean {
    return !(id.length > 10);
}
