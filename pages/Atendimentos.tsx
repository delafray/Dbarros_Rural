import React, { useState, useEffect, useCallback } from 'react';
import { generateAtendimentosReport } from '../services/atendimentosReportService';
import { DocModal, DocModalState } from '../components/dashboard/DocModal';
import { useParams, useNavigate } from 'react-router-dom';
import { ImportAtendimentosModal } from '../components/ImportAtendimentosModal';
import Layout from '../components/Layout';
import { useAppDialog } from '../context/DialogContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import {
    atendimentosService,
    Atendimento,
} from '../services/atendimentosService';
import { probBgColor } from '../utils/probabilidadeCores';
import { ProbBadge, PROBS } from '../components/atendimentos/ProbBadge';
import { HistoricoPopup } from '../components/atendimentos/HistoricoPopup';
import { AtendimentoForm } from '../components/atendimentos/AtendimentoForm';
import { ClienteOption, SortKey } from '../components/atendimentos/types';
import { useAtendimentosFilter } from '../hooks/useAtendimentosFilter';

// ── Tela Principal ────────────────────────────────────────────────────────────
const Atendimentos: React.FC = () => {
    const { edicaoId } = useParams<{ edicaoId: string }>();
    const navigate = useNavigate();
    const appDialog = useAppDialog();
    const { user } = useAuth();
    const isVisitor = user?.isVisitor ?? false;
    const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
    const [clientes, setClientes] = useState<ClienteOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [generatingReport, setGeneratingReport] = useState(false);
    const [docModal, setDocModal] = useState<DocModalState>(null);
    const [edicaoTitulo, setEdicaoTitulo] = useState('');
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingAtend, setEditingAtend] = useState<Atendimento | null>(null);
    const [histAtend, setHistAtend] = useState<Atendimento | null>(null);
    const [showImport, setShowImport] = useState(false);
    const [sortKey, setSortKey] = useState<SortKey | null>('prob');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
    };

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

    const filtered = useAtendimentosFilter({ atendimentos, search, sortKey, sortDir });

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
        try {
            await atendimentosService.delete(id);
            setAtendimentos(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            await appDialog.alert({
                title: 'Erro ao Remover',
                message: 'Não foi possível remover o atendimento: ' + (err instanceof Error ? err.message : String(err)),
                type: 'danger',
            });
        }
    };

    const fmt = (iso: string | null) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const handleGenerateReport = async () => {
        setGeneratingReport(true);
        try {
            const url = await generateAtendimentosReport(filtered, edicaoTitulo);
            setDocModal({ tipo: 'relatorio_atendimentos', url, edicaoTitulo, isPdfBlob: true });
        } finally {
            setGeneratingReport(false);
        }
    };

    const headerActions = (
        <>
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-white hover:shadow-sm rounded-xl transition-all"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Voltar
            </button>
            <button
                onClick={handleGenerateReport}
                disabled={generatingReport || atendimentos.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-[#1F497D] hover:bg-blue-800 disabled:opacity-50 rounded-xl transition-all shadow-sm"
            >
                {generatingReport ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                )}
                {generatingReport ? 'Gerando...' : 'Gerar Relatório'}
            </button>
        </>
    );

    return (
        <Layout title={`Atendimentos :: ${edicaoTitulo}`} headerActions={headerActions}>
            {/* DocModal do relatório */}
            {docModal && <DocModal docModal={docModal} onClose={() => setDocModal(null)} />}

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
                    isVisitor={isVisitor}
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

                    {!isVisitor && (
                        <button
                            onClick={() => { setEditingAtend(null); setShowForm(true); }}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            Atendimento
                        </button>
                    )}

                    {!isVisitor && (
                        <button
                            onClick={() => setShowImport(true)}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Importar
                        </button>
                    )}
                </div>

                {/* Tabela */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[12px] bg-white border border-slate-300 table-fixed">
                        <thead className="bg-[#1F497D] text-white">
                            <tr className="text-[11px] font-bold uppercase tracking-wide">
                                <th className={`px-2 py-1 border border-slate-300 text-left w-[150px] cursor-pointer select-none hover:bg-blue-700 transition-colors ${sortKey === 'nome' ? 'bg-blue-800' : ''}`} onClick={() => handleSort('nome')}>Empresa / Cliente</th>
                                <th className={`px-2 py-1 border border-slate-300 text-left w-[100px] cursor-pointer select-none hover:bg-blue-700 transition-colors ${sortKey === 'contato' ? 'bg-blue-800' : ''}`} onClick={() => handleSort('contato')}>Contato</th>
                                <th className="px-2 py-1 border border-slate-300 text-left w-[110px]">Telefone</th>
                                <th className={`px-1 py-1 border border-slate-300 text-center w-[45px] cursor-pointer select-none hover:bg-blue-700 transition-colors ${sortKey === 'prob' ? 'bg-blue-800' : ''}`} onClick={() => handleSort('prob')}>%</th>
                                <th className={`px-2 py-1 border border-slate-300 text-left w-[110px] cursor-pointer select-none hover:bg-blue-700 transition-colors ${sortKey === 'registro' ? 'bg-blue-800' : ''}`} onClick={() => handleSort('registro')}>Registro</th>
                                <th className={`px-2 py-1 border border-slate-300 text-left w-[110px] cursor-pointer select-none hover:bg-blue-700 transition-colors ${sortKey === 'retorno' ? 'bg-blue-800' : ''}`} onClick={() => handleSort('retorno')}>Retorno</th>
                                <th className={`px-2 py-1 border border-slate-300 text-left min-w-[200px] cursor-pointer select-none hover:bg-blue-700 transition-colors ${sortKey === 'obs' ? 'bg-blue-800' : ''}`} onClick={() => handleSort('obs')}>Último Contato</th>
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
                                                    {isCadastrado && !isVisitor ? (
                                                        <button
                                                            onClick={e => { e.stopPropagation(); navigate(`/clientes/editar/${a.cliente_id}`); }}
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
                                                    {/* Editar — oculto para visitante */}
                                                    {!isVisitor && (
                                                        <button
                                                            onClick={() => { setEditingAtend(a); setShowForm(true); }}
                                                            className="p-1 rounded-sm border border-transparent hover:border-slate-300 hover:bg-white hover:shadow-sm transition-all"
                                                            title="Editar"
                                                        >
                                                            <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    {/* Deletar — oculto para visitante */}
                                                    {!isVisitor && (
                                                        <button
                                                            onClick={() => handleDelete(a.id)}
                                                            className="p-1 rounded-sm border border-transparent hover:border-red-200 hover:bg-red-50 hover:shadow-sm transition-all"
                                                            title="Remover"
                                                        >
                                                            <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    )}
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
