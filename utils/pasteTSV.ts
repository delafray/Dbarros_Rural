/**
 * Colar do Excel → linhas da grade (RF-012/047, rel. 09) — puro, sem DOM.
 * Papa Parse com delimitador TAB resolve a armadilha clássica: quebra de linha
 * DENTRO de célula vem entre aspas no TSV e um split('\n') ingênuo quebraria
 * (a cicatriz do URGENTE-COLAR-TABELA-IA). Números em formato BR via parseBR.
 *
 * Heurística de mapeamento moldada nas PLANILHAS REAIS do usuário (Perdizes/
 * Cláudio): cabeçalho com ITENS|QTDE|QTDE|DISCRICAO|VALOR UNIT|..., linhas de
 * seção/subtotal ignoradas, duas colunas de quantidade = qtd × fator (RF-053).
 *
 * Testado em utils/pasteTSV.test.ts.
 */

import Papa from 'papaparse';
import { parseNumeroBR } from './parseBR';

export interface LinhaColada {
    descricao: string;
    quantidade: number;
    fator: number;
    precoUnitario: number | null;
    formato: string | null;
}

export interface ResultadoPaste {
    linhas: LinhaColada[];
    ignoradas: number;      // seções, subtotais, vazias
    avisos: string[];
}

/** TSV bruto → matriz de células (aspas e newline-em-célula tratados). */
export function parseTSV(texto: string): string[][] {
    if (!texto || !texto.trim()) return [];
    const r = Papa.parse<string[]>(texto.replace(/\r\n/g, '\n'), {
        delimiter: '\t',
        skipEmptyLines: true,
    });
    return (r.data as string[][]).map(row => row.map(c => (c ?? '').trim()));
}

interface MapaColunas {
    descricao: number;
    quantidade: number | null;
    fator: number | null;
    precoUnitario: number | null;
    formato: number | null;
    temCabecalho: boolean;
}

const CABECALHOS = {
    descricao: /^(itens?|descri|produto|servi)/i,
    quantidade: /^(qtde?|quant)/i,
    preco: /valor\s*unit|preco|pre.o\s*unit|unit/i,
    formato: /discri|formato|especifica|detalhe/i,
    ignorar: /valor\s*total|total|participa|observa|obs\.?$/i,
};

/**
 * Detecta o mapa de colunas pelo cabeçalho; sem cabeçalho reconhecível, usa
 * o posicional simples: descrição | qtd | preço.
 */
export function detectarColunas(matriz: string[][]): MapaColunas {
    for (const row of matriz.slice(0, 5)) {
        const idxDesc = row.findIndex(c => CABECALHOS.descricao.test(c));
        const idxQtds = row
            .map((c, i) => (CABECALHOS.quantidade.test(c) ? i : -1))
            .filter(i => i >= 0);
        if (idxDesc >= 0 && idxQtds.length > 0) {
            const idxPreco = row.findIndex(c => CABECALHOS.preco.test(c) && !/total/i.test(c));
            const idxFormato = row.findIndex((c, i) => i !== idxDesc && CABECALHOS.formato.test(c));
            return {
                descricao: idxDesc,
                quantidade: idxQtds[0],
                fator: idxQtds[1] ?? null,          // 2ª QTDE = fator (RF-053)
                precoUnitario: idxPreco >= 0 ? idxPreco : null,
                formato: idxFormato >= 0 ? idxFormato : null,
                temCabecalho: true,
            };
        }
    }
    return { descricao: 0, quantidade: 1, fator: null, precoUnitario: 2, formato: null, temCabecalho: false };
}

/** Linha de seção/subtotal: célula repetida em todas as colunas ou palavra-chave. */
export function ehLinhaDeSecao(row: string[]): boolean {
    const preenchidas = row.filter(c => c !== '');
    if (preenchidas.length === 0) return true;
    if (/^(subtotal|custo total|total\b)/i.test(preenchidas[0])) return true;
    // Célula mesclada exportada: mesmo texto repetido em ≥3 colunas
    if (preenchidas.length >= 3 && preenchidas.every(c => c === preenchidas[0])) return true;
    return false;
}

/**
 * Pipeline completo: texto colado → linhas prontas para a grade.
 * Nunca lança para conteúdo sujo — linhas irreconhecíveis viram `ignoradas`.
 */
export function processarPaste(texto: string): ResultadoPaste {
    const matriz = parseTSV(texto);
    if (matriz.length === 0) return { linhas: [], ignoradas: 0, avisos: ['Nada reconhecível para colar'] };

    const mapa = detectarColunas(matriz);
    const linhas: LinhaColada[] = [];
    const avisos: string[] = [];
    let ignoradas = 0;

    for (const [i, row] of matriz.entries()) {
        if (mapa.temCabecalho && i <= matriz.findIndex(r => r.some(c => CABECALHOS.descricao.test(c)))) {
            continue; // título + cabeçalho
        }
        if (ehLinhaDeSecao(row)) { ignoradas++; continue; }

        // Nas planilhas reais a 1ª coluna é o número do item e a descrição vem depois;
        // se a célula da descrição for numérica pura, procura a próxima com texto.
        let desc = row[mapa.descricao] ?? '';
        if (/^\d+$/.test(desc)) {
            const alt = row.slice(mapa.descricao + 1).find(c => c !== '' && !/^[\d.,]+$/.test(c));
            if (alt) desc = alt;
        }
        if (!desc || /^[\d.,]+$/.test(desc)) { ignoradas++; continue; }

        const qtd = mapa.quantidade !== null ? parseNumeroBR(row[mapa.quantidade]) : null;
        const fator = mapa.fator !== null ? parseNumeroBR(row[mapa.fator]) : null;
        const preco = mapa.precoUnitario !== null ? parseNumeroBR(row[mapa.precoUnitario]) : null;
        const formato = mapa.formato !== null ? (row[mapa.formato] || null) : null;

        linhas.push({
            descricao: desc,
            quantidade: qtd && qtd > 0 ? qtd : 1,
            fator: fator && fator > 0 ? fator : 1,
            precoUnitario: preco !== null && preco >= 0 ? preco : null,
            formato,
        });
    }

    if (linhas.length === 0) avisos.push('Nenhuma linha de item reconhecida');
    if (!mapa.temCabecalho && linhas.length > 0) {
        avisos.push('Sem cabeçalho: assumi descrição | quantidade | valor unitário — confira no preview');
    }
    return { linhas, ignoradas, avisos };
}
