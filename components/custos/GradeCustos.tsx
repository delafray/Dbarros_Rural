/**
 * A GRADE — planilha com superpoderes (RNF-001/002/003).
 * Digitou-salvou no blur/Enter, linha nova no rodapé, colar do Excel com
 * preview (RF-012, utils/pasteTSV), qtd × fator × unitário (RF-053),
 * autocomplete de produto via busca "Mercado Livre" (RF-049).
 */

import React, { useMemo, useRef, useState } from 'react';
import { Button, Modal, Badge } from '../UI';
import { custosService } from '../../services/custosService';
import { processarPaste, type LinhaColada } from '../../utils/pasteTSV';
import { formatBRL, parseNumeroBR } from '../../utils/parseBR';
import { calcularTotalItem } from '../../utils/custosCalc';
import type {
    CustoCategoria, CustoComposto, CustoItem, CustoItemInput, CustoProdutoBusca,
} from '../../types/custos';

interface Props {
    itens: CustoItem[];
    categorias: CustoCategoria[];
    compostos: CustoComposto[];
    onCriar: (i: Omit<CustoItemInput, 'edicao_id'>) => Promise<unknown>;
    onCriarLote: (l: Omit<CustoItemInput, 'edicao_id'>[]) => Promise<void>;
    onAtualizar: (id: string, patch: Partial<CustoItemInput>) => Promise<void>;
    onExcluir: (id: string) => Promise<void>;
}

const STATUS_COR: Record<string, 'slate' | 'blue' | 'yellow' | 'green' | 'red'> = {
    rascunho: 'slate', orcado: 'blue', cotado: 'yellow',
    contratado: 'green', realizado: 'green', cancelado: 'red',
};

/** Célula editável: salva no blur ou Enter; Esc restaura. */
const Cell: React.FC<{
    valor: string; onSalvar: (v: string) => void; alinhar?: 'left' | 'right'; largura?: string;
}> = ({ valor, onSalvar, alinhar = 'left', largura = '' }) => {
    const [v, setV] = useState(valor);
    const [editando, setEditando] = useState(false);
    return (
        <input
            className={`w-full bg-transparent px-2 py-1 text-sm outline-none focus:bg-amber-50 focus:ring-1 focus:ring-amber-300 rounded ${alinhar === 'right' ? 'text-right' : ''} ${largura}`}
            value={editando ? v : valor}
            onFocus={() => { setV(valor); setEditando(true); }}
            onChange={e => setV(e.target.value)}
            onBlur={() => { setEditando(false); if (v !== valor) onSalvar(v); }}
            onKeyDown={e => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') { setV(valor); setEditando(false); (e.target as HTMLInputElement).blur(); }
            }}
        />
    );
};

