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

type DocModalState = { tipo: 'proposta_comercial' | 'planta_baixa'; url: string; edicaoTitulo: string } | null;

const TodosEventos: React.FC = () => {
    const navigate = useNavigate();
    const [edicoes, setEdicoes] = useState<EdicaoComDocs[]>([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [docModal, setDocModal] = useState<DocModalState>(null);

    useEffect(() => { fetchAll(); }, []);

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
            <div className="h-[calc(100vh-100px)] flex flex-col gap-2">

                {/* Search + counter */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="relative flex-1 max-w-md">
                        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Buscar evento ou edição..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                            className="w-full pl-8 pr-7 py-1.5 text-[12px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 shadow-sm transition-colors"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    <div className="flex justify-center p-12"><LoadingSpinner size="lg" /></div>
                ) : filteredGroups.length === 0 ? (
                    <div className="text-center py-16 text-sm text-slate-400 font-medium">
                        {search ? 'Nenhum resultado para sua busca.' : 'Nenhuma edição cadastrada.'}
                    </div>
                ) : (
                    <div className="overflow-y-auto border border-slate-200 rounded-lg bg-white" style={{ maxHeight: 'calc(100vh - 150px)' }}>
                        {filteredGroups.map(([eventName, edicoesList]) => (
                            <div key={eventName}>
                                {/* Event group header */}
                                <div className="sticky top-0 z-10 flex items-center gap-2 px-3 py-1 bg-slate-100 border-b border-slate-300">
                                    <svg className="w-3 h-3 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex-1">{eventName}</span>
                                    <span className="text-[9px] font-bold text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded-full">{edicoesList.length}</span>
                                </div>

                                {/* Edition rows */}
                                {edicoesList.map(edicao => {
                                    const propostaUrl = edicao.proposta_comercial_path ? edicaoDocsService.getPublicUrl(edicao.proposta_comercial_path) : null;
                                    const plantaUrl = edicao.planta_baixa_path ? edicaoDocsService.getPublicUrl(edicao.planta_baixa_path) : null;
                                    return (
                                        <div
                                            key={edicao.id}
                                            className="flex items-center gap-2 px-3 border-b border-slate-100 hover:bg-blue-50 cursor-pointer group transition-colors"
                                            style={{ minHeight: '28px' }}
                                            onClick={() => navigate(`/planilha-vendas/${edicao.id}`)}
                                        >
                                            {/* Edition title */}
                                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide group-hover:text-blue-700 transition-colors flex-1 truncate py-1">
                                                {edicao.titulo}
                                            </span>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>

                                                {/* Docs */}
                                                {propostaUrl && (
                                                    <button
                                                        onClick={() => setDocModal({ tipo: 'proposta_comercial', url: propostaUrl, edicaoTitulo: edicao.titulo })}
                                                        className="flex items-center gap-1 group/prop"
                                                    >
                                                        <span className="text-[9px] font-bold text-violet-500 uppercase tracking-tighter opacity-60 group-hover/prop:opacity-100 transition-opacity">Proposta</span>
                                                        <div className="w-6 h-6 flex items-center justify-center rounded text-violet-500 hover:bg-violet-100 transition-colors">
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                        </div>
                                                    </button>
                                                )}
                                                {plantaUrl && (
                                                    <button
                                                        onClick={() => setDocModal({ tipo: 'planta_baixa', url: plantaUrl, edicaoTitulo: edicao.titulo })}
                                                        className="flex items-center gap-1 group/planta"
                                                    >
                                                        <span className="text-[9px] font-bold text-teal-500 uppercase tracking-tighter opacity-60 group-hover/planta:opacity-100 transition-opacity">Planta</span>
                                                        <div className="w-6 h-6 flex items-center justify-center rounded text-teal-500 hover:bg-teal-100 transition-colors">
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                                                            </svg>
                                                        </div>
                                                    </button>
                                                )}

                                                {(propostaUrl || plantaUrl) && <div className="w-px h-3 bg-slate-200" />}

                                                {/* Imagens */}
                                                <button
                                                    onClick={() => navigate('/controle-imagens', { state: { edicaoId: edicao.id } })}
                                                    className="flex items-center gap-1 group/img"
                                                >
                                                    <span className="text-[9px] font-bold text-purple-500 uppercase tracking-tighter opacity-60 group-hover/img:opacity-100 transition-opacity">Imagens</span>
                                                    <div className="w-6 h-6 flex items-center justify-center rounded text-purple-500 hover:bg-purple-100 transition-colors">
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                </button>

                                                {/* Atendimento */}
                                                <button
                                                    onClick={() => navigate(`/atendimentos/${edicao.id}`)}
                                                    className="flex items-center gap-1 group/atend"
                                                >
                                                    <span className="text-[9px] font-bold text-orange-500 uppercase tracking-tighter opacity-60 group-hover/atend:opacity-100 transition-opacity">Atendimento</span>
                                                    <div className="w-6 h-6 flex items-center justify-center rounded text-orange-500 hover:bg-orange-100 transition-colors">
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
                                                        </svg>
                                                    </div>
                                                </button>

                                                {/* Planilha */}
                                                <button
                                                    onClick={() => navigate(`/planilha-vendas/${edicao.id}`)}
                                                    className="flex items-center gap-1 group/planilha"
                                                >
                                                    <span className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter opacity-70 group-hover/planilha:opacity-100 transition-opacity">Planilha</span>
                                                    <div className="w-6 h-6 flex items-center justify-center rounded text-blue-600 hover:bg-blue-100 transition-colors">
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Document Action Modal */}
            {docModal && (() => {
                const label = docModal.tipo === 'proposta_comercial' ? 'Proposta Comercial' : 'Planta Baixa';
                const url = docModal.url;
                const nomeEdicao = docModal.edicaoTitulo.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
                const prefix = docModal.tipo === 'proposta_comercial' ? 'PROPOSTA_COMERCIAL' : 'PLANTA_BAIXA';
                const ext = url.split('.').pop()?.split('?')[0] || 'pdf';
                const fileName = `${prefix}_${nomeEdicao}.${ext}`;
                const handleDownload = async () => {
                    try {
                        const response = await fetch(url);
                        const blob = await response.blob();
                        const objectUrl = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = objectUrl;
                        a.download = fileName;
                        a.click();
                        URL.revokeObjectURL(objectUrl);
                    } catch {
                        alert('Nao foi possivel baixar o arquivo.');
                    }
                };
                const handleShare = async () => {
                    try {
                        const response = await fetch(url);
                        const blob = await response.blob();
                        const file = new File([blob], fileName, { type: blob.type });
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            await navigator.share({ files: [file], title: fileName });
                        } else {
                            alert('Seu dispositivo nao suporta compartilhamento direto. Use o botao Baixar.');
                        }
                    } catch {
                        alert('Nao foi possivel preparar o arquivo para compartilhar.');
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
                                <button
                                    onClick={handleDownload}
                                    className="w-full py-3 rounded-xl bg-slate-800 text-white font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    Baixar
                                </button>
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
