/**
 * Descritivo de ESPAÇO por seções de grupo — PORT LITERAL do
 * `ProjetoDescritivoTab.tsx` do Prosperitas modificado (RF-057: "ao clicar em
 * incluir espaço, deixar igual — mesmas configurações").
 *
 * Igual ao original: seções por grupo; linha "Incluir Item" com
 * Quant. → Produto (autocomplete) → Formato → ➕ e o loop de teclado completo
 * (Enter caminha, adiciona e devolve o foco ao Quant.); grade
 * Qtd | Uni | Item | Formato/Observação com salvar por linha (amarela quando
 * dirty) e lixeira com confirmação; seção final "Itens Não Cadastrados".
 * Adaptações invisíveis: dados via callbacks (services), ícones SVG no lugar
 * do FontAwesome (lib não existe neste app), aviso inline no lugar do toast.
 * Genérico sobre a origem dos itens (template da biblioteca OU espaço
 * exclusivo do evento) — o pai fornece itens + callbacks.
 */

import React, { useRef, useState } from 'react';
import type { CustoProdutoGrupo } from '../../types/custos';
import {
    parseQuantidade,
    produtosDoGrupo,
    resolverProdutoPorNome,
    type ProdutoCatalogoLeve,
} from '../../utils/descritivoSugestoes';
import { coresProsperitas as colors, ProdutoAutocomplete } from './ProdutoAutocomplete';

export interface DescritivoItemVM {
    id: string;
    grupo_id: string | null;
    produto_id: string | null;
    descricao: string;
    quantidade: number;
    formato: string | null;
    ordem: number;
}

export interface DescritivoAddInput {
    grupo_id: string | null;
    produto_id: string | null;
    descricao: string;
    quantidade: number;
    formato: string | null;
    unidade: string | null;
    ordem: number;
}

type Props = {
    /** prefixo de ids DOM — permite vários descritivos na mesma página */
    idPrefix: string;
    grupos: CustoProdutoGrupo[];
    produtos: ProdutoCatalogoLeve[];
    itens: DescritivoItemVM[];
    unidades: string[];            // siglas p/ o select de Itens Não Cadastrados
    buscarRemoto?: (termo: string) => Promise<{ id: string }[]>;
    onAdd: (input: DescritivoAddInput) => Promise<void>;
    onUpdate: (id: string, patch: { quantidade?: number; formato?: string | null }) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
};

// Ícones nos tamanhos dos `fa fa-*` originais (12px)
const IconPlus = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
);
const IconSave = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><path d="M17 21v-8H7v8M7 3v5h8" /></svg>
);
const IconTrash = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
);

