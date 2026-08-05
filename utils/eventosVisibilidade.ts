/**
 * Visibilidade de eventos em SIMULAÇÃO (pedido do usuário, 05/08/2026):
 * eventos criados pelo Centro de Custo nascem com
 * `eventos_edicoes.status_custos = 'simulacao'` (orçar ANTES de decidir se o
 * evento acontece) e NÃO devem aparecer no Dashboard nem na gestão de Eventos
 * até serem validados. Eles continuam visíveis no seletor do /custos — é lá
 * que se trabalha neles até a validação.
 */

export interface EdicaoStatusCustos {
    status_custos?: string | null;
}

/** A edição está em simulação (oculta do Dashboard/edições ativas)? */
export function edicaoEmSimulacao(ed: EdicaoStatusCustos | null | undefined): boolean {
    return ed?.status_custos === 'simulacao';
}

/**
 * O EVENTO some da gestão quando tem edições e TODAS estão em simulação
 * (evento que só existe como estudo de custo). Evento sem edição nenhuma é
 * rascunho normal do sistema principal — continua aparecendo; evento real que
 * ganhou uma edição de simulação por cima também continua (tem edições reais).
 */
export function eventoOcultoPorSimulacao(
    edicoes: EdicaoStatusCustos[] | null | undefined,
): boolean {
    if (!edicoes || edicoes.length === 0) return false;
    return edicoes.every(edicaoEmSimulacao);
}
