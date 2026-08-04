/**
 * Wizard de criação em CAMADAS (RF-035): Perfil → Governamental → Estrutura →
 * Composição → Detalhes. O sistema PROPÕE (checklist condicional + sugestões
 * por público), o gestor corta — meta de 15 minutos (RNF-013).
 */

import React, { useMemo, useState } from 'react';
import { Button, Modal } from '../UI';
import {
    gerarChecklist,
    PERFIL_VAZIO,
    type ItemChecklistGerado,
    type PerfilChecklist,
} from '../../utils/checklistEvento';
import type {
    CustoCategoria,
    CustoChecklistResposta,
    CustoEspacoTemplate,
    CustoPerfilEdicao,
} from '../../types/custos';

interface Props {
    aberto: boolean;
    onFechar: () => void;
    dataEventoISO: string | null;
    perfilAtual: CustoPerfilEdicao | null;
    respostas: CustoChecklistResposta[];
    templates: CustoEspacoTemplate[];
    categorias: CustoCategoria[];
    onSalvarPerfil: (p: Partial<CustoPerfilEdicao>) => Promise<void>;
    onSalvarResposta: (r: Partial<CustoChecklistResposta> & { chave: string }) => Promise<void>;
    onInstanciarTemplate: (templateId: string, nome: string, quantidade: number) => Promise<void>;
    onCriarItemAvulso: (params: {
        descricao: string; categoriaSlug: string; quantidade: number;
        prazoLimite: string | null; avulso: boolean;
    }) => Promise<void>;
}

const PASSOS = ['Perfil', 'Obrigatórios', 'Estrutura', 'Composição', 'Detalhes'] as const;

const PERGUNTAS_PERFIL: { chave: keyof PerfilChecklist; rotulo: string }[] = [
    { chave: 'tem_animais', rotulo: 'Terá animais (julgamento, rodeio, exposição)?' },
    { chave: 'tem_show', rotulo: 'Terá shows / música?' },
    { chave: 'vende_alcool', rotulo: 'Venderá bebida alcoólica?' },
    { chave: 'cobra_ingresso', rotulo: 'Cobrará ingresso?' },
    { chave: 'tem_estruturas', rotulo: 'Montará estruturas (tendas, palco, arquibancada)?' },
    { chave: 'local_publico', rotulo: 'O local é público (rua, praça, parque municipal)?' },
    { chave: 'local_fechado', rotulo: 'Tem áreas fechadas (pavilhão, salão)?' },
];

