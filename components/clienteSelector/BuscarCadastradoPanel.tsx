import React from 'react';
import type { ClienteComContato } from '../ClienteSelectorWidget';
import type { UseClienteSearchReturn } from '../../hooks/useClienteSearch';

interface BuscarCadastradoPanelProps {
    search: UseClienteSearchReturn;
    currentClienteId?: string | null;
    totalCount: number | null;
    hideNovoCliente?: boolean;
    onSelect: (cliente: ClienteComContato) => void;
    onNovoCliente: () => void;
}

/**
 * Painel de busca de clientes cadastrados: barra de pesquisa + tabela paginada com scroll infinito.
 * Recebe o estado/actions do useClienteSearch para não duplicar lógica.
 */
export const BuscarCadastradoPanel: React.FC<BuscarCadastradoPanelProps> = ({
    search,
    currentClienteId,
    totalCount,
    hideNovoCliente,
    onSelect,
    onNovoCliente,
}) => {
    const {
        displayed,
        loading,
        loadingMore,
        hasMore,
        searchTerm,
        setSearchTerm,
        listRef,
        searchRef,
        setSentinel,
    } = search;

    return (
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
                        onClick={onNovoCliente}
                        className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all shrink-0"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        Novo Cliente
                    </button>
                )}
            </div>

            {/* Tabela de Resultados */}
            <div ref={listRef} className="flex-1 overflow-auto bg-slate-50 p-4">
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm h-full flex flex-col min-h-[300px]">
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse table-fixed">
                            <thead className="sticky top-0 z-10 bg-slate-200 shadow-sm">
                                <tr className="text-slate-700 text-[11px] font-bold uppercase tracking-tight">
                                    <th className="px-3 py-2 border-b border-r border-slate-300 w-[20%]">Nome Fantasia</th>
                                    <th className="px-3 py-2 border-b border-r border-slate-300 w-[25%]">Nome / Razão Social</th>
                                    <th className="px-3 py-2 border-b border-r border-slate-300 w-[15%]">Contato</th>
                                    <th className="px-3 py-2 border-b border-r border-slate-300 w-[12%]">Cargo</th>
                                    <th className="px-3 py-2 border-b border-r border-slate-300 w-[13%]">Telefone</th>
                                    <th className="px-3 py-2 border-b border-slate-300 w-[15%]">Email</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">Carregando clientes...</td></tr>
                                ) : displayed.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
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
                                                    onClick={() => onSelect(c)}
                                                    className={`cursor-pointer transition-colors group ${isActive
                                                        ? 'bg-blue-50/80 border-l-4 border-l-blue-500'
                                                        : 'hover:bg-blue-50/50 even:bg-slate-50/50 border-l-4 border-l-transparent'
                                                        }`}
                                                >
                                                    <td className="px-3 py-1.5 border-r border-slate-100">
                                                        <div className="flex items-center gap-1.5">
                                                            {isActive && <span className="text-blue-500 font-bold shrink-0 animate-pulse">✓</span>}
                                                            <p className="text-[12px] font-medium text-slate-700 leading-tight truncate" title={c.nome_fantasia || ''}>
                                                                {c.nome_fantasia || '—'}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-1.5 border-r border-slate-100">
                                                        <div className="flex items-center gap-1.5">
                                                            <p className="text-[12px] font-semibold text-slate-800 leading-tight truncate" title={c.tipo_pessoa === 'PJ' ? (c.razao_social ?? undefined) : (c.nome_completo ?? undefined)}>
                                                                {c.tipo_pessoa === 'PJ' ? c.razao_social : c.nome_completo}
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
                                            <tr><td colSpan={6} className="py-4 text-center text-slate-400 text-xs">Carregando mais dados...</td></tr>
                                        )}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
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
        </div>
    );
};
