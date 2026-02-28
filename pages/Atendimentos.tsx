import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClienteSelectorWidget, ClienteComContato } from '../components/ClienteSelectorWidget';
import { ImportAtendimentosModal } from '../components/ImportAtendimentosModal';
import Layout from '../components/Layout';
import { useAppDialog } from '../context/DialogContext';
import { supabase } from '../services/supabaseClient';
import {
    atendimentosService,
    Atendimento,
    AtendimentoHistorico,
    AtendimentoInsert,
    probBgColor,
    probTextColor,
} from '../services/atendimentosService';

interface Contato {
    id: string;
    nome: string;
    telefone: string;
    cargo: string;
    principal: boolean;
}

interface ClienteOption {
    id: string;
    label: string;
    nome_fantasia: string | null;
    contatos: Contato[];
}

// ── Gradiente de probabilidade ───────────────────────────────────────────────
const PROBS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

function ProbBadge({ value }: { value: number | null }) {
    if (value === null) {
        return (
            <span className="inline-flex items-center justify-center font-black text-[10px] rounded-full px-2 py-0.5 min-w-[40px] bg-slate-100 text-slate-400">
                —
            </span>
        );
    }
    const bg = probBgColor[value] ?? '#eee';
    const color = probTextColor[value] ?? '#333';
    return (
        <span
            className="inline-flex items-center justify-center font-black text-[10px] rounded-full px-2 py-0.5 min-w-[40px]"
            style={{ background: bg, color }}
        >
            {value}
        </span>
    );
}

// ── Popup de Histórico ───────────────────────────────────────────────────────
interface HistoricoPopupProps {
    atendimento: Atendimento;
    onClose: () => void;
    onSaved: (updated: Atendimento) => void;
}

