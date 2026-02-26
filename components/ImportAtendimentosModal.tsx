import React, { useState, useEffect } from 'react';
import { atendimentosService } from '../services/atendimentosService';

interface Edition {
    id: string;
    titulo: string;
    data_inicio: string;
    eventos: { nome: string };
}

interface ImportAtendimentosModalProps {
    currentEdicaoId: string;
    onClose: () => void;
    onImported: () => void;
}

export function ImportAtendimentosModal({ currentEdicaoId, onClose, onImported }: ImportAtendimentosModalProps) {
    const [editions, setEditions] = useState<Edition[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        atendimentosService.getOtherEditions(currentEdicaoId)
            .then(setEditions)
            .finally(() => setLoading(false));
    }, [currentEdicaoId]);

    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleImport = async () => {
        if (selectedIds.size === 0) return;
        setImporting(true);
        try {
            await atendimentosService.importFromEditions(currentEdicaoId, Array.from(selectedIds));
            onImported();
            onClose();
        } catch (err: any) {
            alert('Erro ao importar: ' + err.message);
        } finally {
            setImporting(false);
        }
    };

    const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

    return (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-[#1F497D] px-6 py-4 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="font-bold text-white text-sm">Importar Atendimentos</h2>
                        <p className="text-[10px] text-blue-200">Copie contatos de outras edições para a atual</p>
                    </div>
                    <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <p className="text-xs text-slate-500 leading-relaxed italic border-l-4 border-amber-400 pl-3">
                        O sistema irá buscar todos os clientes atendidos nas edições selecionadas e adicioná-los aqui,
                        evitando duplicar quem já está na lista atual.
                    </p>

                    {loading ? (
                        <div className="py-12 text-center text-slate-400 text-xs">Carregando edições disponíveis...</div>
                    ) : editions.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-xl">
                            Nenhuma outra edição encontrada para importar.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {editions.map(ed => (
                                <label
                                    key={ed.id}
                                    className={`flex items-center gap-4 p-3 rounded-xl border transition-all cursor-pointer ${selectedIds.has(ed.id)
                                            ? 'bg-blue-50 border-blue-200 shadow-sm'
                                            : 'bg-white border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(ed.id)}
                                        onChange={() => toggleSelection(ed.id)}
                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                                    />
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-slate-800">{ed.eventos.nome}</div>
                                        <div className="text-[10px] text-slate-500">{ed.titulo}</div>
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                        {fmtDate(ed.data_inicio)}
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={importing || selectedIds.size === 0}
                        className="px-6 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 shadow-sm transition-all"
                    >
                        {importing ? 'Importando...' : `Importar (${selectedIds.size})`}
                    </button>
                </div>
            </div>
        </div>
    );
}
