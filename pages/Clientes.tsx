import React, { useState, useEffect, useRef, useCallback } from 'react';
import { simplifyText } from '../src/utils/textUtils';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { supabase } from '../services/supabaseClient';
import { Database } from '../database.types';

type Cliente = Database['public']['Tables']['clientes']['Row'] & {
    contato_nome?: string;
    contato_principal?: string;
    contato_email?: string;
    contato_cargo?: string;
};

const PAGE_SIZE = 50;

const Clientes: React.FC = () => {
    const navigate = useNavigate();
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [totalCount, setTotalCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const pageRef = useRef(0);
    const sentinelRef = useRef<HTMLTableRowElement | null>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Count metadata (zero payload) ──────────────────────────
    useEffect(() => {
        supabase
            .from('clientes')
            .select('*', { count: 'exact', head: true })
            .then(({ count }) => setTotalCount(count));
    }, []);

    // ── Initial load ────────────────────────────────────────────
    useEffect(() => {
        pageRef.current = 0;
        setClientes([]);
        setHasMore(true);
        loadPage(0, '');
    }, []);

    // ── Search: debounce → server-side if ≥3 chars ─────────────
    useEffect(() => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

        const simplified = simplifyText(searchTerm);

        if (simplified.length === 0) {
            // Reset to normal pagination
            pageRef.current = 0;
            setClientes([]);
            setHasMore(true);
            loadPage(0, '');
            return;
        }

        if (simplified.length < 3) {
            // Filter locally — no new request
            return;
        }

        // ≥ 3 chars → server-side search
        searchTimerRef.current = setTimeout(() => {
            setIsSearching(true);
            serverSearch(simplified);
        }, 300);
    }, [searchTerm]);

    const formatRow = (c: any): Cliente => {
        const p = c.contatos?.find((ct: any) => ct.principal) || c.contatos?.[0];
        return {
            ...c,
            contato_nome: p?.nome || 'N/A',
            contato_principal: p?.telefone || 'N/A',
            contato_email: p?.email || 'N/A',
            contato_cargo: p?.cargo || 'N/A',
        };
    };

    const loadPage = async (page: number, term: string) => {
        try {
            if (page === 0) setLoading(true);
            else setLoadingMore(true);

            const from = page * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            const { data, error } = await supabase
                .from('clientes')
                .select('*, contatos(nome, telefone, email, cargo, principal)')
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            const formatted = (data || []).map(formatRow);
            setClientes(prev => page === 0 ? formatted : [...prev, ...formatted]);
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
            const numericTerm = term.replace(/\D/g, '');

            // Build OR filter across searchable fields
            const orFilters = [
                `nome_completo.ilike.%${term}%`,
                `razao_social.ilike.%${term}%`,
                `nome_fantasia.ilike.%${term}%`,
            ];
            if (numericTerm) {
                orFilters.push(`cnpj.ilike.%${numericTerm}%`);
                orFilters.push(`cpf.ilike.%${numericTerm}%`);
            }

            const { data, error } = await supabase
                .from('clientes')
                .select('*, contatos(nome, telefone, email, cargo, principal)')
                .or(orFilters.join(','))
                .order('created_at', { ascending: false })
                .limit(200); // cap search at 200

            if (error) throw error;

            setClientes((data || []).map(formatRow));
            setHasMore(false); // no infinite scroll during search
        } catch (err) {
            console.error('Erro na busca:', err);
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    // ── IntersectionObserver sentinel ───────────────────────────
    const setSentinel = useCallback((el: HTMLTableRowElement | null) => {
        sentinelRef.current = el;
        if (observerRef.current) observerRef.current.disconnect();
        if (!el) return;

        observerRef.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
                pageRef.current += 1;
                loadPage(pageRef.current, '');
                observerRef.current?.disconnect();
            }
        }, { rootMargin: '200px' });

        observerRef.current.observe(el);
    }, [hasMore, loadingMore, loading]);

    // Derived: local filter for <3 char searches
    const displayed = (() => {
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
    })();

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Excluir o cliente "${name}"?`)) return;
        try {
            const { error } = await supabase.from('clientes').delete().eq('id', id);
            if (error) throw error;
            setClientes(prev => prev.filter(c => c.id !== id));
            setTotalCount(prev => prev !== null ? prev - 1 : null);
        } catch (err: any) {
            alert('Erro ao excluir: ' + err.message);
        }
    };

    return (
        <Layout title="Gestão de Clientes">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">

                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="relative flex-1 max-w-md">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Buscar por Razão Social, CNPJ ou Nome..."
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {totalCount !== null && (
                            <span className="text-xs text-slate-500 whitespace-nowrap">
                                {totalCount.toLocaleString('pt-BR')} clientes no total
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => navigate('/clientes/novo')}
                        className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        Novo Cliente
                    </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-h-[calc(100vh-260px)] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-200 text-slate-700 text-[11px] font-bold uppercase tracking-tight">
                                <th className="px-3 py-0.5 border-b border-r border-slate-300">Nome / Razão Social</th>
                                <th className="px-3 py-0.5 border-b border-r border-slate-300">Contato</th>
                                <th className="px-3 py-0.5 border-b border-r border-slate-300">Cargo</th>
                                <th className="px-3 py-0.5 border-b border-r border-slate-300">Telefone</th>
                                <th className="px-3 py-0.5 border-b border-r border-slate-300">Email</th>
                                <th className="px-3 py-0.5 border-b border-slate-300 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                                        <div className="flex flex-col items-center gap-2">
                                            <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span className="text-sm font-medium">Carregando clientes...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : displayed.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="max-w-xs mx-auto flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                            </div>
                                            <p className="text-slate-500 font-medium">Nenhum cliente encontrado.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {displayed.map((c, idx) => {
                                        const isLast = idx === displayed.length - 1;
                                        return (
                                            <tr
                                                key={c.id}
                                                ref={isLast && hasMore ? setSentinel : null}
                                                className="hover:bg-blue-100/40 even:bg-slate-200/40 transition-colors group"
                                            >
                                                <td className="px-3 py-0.5 border-b border-r border-slate-300 whitespace-nowrap max-w-[250px] truncate">
                                                    <span className="text-[12px] font-semibold text-slate-800">
                                                        {c.tipo_pessoa === 'PJ' ? c.razao_social : c.nome_completo}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-0.5 border-b border-r border-slate-300 text-[12px] text-slate-700 whitespace-nowrap max-w-[150px] truncate">
                                                    {c.contato_nome}
                                                </td>
                                                <td className="px-3 py-0.5 border-b border-r border-slate-300 text-[12px] text-slate-600 whitespace-nowrap max-w-[150px] truncate">
                                                    {c.contato_cargo && c.contato_cargo !== 'N/A' ? c.contato_cargo : '-'}
                                                </td>
                                                <td className="px-3 py-0.5 border-b border-r border-slate-300 text-[12px] text-slate-700 whitespace-nowrap max-w-[150px] truncate">
                                                    {c.contato_principal}
                                                </td>
                                                <td className="px-3 py-0.5 border-b border-r border-slate-300 text-[12px] text-slate-700 whitespace-nowrap max-w-[150px] truncate">
                                                    {c.contato_email}
                                                </td>
                                                <td className="px-2 py-0.5 border-b border-slate-300 text-right whitespace-nowrap bg-slate-100/30">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => navigate(`/clientes/editar/${c.id}`)}
                                                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-white rounded border border-slate-200 shadow-sm transition-all"
                                                            title="Editar"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(c.id, (c.tipo_pessoa === 'PF' ? c.nome_completo : c.razao_social) || '')}
                                                            className="p-1 text-slate-500 hover:text-red-600 hover:bg-white rounded border border-slate-200 shadow-sm transition-all"
                                                            title="Excluir"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {loadingMore && (
                                        <tr>
                                            <td colSpan={6} className="py-3 text-center text-slate-400 text-xs">
                                                Carregando mais...
                                            </td>
                                        </tr>
                                    )}
                                </>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="px-4 py-1.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 font-medium flex justify-between">
                    <span>
                        {isSearching ? 'Buscando...' : `${displayed.length} exibidos${totalCount !== null ? ` de ${totalCount.toLocaleString('pt-BR')} no total` : ''}`}
                    </span>
                    <span>{hasMore && !searchTerm ? 'Role para carregar mais ↓' : ''}</span>
                </div>
            </div>
        </Layout>
    );
};

export default Clientes;