export function EspacoDescritivo({
    idPrefix, grupos, produtos, itens, unidades, buscarRemoto, onAdd, onUpdate, onDelete,
}: Props) {
    const addingRef = useRef(false);
    // Edição local das linhas (o original mutava o array do pai)
    const [edits, setEdits] = useState<Record<string, { quantidade?: string; formato?: string }>>({});
    const [aviso, setAviso] = useState<{ chave: string; msg: string } | null>(null);

    const avisar = (chave: string, msg: string) => {
        setAviso({ chave, msg });
        setTimeout(() => setAviso(a => (a?.chave === chave && a?.msg === msg ? null : a)), 3500);
    };

    const dirty = (it: DescritivoItemVM) => {
        const e = edits[it.id];
        if (!e) return false;
        const qtdMudou = e.quantidade !== undefined && parseQuantidade(e.quantidade) !== it.quantidade;
        const fmtMudou = e.formato !== undefined && (e.formato || null) !== (it.formato ?? null);
        return qtdMudou || fmtMudou;
    };

    const unidadeDoItem = (it: DescritivoItemVM): string => {
        if (!it.produto_id) return ' ';
        return produtos.find(p => p.id === it.produto_id)?.unidade ?? ' ';
    };

    const salvarLinha = async (it: DescritivoItemVM) => {
        const e = edits[it.id];
        if (!e) return;
        const patch: { quantidade?: number; formato?: string | null } = {};
        if (e.quantidade !== undefined) {
            const q = parseQuantidade(e.quantidade);
            if (q === null) { avisar(it.id, 'Quantidade inválida'); return; }
            patch.quantidade = q;
        }
        if (e.formato !== undefined) patch.formato = e.formato || null;
        try {
            await onUpdate(it.id, patch);
            setEdits(m => { const { [it.id]: _, ...resto } = m; return resto; });
        } catch {
            avisar(it.id, 'Erro ao salvar item!');
        }
    };

    const apagarLinha = async (it: DescritivoItemVM) => {
        if (!window.confirm('Tem certeza que deseja apagar este item permanentemente do banco de dados?')) return;
        try { await onDelete(it.id); } catch { avisar(it.id, 'Erro ao excluir no banco!'); }
    };

    const doAddItem = async (grupo: CustoProdutoGrupo, grupoProdutos: ProdutoCatalogoLeve[]) => {
        if (addingRef.current) return;
        addingRef.current = true;
        const gKey = `${idPrefix}-${grupo.id}`;
        const qtdEl = document.getElementById(`add-qtd-${gKey}`) as HTMLInputElement;
        const descEl = document.getElementById(`add-desc-${gKey}`) as HTMLInputElement;
        const formatoEl = document.getElementById(`add-formato-${gKey}`) as HTMLInputElement;
        const qtd = parseQuantidade(qtdEl?.value ?? '');
        const desc = descEl?.value?.trim();
        if (!desc || qtd === null) {
            avisar(gKey, "Preencha os campos 'Quantidade' e 'Produto'!");
            addingRef.current = false;
            return;
        }
        const formato = formatoEl?.value?.trim();
        const prod = resolverProdutoPorNome(grupoProdutos, desc);
        const doGrupo = itens.filter(i => i.grupo_id === grupo.id);
        try {
            await onAdd({
                grupo_id: grupo.id,
                produto_id: prod?.id ?? null,
                descricao: desc,
                quantidade: qtd,
                formato: formato || null,
                unidade: prod?.unidade ?? null,
                ordem: (doGrupo[doGrupo.length - 1]?.ordem ?? 0) + 10,
            });
            // limpa e devolve o foco ao Quant. (comportamento original)
            qtdEl.value = ''; descEl.value = ''; formatoEl.value = '';
            qtdEl.focus();
        } catch {
            avisar(gKey, 'Erro ao adicionar no banco!');
        }
        addingRef.current = false;
    };

    const inputStyle: React.CSSProperties = {
        fontSize: 12, height: 26, padding: '0 6px', borderRadius: 20,
        border: `1px solid ${colors.borderLight}`, outline: 'none', width: '100%',
    };

    const semGrupo = itens.filter(i => i.grupo_id === null);

    return (
        <div>
            {grupos.map(grupo => {
                const gKey = `${idPrefix}-${grupo.id}`;
                const grupoProdutos = produtosDoGrupo(produtos, grupo.id);
                const grpItens = itens.filter(i => i.grupo_id === grupo.id)
                    .sort((a, b) => a.ordem - b.ordem);

                const handleQtdKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
                    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ',', '.'];
                    const isNumber = /^[0-9]$/.test(e.key);
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        if ((e.target as HTMLInputElement).value.trim()) {
                            (document.getElementById(`add-desc-${gKey}`) as HTMLInputElement)?.focus();
                        }
                        return;
                    }
                    if (!isNumber && !allowedKeys.includes(e.key)) e.preventDefault();
                };

                return (
                    <div key={grupo.id} style={{ marginBottom: 12 }}>
                        <h3 style={{ fontSize: 13, fontWeight: 700, color: colors.textDark, marginBottom: 4, marginTop: 24, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{grupo.nome}</h3>

                        {/* Linha de inclusão de item */}
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', paddingBottom: 4, paddingTop: 2 }}>
                            <div style={{ flexShrink: 0 }}>
                                <label style={{ fontWeight: 700, fontSize: 11, color: colors.textMedium, whiteSpace: 'nowrap' }}>Incluir Item</label>
                            </div>
                            <div style={{ width: 70 }}>
                                <input
                                    id={`add-qtd-${gKey}`}
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Quant."
                                    autoComplete="off"
                                    style={{ ...inputStyle, textAlign: 'left' }}
                                    onKeyDown={handleQtdKeyDown}
                                />
                            </div>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <ProdutoAutocomplete
                                    id={`add-desc-${gKey}`}
                                    produtosGrupo={grupoProdutos}
                                    buscarRemoto={buscarRemoto}
                                    proximoCampoId={`add-formato-${gKey}`}
                                />
                            </div>
                            <div style={{ width: '26%' }}>
                                <input
                                    id={`add-formato-${gKey}`}
                                    type="text"
                                    placeholder="Formato..."
                                    style={inputStyle}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' || e.key === 'Tab') {
                                            e.preventDefault();
                                            (document.getElementById(`add-btn-${gKey}`) as HTMLButtonElement)?.focus();
                                        }
                                    }}
                                />
                            </div>
                            <div style={{ flexShrink: 0 }}>
                                <button
                                    id={`add-btn-${gKey}`}
                                    type="button"
                                    title="Adicionar"
                                    onClick={() => void doAddItem(grupo, grupoProdutos)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void doAddItem(grupo, grupoProdutos); } }}
                                    style={{ borderRadius: 4, width: 26, height: 26, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.primary, border: `1px solid ${colors.primary}`, color: 'white', cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s' }}
                                    onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,179,148,0.5)'; e.currentTarget.style.transform = 'scale(1.12)'; }}
                                    onBlur={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'scale(1)'; }}
                                >
                                    <IconPlus />
                                </button>
                            </div>
                        </div>
                        {aviso?.chave === gKey && (
                            <div style={{ fontSize: 12, color: colors.dangerInativo, paddingBottom: 4 }}>{aviso.msg}</div>
                        )}

                        {/* Tabela de itens */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0, border: '1px solid #e7eaec' }}>
                            <thead>
                                <tr style={{ background: colors.descritivoHead }}>
                                    <th style={{ width: '7%', color: colors.textDark, fontWeight: 700, fontSize: 11, padding: '3px 6px', textAlign: 'center' }}>Qtd.</th>
                                    <th style={{ width: '4%', color: colors.textDark, fontWeight: 700, fontSize: 11, padding: '3px 6px', textAlign: 'center' }}>Uni.</th>
                                    <th style={{ color: colors.textDark, fontWeight: 700, fontSize: 11, padding: '3px 6px', textAlign: 'center' }}>Item</th>
                                    <th style={{ width: '28%', color: colors.textDark, fontWeight: 700, fontSize: 11, padding: '3px 6px', textAlign: 'center' }}>Formato / Observação</th>
                                    <th style={{ width: '3%', padding: '3px 2px' }} />
                                    <th style={{ width: '3%', padding: '3px 2px' }} />
                                </tr>
                            </thead>
                            <tbody>
                                {grpItens.map((item, rowIdx) => {
                                    const e = edits[item.id];
                                    const isDirty = dirty(item);
                                    return (
                                        <tr key={item.id} style={{ lineHeight: 1, background: rowIdx % 2 === 0 ? 'white' : '#f8f8f8', borderTop: '1px solid #e7eaec' }}>
                                            <td style={{ padding: '1px 4px' }}>
                                                <input
                                                    id={`row-qtd-${idPrefix}-${item.id}`}
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={e?.quantidade ?? String(item.quantidade)}
                                                    onChange={ev => {
                                                        const v = ev.target.value.replace(/[^0-9.,]/g, '');
                                                        setEdits(m => ({ ...m, [item.id]: { ...m[item.id], quantidade: v } }));
                                                    }}
                                                    onKeyDown={ev => { if (ev.key === 'Enter') { ev.preventDefault(); (document.getElementById(`row-fmt-${idPrefix}-${item.id}`) as HTMLInputElement)?.focus(); } }}
                                                    style={{ textAlign: 'left', fontSize: 13, height: 24, padding: '0 4px', border: 'none', background: 'transparent', outline: 'none', width: '100%' }}
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td style={{ padding: '1px 4px', verticalAlign: 'middle', fontSize: 12 }}>
                                                {unidadeDoItem(item)}
                                            </td>
                                            <td style={{ padding: '1px 4px', verticalAlign: 'middle', fontSize: 13 }}>
                                                {item.descricao || ' '}
                                            </td>
                                            <td style={{ padding: '1px 4px' }}>
                                                <input
                                                    id={`row-fmt-${idPrefix}-${item.id}`}
                                                    value={e?.formato ?? (item.formato && item.formato !== 'false' ? String(item.formato) : '')}
                                                    onChange={ev => setEdits(m => ({ ...m, [item.id]: { ...m[item.id], formato: ev.target.value } }))}
                                                    onKeyDown={ev => { if (ev.key === 'Enter') { ev.preventDefault(); (document.getElementById(`row-save-${idPrefix}-${item.id}`) as HTMLButtonElement)?.focus(); } }}
                                                    placeholder="Formato..."
                                                    style={{ fontSize: 13, height: 24, padding: '0 4px', border: 'none', background: 'transparent', outline: 'none', width: '100%' }}
                                                />
                                            </td>
                                            <td style={{ padding: '3px 6px', textAlign: 'center' }}>
                                                <button
                                                    id={`row-save-${idPrefix}-${item.id}`}
                                                    type="button"
                                                    disabled={!isDirty}
                                                    title={isDirty ? 'Salvar Alteração no Banco' : 'Item já está salvo'}
                                                    onClick={() => void salvarLinha(item)}
                                                    onKeyDown={ev => {
                                                        if (ev.key === 'Enter') {
                                                            ev.preventDefault();
                                                            void salvarLinha(item).then(() =>
                                                                setTimeout(() => (document.getElementById(`add-qtd-${gKey}`) as HTMLInputElement)?.focus(), 100));
                                                        }
                                                    }}
                                                    style={{
                                                        width: 24, height: 22, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                        borderRadius: 3, cursor: isDirty ? 'pointer' : 'default',
                                                        background: isDirty ? '#f8ac59' : colors.primary,
                                                        border: `1px solid ${isDirty ? '#f8ac59' : colors.primary}`,
                                                        color: 'white', opacity: isDirty ? 1 : 0.65,
                                                    }}
                                                >
                                                    <IconSave />
                                                </button>
                                            </td>
                                            <td style={{ padding: '1px 2px', textAlign: 'center' }}>
                                                <button
                                                    type="button"
                                                    tabIndex={-1}
                                                    title="Apagar permanentemente"
                                                    onClick={() => void apagarLinha(item)}
                                                    style={{ width: 24, height: 22, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, cursor: 'pointer', background: 'transparent', border: `1px solid ${colors.dangerInativo}`, color: colors.dangerInativo }}
                                                >
                                                    <IconTrash />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {aviso && grpItens.some(i => i.id === aviso.chave) && (
                                    <tr><td colSpan={6} style={{ fontSize: 12, color: colors.dangerInativo, padding: '2px 6px' }}>{aviso.msg}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                );
            })}

            {/* ── ITENS NÃO CADASTRADOS ── */}
            <div style={{ marginTop: 28, borderTop: '2px solid #e7eaec', paddingTop: 12 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: colors.textDark, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Itens Não Cadastrados
                </h3>

                <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 4 }}>
                    <label style={{ fontWeight: 700, fontSize: 11, color: colors.textMedium, whiteSpace: 'nowrap' }}>Incluir Item</label>
                    <div style={{ width: 70 }}>
                        <input id={`nc-qtd-${idPrefix}`} type="text" inputMode="numeric" placeholder="Qtd." autoComplete="off"
                            style={inputStyle}
                            onChange={e => { e.target.value = e.target.value.replace(/[^0-9.,]/g, ''); }}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (document.getElementById(`nc-uni-${idPrefix}`) as HTMLSelectElement)?.focus(); } }}
                        />
                    </div>
                    <div style={{ width: 110 }}>
                        <select id={`nc-uni-${idPrefix}`} defaultValue=""
                            style={{ ...inputStyle, padding: '0 4px' }}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (document.getElementById(`nc-grupo-${idPrefix}`) as HTMLSelectElement)?.focus(); } }}
                        >
                            <option value="">Uni.</option>
                            {unidades.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                    <div style={{ width: 160 }}>
                        <select id={`nc-grupo-${idPrefix}`} defaultValue={grupos[grupos.length - 1]?.id ?? ''}
                            style={{ ...inputStyle, padding: '0 4px' }}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (document.getElementById(`nc-desc-${idPrefix}`) as HTMLInputElement)?.focus(); } }}
                        >
                            {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                        </select>
                    </div>
                </div>

                {/* Linha 2: Descrição + Formato + botão */}
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', paddingBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                        <input id={`nc-desc-${idPrefix}`} type="text" placeholder="Descrição..." autoComplete="off"
                            style={inputStyle}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (document.getElementById(`nc-formato-${idPrefix}`) as HTMLInputElement)?.focus(); } }}
                        />
                    </div>
                    <div style={{ width: '30%' }}>
                        <input id={`nc-formato-${idPrefix}`} type="text" placeholder="Formato..."
                            style={inputStyle}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (document.getElementById(`nc-btn-${idPrefix}`) as HTMLButtonElement)?.click(); } }}
                        />
                    </div>
                    <div style={{ flexShrink: 0 }}>
                        <button id={`nc-btn-${idPrefix}`} type="button" title="Adicionar item não cadastrado"
                            style={{ borderRadius: 4, width: 26, height: 26, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.primary, border: `1px solid ${colors.primary}`, color: 'white', cursor: 'pointer' }}
                            onClick={async () => {
                                if (addingRef.current) return;
                                addingRef.current = true;
                                const qtdEl = document.getElementById(`nc-qtd-${idPrefix}`) as HTMLInputElement;
                                const uniEl = document.getElementById(`nc-uni-${idPrefix}`) as HTMLSelectElement;
                                const grupoEl = document.getElementById(`nc-grupo-${idPrefix}`) as HTMLSelectElement;
                                const descEl = document.getElementById(`nc-desc-${idPrefix}`) as HTMLInputElement;
                                const fmtEl = document.getElementById(`nc-formato-${idPrefix}`) as HTMLInputElement;

                                const qtd = parseQuantidade(qtdEl?.value ?? '');
                                const desc = descEl?.value?.trim();
                                const grupoId = grupoEl?.value || null;
                                const fmt = fmtEl?.value?.trim() || '';
                                const uni = uniEl?.value || null;

                                const ncKey = `nc-${idPrefix}`;
                                if (!desc || qtd === null) { avisar(ncKey, 'Preencha Quantidade e Descrição!'); addingRef.current = false; return; }
                                if (!uni) { avisar(ncKey, 'Selecione a Unidade!'); addingRef.current = false; return; }
                                if (!grupoId) { avisar(ncKey, 'Selecione o Grupo!'); addingRef.current = false; return; }

                                const doGrupo = itens.filter(i => i.grupo_id === grupoId);
                                try {
                                    await onAdd({
                                        grupo_id: grupoId,
                                        produto_id: null,
                                        descricao: desc,
                                        quantidade: qtd,
                                        formato: fmt || null,
                                        unidade: uni,
                                        ordem: (doGrupo[doGrupo.length - 1]?.ordem ?? 0) + 10,
                                    });
                                    qtdEl.value = ''; descEl.value = ''; fmtEl.value = '';
                                    qtdEl.focus();
                                } catch {
                                    avisar(ncKey, 'Erro ao adicionar!');
                                }
                                addingRef.current = false;
                            }}
                        >
                            <IconPlus />
                        </button>
                    </div>
                </div>
                {aviso?.chave === `nc-${idPrefix}` && (
                    <div style={{ fontSize: 12, color: colors.dangerInativo, paddingBottom: 4 }}>{aviso.msg}</div>
                )}
                {semGrupo.length > 0 && (
                    <p style={{ fontSize: 11, color: colors.textMedium }}>
                        {semGrupo.length} item(ns) sem grupo definido — aparecem na grade do evento, não nas seções acima.
                    </p>
                )}
            </div>
        </div>
    );
}
