import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, Button, Badge, LoadingSpinner } from '../components/UI';
import { eventosService, EventoEdicao } from '../services/eventosService';
import DashboardAlerts from '../components/DashboardAlerts';
import ResolucaoAtendimentoModal from '../components/ResolucaoAtendimentoModal';
import { Atendimento } from '../services/atendimentosService';
import { edicaoDocsService } from '../services/edicaoDocsService';

type EdicaoComDocs = EventoEdicao & {
    eventos: { nome: string } | null;
    proposta_comercial_path?: string | null;
    planta_baixa_path?: string | null;
};

type DocModalState = { tipo: 'proposta_comercial' | 'planta_baixa'; url: string } | null;

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [edicoes, setEdicoes] = useState<EdicaoComDocs[]>([]);
    const [docModal, setDocModal] = useState<DocModalState>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State for Alerts & Resolution
    const [selectedAtendimento, setSelectedAtendimento] = useState<Atendimento | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        fetchActiveEdicoes();
    }, []);

    const fetchActiveEdicoes = async () => {
        try {
            setIsLoading(true);
            const data = await eventosService.getActiveEdicoes();
            setEdicoes(data as EdicaoComDocs[]);
        } catch (err: any) {
            console.error('Erro ao buscar edições ativas:', err);
            setError('Não foi possível carregar o dashboard.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResolutionSuccess = () => {
        // Trigger refresh of the alerts list
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <Layout title="Dashboard">
            <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-slate-800">
                            Dashboard Central
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Monitoramento de retornos e acesso às edições ativas.
                        </p>
                    </div>
                </div>

                <div className="border-t border-slate-100">
                    <h2 className="text-lg font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2 text-[12px]">
                        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        Edições Ativas
                    </h2>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm font-medium mb-6">
                            {error}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex justify-center p-12">
                            <LoadingSpinner size="lg" />
                        </div>
                    ) : edicoes.length === 0 ? (
                        <Card className="text-center py-16 bg-white border border-slate-200 rounded-xl shadow-sm">
                            <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <h3 className="mt-4 text-sm font-medium text-slate-900">Nenhuma edição ativa no momento</h3>
                            <p className="mt-1 text-sm text-slate-500">Crie um novo evento ou ative uma edição existente para visualizá-la aqui.</p>
                            <div className="mt-6">
                                <Button onClick={() => navigate('/eventos/novo')}>
                                    Criar Novo Evento
                                </Button>
                            </div>
                        </Card>
                    ) : (
                        <div className="max-w-4xl">
                            <Card className="overflow-hidden border-slate-200 shadow-sm transition-all hover:shadow-md">
                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                                    <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Listagem de Edições
                                    </h3>
                                    <Badge variant="info" className="text-[10px]">{edicoes.length} encontrada(s)</Badge>
                                </div>

                                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                                    {edicoes.map((edicao) => (
                                        <div
                                            key={edicao.id}
                                            className="px-4 py-2 hover:bg-blue-50 transition-colors cursor-pointer group flex items-center justify-between"
                                            onClick={() => navigate(`/planilha-vendas/${edicao.id}`)}
                                        >
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1 rounded border border-blue-100 uppercase">
                                                        {edicao.ano}
                                                    </span>
                                                    {(edicao.data_inicio || edicao.data_fim) && (
                                                        <span className="text-[9px] font-bold text-slate-600 uppercase font-mono bg-slate-50 px-1 rounded border border-slate-100">
                                                            {edicao.data_inicio ? new Date(edicao.data_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '...'} - {edicao.data_fim ? new Date(edicao.data_fim).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '...'}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] font-medium text-slate-600 uppercase tracking-tight truncate max-w-[180px]">
                                                        {edicao.eventos?.nome || 'Evento'}
                                                    </span>
                                                    {edicao.local && (
                                                        <span className="text-[9px] text-slate-500 truncate italic">
                                                            • {edicao.local}
                                                        </span>
                                                    )}
                                                </div>

                                                <h4 className="text-[15px] font-extrabold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                                                    {edicao.titulo}
                                                </h4>
                                            </div>

                                            <div className="flex-shrink-0 flex items-center gap-4 pr-2">
                                                {/* Document quick-access buttons */}
                                                {(edicao.proposta_comercial_path || edicao.planta_baixa_path) && (
                                                    <div className="hidden sm:flex items-center gap-2 border-r border-slate-200 pr-4">
                                                        {edicao.proposta_comercial_path && (
                                                            <div
                                                                className="flex items-center gap-1.5 group/prop cursor-pointer"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDocModal({ tipo: 'proposta_comercial', url: edicaoDocsService.getPublicUrl(edicao.proposta_comercial_path!) });
                                                                }}
                                                            >
                                                                <div className="hidden lg:block text-[9px] font-bold text-violet-500 uppercase tracking-tighter opacity-60 group-hover/prop:opacity-100 transition-opacity">Proposta</div>
                                                                <div className="w-7 h-7 rounded-full bg-violet-50 flex items-center justify-center text-violet-500 group-hover/prop:bg-violet-600 group-hover/prop:text-white transition-all shadow-sm border border-violet-100">
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                    </svg>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {edicao.planta_baixa_path && (
                                                            <div
                                                                className="flex items-center gap-1.5 group/planta cursor-pointer"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDocModal({ tipo: 'planta_baixa', url: edicaoDocsService.getPublicUrl(edicao.planta_baixa_path!) });
                                                                }}
                                                            >
                                                                <div className="hidden lg:block text-[9px] font-bold text-teal-500 uppercase tracking-tighter opacity-60 group-hover/planta:opacity-100 transition-opacity">Planta</div>
                                                                <div className="w-7 h-7 rounded-full bg-teal-50 flex items-center justify-center text-teal-500 group-hover/planta:bg-teal-600 group-hover/planta:text-white transition-all shadow-sm border border-teal-100">
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                                                                    </svg>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <div
                                                    className="flex items-center gap-2 group/atend cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/atendimentos/${edicao.id}`);
                                                    }}
                                                >
                                                    <div className="hidden sm:block text-[9px] font-bold text-slate-500 uppercase tracking-tighter opacity-60 group-hover/atend:opacity-100 transition-opacity">
                                                        Abrir Atendimento
                                                    </div>
                                                    <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover/atend:bg-blue-600 group-hover/atend:text-white transition-all shadow-sm border border-slate-200 group-hover/atend:border-blue-600">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
                                                        </svg>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <div className="hidden sm:block text-[9px] font-bold text-blue-600 uppercase tracking-tighter opacity-70 group-hover:opacity-100 transition-opacity">
                                                        Abrir Planilha
                                                    </div>
                                                    <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm border border-blue-100">
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex justify-center">
                                    <span className="text-[10px] font-medium text-slate-400 italic">
                                        Role para ver mais edições (se houver)
                                    </span>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>

                {/* Dashboard Alerts - Highlighted Follow-ups */}
                <div className="max-w-5xl border-t border-slate-100 pt-6">
                    <DashboardAlerts
                        onOpenResolucao={(a) => setSelectedAtendimento(a)}
                        refreshTrigger={refreshTrigger}
                    />
                </div>

                {/* Document Action Modal */}
                {docModal && (() => {
                    const label = docModal.tipo === 'proposta_comercial' ? 'Proposta Comercial' : 'Planta Baixa';
                    const url = docModal.url;
                    const handleShare = async () => {
                        try {
                            const response = await fetch(url);
                            const blob = await response.blob();
                            const ext = url.split('.').pop()?.split('?')[0] || 'pdf';
                            const fileName = `${label.replace(/ /g, '_')}.${ext}`;
                            const file = new File([blob], fileName, { type: blob.type });
                            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                                await navigator.share({ files: [file], title: label });
                            } else {
                                alert('Seu dispositivo não suporta compartilhamento direto. Use o botão Baixar para salvar o arquivo.');
                            }
                        } catch {
                            alert('Não foi possível preparar o arquivo para compartilhar.');
                        }
                    };
                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDocModal(null)}>
                            <div className="bg-white rounded-2xl shadow-2xl w-[320px] p-6 flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
                                {/* Success icon */}
                                <div className="w-16 h-16 rounded-full bg-green-50 border-4 border-green-100 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div className="text-center">
                                    <p className="text-[11px] text-slate-500 font-medium">O que deseja fazer com a</p>
                                    <p className="text-[13px] font-black text-slate-800 uppercase tracking-wide">{label}?</p>
                                </div>
                                <div className="w-full flex flex-col gap-2">
                                    <button
                                        onClick={() => window.open(url, '_blank')}
                                        className="w-full py-3 rounded-xl bg-blue-600 text-white font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        Visualizar
                                    </button>
                                    <a
                                        href={url}
                                        download
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-full py-3 rounded-xl bg-slate-800 text-white font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        Baixar
                                    </a>
                                    <button
                                        onClick={handleShare}
                                        className="w-full py-3 rounded-xl bg-green-600 text-white font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                        Compartilhar
                                    </button>
                                </div>
                                <button onClick={() => setDocModal(null)} className="text-[11px] text-slate-400 hover:text-slate-600 font-medium transition-colors">
                                    Fechar
                                </button>
                            </div>
                        </div>
                    );
                })()}

                {/* Modals */}
                {selectedAtendimento && (
                    <ResolucaoAtendimentoModal
                        atendimento={selectedAtendimento}
                        onClose={() => setSelectedAtendimento(null)}
                        onSuccess={handleResolutionSuccess}
                    />
                )}
            </div>
        </Layout>
    );
};

export default Dashboard;
