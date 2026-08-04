/**
 * Dashboard O×C×R (RF-039) + custo por espaço com as 3 gavetas (Q-021):
 * composto = direto + medível rateado por quantidade; verba fechada vira a
 * faixa "custos gerais a cobrir" com break-even (RF-034/040).
 */

import React, { useMemo } from 'react';
import { Card } from '../UI';
import { formatBRL } from '../../utils/parseBR';
import {
    calcularCustoComposto,
    calcularProjecao,
    custosGeraisACobrir,
    ratearPorQuantidade,
    semaforoOrcamento,
    type ItemCusto as ItemCalc,
} from '../../utils/custosCalc';
import type { CustoCategoria, CustoComposto, CustoItem } from '../../types/custos';

interface Props {
    itens: CustoItem[];
    compostos: CustoComposto[];
    categorias: CustoCategoria[];
    /** soma das parcelas pagas (aba Pagamentos) — o Realizado de verdade */
    realizadoPagamentos?: number;
}

const COR_SEMAFORO = {
    verde: 'bg-green-100 text-green-700',
    amarelo: 'bg-amber-100 text-amber-700',
    vermelho: 'bg-red-100 text-red-700',
} as const;

export const DashboardTab: React.FC<Props> = ({ itens, compostos, categorias, realizadoPagamentos }) => {
    const paraCalc = (i: CustoItem): ItemCalc => ({
        quantidade: (Number(i.quantidade) || 0) * (Number(i.fator) || 1),
        valorUnitario: Number(i.preco_unitario_orcado) || 0,
        alocacao: i.alocacao,
        compostoId: i.composto_id,
    });

    const projecao = useMemo(() => calcularProjecao(itens.map(i => {
        const total = Number(i.total_orcado) || 0;
        const fechado = i.status === 'contratado' || i.status === 'realizado';
        return {
            orcado: total,
            contratado: fechado ? total : 0,
            realizado: i.status === 'realizado' ? total : 0,
            estaContratado: fechado,
        };
    })), [itens]);

    const gerais = useMemo(() => custosGeraisACobrir(itens.map(paraCalc)), [itens]);

    // Rateio dos medíveis por quantidade entre os compostos da mesma categoria (RF-033)
    const parcelasPorComposto = useMemo(() => {
        const acumulado = new Map<string, number>();
        const mediveis = itens.filter(i => i.alocacao === 'medivel' && !i.composto_id && i.categoria_id);
        for (const m of mediveis) {
            const consumidores = itens.filter(i =>
                i.composto_id && i.categoria_id === m.categoria_id);
            const mapa = ratearPorQuantidade(
                Number(m.total_orcado) || 0,
                consumidores.map(c => ({
                    compostoId: c.composto_id as string,
                    quantidade: (Number(c.quantidade) || 0) * (Number(c.fator) || 1),
                })),
            );
            for (const [cid, v] of mapa) acumulado.set(cid, (acumulado.get(cid) ?? 0) + v);
        }
        return acumulado;
    }, [itens]);

    const porCategoria = useMemo(() => {
        const nome = Object.fromEntries(categorias.map(c => [c.id, c.nome]));
        const grupos = new Map<string, { orcado: number; fechado: number }>();
        for (const i of itens) {
            const chave = i.categoria_id ? (nome[i.categoria_id] ?? 'Outros') : 'Sem categoria';
            const g = grupos.get(chave) ?? { orcado: 0, fechado: 0 };
            const total = Number(i.total_orcado) || 0;
            g.orcado += total;
            if (i.status === 'contratado' || i.status === 'realizado') g.fechado += total;
            grupos.set(chave, g);
        }
        return [...grupos.entries()].sort((a, b) => b[1].orcado - a[1].orcado);
    }, [itens, categorias]);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                    ['Orçado', projecao.orcado],
                    ['Contratado', projecao.contratado],
                    ['Realizado', realizadoPagamentos ?? projecao.realizado],
                    ['Projeção final', projecao.projecaoFinal],
                ].map(([rotulo, valor]) => (
                    <Card key={String(rotulo)} className="p-4">
                        <p className="text-xs uppercase text-slate-500">{rotulo}</p>
                        <p className="text-lg font-bold">{formatBRL(Number(valor))}</p>
                        {rotulo === 'Projeção final' && (
                            <p className={`text-xs ${projecao.desvio > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {projecao.desvio > 0 ? '▲' : '▼'} {formatBRL(Math.abs(projecao.desvio))}
                                {' '}({projecao.desvioPercent}%) vs orçado
                            </p>
                        )}
                    </Card>
                ))}
            </div>

            {gerais > 0 && (
                <Card className="border-amber-300 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-800">
                        Custos gerais a cobrir (verba fechada): {formatBRL(gerais)}
                    </p>
                    <p className="text-xs text-amber-700">
                        Frete, ART, cachês e taxas NÃO entram no custo dos espaços — são cobertos pela
                        margem das vendas (estandes, blimps, patrocínios). Preço de venda tem de considerar isso.
                    </p>
                </Card>
            )}

            {compostos.length > 0 && (
                <Card className="p-4">
                    <h3 className="mb-2 font-semibold">Custo por espaço (para precificar a venda)</h3>
                    <table className="min-w-full text-sm">
                        <thead className="text-left text-xs uppercase text-slate-500">
                            <tr>
                                <th className="py-1">Espaço</th>
                                <th className="py-1 text-right">Direto</th>
                                <th className="py-1 text-right">+ Rateado</th>
                                <th className="py-1 text-right">Custo total</th>
                                <th className="py-1 text-right">÷ unid.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {compostos.map(c => {
                                const custo = calcularCustoComposto(c.id, itens.map(paraCalc), parcelasPorComposto);
                                const qtd = Number(c.quantidade) || 1;
                                return (
                                    <tr key={c.id}>
                                        <td className="py-1">{c.nome}{qtd > 1 ? ` (×${qtd})` : ''}</td>
                                        <td className="py-1 text-right">{formatBRL(custo.direto)}</td>
                                        <td className="py-1 text-right">{formatBRL(custo.rateado)}</td>
                                        <td className="py-1 text-right font-semibold">{formatBRL(custo.total)}</td>
                                        <td className="py-1 text-right text-slate-500">
                                            {formatBRL(custo.total / qtd)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </Card>
            )}

            <Card className="p-4">
                <h3 className="mb-2 font-semibold">Por categoria (semáforo 80/100% — rel. 13)</h3>
                <div className="space-y-1">
                    {porCategoria.map(([nome, g]) => {
                        const cor = semaforoOrcamento(g.fechado, g.orcado);
                        return (
                            <div key={nome} className="flex items-center gap-2 text-sm">
                                <span className={`rounded px-1.5 py-0.5 text-xs ${COR_SEMAFORO[cor]}`}>●</span>
                                <span className="flex-1">{nome}</span>
                                <span className="text-slate-500">{formatBRL(g.fechado)} / {formatBRL(g.orcado)}</span>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
};
