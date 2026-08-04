/**
 * A GRADE — planilha com superpoderes (RNF-001/002/003).
 * Agrupada por SEÇÃO/centro de custo (RF-055: Julgamento por raça, Estrutura,
 * Diversos) com SUBTOTAIS como as planilhas reais do usuário. Digitou-salvou,
 * colar do Excel com preview (RF-012), qtd × fator × unitário (RF-053),
 * autocomplete via busca "Mercado Livre" (RF-049).
 */

import React, { useMemo, useRef, useState } from 'react';
import { Button, Modal, Badge } from '../UI';
import { custosService } from '../../services/custosService';
import { processarPaste, type LinhaColada } from '../../utils/pasteTSV';
import { formatBRL, parseNumeroBR } from '../../utils/parseBR';
import { calcularTotalItem } from '../../utils/custosCalc';
import type {
    CustoCategoria, CustoComposto, CustoItem, CustoItemInput, CustoProdutoBusca, CustoSecao,
} from '../../types/custos';

interface Props {
    itens: CustoItem[];
    categorias: CustoCategoria[];
    compostos: CustoComposto[];
    secoes: CustoSecao[];
    onCriar: (i: Omit<CustoItemInput, 'edicao_id'>) => Promise<unknown>;
    onCriarLote: (l: Omit<CustoItemInput, 'edicao_id'>[]) => Promise<void>;
    onAtualizar: (id: string, patch: Partial<CustoItemInput>) => Promise<void>;
    onExcluir: (id: string) => Promise<void>;
}

const STATUS_COR: Record<string, 'slate' | 'blue' | 'yellow' | 'green' | 'red'> = {
    rascunho: 'slate', orcado: 'blue', cotado: 'yellow',
    contratado: 'green', realizado: 'green', cancelado: 'red',
};

