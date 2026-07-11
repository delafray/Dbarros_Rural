import { useState, useEffect, useRef, useMemo, useCallback, RefObject } from 'react';
import { simplifyText } from '../src/utils/textUtils';
import { maskTelefone } from '../utils/masks';
import { clientesService, ClienteSelectorRow } from '../services/clientesService';
import type { ClienteComContato } from '../components/ClienteSelectorWidget';

const PAGE_SIZE = 50;

export interface UseClienteSearchReturn {
    clientes: ClienteComContato[];
    displayed: ClienteComContato[];
    totalCount: number | null;
    loading: boolean;
    loadingMore: boolean;
    hasMore: boolean;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    listRef: RefObject<HTMLDivElement>;
    searchRef: RefObject<HTMLInputElement>;
    setSentinel: (el: HTMLTableRowElement | null) => void;
}

/** Transforma um row bruto do banco no formato ClienteComContato com contato principal. */
function formatRow(c: ClienteSelectorRow): ClienteComContato {
    const p = c.contatos?.find(ct => ct.principal) || c.contatos?.[0];
    return {
        ...c,
        contato_nome: p?.nome || 'N/A',
        contato_principal: p?.telefone ? maskTelefone(p.telefone) : 'N/A',
        contato_email: p?.email || 'N/A',
        contato_cargo: p?.cargo || 'N/A',
    };
}

/**
 * Encapsula toda a lógica de busca/paginação do ClienteSelectorWidget:
 * - carregamento paginado com scroll infinito (IntersectionObserver)
 * - busca server-side com debounce (>= 3 chars via RPC)
 * - filtro local para buscas < 3 chars
 */
export function useClienteSearch(): UseClienteSearchReturn {
    const [clientes, setClientes] = useState<ClienteComContato[]>([]);
    const [totalCount, setTotalCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const searchRef = useRef<HTMLInputElement>(null);
    const pageRef = useRef(0);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Carga inicial: contagem + primeira página
    useEffect(() => {
        clientesService.countClientes().then(count => setTotalCount(count));
        loadPage(0);
        setTimeout(() => searchRef.current?.focus(), 50);
    }, []);

    // Debounce de busca
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
        if (simplified.length < 3) return; // filtro local cuida disso

        searchTimerRef.current = setTimeout(() => {
            serverSearch(simplified);
        }, 150);
    }, [searchTerm]);

    const loadPage = async (page: number) => {
        try {
            if (page === 0) setLoading(true);
            else setLoadingMore(true);

            const rows = await clientesService.listClientesPage(page, PAGE_SIZE);
            const formatted = rows.map(formatRow);
            setClientes(prev => page === 0 ? formatted : [...prev, ...formatted]);
            setHasMore(rows.length === PAGE_SIZE);
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
            const rows = await clientesService.searchClientes(term);
            setClientes(rows.map(formatRow));
            setHasMore(false);
        } catch (err) {
            console.error('Erro na busca:', err);
        } finally {
            setLoading(false);
        }
    };

    // Sentinela de scroll infinito
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

    // Filtro local para buscas com menos de 3 caracteres
    const displayed = useMemo(() => {
        const simplified = simplifyText(searchTerm);
        if (!simplified || simplified.length >= 3) return clientes;
        const numericTerm = searchTerm.replace(/\D/g, '');
        return clientes.filter(c => {
            const textFields = [
                c.nome_completo || '', c.razao_social || '', c.nome_fantasia || '',
                c.contato_nome || '', c.contato_cargo || '', c.contato_email || '',
            ];
            const matchText = textFields.some(f => simplifyText(f).includes(simplified));
            const numericFields = [c.cpf || '', c.cnpj || '', c.contato_principal || ''];
            const matchNumeric = !!numericTerm && numericFields.some(f => f.replace(/\D/g, '').includes(numericTerm));
            return matchText || matchNumeric;
        });
    }, [clientes, searchTerm]);

    return {
        clientes,
        displayed,
        totalCount,
        loading,
        loadingMore,
        hasMore,
        searchTerm,
        setSearchTerm,
        listRef,
        searchRef,
        setSentinel,
    };
}
