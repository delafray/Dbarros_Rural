import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { Button } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { eventosService, EventoEdicao } from '../services/eventosService';
import { userService } from '../services/api/userService';
import {
    tarefasService,
    Tarefa,
    TarefaStatus,
    STATUSES,
    statusBg,
    statusText,
    statusLabel,
} from '../services/tarefasService';
import TarefaDetailModal from '../components/tarefas/TarefaDetailModal';
import NovaTarefaModal from '../components/tarefas/NovaTarefaModal';
import TarefaCard from '../components/tarefas/TarefaCard';

type SystemUser = { id: string; name: string };

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
    const passaUsuario = (t: Tarefa) => {
        if (filtroUsuario === 'minhas') return t.responsavel_id === currentUser?.id;
        if (filtroUsuario !== 'todos') return t.responsavel_id === filtroUsuario;
        return true;
    };

    const tarefasFiltradas = tarefas.filter(t => {
        if (filtroStatus !== 'todos' && t.status !== filtroStatus) return false;
        return passaUsuario(t);
    });

    const contadores: Record<TarefaStatus | 'todos', number> = {
        todos: tarefas.filter(passaUsuario).length,
        pendente: tarefas.filter(t => t.status === 'pendente' && passaUsuario(t)).length,
        em_andamento: tarefas.filter(t => t.status === 'em_andamento' && passaUsuario(t)).length,
        concluida: tarefas.filter(t => t.status === 'concluida' && passaUsuario(t)).length,
        cancelada: tarefas.filter(t => t.status === 'cancelada' && passaUsuario(t)).length,
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
