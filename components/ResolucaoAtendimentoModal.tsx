import React, { useState, useEffect } from 'react';
import { Button, Card, Badge } from './UI';
import { atendimentosService, Atendimento, AtendimentoHistorico, probBgColor, probTextColor } from '../services/atendimentosService';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAppDialog } from '../context/DialogContext';

interface ResolucaoAtendimentoModalProps {
    atendimento: Atendimento;
    onClose: () => void;
    onSuccess: () => void;
    readOnly?: boolean;
}

const ResolucaoAtendimentoModal: React.FC<ResolucaoAtendimentoModalProps> = ({ atendimento, onClose, onSuccess, readOnly = false }) => {
    const appDialog = useAppDialog();
    const [historico, setHistorico] = useState<AtendimentoHistorico[]>([]);
    const [loadingHistorico, setLoadingHistorico] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form states
    const [descricao, setDescricao] = useState('');
    const [probabilidade, setProbabilidade] = useState<number | null>(atendimento.probabilidade);
    const [dataRetorno, setDataRetorno] = useState<string>(
        atendimento.data_retorno ? atendimento.data_retorno.substring(0, 16) : ''
    );
    const [adiar, setAdiar] = useState(true);

    const nomeExibicao = atendimentosService.getNomeExibicao(atendimento);

    useEffect(() => {
        atendimentosService.getHistorico(atendimento.id)
            .then(setHistorico)
            .finally(() => setLoadingHistorico(false));
    }, [atendimento.id]);

    const handleSave = async () => {
        if (!descricao.trim()) return;
        setIsSubmitting(true);
        try {
            // Se NÃO for adiar, a data_retorno é limpa (resolvido)
            const finalDataRetorno = adiar ? (dataRetorno ? new Date(dataRetorno).toISOString() : null) : null;

            await atendimentosService.addHistorico({
                atendimento_id: atendimento.id,
                descricao: descricao.trim(),
                probabilidade: probabilidade,
                data_retorno: finalDataRetorno,
                resolvido: !adiar,
                user_id: null, // Sistema via trigger
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            await appDialog.alert({ title: 'Erro', message: 'Erro ao salvar: ' + err.message, type: 'danger' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const fmt = (iso: string) =>
        new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const PROBS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                    <div>
                        <h2 className="font-black text-slate-800 text-base">{nomeExibicao}</h2>
                        {!readOnly && (
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Adiar retorno?</span>
                                <div className="flex bg-slate-200 p-0.5 rounded-lg">
                                    <button
                                        onClick={() => setAdiar(true)}
                                        className={`px-3 py-0.5 text-[9px] font-black rounded-md transition-all ${adiar ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        SIM
                                    </button>
                                    <button
                                        onClick={() => setAdiar(false)}
                                        className={`px-3 py-0.5 text-[9px] font-black rounded-md transition-all ${!adiar ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        NÃO
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {atendimento.probabilidade !== null && (
                            <Badge style={{ background: probBgColor[atendimento.probabilidade], color: probTextColor[atendimento.probabilidade] }} className="text-[10px] font-black px-2 py-0.5 min-w-[40px] text-center">
                                {atendimento.probabilidade}%
                            </Badge>
                        )}
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Formulário Novo Histórico — oculto para visitantes */}
                {!readOnly && <div className="border-b border-slate-200 px-6 py-3 bg-white space-y-2">
                    <div>
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                            NOVA INTERAÇÃO <span className="text-red-500 font-bold">*</span>
                        </h3>
                        <textarea
                            autoFocus
                            value={descricao}
                            onChange={e => setDescricao(e.target.value)}
                            placeholder="Descreva o contato realizado (obrigatório)..."
                            rows={2}
                            className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-slate-50"
                        />
                    </div>

                    <div className="flex items-end gap-3">
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status / Probabilidade</label>
                            <select
                                value={probabilidade === null ? '' : probabilidade}
                                onChange={e => setProbabilidade(e.target.value === '' ? null : Number(e.target.value))}
                                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                style={probabilidade !== null ? { background: probBgColor[probabilidade], color: probTextColor[probabilidade] } : {}}
                            >
                                <option value="">— Manter —</option>
                                {PROBS.map(p => <option key={p} value={p}>{p}%</option>)}
                            </select>
                        </div>
                        <div className={`flex-1 ${!adiar ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nova Data de Retorno</label>
                            <input
                                type="datetime-local"
                                value={dataRetorno}
                                onChange={e => setDataRetorno(e.target.value)}
                                min="2024-01-01T00:00"
                                max="2099-12-31T23:59"
                                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                            <Button variant="ghost" onClick={onClose} className="h-9 text-[11px] font-bold uppercase">
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={isSubmitting || !descricao.trim() || (adiar && !dataRetorno)}
                                className={`h-9 px-6 text-[11px] font-black uppercase tracking-wider ${adiar ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
                            >
                                {isSubmitting ? 'Salvando...' : adiar ? 'Agendar e Salvar' : 'Resolver e Salvar'}
                            </Button>
                        </div>
                    </div>
                </div>

                }

                {/* Lista de Histórico */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 bg-slate-50/50 min-h-0">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Histórico Anterior</h3>
                    {loadingHistorico ? (
                        <p className="text-sm text-slate-400 text-center py-4">Carregando...</p>
                    ) : historico.length === 0 ? (
                        <p className="text-sm text-slate-300 text-center py-4 border-2 border-dashed border-slate-200 rounded-lg bg-white">
                            Nenhum registro anterior.
                        </p>
                    ) : (
                        historico.map(h => (
                            <div key={h.id} className="border-l-[3px] border-slate-200 pl-4 pr-4 py-2.5 bg-white rounded-r-lg hover:border-blue-400 transition-colors">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2 flex-wrap">
                                        {h.user_id ? 'Vendedor' : 'Sistema'}
                                        {h.probabilidade !== null && (
                                            <span className="font-black px-2 py-0.5 rounded text-[10px]" style={{ background: probBgColor[h.probabilidade], color: probTextColor[h.probabilidade] }}>
                                                {h.probabilidade}%
                                            </span>
                                        )}
                                        {h.data_retorno && (
                                            <>
                                                <span className="text-slate-300">·</span>
                                                <span className="normal-case tracking-normal">
                                                    <span className="text-slate-600 font-bold">Retorno:</span>
                                                    {' '}<span className="text-amber-600 font-black">{fmt(h.data_retorno)}</span>
                                                </span>
                                            </>
                                        )}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono flex-shrink-0 ml-2">{fmt(h.created_at)}</span>
                                </div>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-snug">{h.descricao}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div >
    );
};

export default ResolucaoAtendimentoModal;

