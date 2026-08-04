/**
 * Pagamentos com parcelas (Q-009) — o REALIZADO de verdade.
 * Lança parcelas (divisão exata de centavos, vencimentos mensais) e marca
 * pago; linha paga fica imutável (Q-025 — a RLS trava no banco).
 */

import React, { useMemo, useState } from 'react';
import { Button, Card, Badge } from '../UI';
import { formatBRL, parseNumeroBR } from '../../utils/parseBR';
import type { CustoPagamento, PedidoComItens } from '../../services/custosService';

interface Props {
    pagamentos: CustoPagamento[];
    pedidos: PedidoComItens[];
    onCriarParcelas: (p: { valorTotal: number; parcelas: number; primeiroVencimento: string | null; contratacaoId?: string | null }) => Promise<void>;
    onMarcarPago: (id: string, data: string) => Promise<void>;
}

const STATUS_COR: Record<string, 'slate' | 'blue' | 'green' | 'red' | 'yellow'> = {
    previsto: 'slate', agendado: 'blue', pago: 'green', cancelado: 'red',
};

export const PagamentosTab: React.FC<Props> = ({ pagamentos, pedidos, onCriarParcelas, onMarcarPago }) => {
    const [form, setForm] = useState({ valor: '', parcelas: '1', vencimento: '' });
    const [ocupado, setOcupado] = useState(false);
    void pedidos;

    const totais = useMemo(() => {
        const previsto = pagamentos.filter(p => p.status !== 'cancelado')
            .reduce((s, p) => s + Number(p.valor), 0);
        const pago = pagamentos.filter(p => p.status === 'pago')
            .reduce((s, p) => s + Number(p.valor), 0);
        const vencidas = pagamentos.filter(p =>
            p.status !== 'pago' && p.status !== 'cancelado' && p.data_vencimento &&
            p.data_vencimento < new Date().toISOString().slice(0, 10)).length;
        return { previsto, pago, aberto: previsto - pago, vencidas };
    }, [pagamentos]);

    const lancar = async () => {
        const valor = parseNumeroBR(form.valor);
        if (!valor || valor <= 0) return;
        setOcupado(true);
        try {
            await onCriarParcelas({
                valorTotal: valor,
                parcelas: Number(form.parcelas) || 1,
                primeiroVencimento: form.vencimento || null,
            });
            setForm({ valor: '', parcelas: '1', vencimento: '' });
        } finally { setOcupado(false); }
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                    ['A pagar (total)', totais.previsto],
                    ['Pago (realizado)', totais.pago],
                    ['Em aberto', totais.aberto],
                ].map(([r, v]) => (
                    <Card key={String(r)} className="p-4">
                        <p className="text-xs uppercase text-slate-500">{r}</p>
                        <p className="text-lg font-bold">{formatBRL(Number(v))}</p>
                    </Card>
                ))}
                <Card className={`p-4 ${totais.vencidas > 0 ? 'border-red-300 bg-red-50' : ''}`}>
                    <p className="text-xs uppercase text-slate-500">Parcelas vencidas</p>
                    <p className={`text-lg font-bold ${totais.vencidas > 0 ? 'text-red-600' : ''}`}>{totais.vencidas}</p>
                </Card>
            </div>

            <Card className="p-4">
                <h3 className="mb-2 font-semibold">Lançar pagamento (com parcelas)</h3>
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        className="w-36 rounded border border-slate-300 px-3 py-1.5 text-sm"
                        placeholder="Valor total (R$)"
                        value={form.valor}
                        onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                    />
                    <label className="flex items-center gap-1 text-sm text-slate-500">
                        em
                        <input
                            className="w-14 rounded border border-slate-300 px-2 py-1.5 text-right text-sm"
                            value={form.parcelas}
                            onChange={e => setForm(f => ({ ...f, parcelas: e.target.value }))}
                        />
                        parcela(s)
                    </label>
                    <label className="flex items-center gap-1 text-sm text-slate-500">
                        1º vencimento
                        <input
                            type="date"
                            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                            value={form.vencimento}
                            onChange={e => setForm(f => ({ ...f, vencimento: e.target.value }))}
                        />
                    </label>
                    <Button disabled={ocupado} onClick={() => void lancar()}>Lançar</Button>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                    Ex.: sinal de 50% agora + 2 parcelas — lance duas vezes. A divisão de centavos é exata.
                </p>
            </Card>

            <Card className="p-0">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500">
                        <tr>
                            <th className="px-3 py-2">Parcela</th>
                            <th className="px-3 py-2 text-right">Valor</th>
                            <th className="px-3 py-2">Vencimento</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Pagamento</th>
                            <th className="px-3 py-2" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {pagamentos.map(p => (
                            <tr key={p.id} className={p.status === 'pago' ? 'opacity-60' : ''}>
                                <td className="px-3 py-2">{p.parcela_num}/{p.parcelas_total}</td>
                                <td className="px-3 py-2 text-right font-medium">{formatBRL(Number(p.valor))}</td>
                                <td className="px-3 py-2">
                                    {p.data_vencimento ? p.data_vencimento.split('-').reverse().join('/') : '—'}
                                </td>
                                <td className="px-3 py-2">
                                    <Badge color={STATUS_COR[p.status] ?? 'slate'}>{p.status}</Badge>
                                </td>
                                <td className="px-3 py-2 text-xs text-slate-500">
                                    {p.data_pagamento ? p.data_pagamento.split('-').reverse().join('/') : ''}
                                </td>
                                <td className="px-3 py-2 text-right">
                                    {p.status !== 'pago' && p.status !== 'cancelado' && (
                                        <Button variant="outline"
                                            onClick={() => void onMarcarPago(p.id, new Date().toISOString().slice(0, 10))}>
                                            ✓ Pagar hoje
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {pagamentos.length === 0 && (
                            <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400">
                                Nenhum pagamento lançado — o Realizado do dashboard nasce aqui.
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};
