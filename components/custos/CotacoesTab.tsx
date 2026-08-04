/**
 * Cotações: agrupar itens por categoria com desmarcação (RF-036 — "não quero
 * os dos stands"), gerar a planilha bloqueada por fornecedor (RF-029),
 * importar a resposta e comparar no mapa item × fornecedor (RF-011/052).
 */

import React, { useMemo, useRef, useState } from 'react';
import { Button, Card, Modal } from '../UI';
import { formatBRL } from '../../utils/parseBR';
import {
    gerarPlanilhaCotacao,
    importarPlanilhaCotacao,
} from '../../services/custosXlsxService';
import { montarMapaCotacao, type PedidoComItens } from '../../services/custosService';
import type { CustoCategoria, CustoComposto, CustoFornecedor, CustoItem } from '../../types/custos';

interface Props {
    itens: CustoItem[];
    categorias: CustoCategoria[];
    compostos: CustoComposto[];
    fornecedores: CustoFornecedor[];
    pedidos: PedidoComItens[];
    onCriarPedido: (nome: string, categoriaId: string | null, itens: { itemId: string; quantidade: number }[]) => Promise<void>;
    onImportarCotacao: (p: {
        pedidoId: string; fornecedorId: string;
        linhas: { itemId: string; precoUnitario: number; quantidade: number }[];
        exclusoes: { chave: string; resposta: string }[];
    }) => Promise<void>;
    onContratar: (cotacaoId: string, itemId: string) => Promise<void>;
}

function baixar(buffer: ArrayBuffer, nome: string) {
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    a.click();
    URL.revokeObjectURL(url);
}

