import React, { useState } from 'react';
import { Button } from '../UI';
import { useAppDialog } from '../../context/DialogContext';
import { EventoEdicao } from '../../services/eventosService';
import {
    tarefasService,
    TarefaPrioridade,
    PRIORIDADES,
    prioridadeBg,
    prioridadeText,
    prioridadeLabel,
} from '../../services/tarefasService';

type SystemUser = { id: string; name: string };

export interface NovaTarefaModalProps {
    edicaoId: string;
    edicoes: (EventoEdicao & { eventos: { nome: string } | null })[];
    users: SystemUser[];
    onClose: () => void;
    onSuccess: () => void;
}

const NovaTarefaModal: React.FC<NovaTarefaModalProps> = ({ edicaoId: edicaoIdProp, edicoes, users, onClose, onSuccess }) => {
    const appDialog = useAppDialog();
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
            void appDialog.alert({ title: 'Erro', message: 'Erro ao criar tarefa: ' + err.message, type: 'danger' });
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

export default NovaTarefaModal;
