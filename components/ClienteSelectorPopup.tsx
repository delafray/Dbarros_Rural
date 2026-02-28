import React, { useState } from 'react';
import { ClienteSelectorWidget, ClienteComContato } from './ClienteSelectorWidget';

type Step = 'menu' | 'buscar' | 'nome_livre' | 'confirmar_limpar' | 'bloqueado';

interface Props {
    onSelect: (clienteId: string | null, nomeLivre: string | null) => void;
    onClose: () => void;
    currentClienteId?: string | null;
    currentNomeLivre?: string | null;
    currentClienteNome?: string | null;
    rowHasData?: boolean;
}

const Overlay: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={e => e.target === e.currentTarget && onClose()}
    >
        {children}
    </div>
);

const CloseBtn: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <button
        onClick={onClose}
        className="w-7 h-7 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors flex-shrink-0"
    >
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    </button>
);

const ClienteSelectorPopup: React.FC<Props> = ({
    onSelect, onClose, currentClienteId, currentNomeLivre, currentClienteNome, rowHasData,
}) => {
    const [step, setStep] = useState<Step>('menu');
    const [nomeLivre, setNomeLivre] = useState(currentNomeLivre || '');

    const hasAssignment = !!(currentClienteId || currentNomeLivre);
    const isNomeLivre = !currentClienteId && !!currentNomeLivre;
    const assignedLabel = currentClienteNome || currentNomeLivre;

    const handleWidgetSelect = (cliente: ClienteComContato | null, nomeLivreSel: string | null) => {
        onSelect(cliente?.id || null, nomeLivreSel);
        onClose();
    };

    const handleSaveNomeLivre = () => {
        const trimmed = nomeLivre.trim();
        onSelect(null, trimmed || null);
        onClose();
    };

    const handleDisponivel = () => {
        if (rowHasData) {
            setStep('bloqueado');
        } else if (hasAssignment) {
            setStep('confirmar_limpar');
        } else {
            onSelect(null, null);
            onClose();
        }
    };

    // ── STEP: Buscar cadastrado ──────────────────────────────────────
    if (step === 'buscar') {
        return (
            <Overlay onClose={onClose}>
                <div className="bg-white shadow-2xl w-full max-w-5xl rounded-2xl flex flex-col max-h-[90vh] overflow-hidden">
                    <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between shrink-0 rounded-t-2xl">
                        <div>
                            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Selecionar Cliente</p>
                            <span className="font-black text-sm text-white">Buscar no Cadastro</span>
                        </div>
                        <CloseBtn onClose={onClose} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <ClienteSelectorWidget
                            onSelect={handleWidgetSelect}
                            currentClienteId={currentClienteId}
                            currentNomeLivre={null}
                            hideTabs={true}
                        />
                    </div>
                    <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 shrink-0">
                        <button
                            onClick={() => setStep('menu')}
                            className="text-[11px] font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 transition-colors uppercase tracking-wider"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Voltar
                        </button>
                    </div>
                </div>
            </Overlay>
        );
    }

    // ── STEP: Nome livre ─────────────────────────────────────────────
    if (step === 'nome_livre') {
        return (
            <Overlay onClose={onClose}>
                <div className="bg-white shadow-2xl w-full max-w-md rounded-2xl p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Selecionar Cliente</p>
                            <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-widest mt-0.5">Nome Livre</h3>
                        </div>
                        <CloseBtn onClose={onClose} />
                    </div>
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        Digite qualquer nome ou observação — sem vínculo com o cadastro de clientes.
                    </p>
                    <input
                        type="text"
                        autoFocus
                        className="w-full border-2 border-amber-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white"
                        placeholder="Ex: A Confirmar, Prefeituras, Indecisos..."
                        value={nomeLivre}
                        onChange={e => setNomeLivre(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveNomeLivre()}
                    />
                    <div className="flex gap-2 justify-between">
                        <button
                            onClick={() => setStep('menu')}
                            className="px-4 py-2 rounded-xl text-[11px] font-black text-slate-600 hover:bg-slate-100 uppercase tracking-wider transition-colors"
                        >
                            Voltar
                        </button>
                        <button
                            onClick={handleSaveNomeLivre}
                            className="px-5 py-2 rounded-xl text-[11px] font-black bg-amber-500 hover:bg-amber-600 text-white uppercase tracking-wider transition-colors"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </Overlay>
        );
    }

    // ── STEP: Bloqueado — linha tem dados ────────────────────────────
    if (step === 'bloqueado') {
        return (
            <Overlay onClose={onClose}>
                <div className="bg-white shadow-2xl w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4">
                    <div className="w-12 h-12 rounded-full bg-orange-50 border-2 border-orange-100 flex items-center justify-center mx-auto">
                        <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                    </div>
                    <div className="text-center">
                        <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-widest mb-2">Não é Possível Liberar</h3>
                        <p className="text-sm text-slate-600">
                            Este stand possui <strong className="text-slate-800">dados preenchidos</strong> na planilha (tipo de venda, itens selecionados, etc.).
                        </p>
                        <p className="text-sm text-slate-500 mt-2">
                            Limpe manualmente a linha do stand antes de liberar.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 rounded-xl text-[11px] font-black bg-slate-800 hover:bg-slate-700 text-white uppercase tracking-wider transition-colors"
                    >
                        Entendido
                    </button>
                </div>
            </Overlay>
        );
    }

    // ── STEP: Confirmar limpar ───────────────────────────────────────
    if (step === 'confirmar_limpar') {
        return (
            <Overlay onClose={onClose}>
                <div className="bg-white shadow-2xl w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center mx-auto">
                        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div className="text-center">
                        <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-widest mb-2">Liberar Stand</h3>
                        <p className="text-sm text-slate-600">
                            Este stand está reservado para{' '}
                            <strong className="text-slate-800">{assignedLabel}</strong>.
                        </p>
                        <p className="text-sm text-slate-500 mt-1">Deseja liberar e deixar disponível?</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setStep('menu')}
                            className="flex-1 py-2.5 rounded-xl text-[11px] font-black text-slate-600 bg-slate-100 hover:bg-slate-200 uppercase tracking-wider transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => { onSelect(null, null); onClose(); }}
                            className="flex-1 py-2.5 rounded-xl text-[11px] font-black bg-red-500 hover:bg-red-600 text-white uppercase tracking-wider transition-colors"
                        >
                            Liberar
                        </button>
                    </div>
                </div>
            </Overlay>
        );
    }

    // ── STEP: Menu principal ─────────────────────────────────────────
    return (
        <Overlay onClose={onClose}>
            <div className="bg-white shadow-2xl w-full max-w-sm rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
                    <div>
                        <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Stand</p>
                        <h3 className="text-sm font-black text-white mt-0.5">Gerenciar Cliente</h3>
                    </div>
                    <CloseBtn onClose={onClose} />
                </div>

                {/* Estado atual */}
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Situação Atual</p>
                    {hasAssignment ? (
                        <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isNomeLivre ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                            <p className="text-sm font-bold text-slate-800 truncate flex-1 min-w-0">
                                {assignedLabel}
                            </p>
                            {isNomeLivre && (
                                <span className="text-[8px] bg-amber-100 text-amber-700 font-black px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0">
                                    Nome Livre
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-300 flex-shrink-0" />
                            <p className="text-sm text-slate-400 italic">Disponível</p>
                        </div>
                    )}
                </div>

                {/* Ações */}
                <div className="p-4 flex flex-col gap-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">O que deseja fazer?</p>

                    {/* Buscar cadastrado */}
                    <button
                        onClick={() => setStep('buscar')}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors text-left group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center flex-shrink-0 transition-colors">
                            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-blue-700 uppercase tracking-widest">Buscar Cliente Cadastrado</p>
                            <p className="text-[10px] text-blue-500 mt-0.5">Pesquisar e vincular um cliente do sistema</p>
                        </div>
                    </button>

                    {/* Nome livre */}
                    <button
                        onClick={() => setStep('nome_livre')}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors text-left group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center flex-shrink-0 transition-colors">
                            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-amber-700 uppercase tracking-widest">Usar Nome Livre</p>
                            <p className="text-[10px] text-amber-500 mt-0.5">Digitar qualquer nome sem vínculo ao cadastro</p>
                        </div>
                    </button>

                    {/* Deixar disponível */}
                    <button
                        onClick={handleDisponivel}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100 hover:bg-red-100 transition-colors text-left group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-red-100 group-hover:bg-red-200 flex items-center justify-center flex-shrink-0 transition-colors">
                            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-red-700 uppercase tracking-widest">Deixar Disponível</p>
                            <p className="text-[10px] text-red-400 mt-0.5">
                                {hasAssignment ? 'Remover o cliente e liberar este stand' : 'Stand já está disponível'}
                            </p>
                        </div>
                    </button>
                </div>

                <div className="px-4 pb-4">
                    <button
                        onClick={onClose}
                        className="w-full py-2 text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </Overlay>
    );
};

export default ClienteSelectorPopup;
