import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { simplifyText } from '../src/utils/textUtils';
import { supabase } from '../services/supabaseClient';

type ClienteComContato = {
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
};

interface Props {
    onSelect: (clienteId: string | null, nomeLivre: string | null) => void;
    onClose: () => void;
    currentClienteId?: string | null;
    currentNomeLivre?: string | null;
}

const PAGE_SIZE = 50;

const ClienteSelectorPopup: React.FC<Props> = ({
    onSelect, onClose, currentClienteId, currentNomeLivre
}) => {
    const [clientes, setClientes] = useState<ClienteComContato[]>([]);
    const [totalCount, setTotalCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [nomeLivre, setNomeLivre] = useState(currentNomeLivre || '');
    const [useNomeLivre, setUseNomeLivre] = useState(!!currentNomeLivre && !currentClienteId);
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
            // Função SQL: busca em clientes + contatos em 1 round trip
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

    const handleSelect = (c: ClienteComContato) => { onSelect(c.id, null); onClose(); };
    const handleSaveNomeLivre = () => { onSelect(null, nomeLivre.trim() || null); onClose(); };
    const handleDisponivel = () => { onSelect(null, null); onClose(); };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden">

                {/* ── Header ── */}
                <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between shrink-0">
                    <div>
                        <span className="font-bold text-sm">Selecionar Cliente para o Stand</span>
                        {totalCount !== null && (
                            <span className="ml-2 text-slate-400 font-normal text-xs">({totalCount.toLocaleString('pt-BR')} cadastrados)</span>
                        )}
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
                </div>

                {/* ── Modo tabs ── */}
                <div className="flex items-stretch border-b border-slate-200 bg-slate-50 shrink-0">
                    <button
                        onClick={() => { setUseNomeLivre(false); setTimeout(() => searchRef.current?.focus(), 50); }}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${!useNomeLivre
                            ? 'border-blue-500 text-blue-700 bg-white'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/70'}`}
                    >
                        🔍 Buscar Cadastrado
                    </button>
                    <div className="w-px bg-slate-200" />
                    <button
                        onClick={() => setUseNomeLivre(true)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${useNomeLivre
                            ? 'border-amber-400 text-amber-700 bg-white'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/70'}`}
                    >
                        ✏️ Nome Livre
                    </button>
                    <div className="w-px bg-slate-200" />
                    <button
                        onClick={handleDisponivel}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 border-transparent text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                        ✕ Deixar Disponível
                    </button>
                </div>

                {/* ── Painel: Nome Livre ── */}
                {useNomeLivre ? (
                    <div className="flex-1 flex flex-col items-start justify-start p-6 gap-3 bg-amber-50/40">
                        <p className="text-xs text-amber-700 font-semibold">
                            Digite qualquer nome, empresa ou observação — sem vínculo com o cadastro de clientes.
                        </p>
                        <div className="flex gap-2 w-full max-w-md">
                            <input
                                type="text"
                                autoFocus
                                className="flex-1 border-2 border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                                placeholder="Ex: João Silva, A Confirmar, Empresa XYZ..."
                                value={nomeLivre}
                                onChange={e => setNomeLivre(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSaveNomeLivre()}
                            />
                            <button
                                onClick={handleSaveNomeLivre}
                                className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold px-5 py-2 rounded-lg transition-colors"
                            >
                                Confirmar
                            </button>
                        </div>
                        {nomeLivre.trim() && (
                            <p className="text-xs text-slate-500">
                                Este stand ficará como: <strong className="text-amber-800">"{nomeLivre.trim()}"</strong>
                            </p>
                        )}
                    </div>
                ) : (
                    <>
                        {/* ── Barra de busca ── */}
                        <div className="px-4 py-3 border-b border-slate-100 bg-white shrink-0">
                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    ref={searchRef}
                                    type="text"
                                    placeholder="Buscar por nome, razão social, CNPJ, contato, email, cargo..."
                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg leading-none"
                                    >×</button>
                                )}
                            </div>
                        </div>

                        {/* ── Tabela ── */}
                        <div ref={listRef} className="flex-1 overflow-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                                        <th className="px-4 py-2">Nome / Razão Social</th>
                                        <th className="px-4 py-2">Contato Principal</th>
                                        <th className="px-4 py-2">Email</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-400 text-sm">Carregando clientes...</td></tr>
                                    ) : displayed.length === 0 ? (
                                        <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-400 text-sm">
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
                                                        className={`cursor-pointer border-b border-slate-100 transition-colors
                                                            ${isActive
                                                                ? 'bg-blue-50 border-l-4 border-l-blue-500'
                                                                : 'hover:bg-blue-50/60 even:bg-slate-50/60'}`}
                                                    >
                                                        <td className="px-4 py-2.5">
                                                            <div className="flex items-center gap-1.5">
                                                                {isActive && <span className="text-blue-500 text-xs shrink-0">✓</span>}
                                                                <div>
                                                                    <p className="text-[13px] font-semibold text-slate-800 leading-tight">{getNome(c)}</p>
                                                                    {c.contato_cargo && c.contato_cargo !== 'N/A' && (
                                                                        <p className="text-[11px] text-slate-400 leading-tight">{c.contato_cargo}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <p className="text-[12px] text-slate-700 leading-tight">{c.contato_nome !== 'N/A' ? c.contato_nome : '—'}</p>
                                                            <p className="text-[11px] text-slate-400 leading-tight font-mono">{c.contato_principal !== 'N/A' ? c.contato_principal : ''}</p>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <p className="text-[12px] text-slate-600 truncate max-w-[200px]">{c.contato_email !== 'N/A' ? c.contato_email : '—'}</p>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {loadingMore && (
                                                <tr><td colSpan={3} className="py-3 text-center text-slate-400 text-xs">Carregando mais...</td></tr>
                                            )}
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* ── Footer ── */}
                        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between">
                            <span className="text-[11px] text-slate-500">
                                {displayed.length} exibido(s){totalCount !== null ? ` de ${totalCount.toLocaleString('pt-BR')}` : ''}
                            </span>
                            <span className="text-[11px] text-slate-400">
                                {hasMore && !searchTerm ? 'Role para ver mais ↓' : 'Clique na linha para selecionar'}
                            </span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ClienteSelectorPopup;