export const WizardEvento: React.FC<Props> = ({
    aberto, onFechar, dataEventoISO, perfilAtual, respostas, templates, categorias,
    onSalvarPerfil, onSalvarResposta, onInstanciarTemplate, onCriarItemAvulso,
}) => {
    const [passo, setPasso] = useState(0);
    const [salvando, setSalvando] = useState(false);
    const [perfil, setPerfil] = useState<PerfilChecklist>({
        ...PERFIL_VAZIO,
        ...(perfilAtual ?? {}),
    });
    const [ticks, setTicks] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(respostas.map(r => [r.chave, r.marcado])));
    const [qtds, setQtds] = useState<Record<string, string>>(() =>
        Object.fromEntries(respostas.filter(r => r.quantidade != null).map(r => [r.chave, String(r.quantidade)])));
    const [qtdTemplates, setQtdTemplates] = useState<Record<string, string>>({});

    const checklist = useMemo(
        () => gerarChecklist(perfil, dataEventoISO),
        [perfil, dataEventoISO],
    );
    const doPasso = (camada: ItemChecklistGerado['camada']) =>
        checklist.filter(i => i.camada === camada);

    const marcado = (i: ItemChecklistGerado) =>
        ticks[i.chave] ?? (i.obrigatorio || i.sugestaoQuantidade !== null);

    const slugParaCategoria = useMemo(
        () => Object.fromEntries(categorias.map(c => [c.slug, c.id])),
        [categorias],
    );
    void slugParaCategoria;

    const concluir = async () => {
        setSalvando(true);
        try {
            await onSalvarPerfil(perfil as Partial<CustoPerfilEdicao>);
            // Respostas ticadas → grava + gera o item avulso com prazo (RF-021)
            for (const item of checklist) {
                const on = marcado(item);
                const qtd = Number(qtds[item.chave]) || item.sugestaoQuantidade || null;
                await onSalvarResposta({
                    chave: item.chave,
                    marcado: on,
                    quantidade: qtd,
                    prazo_limite: item.prazoLimite,
                });
                if (on) {
                    await onCriarItemAvulso({
                        descricao: item.rotulo,
                        categoriaSlug: item.categoriaSlug,
                        quantidade: qtd ?? 1,
                        prazoLimite: item.prazoLimite,
                        avulso: item.camada === 'governamental',
                    });
                }
            }
            // Composição: templates com quantidade > 0 viram compostos (RF-050)
            for (const t of templates) {
                const n = Number(qtdTemplates[t.id]) || 0;
                if (n > 0) await onInstanciarTemplate(t.id, t.nome, n);
            }
            onFechar();
        } finally {
            setSalvando(false);
        }
    };

    const ChecklistPasso: React.FC<{ camada: ItemChecklistGerado['camada'] }> = ({ camada }) => (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {doPasso(camada).length === 0 && (
                <p className="text-sm text-slate-500">Nada se aplica com este perfil — pode avançar.</p>
            )}
            {doPasso(camada).map(item => (
                <label key={item.chave}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">
                    <input
                        type="checkbox"
                        checked={marcado(item)}
                        disabled={item.obrigatorio}
                        onChange={e => setTicks(t => ({ ...t, [item.chave]: e.target.checked }))}
                    />
                    <span className="flex-1 text-sm">
                        {item.rotulo}
                        {item.obrigatorio && <span className="ml-2 text-xs text-amber-600 font-semibold">obrigatório</span>}
                        {item.prazoLimite && (
                            <span className="ml-2 text-xs text-red-600">até {item.prazoLimite.split('-').reverse().join('/')}</span>
                        )}
                        {item.descricao && <span className="block text-xs text-slate-400">{item.descricao}</span>}
                    </span>
                    {(item.sugestaoQuantidade !== null || qtds[item.chave] !== undefined) && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                            <input
                                className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-sm"
                                value={qtds[item.chave] ?? String(item.sugestaoQuantidade ?? '')}
                                onChange={e => setQtds(q => ({ ...q, [item.chave]: e.target.value }))}
                            />
                            {item.sugestaoRotulo}
                        </span>
                    )}
                </label>
            ))}
        </div>
    );

    return (
        <Modal isOpen={aberto} onClose={onFechar} maxWidth="max-w-2xl"
            title={`Novo centro de custo — ${PASSOS[passo]} (${passo + 1}/${PASSOS.length})`}>
            <div className="space-y-4">
                {passo === 0 && (
                    <div className="space-y-3">
                        <div>
                            <label className="text-sm font-medium">Público esperado</label>
                            <input
                                type="number"
                                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                                placeholder="ex.: 5000 — dimensiona as sugestões"
                                value={perfil.publico_esperado ?? ''}
                                onChange={e => setPerfil(p => ({
                                    ...p,
                                    publico_esperado: e.target.value === '' ? null : Number(e.target.value),
                                }))}
                            />
                        </div>
                        {PERGUNTAS_PERFIL.map(q => (
                            <label key={q.chave} className="flex items-center gap-3 text-sm">
                                <input
                                    type="checkbox"
                                    checked={Boolean(perfil[q.chave])}
                                    onChange={e => setPerfil(p => ({ ...p, [q.chave]: e.target.checked }))}
                                />
                                {q.rotulo}
                            </label>
                        ))}
                        <p className="text-xs text-slate-400">
                            O perfil dimensiona tudo: dia de campo mostra meia dúzia de itens; evento completo mostra tudo.
                        </p>
                    </div>
                )}
                {passo === 1 && <ChecklistPasso camada="governamental" />}
                {passo === 2 && <ChecklistPasso camada="estrutura" />}
                {passo === 3 && (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        <p className="text-xs text-slate-400 mb-2">
                            Quantos de cada espaço este evento terá? (0 = não terá; dá para incluir/excluir depois)
                        </p>
                        {templates.map(t => (
                            <div key={t.id} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                                <span className="flex-1 text-sm">
                                    {t.nome}
                                    {t.descricao && <span className="block text-xs text-slate-400">{t.descricao}</span>}
                                </span>
                                <input
                                    type="number" min={0}
                                    className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-sm"
                                    value={qtdTemplates[t.id] ?? ''}
                                    placeholder="0"
                                    onChange={e => setQtdTemplates(q => ({ ...q, [t.id]: e.target.value }))}
                                />
                            </div>
                        ))}
                    </div>
                )}
                {passo === 4 && <ChecklistPasso camada="detalhes" />}

                <div className="flex justify-between border-t border-slate-200 pt-4">
                    <Button variant="secondary" onClick={() => (passo === 0 ? onFechar() : setPasso(p => p - 1))}>
                        {passo === 0 ? 'Cancelar' : 'Voltar'}
                    </Button>
                    {passo < PASSOS.length - 1 ? (
                        <Button onClick={() => setPasso(p => p + 1)}>Avançar</Button>
                    ) : (
                        <Button onClick={concluir} disabled={salvando}>
                            {salvando ? 'Gerando itens…' : 'Concluir e gerar itens'}
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    );
};
