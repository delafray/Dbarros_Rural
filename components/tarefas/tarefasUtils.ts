import { TarefaStatus } from '../../services/tarefasService';

export const fmtDate = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

export const isPrazoVencido = (data_prazo: string | null, status: TarefaStatus) =>
    !!data_prazo && status !== 'concluida' && status !== 'cancelada' && new Date(data_prazo) < new Date();