export const CotacoesTab: React.FC<Props> = ({
    itens, categorias, compostos, fornecedores, pedidos,
    onCriarPedido, onImportarCotacao, onContratar,
}) => {
    const [modalAberto, setModalAberto] = useState(false);
    const [categoriaSel, setCategoriaSel] = useState<string>('');
    const [marcados, setMarcados] = useState<Record<string, boolean>>({});
    const [nomePedido, setNomePedido] = useState('');
    const [fornecedorPorPedido, setFornecedorPorPedido] = useState<Record<string, string>>({});
    const [ocupado, setOcupado] = useState(false);
    const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const nomeComposto = useMemo(
        () => Object.fromEntries(compostos.map(c => [c.id, c.nome])), [compostos]);
    const itemPorId = useMemo(
        () => Object.fromEntries(itens.map(i => [i.id, i])), [itens]);

    // Itens da categoria escolhida, de TODOS os compostos (RF-036)
    const candidatos = useMemo(
        () => itens.filter(i => categoriaSel && i.categoria_id === categoriaSel && !i.avulso),
        [itens, categoriaSel],
    );

    const abrirModal = (categoriaId: string) => {
        setCategoriaSel(categoriaId);
        const cat = categorias.find(c => c.id === categoriaId);
        setNomePedido(cat ? cat.nome : 'Pedido');
        setMarcados({});
        setModalAberto(true);
    };

    const criarPedido = async () => {
        const escolhidos = candidatos
            .filter(i => marcados[i.id] ?? true)
            .map(i => ({ itemId: i.id, quantidade: (Number(i.quantidade) || 1) * (Number(i.fator) || 1) }));
        if (escolhidos.length === 0) return;
        setOcupado(true);
        try {
            await onCriarPedido(nomePedido, categoriaSel, escolhidos);
            setModalAberto(false);
        } finally { setOcupado(false); }
    };

    const gerarXlsx = async (pedido: PedidoComItens) => {
        const fid = fornecedorPorPedido[pedido.id];
        const f = fornecedores.find(x => x.id === fid);
        if (!f) return;
        const buf = await gerarPlanilhaCotacao({
            pedidoNome: pedido.nome,
            fornecedor: { razao_social: f.razao_social, cnpj: f.cnpj },
            itens: pedido.itens.map(pi => {
                const it = itemPorId[pi.item_id];
                return {
                    itemId: pi.item_id,
                    descricao: it?.descricao ?? '?',
                    formato: it?.formato ?? null,
                    quantidade: pi.quantidade,
                    unidade: it?.unidade ?? 'un',
                };
            }),
        });
        baixar(buf as ArrayBuffer, `Cotacao - ${pedido.nome} - ${f.razao_social}.xlsx`);
    };

    const importarXlsx = async (pedido: PedidoComItens, file: File) => {
        const fid = fornecedorPorPedido[pedido.id];
        if (!fid) return;
        setOcupado(true);
        try {
            const r = await importarPlanilhaCotacao(await file.arrayBuffer());
            const qtdPorItem = Object.fromEntries(pedido.itens.map(pi => [pi.item_id, pi.quantidade]));
            await onImportarCotacao({
                pedidoId: pedido.id,
                fornecedorId: fid,
                linhas: r.linhas.map(l => ({
                    itemId: l.itemId,
                    precoUnitario: l.precoUnitario,
                    quantidade: qtdPorItem[l.itemId] ?? 1,
                })),
                exclusoes: r.exclusoes,
            });
            if (r.avisos.length > 0) alert(`Importado com avisos:\n${r.avisos.join('\n')}`);
        } finally { setOcupado(false); }
    };

    return (
        <div className="space-y-4">
            <Card className="p-4">
                <h3 className="mb-2 font-semibold">Novo pedido de orçamento</h3>
                <p className="mb-3 text-xs text-slate-500">
                    Escolha a categoria: eu junto os itens dela de TODOS os espaços e você desmarca o que não entra
                    (ex.: o piso dos stands).
                </p>
                <div className="flex flex-wrap gap-2">
                    {categorias.map(c => (
                        <Button key={c.id} variant="outline" onClick={() => abrirModal(c.id)}>
                            {c.nome}{c.pacote_unico ? ' 📦' : ''}
                        </Button>
                    ))}
                </div>
            </Card>

            {pedidos.map(pedido => {
                const mapa = montarMapaCotacao(
                    pedido.itens.map(pi => ({
                        itemId: pi.item_id,
                        descricao: itemPorId[pi.item_id]?.descricao ?? '?',
                        quantidade: pi.quantidade,
                    })),
                    pedido.cotacoes,
                );
                return (
                    <Card key={pedido.id} className="p-4">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">{pedido.nome}</h3>
                            <span className="text-xs text-slate-400">{pedido.itens.length} itens</span>
                            <div className="ml-auto flex items-center gap-2">
                                <select
                                    className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                                    value={fornecedorPorPedido[pedido.id] ?? ''}
                                    onChange={e => setFornecedorPorPedido(m => ({ ...m, [pedido.id]: e.target.value }))}
                                >
                                    <option value="">Fornecedor…</option>
                                    {fornecedores.map(f => (
                                        <option key={f.id} value={f.id}>{f.razao_social}</option>
                                    ))}
                                </select>
                                <Button variant="outline" disabled={!fornecedorPorPedido[pedido.id]}
                                    onClick={() => void gerarXlsx(pedido)}>
                                    ⬇ Gerar planilha
                                </Button>
                                <Button variant="outline" disabled={!fornecedorPorPedido[pedido.id] || ocupado}
                                    onClick={() => fileRefs.current[pedido.id]?.click()}>
                                    ⬆ Importar resposta
                                </Button>
                                <input
                                    type="file" accept=".xlsx" className="hidden"
                                    ref={el => { fileRefs.current[pedido.id] = el; }}
                                    onChange={e => {
                                        const f = e.target.files?.[0];
                                        if (f) void importarXlsx(pedido, f);
                                        e.target.value = '';
                                    }}
                                />
                            </div>
                        </div>

                        {pedido.cotacoes.length > 0 && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                                        <tr>
                                            <th className="px-2 py-1 text-left">Item</th>
                                            <th className="px-2 py-1 text-right">Qtde</th>
                                            {mapa.fornecedores.map(f => (
                                                <th key={f.id} className="px-2 py-1 text-right">
                                                    {f.nome}
                                                    <span className="block font-normal normal-case text-slate-400">
                                                        cotou {f.cobertura} · all-in {formatBRL(f.totalAllIn)}
                                                    </span>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {mapa.linhas.map(l => (
                                            <tr key={l.itemId}>
                                                <td className="px-2 py-1">
                                                    {l.descricao}
                                                    {itemPorId[l.itemId]?.composto_id && (
                                                        <span className="ml-1 text-xs text-slate-400">
                                                            ({nomeComposto[itemPorId[l.itemId]!.composto_id!]})
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-2 py-1 text-right">{l.quantidade}</td>
                                                {mapa.fornecedores.map(f => {
                                                    const preco = l.precos[f.id];
                                                    const menor = l.menorFornecedorId === f.id;
                                                    const cot = pedido.cotacoes.find(c => c.fornecedor_id === f.id);
                                                    return (
                                                        <td key={f.id}
                                                            className={`px-2 py-1 text-right ${menor ? 'bg-green-50 font-semibold text-green-700' : ''}`}>
                                                            {preco === undefined ? '—' : formatBRL(preco)}
                                                            {menor && cot &&
                                                                itemPorId[l.itemId]?.status !== 'contratado' && (
                                                                <button
                                                                    className="ml-1 rounded bg-green-600 px-1.5 text-[10px] text-white"
                                                                    title="Contratar este item com este fornecedor (split award)"
                                                                    onClick={() => void onContratar(cot.id, l.itemId)}>
                                                                    contratar
                                                                </button>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <p className="mt-2 text-xs text-slate-500">
                                    💡 Fechando o menor preço por item: <b>{formatBRL(mapa.totalMenorPorItem)}</b> (sugestão — a decisão é sua)
                                </p>
                            </div>
                        )}
                    </Card>
                );
            })}

            <Modal isOpen={modalAberto} onClose={() => setModalAberto(false)} maxWidth="max-w-2xl"
                title="Agrupar itens para cotação">
                <div className="space-y-3">
                    <input
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                        value={nomePedido}
                        onChange={e => setNomePedido(e.target.value)}
                        placeholder="Nome do pedido (ex.: Tendas do evento)"
                    />
                    <div className="max-h-72 space-y-1 overflow-y-auto">
                        {candidatos.length === 0 && (
                            <p className="text-sm text-slate-400">
                                Nenhum item desta categoria ainda — categorize os itens na grade primeiro.
                            </p>
                        )}
                        {candidatos.map(i => (
                            <label key={i.id}
                                className="flex items-center gap-2 rounded border border-slate-200 px-3 py-1.5 text-sm">
                                <input
                                    type="checkbox"
                                    checked={marcados[i.id] ?? true}
                                    onChange={e => setMarcados(m => ({ ...m, [i.id]: e.target.checked }))}
                                />
                                <span className="flex-1">
                                    {i.descricao}
                                    {i.composto_id && (
                                        <span className="ml-1 text-xs text-slate-400">({nomeComposto[i.composto_id]})</span>
                                    )}
                                </span>
                                <span className="text-xs text-slate-500">
                                    {i.quantidade}{i.fator !== 1 ? ` × ${i.fator}` : ''} {i.unidade}
                                </span>
                            </label>
                        ))}
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setModalAberto(false)}>Cancelar</Button>
                        <Button disabled={ocupado || candidatos.length === 0} onClick={() => void criarPedido()}>
                            Criar pedido
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
