/**
 * Cálculos financeiros puros do Centro de Custo do Evento — sem React, sem IO.
 * Espelho do padrão `orcamento-calc.ts` do Prosperitas (RF-031), adaptado às
 * decisões do módulo:
 *  - 3 gavetas de alocação (Q-021 deliberada): direto | indireto_rateavel | verba_fechada
 *  - rateio por quantidade com INVARIANTE de conservação (RF-033/051): a soma
 *    das parcelas rateadas é EXATAMENTE o valor rateado — o centavo residual
 *    de arredondamento vai para a maior parcela (método do maior resto).
 *  - projeção EAC = contratado + estimativas não contratadas (RF-039/rel. 10)
 * Aritmética monetária via utils/money.ts (RNF-008) — nunca float acumulado.
 *
 * Testado em utils/custosCalc.test.ts (meta: ≥95% — RNF-014).
 */

import { roundCentavos, somaMonetaria } from './money';

// ────────────────────────────────────────────────────────────────────────────
// Tipos puros (os tipos de banco vivem em types/custos.ts)
// ────────────────────────────────────────────────────────────────────────────

/** As 3 gavetas de alocação decididas na Q-021. */
export type Alocacao = 'direto' | 'indireto_rateavel' | 'verba_fechada';

export interface ItemCusto {
    quantidade: number;
    valorUnitario: number;
    alocacao: Alocacao;
    /** id do composto dono (direto) ou null (item geral do evento) */
    compostoId: string | null;
}

