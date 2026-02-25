import React, { useState, useEffect, useRef, useCallback } from 'react';
import { simplifyText } from '../src/utils/textUtils';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button } from '../components/UI';
import { supabase } from '../services/supabaseClient';
import { Evento } from '../services/eventosService';

const PAGE_SIZE = 50;

const Eventos: React.FC = () => {
    const navigate = useNavigate();
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [totalCount, setTotalCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const pageRef = useRef(0);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Count metadata (zero payload)
    useEffect(() => {
        supabase
            .from('eventos')
            .select('*', { count: 'exact', head: true })
            .then(({ count }) => setTotalCount(count));
    }, []);

    // Initial load
    useEffect(() => {
        loadPage(0);
    }, []);

    // Search debounce
    useEffect(() => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

        const simplified = simplifyText(searchTerm);

        if (simplified.length === 0) {
            pageRef.current = 0;
            setEventos([]);
            setHasMore(true);
            loadPage(0);
            return;
        }

        if (simplified.length < 3) return; // local filter handles it

        searchTimerRef.current = setTimeout(() => {
            serverSearch(simplified);
        }, 300);
    }, [searchTerm]);

    const loadPage = async (page: number) => {
        try {
            if (page === 0) setLoading(true);
            else setLoadingMore(true);

            const from = page * PAGE_SIZE;
            const { data, error } = await supabase
                .from('eventos')
                .select('*')
                .order('nome')
                .range(from, from + PAGE_SIZE - 1);

            if (error) throw error;

            const rows = data || [];
            setEventos(prev => page === 0 ? rows : [...prev, ...rows]);
            setHasMore(rows.length === PAGE_SIZE);
        } catch (err) {
            console.error('Erro ao carregar eventos:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const serverSearch = async (term: string) => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('eventos')
                .select('*')
                .or(`nome.ilike.%${term}%,promotor_nome.ilike.%${term}%,promotor_email.ilike.%${term}%`)
                .order('nome')
                .limit(200);

            if (error) throw error;
            setEventos(data || []);
            setHasMore(false);
        } catch (err) {
            console.error('Erro na busca:', err);
        } finally {
            setLoading(false);
        }
    };

    // IntersectionObserver sentinel
    const setSentinel = useCallback((el: HTMLTableRowElement | null) => {
        if (observerRef.current) observerRef.current.disconnect();
        if (!el || !hasMore || loadingMore) return;

        observerRef.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                pageRef.current += 1;
                loadPage(pageRef.current);
                observerRef.current?.disconnect();
            }
        }, { rootMargin: '200px' });

        observerRef.current.observe(el);
    }, [hasMore, loadingMore]);

    // Local filter for <3 chars
    const displayed = (() => {
        const simplified = simplifyText(searchTerm);
        if (!simplified || simplified.length >= 3) return eventos;
        return eventos.filter(e =>
            simplifyText(e.nome).includes(simplified) ||
            simplifyText(e.promotor_nome || '').includes(simplified)
        );
    })();

    return (
        <Layout
            title="Gestão de Eventos"
            headerActions={
                <Button onClick={() => navigate('/eventos/novo')}>Novo Evento</Button>
            }
        >
            <div className="bg-white border border-slate-300 rounded-none shadow-sm overflow-hidden flex flex-col h-[calc(100vh-140px)]">

                {/* Search Bar */}
                <div className="p-3 border-b border-slate-300 bg-slate-50/50 flex items-center gap-3">
                    <div className="relative max-w-md flex-1">
                        <input
                            type="text"
                            placeholder="Buscar eventos ou promotores..."
                            className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-300 text-[13px] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <svg className="absolute left-3 top-2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    {totalCount !== null && (
                        <span className="text-[11px] text-slate-500 whitespace-nowrap">
                            {totalCount.toLocaleString('pt-BR')} eventos no total
                        </span>
                    )}
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-tight">
                                <th className="px-3 py-0.5 border-b border-r border-slate-300 text-left">Nome do Evento</th>
                                <th className="px-3 py-0.5 border-b border-r border-slate-300 text-left">Promotor</th>
                                <th className="px-3 py-0.5 border-b border-r border-slate-300 text-left">Telefone</th>
                                <th className="px-3 py-0.5 border-b border-r border-slate-300 text-left">E-mail</th>
                                <th className="px-3 py-0.5 border-b border-slate-300 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-3 py-4 text-center text-slate-400 text-[12px]">Carregando eventos...</td>
                                </tr>
                            ) : displayed.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-3 py-4 text-center text-slate-400 text-[12px]">Nenhum evento encontrado.</td>
                                </tr>
                            ) : (
                                <>
                                    {displayed.map((e, idx) => {
                                        const isLast = idx === displayed.length - 1;
                                        return (
                                            <tr
                                                key={e.id}
                                                ref={isLast && hasMore ? setSentinel : null}
                                                className="hover:bg-blue-100/30 even:bg-slate-200/40 transition-colors group"
                                            >
                                                <td className="px-3 py-0.5 border-b border-r border-slate-300 whitespace-nowrap max-w-[250px] truncate text-[12px] font-semibold text-slate-700">{e.nome}</td>
                                                <td className="px-3 py-0.5 border-b border-r border-slate-300 whitespace-nowrap max-w-[200px] truncate text-[12px] text-slate-600">{e.promotor_nome || '-'}</td>
                                                <td className="px-3 py-0.5 border-b border-r border-slate-300 whitespace-nowrap text-[12px] text-slate-600">{e.promotor_telefone || '-'}</td>
                                                <td className="px-3 py-0.5 border-b border-r border-slate-300 whitespace-nowrap max-w-[200px] truncate text-[12px] text-slate-600">{e.promotor_email || '-'}</td>
                                                <td className="px-3 py-0.5 border-b border-slate-300 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            onClick={() => navigate(`/eventos/editar/${e.id}`)}
                                                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded-none border border-transparent hover:border-slate-200 transition-all"
                                                            title="Editar Evento"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {loadingMore && (
                                        <tr>
                                            <td colSpan={5} className="py-3 text-center text-slate-400 text-xs">Carregando mais...</td>
                                        </tr>
                                    )}
                                </>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Status Bar */}
                <div className="px-3 py-1 bg-slate-100 border-t border-slate-300 flex justify-between items-center text-[10px] text-slate-500 font-medium">
                    <span>{displayed.length} exibidos{totalCount !== null ? ` de ${totalCount.toLocaleString('pt-BR')} no total` : ''}</span>
                    <span className="uppercase tracking-wider">{hasMore && !searchTerm ? 'Role para carregar mais ↓' : ''}</span>
                </div>
            </div>
        </Layout>
    );
};

export default Eventos;
