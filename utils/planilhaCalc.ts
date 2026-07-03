/**
 * Lógica de precificação da planilha de vendas — funções PURAS e testadas
 * (utils/planilhaCalc.test.ts). Extraída de hooks/usePlanilhaData.ts para que
 * o cálculo financeiro central do sistema tenha cobertura de teste e possa ser
 * reutilizado em futuras refatorações (planilha, dashboard, PDFs).
 *
 * Tipos estruturais locais (subset dos tipos reais) para manter o módulo puro,
 * sem dependência do client Supabase.
 */

import { somaMonetaria } from './money';

export interface CategoriaCalc {
    tag: string;
    prefix?: string;
    count?: number;
    standBase?: number;
    combos?: number[];
    combos_adicionais?: number[];
    tipo_precificacao?: 'fixo' | 'area_livre';
    preco_m2?: number;
}

export interface EstandeCalc {
    stand_nr: string;
    tipo_venda: string;
    opcionais_selecionados?: Record<string, string> | null;
    desconto?: number | null;
    valor_pago?: number | null;
    area_m2?: number | null;
    preco_m2_override?: number | null;
    total_override?: number | null;
    combo_overrides?: Record<string, number> | null;
}

export interface OpcionalCalc {
    id: string;
    nome: string;
    preco_base: number;
}

export interface TotaisRow {
    precoBase: number;
    totalOpcionais: number;
    subTotal: number;
    desconto: number;
    totalVenda: number;
    valorPago: number;
    pendente: number;
}

/**
 * Encontra a categoria de um estande pelo prefixo do stand_nr.
 * Prefixos mais longos têm prioridade (ex: "AL PREMIUM" antes de "AL").
 */
export function getCategoriaOfStandNr(
    standNr: string,
    categorias: CategoriaCalc[],
): CategoriaCalc | undefined {
    const nr = standNr.toLowerCase();
    const sorted = [...categorias].sort((a, b) => {
        const idA = (a.prefix || a.tag || '').length;
        const idB = (b.prefix || b.tag || '').length;
        return idB - idA;
    });
    return sorted.find((c) => {
        const id = (c.prefix || c.tag || '').toLowerCase().trim();
        if (!id) return false;
        return nr === id || nr.startsWith(`${id} `);
    });
}

/**
 * Preço-base de um estande para o tipo de venda selecionado.
 * Regras (idênticas ao comportamento original do hook):
 * - tipoVenda com "*" (cortesia/permuta) → 0
 * - Categoria area_livre: STAND PADRÃO = total_override ?? area_m2 × preço/m²;
 *   COMBO N = combo_override ?? (base + adicional do combo N)
 * - Categoria fixa: STAND PADRÃO = standBase; COMBO N = combos[N-1]
 */
export function getPrecoForCombo(
    cat: CategoriaCalc | undefined,
    row: EstandeCalc,
    tipoVenda: string,
): number {
    if (!cat || tipoVenda.includes('*')) return 0;
    const tipo = tipoVenda.replace('*', '').trim();

    if (cat.tipo_precificacao === 'area_livre') {
        if (tipo === 'STAND PADRÃO') {
            if (row.total_override != null) return Number(row.total_override);
            if (row.area_m2 != null) {
                const pm2 = row.preco_m2_override ?? cat.preco_m2 ?? 0;
                return Number(row.area_m2) * Number(pm2);
            }
            return 0;
        }
        const match = tipo.match(/COMBO (\d+)/);
        if (match) {
            const comboOverrides = (row.combo_overrides as Record<string, number>) || {};
            if (comboOverrides[tipo] != null) return comboOverrides[tipo];
            const idx = parseInt(match[1], 10) - 1;
            const base = row.total_override ??
                (row.area_m2 != null ? Number(row.area_m2) * Number(row.preco_m2_override ?? cat.preco_m2 ?? 0) : 0);
            const adicional = Array.isArray(cat.combos_adicionais) ? (cat.combos_adicionais[idx] || 0) : 0;
            return base + adicional;
        }
        return 0;
    }

    if (tipo === 'STAND PADRÃO') return cat.standBase || 0;
    const match = tipo.match(/COMBO (\d+)/);
    if (match) {
        const idx = parseInt(match[1], 10) - 1;
        if (Array.isArray(cat.combos)) return (cat.combos as number[])[idx] || 0;
    }
    return 0;
}

/**
 * Calcula todos os totais de uma linha da planilha.
 * Opcionais marcados com "x" somam o preço da edição (se definido) ou o preço-base.
 */
export function calculateRowTotals(
    row: EstandeCalc,
    cat: CategoriaCalc | undefined,
    opcionaisAtivos: OpcionalCalc[],
    precosEdicao: Record<string, number>,
): TotaisRow {
    const precoBase = getPrecoForCombo(cat, row, row.tipo_venda);

    const selecoes = (row.opcionais_selecionados as Record<string, string>) || {};
    const precosMarcados: number[] = [];
    opcionaisAtivos.forEach((opt) => {
        if (selecoes[opt.nome] === 'x') {
            const preco =
                precosEdicao[opt.id] !== undefined
                    ? Number(precosEdicao[opt.id])
                    : Number(opt.preco_base);
            precosMarcados.push(preco);
        }
    });
    const totalOpcionais = somaMonetaria(precosMarcados);

    const subTotal = somaMonetaria([precoBase, totalOpcionais]);
    const desconto = Number(row.desconto) || 0;
    const totalVenda = somaMonetaria([subTotal, -desconto]);
    const valorPago = Number(row.valor_pago) || 0;
    const pendente = somaMonetaria([totalVenda, -valorPago]);

    return { precoBase, totalOpcionais, subTotal, desconto, totalVenda, valorPago, pendente };
}
