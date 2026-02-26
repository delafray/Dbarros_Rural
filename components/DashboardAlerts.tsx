import React, { useState, useEffect } from 'react';
import { Card, Badge, LoadingSpinner } from './UI';
import { atendimentosService, Atendimento } from '../services/atendimentosService';
import { format, isToday, isBefore, isAfter, parseISO, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardAlertsProps {
    onOpenResolucao: (atendimento: Atendimento) => void;
    refreshTrigger?: number;
}

const DashboardAlerts: React.FC<DashboardAlertsProps> = ({ onOpenResolucao, refreshTrigger }) => {
    const [retornos, setRetornos] = useState<Atendimento[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchRetornos();
    }, [refreshTrigger]);

    const fetchRetornos = async () => {
        try {
            setIsLoading(true);
            const data = await atendimentosService.getPendingRetornos();
            setRetornos(data);
        } catch (error) {
            console.error('Erro ao buscar retornos pendentes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getRowColor = (dateStr: string | null) => {
        if (!dateStr) return '';
        const date = parseISO(dateStr);
        const today = startOfToday();

        if (isToday(date)) return 'bg-[#FFFBEB] border-l-2 border-l-amber-400'; // Amarelo bem suave
        if (isBefore(date, today)) return 'bg-[#FFF1F2] border-l-2 border-l-red-300'; // Vermelho bem suave
        return 'bg-[#F0FDF4] border-l-2 border-l-green-300'; // Verde bem suave
    };

    const getStatusTextColor = (dateStr: string | null) => {
        if (!dateStr) return 'text-slate-500';
        const date = parseISO(dateStr);
        const today = startOfToday();

        if (isToday(date)) return 'text-amber-900';
        if (isBefore(date, today)) return 'text-red-900';
        return 'text-emerald-900';
    };

    if (isLoading && retornos.length === 0) {
        return (
            <div className="flex justify-center p-8">
                <LoadingSpinner size="md" />
            </div>
        );
    }

    if (retornos.length === 0) return null;

    return (
        <Card className="overflow-hidden border-slate-200 shadow-md">
            <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
                <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    Alertas de Retorno Pendentes
                </h3>
                <Badge variant="danger" className="text-[9px] font-bold px-1.5 py-0.5">
                    {retornos.length} AGENDADO(S)
                </Badge>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter w-[140px]">Evento</th>
                            <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter w-[140px]">Cliente</th>
                            <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter w-[180px]">Contato</th>
                            <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter w-[110px]">Data Retorno</th>
                            <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Último Histórico</th>
                            <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter text-center w-[50px]">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {retornos.map((item) => (
                            <tr key={item.id} className={`${getRowColor(item.data_retorno)} transition-colors hover:brightness-95`}>
                                <td className="px-3 py-2.5 w-[140px]">
                                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter truncate" title={item.eventos_edicoes?.eventos?.nome || ''}>
                                        {item.eventos_edicoes?.eventos?.nome || '—'}
                                    </div>
                                    <div className="text-[11px] font-extrabold text-blue-600 uppercase truncate" title={item.eventos_edicoes?.titulo || ''}>
                                        {item.eventos_edicoes?.titulo || '—'}
                                    </div>
                                </td>
                                <td className="px-3 py-2.5 w-[140px]">
                                    <div className="text-[11px] font-bold text-slate-800 uppercase tracking-tight leading-none truncate" title={atendimentosService.getNomeExibicao(item)}>
                                        {atendimentosService.getNomeExibicao(item)}
                                    </div>
                                </td>
                                <td className="px-3 py-2.5 w-[180px]">
                                    <div className="flex flex-col gap-1 items-start">
                                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight leading-none truncate w-full" title={atendimentosService.getContatoExibicao(item)}>
                                            {atendimentosService.getContatoExibicao(item)}
                                        </span>
                                        {atendimentosService.getTelefoneExibicao(item) !== '—' && (
                                            <span className="bg-slate-100 text-[#1a1a1a] px-1.5 py-0.5 rounded border border-slate-200 font-bold text-[10px] font-mono shadow-sm">
                                                {atendimentosService.getTelefoneExibicao(item)}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-3 py-2.5 whitespace-nowrap">
                                    <div className={`text-[11px] font-black font-mono ${getStatusTextColor(item.data_retorno)}`}>
                                        {item.data_retorno ? format(parseISO(item.data_retorno), 'dd/MM/yy, HH:mm', { locale: ptBR }) : '—'}
                                    </div>
                                    <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                                        {item.data_retorno && isToday(parseISO(item.data_retorno)) ? 'Hoje' :
                                            item.data_retorno && isBefore(parseISO(item.data_retorno), startOfToday()) ? 'Atrasado' : 'Agendado'}
                                    </div>
                                </td>
                                <td className="px-3 py-2.5">
                                    <div className="text-[11px] text-slate-700 italic line-clamp-3 leading-tight whitespace-normal">
                                        {item.ultima_obs || <span className="text-slate-400 font-normal">Sem histórico</span>}
                                    </div>
                                    {item.ultima_obs_at && (
                                        <div className="text-[9px] text-slate-400 mt-1 font-medium flex items-center gap-2">
                                            <span>{format(parseISO(item.ultima_obs_at), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                                            {item.users?.name && (
                                                <span className="text-blue-600 font-bold uppercase flex items-center gap-1">
                                                    <span className="text-slate-300">•</span>
                                                    {item.users.name}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                    <button
                                        onClick={() => onOpenResolucao(item)}
                                        className="w-8 h-8 rounded bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-all group"
                                        title="Lançar Histórico / Resolver"
                                    >
                                        <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="bg-slate-50/50 px-3 py-1.5 border-t border-slate-100 flex justify-end">
                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded bg-[#FFF1F2] border border-red-200"></div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Atrasado</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded bg-[#FFFBEB] border border-amber-200"></div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Hoje</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded bg-[#F0FDF4] border border-green-200"></div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Agendado</span>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default DashboardAlerts;
