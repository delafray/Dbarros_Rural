import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, Button, Badge, LoadingSpinner } from '../components/UI';
import { eventosService, EventoEdicao } from '../services/eventosService';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [edicoes, setEdicoes] = useState<(EventoEdicao & { eventos: { nome: string } | null })[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchActiveEdicoes();
    }, []);

    const fetchActiveEdicoes = async () => {
        try {
            setIsLoading(true);
            const data = await eventosService.getActiveEdicoes();
            setEdicoes(data);
        } catch (err: any) {
            console.error('Erro ao buscar edições ativas:', err);
            setError('Não foi possível carregar o dashboard.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Layout title="Dashboard">
            <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-slate-800">
                            Edições Ativas
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Selecione uma edição para acessar sua respectiva planilha de vendas.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm font-medium">
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
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
                        <Card className="overflow-hidden border-slate-200 shadow-sm">
                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Listagem de Edições Ativas
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
                                            {/* Top Metadata Row: Period before name, smaller */}
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

                                            {/* Primary Title Row: Highlighted */}
                                            <h4 className="text-[15px] font-extrabold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                                                {edicao.titulo}
                                            </h4>
                                        </div>

                                        <div className="flex-shrink-0 flex items-center gap-6 pr-2">
                                            {/* Atalho Atendimento */}
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

                                            {/* Atalho Planilha (Existente) */}
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
        </Layout>
    );
};

export default Dashboard;
