import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button } from '../components/UI';
import { planilhaVendasService, PlanilhaConfig, PlanilhaEstande, CategoriaSetup } from '../services/planilhaVendasService';
import { itensOpcionaisService, ItemOpcional } from '../services/itensOpcionaisService';
import { clientesService, Cliente } from '../services/clientesService';
import ClienteSelectorPopup from '../components/ClienteSelectorPopup';

// Module-level constant — not recreated on every render
const naturalSort = (a: string, b: string) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

const PlanilhaVendas: React.FC = () => {
    const { edicaoId } = useParams<{ edicaoId: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState<PlanilhaConfig | null>(null);
    const [rows, setRows] = useState<PlanilhaEstande[]>([]);
    const [allItensOpcionais, setAllItensOpcionais] = useState<ItemOpcional[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [popupRowId, setPopupRowId] = useState<string | null>(null);
    const [editing, setEditing] = useState<{ id: string; field: string; val: string } | null>(null);
    const [pendingAction, setPendingAction] = useState<{ rowId: string; field: string } | null>(null);

    useEffect(() => {
        if (edicaoId) loadData();
    }, [edicaoId]);

    // Clear pending action on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setPendingAction(null); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const configData = await planilhaVendasService.getConfig(edicaoId!);
            if (!configData) {
                if (confirm('Nenhuma configuração encontrada. Deseja configurar agora?')) {
                    navigate(`/configuracao-vendas/${edicaoId}`);
                }
                return;
            }

            const [estandes, opcionais, listaClientes] = await Promise.all([
                planilhaVendasService.getEstandes(configData.id),
                itensOpcionaisService.getItens(),
                clientesService.getClientes()
            ]);

            setConfig(configData);
            setRows(estandes);
            setAllItensOpcionais(opcionais);
            setClientes(listaClientes);
        } catch (err) {
            console.error('Erro ao carregar dados:', err);
        } finally {
            setLoading(false);
        }
    };

    // ─── Derived data ─────────────────────────────────────────────
    const categorias = useMemo<CategoriaSetup[]>(
        () => config ? (config.categorias_config as unknown as CategoriaSetup[]) : [],
        [config]
    );

    const opcionaisAtivos = useMemo<ItemOpcional[]>(() => {
        if (!config?.opcionais_ativos) return [];
        return allItensOpcionais.filter(item => config.opcionais_ativos?.includes(item.id));
    }, [config, allItensOpcionais]);

    const numCombos = useMemo(() => {
        let max = 0;
        categorias.forEach(c => {
            const len = Array.isArray(c.combos) ? c.combos.length : 3;
            if (len > max) max = len;
        });
        return max;
    }, [categorias]);

    const comboLabels = useMemo(() => {
        const labels = ['STAND PADRÃO'];
        for (let i = 1; i <= numCombos; i++) labels.push(`COMBO ${String(i).padStart(2, '0')}`);
        return labels;
    }, [numCombos]);

    const formatMoney = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

    // ─── Row helpers ──────────────────────────────────────────────
    // Espelha a lógica de buildStandNr: match pelo prefixo (se existir) ou pela tag
    const getCategoriaOfRow = useCallback((row: PlanilhaEstande): CategoriaSetup | undefined => {
        const nr = row.stand_nr.toLowerCase();

        // Ordena do identificador mais longo para o mais curto para evitar falso match (ex: "M" casando "MA 01")
        const sortedCats = [...categorias].sort((a, b) => {
            const idA = (a.prefix || a.tag || '').length;
            const idB = (b.prefix || b.tag || '').length;
            return idB - idA;
        });

        return sortedCats.find(c => {
            const id = (c.prefix || c.tag || '').toLowerCase().trim();
            if (!id) return false;
            // Match exato: "M 01" começa com "m " ou é apenas "m"
            return nr === id || nr.startsWith(`${id} `);
        });
    }, [categorias]);

    const precosEdicao = useMemo<Record<string, number>>(
        () => (config?.opcionais_precos as Record<string, number>) || {},
        [config]
    );

    const getPrecoForCombo = (cat: CategoriaSetup | undefined, tipoVenda: string): number => {
        if (!cat || tipoVenda.includes('*')) return 0;
        const tipo = tipoVenda.replace('*', '').trim();
        if (tipo === 'STAND PADRÃO') return cat.standBase || 0;
        const match = tipo.match(/COMBO (\d+)/);
        if (match) {
            const idx = parseInt(match[1], 10) - 1;
            if (Array.isArray(cat.combos)) return (cat.combos as number[])[idx] || 0;
        }
        return 0;
    };

    const calculateRow = useCallback((row: PlanilhaEstande) => {
        const cat = getCategoriaOfRow(row);
        const precoBase = getPrecoForCombo(cat, row.tipo_venda);

        const selecoes = (row.opcionais_selecionados as Record<string, string>) || {};
        let totalOpcionais = 0;
        opcionaisAtivos.forEach(opt => {
            if (selecoes[opt.nome] === 'x') {
                const preco = precosEdicao[opt.id] !== undefined
                    ? Number(precosEdicao[opt.id])
                    : Number(opt.preco_base);
                totalOpcionais += preco;
            }
        });

        const subTotal = precoBase + totalOpcionais;
        const desconto = Number(row.desconto) || 0;
        const totalVenda = subTotal - desconto;
        const valorPago = Number(row.valor_pago) || 0;
        const pendente = totalVenda - valorPago;

        return { precoBase, totalOpcionais, subTotal, desconto, totalVenda, valorPago, pendente };
    }, [getCategoriaOfRow, opcionaisAtivos, precosEdicao]);

    // ─── Summary row ─────────────────────────────────────────────
    const summary = useMemo(() => {
        const comboXCounts: Record<string, number> = {};
        const comboStarCounts: Record<string, number> = {};
        const optCounts: Record<string, number> = {};

        comboLabels.forEach(l => { comboXCounts[l] = 0; comboStarCounts[l] = 0; });
        opcionaisAtivos.forEach(o => { optCounts[o.nome] = 0; });

        rows.forEach(row => {
            const tipo = row.tipo_venda;
            if (tipo !== 'DISPONÍVEL') {
                const isStar = tipo.endsWith('*');
                const baseLabel = tipo.replace('*', '').trim();
                if (isStar) comboStarCounts[baseLabel] = (comboStarCounts[baseLabel] || 0) + 1;
                else comboXCounts[baseLabel] = (comboXCounts[baseLabel] || 0) + 1;
            }
            const sel = (row.opcionais_selecionados as Record<string, string>) || {};
            opcionaisAtivos.forEach(opt => {
                const val = sel[opt.nome];
                if (val === 'x' || val === '*') optCounts[opt.nome] = (optCounts[opt.nome] || 0) + 1;
            });
        });

        return { comboXCounts, comboStarCounts, optCounts };
    }, [rows, comboLabels, opcionaisAtivos]);

    const totals = useMemo(() => rows.reduce((acc, row) => {
        const c = calculateRow(row);
        acc.subTotal += c.subTotal;
        acc.desconto += c.desconto;
        acc.totalVenda += c.totalVenda;
        acc.valorPago += c.valorPago;
        acc.pendente += c.pendente;
        return acc;
    }, { subTotal: 0, desconto: 0, totalVenda: 0, valorPago: 0, pendente: 0 }), [rows, calculateRow]);

    // ─── Update handlers ──────────────────────────────────────────
    const handleSelectCombo = async (rowId: string, comboLabel: string) => {
        const row = rows.find(r => r.id === rowId);
        if (!row) return;
        let newTipo: string;
        if (row.tipo_venda === comboLabel) newTipo = comboLabel + '*';
        else if (row.tipo_venda === comboLabel + '*') newTipo = 'DISPONÍVEL';
        else newTipo = comboLabel;
        setRows(prev => prev.map(r => r.id === rowId ? { ...r, tipo_venda: newTipo } : r));
        planilhaVendasService.updateEstande(rowId, { tipo_venda: newTipo }).catch(err =>
            console.error('Erro ao salvar combo:', err)
        );
    };

    const handleToggleOpcional = async (rowId: string, optNome: string) => {
        const row = rows.find(r => r.id === rowId);
        if (!row) return;
        const sel = { ...((row.opcionais_selecionados as Record<string, string>) || {}) };
        const cur = sel[optNome] || '';
        if (cur === '') sel[optNome] = 'x';
        else if (cur === 'x') sel[optNome] = '*';
        else sel[optNome] = '';
        setRows(prev => prev.map(r => r.id === rowId ? { ...r, opcionais_selecionados: sel } : r));
        planilhaVendasService.updateEstande(rowId, { opcionais_selecionados: sel }).catch(err =>
            console.error('Erro ao salvar opcional:', err)
        );
    };

    const handleUpdateField = (rowId: string, field: string, value: unknown) => {
        setRows(prev => prev.map(r => r.id === rowId ? { ...r, [field]: value } : r));
        planilhaVendasService.updateEstande(rowId, { [field]: value } as Partial<PlanilhaEstande>).catch(err =>
            console.error(`Erro ao salvar ${field}:`, err)
        );
    };

    const handleObsChange = (rowId: string, value: string) => {
        setRows(rows.map(r => r.id === rowId ? { ...r, observacoes: value } : r));
    };

    const handleObsBlur = (rowId: string, value: string) => {
        planilhaVendasService.updateEstande(rowId, { observacoes: value }).catch(err =>
            console.error('Erro ao salvar obs:', err)
        );
    };

    const handleClienteSelect = (rowId: string, clienteId: string | null, nomeLivre: string | null) => {
        setRows(prev => prev.map(r =>
            r.id === rowId ? { ...r, cliente_id: clienteId, cliente_nome_livre: nomeLivre } : r
        ));
        planilhaVendasService.updateEstande(rowId, { cliente_id: clienteId, cliente_nome_livre: nomeLivre }).catch(err =>
            console.error('Erro ao salvar cliente:', err)
        );
    };

    // ─── Render ───────────────────────────────────────────────────
    const filtered = useMemo(() => {
        const arr = rows.filter(r =>
            r.stand_nr.toLowerCase().includes(searchTerm.toLowerCase()) ||
            clientes.find(c => c.id === r.cliente_id)?.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            clientes.find(c => c.id === r.cliente_id)?.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.cliente_nome_livre?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return arr.sort((a, b) => {
            const catA = getCategoriaOfRow(a);
            const catB = getCategoriaOfRow(b);
            const ordA = catA?.ordem ?? 0;
            const ordB = catB?.ordem ?? 0;

            // 1. Ordem numérica explícita
            if (ordA !== ordB) return ordA - ordB;

            // 2. Desempate por Ordem de Inserção na Configuração (para quando a Ordem é 1-1, 2-2)
            if (catA && catB) {
                const idxA = categorias.findIndex(c => c === catA);
                const idxB = categorias.findIndex(c => c === catB);
                if (idxA !== idxB) return idxA - idxB;
            }

            // 3. Desempate dentro do mesmo prefixo/categoria: M 01, M 02
            return naturalSort(a.stand_nr, b.stand_nr);
        });
    }, [rows, clientes, searchTerm, getCategoriaOfRow, categorias]);

    if (loading) return <Layout title="Planilha"><div className="p-8 text-center">Carregando dados da planilha...</div></Layout>;

    const thStyle = "border border-slate-300 px-1 py-1 text-[11px] font-normal uppercase whitespace-nowrap text-white text-center bg-[#1F497D]";
    const tdStyle = "border border-slate-300 text-[12px] px-2 py-0 whitespace-nowrap";

    return (
        <Layout
            title="Planilha de Vendas"
            headerActions={
                <div className="flex gap-2 items-center">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/configuracao-vendas/${edicaoId}`)}>⚙️ Setup</Button>
                    <input
                        type="text"
                        placeholder="Buscar estande ou cliente..."
                        className="px-3 py-1.5 border rounded text-sm w-56"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            }
        >
            <div className="overflow-x-auto overflow-y-auto bg-white shadow-xl rounded-lg border border-slate-200" style={{ maxHeight: 'calc(100vh - 80px)' }}>
                <table className="border-collapse text-[11px] font-sans" style={{ minWidth: 'max-content' }}>
                    <thead className="sticky top-0 z-10 shadow-sm">

                        {/* ── Row 1: Summary Titles ── */}
                        <tr className="bg-slate-900 text-white">
                            <th colSpan={2} className="border border-white/10 px-2 py-1 text-left text-[11px] font-black tracking-widest text-slate-400 uppercase whitespace-nowrap">Resumo Geral</th>
                            {comboLabels.map(l => (
                                <th key={l} className="border border-white/10 text-[8px] text-slate-500 font-normal uppercase leading-none"></th>
                            ))}
                            {opcionaisAtivos.map(o => (
                                <th key={o.id} className="border border-white/10 text-[8px] text-slate-500 font-normal uppercase leading-none"></th>
                            ))}
                            <th className="border border-white/10 px-2 py-1 text-center text-[11px] text-slate-400 font-bold uppercase">SubTotal</th>
                            <th className="border border-white/10 px-2 py-1 text-center text-[11px] text-yellow-500/90 font-bold uppercase">Desconto</th>
                            <th className="border border-white/10 px-2 py-1 text-center text-[11px] text-white font-bold uppercase bg-slate-800/40">Total Vendas</th>
                            <th className="border border-white/10 px-2 py-1 text-center text-[11px] text-green-400 font-bold uppercase bg-slate-800/40">Pago</th>
                            <th className="border border-white/10 px-2 py-1 text-center text-[11px] text-red-400 font-bold uppercase bg-slate-800/40">Pendente</th>
                        </tr>

                        {/* ── Row 2: Summary Values ── */}
                        <tr className="bg-slate-800 text-slate-300">
                            <th className="border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-tighter">Num</th>
                            <th className="border border-white/10 px-2 py-0.5 text-[10px] text-left uppercase font-black text-slate-400">Totais:</th>
                            {comboLabels.map(label => {
                                const x = summary.comboXCounts[label] || 0;
                                const s = summary.comboStarCounts[label] || 0;
                                return (
                                    <th key={label} className="border border-white/10 px-1 py-0.5 text-center text-[10px] font-mono text-green-400 font-bold">
                                        {x + s}
                                    </th>
                                );
                            })}
                            {opcionaisAtivos.map(o => (
                                <th key={o.id} className="border border-white/10 px-1 py-0.5 text-center text-[10px] text-green-400 font-mono font-bold">
                                    {summary.optCounts[o.nome] || 0}
                                </th>
                            ))}
                            <th className={`${thStyle} text-right font-mono`}>{formatMoney(totals.subTotal)}</th>
                            <th className={`${thStyle} text-right font-mono text-yellow-400`}>{formatMoney(totals.desconto)}</th>
                            <th className={`${thStyle} text-right font-mono font-black text-white bg-slate-700/60 text-[12px]`}>{formatMoney(totals.totalVenda)}</th>
                            <th className={`${thStyle} text-right font-mono font-black text-green-400 bg-slate-700/60 text-[12px]`}>{formatMoney(totals.valorPago)}</th>
                            <th className={`${thStyle} text-right font-mono font-black text-red-400 bg-slate-700/60 text-[12px]`}>{formatMoney(totals.pendente)}</th>
                        </tr>

                        {/* ── Row 3: Column headers (Excel Style) ── */}
                        <tr className="bg-[#1F497D]">
                            <th className={`${thStyle} w-16`}>Stand</th>
                            <th className={`${thStyle} min-w-[180px]`}>Cliente:</th>
                            {comboLabels.map(label => (
                                <th key={label} className={`${thStyle} w-6 align-bottom p-0 font-normal`}>
                                    <div className="vertical-text h-20 flex items-end justify-center uppercase text-[8px] leading-none py-1 px-0.5 text-white font-normal">
                                        {label}
                                    </div>
                                </th>
                            ))}
                            {opcionaisAtivos.map(opt => (
                                <th key={opt.id} className={`${thStyle} w-6 align-bottom p-0 font-normal`}>
                                    <div className="vertical-text h-20 flex items-end justify-center uppercase text-[8px] leading-none py-1 px-0.5 font-normal">
                                        {opt.nome}
                                    </div>
                                </th>
                            ))}
                            <th className={`${thStyle}`}>SubTotal</th>
                            <th className={`${thStyle}`}>Desconto</th>
                            <th className={`${thStyle}`}>TOTAL</th>
                            <th className={`${thStyle} bg-[#385723]`}>PAGO</th>
                            <th className={`${thStyle} bg-[#C00000]`}>PENDENTE</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filtered.map(row => {
                            const cat = getCategoriaOfRow(row);
                            const calc = calculateRow(row);
                            const sel = (row.opcionais_selecionados as Record<string, string>) || {};

                            return (
                                <tr
                                    key={row.id}
                                    className={`${cat?.cor || 'bg-white'} border-b border-slate-300 hover:brightness-95`}
                                >
                                    {/* Stand nº */}
                                    <td className={`${tdStyle} px-1 py-0 align-middle w-[90px] min-w-[90px] max-w-[90px]`}>
                                        <div className="flex items-center gap-1 leading-none">
                                            {/* TAG: sempre visível, pequena */}
                                            {cat?.tag && (
                                                <span
                                                    className="text-[7px] text-slate-500/80 font-normal uppercase tracking-tighter text-left pointer-events-none shrink-0"
                                                    style={{ lineHeight: 1 }}
                                                >
                                                    {cat.tag}
                                                </span>
                                            )}
                                            {/* Se tem prefixo → mostra stand_nr completo ("M 01")
                                                Se não tem prefixo → retira a tag do início e mostra só o número ("01") */}
                                            <span className="flex-1 text-center font-bold text-[11px] whitespace-nowrap">
                                                {cat?.prefix?.trim()
                                                    ? row.stand_nr
                                                    : row.stand_nr.replace(new RegExp(`^${cat?.tag ?? ''}\\s*`, 'i'), '').trim()
                                                }
                                            </span>
                                        </div>
                                    </td>

                                    {/* Cliente — clica para abrir popup */}
                                    <td
                                        className={`${tdStyle} w-[200px] min-w-[200px] max-w-[200px] cursor-pointer group px-2`}
                                        onClick={() => setPopupRowId(row.id)}
                                        title="Clique para selecionar cliente"
                                    >
                                        {(() => {
                                            const cliente = clientes.find(c => c.id === row.cliente_id);
                                            if (cliente) return (
                                                <span className="font-bold text-slate-900 truncate block max-w-[250px]">
                                                    {cliente.tipo_pessoa === 'PJ' ? cliente.razao_social : cliente.nome_completo}
                                                </span>
                                            );
                                            if (row.cliente_nome_livre) return (
                                                <span className="text-amber-900 font-black italic truncate block max-w-[250px]">{row.cliente_nome_livre}</span>
                                            );
                                            return (
                                                <span className="text-slate-400 italic text-[11px] group-hover:text-blue-500 transition-colors uppercase">Disponível</span>
                                            );
                                        })()}
                                    </td>

                                    {/* Combo columns */}
                                    {comboLabels.map(label => {
                                        const isX = row.tipo_venda === label;
                                        const isStar = row.tipo_venda === label + '*';
                                        const isPending = pendingAction?.rowId === row.id && pendingAction?.field === label;

                                        return (
                                            <td
                                                key={label}
                                                className={`${tdStyle} text-center cursor-pointer font-black select-none w-6 h-5 leading-none px-0
                                                ${isPending ? '!bg-slate-400 !text-white'
                                                        : isX ? '!bg-[#00B050] !text-white ring-1 ring-inset ring-black/10'
                                                            : isStar ? '!bg-[#00B0F0] !text-white ring-1 ring-inset ring-black/10'
                                                                : '!bg-white hover:bg-blue-100/50 text-transparent'}`}
                                                onClick={() => {
                                                    if (isPending) {
                                                        handleSelectCombo(row.id, label);
                                                        setPendingAction(null);
                                                    } else {
                                                        setPendingAction({ rowId: row.id, field: label });
                                                    }
                                                }}
                                                title={isPending ? 'Clique novamente para confirmar' : isX ? `${label} (clique para cortesia)` : isStar ? `${label} - Cortesia (clique para limpar)` : label}
                                            >
                                                <span className="flex items-center justify-center w-full h-full text-[11px]">
                                                    {isPending ? '?' : isX ? 'x' : isStar ? '*' : ''}
                                                </span>
                                            </td>
                                        );
                                    })}

                                    {/* Optional columns */}
                                    {opcionaisAtivos.map(opt => {
                                        const status = sel[opt.nome] || '';
                                        const isPending = pendingAction?.rowId === row.id && pendingAction?.field === opt.nome;

                                        return (
                                            <td
                                                key={opt.id}
                                                className={`${tdStyle} text-center cursor-pointer font-black w-6 h-5 leading-none select-none px-0
                                                ${isPending ? '!bg-slate-400 !text-white'
                                                        : status === 'x' ? '!bg-[#00B050] !text-white ring-1 ring-inset ring-black/10'
                                                            : status === '*' ? '!bg-[#00B0F0] !text-white ring-1 ring-inset ring-black/10'
                                                                : '!bg-white hover:bg-slate-100/50 text-transparent'}`}
                                                onClick={() => {
                                                    if (isPending) {
                                                        handleToggleOpcional(row.id, opt.nome);
                                                        setPendingAction(null);
                                                    } else {
                                                        setPendingAction({ rowId: row.id, field: opt.nome });
                                                    }
                                                }}
                                                title={isPending ? 'Clique novamente para confirmar' : opt.nome}
                                            >
                                                <span className="flex items-center justify-center w-full h-full text-[11px]">
                                                    {isPending ? '?' : status}
                                                </span>
                                            </td>
                                        );
                                    })}

                                    {/* Sub Total */}
                                    <td className={`${tdStyle} px-2 py-0 text-right font-mono font-bold bg-[#D9E1F2]/50 whitespace-nowrap text-slate-700`}>
                                        {formatMoney(calc.subTotal)}
                                    </td>

                                    {/* Desconto */}
                                    <td
                                        className={`${tdStyle} px-2 py-0 text-right font-mono bg-white cursor-pointer group`}
                                        onClick={() => { if (!(editing?.id === row.id && editing?.field === 'desconto')) setEditing({ id: row.id, field: 'desconto', val: String(row.desconto || '') }); }}
                                        title="Clique para editar"
                                    >
                                        {editing?.id === row.id && editing?.field === 'desconto' ? (
                                            <input
                                                autoFocus
                                                type="text"
                                                className="w-full bg-slate-100 text-right font-mono outline-none border-b border-red-400 min-w-[70px] px-1"
                                                value={editing.val}
                                                onChange={e => setEditing({ ...editing, val: e.target.value })}
                                                onBlur={() => {
                                                    const num = Number(editing?.val.replace(',', '.') || 0);
                                                    setRows(rows.map(r => r.id === row.id ? { ...r, desconto: num } : r));
                                                    handleUpdateField(row.id, 'desconto', num);
                                                    setEditing(null);
                                                }}
                                                onKeyDown={e => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                                            />
                                        ) : (
                                            <span className={`group-hover:text-blue-500 transition-colors ${(row.desconto || 0) > 0 ? "text-yellow-600 font-bold" : "text-slate-400"}`}>
                                                {formatMoney(row.desconto ?? 0)}
                                            </span>
                                        )}
                                    </td>

                                    {/* Total Vendas */}
                                    <td className={`${tdStyle} text-right font-mono font-black text-[12px] bg-[#D9E1F2]/60 text-slate-900`}>
                                        {formatMoney(calc.totalVenda)}
                                    </td>

                                    {/* Valor Pago */}
                                    <td
                                        className={`${tdStyle} px-2 py-0 text-right font-mono text-[12px] bg-green-50/60 cursor-pointer group`}
                                        onClick={() => { if (!(editing?.id === row.id && editing?.field === 'valor_pago')) setEditing({ id: row.id, field: 'valor_pago', val: String(row.valor_pago || '') }); }}
                                        title="Clique para editar"
                                    >
                                        {editing?.id === row.id && editing?.field === 'valor_pago' ? (
                                            <input
                                                autoFocus
                                                type="text"
                                                className="w-full bg-slate-100 text-right font-mono outline-none border-b border-green-500 font-bold px-1 min-w-[70px]"
                                                value={editing.val}
                                                onChange={e => setEditing({ ...editing, val: e.target.value })}
                                                onBlur={() => {
                                                    const num = Number(editing?.val.replace(',', '.') || 0);
                                                    setRows(rows.map(r => r.id === row.id ? { ...r, valor_pago: num } : r));
                                                    handleUpdateField(row.id, 'valor_pago', num);
                                                    setEditing(null);
                                                }}
                                                onKeyDown={e => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                                            />
                                        ) : (
                                            <span className="text-green-900 font-bold group-hover:text-blue-500 transition-colors">
                                                {formatMoney(row.valor_pago ?? 0)}
                                            </span>
                                        )}
                                    </td>

                                    {/* Pendente */}
                                    <td className={`${tdStyle} text-right font-mono font-black text-[12px] ${calc.pendente > 0 ? 'text-red-600 bg-red-50/30' : calc.pendente < 0 ? 'text-blue-600' : 'text-slate-300'}`}>
                                        {formatMoney(calc.pendente)}
                                    </td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={2 + comboLabels.length + opcionaisAtivos.length + 5} className="py-8 text-center text-slate-400">
                                    {rows.length === 0 ? 'Nenhum estande gerado. Vá em ⚙️ Setup para configurar e gerar a planilha.' : 'Nenhum resultado para a busca.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <style>{`
                .vertical-text {
                    writing-mode: vertical-rl;
                    transform: rotate(180deg);
                    white-space: nowrap;
                }
            `}</style>

            {popupRowId && (() => {
                const popupRow = rows.find(r => r.id === popupRowId);
                return (
                    <ClienteSelectorPopup
                        currentClienteId={popupRow?.cliente_id}
                        currentNomeLivre={popupRow?.cliente_nome_livre}
                        onSelect={(clienteId, nomeLivre) => handleClienteSelect(popupRowId, clienteId, nomeLivre)}
                        onClose={() => setPopupRowId(null)}
                    />
                );
            })()}
        </Layout>
    );
};

export default PlanilhaVendas;
