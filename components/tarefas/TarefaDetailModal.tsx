import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../UI';
import { useAppDialog } from '../../context/DialogContext';
import {
    tarefasService,
    Tarefa,
    TarefaHistorico,
    TarefaStatus,
    TarefaPrioridade,
    PRIORIDADES,
    STATUSES,
    prioridadeBg,
    prioridadeText,
    prioridadeLabel,
    statusBg,
    statusText,
    statusLabel,
} from '../../services/tarefasService';
import { fmtDate, isPrazoVencido } from './tarefasUtils';

export interface TarefaDetailModalProps {
    tarefa: Tarefa;
    onClose: () => void;
    onSuccess: () => void;
}

const TarefaDetailModal: React.FC<TarefaDetailModalProps> = ({ tarefa, onClose, onSuccess }) => {
    const appDialog = useAppDialog();
    const [historico, setHistorico] = useState<TarefaHistorico[]>([]);
    const [loadingHist, setLoadingHist] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [obs, setObs] = useState('');
    const [novoStatus, setNovoStatus] = useState<TarefaStatus>(tarefa.status);
    const [novaPrioridade, setNovaPrioridade] = useState<TarefaPrioridade>(tarefa.prioridade);
    const [novoPrazo, setNovoPrazo] = useState<string>(
        tarefa.data_prazo ? tarefa.data_prazo.substring(0, 16) : ''
    );

    const carregarHistorico = useCallback(() => {
        setLoadingHist(true);
        tarefasService.getHistorico(tarefa.id)
            .then(setHistorico)
            .finally(() => setLoadingHist(false));
    }, [tarefa.id]);

    useEffect(() => { carregarHistorico(); }, [carregarHistorico]);

    const handleSave = async () => {
        if (!obs.trim()) return;
        setIsSubmitting(true);
        try {
            await tarefasService.addHistorico({
                tarefa_id: tarefa.id,
                descricao: obs.trim(),
                status_anterior: tarefa.status,
                status_novo: novoStatus,
                user_id: null,
            });
            await tarefasService.update(tarefa.id, {
                prioridade: novaPrioridade,
                data_prazo: novoPrazo ? new Date(novoPrazo).toISOString() : null,
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            void appDialog.alert({ title: 'Erro', message: 'Erro ao salvar: ' + err.message, type: 'danger' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const vencida = isPrazoVencido(tarefa.data_prazo, tarefa.status);
    const responsavelNome = tarefa.responsavel?.name || null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/50">
                    <div className="flex-1 min-w-0 pr-4">
                        <h2 className="font-black text-slate-800 text-sm leading-tight">{tarefa.titulo}</h2>
                        {tarefa.descricao && (
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{tarefa.descricao}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                                style={{ background: statusBg[tarefa.status], color: statusText[tarefa.status] }}>
                                {statusLabel[tarefa.status]}
                            </span>
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                                style={{ background: prioridadeBg[tarefa.prioridade], color: prioridadeText[tarefa.prioridade] }}>
                                {prioridadeLabel[tarefa.prioridade]}
                            </span>
                            {responsavelNome && (
                                <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    {responsavelNome}
                                </span>
                            )}
                            {tarefa.data_prazo && (
                                <span className={`text-[9px] font-bold flex items-center gap-1 ${vencida ? 'text-red-600' : 'text-slate-500'}`}>
                                    {vencida ? '⚠ Vencida: ' : 'Prazo: '}{fmtDate(tarefa.data_prazo)}
                                </span>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Formulário nova obs */}
                <div className="border-b border-slate-200 px-5 py-4 bg-white space-y-3">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        NOVA ATUALIZAÇÃO <span className="text-red-500">*</span>
                    </h3>
                    <textarea
                        autoFocus
                        value={obs}
                        onChange={e => setObs(e.target.value)}
                        placeholder="Descreva a atualização ou comentário (obrigatório)..."
                        rows={3}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-slate-50"
                    />
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
                            <select
                                value={novoStatus}
                                onChange={e => setNovoStatus(e.target.value as TarefaStatus)}
                                className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                style={{ background: statusBg[novoStatus], color: statusText[novoStatus] }}
                            >
                                {STATUSES.map(s => (
                                    <option key={s} value={s}>{statusLabel[s]}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Prioridade</label>
                            <select
                                value={novaPrioridade}
                                onChange={e => setNovaPrioridade(e.target.value as TarefaPrioridade)}
                                className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                style={{ background: prioridadeBg[novaPrioridade], color: prioridadeText[novaPrioridade] }}
                            >
                                {PRIORIDADES.map(p => (
                                    <option key={p} value={p}>{prioridadeLabel[p]}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Prazo</label>
                            <input
                                type="datetime-local"
                                value={novoPrazo}
                                onChange={e => setNovoPrazo(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end pt-1">
                        <Button
                            onClick={handleSave}
                            disabled={isSubmitting || !obs.trim()}
                            className="h-9 px-6 text-[11px] font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-700"
                        >
                            {isSubmitting ? 'Salvando...' : 'Salvar Atualização'}
                        </Button>
                    </div>
                </div>

                {/* Histórico */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-slate-50/50 min-h-0">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Histórico</h3>
                    {loadingHist ? (
                        <p className="text-xs text-slate-400 text-center py-6">Carregando...</p>
                    ) : historico.length === 0 ? (
                        <p className="text-xs text-slate-300 text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-white">
                            Nenhum registro anterior.
                        </p>
                    ) : (
                        historico.map(h => (
                            <div key={h.id} className="border border-slate-200 rounded-xl p-3 bg-white shadow-sm">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                        {h.users?.name || 'Sistema'}
                                        {h.status_novo && h.status_anterior !== h.status_novo && (
                                            <span className="flex items-center gap-1 ml-1">
                                                {h.status_anterior && (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black"
                                                        style={{ background: statusBg[h.status_anterior as TarefaStatus] || '#F1F5F9', color: statusText[h.status_anterior as TarefaStatus] || '#64748B' }}>
                                                        {statusLabel[h.status_anterior as TarefaStatus] || h.status_anterior}
                                                    </span>
                                                )}
                                                {h.status_anterior && <span className="text-slate-400">→</span>}
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black"
                                                    style={{ background: statusBg[h.status_novo as TarefaStatus] || '#F1F5F9', color: statusText[h.status_novo as TarefaStatus] || '#64748B' }}>
                                                    {statusLabel[h.status_novo as TarefaStatus] || h.status_novo}
                                                </span>
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">{fmtDate(h.created_at)}</span>
                                </div>
                                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed px-1">{h.descricao}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default TarefaDetailModal;
