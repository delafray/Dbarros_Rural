/**
 * Editor do descritivo-padrão dos ESPAÇOS (RF-050): o que compõe um Stand 5x5,
 * um Bar, o CAEX — biblioteca da empresa, reutilizada em todo evento.
 */

import React, { useState } from 'react';
import { Button, Card } from '../UI';
import type { CustoCategoria, CustoEspacoTemplate, CustoEspacoTemplateItem } from '../../types/custos';

interface Props {
    templates: (CustoEspacoTemplate & { itens: CustoEspacoTemplateItem[] })[];
    categorias: CustoCategoria[];
    onAddItem: (item: { template_id: string; descricao: string; quantidade: number; formato?: string | null; categoria_id?: string | null }) => Promise<void>;
    onUpdateItem: (id: string, patch: Partial<Pick<CustoEspacoTemplateItem, 'descricao' | 'quantidade' | 'formato' | 'categoria_id'>>) => Promise<void>;
    onDeleteItem: (id: string) => Promise<void>;
    onCreateTemplate: (nome: string) => Promise<void>;
    onInstanciar: (templateId: string, nome: string, quantidade: number) => Promise<void>;
}

export const EspacosTab: React.FC<Props> = ({
    templates, categorias, onAddItem, onUpdateItem, onDeleteItem, onCreateTemplate, onInstanciar,
}) => {
    const [novoItem, setNovoItem] = useState<Record<string, { descricao: string; qtd: string; formato: string; cat: string }>>({});
    const [novoEspaco, setNovoEspaco] = useState('');
    const [qtdInstancia, setQtdInstancia] = useState<Record<string, string>>({});

    const campo = (tplId: string) =>
        novoItem[tplId] ?? { descricao: '', qtd: '', formato: '', cat: '' };

    const adicionar = async (tplId: string) => {
        const c = campo(tplId);
        if (!c.descricao.trim()) return;
        await onAddItem({
            template_id: tplId,
            descricao: c.descricao.trim(),
            quantidade: Number(c.qtd.replace(',', '.')) || 1,
            formato: c.formato.trim() || null,
            categoria_id: c.cat || null,
        });
        setNovoItem(m => ({ ...m, [tplId]: { descricao: '', qtd: '', formato: '', cat: c.cat } }));
    };

    return (
        <div className="space-y-4">
            <Card className="p-4">
                <p className="text-xs text-slate-500">
                    Estes são os modelos da EMPRESA (valem para todos os eventos). O que você definir aqui é o
                    que o wizard instancia — ex.: Stand 5x5 = tenda + piso + mobiliário + testeira + elétrica.
                    Cada item tem a sua <b>categoria</b>: é ela que decide com quem se cota
                    (piso com um fornecedor, programação visual com outro).
                </p>
                <div className="mt-2 flex gap-2">
                    <input
                        className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm"
                        placeholder="Novo espaço (ex.: Camarote)"
                        value={novoEspaco}
                        onChange={e => setNovoEspaco(e.target.value)}
                    />
                    <Button variant="outline" onClick={async () => {
                        if (novoEspaco.trim()) { await onCreateTemplate(novoEspaco.trim()); setNovoEspaco(''); }
                    }}>+ Criar espaço</Button>
                </div>
            </Card>

            {templates.map(tpl => (
                <Card key={tpl.id} className="p-4">
                    <div className="mb-2 flex items-center gap-2">
                        <h3 className="font-semibold">{tpl.nome}</h3>
                        <span className="text-xs text-slate-400">{tpl.itens.length} itens no descritivo</span>
                        <div className="ml-auto flex items-center gap-1">
                            <input
                                className="w-16 rounded border border-slate-300 px-2 py-1 text-right text-sm"
                                placeholder="qtd"
                                value={qtdInstancia[tpl.id] ?? ''}
                                onChange={e => setQtdInstancia(m => ({ ...m, [tpl.id]: e.target.value }))}
                            />
                            <Button variant="outline" onClick={() => {
                                const n = Number(qtdInstancia[tpl.id]) || 1;
                                void onInstanciar(tpl.id, tpl.nome, n);
                            }}>Instanciar neste evento</Button>
                        </div>
                    </div>

                    <table className="min-w-full text-sm">
                        <thead className="text-left text-xs uppercase text-slate-500">
                            <tr>
                                <th className="py-1">Item</th>
                                <th className="py-1">Formato</th>
                                <th className="py-1 text-right">Qtde</th>
                                <th className="py-1">Categoria (com quem cota)</th>
                                <th className="w-8" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tpl.itens.sort((a, b) => a.ordem - b.ordem || a.criado_em.localeCompare(b.criado_em)).map(it => (
                                <tr key={it.id}>
                                    <td className="py-1 pr-2">
                                        <input
                                            className="w-full bg-transparent text-sm outline-none focus:bg-amber-50"
                                            defaultValue={it.descricao}
                                            onBlur={e => e.target.value !== it.descricao &&
                                                void onUpdateItem(it.id, { descricao: e.target.value })}
                                        />
                                    </td>
                                    <td className="py-1 pr-2">
                                        <input
                                            className="w-full bg-transparent text-sm outline-none focus:bg-amber-50"
                                            defaultValue={it.formato ?? ''}
                                            onBlur={e => (e.target.value || null) !== it.formato &&
                                                void onUpdateItem(it.id, { formato: e.target.value || null })}
                                        />
                                    </td>
                                    <td className="py-1 text-right">
                                        <input
                                            className="w-16 bg-transparent text-right text-sm outline-none focus:bg-amber-50"
                                            defaultValue={String(it.quantidade)}
                                            onBlur={e => {
                                                const n = Number(e.target.value.replace(',', '.'));
                                                if (Number.isFinite(n) && n > 0 && n !== it.quantidade) {
                                                    void onUpdateItem(it.id, { quantidade: n });
                                                }
                                            }}
                                        />
                                    </td>
                                    <td className="py-1">
                                        <select
                                            className="w-full bg-transparent text-xs"
                                            value={it.categoria_id ?? ''}
                                            onChange={e => void onUpdateItem(it.id, { categoria_id: e.target.value || null })}
                                        >
                                            <option value="">—</option>
                                            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                        </select>
                                    </td>
                                    <td className="text-center">
                                        <button className="text-slate-300 hover:text-red-500"
                                            onClick={() => void onDeleteItem(it.id)}>×</button>
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-amber-50/40">
                                <td className="py-1 pr-2">
                                    <input
                                        className="w-full bg-transparent text-sm outline-none"
                                        placeholder="+ item do descritivo (Enter salva)"
                                        value={campo(tpl.id).descricao}
                                        onChange={e => setNovoItem(m => ({ ...m, [tpl.id]: { ...campo(tpl.id), descricao: e.target.value } }))}
                                        onKeyDown={e => e.key === 'Enter' && void adicionar(tpl.id)}
                                    />
                                </td>
                                <td className="py-1 pr-2">
                                    <input
                                        className="w-full bg-transparent text-sm outline-none"
                                        placeholder="5x5, m2…"
                                        value={campo(tpl.id).formato}
                                        onChange={e => setNovoItem(m => ({ ...m, [tpl.id]: { ...campo(tpl.id), formato: e.target.value } }))}
                                        onKeyDown={e => e.key === 'Enter' && void adicionar(tpl.id)}
                                    />
                                </td>
                                <td className="py-1 text-right">
                                    <input
                                        className="w-16 bg-transparent text-right text-sm outline-none"
                                        placeholder="1"
                                        value={campo(tpl.id).qtd}
                                        onChange={e => setNovoItem(m => ({ ...m, [tpl.id]: { ...campo(tpl.id), qtd: e.target.value } }))}
                                        onKeyDown={e => e.key === 'Enter' && void adicionar(tpl.id)}
                                    />
                                </td>
                                <td className="py-1">
                                    <select
                                        className="w-full bg-transparent text-xs"
                                        value={campo(tpl.id).cat}
                                        onChange={e => setNovoItem(m => ({ ...m, [tpl.id]: { ...campo(tpl.id), cat: e.target.value } }))}
                                    >
                                        <option value="">categoria…</option>
                                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                    </select>
                                </td>
                                <td />
                            </tr>
                        </tbody>
                    </table>
                </Card>
            ))}
        </div>
    );
};