const Cell: React.FC<{
    valor: string; onSalvar: (v: string) => void; alinhar?: 'left' | 'right';
    /** texto exibido quando NÃO está editando (ex.: valor com máscara R$) */
    exibicao?: string;
}> = ({ valor, onSalvar, alinhar = 'left', exibicao }) => {
    const [v, setV] = useState(valor);
    const [editando, setEditando] = useState(false);
    return (
        <input
            className={`w-full bg-transparent px-2 py-1 text-sm outline-none focus:bg-amber-50 focus:ring-1 focus:ring-amber-300 rounded ${alinhar === 'right' ? 'text-right' : ''}`}
            title={exibicao ?? valor}
            value={editando ? v : (exibicao ?? valor)}
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

/** Ordena seções: pai (por ordem) seguido dos filhos; devolve rótulos prontos. */
export function ordenarSecoes(secoes: CustoSecao[]): { secao: CustoSecao; rotulo: string }[] {
    const pais = secoes.filter(s => !s.parent_id).sort((a, b) => a.ordem - b.ordem);
    const resultado: { secao: CustoSecao; rotulo: string }[] = [];
    for (const pai of pais) {
        const filhos = secoes.filter(s => s.parent_id === pai.id).sort((a, b) => a.ordem - b.ordem);
        if (filhos.length === 0) {
            resultado.push({ secao: pai, rotulo: pai.nome_curto });
        } else {
            for (const f of filhos) resultado.push({ secao: f, rotulo: `${pai.nome_curto} › ${f.nome_curto}` });
        }
    }
    return resultado;
}

export const GradeCustos: React.FC<Props> = ({
    itens, categorias, compostos, secoes, onCriar, onCriarLote, onAtualizar, onExcluir,
}) => {
    const [novo, setNovo] = useState({ descricao: '', quantidade: '', fator: '', preco: '' });
    const [novaSecao, setNovaSecao] = useState<string>('');
    const [sugestoes, setSugestoes] = useState<CustoProdutoBusca[]>([]);
    const [preview, setPreview] = useState<LinhaColada[] | null>(null);
    const [avisosPaste, setAvisosPaste] = useState<string[]>([]);
    const [filtroComposto, setFiltroComposto] = useState<string>('todos');
    const descRef = useRef<HTMLInputElement>(null);

    const nomeComposto = useMemo(
        () => Object.fromEntries(compostos.map(c => [c.id, c.nome])), [compostos]);
    void nomeComposto;

    // Evento sem espaços instanciados: a coluna "Espaço" e o filtro somem
    // (só poluiriam — tudo seria "geral"). Voltam quando houver compostos.
    const temEspacos = compostos.length > 0;

    const visiveis = useMemo(() => {
        if (filtroComposto === 'todos') return itens;
        if (filtroComposto === 'geral') return itens.filter(i => !i.composto_id);
        return itens.filter(i => i.composto_id === filtroComposto);
    }, [itens, filtroComposto]);

    // ── Agrupamento por seção (RF-055) com subtotais A/B/C ──────────────────
    const secoesOrdenadas = useMemo(() => ordenarSecoes(secoes), [secoes]);
    const grupos = useMemo(() => {
        const porSecao = new Map<string | null, CustoItem[]>();
        for (const i of visiveis) {
            const chave = i.secao_id ?? null;
            porSecao.set(chave, [...(porSecao.get(chave) ?? []), i]);
        }
        const resultado: { rotulo: string; letra: string; itens: CustoItem[]; subtotal: number }[] = [];
        let letra = 65; // 'A'
        for (const { secao, rotulo } of secoesOrdenadas) {
            const doGrupo = porSecao.get(secao.id) ?? [];
            if (doGrupo.length === 0) continue;
            resultado.push({
                rotulo,
                letra: String.fromCharCode(letra++),
                itens: doGrupo,
                subtotal: doGrupo.reduce((s, i) => s + (Number(i.total_orcado) || 0), 0),
            });
        }
        const semSecao = porSecao.get(null) ?? [];
        if (semSecao.length > 0) {
            resultado.push({
                rotulo: 'Sem seção',
                letra: String.fromCharCode(letra),
                itens: semSecao,
                subtotal: semSecao.reduce((s, i) => s + (Number(i.total_orcado) || 0), 0),
            });
        }
        return resultado;
    }, [visiveis, secoesOrdenadas]);

    const totalGeral = useMemo(
        () => grupos.reduce((s, g) => s + g.subtotal, 0), [grupos]);

    // Colunas de texto se ajustam ao MAIOR nome EM USO (sem "..." enquanto
    // houver tela livre; sem reservar espaço morto quando não houver nome grande).
    const descWidthCh = useMemo(() => {
        const maior = visiveis.reduce((m, i) => Math.max(m, i.descricao.length), 0);
        return Math.min(Math.max(24, maior + 3), 60);
    }, [visiveis]);

    const secWidthCh = useMemo(() => {
        const maior = secoesOrdenadas.reduce((m, s) => Math.max(m, s.secao.nome_curto.length), 0);
        return Math.min(Math.max(12, maior + 5), 24); // +5 = seta do select
    }, [secoesOrdenadas]);

    const catWidthCh = useMemo(() => {
        const usadas = new Set(visiveis.map(i => i.categoria_id).filter(Boolean));
        const maior = categorias
            .filter(c => usadas.has(c.id))
            .reduce((m, c) => Math.max(m, c.nome.length), 0);
        return Math.min(Math.max(14, maior + 5), 34);
    }, [visiveis, categorias]);

    // Dinheiro NUNCA oculto (nem no zoom): larguras em ch = maior valor em uso,
    // escalam junto com a fonte.
    const unitWidthCh = useMemo(() => {
        const maior = visiveis.reduce((m, i) =>
            Math.max(m, i.preco_unitario_orcado != null ? formatBRL(i.preco_unitario_orcado).length : 0), 0);
        return Math.min(Math.max(11, maior + 2), 20);
    }, [visiveis]);

    const totalWidthCh = useMemo(() => {
        const maiorItem = visiveis.reduce((m, i) => Math.max(m, formatBRL(Number(i.total_orcado) || 0).length), 0);
        const soma = visiveis.reduce((s, i) => s + (Number(i.total_orcado) || 0), 0);
        return Math.min(Math.max(12, Math.max(maiorItem, formatBRL(soma).length) + 2), 22);
    }, [visiveis]);

    // Coluna PARTICIPAÇÃO das planilhas reais: % do item/seção sobre o total
    const pct = (v: number) =>
        totalGeral > 0
            ? `${((v / totalGeral) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
            : '—';

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

    const criarLinha = async () => {
        if (!novo.descricao.trim()) return;
        await onCriar({
            descricao: novo.descricao,
            quantidade: parseNumeroBR(novo.quantidade) ?? 1,
            fator: parseNumeroBR(novo.fator) ?? 1,
            preco_unitario_orcado: parseNumeroBR(novo.preco),
            secao_id: novaSecao || null,
            composto_id: filtroComposto !== 'todos' && filtroComposto !== 'geral' ? filtroComposto : null,
        });
        setNovo({ descricao: '', quantidade: '', fator: '', preco: '' });
        setSugestoes([]);
        descRef.current?.focus();
    };

    const aoColar = (e: React.ClipboardEvent) => {
        const texto = e.clipboardData.getData('text/plain');
        if (!texto || !texto.includes('\t')) return;
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
            secao_id: novaSecao || null,
            composto_id: filtroComposto !== 'todos' && filtroComposto !== 'geral' ? filtroComposto : null,
        })));
        setPreview(null);
    };

    const numero = (v: string, fallback: number) => {
        const n = parseNumeroBR(v);
        return n !== null && n > 0 ? n : fallback;
    };

    // Função de render (não componente aninhado) — evita remontagem das linhas
    // a cada estado novo, que faria inputs em edição perderem o foco.
    const renderLinhaItem = (item: CustoItem) => (
        <tr key={item.id} className="hover:bg-slate-50">
            <td><Cell valor={item.descricao}
                onSalvar={v => void onAtualizar(item.id, { descricao: v })} /></td>
            <td className="px-1">
                <select
                    className="w-full truncate bg-transparent py-1 pr-4 text-xs"
                    value={item.secao_id ?? ''}
                    title={secoesOrdenadas.find(s => s.secao.id === item.secao_id)?.rotulo ?? ''}
                    onChange={e => void onAtualizar(item.id, { secao_id: e.target.value || null })}
                >
                    <option value="">—</option>
                    {secoesOrdenadas.map(({ secao }) => (
                        <option key={secao.id} value={secao.id}>{secao.nome_curto}</option>
                    ))}
                </select>
            </td>
            {temEspacos && (
                <td className="px-1">
                    <select
                        className="w-full truncate bg-transparent py-1 pr-4 text-xs"
                        value={item.composto_id ?? ''}
                        onChange={e => void onAtualizar(item.id, { composto_id: e.target.value || null })}
                    >
                        <option value="">— geral —</option>
                        {compostos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                </td>
            )}
            <td className="px-1">
                <select
                    className="w-full truncate bg-transparent py-1 pr-4 text-xs"
                    value={item.categoria_id ?? ''}
                    title={categorias.find(c => c.id === item.categoria_id)?.nome ?? ''}
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
                exibicao={item.preco_unitario_orcado != null ? formatBRL(item.preco_unitario_orcado) : ''}
                onSalvar={v => void onAtualizar(item.id, { preco_unitario_orcado: parseNumeroBR(v) })} /></td>
            <td className="whitespace-nowrap px-2 py-1 text-right font-medium">
                {formatBRL(item.total_orcado ?? calcularTotalItem(item.quantidade, item.preco_unitario_orcado ?? 0, item.fator))}
            </td>
            <td className="px-2 py-1 text-right text-xs text-slate-500">
                {pct(Number(item.total_orcado) || 0)}
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
                    <button className="text-slate-300 hover:text-red-500" title="Excluir"
                        onClick={() => void onExcluir(item.id)}>×</button>
                )}
            </td>
        </tr>
    );

    return (
        <div onPaste={aoColar}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
                {temEspacos && (
                    <select
                        className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                        value={filtroComposto}
                        onChange={e => setFiltroComposto(e.target.value)}
                    >
                        <option value="todos">Todos os itens</option>
                        <option value="geral">Gerais do evento (sem espaço)</option>
                        {compostos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                )}
                <span className="text-xs text-slate-400">
                    Cole aqui um bloco do Excel (Ctrl+V) que eu estruturo.
                </span>
                <span className="ml-auto text-sm font-semibold">
                    CUSTO TOTAL: {formatBRL(totalGeral)}
                </span>
            </div>

            <div className="w-fit max-w-full overflow-x-auto rounded-lg border border-slate-200">
                {/* table-fixed com Descrição dimensionada pelo maior nome visível:
                    a tabela abraça o conteúdo, sem coluna esticada à toa. */}
                <table className="table-fixed text-sm">
                    <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500">
                        <tr>
                            <th className="px-2 py-2" style={{ width: `${descWidthCh}ch` }}>Descrição</th>
                            <th className="px-2 py-2" style={{ width: `${secWidthCh}ch` }}>Seção</th>
                            {temEspacos && <th className="px-2 py-2 w-32">Espaço</th>}
                            <th className="px-2 py-2" style={{ width: `${catWidthCh}ch` }}>Categoria</th>
                            <th className="px-2 py-2 w-14 text-right">Qtde</th>
                            <th className="px-2 py-2 w-14 text-right">Fator</th>
                            <th className="px-2 py-2 text-right" style={{ width: `${unitWidthCh}ch` }}>Valor Unit.</th>
                            <th className="px-2 py-2 text-right" style={{ width: `${totalWidthCh}ch` }}>Total</th>
                            <th className="px-2 py-2 text-right" style={{ width: '8ch' }}>Part.</th>
                            <th className="px-2 py-2 w-24">Status</th>
                            <th className="px-2 py-2 w-7" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {grupos.map(g => (
                            <React.Fragment key={g.rotulo}>
                                <tr className="bg-slate-200/70">
                                    <td colSpan={temEspacos ? 11 : 10} className="px-2 py-1.5 text-xs font-bold uppercase tracking-wide">
                                        {g.rotulo}
                                    </td>
                                </tr>
                                {g.itens.map(item => renderLinhaItem(item))}
                                <tr className="bg-slate-50">
                                    <td colSpan={temEspacos ? 7 : 6} className="px-2 py-1 text-right text-xs font-semibold uppercase text-slate-500">
                                        Subtotal ({g.letra})
                                    </td>
                                    <td className="whitespace-nowrap px-2 py-1 text-right font-bold">{formatBRL(g.subtotal)}</td>
                                    <td className="px-2 py-1 text-right text-xs font-bold text-slate-600">{pct(g.subtotal)}</td>
                                    <td colSpan={2} />
                                </tr>
                            </React.Fragment>
                        ))}

                        {/* Linha nova — digite e Enter */}
                        <tr className="bg-amber-50/40">
                            <td className="relative">
                                <input
                                    ref={descRef}
                                    className="w-full bg-transparent px-2 py-2 text-sm outline-none"
                                    placeholder="+ novo item…"
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
                            <td className="px-1">
                                <select
                                    className="w-full truncate bg-transparent py-1 pr-4 text-xs"
                                    value={novaSecao}
                                    onChange={e => setNovaSecao(e.target.value)}
                                >
                                    <option value="">seção…</option>
                                    {secoesOrdenadas.map(({ secao }) => (
                                        <option key={secao.id} value={secao.id}>{secao.nome_curto}</option>
                                    ))}
                                </select>
                            </td>
                            {temEspacos && <td />}<td />
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
                            <td colSpan={4} className="px-2 text-xs text-slate-400">Enter salva (na seção escolhida)</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <Modal isOpen={preview !== null} onClose={() => setPreview(null)}
                maxWidth="max-w-3xl" title={`Colar ${preview?.length ?? 0} itens da planilha`}>
                <div className="space-y-3">
                    <p className="text-xs text-slate-500">
                        Os itens entram na seção escolhida na linha de baixo da grade
                        {novaSecao ? '' : ' (nenhuma escolhida — entram "sem seção", dá para mover depois)'}.
                    </p>
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
