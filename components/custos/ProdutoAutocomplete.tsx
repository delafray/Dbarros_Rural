/**
 * Autocomplete de produto do descritivo — PORT LITERAL do
 * `ProdutoAutocomplete.tsx` do Prosperitas modificado (RF-057: "mesmas
 * configurações"). Mesmos estilos inline, teclado (setas/Enter/Tab/Esc),
 * badge "Nx" de uso, sigla da unidade e riscado de inativo.
 *
 * Única mudança visível (pedida — RF-058): a FONTE das sugestões casa o filtro
 * local com a busca RF-049 (typo/sinônimo/prefixo) via `buscarRemoto`.
 * Cores importadas do tema do Prosperitas (styles/theme.ts de lá).
 */

import React, { useEffect, useRef, useState } from 'react';
import {
    mesclarComBusca,
    sugerirLocal,
    type ProdutoCatalogoLeve,
    type ProdutoSugestao,
} from '../../utils/descritivoSugestoes';

// Paleta do Prosperitas (valores exatos de styles/theme.ts)
export const coresProsperitas = {
    primary: '#1ab394',
    white: '#ffffff',
    textMedium: '#555',
    textDark: '#2f4050',
    textHint: '#ddd',
    borderLight: '#ccc',
    bgSuggestHover: '#f0f7ff',
    bgSuggestActive: '#ddeeff',
    bgInactive: '#fff5f5',
    descritivoHead: '#c8d4e8',
    dangerInativo: '#e03c31',
};
const colors = coresProsperitas;

type Props = {
    id: string;
    /** produtos do grupo da seção, já ordenados por uso (produtosDoGrupo) */
    produtosGrupo: ProdutoCatalogoLeve[];
    /** busca RF-049 — resultados são filtrados ao grupo e lideram a lista */
    buscarRemoto?: (termo: string) => Promise<{ id: string }[]>;
    /** id do campo que recebe o foco após selecionar (o Formato da seção) */
    proximoCampoId: string;
    placeholder?: string;
};

export function ProdutoAutocomplete({ id, produtosGrupo, buscarRemoto, proximoCampoId, placeholder = 'Produto...' }: Props) {
    const [suggest, setSuggest] = useState<{ items: ProdutoSugestao[] } | null>(null);
    const [suggestIdx, setSuggestIdx] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const buscaSeq = useRef(0);

    // Auto-scroll do dropdown (igual ao original)
    useEffect(() => {
        if (suggestIdx >= 0) {
            const el = document.querySelector(`[data-suggest-id="${id}-idx-${suggestIdx}"]`);
            el?.scrollIntoView({ block: 'nearest' });
        }
    }, [suggestIdx, id]);

    const focarProximo = () => {
        (document.getElementById(proximoCampoId) as HTMLInputElement)?.focus();
    };

    const selecionar = (p: ProdutoSugestao) => {
        if (inputRef.current) inputRef.current.value = p.nome;
        setSuggest(null);
        setSuggestIdx(-1);
        focarProximo();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const isOpen = suggest !== null;
        if (isOpen) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSuggestIdx(prev => Math.min(prev + 1, suggest.items.length - 1));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSuggestIdx(prev => Math.max(prev - 1, 0));
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                const idx = suggestIdx >= 0 ? suggestIdx : 0;
                const selected = suggest.items[idx];
                if (selected && selected.ativo !== false) selecionar(selected);
                return;
            }
            if (e.key === 'Escape') {
                setSuggest(null);
                setSuggestIdx(-1);
                return;
            }
        } else {
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                focarProximo();
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        const qt = q.trim();

        if (!qt) {
            setSuggest(null);
            setSuggestIdx(-1);
            return;
        }

        // 1) filtro local imediato — comportamento original
        const locais = sugerirLocal(produtosGrupo, qt);
        setSuggest(locais.length > 0 ? { items: locais } : null);
        setSuggestIdx(-1);

        // 2) busca RF-049 refina quando responde (typo/sinônimo) — RF-058
        if (buscarRemoto && qt.length >= 2) {
            const seq = ++buscaSeq.current;
            buscarRemoto(qt).then(remotos => {
                if (seq !== buscaSeq.current) return;                 // resposta velha
                if (inputRef.current?.value.trim() !== qt) return;    // usuário já digitou mais
                const mesclados = mesclarComBusca(produtosGrupo, locais, remotos);
                setSuggest(mesclados.length > 0 ? { items: mesclados } : null);
            }).catch(() => { /* busca é refinamento: falha silenciosa, local já está na tela */ });
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%', display: 'flex' }}>
            <input
                ref={inputRef}
                id={id}
                type="text"
                className="form-control input-sm"
                placeholder={placeholder}
                autoComplete="off"
                style={{ borderRadius: 20, border: `1px solid ${colors.borderLight}`, width: '100%', fontSize: 12, height: 26, padding: '0 10px', outline: 'none' }}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(() => { setSuggest(null); setSuggestIdx(-1); }, 150)}
            />

            {suggest && (
                <ul style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: colors.white, border: `1px solid ${colors.textHint}`, borderRadius: 6,
                    listStyle: 'none', margin: 0, padding: '4px 0', zIndex: 9999,
                    maxHeight: 220, overflowY: 'auto',
                    boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
                }}>
                    {suggest.items.map((p, idx) => {
                        const inativo = p.ativo === false;
                        return (
                            <li
                                key={p.id}
                                data-suggest-id={`${id}-idx-${idx}`}
                                onMouseDown={inativo ? e => e.preventDefault() : () => selecionar(p)}
                                style={{
                                    padding: '5px 10px', cursor: inativo ? 'not-allowed' : 'pointer', fontSize: 13,
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    background: inativo ? colors.bgInactive : (idx === suggestIdx ? colors.bgSuggestActive : colors.white),
                                    opacity: inativo ? 0.85 : 1,
                                }}
                                onMouseEnter={e => {
                                    if (!inativo) e.currentTarget.style.background = idx === suggestIdx ? colors.bgSuggestActive : colors.bgSuggestHover;
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = inativo ? colors.bgInactive : (idx === suggestIdx ? colors.bgSuggestActive : colors.white);
                                }}
                            >
                                {p.uso > 0 && (
                                    <span style={{ fontSize: '70%', color: inativo ? colors.dangerInativo : colors.primary, fontWeight: 700, minWidth: 34, textAlign: 'right', flexShrink: 0 }}>
                                        {p.uso}x
                                    </span>
                                )}
                                {p.sigla && (
                                    <span style={{ fontSize: 13, color: colors.dangerInativo, fontWeight: 600, flexShrink: 0 }}>
                                        {p.sigla}
                                    </span>
                                )}
                                <span style={{ color: inativo ? colors.dangerInativo : undefined, textDecoration: inativo ? 'line-through' : undefined }}>
                                    {p.nome}
                                </span>
                                {inativo && (
                                    <span style={{ fontSize: '75%', color: colors.dangerInativo, fontWeight: 700, marginLeft: 4, flexShrink: 0 }}>
                                        (inativo)
                                    </span>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
