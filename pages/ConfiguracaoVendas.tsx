import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { planilhaVendasService, CategoriaSetup } from '../services/planilhaVendasService';
import { itensOpcionaisService, ItemOpcional } from '../services/itensOpcionaisService';
import { supabase } from '../services/supabaseClient';

const CORES = ['bg-[#FCE4D6]', 'bg-[#FFF2CC]', 'bg-[#E2EFDA]', 'bg-[#D9E1F2]', 'bg-[#F2F2F2]', 'bg-[#E6E6FA]'];

const DEFAULT_CATS: CategoriaSetup[] = [
    { tag: 'NAMING', prefix: 'Naming', cor: CORES[0], count: 16, standBase: 20000, combos: [20000, 20000, 20000] }
];

const ConfiguracaoVendas: React.FC = () => {
    const { edicaoId } = useParams<{ edicaoId: string }>();
    const navigate = useNavigate();

    const [categorias, setCategorias] = useState<CategoriaSetup[]>(DEFAULT_CATS);
    const [numCombos, setNumCombos] = useState(3);
    const [opcionaisDisponiveis, setOpcionaisDisponiveis] = useState<ItemOpcional[]>([]);
    const [opcionaisSelecionados, setOpcionaisSelecionados] = useState<string[]>([]);
    // Preços por edição: { [itemId]: number }
    const [opcionaisPrecos, setOpcionaisPrecos] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [configId, setConfigId] = useState<string | null>(null);
    const [savedCounts, setSavedCounts] = useState<Record<string, number>>({});
    const [planilhaExiste, setPlanilhaExiste] = useState(false);
    const [totalStands, setTotalStands] = useState(0);
    // Popup state
    const [showOpcionaisPopup, setShowOpcionaisPopup] = useState(false);
    // Nomes de opcionais que já têm marcação em algum estande da planilha
    const [opcionaisUsados, setOpcionaisUsados] = useState<Set<string>>(new Set());
    // IDs de linhas com preço salvo recentemente (feedback visual)
    const [salvosOk, setSalvosOk] = useState<Set<string>>(new Set());

    useEffect(() => { if (edicaoId) loadData(); }, [edicaoId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [config, allOpcionais] = await Promise.all([
                planilhaVendasService.getConfig(edicaoId!),
                itensOpcionaisService.getItens()
            ]);
            if (config) {
                setConfigId(config.id);
                let maxCombos = 1;
                let mappedCats = (config.categorias_config as any[]).map(cat => {
                    let combos: number[] = Array.isArray(cat.combos)
                        ? cat.combos
                        : typeof cat.combos === 'object' && cat.combos
                            ? [cat.combos.combo01 || 0, cat.combos.combo02 || 0, cat.combos.combo03 || 0]
                            : [];
                    if (combos.length > maxCombos) maxCombos = combos.length;
                    return { ...cat, combos };
                });
                setNumCombos(maxCombos);
                mappedCats = mappedCats.map(cat => {
                    const padded = [...cat.combos];
                    while (padded.length < maxCombos) padded.push(0);
                    return { ...cat, combos: padded };
                });
                setCategorias(mappedCats as CategoriaSetup[]);
                setOpcionaisSelecionados(config.opcionais_ativos || []);
                // Load custom prices
                setOpcionaisPrecos((config as any).opcionais_precos || {});
                const counts: Record<string, number> = {};
                mappedCats.forEach(cat => { counts[cat.prefix] = cat.count; });
                setSavedCounts(counts);

                const { data: estandes } = await (supabase
                    .from('planilha_vendas_estandes')
                    .select('id, cliente_id, cliente_nome_livre, tipo_venda, opcionais_selecionados')
                    .eq('config_id', config.id) as any);
                if (estandes && estandes.length > 0) {
                    setPlanilhaExiste(true);
                    setTotalStands(estandes.length);
                    // Descobrir quais opcionais (por nome) têm marcação em algum estande
                    const usados = new Set<string>();
                    estandes.forEach(e => {
                        const sel = (e.opcionais_selecionados as Record<string, string>) || {};
                        Object.entries(sel).forEach(([nome, valor]) => {
                            if (valor === 'x' || valor === '*') usados.add(nome);
                        });
                    });
                    setOpcionaisUsados(usados);
                }
            }
            setOpcionaisDisponiveis(allOpcionais);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ── Category handlers ──────────────────────────────────────
    const updateCat = (idx: number, field: string, value: any) =>
        setCategorias(prev => prev.map((c, i) => i !== idx ? c : {
            ...c, [field]: (field === 'count' || field === 'standBase') ? (Number(value) || 0) : value
        }));

    const updateCombo = (catIdx: number, ci: number, value: any) =>
        setCategorias(prev => prev.map((c, i) => {
            if (i !== catIdx) return c;
            const arr = Array.isArray(c.combos) ? [...c.combos as number[]] : [];
            arr[ci] = Number(value) || 0;
            return { ...c, combos: arr };
        }));

    const addCombo = () => {
        setNumCombos(n => n + 1);
        setCategorias(prev => prev.map(c => ({ ...c, combos: Array.isArray(c.combos) ? [...c.combos, 0] : [0] })));
    };

    const removeCombo = () => {
        if (numCombos <= 0) return;
        setNumCombos(n => n - 1);
        setCategorias(prev => prev.map(c => ({ ...c, combos: Array.isArray(c.combos) ? c.combos.slice(0, -1) : [] })));
    };

    const addCategoria = () =>
        setCategorias(prev => [...prev, {
            tag: 'NOVA', prefix: 'Prefixo', cor: CORES[prev.length % CORES.length],
            count: 1, standBase: 0, combos: Array(numCombos).fill(0)
        }]);

    const removeCategoria = (idx: number) => setCategorias(prev => prev.filter((_, i) => i !== idx));

    // ── Opcionais handlers ─────────────────────────────────────
    const toggleOpcional = (id: string) => {
        setOpcionaisSelecionados(prev => {
            if (prev.includes(id)) {
                // Bloquear se o item já foi usado na planilha
                const item = opcionaisDisponiveis.find(o => o.id === id);
                if (item && opcionaisUsados.has(item.nome)) {
                    alert(`⛔ O item "${item.nome}" já está marcado em estandes da planilha.\n\nPara removê-lo da edição, primeiro desmarque-o em todos os estandes na planilha.`);
                    return prev; // bloqueia
                }
                setOpcionaisPrecos(p => { const n = { ...p }; delete n[id]; return n; });
                return prev.filter(x => x !== id);
            }
            // Adicionar: setar preço sugerido como padrão
            const item = opcionaisDisponiveis.find(o => o.id === id);
            if (item) setOpcionaisPrecos(p => ({ ...p, [id]: Number(item.preco_base) || 0 }));
            return [...prev, id];
        });
    };

    const updatePreco = (id: string, value: string) => {
        setOpcionaisPrecos(prev => ({ ...prev, [id]: Number(value) || 0 }));
    };

    const handleSavePreco = async (id: string) => {
        if (!edicaoId || !configId) {
            alert('Salve as configurações gerais primeiro.');
            return;
        }
        const item = opcionaisDisponiveis.find(o => o.id === id);
        const novoPreco = opcionaisPrecos[id] ?? Number(item?.preco_base ?? 0);
        const precoFmt = novoPreco.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

        if (item && opcionaisUsados.has(item.nome)) {
            const ok = window.confirm(
                `⚠️ O item "${item.nome}" já está marcado em estandes desta planilha.\n\n` +
                `Ao confirmar, o novo preço de R$ ${precoFmt} será salvo na configuração e passará a valer para todos os cálculos da edição.\n\n` +
                `Deseja continuar?`
            );
            if (!ok) return;
        }

        // Salva opcionais_precos no banco imediatamente
        const newPrecos = { ...opcionaisPrecos, [id]: novoPreco };
        const { error } = await (supabase
            .from('planilha_configuracoes')
            .update({ opcionais_precos: newPrecos } as any)
            .eq('id', configId));

        if (error) {
            alert('Erro ao salvar preço: ' + error.message);
            return;
        }

        setOpcionaisPrecos(newPrecos);
        setSalvosOk(prev => new Set(prev).add(id));
        setTimeout(() => setSalvosOk(prev => { const n = new Set(prev); n.delete(id); return n; }), 2500);
    };

    // ── Validation ─────────────────────────────────────────────
    const validateCountReduction = async (): Promise<string | null> => {
        if (!configId) return null;
        for (const cat of categorias) {
            const savedCount = savedCounts[cat.prefix];
            if (savedCount && cat.count < savedCount) {
                const { data } = await (supabase
                    .from('planilha_vendas_estandes')
                    .select('stand_nr, cliente_id, cliente_nome_livre, tipo_venda')
                    .eq('config_id', configId)
                    .like('stand_nr', `${cat.prefix} %`) as any);
                if (data) {
                    const sorted = data.sort((a, b) => a.stand_nr.localeCompare(b.stand_nr));
                    const toRemove = sorted.slice(cat.count);
                    const withData = toRemove.filter(r =>
                        r.cliente_id || r.cliente_nome_livre || (r.tipo_venda && r.tipo_venda !== 'DISPONÍVEL')
                    );
                    if (withData.length > 0)
                        return `"${cat.prefix}": ${withData.length} stand(s) com dados seriam removidos (${withData.map(r => r.stand_nr).join(', ')}). Limpe-os na planilha primeiro.`;
                }
            }
        }
        return null;
    };

    // ── Helper: salva config no banco ──────────────────────────
    const persistConfig = async (): Promise<string> => {
        const payload = {
            edicao_id: edicaoId,
            categorias_config: categorias as any,
            opcionais_ativos: opcionaisSelecionados,
            opcionais_precos: opcionaisPrecos,
        } as any;

        if (configId) {
            // Atualiza linha existente
            const { data, error } = await (supabase
                .from('planilha_configuracoes')
                .update(payload)
                .eq('id', configId)
                .select().single() as any);
            if (error) throw error;
            return data.id as string;
        } else {
            // Cria nova linha
            const { data, error } = await (supabase
                .from('planilha_configuracoes')
                .insert(payload)
                .select().single() as any);
            if (error) throw error;
            return data.id as string;
        }
    };

    // ── Save config ────────────────────────────────────────────
    const handleSave = async () => {
        if (!edicaoId) return;
        const err = await validateCountReduction();
        if (err) { alert(`⚠️ ${err}`); return; }
        try {
            setSaving(true);
            const savedId = await persistConfig();
            setConfigId(savedId);
            const counts: Record<string, number> = {};
            categorias.forEach(c => { counts[c.prefix] = c.count; });
            setSavedCounts(counts);
            alert('✅ Configurações salvas!');
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar: ' + (err as any)?.message);
        } finally {
            setSaving(false);
        }
    };

    // ── Generate planilha ──────────────────────────────────────
    const handleGenerate = async () => {
        if (!edicaoId) return;
        if (planilhaExiste) {
            alert(`⛔ Planilha já existe com ${totalStands} estandes. Limpe os dados na planilha antes de gerar novamente.`);
            return;
        }
        const err = await validateCountReduction();
        if (err) { alert(`⚠️ ${err}`); return; }
        if (!confirm('Gerar planilha com as categorias definidas?')) return;
        try {
            setSaving(true);
            const savedId = await persistConfig();
            setConfigId(savedId);
            await planilhaVendasService.generateEstandes(savedId, categorias);
            setPlanilhaExiste(true);
            setTotalStands(categorias.reduce((s, c) => s + c.count, 0));
            alert('✅ Planilha gerada com sucesso!');
            navigate(`/planilha-vendas/${edicaoId}`);
        } catch (err) {
            console.error(err);
            alert('Erro ao gerar planilha: ' + (err as any)?.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Layout title="Configuração"><div className="p-8 text-center text-slate-500">Carregando...</div></Layout>;

    const totalEstandes = categorias.reduce((s, c) => s + c.count, 0);
    const itensAtivos = opcionaisDisponiveis.filter(o => opcionaisSelecionados.includes(o.id));

    return (
        <Layout title="Estruturar Planilha de Vendas">
            <div className="max-w-7xl mx-auto p-4 pb-32 space-y-6">

                {/* Status banner */}
                {planilhaExiste ? (
                    <div className="border-l-4 border-amber-500 bg-amber-50 px-5 py-3 flex items-start gap-3">
                        <span className="text-xl mt-0.5">⚠️</span>
                        <div>
                            <p className="font-bold text-amber-800 text-sm">Planilha já gerada — {totalStands} estandes ativos</p>
                            <p className="text-amber-700 text-xs mt-0.5">Você pode editar preços e opcionais e salvar. Para gerar nova planilha, limpe os dados primeiro.</p>
                        </div>
                    </div>
                ) : (
                    <div className="border-l-4 border-blue-500 bg-blue-50 px-5 py-3">
                        <p className="font-bold text-blue-800 text-sm">Nenhuma planilha gerada ainda</p>
                        <p className="text-blue-700 text-xs mt-0.5">Configure abaixo, salve e clique em "Gerar Planilha".</p>
                    </div>
                )}

                {/* ── Categorias / Preços ── */}
                <div className="bg-white border border-slate-200 overflow-hidden shadow-sm">
                    <div className="bg-slate-900 text-white px-5 py-3 flex flex-wrap gap-2 items-center justify-between">
                        <div>
                            <span className="font-bold text-sm uppercase tracking-wider">Estrutura de Estandes e Preços</span>
                            <span className="ml-3 text-slate-400 text-xs">{totalEstandes} stand(s) no total</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button onClick={addCombo} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 transition-colors">+ Coluna Combo</button>
                            {numCombos > 0 && <button onClick={removeCombo} className="text-xs bg-red-900/60 hover:bg-red-800 text-red-200 px-3 py-1.5 transition-colors">− Remover Combo</button>}
                            <div className="w-px bg-slate-600 mx-1" />
                            <button onClick={addCategoria} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 font-bold transition-colors">+ Categoria</button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-1 text-left text-[11px] font-bold uppercase text-slate-500 w-28 border border-slate-200">Tag</th>
                                    <th className="px-4 py-1 text-left text-[11px] font-bold uppercase text-slate-500 w-36 border border-slate-200">Prefixo</th>
                                    <th className="px-4 py-1 text-center text-[11px] font-bold uppercase text-slate-500 w-20 border border-slate-200">Qtd.</th>
                                    <th className="px-4 py-1 text-right text-[11px] font-bold uppercase text-slate-500 w-32 border border-slate-200">Base</th>
                                    {Array.from({ length: numCombos }).map((_, i) => (
                                        <th key={i} className="px-4 py-1 text-right text-[11px] font-bold uppercase text-blue-600 min-w-[100px] border border-slate-200">Combo {String(i + 1).padStart(2, '0')}</th>
                                    ))}
                                    <th className="w-8 border border-slate-200" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {categorias.map((cat, idx) => {
                                    const isReducing = savedCounts[cat.prefix] && cat.count < savedCounts[cat.prefix];
                                    return (
                                        <tr key={idx} className={`${cat.cor} hover:brightness-95 transition-all`}>
                                            <td className="px-2 py-0.5 border border-slate-200">
                                                <input className="w-full p-1 border border-black/10 font-mono text-[12px] uppercase bg-white/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 font-bold"
                                                    value={cat.tag} onChange={e => updateCat(idx, 'tag', e.target.value)} placeholder="NAMING" />
                                            </td>
                                            <td className="px-2 py-0.5 border border-slate-200">
                                                <input className="w-full p-1 border border-black/10 font-black text-[13px] bg-white/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 text-center"
                                                    value={cat.prefix} onChange={e => updateCat(idx, 'prefix', e.target.value)} />
                                            </td>
                                            <td className="px-2 py-0.5 border border-slate-200">
                                                <div className="flex flex-col items-center">
                                                    <input type="number" min="0"
                                                        className={`w-14 p-1 border text-center font-black text-[14px] bg-white/80 focus:bg-white focus:outline-none focus:ring-1 block ${isReducing ? 'border-amber-400 focus:ring-amber-400 bg-amber-50' : 'border-black/10 focus:ring-slate-400'}`}
                                                        value={cat.count} onChange={e => updateCat(idx, 'count', e.target.value)} />
                                                    {isReducing && <span className="text-[8px] text-amber-700 font-bold uppercase tracking-tighter">era {savedCounts[cat.prefix]}</span>}
                                                </div>
                                            </td>
                                            <td className="px-2 py-0.5 border border-slate-200">
                                                <input type="number" min="0"
                                                    className="w-full p-1 border border-black/10 text-right font-mono font-bold text-[13px] bg-white/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 min-w-[90px]"
                                                    value={cat.standBase} onChange={e => updateCat(idx, 'standBase', e.target.value)} />
                                            </td>
                                            {Array.from({ length: numCombos }).map((_, ci) => (
                                                <td key={ci} className="px-2 py-0.5 border border-slate-200">
                                                    <input type="number" min="0"
                                                        className="w-full p-1 border border-blue-200 text-right text-blue-900 font-black font-mono text-[13px] bg-white/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 min-w-[90px]"
                                                        value={Array.isArray(cat.combos) ? cat.combos[ci] || 0 : 0}
                                                        onChange={e => updateCombo(idx, ci, e.target.value)} />
                                                </td>
                                            ))}
                                            <td className="px-1 py-0.5 text-center border border-slate-200">
                                                <button onClick={() => removeCategoria(idx)} className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors font-bold text-xs">✕</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {categorias.length === 0 && (
                                    <tr><td colSpan={4 + numCombos + 1} className="px-4 py-8 text-center text-slate-400 italic">Nenhuma categoria. Clique em "+ Categoria".</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Opcionais Selecionados — Preços por Edição ── */}
                <div className="bg-white border border-slate-200 overflow-hidden shadow-sm">
                    <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
                        <div>
                            <span className="font-bold text-sm uppercase tracking-wider">Itens Opcionais nesta Edição</span>
                            <span className="ml-3 text-slate-400 text-xs">{opcionaisSelecionados.length} selecionado(s)</span>
                        </div>
                        <button
                            onClick={() => setShowOpcionaisPopup(true)}
                            className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 font-bold transition-colors"
                        >
                            📋 Selecionar Itens
                        </button>
                    </div>

                    {itensAtivos.length === 0 ? (
                        <div className="px-6 py-8 text-center text-slate-400 italic text-sm">
                            Nenhum item selecionado. Clique em "Selecionar Itens" para vincular opcionais a esta edição.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase text-slate-500">Item Opcional</th>
                                        <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase text-slate-400">Preço Sugerido</th>
                                        <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase text-green-700 w-56">
                                            Preço Nesta Edição ✏️
                                        </th>
                                        <th className="w-20 text-center text-[11px] font-bold uppercase text-slate-400">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {itensAtivos.map(item => {
                                        const emUso = opcionaisUsados.has(item.nome);
                                        const salvo = salvosOk.has(item.id);
                                        return (
                                            <tr key={item.id} className={`transition-colors ${emUso ? 'bg-amber-50 hover:bg-amber-100/60' : 'hover:bg-slate-50'}`}>
                                                <td className="px-4 py-2.5">
                                                    <span className="font-semibold text-slate-800">{item.nome}</span>
                                                    {emUso && (
                                                        <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.5 align-middle">
                                                            🔒 em uso
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5 text-right text-slate-400 font-mono text-xs">
                                                    R$ {Number(item.preco_base).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-4 py-2.5 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <span className="text-slate-500 text-xs">R$</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            className={`w-36 p-1.5 border-2 text-right font-bold font-mono focus:bg-white focus:outline-none focus:ring-2
                                                                ${emUso
                                                                    ? 'border-amber-400 text-amber-900 bg-amber-50 focus:ring-amber-500'
                                                                    : 'border-green-400 text-green-800 bg-green-50 focus:ring-green-500'}`}
                                                            value={opcionaisPrecos[item.id] ?? Number(item.preco_base)}
                                                            onChange={e => updatePreco(item.id, e.target.value)}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-2 py-2 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={() => handleSavePreco(item.id)}
                                                            title="Confirmar preço"
                                                            className={`p-1.5 transition-colors text-sm font-bold
                                                                ${salvo
                                                                    ? 'text-green-600 bg-green-50'
                                                                    : 'text-slate-500 hover:text-green-700 hover:bg-green-50'}`}
                                                        >
                                                            {salvo ? '✓' : '💾'}
                                                        </button>
                                                        <button
                                                            onClick={() => toggleOpcional(item.id)}
                                                            title={emUso ? 'Desmarque nos estandes antes de remover' : 'Remover da edição'}
                                                            className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 transition-colors text-sm"
                                                        >✕</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Sticky footer ── */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-30">
                <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-sm text-slate-500">
                        <span className="font-semibold text-slate-700">{totalEstandes} stand(s)</span>
                        {planilhaExiste && <span className="ml-2 text-amber-600 font-semibold">• Planilha ativa</span>}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => navigate(`/planilha-vendas/${edicaoId}`)} className="text-sm text-slate-600 border border-slate-300 px-4 py-2 hover:bg-slate-50 transition-colors">
                            ← Ver Planilha
                        </button>
                        <button onClick={handleSave} disabled={saving} className="text-sm bg-slate-800 hover:bg-slate-700 text-white px-5 py-2 font-bold transition-colors disabled:opacity-50">
                            {saving ? 'Salvando...' : '💾 Salvar Configurações'}
                        </button>
                        {!planilhaExiste && (
                            <button onClick={handleGenerate} disabled={saving || categorias.length === 0} className="text-sm bg-green-700 hover:bg-green-600 text-white px-6 py-2 font-bold transition-colors disabled:opacity-50">
                                {saving ? 'Gerando...' : '🗂️ Gerar Planilha'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Popup de Seleção de Opcionais ── */}
            {showOpcionaisPopup && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    onClick={e => e.target === e.currentTarget && setShowOpcionaisPopup(false)}
                >
                    <div className="bg-white shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh] overflow-hidden border border-slate-200">
                        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between flex-shrink-0">
                            <span className="font-bold text-sm uppercase tracking-wider">Selecionar Itens Opcionais</span>
                            <button onClick={() => setShowOpcionaisPopup(false)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                            {opcionaisDisponiveis.length === 0 ? (
                                <div className="px-6 py-8 text-center text-slate-400 italic text-sm">
                                    Nenhum item opcional cadastrado. Acesse "Opcionais" para criar.
                                </div>
                            ) : (
                                opcionaisDisponiveis.map(item => {
                                    const selected = opcionaisSelecionados.includes(item.id);
                                    const emUso = opcionaisUsados.has(item.nome);
                                    return (
                                        <label
                                            key={item.id}
                                            className={`flex items-center gap-3 px-5 py-3 transition-colors
                                                ${selected ? 'bg-blue-50' : 'hover:bg-slate-50'}
                                                ${emUso ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selected}
                                                onChange={() => toggleOpcional(item.id)}
                                                className="w-4 h-4 accent-blue-600"
                                            />
                                            <div className="flex-1">
                                                <span className={`font-semibold text-sm ${selected ? 'text-blue-900' : 'text-slate-800'}`}>
                                                    {item.nome}
                                                </span>
                                                {emUso && (
                                                    <span className="ml-2 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5">
                                                        🔒 em uso na planilha
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-slate-400 font-mono">
                                                R$ {Number(item.preco_base).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </label>
                                    );
                                })
                            )}
                        </div>
                        <div className="flex-shrink-0 px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                            <span className="text-xs text-slate-500">{opcionaisSelecionados.length} selecionado(s)</span>
                            <button
                                onClick={() => setShowOpcionaisPopup(false)}
                                className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold px-5 py-2 transition-colors"
                            >
                                ✓ Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default ConfiguracaoVendas;


