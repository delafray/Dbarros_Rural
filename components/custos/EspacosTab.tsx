/**
 * Aba ESPAÇOS em duas zonas (RF-056, regra do usuário 04/08): em cima os
 * espaços PADRÃO da biblioteca — no evento são SÓ vitrine (prévia
 * somente-leitura) + "Setar"; o molde se cadastra/edita em Cadastros
 * (/custos/cadastros). Setar copia o descritivo para o evento; a CÓPIA é
 * editada na zona de baixo e vale APENAS para aquele evento (junto com os
 * espaços exclusivos), na tela portada do Prosperitas (RF-057).
 */

import React, { useMemo, useState } from 'react';
import { Button, Card } from '../UI';
import type {
    CustoComposto,
    CustoEspacoTemplate,
    CustoEspacoTemplateItem,
    CustoItem,
    CustoItemInput,
    CustoProdutoGrupo,
} from '../../types/custos';
import type { ProdutoCatalogoLeve } from '../../utils/descritivoSugestoes';
import { EspacoDescritivo, type DescritivoItemVM } from './EspacoDescritivo';

interface Props {
    grupos: CustoProdutoGrupo[];
    produtos: ProdutoCatalogoLeve[];
    templates: (CustoEspacoTemplate & { itens: CustoEspacoTemplateItem[] })[];
    compostos: CustoComposto[];
    itens: CustoItem[];
    buscarSugestoes: (termo: string) => Promise<{ id: string }[]>;
    registrarUso: (produtoId: string) => void;
    // biblioteca (padrões): no evento é só vitrine + setar
    onSetar: (templateId: string, nome: string, quantidade: number) => Promise<void>;
    // evento (exclusivos e setados — a edição vale só para este evento)
    onCriarExclusivo: (nome: string) => Promise<void>;
    onRenomearComposto: (id: string, nome: string) => Promise<void>;
    onExcluirComposto: (id: string) => Promise<void>;
    onCriarItem: (input: Omit<CustoItemInput, 'edicao_id'>) => Promise<unknown>;
    onAtualizarItem: (id: string, patch: Partial<CustoItemInput>) => Promise<void>;
    onExcluirItem: (id: string) => Promise<void>;
}

