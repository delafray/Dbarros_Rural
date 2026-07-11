import React from 'react';
import {
    Tarefa,
    prioridadeBg,
    prioridadeText,
    prioridadeLabel,
    statusBg,
    statusText,
    statusLabel,
} from '../../services/tarefasService';
import { fmtDate, isPrazoVencido } from './tarefasUtils';

interface TarefaCardProps {
    tarefa: Tarefa;
    onClick: () => void;
    showEdicao?: boolean;
}

const TarefaCard: React.FC<TarefaCardProps> = ({ tarefa, onClick, showEdicao }) => {
    const vencida = isPrazoVencido(tarefa.data_prazo, tarefa.status);
    const nomeEdicao = tarefa.eventos_edicoes
        ? `${tarefa.eventos_edicoes.eventos?.nome || ''} — ${tarefa.eventos_edicoes.titulo}`
        : null;
    return (
        <div
            onClick={onClick}
            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-300 transition-all active:scale-[0.99]"
        >
            {showEdicao && nomeEdicao && (
                <div className="mb-2 pb-2 border-b border-slate-100">
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{nomeEdicao}</span>
                </div>
            )}
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 leading-tight truncate">{tarefa.titulo}</p>
                    {tarefa.descricao && (
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-1">{tarefa.descricao}</p>
                    )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                        style={{ background: statusBg[tarefa.status], color: statusText[tarefa.status] }}>
                        {statusLabel[tarefa.status]}
                    </span>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                        style={{ background: prioridadeBg[tarefa.prioridade], color: prioridadeText[tarefa.prioridade] }}>
                        {prioridadeLabel[tarefa.prioridade]}
                    </span>
                </div>
            </div>

            {/* Responsável */}
            {tarefa.responsavel?.name && (
                <div className="flex items-center gap-1 mt-1.5">
                    <svg className="w-3 h-3 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-[10px] text-slate-500 font-semibold truncate">{tarefa.responsavel.name}</span>
                </div>
            )}

            {tarefa.ultima_obs && (
                <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 line-clamp-2 italic">
                    "{tarefa.ultima_obs}"
                </p>
            )}

            <div className="flex items-center justify-between mt-2 pt-1">
                <span className="text-[10px] text-slate-400">
                    {tarefa.ultima_obs_at
                        ? `Atualizado ${fmtDate(tarefa.ultima_obs_at)}`
                        : `Criado ${fmtDate(tarefa.created_at)}`}
                </span>
                {tarefa.data_prazo && (
                    <span className={`text-[10px] font-bold flex items-center gap-1 ${vencida ? 'text-red-600' : 'text-slate-500'}`}>
                        {vencida && '⚠ '}Prazo: {fmtDate(tarefa.data_prazo)}
                    </span>
                )}
            </div>
        </div>
    );
};

export default TarefaCard;
