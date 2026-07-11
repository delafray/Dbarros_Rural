import React, { useState } from 'react';
import { useClienteSearch } from '../hooks/useClienteSearch';
import { BuscarCadastradoPanel } from './clienteSelector/BuscarCadastradoPanel';
import { NomeLivrePanel } from './clienteSelector/NomeLivrePanel';
import { NovoClientePanel } from './clienteSelector/NovoClientePanel';

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

export const ClienteSelectorWidget: React.FC<ClienteSelectorWidgetProps> = ({
    onSelect, currentClienteId, currentNomeLivre, onRequestNomeLivreFallback, hideTabs, hideNovoCliente
}) => {
    const search = useClienteSearch();

    const [useNomeLivre, setUseNomeLivre] = useState(!!currentNomeLivre && !currentClienteId);
    const [isNovoCliente, setIsNovoCliente] = useState(false);

    const handleSelect = (c: ClienteComContato) => onSelect(c, null);
    const handleNomeLivreConfirm = (value: string | null) => onSelect(null, value);
    const handleDisponivel = () => onSelect(null, null);

    const handleTabBuscar = () => {
        setUseNomeLivre(false);
        setIsNovoCliente(false);
        setTimeout(() => search.searchRef.current?.focus(), 50);
    };

    const handleTabNomeLivre = () => {
        if (onRequestNomeLivreFallback) {
            onRequestNomeLivreFallback();
        } else {
            setUseNomeLivre(true);
            setIsNovoCliente(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-white overflow-hidden rounded-lg">
            {/* Header: contagem total */}
            <div className="bg-slate-100 border-b border-slate-200 px-5 py-2 flex items-center justify-between shrink-0">
                <div>
                    {search.totalCount !== null && (
                        <span className="text-slate-500 font-bold text-xs">{search.totalCount.toLocaleString('pt-BR')} clientes cadastrados</span>
                    )}
                </div>
            </div>

            {/* Tabs de modo */}
            {!hideTabs && (
                <div className="flex items-stretch border-b border-slate-200 bg-slate-50 shrink-0">
                    <button
                        onClick={handleTabBuscar}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${!useNomeLivre
                            ? 'border-blue-500 text-blue-700 bg-white'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/70'}`}
                    >
                        🔍 Buscar Cadastrado
                    </button>
                    <div className="w-px bg-slate-200" />
                    <button
                        onClick={handleTabNomeLivre}
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

            {/* Conteúdo baseado no modo ativo */}
            {useNomeLivre ? (
                <NomeLivrePanel
                    initialValue={currentNomeLivre || ''}
                    onConfirm={handleNomeLivreConfirm}
                />
            ) : isNovoCliente ? (
                <NovoClientePanel
                    onSaved={(cliente) => onSelect(cliente, null)}
                    onCancel={() => setIsNovoCliente(false)}
                />
            ) : (
                <BuscarCadastradoPanel
                    search={search}
                    currentClienteId={currentClienteId}
                    totalCount={search.totalCount}
                    hideNovoCliente={hideNovoCliente}
                    onSelect={handleSelect}
                    onNovoCliente={() => setIsNovoCliente(true)}
                />
            )}
        </div>
    );
};