export const EspacosTab: React.FC<Props> = ({
    grupos, produtos, templates, compostos, itens,
    buscarSugestoes, registrarUso,
    onSetar,
    onCriarExclusivo, onRenomearComposto, onExcluirComposto,
    onCriarItem, onAtualizarItem, onExcluirItem,
}) => {
    const [abertoTpl, setAbertoTpl] = useState<string | null>(null);
    const [abertoComp, setAbertoComp] = useState<string | null>(null);
    const [novoExclusivo, setNovoExclusivo] = useState('');
    const [qtdSetar, setQtdSetar] = useState<Record<string, string>>({});

    const unidades = useMemo(
        () => [...new Set(produtos.map(p => p.unidade).filter(Boolean))].sort(),
        [produtos],
    );

    const nomeGrupo = (id: string | null) =>
        grupos.find(g => g.id === id)?.nome ?? 'Sem grupo';

    const unidadeDoProduto = (produtoId: string | null) =>
        produtoId ? (produtos.find(p => p.id === produtoId)?.unidade ?? '') : '';

    const itensDoComposto = (compostoId: string): DescritivoItemVM[] =>
        itens.filter(i => i.composto_id === compostoId)
            .map(i => ({
                id: i.id, grupo_id: i.grupo_id, produto_id: i.produto_id,
                descricao: i.descricao, quantidade: i.quantidade, formato: i.formato, ordem: 0,
            }));

    return (
        <div className="space-y-6">
            {/* ── ZONA 1: padrões da biblioteca (vitrine — molde não se edita aqui) ── */}
            <Card className="p-4">
                <div className="mb-1 flex items-center gap-2">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Espaços padrão</h2>
                    <span className="text-xs text-slate-400">biblioteca da empresa — cadastro/edição do molde em Cadastros</span>
                </div>
                <p className="mb-3 text-xs text-slate-500">
                    Clique no nome para VER o descritivo do molde. <b>Setar</b> copia o espaço para este
                    evento — a cópia aparece na zona de baixo e as mudanças que você fizer nela valem
                    <b> só para este evento</b>.
                </p>

                <div className="divide-y divide-slate-100">
                    {templates.map(tpl => (
                        <div key={tpl.id} className="py-2">
                            <div className="flex items-center gap-2">
                                <button
                                    className="text-left font-semibold text-slate-800 hover:text-emerald-700"
                                    onClick={() => setAbertoTpl(a => (a === tpl.id ? null : tpl.id))}
                                >
                                    {abertoTpl === tpl.id ? '▾ ' : '▸ '}{tpl.nome}
                                </button>
                                {tpl.porte && <span className="text-xs text-slate-400">{tpl.porte}</span>}
                                <span className="text-xs text-slate-400">{tpl.itens.length} itens</span>
                                <div className="ml-auto flex items-center gap-1">
                                    <input
                                        className="w-14 rounded border border-slate-300 px-2 py-1 text-right text-sm"
                                        placeholder="qtd"
                                        value={qtdSetar[tpl.id] ?? ''}
                                        onChange={e => setQtdSetar(m => ({ ...m, [tpl.id]: e.target.value }))}
                                    />
                                    <Button variant="outline" onClick={() => {
                                        const n = Number(qtdSetar[tpl.id]) || 1;
                                        void onSetar(tpl.id, tpl.nome, n);
                                    }}>Setar neste evento</Button>
                                </div>
                            </div>
                            {tpl.descricao && abertoTpl !== tpl.id && (
                                <p className="mt-0.5 text-xs text-slate-400">{tpl.descricao}</p>
                            )}
                            {abertoTpl === tpl.id && (
                                /* prévia SOMENTE-LEITURA do molde */
                                <div className="mt-2 rounded border border-slate-200 bg-slate-50/60 p-3">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-xs uppercase text-slate-500">
                                                <th className="py-1 pr-2">Qtd.</th>
                                                <th className="py-1 pr-2">Uni.</th>
                                                <th className="py-1 pr-2">Item</th>
                                                <th className="py-1 pr-2">Formato</th>
                                                <th className="py-1">Grupo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {[...tpl.itens].sort((a, b) => a.ordem - b.ordem).map(it => (
                                                <tr key={it.id}>
                                                    <td className="py-0.5 pr-2">{it.quantidade}</td>
                                                    <td className="py-0.5 pr-2 text-xs text-slate-500">{unidadeDoProduto(it.produto_id)}</td>
                                                    <td className="py-0.5 pr-2">{it.descricao}</td>
                                                    <td className="py-0.5 pr-2 text-xs text-slate-500">{it.formato ?? ''}</td>
                                                    <td className="py-0.5 text-xs text-slate-400">{nomeGrupo(it.grupo_id)}</td>
                                                </tr>
                                            ))}
                                            {tpl.itens.length === 0 && (
                                                <tr><td colSpan={5} className="py-1 text-xs text-slate-400">Molde sem descritivo — preencha em Cadastros.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                    <p className="mt-2 text-[11px] text-slate-400">
                                        Para mudar o MOLDE (vale para todos os eventos): tela inicial → 🗂️ Cadastros → Espaços padrão.
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                    {templates.length === 0 && (
                        <p className="py-2 text-sm text-slate-400">Nenhum espaço padrão — cadastre em 🗂️ Cadastros.</p>
                    )}
                </div>
            </Card>

            {/* ── ZONA 2: espaços deste evento (edição vale só para este evento) ── */}
            <Card className="p-4">
                <div className="mb-1 flex items-center gap-2">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Espaços deste evento</h2>
                    <span className="text-xs text-slate-400">setados da biblioteca ou exclusivos — edite à vontade, vale só aqui</span>
                </div>

                {compostos.length === 0 && (
                    <p className="py-2 text-sm text-slate-400">
                        Nenhum espaço no evento ainda — sete um padrão acima ou crie um exclusivo abaixo.
                    </p>
                )}

                <div className="divide-y divide-slate-100">
                    {compostos.map(comp => {
                        const nItens = itens.filter(i => i.composto_id === comp.id).length;
                        return (
                            <div key={comp.id} className="py-2">
                                <div className="flex items-center gap-2">
                                    <button
                                        className="text-left font-semibold text-slate-800 hover:text-emerald-700"
                                        onClick={() => setAbertoComp(a => (a === comp.id ? null : comp.id))}
                                    >
                                        {abertoComp === comp.id ? '▾ ' : '▸ '}{comp.nome}
                                    </button>
                                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${comp.template_id ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>
                                        {comp.template_id ? 'do padrão' : 'exclusivo'}
                                    </span>
                                    {comp.quantidade !== 1 && <span className="text-xs text-slate-400">× {comp.quantidade}</span>}
                                    <span className="text-xs text-slate-400">{nItens} itens</span>
                                    <div className="ml-auto flex items-center gap-1">
                                        <button
                                            className="px-1 text-slate-400 hover:text-slate-700"
                                            title="Renomear espaço (só neste evento)"
                                            onClick={() => {
                                                const nome = window.prompt('Novo nome do espaço:', comp.nome);
                                                if (nome?.trim() && nome.trim() !== comp.nome) void onRenomearComposto(comp.id, nome.trim());
                                            }}
                                        >✎</button>
                                        <button
                                            className="px-1 text-slate-400 hover:text-red-600"
                                            title="Excluir espaço deste evento"
                                            onClick={() => {
                                                if (window.confirm(`Excluir o espaço "${comp.nome}" deste evento? Os ${nItens} itens do descritivo CONTINUAM na grade, sem vínculo com o espaço.`)) {
                                                    void onExcluirComposto(comp.id);
                                                }
                                            }}
                                        >🗑</button>
                                    </div>
                                </div>
                                {abertoComp === comp.id && (
                                    <div className="mt-2 rounded border border-slate-200 bg-white p-3">
                                        <EspacoDescritivo
                                            idPrefix={`comp-${comp.id}`}
                                            grupos={grupos}
                                            produtos={produtos}
                                            itens={itensDoComposto(comp.id)}
                                            unidades={unidades}
                                            buscarRemoto={buscarSugestoes}
                                            onAdd={async input => {
                                                if (input.produto_id) registrarUso(input.produto_id);
                                                await onCriarItem({
                                                    composto_id: comp.id,
                                                    grupo_id: input.grupo_id,
                                                    produto_id: input.produto_id,
                                                    descricao: input.descricao,
                                                    quantidade: input.quantidade,
                                                    formato: input.formato,
                                                    unidade: input.unidade ?? 'un',
                                                });
                                            }}
                                            onUpdate={async (id, patch) => onAtualizarItem(id, patch)}
                                            onDelete={onExcluirItem}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-3 flex gap-2">
                    <input
                        className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm"
                        placeholder="Novo espaço exclusivo deste evento (ex.: Stand da Rádio)"
                        value={novoExclusivo}
                        onChange={e => setNovoExclusivo(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && novoExclusivo.trim()) {
                                void onCriarExclusivo(novoExclusivo.trim()).then(() => setNovoExclusivo(''));
                            }
                        }}
                    />
                    <Button variant="outline" onClick={async () => {
                        if (novoExclusivo.trim()) { await onCriarExclusivo(novoExclusivo.trim()); setNovoExclusivo(''); }
                    }}>+ Incluir espaço exclusivo</Button>
                </div>
            </Card>
        </div>
    );
};