export const GradeCustos: React.FC<Props> = ({
    itens, categorias, compostos, onCriar, onCriarLote, onAtualizar, onExcluir,
}) => {
    const [novo, setNovo] = useState({ descricao: '', quantidade: '', fator: '', preco: '' });
    const [sugestoes, setSugestoes] = useState<CustoProdutoBusca[]>([]);
    const [preview, setPreview] = useState<LinhaColada[] | null>(null);
    const [avisosPaste, setAvisosPaste] = useState<string[]>([]);
    const [filtroComposto, setFiltroComposto] = useState<string>('todos');
    const descRef = useRef<HTMLInputElement>(null);

    const nomeComposto = useMemo(
        () => Object.fromEntries(compostos.map(c => [c.id, c.nome])),
        [compostos],
    );
    const nomeCategoria = useMemo(
        () => Object.fromEntries(categorias.map(c => [c.id, c.nome])),
        [categorias],
    );

    const visiveis = useMemo(() => {
        if (filtroComposto === 'todos') return itens;
        if (filtroComposto === 'geral') return itens.filter(i => !i.composto_id);
        return itens.filter(i => i.composto_id === filtroComposto);
    }, [itens, filtroComposto]);

    const totalVisivel = useMemo(
        () => visiveis.reduce((s, i) => s + (Number(i.total_orcado) || 0), 0),
        [visiveis],
    );

    // ── Autocomplete (RF-049) ───────────────────────────────────────────────
    const buscar = async (termo: string) => {
        setNovo(n => ({ ...n, descricao: termo }));
        try {
            setSugestoes(termo.trim().length >= 2 ? await custosService.buscarProdutos(termo, 6) : []);
        } catch { setSugestoes([]); }
    };
    const usarSugestao = (s: CustoProdutoBusca) => {
        setNovo(n => ({ ...n, descricao: s.nome }));
        setSugestoes([]);
        void custosService.registrarUsoProduto(s.id).catch(() => undefined);
    };

    // ── Linha nova (Enter cria) ─────────────────────────────────────────────
    const criarLinha = async () => {
        if (!novo.descricao.trim()) return;
        await onCriar({
            descricao: novo.descricao,
            quantidade: parseNumeroBR(novo.quantidade) ?? 1,
            fator: parseNumeroBR(novo.fator) ?? 1,
            preco_unitario_orcado: parseNumeroBR(novo.preco),
            composto_id: filtroComposto !== 'todos' && filtroComposto !== 'geral' ? filtroComposto : null,
        });
        setNovo({ descricao: '', quantidade: '', fator: '', preco: '' });
        setSugestoes([]);
        descRef.current?.focus();
    };

    // ── Colar do Excel (RF-012) ─────────────────────────────────────────────
    const aoColar = (e: React.ClipboardEvent) => {
        const texto = e.clipboardData.getData('text/plain');
        if (!texto || !texto.includes('\t')) return;   // colagem simples segue normal
        e.preventDefault();
        const r = processarPaste(texto);
        setPreview(r.linhas);
        setAvisosPaste([...r.avisos, r.ignoradas > 0 ? `${r.ignoradas} linha(s) de seção/subtotal ignoradas` : '']
            .filter(Boolean));
    };
    const confirmarPaste = async () => {
        if (!preview) return;
        await onCriarLote(preview.map(l => ({
            descricao: l.descricao,
            quantidade: l.quantidade,
            fator: l.fator,
            preco_unitario_orcado: l.precoUnitario,
            formato: l.formato,
            composto_id: filtroComposto !== 'todos' && filtroComposto !== 'geral' ? filtroComposto : null,
        })));
        setPreview(null);
    };

    const numero = (v: string, fallback: number) => {
        const n = parseNumeroBR(v);
        return n !== null && n > 0 ? n : fallback;
    };

    return (
        <div onPaste={aoColar}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <select
                    className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                    value={filtroComposto}
                    onChange={e => setFiltroComposto(e.target.value)}
                >
                    <option value="todos">Todos os itens</option>
                    <option value="geral">Gerais do evento (sem espaço)</option>
                    {compostos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <span className="text-xs text-slate-400">
                    Cole aqui um bloco do Excel (Ctrl+V) que eu estruturo — pode vir bagunçado.
                </span>
                <span className="ml-auto text-sm font-semibold">
                    Total orçado: {formatBRL(totalVisivel)}
                </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500">
                        <tr>
                            <th className="px-2 py-2 w-64">Descrição</th>
                            <th className="px-2 py-2">Espaço</th>
                            <th className="px-2 py-2">Categoria</th>
                            <th className="px-2 py-2 w-20 text-right">Qtde</th>
                            <th className="px-2 py-2 w-20 text-right">× Fator</th>
                            <th className="px-2 py-2 w-28 text-right">Valor Unit.</th>
                            <th className="px-2 py-2 w-28 text-right">Total</th>
                            <th className="px-2 py-2">Status</th>
                            <th className="px-2 py-2 w-8" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {visiveis.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50">
                                <td><Cell valor={item.descricao}
                                    onSalvar={v => void onAtualizar(item.id, { descricao: v })} /></td>
                                <td className="px-2">
                                    <select
                                        className="w-full bg-transparent py-1 text-sm"
                                        value={item.composto_id ?? ''}
                                        onChange={e => void onAtualizar(item.id, { composto_id: e.target.value || null })}
                                    >
                                        <option value="">— geral —</option>
                                        {compostos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                    </select>
                                </td>
                                <td className="px-2">
                                    <select
                                        className="w-full bg-transparent py-1 text-sm"
                                        value={item.categoria_id ?? ''}
                                        onChange={e => void onAtualizar(item.id, { categoria_id: e.target.value || null })}
                                    >
                                        <option value="">—</option>
                                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                    </select>
                                </td>
                                <td><Cell alinhar="right" valor={String(item.quantidade)}
                                    onSalvar={v => void onAtualizar(item.id, { quantidade: numero(v, item.quantidade) })} /></td>
                                <td><Cell alinhar="right" valor={String(item.fator)}
                                    onSalvar={v => void onAtualizar(item.id, { fator: numero(v, item.fator) })} /></td>
                                <td><Cell alinhar="right"
                                    valor={item.preco_unitario_orcado != null ? String(item.preco_unitario_orcado) : ''}
                                    onSalvar={v => void onAtualizar(item.id, { preco_unitario_orcado: parseNumeroBR(v) })} /></td>
                                <td className="px-2 py-1 text-right font-medium">
                                    {formatBRL(item.total_orcado ?? calcularTotalItem(item.quantidade, item.preco_unitario_orcado ?? 0, item.fator))}
                                </td>
                                <td className="px-2">
                                    <Badge color={STATUS_COR[item.status] ?? 'slate'}>{item.status}</Badge>
                                    {item.prazo_limite && (
                                        <span className="block text-[10px] text-red-500">
                                            até {item.prazo_limite.split('-').reverse().join('/')}
                                        </span>
                                    )}
                                </td>
                                <td className="px-2 text-center">
                                    {['rascunho', 'orcado', 'cotado'].includes(item.status) && (
                                        <button
                                            className="text-slate-300 hover:text-red-500"
                                            title="Excluir"
                                            onClick={() => void onExcluir(item.id)}
                                        >×</button>
                                    )}
                                </td>
                            </tr>
                        ))}

                        {/* Linha nova — digite e Enter */}
                        <tr className="bg-amber-50/40">
                            <td className="relative">
                                <input
                                    ref={descRef}
                                    className="w-full bg-transparent px-2 py-2 text-sm outline-none"
                                    placeholder="+ novo item (busque: 'cadera' acha cadeira…)"
                                    value={novo.descricao}
                                    onChange={e => void buscar(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && void criarLinha()}
                                />
                                {sugestoes.length > 0 && (
                                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
                                        {sugestoes.map(s => (
                                            <button key={s.id}
                                                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100"
                                                onClick={() => usarSugestao(s)}>
                                                {s.nome} <span className="text-xs text-slate-400">({s.unidade})</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </td>
                            <td /><td />
                            <td><input className="w-full bg-transparent px-2 py-2 text-right text-sm outline-none"
                                placeholder="qtde" value={novo.quantidade}
                                onChange={e => setNovo(n => ({ ...n, quantidade: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && void criarLinha()} /></td>
                            <td><input className="w-full bg-transparent px-2 py-2 text-right text-sm outline-none"
                                placeholder="fator" value={novo.fator}
                                onChange={e => setNovo(n => ({ ...n, fator: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && void criarLinha()} /></td>
                            <td><input className="w-full bg-transparent px-2 py-2 text-right text-sm outline-none"
                                placeholder="R$" value={novo.preco}
                                onChange={e => setNovo(n => ({ ...n, preco: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && void criarLinha()} /></td>
                            <td colSpan={3} className="px-2 text-xs text-slate-400">Enter salva</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Preview do paste (rel. 09/20: sempre confirmar antes de gravar) */}
            <Modal isOpen={preview !== null} onClose={() => setPreview(null)}
                maxWidth="max-w-3xl" title={`Colar ${preview?.length ?? 0} itens da planilha`}>
                <div className="space-y-3">
                    {avisosPaste.map((a, i) => (
                        <p key={i} className="text-xs text-amber-600">⚠ {a}</p>
                    ))}
                    <div className="max-h-80 overflow-y-auto rounded border border-slate-200">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                                <tr><th className="px-2 py-1 text-left">Descrição</th>
                                    <th className="px-2 py-1 text-right">Qtde</th>
                                    <th className="px-2 py-1 text-right">Fator</th>
                                    <th className="px-2 py-1 text-right">Valor Unit.</th>
                                    <th className="px-2 py-1 text-left">Formato</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(preview ?? []).map((l, i) => (
                                    <tr key={i}>
                                        <td className="px-2 py-1">{l.descricao}</td>
                                        <td className="px-2 py-1 text-right">{l.quantidade}</td>
                                        <td className="px-2 py-1 text-right">{l.fator}</td>
                                        <td className="px-2 py-1 text-right">
                                            {l.precoUnitario != null ? formatBRL(l.precoUnitario) : '—'}
                                        </td>
                                        <td className="px-2 py-1 text-xs text-slate-500">{l.formato ?? ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setPreview(null)}>Cancelar</Button>
                        <Button onClick={() => void confirmarPaste()}>
                            Importar {preview?.length ?? 0} itens
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
