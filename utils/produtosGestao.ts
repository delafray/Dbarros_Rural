/**
 * Lógica PURA da gestão de produtos (RF-059) — extraída do hook para teste.
 */

import type { CustoProdutoNomeHistorico } from '../types/custos';

/** produto_id → renomeações em ordem cronológica (subitem + tooltip). */
export function agruparHistoricoPorProduto(
    historico: CustoProdutoNomeHistorico[],
): Map<string, CustoProdutoNomeHistorico[]> {
    const m = new Map<string, CustoProdutoNomeHistorico[]>();
    for (const h of historico) {
        const lista = m.get(h.produto_id) ?? [];
        lista.push(h);
        m.set(h.produto_id, lista);
    }
    return m;
}

/**
 * A cadeia de modificações que o hover mostra (RF-059: "se passar o mouse,
 * mostra o nome da modificação").
 */
export function cadeiaDeModificacoes(hist: CustoProdutoNomeHistorico[]): string {
    return hist
        .map(h => `"${h.nome_anterior}" → "${h.nome_novo}" em ${new Date(h.alterado_em).toLocaleDateString('pt-BR')}`)
        .join('\n');
}

/** Erro de exclusão bloqueada (EM_USO) vira motivo legível; outros erros sobem. */
export function interpretarErroExclusao(e: unknown): { bloqueado: boolean; motivo: string } {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith('EM_USO')) {
        return { bloqueado: true, motivo: msg.replace('EM_USO: ', '') };
    }
    return { bloqueado: false, motivo: msg };
}
