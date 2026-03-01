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
import { useAppDialog } from '../context/DialogContext';
import { authService, User } from '../services/authService';

type EdicaoComDocs = EventoEdicao & {
    eventos: { nome: string } | null;
    proposta_comercial_path?: string | null;
    planta_baixa_path?: string | null;
};

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { onlineUsers } = usePresence();
    const appDialog = useAppDialog();
    const [edicoes, setEdicoes] = useState<EdicaoComDocs[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State for Alerts & Resolution
    const [selectedAtendimento, setSelectedAtendimento] = useState<Atendimento | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // State for "Criar acesso ao promotor" modal
    type PromoStep = 'confirm' | 'existing' | 'create' | 'created';
    const [promoModal, setPromoModal] = useState<{ edicao: EdicaoComDocs; step: PromoStep } | null>(null);
    const [allVisitors, setAllVisitors] = useState<User[]>([]);
    const [promoExpiresAt, setPromoExpiresAt] = useState('');
    const [promoCreated, setPromoCreated] = useState<{ user: User; passwordRaw: string } | null>(null);
    const [promoLoading, setPromoLoading] = useState(false);

    useEffect(() => {
        fetchActiveEdicoes();
        // Carrega visitantes ativos para checar duplicatas por edição
        authService.getAllUsers().then(users => {
            setAllVisitors(users.filter((u: User) =>
                u.isVisitor && u.isActive !== false &&
                (!u.expiresAt || new Date(u.expiresAt) >= new Date())
            ));
        }).catch(() => {});
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

    const handleOpenPromoModal = (e: React.MouseEvent, edicao: EdicaoComDocs) => {
        e.stopPropagation();
        setPromoExpiresAt('');
        setPromoCreated(null);
        setPromoModal({ edicao, step: 'confirm' });
    };

    const handlePromoConfirm = () => {
        if (!promoModal) return;
        const existing = allVisitors.find(u => u.edicaoId === promoModal.edicao.id) ?? null;
        if (existing) {
            setPromoModal({ ...promoModal, step: 'existing' });
        } else {
            setPromoModal({ ...promoModal, step: 'create' });
        }
    };

    const handlePromoCreate = async () => {
        if (!promoModal || !promoExpiresAt) return;
        setPromoLoading(true);
        try {
            const result = await authService.createTempUser(
                new Date(promoExpiresAt),
                promoModal.edicao.id,
                promoModal.edicao.titulo
            );
            setPromoCreated(result);
            setAllVisitors(prev => [...prev, result.user]);
            setPromoModal({ ...promoModal, step: 'created' });
        } catch (err: any) {
            await appDialog.alert({ title: 'Erro', message: 'Erro ao criar acesso: ' + err.message, type: 'danger' });
        } finally {
            setPromoLoading(false);
        }
    };

    const closePromoModal = () => {
        setPromoModal(null);
        setPromoExpiresAt('');
        setPromoCreated(null);
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
            <div className="absolute left-0 top-full mt-2 z-50 hidden group-hover/online:block min-w-[180px] pointer-events-none">
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
                                    <span className="text-[11px] font-medium text-white truncate">{u.name}</span>
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
                                        <div
                                            key={edicao.id}
                                            className="px-4 py-1 hover:bg-blue-50 transition-colors cursor-pointer group flex items-center justify-between"
                                            onClick={() => navigate(`/planilha-vendas/${edicao.id}`)}
                                        >
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1 rounded border border-blue-100 uppercase">
                                                        {edicao.ano}
                                                    </span>
                                                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest truncate max-w-[220px]">
                                                        {edicao.eventos?.nome || 'Evento'}
                                                    </span>
                                                    {(edicao.data_inicio || edicao.data_fim) && (
                                                        <span className="text-[9px] font-bold text-slate-600 uppercase font-mono bg-slate-50 px-1 rounded border border-slate-100">
                                                            {edicao.data_inicio ? new Date(edicao.data_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '...'} - {edicao.data_fim ? new Date(edicao.data_fim).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '...'}
                                                        </span>
                                                    )}

                                                    {edicao.local && (
                                                        <span className="text-[9px] text-slate-500 truncate italic">
                                                            • {edicao.local}
                                                        </span>
                                                    )}
                                                </div>

                                                <h4 className="text-[11px] font-medium text-slate-500 group-hover:text-blue-500 transition-colors truncate">
                                                    {edicao.titulo}
                                                </h4>
                                            </div>

                                            <div className="flex-shrink-0 flex items-center gap-4 pr-2">
                                                {/* Document quick-access buttons — sempre visíveis; X quando não cadastrado */}
                                                <div className="hidden sm:flex items-center gap-2 border-r border-slate-200 pr-4">
                                                    {/* Proposta Comercial */}
                                                    <div
                                                        className="flex items-center gap-1.5 group/prop cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/eventos/editar/${edicao.evento_id}`);
                                                        }}
                                                    >
                                                        <div className={`hidden lg:block text-[9px] font-bold uppercase tracking-tighter opacity-60 group-hover/prop:opacity-100 transition-opacity ${edicao.proposta_comercial_path ? 'text-violet-500' : 'text-slate-400'}`}>Proposta</div>
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm border ${
                                                            edicao.proposta_comercial_path
                                                                ? 'bg-violet-50 text-violet-500 group-hover/prop:bg-violet-600 group-hover/prop:text-white border-violet-100'
                                                                : 'bg-slate-50 text-slate-300 group-hover/prop:bg-slate-200 group-hover/prop:text-slate-500 border-slate-100'
                                                        }`}>
                                                            {edicao.proposta_comercial_path ? (
                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* Planta Baixa */}
                                                    <div
                                                        className="flex items-center gap-1.5 group/planta cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/eventos/editar/${edicao.evento_id}`);
                                                        }}
                                                    >
                                                        <div className={`hidden lg:block text-[9px] font-bold uppercase tracking-tighter opacity-60 group-hover/planta:opacity-100 transition-opacity ${edicao.planta_baixa_path ? 'text-teal-500' : 'text-slate-400'}`}>Planta</div>
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm border ${
                                                            edicao.planta_baixa_path
                                                                ? 'bg-teal-50 text-teal-500 group-hover/planta:bg-teal-600 group-hover/planta:text-white border-teal-100'
                                                                : 'bg-slate-50 text-slate-300 group-hover/planta:bg-slate-200 group-hover/planta:text-slate-500 border-slate-100'
                                                        }`}>
                                                            {edicao.planta_baixa_path ? (
                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Botão: Criar acesso ao promotor — visível apenas para admins */}
                                                {user?.isAdmin && (
                                                    <div
                                                        className="flex items-center gap-1.5 group/promo cursor-pointer"
                                                        onClick={(e) => handleOpenPromoModal(e, edicao)}
                                                    >
                                                        <div className="hidden lg:block text-[9px] font-bold text-rose-400 uppercase tracking-tighter opacity-60 group-hover/promo:opacity-100 transition-opacity">Promotor</div>
                                                        <div className="w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center text-rose-400 group-hover/promo:bg-rose-400 group-hover/promo:text-white transition-all shadow-sm border border-rose-100">
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Controle de Imagens */}
                                                <div
                                                    className="flex items-center gap-2 group/img cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate('/controle-imagens', { state: { edicaoId: edicao.id } });
                                                    }}
                                                >
                                                    <div className="hidden sm:block text-[9px] font-bold text-purple-500 uppercase tracking-tighter opacity-60 group-hover/img:opacity-100 transition-opacity">
                                                        Imagens
                                                    </div>
                                                    <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 group-hover/img:bg-purple-600 group-hover/img:text-white transition-all shadow-sm border border-purple-100">
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                </div>

                                                <div
                                                    className="flex items-center gap-2 group/atend cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/atendimentos/${edicao.id}`);
                                                    }}
                                                >
                                                    <div className="hidden sm:block text-[9px] font-bold text-orange-500 uppercase tracking-tighter opacity-60 group-hover/atend:opacity-100 transition-opacity">
                                                        Abrir Atendimento
                                                    </div>
                                                    <div className="w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 group-hover/atend:bg-orange-500 group-hover/atend:text-white transition-all shadow-sm border border-orange-100">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
                                                        </svg>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 group/planilha cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/planilha-vendas/${edicao.id}`); }}>
                                                    <div className="hidden sm:block text-[9px] font-bold text-blue-600 uppercase tracking-tighter opacity-70 group-hover/planilha:opacity-100 transition-opacity">
                                                        Abrir Planilha
                                                    </div>
                                                    <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover/planilha:bg-blue-600 group-hover/planilha:text-white transition-all shadow-sm border border-blue-100">
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
                <div className="border-t border-slate-100 pt-6">
                    <DashboardAlerts
                        onOpenResolucao={(a) => setSelectedAtendimento(a)}
                        refreshTrigger={refreshTrigger}
                    />
                </div>


                {/* Modal: Criar acesso ao promotor */}
                {promoModal && (() => {
                    const existingVisitor = allVisitors.find(u => u.edicaoId === promoModal.edicao.id) ?? null;

                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closePromoModal}>
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                                {/* Header */}
                                <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-white font-black text-sm uppercase tracking-widest">Acesso ao Promotor</h2>
                                        <p className="text-red-200 text-[10px] font-bold mt-0.5 uppercase tracking-wide truncate max-w-[260px]">{promoModal.edicao.titulo}</p>
                                    </div>
                                    <button onClick={closePromoModal} className="text-red-200 hover:text-white p-1 transition-colors">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>

                                <div className="p-6 space-y-5">
                                    {/* STEP 1: Confirmação */}
                                    {promoModal.step === 'confirm' && (
                                        <>
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800">Liberar acesso externo à planilha</p>
                                                    <p className="text-[12px] text-slate-600 mt-1.5 leading-relaxed">
                                                        Você está prestes a gerar um <strong>acesso temporário de leitura</strong> para um promotor ou representante externo. Essa pessoa poderá visualizar a planilha de vendas e o histórico de atendimentos desta edição — <strong>sem permissão para alterar nenhum dado</strong>.
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 mt-2">Certifique-se de enviar as credenciais apenas para a pessoa autorizada.</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3 pt-1">
                                                <button onClick={closePromoModal} className="flex-1 py-2.5 text-xs font-bold text-slate-600 border border-slate-300 hover:border-slate-500 transition-colors">
                                                    Cancelar
                                                </button>
                                                <button onClick={handlePromoConfirm} className="flex-1 py-2.5 text-xs font-black text-white bg-red-600 hover:bg-red-700 transition-colors">
                                                    Entendido, prosseguir
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {/* STEP 2a: Já existe visitante — só cópia */}
                                    {promoModal.step === 'existing' && existingVisitor && (
                                        <>
                                            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-2">
                                                <span className="text-amber-500 text-base flex-shrink-0">⚠️</span>
                                                <p className="text-[11px] text-amber-800 font-bold">Já existe um acesso ativo para esta edição. Copie e envie as credenciais abaixo.</p>
                                            </div>
                                            <div className="bg-slate-50 border border-slate-200 p-3 space-y-2 text-xs font-mono rounded-lg">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-500 font-sans font-bold uppercase text-[10px]">Usuário:</span>
                                                    <div className="flex items-center gap-2">
                                                        <code className="text-slate-800 font-black">{existingVisitor.email.replace('@temp.local', '')}</code>
                                                        <button onClick={() => navigator.clipboard.writeText(existingVisitor.email.replace('@temp.local', ''))} className="text-[10px] text-blue-600 hover:underline font-sans">Copiar</button>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-500 font-sans font-bold uppercase text-[10px]">Senha:</span>
                                                    <div className="flex items-center gap-2">
                                                        {existingVisitor.tempPasswordPlain ? (
                                                            <>
                                                                <code className="text-slate-800 font-black tracking-wider">{existingVisitor.tempPasswordPlain}</code>
                                                                <button onClick={() => navigator.clipboard.writeText(existingVisitor.tempPasswordPlain!)} className="text-[10px] text-blue-600 hover:underline font-sans">Copiar</button>
                                                            </>
                                                        ) : (
                                                            <span className="text-slate-400 italic font-sans text-[10px]">não disponível</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-500 font-sans font-bold uppercase text-[10px]">Expira em:</span>
                                                    <code className="text-amber-700 font-black">{existingVisitor.expiresAt ? new Date(existingVisitor.expiresAt).toLocaleDateString('pt-BR') : '—'}</code>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <button
                                                    onClick={() => {
                                                        const login = existingVisitor.email.replace('@temp.local', '');
                                                        const senha = existingVisitor.tempPasswordPlain ?? '(não disponível)';
                                                        const expira = existingVisitor.expiresAt ? new Date(existingVisitor.expiresAt).toLocaleDateString('pt-BR') : '—';
                                                        const msg = `*Acesso Temporário - Dbarros Rural*\n\nOlá! Segue seu acesso de visitante para *${promoModal.edicao.titulo}*:\n\n🔗 *Link:* https://dbarros.vercel.app/#/login\n👤 *Usuário:* ${login}\n🔑 *Senha:* ${senha}\n\n📅 *Válido até:* ${expira}\n\nAcesse para visualizar a planilha e atendimentos.`;
                                                        navigator.clipboard.writeText(msg);
                                                    }}
                                                    className="w-full flex items-center justify-center gap-2 py-3 text-xs font-black text-white bg-slate-800 hover:bg-slate-950 transition-colors rounded-lg"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                    Copiar texto para WhatsApp
                                                </button>
                                                <p className="text-[10px] text-slate-400 text-center">Clique para copiar. Depois abra o WhatsApp e cole a mensagem pronta.</p>
                                            </div>
                                            <button onClick={closePromoModal} className="w-full py-2 text-[10px] font-bold text-slate-500 hover:text-slate-800 transition-colors">Fechar</button>
                                        </>
                                    )}

                                    {/* STEP 2b: Nenhum visitante — criar novo */}
                                    {promoModal.step === 'create' && (
                                        <>
                                            <p className="text-sm text-slate-600">Nenhum acesso ativo encontrado para esta edição. Defina a data de validade e gere o acesso.</p>
                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Data Limite de Acesso</label>
                                                <input
                                                    type="date"
                                                    value={promoExpiresAt}
                                                    onChange={e => setPromoExpiresAt(e.target.value)}
                                                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-red-500 text-sm font-bold text-slate-800 p-3 rounded-lg outline-none transition-all"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="flex gap-3">
                                                <button onClick={closePromoModal} className="flex-1 py-2.5 text-xs font-bold text-slate-600 border border-slate-300 hover:border-slate-500 transition-colors rounded-lg">
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={handlePromoCreate}
                                                    disabled={promoLoading || !promoExpiresAt}
                                                    className="flex-1 py-2.5 text-xs font-black text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors rounded-lg"
                                                >
                                                    {promoLoading ? 'Gerando...' : 'Gerar Acesso'}
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {/* STEP 3: Criado com sucesso */}
                                    {promoModal.step === 'created' && promoCreated && (
                                        <>
                                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                                <p className="text-sm font-black text-slate-800">Acesso criado com sucesso!</p>
                                            </div>
                                            <div className="space-y-2">
                                                <div>
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Login de Acesso</label>
                                                    <div className="flex bg-slate-50 border border-slate-200 p-1 rounded-lg">
                                                        <code className="flex-1 px-3 py-2 text-sm font-black text-slate-800 break-all">{promoCreated.user.email.replace('@temp.local', '')}</code>
                                                        <button onClick={() => navigator.clipboard.writeText(promoCreated.user.email.replace('@temp.local', ''))} className="p-2 text-slate-400 hover:text-slate-900 transition-colors" title="Copiar">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Senha</label>
                                                    <div className="flex bg-slate-50 border border-slate-200 p-1 rounded-lg">
                                                        <code className="flex-1 px-3 py-2 text-sm font-black text-slate-800 tracking-wider">{promoCreated.passwordRaw}</code>
                                                        <button onClick={() => navigator.clipboard.writeText(promoCreated.passwordRaw)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors" title="Copiar">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-lg">
                                                        <span className="text-[9px] font-black text-amber-600 uppercase block mb-0.5">Expira em</span>
                                                        <span className="text-xs font-black text-amber-900">{new Date(promoCreated.user.expiresAt!).toLocaleDateString('pt-BR')}</span>
                                                    </div>
                                                    <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-lg">
                                                        <span className="text-[9px] font-black text-blue-600 uppercase block mb-0.5">Acesso em</span>
                                                        <span className="text-[10px] font-black text-blue-800">dbarros.vercel.app</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <button
                                                    onClick={() => {
                                                        const login = promoCreated.user.email.replace('@temp.local', '');
                                                        const expira = new Date(promoCreated.user.expiresAt!).toLocaleDateString('pt-BR');
                                                        const msg = `*Acesso Temporário - Dbarros Rural*\n\nOlá! Segue seu acesso de visitante para *${promoModal.edicao.titulo}*:\n\n🔗 *Link:* https://dbarros.vercel.app/#/login\n👤 *Usuário:* ${login}\n🔑 *Senha:* ${promoCreated.passwordRaw}\n\n📅 *Válido até:* ${expira}\n\nAcesse para visualizar a planilha e atendimentos.`;
                                                        navigator.clipboard.writeText(msg);
                                                    }}
                                                    className="w-full flex items-center justify-center gap-2 py-3 text-xs font-black text-white bg-slate-800 hover:bg-slate-950 transition-colors rounded-lg"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                    Copiar texto para WhatsApp
                                                </button>
                                                <p className="text-[10px] text-slate-400 text-center">Clique para copiar. Depois abra o WhatsApp e cole a mensagem pronta.</p>
                                            </div>
                                            <button onClick={closePromoModal} className="w-full py-2 text-[10px] font-bold text-slate-500 hover:text-slate-800 transition-colors">Fechar</button>
                                        </>
                                    )}
                                </div>
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