function HistoricoPopup({ atendimento, onClose, onSaved }: HistoricoPopupProps) {
    const appDialog = useAppDialog();
    const [historico, setHistorico] = useState<AtendimentoHistorico[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [desc, setDesc] = useState('');
    const [prob, setProb] = useState<number | null>(atendimento.probabilidade);
    const [dataRetorno, setDataRetorno] = useState('');

    const nomeExibicao = atendimentosService.getNomeExibicao(atendimento);

    useEffect(() => {
        atendimentosService.getHistorico(atendimento.id)
            .then(setHistorico)
            .finally(() => setLoading(false));
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                    <div>
                        <h2 className="font-black text-slate-800 text-sm">{nomeExibicao}</h2>
                        <p className="text-[11px] text-slate-500">Histórico de Comunicações</p>
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

                {/* Formulário novo histórico — fica no TOPO */}
                <div className="border-b border-slate-200 px-5 py-4 bg-slate-50 space-y-3">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Novo Registro</h3>
                    <textarea
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        placeholder="Descreva o contato realizado..."
                        rows={3}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Probabilidade</label>
                            <select
                                value={prob === null ? '' : prob}
                                onChange={e => setProb(e.target.value === '' ? null : Number(e.target.value))}
                                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
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
                                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving || !desc.trim()}
                            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {saving ? 'Salvando...' : 'Salvar Histórico'}
                        </button>
                    </div>
                </div>

                {/* Lista de histórico — fica EMBAIXO, scrollável */}
                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2 min-h-0">
                    {loading ? (
                        <p className="text-xs text-slate-400 text-center py-6">Carregando...</p>
                    ) : historico.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
                            Nenhum histórico ainda. Salve o primeiro registro acima.
                        </p>
                    ) : (
                        historico.map(h => (
                            <div key={h.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                        {h.user_id ? (h.users?.name || 'Usuário') : 'Sistema'}
                                        {h.probabilidade !== null && (
                                            <span className="ml-2 font-normal text-slate-400">→ {h.probabilidade}%</span>
                                        )}
                                    </span>
                                    <span className="text-[10px] text-slate-400">{fmt(h.created_at)}</span>
                                </div>
                                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{h.descricao}</p>
                                {h.data_retorno && (
                                    <p className="text-[10px] text-amber-600 mt-1 font-bold">
                                        📅 Retorno: {fmt(h.data_retorno)}
                                    </p>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Popup de Novo/Editar Atendimento ─────────────────────────────────────────
interface AtendimentoFormProps {
    edicaoId: string;
    atendimento?: Atendimento | null;
    clientes: ClienteOption[];
    onClose: () => void;
    onSaved: (a: Atendimento) => void;
    onViewHistory: (a: Atendimento) => void;
    existingAtendimentos: Atendimento[];
}

function AtendimentoForm({ edicaoId, atendimento, clientes, onClose, onSaved, onViewHistory, existingAtendimentos }: AtendimentoFormProps) {
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
                                                    {c.nome}{c.cargo ? ` (${c.cargo})` : ''} - {c.telefone || 'Sem Tel'}
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
                                onChange={e => setTelefone(e.target.value)}
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

// ── Tela Principal ────────────────────────────────────────────────────────────
const Atendimentos: React.FC = () => {
    const { edicaoId } = useParams<{ edicaoId: string }>();
    const navigate = useNavigate();
    const appDialog = useAppDialog();
    const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
    const [clientes, setClientes] = useState<ClienteOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [edicaoTitulo, setEdicaoTitulo] = useState('');
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingAtend, setEditingAtend] = useState<Atendimento | null>(null);
    const [histAtend, setHistAtend] = useState<Atendimento | null>(null);
    const [showImport, setShowImport] = useState(false);

    const load = useCallback(async () => {
        if (!edicaoId) return;
        setLoading(true);
        try {
            const [data, edicaoData] = await Promise.all([
                atendimentosService.getByEdicao(edicaoId),
                supabase.from('eventos_edicoes').select('titulo').eq('id', edicaoId).single(),
            ]);
            setAtendimentos(data);
            if (edicaoData.data) setEdicaoTitulo(edicaoData.data.titulo || '');

            // Carrega clientes com contatos
            const { data: clientesRaw } = await supabase
                .from('clientes')
                .select('id, razao_social, nome_completo, nome_fantasia, contatos(id, nome, telefone, cargo, principal)')
                .order('razao_social');

            setClientes((clientesRaw || []).map((c: any) => ({
                id: c.id,
                label: c.razao_social || c.nome_completo || '—',
                nome_fantasia: c.nome_fantasia,
                contatos: c.contatos || [],
            })));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [edicaoId]);

    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        let result = atendimentos;

        if (q) {
            result = atendimentos.filter(a => {
                const nome = atendimentosService.getNomeExibicao(a).toLowerCase();
                const cont = atendimentosService.getContatoExibicao(a).toLowerCase();
                const tel = atendimentosService.getTelefoneExibicao(a).toLowerCase();
                const obs = (a.ultima_obs || '').toLowerCase();
                return nome.includes(q) || cont.includes(q) || tel.includes(q) || obs.includes(q);
            });
        }

        // Ordenação: 1º Maior probabilidade (null = -1), 2º Ordem Alfabética
        return [...result].sort((a, b) => {
            const probA = a.probabilidade === null ? -1 : a.probabilidade;
            const probB = b.probabilidade === null ? -1 : b.probabilidade;

            if (probA !== probB) {
                return probB - probA; // Maior probabilidade vem primeiro
            }

            const nomeA = atendimentosService.getNomeExibicao(a).toLowerCase();
            const nomeB = atendimentosService.getNomeExibicao(b).toLowerCase();
            return nomeA.localeCompare(nomeB, 'pt-BR');
        });
    }, [atendimentos, search]);

    const handleSaved = (saved: Atendimento) => {
        setAtendimentos(prev => {
            const exists = prev.find(a => a.id === saved.id);
            if (exists) return prev.map(a => a.id === saved.id ? saved : a);
            return [saved, ...prev];
        });
        if (histAtend?.id === saved.id) setHistAtend(saved);
    };

    const handleDelete = async (id: string) => {
        const confirmed = await appDialog.confirm({ title: 'Remover Atendimento', message: 'Remover este atendimento e todo seu histórico?', confirmText: 'Remover', type: 'danger' });
        if (!confirmed) return;
        await atendimentosService.delete(id);
        setAtendimentos(prev => prev.filter(a => a.id !== id));
    };

    const fmt = (iso: string | null) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const headerActions = (
        <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-white hover:shadow-sm rounded-xl transition-all"
        >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar
        </button>
    );

    return (
        <Layout title={`Atendimentos :: ${edicaoTitulo}`} headerActions={headerActions}>
            {/* Popups */}
            {(showForm || editingAtend) && (
                <AtendimentoForm
                    edicaoId={edicaoId!}
                    atendimento={editingAtend}
                    clientes={clientes}
                    onClose={() => { setShowForm(false); setEditingAtend(null); }}
                    onSaved={handleSaved}
                    onViewHistory={(a) => setHistAtend(a)}
                    existingAtendimentos={atendimentos}
                />
            )}
            {histAtend && (
                <HistoricoPopup
                    atendimento={histAtend}
                    onClose={() => setHistAtend(null)}
                    onSaved={handleSaved}
                />
            )}
            {showImport && (
                <ImportAtendimentosModal
                    currentEdicaoId={edicaoId!}
                    onClose={() => setShowImport(false)}
                    onImported={load}
                />
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50">
                    {/* Busca */}
                    <div className="relative flex-1 max-w-xs">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Busca rápida..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <span className="text-[10px] text-slate-400 font-medium ml-1">
                        {filtered.length} de {atendimentos.length}
                    </span>

                    <div className="flex-1" />

                    {/* Legenda de probabilidade */}
                    <div className="hidden lg:flex items-center gap-1">
                        {PROBS.map(p => (
                            <div key={p} className="w-4 h-4 rounded-sm" style={{ background: probBgColor[p] }} title={`${p}%`} />
                        ))}
                        <span className="text-[9px] text-slate-400 ml-1">0→100%</span>
                    </div>

                    <button
                        onClick={() => { setEditingAtend(null); setShowForm(true); }}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        Atendimento
                    </button>

                    <button
                        onClick={() => setShowImport(true)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Importar
                    </button>
                </div>

                {/* Tabela */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[12px] bg-white border border-slate-300 table-fixed">
                        <thead className="bg-[#1F497D] text-white">
                            <tr className="text-[11px] font-bold uppercase tracking-wide">
                                <th className="px-2 py-1 border border-slate-300 text-left w-[150px]">Empresa / Cliente</th>
                                <th className="px-2 py-1 border border-slate-300 text-left w-[100px]">Contato</th>
                                <th className="px-2 py-1 border border-slate-300 text-left w-[110px]">Telefone</th>
                                <th className="px-1 py-1 border border-slate-300 text-center w-[45px]">%</th>
                                <th className="px-2 py-1 border border-slate-300 text-left w-[110px]">Registro</th>
                                <th className="px-2 py-1 border border-slate-300 text-left w-[110px]">Retorno</th>
                                <th className="px-2 py-1 border border-slate-300 text-left min-w-[200px]">Último Contato</th>
                                <th className="px-1 py-1 border border-slate-300 text-center w-20">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-slate-400 text-xs border border-slate-300">Carregando...</td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 border border-slate-300">
                                        <p className="text-slate-400 text-xs font-medium">
                                            {search ? 'Nenhum atendimento encontrado para a busca.' : 'Nenhum atendimento cadastrado.'}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((a) => {
                                    const nome = atendimentosService.getNomeExibicao(a);
                                    const contato = atendimentosService.getContatoExibicao(a);
                                    const tel = atendimentosService.getTelefoneExibicao(a);
                                    const isCadastrado = !!a.cliente_id;

                                    return (
                                        <tr
                                            key={a.id}
                                            className="hover:bg-blue-100/40 even:bg-slate-200/40 transition-colors"
                                        >
                                            {/* Empresa */}
                                            <td className="px-2 py-0.5 border border-slate-300 font-semibold text-slate-800 align-middle">
                                                <div className="flex items-center gap-1 overflow-hidden">
                                                    {isCadastrado ? (
                                                        <button
                                                            onClick={e => { e.stopPropagation(); navigate(`/clientes/${a.cliente_id}`); }}
                                                            className="truncate hover:text-blue-600 transition-colors text-left"
                                                            title={nome}
                                                        >{nome}</button>
                                                    ) : (
                                                        <span className="truncate" title={nome}>{nome}</span>
                                                    )}
                                                    {isCadastrado && (
                                                        <span className="inline-flex items-center text-[8px] font-black text-blue-600 bg-blue-100 rounded px-1 flex-shrink-0">CRM</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Contato */}
                                            <td className="px-2 py-0.5 border border-slate-300 text-slate-700 align-middle">
                                                <div className="truncate" title={contato}>{contato}</div>
                                            </td>

                                            {/* Telefone */}
                                            <td className="px-2 py-0.5 border border-slate-300 text-slate-600 font-mono text-[10px] align-middle overflow-hidden" style={{ fontStretch: 'extra-condensed', letterSpacing: '-0.5px' }}>
                                                <div className="truncate" title={tel}>{tel}</div>
                                            </td>

                                            {/* Probabilidade */}
                                            <td className="px-1 py-0.5 border border-slate-300 text-center align-middle overflow-hidden">
                                                <div className="flex justify-center">
                                                    <ProbBadge value={a.probabilidade} />
                                                </div>
                                            </td>

                                            {/* Registro */}
                                            <td className="px-2 py-0.5 border border-slate-300 text-[11px] text-slate-500 font-medium align-middle">
                                                {a.ultima_obs_at ? fmt(a.ultima_obs_at) : '—'}
                                            </td>

                                            {/* Data de retorno */}
                                            <td className="px-2 py-0.5 border border-slate-300 text-[11px] align-middle">
                                                {a.data_retorno
                                                    ? <span className="text-amber-700 font-bold">{fmt(a.data_retorno)}</span>
                                                    : <span className="text-slate-300 font-normal">—</span>}
                                            </td>

                                            {/* Último contato */}
                                            <td className="px-2 py-0.5 border border-slate-300 text-slate-600 align-middle">
                                                <div className="truncate" title={a.ultima_obs || ''}>
                                                    {a.ultima_obs || <span className="text-slate-300 font-light italic">Sem registros</span>}
                                                </div>
                                            </td>


                                            {/* Ações */}
                                            <td className="px-3 py-0.5 border border-slate-300 align-middle">
                                                <div className="flex items-center justify-center gap-2">
                                                    {/* Botão histórico (discreto) */}
                                                    <button
                                                        onClick={() => setHistAtend(a)}
                                                        className="p-1 rounded-sm border border-transparent hover:border-slate-300 hover:bg-white hover:shadow-sm transition-all"
                                                        title="Ver / Adicionar Histórico"
                                                    >
                                                        <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
                                                        </svg>
                                                    </button>
                                                    {/* Editar */}
                                                    <button
                                                        onClick={() => { setEditingAtend(a); setShowForm(true); }}
                                                        className="p-1 rounded-sm border border-transparent hover:border-slate-300 hover:bg-white hover:shadow-sm transition-all"
                                                        title="Editar"
                                                    >
                                                        <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                        </svg>
                                                    </button>
                                                    {/* Deletar */}
                                                    <button
                                                        onClick={() => handleDelete(a.id)}
                                                        className="p-1 rounded-sm border border-transparent hover:border-red-200 hover:bg-red-50 hover:shadow-sm transition-all"
                                                        title="Remover"
                                                    >
                                                        <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer com total */}
                {atendimentos.length > 0 && (() => {
                    const comProb = atendimentos.filter(a => a.probabilidade !== null);
                    const media = comProb.length > 0
                        ? Math.round(comProb.reduce((s, a) => s + (a.probabilidade as number), 0) / comProb.length)
                        : null;
                    return (
                        <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex gap-6 text-[10px] text-slate-500">
                            <span><strong className="text-slate-700">{atendimentos.length}</strong> atendimentos</span>
                            <span><strong className="text-slate-400">{atendimentos.filter(a => a.probabilidade === null).length}</strong> a contatar</span>
                            <span><strong className="text-green-700">{atendimentos.filter(a => a.probabilidade === 100).length}</strong> fechados</span>
                            <span><strong className="text-red-600">{atendimentos.filter(a => a.probabilidade === 0).length}</strong> perdidos</span>
                            {media !== null && <span><strong className="text-blue-700">{media}%</strong> média</span>}
                        </div>
                    );
                })()}
            </div>
        </Layout>
    );
};

export default Atendimentos;
