import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, Button, Badge, LoadingSpinner } from '../components/UI';
import { eventosService, EventoEdicao } from '../services/eventosService';
import DashboardAlerts from '../components/DashboardAlerts';
import ResolucaoAtendimentoModal from '../components/ResolucaoAtendimentoModal';
import { Atendimento } from '../services/atendimentosService';
import { useAuth } from '../context/AuthContext';
import { usePresence } from '../context/PresenceContext';
import { useDashboardExportPDF } from '../hooks/useDashboardExportPDF';
import { EdicaoCard } from '../components/dashboard/EdicaoCard';
import { DocModal, DocModalState } from '../components/dashboard/DocModal';
import { PromoModal } from '../components/dashboard/PromoModal';
import { usePromoModal } from '../hooks/usePromoModal';

type EdicaoComDocs = EventoEdicao & {
    eventos: { nome: string } | null;
    proposta_comercial_path?: string | null;
    planta_baixa_path?: string | null;
};

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { onlineUsers } = usePresence();
    const [edicoes, setEdicoes] = useState<EdicaoComDocs[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State for Alerts & Resolution
    const [selectedAtendimento, setSelectedAtendimento] = useState<Atendimento | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [docModal, setDocModal] = useState<DocModalState>(null);
    const { pdfProgress, pdfTitle, handleExportPdf } = useDashboardExportPDF(setDocModal);

    // Hook para modal do promotor
    const {
        promoModal, allVisitors, promoExpiresAt, setPromoExpiresAt,
        promoCreated, promoLoading,
        handleOpenPromoModal, handlePromoConfirm, handlePromoCreate, closePromoModal,
    } = usePromoModal();

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
        setRefreshTrigger(prev => prev + 1);
    };

    const allPanelButton = (
        <button
            onClick={() => navigate('/todos-eventos')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all shadow-sm"
        >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Todos os Eventos
        </button>
    );

    const onlineBadge = user?.isAdmin ? (
        <div className="relative group/online flex-shrink-0">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-default select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
                <span className="text-[11px] text-slate-400 leading-none">{onlineUsers.length}</span>
            </div>
            {/* Tooltip */}
            <div className="absolute left-0 top-full mt-2 z-50 hidden group-hover/online:block min-w-[200px] pointer-events-none">
                <div className="bg-slate-900 rounded-xl shadow-2xl p-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Online agora</p>
                    {onlineUsers.length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic">Nenhum usuário</p>
                    ) : (
                        <div className="flex flex-col gap-1.5">
                            {onlineUsers.map((u) => (
                                <div key={u.user_id} className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-[9px] font-black text-white uppercase flex-shrink-0">
                                        {u.name.substring(0, 2)}
                                    </div>
                                    <span className="text-[11px] font-medium text-white truncate flex-1">{u.name}</span>
                                    {u.sessionCount > 1 && (
                                        <span className="text-[9px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full flex-shrink-0 tabular-nums">
                                            ×{u.sessionCount}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    ) : null;

    return (
        <Layout title="Dashboard Central" titleExtras={onlineBadge} headerActions={allPanelButton}>
            <div className="max-w-7xl mx-auto space-y-[2px] animate-in fade-in duration-500">
                <div className="border-t border-slate-100 pt-1">
                    <h2 className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-2">
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
                        <div>
                            <Card className="overflow-hidden border-slate-200 shadow-sm transition-all hover:shadow-md">
                                <div className="bg-slate-50 px-4 py-1.5 border-b border-slate-200 flex justify-between items-center">
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
                                        <EdicaoCard
                                            key={edicao.id}
                                            edicao={edicao}
                                            user={user}
                                            onOpenPromoModal={handleOpenPromoModal}
                                            onExportPdf={handleExportPdf}
                                            setDocModal={setDocModal}
                                        />
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
                <div className="border-t border-slate-100 pt-6">
                    <DashboardAlerts
                        onOpenResolucao={(a) => setSelectedAtendimento(a)}
                        refreshTrigger={refreshTrigger}
                    />
                </div>

                {/* Modal: Progresso de Geração de PDF */}
                {pdfProgress !== null && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-[340px] p-7 flex flex-col items-center gap-5">
                            <div className="w-14 h-14 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center">
                                <svg className="w-7 h-7 text-emerald-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6" />
                                </svg>
                            </div>
                            <div className="text-center w-full">
                                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Gerando PDF</p>
                                <p className="text-[13px] font-black text-slate-800 truncate max-w-[280px] text-center">{pdfTitle}</p>
                            </div>
                            <div className="w-full">
                                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1.5">
                                    <span>Processando...</span>
                                    <span className="text-emerald-600 font-black">{pdfProgress}%</span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300 ease-out"
                                        style={{ width: `${pdfProgress}%` }}
                                    />
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-400 text-center">
                                {pdfProgress < 30 ? 'Carregando dados da planilha...' :
                                    pdfProgress < 60 ? 'Organizando estandes...' :
                                        pdfProgress < 90 ? 'Montando tabela PDF...' :
                                            'Finalizando documento...'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Modal: Ações de Documento (Proposta / Planta Baixa / PDF) */}
                {docModal && <DocModal docModal={docModal} onClose={() => setDocModal(null)} />}

                {/* Modal: Criar acesso ao promotor */}
                {promoModal && (
                    <PromoModal
                        promoModal={promoModal}
                        allVisitors={allVisitors}
                        promoExpiresAt={promoExpiresAt}
                        onExpiresAtChange={setPromoExpiresAt}
                        promoCreated={promoCreated}
                        promoLoading={promoLoading}
                        onClose={closePromoModal}
                        onConfirm={handlePromoConfirm}
                        onCreate={handlePromoCreate}
                    />
                )}

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
