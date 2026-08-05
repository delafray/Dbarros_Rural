/**
 * Gestão de PRODUTOS do catálogo (RF-059) — tela inicial do Centro de Custo.
 * Adicionar / renomear / excluir com as regras do usuário:
 *  - em uso em evento → exclusão BLOQUEADA (oferece desativar, reversível);
 *  - renomeado → subitem preserva o NOME ORIGINAL; hover mostra a modificação.
 */

import React, { useMemo, useState } from 'react';
import { Button, Card, LoadingSpinner } from '../UI';
import { useCustosProdutos } from '../../hooks/useCustosProdutos';
import { cadeiaDeModificacoes } from '../../utils/produtosGestao';

export const ProdutosManager: React.FC<{ aberto: boolean }> = ({ aberto }) => {
    const g = useCustosProdutos(aberto);
    const [filtro, setFiltro] = useState('');
    const [grupoFiltro, setGrupoFiltro] = useState('');
    const [mostrarInativos, setMostrarInativos] = useState(false);
    const [aviso, setAviso] = useState<string | null>(null);
    const [novo, setNovo] = useState({ nome: '', grupo: '', categoria: '', unidade: 'un' });

    const visiveis = useMemo(() => {
        const f = filtro.trim().toLowerCase();
        return g.produtos.filter(p =>
            (mostrarInativos || p.ativo) &&
            (!grupoFiltro || p.grupo_id === grupoFiltro) &&
            (!f || p.nome.toLowerCase().includes(f)));
    }, [g.produtos, filtro, grupoFiltro, mostrarInativos]);

    if (!aberto) return null;
    if (g.carregando) return <Card className="p-4"><LoadingSpinner /></Card>;
    if (g.erro) return <Card className="p-4 text-sm text-red-600">Erro: {g.erro}</Card>;

    const nomeGrupo = (id: string | null) => g.grupos.find(x => x.id === id)?.nome ?? '—';

    return (
        <Card className="p-4">
            <div className="mb-2 flex items-center gap-2">
                <h3 className="font-semibold">Produtos do catálogo</h3>
                <span className="text-xs text-slate-400">{visiveis.length} de {g.produtos.length}</span>
                <label className="ml-auto flex items-center gap-1 text-xs text-slate-500">
                    <input type="checkbox" checked={mostrarInativos} onChange={e => setMostrarInativos(e.target.checked)} />
                    mostrar desativados
                </label>
            </div>

            {/* filtros */}
            <div className="mb-3 flex gap-2">
                <input
                    className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm"
                    placeholder="Filtrar por nome…"
                    value={filtro}
                    onChange={e => setFiltro(e.target.value)}
                />
                <select
                    className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                    value={grupoFiltro}
                    onChange={e => setGrupoFiltro(e.target.value)}
                >
                    <option value="">Todos os grupos</option>
                    {g.grupos.map(gr => <option key={gr.id} value={gr.id}>{gr.nome}</option>)}
                </select>
            </div>

            {aviso && (
                <div className="mb-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {aviso} <button className="ml-2 font-semibold" onClick={() => setAviso(null)}>fechar</button>
                </div>
            )}

            {/* lista */}
            <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto rounded border border-slate-200">
                {visiveis.map(p => {
                    const hist = g.historicoPorProduto.get(p.id) ?? [];
                    const original = hist[0]?.nome_anterior;
                    const cadeia = cadeiaDeModificacoes(hist);
                    return (
                        <div key={p.id} className={`flex items-start gap-2 px-3 py-1.5 ${p.ativo ? '' : 'opacity-50'}`}>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="truncate text-sm" title={cadeia || undefined}>{p.nome}</span>
                                    {!p.ativo && <span className="rounded bg-slate-100 px-1 text-[10px] uppercase text-slate-500">desativado</span>}
                                    <span className="rounded bg-slate-50 px-1 text-[10px] text-slate-400">{p.unidade}</span>
                                    <span className="text-[10px] text-slate-400">{nomeGrupo(p.grupo_id)}</span>
                                </div>
                                {original && (
                                    /* subitem RF-059: preserva o nome original; hover mostra a modificação */
                                    <div
                                        className="mt-0.5 cursor-help pl-4 text-xs text-slate-400"
                                        title={cadeia}
                                    >
                                        ↳ nome original: <i>{original}</i>
                                    </div>
                                )}
                            </div>
                            <button
                                className="px-1 text-slate-400 hover:text-slate-700"
                                title="Renomear (o nome original fica preservado)"
                                onClick={() => {
                                    const nome = window.prompt('Novo nome do produto:', p.nome);
                                    if (nome?.trim() && nome.trim() !== p.nome) {
                                        void g.renomear(p.id, nome.trim()).catch(e => setAviso(String(e?.message ?? e)));
                                    }
                                }}
                            >✎</button>
                            {p.ativo ? (
                                <button
                                    className="px-1 text-slate-400 hover:text-red-600"
                                    title="Excluir (bloqueado se estiver em uso em evento)"
                                    onClick={async () => {
                                        if (!window.confirm(`Excluir "${p.nome}" do catálogo?`)) return;
                                        const r = await g.excluir(p.id).catch(e => { setAviso(String(e?.message ?? e)); return null; });
                                        if (r && !r.ok) {
                                            if (window.confirm(`Não dá para excluir: ${r.motivo}.\n\nDesativar o produto? (some do autocomplete; reversível)`)) {
                                                void g.setAtivo(p.id, false);
                                            }
                                        }
                                    }}
                                >🗑</button>
                            ) : (
                                <button
                                    className="px-1 text-xs text-emerald-600 hover:text-emerald-800"
                                    title="Reativar produto"
                                    onClick={() => void g.setAtivo(p.id, true)}
                                >reativar</button>
                            )}
                        </div>
                    );
                })}
                {visiveis.length === 0 && (
                    <p className="p-3 text-sm text-slate-400">Nenhum produto com esse filtro.</p>
                )}
            </div>

            {/* adicionar */}
            <div className="mt-3 flex flex-wrap gap-2">
                <input
                    className="min-w-48 flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm"
                    placeholder="Novo produto…"
                    value={novo.nome}
                    onChange={e => setNovo(n => ({ ...n, nome: e.target.value }))}
                />
                <select
                    className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                    value={novo.grupo}
                    onChange={e => setNovo(n => ({ ...n, grupo: e.target.value }))}
                >
                    <option value="">grupo…</option>
                    {g.grupos.map(gr => <option key={gr.id} value={gr.id}>{gr.nome}</option>)}
                </select>
                <select
                    className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                    value={novo.categoria}
                    onChange={e => setNovo(n => ({ ...n, categoria: e.target.value }))}
                >
                    <option value="">categoria (cotação)…</option>
                    {g.categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <select
                    className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                    value={novo.unidade}
                    onChange={e => setNovo(n => ({ ...n, unidade: e.target.value }))}
                >
                    {g.unidades.map(u => <option key={u.id} value={u.sigla}>{u.sigla}</option>)}
                </select>
                <Button variant="outline" onClick={async () => {
                    if (!novo.nome.trim()) return;
                    try {
                        await g.adicionar({
                            nome: novo.nome.trim(),
                            grupo_id: novo.grupo || null,
                            categoria_id: novo.categoria || null,
                            unidade: novo.unidade,
                        });
                        setNovo(n => ({ ...n, nome: '' }));
                    } catch (e) {
                        setAviso(String((e as Error)?.message ?? e));
                    }
                }}>+ Adicionar</Button>
            </div>
        </Card>
    );
};
