import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { LoadingSpinner } from '../components/UI';
import { eventosService, EventoEdicao } from '../services/eventosService';
import { edicaoDocsService } from '../services/edicaoDocsService';

type EdicaoComDocs = EventoEdicao & {
    eventos: { nome: string } | null;
    proposta_comercial_path?: string | null;
    planta_baixa_path?: string | null;
};

type DocModalState = { tipo: 'proposta_comercial' | 'planta_baixa'; url: string } | null;

const TodosEventos: React.FC = () => {
    const navigate = useNavigate();
    const [edicoes, setEdicoes] = useState<EdicaoComDocs[]>([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [docModal, setDocModal] = useState<DocModalState>(null);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        try {
            setIsLoading(true);
            const data = await eventosService.getAllEdicoes();
            setEdicoes(data as EdicaoComDocs[]);
        } catch (err) {
            console.error('Erro ao buscar edições:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredGroups = useMemo(() => {
        const term = search.toLowerCase().trim();
        const filtered = edicoes.filter(e =>
            !term ||
            (e.eventos?.nome || '').toLowerCase().includes(term) ||
            e.titulo.toLowerCase().includes(term)
        );
        const groups: Record<string, EdicaoComDocs[]> = {};
        for (const e of filtered) {
            const key = e.eventos?.nome || 'Sem Evento';
            if (!groups[key]) groups[key] = [];
            groups[key].push(e);
        }
        return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
    }, [edicoes, search]);

    const totalEdicoes = filteredGroups.reduce((acc, [, e]) => acc + e.length, 0);

    return (
        <Layout
            title="Todos os Eventos"
            headerActions={
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-sm border border-slate-200"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Dashboard Central
                </button>
            }
        >
            <div className="h-[calc(100vh-100px)] flex flex-col gap-3">

                {/* Search + counter */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="relative flex-1 max-w-md">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Buscar evento ou edição..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                            className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 shadow-sm transition-colors"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium italic flex-shrink-0">
                        {totalEdicoes} edição(ões) em {filteredGroups.length} evento(s)
                    </span>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <LoadingSpinner size="lg" />
                    </div>
                ) : filteredGroups.length === 0 ? (
                    <div className="text-center py-16 text-sm text-slate-400 font-medium">
                        {search ? 'Nenhum resultado para sua busca.' : 'Nenhuma edição cadastrada.'}
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto space-y-3 pb-4">
                        {filteredGroups.map(([eventName, edicoesList]) => (
                            <div key={eventName} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md">
                                {/* Event group header */}
                                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                                    <h3 className="text-[15px] font-extrabold text-slate-800 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        {eventName}
                                    </h3>
                                    <span className="text-[9px] font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full flex-shrink-0">
                                        {edicoesList.length} edição(ões)
                                    </span>
                                </div>

                                {/* Edition rows */}
                                <div className="divide-y divide-slate-100">
                                    {edicoesList.map(edicao => (
                                        <div
                                            key={edicao.id}
                                            className="px-4 py-2 hover:bg-blue-50 transition-colors cursor-pointer group flex items-center justify-between"
                                            onClick={() => navigate(`/planilha-vendas/${edicao.id}`)}
                                        >
                                            {/* Edition title */}
                                            <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover:text-blue-600 transition-colors truncate flex-1 min-w-0 pr-4">
                                                {edicao.titulo}
                                            </h4>

                                            {/* Action buttons */}
                                            <div className="flex-shrink-0 flex items-center gap-4 pr-2">

                                                {/* Proposta + Planta */}
                                                {(edicao.proposta_comercial_path || edicao.planta_baixa_path) && (
                                                    <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
                                                        {edicao.proposta_comercial_path && (
                                                            <div
                                                                className="flex items-center gap-1.5 group/prop cursor-pointer"
                                                                onClick={e => { e.stopPropagation(); setDocModal({ tipo: 'proposta_comercial', url: edicaoDocsService.getPublicUrl(edicao.proposta_comercial_path!) }); }}
                                                            >
                                                                <div className="text-[9px] font-bold text-violet-500 uppercase tracking-tighter opacity-60 group-hover/prop:opacity-100 transition-opacity">Proposta</div>
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
                                                                onClick={e => { e.stopPropagation(); setDocModal({ tipo: 'planta_baixa', url: edicaoDocsService.getPublicUrl(edicao.planta_baixa_path!) }); }}
                                                            >
                                                                <div className="text-[9px] font-bold text-teal-500 uppercase tracking-tighter opacity-60 group-hover/planta:opacity-100 transition-opacity">Planta</div>
                                                                <div className="w-7 h-7 rounded-full bg-teal-50 flex items-center justify-center text-teal-500 group-hover/planta:bg-teal-600 group-hover/planta:text-white transition-all shadow-sm border border-teal-100">
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                                                                    </svg>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Imagens */}
                                                <div
                                                    className="flex items-center gap-1.5 group/img cursor-pointer"
                                                    onClick={e => { e.stopPropagation(); navigate('/controle-imagens', { state: { edicaoId: edicao.id } }); }}
                                                >
                                                    <div className="text-[9px] font-bold text-purple-500 uppercase tracking-tighter opacity-60 group-hover/img:opacity-100 transition-opacity">Imagens</div>
                                                    <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 group-hover/img:bg-purple-600 group-hover/img:text-white transition-all shadow-sm border border-purple-100">
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                </div>

                                                {/* Atendimento */}
                                                <div
                                                    className="flex items-center gap-1.5 group/atend cursor-pointer"
                                                    onClick={e => { e.stopPropagation(); navigate(`/atendimentos/${edicao.id}`); }}
                                                >
                                                    <div className="text-[9px] font-bold text-orange-500 uppercase tracking-tighter opacity-60 group-hover/atend:opacity-100 transition-opacity">Abrir Atendimento</div>
                                                    <div className="w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 group-hover/atend:bg-orange-500 group-hover/atend:text-white transition-all shadow-sm border border-orange-100">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
                                                        </svg>
                                                    </div>
                                                </div>

                                                {/* Planilha */}
                                                <div className="flex items-center gap-1.5 group/planilha cursor-pointer" onClick={e => { e.stopPropagation(); navigate(`/planilha-vendas/${edicao.id}`); }}>
                                                    <div className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter opacity-70 group-hover/planilha:opacity-100 transition-opacity">Abrir Planilha</div>
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
                            </div>
                        ))}
                    </div>
                )}
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
        </Layout>
    );
};

export default TodosEventos;
