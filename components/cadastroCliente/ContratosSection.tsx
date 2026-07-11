import React from 'react';
import type { StandVinculado, AtendimentoVinculado } from './types';

interface ContratosSectionProps {
    standsVinculados: StandVinculado[];
    atendimentosVinculados: AtendimentoVinculado[];
    navigate: (to: string) => void;
}

const ContratosSection: React.FC<ContratosSectionProps> = ({
    standsVinculados,
    atendimentosVinculados,
    navigate,
}) => {
    return (
        <div className="animate-in fade-in duration-300 space-y-8">

            {/* Listagem 1: Participações em Planilhas */}
            <div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
                    Participações em Planilhas
                </h3>
                {standsVinculados.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                        <p className="text-xs text-slate-400">Nenhum stand vinculado a este cliente.</p>
                    </div>
                ) : (
                    <div className="border border-slate-300 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-100 border-b border-slate-300">
                                    <th className="text-left px-3 py-1 font-bold text-slate-600 uppercase tracking-wider text-[11px] border-r border-slate-300">Evento</th>
                                    <th className="text-left px-3 py-1 font-bold text-slate-600 uppercase tracking-wider text-[11px] border-r border-slate-300">Stand</th>
                                    <th className="text-left px-3 py-1 font-bold text-slate-600 uppercase tracking-wider text-[11px] border-r border-slate-300">Contrato</th>
                                    <th className="text-left px-3 py-1 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Opcionais</th>
                                </tr>
                            </thead>
                            <tbody>
                                {standsVinculados.map((stand) => {
                                    const edicao = stand.planilha_configuracoes?.eventos_edicoes;
                                    const eventoNome = edicao?.eventos?.nome;
                                    const edicaoTitulo = edicao?.titulo;
                                    const eventoLabel = eventoNome
                                        ? `${eventoNome} — ${edicaoTitulo}`
                                        : (edicaoTitulo || '—');

                                    const opcsObj = (stand.opcionais_selecionados || {}) as Record<string, string>;
                                    const opcsSelecionadas = Object.entries(opcsObj)
                                        .filter(([, v]) => v === 'x' || v === '*')
                                        .map(([k]) => k);

                                    const tipoVenda = stand.tipo_venda || '—';
                                    const isCombo = tipoVenda.toLowerCase().includes('combo');
                                    const isPadrao = tipoVenda === 'PADRÃO' || tipoVenda === 'PADRAO';

                                    return (
                                        <tr key={stand.id} className="hover:bg-blue-100/40 even:bg-slate-200/40 transition-colors">
                                            <td className="px-3 py-0.5 border-b border-r border-slate-300 whitespace-nowrap max-w-[220px] truncate text-[12px] text-slate-700 font-medium" title={eventoLabel}>
                                                {eventoLabel}
                                            </td>
                                            <td className="px-3 py-0.5 border-b border-r border-slate-300 whitespace-nowrap text-[12px]">
                                                <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-px text-[11px]">
                                                    {stand.stand_nr}
                                                </span>
                                            </td>
                                            <td className="px-3 py-0.5 border-b border-r border-slate-300 whitespace-nowrap text-[12px]">
                                                <span className={`inline-flex items-center px-2 py-px text-[10px] font-bold uppercase tracking-wide ${isCombo ? 'bg-violet-100 text-violet-700' :
                                                    isPadrao ? 'bg-blue-100 text-blue-700' :
                                                        'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {tipoVenda}
                                                </span>
                                            </td>
                                            <td className="px-3 py-0.5 border-b border-slate-300 text-[12px] text-slate-600 whitespace-nowrap truncate max-w-[240px]" title={opcsSelecionadas.join(' - ')}>
                                                {opcsSelecionadas.length > 0
                                                    ? opcsSelecionadas.join(' - ')
                                                    : <span className="text-slate-300">—</span>
                                                }
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Listagem 2: Atendimentos */}
            <div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    Histórico de Atendimentos
                </h3>
                {atendimentosVinculados.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                        <p className="text-xs text-slate-400">Nenhum atendimento registrado para este cliente.</p>
                    </div>
                ) : (
                    <div className="border border-slate-300 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-100 border-b border-slate-300">
                                    <th className="text-left px-3 py-1 font-bold text-slate-600 uppercase tracking-wider text-[11px] border-r border-slate-300">Evento</th>
                                    <th className="text-left px-3 py-1 font-bold text-slate-600 uppercase tracking-wider text-[11px] border-r border-slate-300">Contato</th>
                                    <th className="text-left px-3 py-1 font-bold text-slate-600 uppercase tracking-wider text-[11px] border-r border-slate-300 text-blue-600">Usuário</th>
                                    <th className="text-left px-3 py-1 font-bold text-slate-600 uppercase tracking-wider text-[11px] border-r border-slate-300">Último Contato</th>
                                    <th className="text-left px-3 py-1 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-blue-600">Última Obs. ↗</th>
                                </tr>
                            </thead>
                            <tbody>
                                {atendimentosVinculados.map((atend) => {
                                    const edicao = atend.eventos_edicoes;
                                    const eventoNome = edicao?.eventos?.nome;
                                    const edicaoTitulo = edicao?.titulo;
                                    const eventoLabel = eventoNome
                                        ? `${eventoNome} — ${edicaoTitulo}`
                                        : (edicaoTitulo || '—');

                                    const contatoNome = atend.contatos?.nome || atend.contato_nome || '—';
                                    const contatoTel = atend.contatos?.telefone || atend.telefone;

                                    const formatTel = (tel: string | null | undefined) => {
                                        if (!tel) return null;
                                        const d = tel.replace(/\D/g, '');
                                        if (d.length === 11) return `(${d.slice(0, 2)}) ${d[2]} ${d.slice(3, 7)}-${d.slice(7)}`;
                                        if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
                                        return tel;
                                    };

                                    const formatDate = (iso: string | null | undefined) => {
                                        if (!iso) return null;
                                        const d = new Date(iso);
                                        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                    };

                                    const obs = atend.ultima_obs;
                                    const obsLabel = obs ? (obs.length > 65 ? obs.slice(0, 65) + '…' : obs) : null;

                                    return (
                                        <tr key={atend.id} className="hover:bg-blue-100/40 even:bg-slate-200/40 transition-colors">
                                            <td className="px-3 py-0.5 border-b border-r border-slate-300 whitespace-nowrap max-w-[200px] truncate text-[12px] text-slate-700 font-medium" title={eventoLabel}>
                                                {eventoLabel}
                                            </td>
                                            <td className="px-3 py-0.5 border-b border-r border-slate-300 whitespace-nowrap text-[12px]">
                                                <span className="font-semibold text-slate-800">{contatoNome}</span>
                                                {formatTel(contatoTel) && (
                                                    <span className="text-slate-400 text-[10px] ml-2">{formatTel(contatoTel)}</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-0.5 border-b border-r border-slate-300 whitespace-nowrap text-[12px] text-blue-700 font-bold">
                                                {atend.users?.name || 'Sistema'}
                                            </td>
                                            <td className="px-3 py-0.5 border-b border-r border-slate-300 whitespace-nowrap text-[12px] text-slate-500">
                                                {formatDate(atend.ultima_obs_at) || <span className="text-slate-300">—</span>}
                                            </td>
                                            <td
                                                className="px-3 py-0.5 border-b border-slate-300 text-[12px] text-slate-500 max-w-[220px] truncate cursor-pointer hover:text-blue-600 hover:bg-blue-50/60 transition-colors"
                                                title={obs ? `${obs} — clique para abrir` : 'Clique para abrir atendimento'}
                                                onClick={() => navigate(`/atendimentos/${atend.edicao_id}`)}
                                            >
                                                {obsLabel || <span className="text-blue-400 italic text-[11px]">abrir ↗</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
};

export default ContratosSection;
