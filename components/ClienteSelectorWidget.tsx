import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { simplifyText } from '../src/utils/textUtils';
import { useAppDialog } from '../context/DialogContext';
import { supabase } from '../services/supabaseClient';

export type ClienteComContato = {
    id: string;
    tipo_pessoa: string;
    nome_completo?: string | null;
    razao_social?: string | null;
    nome_fantasia?: string | null;
    cpf?: string | null;
    cnpj?: string | null;
    contato_nome?: string;
    contato_principal?: string;
    contato_email?: string;
    contato_cargo?: string;
    contatos?: { id: string, nome: string, telefone: string | null, cargo: string | null, principal: boolean, email: string | null }[];
};

export interface ClienteSelectorWidgetProps {
    onSelect: (cliente: ClienteComContato | null, nomeLivre: string | null) => void;
    currentClienteId?: string | null;
    currentNomeLivre?: string | null;
    onRequestNomeLivreFallback?: () => void;
    hideTabs?: boolean;
    hideNovoCliente?: boolean;
}

const PAGE_SIZE = 50;

export const ClienteSelectorWidget: React.FC<ClienteSelectorWidgetProps> = ({
    onSelect, currentClienteId, currentNomeLivre, onRequestNomeLivreFallback, hideTabs, hideNovoCliente
}) => {
    const appDialog = useAppDialog();
    const [clientes, setClientes] = useState<ClienteComContato[]>([]);
    const [totalCount, setTotalCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modos da Aba
    const [nomeLivre, setNomeLivre] = useState(currentNomeLivre || '');
    const [useNomeLivre, setUseNomeLivre] = useState(!!currentNomeLivre && !currentClienteId);

    // Novo Cadastro
    const [isNovoCliente, setIsNovoCliente] = useState(false);
    const [novoClienteForm, setNovoClienteForm] = useState({
        nome: '',
        contato: '',
        cargo: '',
        telefone: '',
        email: ''
    });
    const [savingNovoCliente, setSavingNovoCliente] = useState(false);

    const searchRef = useRef<HTMLInputElement>(null);
    const pageRef = useRef(0);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Count metadata
    useEffect(() => {
        supabase.from('clientes')
            .select('*', { count: 'exact', head: true })
            .then(({ count }) => setTotalCount(count));

        loadPage(0);
        setTimeout(() => searchRef.current?.focus(), 50);
    }, []);

    // Search debounce
    useEffect(() => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

        const simplified = simplifyText(searchTerm);
        if (simplified.length === 0) {
            pageRef.current = 0;
            setClientes([]);
            setHasMore(true);
            loadPage(0);
            return;
        }
        if (simplified.length < 3) return; // local filter

        searchTimerRef.current = setTimeout(() => {
            serverSearch(simplified);
        }, 150);
    }, [searchTerm]);

    const formatRow = (c: any): ClienteComContato => {
        const p = c.contatos?.find((ct: any) => ct.principal) || c.contatos?.[0];
        return {
            ...c,
            contato_nome: p?.nome || 'N/A',
            contato_principal: p?.telefone || 'N/A',
            contato_email: p?.email || 'N/A',
            contato_cargo: p?.cargo || 'N/A',
        };
    };

    const loadPage = async (page: number) => {
        try {
            if (page === 0) setLoading(true);
            else setLoadingMore(true);

            const from = page * PAGE_SIZE;
            const { data, error } = await supabase
                .from('clientes')
                .select('*, contatos(nome, telefone, email, cargo, principal)')
                .order('created_at', { ascending: false })
                .range(from, from + PAGE_SIZE - 1);

            if (error) throw error;
            const rows = (data || []).map(formatRow);
            setClientes(prev => page === 0 ? rows : [...prev, ...rows]);
            setHasMore((data || []).length === PAGE_SIZE);
        } catch (err) {
            console.error('Erro ao carregar clientes:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const serverSearch = async (term: string) => {
        try {
            setLoading(true);
            const { data, error } = await (supabase
                .rpc('search_clientes', { search_term: term }) as any);

            if (error) throw error;
            setClientes((data || []).map(formatRow));
            setHasMore(false);
        } catch (err) {
            console.error('Erro na busca:', err);
        } finally {
            setLoading(false);
        }
    };

    // Sentinel ref for scroll
    const setSentinel = useCallback((el: HTMLTableRowElement | null) => {
        if (observerRef.current) observerRef.current.disconnect();
        if (!el || !hasMore || loadingMore) return;

        observerRef.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                pageRef.current += 1;
                loadPage(pageRef.current);
                observerRef.current?.disconnect();
            }
        }, { root: listRef.current, rootMargin: '100px' });

        observerRef.current.observe(el);
    }, [hasMore, loadingMore]);

    // Local filter for <3 chars
    const displayed = useMemo(() => {
        const simplified = simplifyText(searchTerm);
        if (!simplified || simplified.length >= 3) return clientes;
        const numericTerm = searchTerm.replace(/\D/g, '');
        return clientes.filter(c => {
            const textFields = [c.nome_completo || '', c.razao_social || '', c.nome_fantasia || '',
            c.contato_nome || '', c.contato_cargo || '', c.contato_email || ''];
            const matchText = textFields.some(f => simplifyText(f).includes(simplified));
            const numericFields = [c.cpf || '', c.cnpj || '', c.contato_principal || ''];
            const matchNumeric = !!numericTerm && numericFields.some(f => f.replace(/\D/g, '').includes(numericTerm));
            return matchText || matchNumeric;
        });
    }, [clientes, searchTerm]);

    const getNome = (c: ClienteComContato) =>
        c.tipo_pessoa === 'PJ' ? (c.razao_social || c.nome_fantasia || '') : (c.nome_completo || '');

    const handleSelect = (c: ClienteComContato) => { onSelect(c, null); };
    const handleSaveNomeLivre = () => { onSelect(null, nomeLivre.trim() || null); };
    const handleDisponivel = () => { onSelect(null, null); };

    const handleSaveNovoCliente = async () => {
        if (!novoClienteForm.nome.trim() || !novoClienteForm.contato.trim()) {
            await appDialog.alert({ title: 'Campo obrigatório', message: 'Nome da empresa / Cliente e nome do Contato Principal são obrigatórios.', type: 'warning' });
            return;
        }

        try {
            setSavingNovoCliente(true);
            const { data: { user } } = await supabase.auth.getUser();

            // 1. Criar Cliente
            const { data: clientData, error: clientError } = await supabase
                .from('clientes')
                .insert({
                    tipo_pessoa: 'PJ',
                    razao_social: novoClienteForm.nome.trim(),
                    nome_fantasia: novoClienteForm.nome.trim(),
                    user_id: user?.id || null
                })
                .select()
                .single();

            if (clientError) throw clientError;

            // 2. Criar contato vinculado principal
            const { error: contatoError } = await supabase
                .from('contatos')
                .insert({
                    cliente_id: clientData.id,
                    nome: novoClienteForm.contato.trim(),
                    cargo: novoClienteForm.cargo.trim() || null,
                    telefone: novoClienteForm.telefone.trim() || null,
                    email: novoClienteForm.email.trim() || null,
                    principal: true
                });

            if (contatoError) throw contatoError;

            // Fetch the created full profile back
            const { data: fullCliente, error: fetchError } = await supabase
                .from('clientes')
                .select('*, contatos(*)')
                .eq('id', clientData.id)
                .single();

            if (fetchError) throw fetchError;

            // Retornar selecionado automaticamente
            onSelect(formatRow(fullCliente), null);
        } catch (err: any) {
            console.error(err);
            await appDialog.alert({ title: 'Erro', message: 'Erro ao cadastrar novo cliente: ' + err.message, type: 'danger' });
        } finally {
            setSavingNovoCliente(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-white overflow-hidden rounded-lg">
            {/* ── Header Total Count (Opcional, pode ser omitido se quiser economizar espaço) ── */}
            <div className="bg-slate-100 border-b border-slate-200 px-5 py-2 flex items-center justify-between shrink-0">
                <div>
                    {totalCount !== null && (
                        <span className="text-slate-500 font-bold text-xs">{totalCount.toLocaleString('pt-BR')} clientes cadastrados</span>
                    )}
                </div>
            </div>

            {/* ── Modo tabs ── */}
            {!hideTabs && (
                <div className="flex items-stretch border-b border-slate-200 bg-slate-50 shrink-0">
                    <button
                        onClick={() => { setUseNomeLivre(false); setIsNovoCliente(false); setTimeout(() => searchRef.current?.focus(), 50); }}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${!useNomeLivre
                            ? 'border-blue-500 text-blue-700 bg-white'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/70'}`}
                    >
                        🔍 Buscar Cadastrado
                    </button>
                    <div className="w-px bg-slate-200" />
                    <button
                        onClick={() => {
                            if (onRequestNomeLivreFallback) {
                                onRequestNomeLivreFallback();
                            } else {
                                setUseNomeLivre(true);
                                setIsNovoCliente(false);
                            }
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${useNomeLivre
                            ? 'border-amber-400 text-amber-700 bg-white'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/70'}`}
                    >
                        ✏️ {onRequestNomeLivreFallback ? 'Cadastro Livre' : 'Nome Livre'}
                    </button>
                    <div className="w-px bg-slate-200" />
                    <button
                        onClick={handleDisponivel}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 border-transparent text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                        ✕ Deixar Disponível
                    </button>
                </div>
            )}

            {/* ── Conteúdo Baseado na Aba ── */}
            {useNomeLivre ? (
                <div className="flex-1 flex flex-col items-start justify-start p-6 gap-3 bg-amber-50/40">
                    <p className="text-sm text-amber-800">
                        Digite qualquer nome, empresa ou observação — isso ficará solto sem vínculo com o cadastro de clientes real.
                    </p>
                    <div className="flex gap-2 w-full max-w-lg mt-2">
                        <input
                            type="text"
                            autoFocus
                            className="flex-1 border-2 border-amber-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                            placeholder="Ex: A Confirmar, Prefeituras, Indecisos..."
                            value={nomeLivre}
                            onChange={e => setNomeLivre(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveNomeLivre()}
                        />
                        <button
                            onClick={handleSaveNomeLivre}
                            className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold px-6 py-3 rounded-lg transition-colors"
                        >
                            Confirmar e Associar
                        </button>
                    </div>
                </div>
            ) : isNovoCliente ? (
                // ── Formulário Rápido de Novo Cliente ──
                <div className="flex-1 flex flex-col p-6 overflow-auto bg-slate-50">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-3xl mx-auto w-full">
                        <div className="mb-6 pb-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800">Cadastro Rápido de Cliente</h3>
                            <button
                                onClick={() => setIsNovoCliente(false)}
                                className="text-slate-400 hover:text-slate-600 font-medium text-sm"
                            >
                                Voltar para Busca
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Empresa / Razão Social <span className="text-red-500">*</span></label>
                                <input
                                    type="text" autoFocus
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ex: Indústria Brasileira S/A"
                                    value={novoClienteForm.nome}
                                    onChange={e => setNovoClienteForm({ ...novoClienteForm, nome: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Contato Principal <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ex: João da Silva"
                                    value={novoClienteForm.contato}
                                    onChange={e => setNovoClienteForm({ ...novoClienteForm, contato: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Cargo</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ex: Gerente de Compras"
                                    value={novoClienteForm.cargo}
                                    onChange={e => setNovoClienteForm({ ...novoClienteForm, cargo: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Telefone</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="(00) 00000-0000"
                                    value={novoClienteForm.telefone}
                                    onChange={e => setNovoClienteForm({ ...novoClienteForm, telefone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Email</label>
                                <input
                                    type="email"
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="contato@empresa.com"
                                    value={novoClienteForm.email}
                                    onChange={e => setNovoClienteForm({ ...novoClienteForm, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-3 pt-5 border-t border-slate-100">
                            <button
                                onClick={() => setIsNovoCliente(false)}
                                className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveNovoCliente}
                                disabled={savingNovoCliente}
                                className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-md shadow-blue-500/20"
                            >
                                {savingNovoCliente ? 'Salvando...' : 'Salvar e Selecionar'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                // ── Busca Cadastrado (Tabela Rica) ──
                <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Barra de Busca + Novo Cliente */}
                    <div className="px-5 py-4 border-b border-slate-200 bg-white shrink-0 flex items-center gap-4">
                        <div className="relative flex-1">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                ref={searchRef}
                                type="text"
                                placeholder="Buscar por nome, razão social, CNPJ, contato, email, cargo..."
                                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xl leading-none"
                                >×</button>
                            )}
                        </div>
                        {!hideNovoCliente && (
                            <button
                                onClick={() => setIsNovoCliente(true)}
                                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all shrink-0"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                </svg>
                                Novo Cliente
                            </button>
                        )}
                    </div>

                    {/* Tabela de Resultados Estendida */}
                    <div ref={listRef} className="flex-1 overflow-auto bg-slate-50 p-4">
                        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse table-fixed">
                                <thead className="sticky top-0 z-10 bg-slate-200 shadow-sm">
                                    <tr className="text-slate-700 text-[11px] font-bold uppercase tracking-tight">
                                        <th className="px-3 py-2 border-b border-r border-slate-300 w-[30%]">Nome / Razão Social</th>
                                        <th className="px-3 py-2 border-b border-r border-slate-300 w-[20%]">Contato</th>
                                        <th className="px-3 py-2 border-b border-r border-slate-300 w-[15%]">Cargo</th>
                                        <th className="px-3 py-2 border-b border-r border-slate-300 w-[15%]">Telefone</th>
                                        <th className="px-3 py-2 border-b border-slate-300 w-[20%]">Email</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">Carregando clientes...</td></tr>
                                    ) : displayed.length === 0 ? (
                                        <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                                            {searchTerm ? `Nenhum resultado para "${searchTerm}"` : 'Nenhum cliente cadastrado.'}
                                        </td></tr>
                                    ) : (
                                        <>
                                            {displayed.map((c, idx) => {
                                                const isLast = idx === displayed.length - 1;
                                                const isActive = c.id === currentClienteId;
                                                return (
                                                    <tr
                                                        key={c.id}
                                                        ref={isLast && hasMore ? setSentinel : null}
                                                        onClick={() => handleSelect(c)}
                                                        className={`cursor-pointer transition-colors group ${isActive
                                                            ? 'bg-blue-50/80 border-l-4 border-l-blue-500'
                                                            : 'hover:bg-blue-50/50 even:bg-slate-50/50 border-l-4 border-l-transparent'
                                                            }`}
                                                    >
                                                        {/* Colunas preenchidas com estilo dinâmico estilo Clientes.tsx */}
                                                        <td className="px-3 py-1.5 border-r border-slate-100">
                                                            <div className="flex items-center gap-1.5">
                                                                {isActive && <span className="text-blue-500 font-bold shrink-0 animate-pulse">✓</span>}
                                                                <p className="text-[12px] font-semibold text-slate-800 leading-tight truncate" title={getNome(c)}>
                                                                    {getNome(c)}
                                                                </p>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-1.5 border-r border-slate-100">
                                                            <p className="text-[12px] text-slate-700 leading-tight truncate" title={c.contato_nome !== 'N/A' ? c.contato_nome : ''}>
                                                                {c.contato_nome !== 'N/A' ? c.contato_nome : '—'}
                                                            </p>
                                                        </td>
                                                        <td className="px-3 py-1.5 border-r border-slate-100">
                                                            <p className="text-[11px] text-slate-500 leading-tight truncate">
                                                                {c.contato_cargo !== 'N/A' ? c.contato_cargo : '—'}
                                                            </p>
                                                        </td>
                                                        <td className="px-3 py-1.5 border-r border-slate-100">
                                                            <p className="text-[11px] text-slate-600 font-mono leading-tight truncate">
                                                                {c.contato_principal !== 'N/A' ? c.contato_principal : '—'}
                                                            </p>
                                                        </td>
                                                        <td className="px-3 py-1.5">
                                                            <p className="text-[11px] text-slate-500 truncate" title={c.contato_email !== 'N/A' ? c.contato_email : ''}>
                                                                {c.contato_email !== 'N/A' ? c.contato_email : '—'}
                                                            </p>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {loadingMore && (
                                                <tr><td colSpan={5} className="py-4 text-center text-slate-400 text-xs">Carregando mais dados...</td></tr>
                                            )}
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Footer Exibição */}
                    <div className="px-5 py-2.5 bg-slate-100 border-t border-slate-200 shrink-0 flex items-center justify-between shadow-inner">
                        <span className="text-xs font-medium text-slate-500">
                            Exibindo: <strong className="text-slate-700">{displayed.length}</strong> de {totalCount !== null ? totalCount.toLocaleString('pt-BR') : '...'}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1.5">
                            {hasMore && !searchTerm
                                ? <><svg className="w-3.5 h-3.5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg> Desça para carregar mais</>
                                : '👆 Clique em uma linha na tabela acima para selecioná-la e associá-la.'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};
