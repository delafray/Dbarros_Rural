/**
 * Lógica PURA das sugestões do autocomplete de produto na tela de descritivo
 * (RF-057/058) — extraída para teste (RNF-014).
 *
 * Comportamento do Prosperitas modificado (referência literal): produtos do
 * grupo da seção, ordenados por frequência de uso; ao digitar, filtro por
 * substring, até 12 sugestões. Aqui, "casado com nossa probabilidade"
 * (RF-058): quando a busca RF-049 (typo/sinônimo/prefixo) responde, o
 * resultado dela LIDERA a lista — filtrado ao grupo — e o filtro local
 * completa o que faltar.
 */

export interface ProdutoCatalogoLeve {
    id: string;
    nome: string;
    unidade: string;
    grupo_id: string | null;
    frequencia_uso: number;
    ativo: boolean;
}

/** Sugestão no formato que a UI do Prosperitas exibe (badge "Nx" + sigla). */
export interface ProdutoSugestao {
    id: string;
    nome: string;
    uso: number;
    sigla: string | null;
    ativo: boolean;
}

export const MAX_SUGESTOES = 12;

/**
 * Normalização espelhando o `custos_unaccent(lower(...))` do banco (RF-049):
 * minúsculas + sem acento — "elétrica" casa com "eletrica" também no filtro
 * local (nada de LIKE sensível a acento em nenhuma fase do módulo).
 */
export function normalizarTexto(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function paraSugestao(p: ProdutoCatalogoLeve): ProdutoSugestao {
    return {
        id: p.id,
        nome: p.nome,
        uso: p.frequencia_uso,
        sigla: p.unidade || null,
        ativo: p.ativo,
    };
}

/** Produtos da seção, mais usados primeiro (linha 65-67 do componente original). */
export function produtosDoGrupo(
    produtos: ProdutoCatalogoLeve[],
    grupoId: string,
): ProdutoCatalogoLeve[] {
    return produtos
        .filter(p => p.grupo_id === grupoId)
        .sort((a, b) => b.frequencia_uso - a.frequencia_uso);
}

/** Filtro local por substring, idêntico ao handleChange original. */
export function sugerirLocal(
    produtosGrupo: ProdutoCatalogoLeve[],
    query: string,
    max = MAX_SUGESTOES,
): ProdutoSugestao[] {
    const qt = normalizarTexto(query.trim());
    if (!qt) return [];
    return produtosGrupo
        .filter(p => normalizarTexto(p.nome).includes(qt))
        .slice(0, max)
        .map(paraSugestao);
}

/**
 * Mescla o resultado da busca RF-049 (já ranqueada por relevância ×
 * popularidade) com o filtro local: busca lidera, local completa, sem
 * duplicar, respeitando o grupo da seção e o teto de sugestões.
 */
export function mesclarComBusca(
    produtosGrupo: ProdutoCatalogoLeve[],
    locais: ProdutoSugestao[],
    busca: { id: string }[],
    max = MAX_SUGESTOES,
): ProdutoSugestao[] {
    const doGrupo = new Map(produtosGrupo.map(p => [p.id, p]));
    const resultado: ProdutoSugestao[] = [];
    const vistos = new Set<string>();
    for (const b of busca) {
        const p = doGrupo.get(b.id);
        if (p && !vistos.has(p.id)) {
            vistos.add(p.id);
            resultado.push(paraSugestao(p));
            if (resultado.length >= max) return resultado;
        }
    }
    for (const l of locais) {
        if (!vistos.has(l.id)) {
            vistos.add(l.id);
            resultado.push(l);
            if (resultado.length >= max) break;
        }
    }
    return resultado;
}

/**
 * Resolve o produto digitado/selecionado no momento do "+" (o doAddItem
 * original resolve por nome dentro do grupo).
 */
export function resolverProdutoPorNome(
    produtosGrupo: ProdutoCatalogoLeve[],
    nome: string,
): ProdutoCatalogoLeve | null {
    const alvo = normalizarTexto(nome.trim());
    if (!alvo) return null;
    return produtosGrupo.find(p => normalizarTexto(p.nome.trim()) === alvo) ?? null;
}

/** Quantidade da linha de inclusão: aceita vírgula; inválida/zero → null. */
export function parseQuantidade(valor: string): number | null {
    const n = Number(valor.replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : null;
}
