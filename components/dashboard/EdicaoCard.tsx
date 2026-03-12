import React from 'react';
import { useNavigate } from 'react-router-dom';
import { edicaoDocsService } from '../../services/edicaoDocsService';
import { DashboardActionButton } from './DashboardActionButton';

interface EdicaoCardProps {
    edicao: any; // Type it properly if needed
    user: any;
    onOpenPromoModal: (e: React.MouseEvent, edicao: any) => void;
    onExportPdf: (e: React.MouseEvent, edicao: any) => void;
    setDocModal: React.Dispatch<React.SetStateAction<any>>;
}

export const EdicaoCard: React.FC<EdicaoCardProps> = ({
    edicao,
    user,
    onOpenPromoModal,
    onExportPdf,
    setDocModal
}) => {
    const navigate = useNavigate();

    return (
        <div
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

                    {edicao.local && (
                        <span className="text-[9px] text-slate-500 truncate italic">
                            • {edicao.local}
                        </span>
                    )}
                </div>

                <h4 className="text-[11px] font-medium text-slate-500 group-hover:text-blue-500 transition-colors truncate flex items-center gap-1.5">
                    {(edicao.data_inicio || edicao.data_fim) && (
                        <span className="text-[10px] font-bold text-slate-700 font-mono bg-slate-100 px-1.5 rounded shrink-0">
                            {edicao.data_inicio ? new Date(edicao.data_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '...'} – {edicao.data_fim ? new Date(edicao.data_fim).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '...'}
                        </span>
                    )}
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
                            if (edicao.proposta_comercial_path) {
                                const url = edicaoDocsService.getPublicUrl(edicao.proposta_comercial_path);
                                setDocModal({ tipo: 'proposta_comercial', url, edicaoTitulo: edicao.titulo });
                            } else {
                                navigate(`/eventos/editar/${edicao.evento_id}`);
                            }
                        }}
                    >
                        <div className={`hidden lg:block text-[9px] font-bold uppercase tracking-tighter opacity-60 group-hover/prop:opacity-100 transition-opacity ${edicao.proposta_comercial_path ? 'text-violet-500' : 'text-slate-400'}`}>Proposta</div>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm border ${edicao.proposta_comercial_path
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
                            if (edicao.planta_baixa_path) {
                                const url = edicaoDocsService.getPublicUrl(edicao.planta_baixa_path);
                                setDocModal({ tipo: 'planta_baixa', url, edicaoTitulo: edicao.titulo });
                            } else {
                                navigate(`/eventos/editar/${edicao.evento_id}`);
                            }
                        }}
                    >
                        <div className={`hidden lg:block text-[9px] font-bold uppercase tracking-tighter opacity-60 group-hover/planta:opacity-100 transition-opacity ${edicao.planta_baixa_path ? 'text-teal-500' : 'text-slate-400'}`}>Planta</div>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm border ${edicao.planta_baixa_path
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
                    <DashboardActionButton
                        label="Promotor"
                        color="rose"
                        onClick={(e) => onOpenPromoModal(e, edicao)}
                        icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>}
                    />
                )}

                {/* Controle de Imagens */}
                <DashboardActionButton
                    label="Imagens"
                    color="purple"
                    onClick={(e) => { e.stopPropagation(); navigate('/controle-imagens', { state: { edicaoId: edicao.id } }); }}
                    icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                />

                <DashboardActionButton
                    label="Atendimentos"
                    color="orange"
                    onClick={(e) => { e.stopPropagation(); navigate(`/atendimentos/${edicao.id}`); }}
                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" /></svg>}
                />

                {/* Grupo Botões Finais: Planilha e PDF com gap-1 */}
                <div className="flex items-center gap-1">
                    <DashboardActionButton
                        label="Planilha"
                        color="blue"
                        onClick={(e) => { e.stopPropagation(); navigate(`/planilha-vendas/${edicao.id}`); }}
                        icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>}
                    />

                    {/* Exportar PDF */}
                    <DashboardActionButton
                        color="blue"
                        onClick={(e) => onExportPdf(e, edicao)}
                        title="Exportar como PDF"
                        icon={<span className="text-[8px] font-bold tracking-tighter">PDF</span>}
                    />
                </div>
            </div>
        </div>
    );
};