export interface ParcelaRateio {
    compostoId: string;
    quantidade: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Totais de item
// ────────────────────────────────────────────────────────────────────────────

/**
 * Total de um item: quantidade × valor unitário em centavos exatos.
 * Entradas inválidas (NaN/null/undefined/negativas) viram 0 — a grade aceita
 * entrada suja (RNF-002) e o cálculo nunca propaga lixo financeiro.
 */
export function calcularTotalItem(quantidade: unknown, valorUnitario: unknown): number {
    const q = Number(quantidade);
    const v = Number(valorUnitario);
    if (!Number.isFinite(q) || !Number.isFinite(v) || q < 0 || v < 0) return 0;
    return roundCentavos(q * v);
}

// ────────────────────────────────────────────────────────────────────────────
// Rateio por quantidade (RF-033) com invariante de conservação
// ────────────────────────────────────────────────────────────────────────────

/**
 * Rateia `valorTotal` entre compostos proporcionalmente às quantidades.
 * GARANTIA (invariante RF-051/rel. 63): Σ(parcelas) === valorTotal, sempre —
 * o resíduo de arredondamento (centavos) é atribuído à maior parcela
 * (método do maior resto), nunca perdido nem duplicado.
 *
 * Casos de borda: lista vazia ou soma de quantidades 0 → retorna mapa vazio
 * (o chamador decide o destino: verba fica no evento, não explode NaN).
 */
export function ratearPorQuantidade(
    valorTotal: number,
    parcelas: ParcelaRateio[],
): Map<string, number> {
    const resultado = new Map<string, number>();
    if (!Number.isFinite(valorTotal) || valorTotal <= 0) return resultado;

    const validas = parcelas.filter(p => Number.isFinite(p.quantidade) && p.quantidade > 0);
    const somaQtd = validas.reduce((s, p) => s + p.quantidade, 0);
    if (validas.length === 0 || somaQtd <= 0) return resultado;

    // Trabalha em centavos inteiros para a conservação ser exata.
    const totalCentavos = Math.round(valorTotal * 100);
    let distribuido = 0;
    let maiorId = validas[0].compostoId;
    let maiorCent = -1;

    for (const p of validas) {
        const cent = Math.floor((totalCentavos * p.quantidade) / somaQtd);
        // Compostos repetidos na lista acumulam na mesma chave.
        resultado.set(p.compostoId, (resultado.get(p.compostoId) ?? 0) + cent);
        distribuido += cent;
        const acumulado = resultado.get(p.compostoId)!;
        if (acumulado > maiorCent) {
            maiorCent = acumulado;
            maiorId = p.compostoId;
        }
    }

    // Resíduo do arredondamento para a maior parcela (conservação exata).
    const residuo = totalCentavos - distribuido;
    if (residuo !== 0) resultado.set(maiorId, resultado.get(maiorId)! + residuo);

    for (const [id, cent] of resultado) resultado.set(id, cent / 100);
    return resultado;
}

// ────────────────────────────────────────────────────────────────────────────
// Custo do composto (RF-034 / Q-021): direto + medível, e SÓ isso
// ────────────────────────────────────────────────────────────────────────────

export interface CustoComposto {
    /** soma dos itens diretos do composto */
    direto: number;
    /** soma das parcelas rateadas de itens indiretos medíveis */
    rateado: number;
    /** direto + rateado — o número que precifica a venda */
    total: number;
}

/**
 * Custo de um composto: itens `direto` do próprio composto + parcelas de
 * `indireto_rateavel` já rateadas. Verba fechada NUNCA entra aqui (Q-021) —
 * ela é reportada por `custosGeraisACobrir`.
 */
export function calcularCustoComposto(
    compostoId: string,
    itensDiretos: ItemCusto[],
    parcelasRateadas: Map<string, number>,
): CustoComposto {
    const direto = somaMonetaria(
        itensDiretos
            .filter(i => i.alocacao === 'direto' && i.compostoId === compostoId)
            .map(i => calcularTotalItem(i.quantidade, i.valorUnitario)),
    );
    const rateado = roundCentavos(parcelasRateadas.get(compostoId) ?? 0);
    return { direto, rateado, total: roundCentavos(direto + rateado) };
}

/**
 * "Custos gerais a cobrir" (faixa de aviso da Q-021): soma da verba fechada,
 * que fica FORA dos compostos e é coberta pela margem/break-even (RF-040).
 */
export function custosGeraisACobrir(itens: ItemCusto[]): number {
    return somaMonetaria(
        itens
            .filter(i => i.alocacao === 'verba_fechada')
            .map(i => calcularTotalItem(i.quantidade, i.valorUnitario)),
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Projeção e desvios (RF-039 / rel. 10)
// ────────────────────────────────────────────────────────────────────────────

export interface LinhaProjecao {
    orcado: number;
    /** valor fechado em contratação (0 se ainda não contratado) */
    contratado: number;
    /** efetivamente pago */
    realizado: number;
    /** true quando a linha já tem contratação firmada */
    estaContratado: boolean;
}

export interface Projecao {
    orcado: number;
    contratado: number;
    realizado: number;
    /** EAC = Σ contratado + Σ orçado das linhas ainda não contratadas */
    projecaoFinal: number;
    desvio: number;
    /** desvio ÷ orçado; 0 quando orçado = 0 */
    desvioPercent: number;
}

/** Projeção final do evento/categoria: contratado + estimativas não contratadas. */
export function calcularProjecao(linhas: LinhaProjecao[]): Projecao {
    const orcado = somaMonetaria(linhas.map(l => sanitize(l.orcado)));
    const contratado = somaMonetaria(linhas.map(l => sanitize(l.contratado)));
    const realizado = somaMonetaria(linhas.map(l => sanitize(l.realizado)));
    const projecaoFinal = somaMonetaria(
        linhas.map(l => (l.estaContratado ? sanitize(l.contratado) : sanitize(l.orcado))),
    );
    const desvio = roundCentavos(projecaoFinal - orcado);
    const desvioPercent = orcado > 0 ? roundCentavos((desvio / orcado) * 100) : 0;
    return { orcado, contratado, realizado, projecaoFinal, desvio, desvioPercent };
}

/** Semáforo do consumo do orçado (rel. 13): verde < 80%, amarelo < 100%, vermelho ≥ 100%. */
export type Semaforo = 'verde' | 'amarelo' | 'vermelho';
export function semaforoOrcamento(consumido: number, orcado: number): Semaforo {
    if (orcado <= 0) return consumido > 0 ? 'vermelho' : 'verde';
    const razao = consumido / orcado;
    if (razao >= 1) return 'vermelho';
    if (razao >= 0.8) return 'amarelo';
    return 'verde';
}

function sanitize(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
}

// ────────────────────────────────────────────────────────────────────────────
// Break-even simples (RF-040): quantas unidades cobrem os custos gerais
// ────────────────────────────────────────────────────────────────────────────

/**
 * Unidades (ex.: estandes) necessárias para cobrir a verba fechada, dada a
 * margem de contribuição unitária (preço − custo do composto).
 * Margem ≤ 0 → Infinity (nunca cobre) — o chamador exibe o aviso.
 */
export function breakEvenUnidades(custosGerais: number, margemUnitaria: number): number {
    if (!Number.isFinite(custosGerais) || custosGerais <= 0) return 0;
    if (!Number.isFinite(margemUnitaria) || margemUnitaria <= 0) return Infinity;
    return Math.ceil(custosGerais / margemUnitaria);
}
