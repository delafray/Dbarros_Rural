import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { Button } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { eventosService, EventoEdicao } from '../services/eventosService';
import { userService } from '../services/api/userService';
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
} from '../services/tarefasService';

// ─── helpers ────────────────────────────────────────────────
const fmtDate = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

const isPrazoVencido = (data_prazo: string | null, status: TarefaStatus) =>
    !!data_prazo && status !== 'concluida' && status !== 'cancelada' && new Date(data_prazo) < new Date();

type SystemUser = { id: string; name: string };

// ─── Modal: Detalhe / Histórico de uma Tarefa ────────────────
interface TarefaDetailModalProps {
    tarefa: Tarefa;
    onClose: () => void;
    onSuccess: () => void;
}

const TarefaDetailModal: React.FC<TarefaDetailModalProps> = ({ tarefa, onClose, onSuccess }) => {
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
            alert('Erro ao salvar: ' + err.message);
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

// ─── Modal: Nova Tarefa ──────────────────────────────────────
interface NovaTarefaModalProps {
    edicaoId: string;
    edicoes: (EventoEdicao & { eventos: { nome: string } | null })[];
    users: SystemUser[];
    onClose: () => void;
    onSuccess: () => void;
}

const NovaTarefaModal: React.FC<NovaTarefaModalProps> = ({ edicaoId: edicaoIdProp, edicoes, users, onClose, onSuccess }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [titulo, setTitulo] = useState('');
    const [descricao, setDescricao] = useState('');
    const [prioridade, setPrioridade] = useState<TarefaPrioridade>('media');
    const [dataPrazo, setDataPrazo] = useState('');
    const [responsavelId, setResponsavelId] = useState<string>('');
    // usado somente quando vem do modo "todos os eventos"
    const [edicaoSelecionada, setEdicaoSelecionada] = useState<string>(edicoes.length > 0 ? edicoes[0].id : '');
    const edicaoId = edicaoIdProp || edicaoSelecionada;

    const handleSave = async () => {
        if (!titulo.trim() || !edicaoId) return;
        setIsSubmitting(true);
        try {
            await tarefasService.create({
                edicao_id: edicaoId,
                titulo: titulo.trim(),
                descricao: descricao.trim() || null,
                status: 'pendente',
                prioridade,
                data_prazo: dataPrazo ? new Date(dataPrazo).toISOString() : null,
                user_id: null,
                responsavel_id: responsavelId || null,
                ultima_obs: null,
                ultima_obs_at: null,
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            alert('Erro ao criar tarefa: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                    <h2 className="font-black text-slate-800 text-sm">Nova Tarefa</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="px-5 py-5 space-y-4">
                    {/* Seletor de edição — só aparece no modo "todos os eventos" */}
                    {edicoes.length > 0 && (
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                Evento <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={edicaoSelecionada}
                                onChange={e => setEdicaoSelecionada(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white font-semibold"
                            >
                                {edicoes.map(e => (
                                    <option key={e.id} value={e.id}>{e.eventos?.nome} — {e.titulo}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Título <span className="text-red-500">*</span>
                        </label>
                        <input
                            autoFocus
                            type="text"
                            value={titulo}
                            onChange={e => setTitulo(e.target.value)}
                            placeholder="Título da tarefa..."
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descrição</label>
                        <textarea
                            value={descricao}
                            onChange={e => setDescricao(e.target.value)}
                            placeholder="Detalhes da tarefa (opcional)..."
                            rows={2}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-slate-50"
                        />
                    </div>

                    {/* Responsável — ocupa linha inteira */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Responsável</label>
                        <select
                            value={responsavelId}
                            onChange={e => setResponsavelId(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            <option value="">— Sem responsável —</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Prioridade</label>
                            <select
                                value={prioridade}
                                onChange={e => setPrioridade(e.target.value as TarefaPrioridade)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                style={{ background: prioridadeBg[prioridade], color: prioridadeText[prioridade] }}
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
                                value={dataPrazo}
                                onChange={e => setDataPrazo(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 px-5 pb-5 pt-1">
                    <Button variant="ghost" onClick={onClose} className="h-9 text-[11px] font-bold uppercase">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSubmitting || !titulo.trim() || !edicaoId}
                        className="h-9 px-6 text-[11px] font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-700"
                    >
                        {isSubmitting ? 'Criando...' : 'Criar Tarefa'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

// ─── Card de tarefa na lista ─────────────────────────────────
const TarefaCard: React.FC<{ tarefa: Tarefa; onClick: () => void; showEdicao?: boolean }> = ({ tarefa, onClick, showEdicao }) => {
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

// ─── Página principal ────────────────────────────────────────
const Tarefas: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [edicoes, setEdicoes] = useState<(EventoEdicao & { eventos: { nome: string } | null })[]>([]);
    const [edicaoId, setEdicaoId] = useState<string>('');
    const [todosEventos, setTodosEventos] = useState(false);
    const [tarefas, setTarefas] = useState<Tarefa[]>([]);
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [filtroStatus, setFiltroStatus] = useState<TarefaStatus | 'todos'>('todos');
    // 'minhas' = só do usuário logado | 'todos' = todos | userId = usuário específico
    const [filtroUsuario, setFiltroUsuario] = useState<'minhas' | 'todos' | string>('todos');
    const [tarefaAberta, setTarefaAberta] = useState<Tarefa | null>(null);
    const [showNova, setShowNova] = useState(false);

    // Carrega edições ativas e usuários ao montar
    useEffect(() => {
        eventosService.getActiveEdicoes().then(data => {
            setEdicoes(data);
            if (data.length > 0) setEdicaoId(data[0].id);
        }).catch(console.error);

        userService.getUsers().then(setUsers).catch(console.error);
    }, []);

    // Carrega tarefas quando muda a edição ou o modo todos
    const carregarTarefas = useCallback(() => {
        setLoading(true);
        if (todosEventos) {
            const ids = edicoes.map(e => e.id);
            tarefasService.getByEdicoes(ids)
                .then(setTarefas)
                .catch(console.error)
                .finally(() => setLoading(false));
        } else {
            if (!edicaoId) { setLoading(false); return; }
            tarefasService.getByEdicao(edicaoId)
                .then(setTarefas)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [edicaoId, todosEventos, edicoes]);

    useEffect(() => { carregarTarefas(); }, [carregarTarefas]);

    // Aplicar filtros: status + usuário
    const tarefasFiltradas = tarefas.filter(t => {
        if (filtroStatus !== 'todos' && t.status !== filtroStatus) return false;
        if (filtroUsuario === 'minhas') return t.responsavel_id === currentUser?.id;
        if (filtroUsuario !== 'todos') return t.responsavel_id === filtroUsuario;
        return true;
    });

    const contadores: Record<TarefaStatus | 'todos', number> = {
        todos: tarefas.filter(t => {
            if (filtroUsuario === 'minhas') return t.responsavel_id === currentUser?.id;
            if (filtroUsuario !== 'todos') return t.responsavel_id === filtroUsuario;
            return true;
        }).length,
        pendente: tarefas.filter(t => {
            const passaUsuario = filtroUsuario === 'todos' ? true : filtroUsuario === 'minhas' ? t.responsavel_id === currentUser?.id : t.responsavel_id === filtroUsuario;
            return t.status === 'pendente' && passaUsuario;
        }).length,
        em_andamento: tarefas.filter(t => {
            const passaUsuario = filtroUsuario === 'todos' ? true : filtroUsuario === 'minhas' ? t.responsavel_id === currentUser?.id : t.responsavel_id === filtroUsuario;
            return t.status === 'em_andamento' && passaUsuario;
        }).length,
        concluida: tarefas.filter(t => {
            const passaUsuario = filtroUsuario === 'todos' ? true : filtroUsuario === 'minhas' ? t.responsavel_id === currentUser?.id : t.responsavel_id === filtroUsuario;
            return t.status === 'concluida' && passaUsuario;
        }).length,
        cancelada: tarefas.filter(t => {
            const passaUsuario = filtroUsuario === 'todos' ? true : filtroUsuario === 'minhas' ? t.responsavel_id === currentUser?.id : t.responsavel_id === filtroUsuario;
            return t.status === 'cancelada' && passaUsuario;
        }).length,
    };

    return (
        <Layout title="Tarefas">
            {/* Linha 1: Seletor de edição + botão todos + botão nova tarefa */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Evento</label>
                    {edicoes.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">Nenhum evento ativo</span>
                    ) : (
                        <>
                            <select
                                value={edicaoId}
                                onChange={e => { setEdicaoId(e.target.value); setTodosEventos(false); setFiltroStatus('todos'); }}
                                disabled={todosEventos}
                                className={`flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-semibold bg-white min-w-0 transition-opacity ${todosEventos ? 'opacity-40 cursor-not-allowed' : ''}`}
                            >
                                {edicoes.map(e => (
                                    <option key={e.id} value={e.id}>
                                        {e.eventos?.nome} — {e.titulo}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={() => { setTodosEventos(v => !v); setFiltroStatus('todos'); }}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide border transition-all whitespace-nowrap ${todosEventos ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600'}`}
                            >
                                {todosEventos ? '✓ Todos ativos' : 'Todos os ativos'}
                            </button>
                        </>
                    )}
                </div>
                {(edicaoId || todosEventos) && (
                    <Button
                        onClick={() => setShowNova(true)}
                        className="h-9 px-5 text-[11px] font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                    >
                        + Nova Tarefa
                    </Button>
                )}
            </div>

            {/* Linha 2: Filtro de usuário */}
            {edicaoId && (
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Responsável</label>
                    <button
                        onClick={() => setFiltroUsuario('minhas')}
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border transition-all ${filtroUsuario === 'minhas' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-100 text-slate-500 border-transparent hover:opacity-100 opacity-70'}`}
                    >
                        Minhas tarefas
                    </button>
                    <button
                        onClick={() => setFiltroUsuario('todos')}
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border transition-all ${filtroUsuario === 'todos' ? 'bg-slate-700 text-white border-slate-700 shadow-sm' : 'bg-slate-100 text-slate-500 border-transparent hover:opacity-100 opacity-70'}`}
                    >
                        Todos
                    </button>
                    {users.map(u => (
                        <button
                            key={u.id}
                            onClick={() => setFiltroUsuario(u.id)}
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border transition-all ${filtroUsuario === u.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-500 border-transparent hover:opacity-100 opacity-70'}`}
                        >
                            {u.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Linha 3: Filtros por status */}
            {edicaoId && (
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Status</label>
                    {(['todos', ...STATUSES] as (TarefaStatus | 'todos')[]).map(s => {
                        const isActive = filtroStatus === s;
                        const bg = s === 'todos' ? '#F1F5F9' : statusBg[s as TarefaStatus];
                        const color = s === 'todos' ? '#475569' : statusText[s as TarefaStatus];
                        const label = s === 'todos' ? 'Todos' : statusLabel[s as TarefaStatus];
                        const count = contadores[s];
                        return (
                            <button
                                key={s}
                                onClick={() => setFiltroStatus(s)}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide transition-all border ${isActive ? 'ring-2 ring-offset-1 ring-blue-400 shadow-sm' : 'opacity-70 hover:opacity-100'}`}
                                style={{ background: bg, color, borderColor: isActive ? color : 'transparent' }}
                            >
                                {label}
                                <span className="bg-white/60 px-1 rounded-full text-[9px]">{count}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Lista */}
            {!edicaoId ? (
                <div className="text-center py-16 text-slate-400">
                    <p className="text-sm font-medium">Selecione um evento ativo para ver as tarefas.</p>
                </div>
            ) : loading ? (
                <div className="flex justify-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
            ) : tarefasFiltradas.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                    <p className="text-sm font-medium text-slate-400 mb-2">
                        {filtroStatus === 'todos' && filtroUsuario === 'todos'
                            ? 'Nenhuma tarefa cadastrada.'
                            : 'Nenhuma tarefa com os filtros selecionados.'}
                    </p>
                    {filtroStatus === 'todos' && filtroUsuario === 'todos' && (
                        <Button onClick={() => setShowNova(true)} className="mt-2 text-[11px] font-bold bg-blue-600 hover:bg-blue-700">
                            + Nova Tarefa
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {tarefasFiltradas.map(t => (
                        <TarefaCard key={t.id} tarefa={t} onClick={() => setTarefaAberta(t)} showEdicao={todosEventos} />
                    ))}
                </div>
            )}

            {/* Modais */}
            {tarefaAberta && (
                <TarefaDetailModal
                    tarefa={tarefaAberta}
                    onClose={() => setTarefaAberta(null)}
                    onSuccess={carregarTarefas}
                />
            )}
            {showNova && (edicaoId || todosEventos) && (
                <NovaTarefaModal
                    edicaoId={todosEventos ? '' : edicaoId}
                    edicoes={todosEventos ? edicoes : []}
                    users={users}
                    onClose={() => setShowNova(false)}
                    onSuccess={carregarTarefas}
                />
            )}
        </Layout>
    );
};

export default Tarefas;
