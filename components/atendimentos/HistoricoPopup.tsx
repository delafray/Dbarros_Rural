import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { atendimentosService, AtendimentoHistorico } from '../../services/atendimentosService';
import { useAppDialog } from '../../context/DialogContext';
import { probBgColor, probTextColor } from '../../utils/probabilidadeCores';
import { ProbBadge, PROBS } from './ProbBadge';
import { HistoricoPopupProps } from './types';

export function HistoricoPopup({ atendimento, onClose, onSaved, isVisitor = false }: HistoricoPopupProps) {
    const appDialog = useAppDialog();
    const [historico, setHistorico] = useState<AtendimentoHistorico[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [desc, setDesc] = useState('');
    const [prob, setProb] = useState<number | null>(atendimento.probabilidade);
    const [dataRetorno, setDataRetorno] = useState('');

    const nomeExibicao = atendimentosService.getNomeExibicao(atendimento);

    useEffect(() => {
        let mounted = true;
        atendimentosService.getHistorico(atendimento.id)
            .then((data) => { if (mounted) setHistorico(data); })
            .catch((err) => console.error('Erro ao carregar histórico:', err))
            .finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, [atendimento.id]);

    const handleSave = async () => {
        if (!desc.trim()) return;
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            await atendimentosService.addHistorico({
                atendimento_id: atendimento.id,
                descricao: desc.trim(),
                probabilidade: prob,
                data_retorno: dataRetorno ? new Date(dataRetorno).toISOString() : null,
                resolvido: null, // Deixa o serviço decidir se limpa o resolvido baseado na data_retorno
                user_id: user?.id || null,
            });

            const updatedAt = {
                ...atendimento,
                probabilidade: prob,
                ultima_obs: desc.trim(),
                ultima_obs_at: new Date().toISOString(),
                data_retorno: dataRetorno ? new Date(dataRetorno).toISOString() : atendimento.data_retorno,
            };
            onSaved(updatedAt);

            const fresh = await atendimentosService.getHistorico(atendimento.id);
            setHistorico(fresh);
            setDesc('');
            setDataRetorno('');
        } catch (err: any) {
            await appDialog.alert({ title: 'Erro', message: 'Erro ao salvar: ' + err.message, type: 'danger' });
        } finally {
            setSaving(false);
        }
    };

    const fmt = (iso: string) =>
        new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                    <div>
                        <h2 className="font-black text-slate-800 text-base">{nomeExibicao}</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Histórico de Comunicações</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <ProbBadge value={atendimento.probabilidade} />
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Formulário novo histórico — oculto para visitante */}
                {!isVisitor && (
                    <div className="border-b border-slate-200 px-6 py-4 bg-white space-y-3">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Novo Registro</h3>
                        <textarea
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            placeholder="Descreva o contato realizado..."
                            rows={3}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-slate-50"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Probabilidade</label>
                                <select
                                    value={prob === null ? '' : prob}
                                    onChange={e => setProb(e.target.value === '' ? null : Number(e.target.value))}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                    style={prob !== null ? { background: probBgColor[prob], color: probTextColor[prob] } : {}}
                                >
                                    <option value="">— A contatar —</option>
                                    {PROBS.map(p => <option key={p} value={p}>{p}%</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data de Retorno</label>
                                <input
                                    type="datetime-local"
                                    value={dataRetorno}
                                    onChange={e => setDataRetorno(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={saving || !desc.trim()}
                                className="px-5 py-2 text-xs font-black uppercase tracking-wider text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {saving ? 'Salvando...' : 'Salvar Histórico'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Lista de histórico */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 bg-slate-50/50 min-h-0">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Histórico Anterior</h3>
                    {loading ? (
                        <p className="text-sm text-slate-400 text-center py-4">Carregando...</p>
                    ) : historico.length === 0 ? (
                        <p className="text-sm text-slate-300 text-center py-4 border-2 border-dashed border-slate-200 rounded-lg bg-white">
                            Nenhum histórico ainda.
                        </p>
                    ) : (
                        historico.map(h => (
                            <div key={h.id} className="border-l-[3px] border-slate-200 pl-4 pr-4 py-2.5 bg-white rounded-r-lg hover:border-blue-400 transition-colors">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2 flex-wrap">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-black text-[10px] tracking-widest border border-blue-200">
                                            {h.user_id ? (h.users?.name || 'Usuário') : 'Sistema'}
                                        </span>
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
        </div>
    );
}
