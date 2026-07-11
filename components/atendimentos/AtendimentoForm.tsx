import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import { atendimentosService, Atendimento, AtendimentoInsert } from '../../services/atendimentosService';
import { useAppDialog } from '../../context/DialogContext';
import { probBgColor, probTextColor } from '../../utils/probabilidadeCores';
import { ClienteSelectorWidget, ClienteComContato } from '../ClienteSelectorWidget';
import { maskTelefone } from '../../utils/masks';
import { PROBS } from './ProbBadge';
import { AtendimentoFormProps } from './types';

export function AtendimentoForm({ edicaoId, atendimento, clientes, onClose, onSaved, onViewHistory, existingAtendimentos }: AtendimentoFormProps) {
    const appDialog = useAppDialog();
    const [mode, setMode] = useState<'cadastrado' | 'livre'>(
        atendimento?.cliente_id ? 'cadastrado' : 'livre'
    );
    const [initialChoiceMade, setInitialChoiceMade] = useState(!!atendimento);

    // -- Referências de Seleção
    const [clienteId, setClienteId] = useState<string | null>(atendimento?.cliente_id || null);
    const [clienteNome, setClienteNome] = useState(atendimento?.cliente_nome || '');
    const [contatoId, setContatoId] = useState<string>(atendimento?.contato_id || '');
    const [contatoNome, setContatoNome] = useState(atendimento?.contato_nome || '');
    const [telefone, setTelefone] = useState(atendimento?.telefone || '');
    const [prob, setProb] = useState<number | null>(
        atendimento ? atendimento.probabilidade : null
    );
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [showSelector, setShowSelector] = useState(false);
    const [selectedFullCliente, setSelectedFullCliente] = useState<ClienteComContato | null>(null);
    const [duplicateWarning, setDuplicateWarning] = useState<{ show: boolean, existingAtend: Atendimento | null }>({ show: false, existingAtend: null });

    const selectedCliente = clientes.find(c => c.id === clienteId);

    // Auto-preenche telefone ao escolher contato
    useEffect(() => {
        if (contatoId) {
            const cont = selectedCliente?.contatos.find(c => c.id === contatoId);
            if (cont?.telefone) setTelefone(cont.telefone);
            if (cont?.nome) setContatoNome(cont.nome);
        }
    }, [contatoId, selectedCliente]);

    const filteredClientes = useMemo(() =>
        clientes.filter(c => c.label.toLowerCase().includes(search.toLowerCase()) ||
            (c.nome_fantasia || '').toLowerCase().includes(search.toLowerCase())),
        [clientes, search]);

    const handleSelectClienteResult = (cliente: ClienteComContato | null, nl: string | null) => {
        if (cliente) {
            setMode('cadastrado');
            setClienteId(cliente.id);
            // Armazenar infos ricas
            setSelectedFullCliente(cliente);

            // Preenche contatos automaticamente (se houver apenas 1, já seleciona)
            const pts = cliente.contatos || [];
            let principal = pts.find(x => x.principal) || pts[0];

            if (principal) {
                setContatoId(principal.id);
                setContatoNome(principal.nome);
                setTelefone(principal.telefone || '');
            } else {
                // Tenta fallback com contatos base (compatibilidade)
                const cont = clientes.find(c => c.id === cliente.id)?.contatos?.[0] || null;
                if (cont) {
                    setContatoId(cont.id);
                    setContatoNome(cont.nome);
                    setTelefone(cont.telefone || '');
                } else {
                    setContatoId('');
                    setContatoNome(cliente.contato_nome !== 'N/A' ? (cliente.contato_nome || '') : '');
                    setTelefone(cliente.contato_principal !== 'N/A' ? (cliente.contato_principal || '') : '');
                }
            }
        } else if (nl) {
            setMode('livre');
            setClienteNome(nl);
            setClienteId('');
            setContatoId('');
            setContatoNome('');
            setTelefone('');
            setSelectedFullCliente(null);
        } else {
            // "Deixar disponível" ou cancelou. Neste caso vamos apenas limpar se for disponível
            setMode('livre');
            setClienteNome('');
            setClienteId('');
            setContatoId('');
            setContatoNome('');
            setTelefone('');
            setSelectedFullCliente(null);
        }
        setShowSelector(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const isNew = !atendimento?.id;
            const now = new Date().toISOString();

            const payload: AtendimentoInsert = {
                edicao_id: edicaoId,
                cliente_id: mode === 'cadastrado' ? (clienteId || null) : null,
                cliente_nome: mode === 'livre' ? clienteNome : null,
                contato_id: mode === 'cadastrado' ? (contatoId || null) : null,
                contato_nome: mode === 'cadastrado' ? contatoNome : contatoNome,
                telefone: telefone || null,
                probabilidade: prob,
                data_retorno: atendimento?.data_retorno || null,
                ultima_obs: isNew ? 'Novo cadastro' : (atendimento?.ultima_obs || null),
                ultima_obs_at: isNew ? now : (atendimento?.ultima_obs_at || null),
                resolvido: atendimento?.resolvido ?? false,
            };

            // Regra: Não permitir duplicar atendimento para o mesmo cliente na mesma edição
            if (!atendimento?.id && mode === 'cadastrado' && clienteId) {
                const existing = existingAtendimentos.find(a => a.cliente_id === clienteId);
                if (existing) {
                    setDuplicateWarning({ show: true, existingAtend: existing });
                    setSaving(false);
                    return;
                }
            }

            let saved: Atendimento;
            if (atendimento?.id) {
                // Se o atendimento atual possui data de retorno e estamos salvando,
                // garantimos que ele não esteja marcado como resolvido
                if (payload.data_retorno) {
                    (payload as any).resolvido = false;
                }
                await atendimentosService.update(atendimento.id, payload);
                saved = { ...atendimento, ...payload, resolvido: payload.data_retorno ? false : (atendimento.resolvido || false) };
            } else {
                saved = await atendimentosService.create(payload);

                // Cria o histórico inicial automático
                const { data: { user } } = await supabase.auth.getUser();
                await atendimentosService.addHistorico({
                    atendimento_id: saved.id,
                    descricao: 'Novo cadastro',
                    probabilidade: prob,
                    data_retorno: null,
                    resolvido: false,
                    user_id: user?.id || null,
                });
            }
            onSaved(saved);
            onClose();
        } catch (err: any) {
            await appDialog.alert({ title: 'Erro', message: err.message || 'Erro ao salvar atendimento.', type: 'danger' });
        } finally {
            setSaving(false);
        }
    };

    if (!initialChoiceMade) {
        return (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-[#1F497D] px-5 py-4 flex justify-between items-center">
                        <h2 className="font-bold text-white text-sm">Jogo Rápido</h2>
                        <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="p-5 space-y-4 bg-slate-50">
                        <p className="text-sm text-slate-600 text-center font-medium mb-3">O cliente já é cadastrado na base?</p>

                        <button
                            onClick={() => {
                                setMode('cadastrado');
                                setShowSelector(true);
                                setInitialChoiceMade(true);
                            }}
                            className="w-full flex items-center p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:ring-1 hover:ring-blue-500 transition-all text-left shadow-sm group"
                        >
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl mr-4 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0 shadow-sm">
                                🔍
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm">Buscar Cadastrado</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Procurar na base de clientes (CRM)</p>
                            </div>
                        </button>

                        <button
                            onClick={() => {
                                setMode('livre');
                                setShowSelector(false);
                                setInitialChoiceMade(true);
                            }}
                            className="w-full flex items-center p-4 bg-white border border-slate-200 rounded-xl hover:border-amber-500 hover:ring-1 hover:ring-amber-500 transition-all text-left shadow-sm group"
                        >
                            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xl mr-4 group-hover:bg-amber-500 group-hover:text-white transition-colors shrink-0 shadow-sm">
                                ⚡
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm">Cadastro Livre / Rápido</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Preenchimento rápido p/ leads avulsos</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Modal de Aviso de Duplicidade */}
                {duplicateWarning.show && (
                    <div className="absolute inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
                            <div className="bg-amber-500 px-5 py-4 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h2 className="font-bold text-white text-sm">Atenção: Duplicidade</h2>
                            </div>
                            <div className="p-5 space-y-4">
                                <p className="text-sm text-slate-600 leading-relaxed text-center font-medium">
                                    Já existe um atendimento para <span className="font-black text-slate-800">{duplicateWarning.existingAtend ? atendimentosService.getNomeExibicao(duplicateWarning.existingAtend) : 'esta empresa'}</span> nesta edição.
                                </p>

                                <div className="flex flex-col gap-2 pt-2">
                                    <button
                                        onClick={() => setDuplicateWarning({ show: false, existingAtend: null })}
                                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                                    >
                                        Entendido, OK
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (duplicateWarning.existingAtend) {
                                                onViewHistory(duplicateWarning.existingAtend);
                                                onClose();
                                            }
                                        }}
                                        className="w-full py-2.5 bg-[#1F497D] hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
                                    >
                                        Abrir Histórico do Cliente
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                    <h2 className="font-black text-slate-800 text-sm">{atendimento ? 'Editar Atendimento' : 'Novo Atendimento'}</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Selector Overlay */}
                    {showSelector ? (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4">
                            <div className="bg-white w-full max-w-5xl h-[85vh] rounded-xl flex flex-col overflow-hidden shadow-2xl relative">
                                <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between shrink-0">
                                    <span className="font-bold text-sm">Buscar Cliente / Empresa</span>
                                    <button
                                        onClick={() => {
                                            if (!clienteId && mode === 'cadastrado') {
                                                setInitialChoiceMade(false);
                                            }
                                            setShowSelector(false);
                                        }}
                                        className="text-slate-400 hover:text-white text-xl leading-none"
                                    >×</button>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <ClienteSelectorWidget
                                        onSelect={handleSelectClienteResult}
                                        currentClienteId={clienteId}
                                        currentNomeLivre={mode === 'livre' ? clienteNome : null}
                                        onRequestNomeLivreFallback={() => {
                                            setMode('livre');
                                            setShowSelector(false);
                                        }}
                                        hideTabs={true}
                                        hideNovoCliente={true}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* Exibição do Cliente Selecionado */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                {mode === 'cadastrado' ? '🏢 Cliente Vinculado' : '✏️ Nome Livre'}
                            </h3>
                            <button
                                onClick={() => setInitialChoiceMade(false)}
                                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-100"
                            >
                                🔍 Trocar Cliente
                            </button>
                        </div>

                        {mode === 'cadastrado' ? (
                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm font-bold text-slate-700">
                                        {selectedFullCliente ? (selectedFullCliente.razao_social || selectedFullCliente.nome_fantasia || selectedFullCliente.nome_completo) : selectedCliente?.label || 'Nenhum cliente selecionado'}
                                    </p>
                                </div>

                                {selectedCliente && selectedCliente.contatos.length > 0 && (
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Contato Relacionado</label>
                                        <select
                                            value={contatoId}
                                            onChange={e => setContatoId(e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="">— Selecione o contato —</option>
                                            {selectedCliente.contatos.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.nome}{c.cargo ? ` (${c.cargo})` : ''} - {c.telefone ? maskTelefone(c.telefone) : 'Sem Tel'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Empresa / Nome (Livre)</label>
                                    <input
                                        type="text"
                                        value={clienteNome}
                                        onChange={e => setClienteNome(e.target.value)}
                                        placeholder="Ex: Empresa XYZ"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-amber-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Contato Responsável</label>
                                    <input
                                        type="text"
                                        value={contatoNome}
                                        onChange={e => setContatoNome(e.target.value)}
                                        placeholder="Ex: João da Silva"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* Telefone */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Telefone / Whats</label>
                            <input
                                type="text"
                                value={telefone}
                                onChange={e => setTelefone(maskTelefone(e.target.value))}
                                placeholder="(00) 00000-0000"
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        {/* Probabilidade */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status / Probabilidade</label>
                            <select
                                value={prob === null ? '' : prob}
                                onChange={e => setProb(e.target.value === '' ? null : Number(e.target.value))}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                style={prob !== null ? { background: probBgColor[prob], color: probTextColor[prob] } : {}}
                            >
                                <option value="">— A contatar —</option>
                                {PROBS.map(p => <option key={p} value={p} style={{ background: probBgColor[p], color: probTextColor[p] }}>{p}% — {p === 0 ? 'Não vai' : p === 100 ? 'Fechado!' : p >= 70 ? 'Muito' : p >= 40 ? 'Análise' : 'Incerto'}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-200 px-5 py-4 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || (mode === 'cadastrado' ? !clienteId : !clienteNome.trim())}
                        className="px-4 py-2 text-xs font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                        {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
