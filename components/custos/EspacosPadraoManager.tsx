/**
 * Cadastro dos ESPAÇOS PADRÃO da biblioteca fora do evento (tela de Cadastros,
 * RF-056/059): criar/renomear/arquivar e editar o descritivo de cada espaço
 * na tela portada do Prosperitas (RF-057). Sem "Setar" — isso é no evento.
 */

import React, { useMemo, useState } from 'react';
import { Button, Card, LoadingSpinner } from '../UI';
import { useEspacosPadrao } from '../../hooks/useEspacosPadrao';
import { EspacoDescritivo } from './EspacoDescritivo';

export const EspacosPadraoManager: React.FC<{ aberto: boolean }> = ({ aberto }) => {
    const g = useEspacosPadrao(aberto);
    const [abertoTpl, setAbertoTpl] = useState<string | null>(null);
    const [novoNome, setNovoNome] = useState('');

    const unidades = useMemo(
        () => [...new Set(g.produtos.map(p => p.unidade).filter(Boolean))].sort(),
        [g.produtos],
    );

    if (!aberto) return null;
    if (g.carregando) return <Card className="p-4"><LoadingSpinner /></Card>;
    if (g.erro) return <Card className="p-4 text-sm text-red-600">Erro: {g.erro}</Card>;

    return (
        <Card className="p-4">
            <div className="mb-1 flex items-center gap-2">
                <h3 className="font-semibold">Espaços padrão</h3>
                <span className="text-xs text-slate-400">
                    biblioteca da empresa — o que você define aqui vale para todos os eventos
                </span>
            </div>
            <p className="mb-3 text-xs text-slate-500">
                Clique no nome para abrir o descritivo (a tela do Prosperitas). Para USAR um espaço
                num evento, vá ao evento → aba Espaços → "Setar neste evento".
            </p>

            <div className="divide-y divide-slate-100">
                {g.templates.map(tpl => (
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
                                <button
                                    className="px-1 text-slate-400 hover:text-slate-700"
                                    title="Renomear espaço padrão"
                                    onClick={() => {
                                        const nome = window.prompt('Novo nome do espaço padrão:', tpl.nome);
                                        if (nome?.trim() && nome.trim() !== tpl.nome) void g.renomear(tpl.id, nome.trim());
                                    }}
                                >✎</button>
                                <button
                                    className="px-1 text-slate-400 hover:text-red-600"
                                    title="Arquivar (some da biblioteca; reversível)"
                                    onClick={() => {
                                        if (window.confirm(`Arquivar o espaço padrão "${tpl.nome}"? Ele some da biblioteca (reversível no banco); eventos que já o usaram não mudam.`)) {
                                            void g.arquivar(tpl.id);
                                        }
                                    }}
                                >🗑</button>
                            </div>
                        </div>
                        {tpl.descricao && abertoTpl !== tpl.id && (
                            <p className="mt-0.5 text-xs text-slate-400">{tpl.descricao}</p>
                        )}
                        {abertoTpl === tpl.id && (
                            <div className="mt-2 rounded border border-slate-200 bg-white p-3">
                                <EspacoDescritivo
                                    idPrefix={`cad-${tpl.id}`}
                                    grupos={g.grupos}
                                    produtos={g.produtos}
                                    itens={tpl.itens.map(i => ({
                                        id: i.id, grupo_id: i.grupo_id, produto_id: i.produto_id,
                                        descricao: i.descricao, quantidade: i.quantidade,
                                        formato: i.formato, ordem: i.ordem,
                                    }))}
                                    unidades={unidades}
                                    buscarRemoto={g.buscarSugestoes}
                                    onAdd={async input => {
                                        if (input.produto_id) g.registrarUso(input.produto_id);
                                        await g.addItem({
                                            template_id: tpl.id,
                                            grupo_id: input.grupo_id,
                                            produto_id: input.produto_id,
                                            descricao: input.descricao,
                                            quantidade: input.quantidade,
                                            formato: input.formato,
                                            ordem: input.ordem,
                                        });
                                    }}
                                    onUpdate={g.updateItem}
                                    onDelete={g.deleteItem}
                                />
                            </div>
                        )}
                    </div>
                ))}
                {g.templates.length === 0 && (
                    <p className="py-2 text-sm text-slate-400">Nenhum espaço padrão ainda — crie abaixo.</p>
                )}
            </div>

            <div className="mt-3 flex gap-2">
                <input
                    className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm"
                    placeholder="Incluir espaço padrão (ex.: Camarote)"
                    value={novoNome}
                    onChange={e => setNovoNome(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && novoNome.trim()) {
                            void g.criar(novoNome.trim()).then(() => setNovoNome(''));
                        }
                    }}
                />
                <Button variant="outline" onClick={async () => {
                    if (novoNome.trim()) { await g.criar(novoNome.trim()); setNovoNome(''); }
                }}>+ Incluir espaço</Button>
            </div>
        </Card>
    );
};
