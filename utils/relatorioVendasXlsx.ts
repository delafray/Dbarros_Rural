/**
 * Exportação da planilha de vendas para Excel — mesmo layout do PDF do dashboard
 * (hooks/useDashboardExportPDF.ts), mas com os CÁLCULOS VIVOS em fórmulas:
 *
 *   OPCIONAIS = SUMPRODUCT(marcas "x" da linha × linha de preços dos opcionais)
 *   SUBTOTAL  = PREÇO BASE + OPCIONAIS
 *   TOTAL     = SUBTOTAL − DESCONTO
 *   Resumo    = COUNTIF/COUNTIFS sobre as colunas de marcas + SUM dos totais
 *
 * Toda fórmula leva junto o `result` calculado aqui (utils/planilhaCalc.ts) para
 * o arquivo abrir com números mesmo em visualizadores que não recalculam
 * (prévia do WhatsApp, celular). No Excel/LibreOffice, mexeu no preço base, no
 * desconto ou na linha de preços dos opcionais → tudo recalcula.
 *
 * Módulo PURO (entra dado, sai buffer) — testado em utils/relatorioVendasXlsx.test.ts.
 */

import ExcelJS from 'exceljs';
import {
    calculateRowTotals,
    getCategoriaOfStandNr,
    getPrecoForCombo,
    CategoriaCalc,
    EstandeCalc,
    OpcionalCalc,
    TotaisRow,
} from './planilhaCalc';
import { addMonetario, roundCentavos } from './money';

// ─── Tipos de entrada (subset estrutural dos tipos reais, sem Supabase) ─────

export interface CategoriaRelatorio extends CategoriaCalc {
    comboNames?: string[];
    ordem?: number;
    is_stand?: boolean;
}

export interface EstandeRelatorio extends EstandeCalc {
    cliente_id?: string | null;
    cliente_nome_livre?: string | null;
}

export interface ClienteRelatorio {
    id: string;
    nome_fantasia?: string | null;
    razao_social?: string | null;
}

export interface ParamsRelatorioVendas {
    titulo: string;
    categorias: CategoriaRelatorio[];
    estandes: EstandeRelatorio[];
    opcionaisAtivos: OpcionalCalc[];
    precosEdicao: Record<string, number>;
    clientes: ClienteRelatorio[];
    geradoEm?: Date;
}

// ─── Dados organizados (espelho do que o PDF monta) ──────────────────────────

export interface LinhaRelatorio {
    row: EstandeRelatorio;
    cat: CategoriaRelatorio | undefined;
    catIndex: number;               // índice da categoria (paleta de cor)
    isStand: boolean;
    isAvail: boolean;
    clienteNome: string;
    comboBase: string;              // tipo_venda sem o "*"
    isStar: boolean;                // cortesia/permuta
    totais: TotaisRow;
    /** Preço do STAND PADRÃO da categoria desta linha (0 se não vendido, cortesia ou não-stand). */
    baseStand: number;
    /** Parte "stand" do preço base: min(preço base, stand padrão) — só em stands. */
    valorStand: number;
    /** Parte "merchandising" do combo: preço base − stand padrão — só em stands. */
    merchCombo: number;
    /** Preço desta linha para cada tipo de venda (índice de comboLabels), ignorando cortesia. */
    precosCombo: number[];
}

/** Abertura do faturamento em stand × merchandising (aba Resumo). */
export interface AberturaVendas {
    valorStand: number;         // Σ parte "stand padrão" das vendas de stand
    merchCombos: number;        // Σ (combo − stand padrão) das vendas de stand
    merchAvulso: number;        // Σ preço base das linhas não-stand (merchandising avulso)
    opcionais: number;          // Σ opcionais marcados com "x"
    descontos: number;          // Σ descontos (positivo; entra subtraindo)
    comboValores: Record<string, number>;   // Σ preço base por tipo de venda (stands)
    starCount: number;          // cortesias/permutas (stands)
    merchAvulsoCount: number;   // linhas não-stand vendidas
    optValores: Record<string, number>;     // Σ valor por opcional ("x" × preço)
}

export interface DadosRelatorioVendas {
    comboLabels: string[];                     // 'STAND PADRÃO', 'COMBO 01', ...
    comboDisplay: Record<string, string>;      // rótulo exibido (nomes customizados)
    linhas: LinhaRelatorio[];                  // já filtradas e ordenadas
    totalStands: number;
    vendasCount: number;
    comboXCounts: Record<string, number>;
    optCounts: Record<string, number>;
    totals: { subTotal: number; desconto: number; totalVenda: number };
    abertura: AberturaVendas;
}

/** Preço de um opcional nesta edição (preço da edição, senão o preço-base). */
export function precoOpcional(opt: OpcionalCalc, precosEdicao: Record<string, number>): number {
    return precosEdicao[opt.id] !== undefined ? Number(precosEdicao[opt.id]) : Number(opt.preco_base);
}

/**
 * Organiza estandes exatamente como o PDF: ordena por categoria/número, monta os
 * rótulos de combo, calcula totais e contagens, e omite linhas não-stand
 * (merchandising etc.) que estejam totalmente em branco.
 */
export function montarDadosRelatorioVendas(p: ParamsRelatorioVendas): DadosRelatorioVendas {
    const { categorias, opcionaisAtivos, precosEdicao, clientes } = p;
    const getCategoria = (nr: string) => getCategoriaOfStandNr(nr, categorias) as CategoriaRelatorio | undefined;

    const sorted = [...p.estandes].sort((a, b) => {
        const catA = getCategoria(a.stand_nr);
        const catB = getCategoria(b.stand_nr);
        const ordA = catA?.ordem ?? 0, ordB = catB?.ordem ?? 0;
        if (ordA !== ordB) return ordA - ordB;
        if (catA && catB) {
            const iA = categorias.indexOf(catA);
            const iB = categorias.indexOf(catB);
            if (iA !== iB) return iA - iB;
        }
        return a.stand_nr.localeCompare(b.stand_nr, undefined, { numeric: true, sensitivity: 'base' });
    });

    let maxCombos = 0;
    categorias.forEach(c => { const l = Array.isArray(c.combos) ? c.combos.length : 0; if (l > maxCombos) maxCombos = l; });
    const comboLabels: string[] = ['STAND PADRÃO'];
    for (let i = 1; i <= maxCombos; i++) comboLabels.push('COMBO ' + String(i).padStart(2, '0'));
    const customNames = categorias[0]?.comboNames || [];
    const comboDisplay: Record<string, string> = { 'STAND PADRÃO': 'STAND PADRÃO' };
    for (let i = 1; i <= maxCombos; i++) {
        const key = 'COMBO ' + String(i).padStart(2, '0');
        comboDisplay[key] = customNames[i - 1] || key;
    }

    const totals = { subTotal: 0, desconto: 0, totalVenda: 0 };
    const comboXCounts: Record<string, number> = {};
    const optCounts: Record<string, number> = {};
    comboLabels.forEach(l => { comboXCounts[l] = 0; });
    opcionaisAtivos.forEach(o => { optCounts[o.nome] = 0; });
    let totalStands = 0;
    let vendasCount = 0;
    const abertura: AberturaVendas = {
        valorStand: 0, merchCombos: 0, merchAvulso: 0, opcionais: 0, descontos: 0,
        comboValores: {}, starCount: 0, merchAvulsoCount: 0, optValores: {},
    };
    comboLabels.forEach(l => { abertura.comboValores[l] = 0; });
    opcionaisAtivos.forEach(o => { abertura.optValores[o.nome] = 0; });

    const todas: LinhaRelatorio[] = sorted.map(row => {
        const cat = getCategoria(row.stand_nr);
        const isStand = cat ? cat.is_stand !== false : true;
        const isAvail = row.tipo_venda === 'DISPONÍVEL';
        const totais = calculateRowTotals(row, cat, opcionaisAtivos, precosEdicao);
        const cli = clientes.find(c => c.id === row.cliente_id);
        const clienteNome = row.cliente_nome_livre || cli?.nome_fantasia || cli?.razao_social || '';
        const comboBase = row.tipo_venda.replace('*', '').trim();
        const isStar = row.tipo_venda.endsWith('*');

        // Abertura stand × merchandising: o combo é "stand padrão + merchandising"
        const vendidoStand = isStand && !isAvail && !isStar;
        // Tabela de preços da linha por tipo (alimenta a fórmula do PREÇO BASE no Excel)
        const precosCombo = comboLabels.map(lbl => getPrecoForCombo(cat, row, lbl));
        const baseStand = isStand ? precosCombo[0] : 0;
        const valorStand = vendidoStand ? Math.min(totais.precoBase, baseStand) : 0;
        const merchCombo = vendidoStand ? roundCentavos(totais.precoBase - valorStand) : 0;
        abertura.valorStand = addMonetario(abertura.valorStand, valorStand);
        abertura.merchCombos = addMonetario(abertura.merchCombos, merchCombo);
        if (!isStand && !isAvail) {
            abertura.merchAvulso = addMonetario(abertura.merchAvulso, totais.precoBase);
            abertura.merchAvulsoCount++;
        }
        abertura.opcionais = addMonetario(abertura.opcionais, totais.totalOpcionais);
        abertura.descontos = addMonetario(abertura.descontos, totais.desconto);
        if (vendidoStand) abertura.comboValores[comboBase] = addMonetario(abertura.comboValores[comboBase] || 0, totais.precoBase);
        if (isStand && isStar) abertura.starCount++;
        {
            const selOpt = (row.opcionais_selecionados as Record<string, string>) || {};
            opcionaisAtivos.forEach(o => {
                if (selOpt[o.nome] === 'x') abertura.optValores[o.nome] = addMonetario(abertura.optValores[o.nome] || 0, precoOpcional(o, precosEdicao));
            });
        }

        totals.subTotal = addMonetario(totals.subTotal, totais.subTotal);
        totals.desconto = addMonetario(totals.desconto, totais.desconto);
        totals.totalVenda = addMonetario(totals.totalVenda, totais.totalVenda);
        if (isStand) totalStands++;
        if (!isAvail && isStand) vendasCount++;
        if (!isStar && !isAvail && isStand) comboXCounts[comboBase] = (comboXCounts[comboBase] || 0) + 1;
        const sel = (row.opcionais_selecionados as Record<string, string>) || {};
        opcionaisAtivos.forEach(o => {
            if (sel[o.nome] === 'x' || sel[o.nome] === '*') optCounts[o.nome] = (optCounts[o.nome] || 0) + 1;
        });

        return {
            row, cat, catIndex: cat ? categorias.indexOf(cat) : -1,
            isStand, isAvail, clienteNome, comboBase, isStar, totais,
            baseStand, valorStand, merchCombo, precosCombo,
        };
    });

    // Não-stand só entra se tiver ALGUMA informação (mesma regra do PDF)
    const linhas = todas.filter(l => {
        if (l.isStand) return true;
        const r = l.row;
        if (r.cliente_id) return true;
        if (r.cliente_nome_livre && String(r.cliente_nome_livre).trim() !== '') return true;
        if (r.tipo_venda && r.tipo_venda !== 'DISPONÍVEL') return true;
        const sel = (r.opcionais_selecionados as Record<string, string>) || {};
        if (Object.values(sel).some(v => v && v.trim() !== '')) return true;
        if (Number(r.desconto) > 0) return true;
        return false;
    });

    return { comboLabels, comboDisplay, linhas, totalStands, vendasCount, comboXCounts, optCounts, totals, abertura };
}

// ─── Geração do arquivo ──────────────────────────────────────────────────────

/** Número da coluna (1-based) → letra(s) do Excel: 1→A, 27→AA. */
export function colLetra(n: number): string {
    let s = '';
    while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
    return s;
}

const DARK = 'FF1F497D';
const MED = 'FF3466A3';
const WHITE = 'FFFFFFFF';
const TOT_BG = 'FF0F2A55';
// Mesmas cores das marcas na tela da planilha (pages/TempPlanilha.tsx): "x" verde, "*" azul
const GREEN_X = 'FF00B050';
const CYAN_S = 'FF00B0F0';
const CINZA_ZERO = 'FFA0A0B4';
const TEXTO = 'FF1E1E28';
const BORDER = 'FFB4C4D6';
const AMARELO_EDIT = 'FFFFF3C4';
const CAT_PALETTES = ['E2DFF8', 'FFFFD2', 'D2F0D2', 'FFE4D2', 'D2EBFF', 'F0D2F0'];
const FMT_MOEDA = '"R$ "#,##0.00';

/** Clareia um hex RRGGBB em +12 por canal (linhas DISPONÍVEL, como no PDF). */
function clarear(hex: string): string {
    const c = (i: number) => Math.min(255, parseInt(hex.slice(i, i + 2), 16) + 12).toString(16).padStart(2, '0').toUpperCase();
    return c(0) + c(2) + c(4);
}

const fill = (argb: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
// Preenchimento para formatação condicional (dxf): o Excel lê a cor sólida do bgColor
const cfFill = (argb: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb }, bgColor: { argb } });
/** Estilo condicional de marca: fundo colorido + texto branco em negrito (igual à tela). */
const cfMarca = (argb: string): Partial<ExcelJS.Style> => ({ fill: cfFill(argb), font: { bold: true, color: { argb: WHITE } } });
/** Lista suspensa "x" / "*" nas células de marca — o equivalente ao clique na tela. */
const validacaoMarca: ExcelJS.DataValidation = {
    type: 'list', allowBlank: true, formulae: ['"x,*"'], showErrorMessage: true,
    errorTitle: 'Marca inválida', error: 'Use "x" (vendido/marcado) ou "*" (cortesia/permuta), ou deixe em branco.',
};
const bordaFina: ExcelJS.Borders = {
    top: { style: 'thin', color: { argb: BORDER } },
    left: { style: 'thin', color: { argb: BORDER } },
    bottom: { style: 'thin', color: { argb: BORDER } },
    right: { style: 'thin', color: { argb: BORDER } },
    diagonal: {},
};

// Linhas fixas do layout
export const LINHA_BANNER = 1;
export const LINHA_RESUMO_1 = 2;
export const LINHA_RESUMO_2 = 3;
export const LINHA_PRECOS = 4;
export const LINHA_CABECALHO = 5;
export const PRIMEIRA_LINHA_DADOS = 6;

/** Mapa de colunas (1-based) para um relatório com N combos e M opcionais. */
export function mapaColunas(nCombos: number, nOpts: number) {
    const cat = 1, stand = 2, cliente = 3;
    const comboIni = 4;
    const optIni = comboIni + nCombos;
    const base = optIni + nOpts;
    const opc = base + 1;
    const sub = base + 2;
    const desc = base + 3;
    const total = base + 4;
    const tipo = base + 5;       // oculta: tipo_venda
    const isStand = base + 6;    // oculta: 1 = stand
    const baseStand = base + 7;  // oculta: preço do STAND PADRÃO da categoria (venda de stand)
    const valorStand = base + 8; // oculta: parte "stand" do preço base (fórmula)
    const merchCombo = base + 9; // oculta: parte "merchandising" do combo (fórmula)
    const precoIni = base + 10;  // ocultas: preço da linha por tipo de venda (N combos) — alimenta o PREÇO BASE
    return { cat, stand, cliente, comboIni, optIni, base, opc, sub, desc, total, tipo, isStand, baseStand, valorStand, merchCombo, precoIni, ultima: precoIni + nCombos - 1 };
}

export async function gerarPlanilhaVendasXlsx(p: ParamsRelatorioVendas): Promise<ExcelJS.Buffer> {
    const d = montarDadosRelatorioVendas(p);
    const { opcionaisAtivos, precosEdicao } = p;
    const nCombos = d.comboLabels.length;
    const nOpts = opcionaisAtivos.length;
    const C = mapaColunas(nCombos, nOpts);
    const L = (n: number) => colLetra(n);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Dbarros Eventos Agro';
    wb.calcProperties.fullCalcOnLoad = true;
    const ws = wb.addWorksheet('Planilha de Vendas', {
        views: [{ state: 'frozen', xSplit: C.cliente, ySplit: LINHA_CABECALHO }],
        pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: `${LINHA_CABECALHO}:${LINHA_CABECALHO}` },
    });

    const nLinhas = d.linhas.length;
    const primeira = PRIMEIRA_LINHA_DADOS;
    const ultimaDados = primeira + nLinhas - 1;
    const linhaTotal = primeira + nLinhas;
    const rng = (col: number) => nLinhas > 0 ? `${L(col)}${primeira}:${L(col)}${ultimaDados}` : `${L(col)}${primeira}:${L(col)}${primeira}`;

    // ── 1. Banner ──────────────────────────────────────────────────────────
    ws.mergeCells(LINHA_BANNER, C.cat, LINHA_BANNER, C.total);
    const banner = ws.getCell(LINHA_BANNER, C.cat);
    const geradoEm = (p.geradoEm ?? new Date()).toLocaleDateString('pt-BR');
    banner.value = `${p.titulo.toUpperCase()}     •     Dbarros Eventos Agro     •     Gerado em ${geradoEm}`;
    banner.font = { bold: true, size: 13, color: { argb: WHITE } };
    banner.fill = fill(DARK);
    banner.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(LINHA_BANNER).height = 26;

    // ── 2. Resumo geral (linha 1: rótulos) ─────────────────────────────────
    ws.mergeCells(LINHA_RESUMO_1, C.cat, LINHA_RESUMO_1, C.opc);
    const res1 = ws.getCell(LINHA_RESUMO_1, C.cat);
    res1.value = 'RESUMO GERAL';
    res1.font = { bold: true, size: 9, color: { argb: WHITE } };
    res1.fill = fill(DARK);
    res1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ([['SUBTOTAL', C.sub], ['DESCONTO', C.desc], ['TOTAL', C.total]] as [string, number][]).forEach(([lbl, col]) => {
        const c = ws.getCell(LINHA_RESUMO_1, col);
        c.value = lbl;
        c.font = { bold: true, size: 9, color: { argb: WHITE } };
        c.fill = fill(DARK);
        c.alignment = { vertical: 'middle', horizontal: 'center' };
        c.border = bordaFina;
    });

    // ── 3. Resumo geral (linha 2: contagens e totais — FÓRMULAS) ───────────
    const fStands = `COUNTIF(${rng(C.isStand)},1)`;
    // RESERVADO* (estande segurado, vale zero) não entra na contagem de vendas. "~*" = * literal no COUNTIFS.
    const fVendas = `COUNTIFS(${rng(C.isStand)},1,${rng(C.tipo)},"<>DISPONÍVEL",${rng(C.tipo)},"<>RESERVADO~*")`;
    const pct = d.totalStands > 0 ? Math.round((d.vendasCount / d.totalStands) * 100) : 0;

    ws.mergeCells(LINHA_RESUMO_2, C.cat, LINHA_RESUMO_2, C.stand);
    const cStands = ws.getCell(LINHA_RESUMO_2, C.cat);
    cStands.value = { formula: `"STANDS  "&${fStands}`, result: `STANDS  ${d.totalStands}` };
    cStands.font = { bold: true, size: 9, color: { argb: WHITE } };
    cStands.fill = fill(MED);
    cStands.alignment = { vertical: 'middle', horizontal: 'center' };
    cStands.border = bordaFina;

    const cVendas = ws.getCell(LINHA_RESUMO_2, C.cliente);
    cVendas.value = {
        formula: `"VENDAS  "&${fVendas}&" DE "&${fStands}&"  ("&IF(${fStands}=0,0,ROUND(${fVendas}/${fStands}*100,0))&"%)"`,
        result: `VENDAS  ${d.vendasCount} DE ${d.totalStands}  (${pct}%)`,
    };
    cVendas.font = { bold: true, size: 9, color: { argb: WHITE } };
    cVendas.fill = fill(MED);
    cVendas.alignment = { vertical: 'middle', horizontal: 'center' };
    cVendas.border = bordaFina;

    d.comboLabels.forEach((lbl, i) => {
        const col = C.comboIni + i;
        const cnt = d.comboXCounts[lbl] || 0;
        const c = ws.getCell(LINHA_RESUMO_2, col);
        c.value = { formula: `COUNTIFS(${rng(col)},"x",${rng(C.isStand)},1)`, result: cnt };
        c.font = { bold: true, size: 9, color: { argb: WHITE } };
        c.fill = fill(MED);   // verde quando > 0: formatação condicional
        c.alignment = { vertical: 'middle', horizontal: 'center' };
        c.border = bordaFina;
    });
    opcionaisAtivos.forEach((o, i) => {
        const col = C.optIni + i;
        const cnt = d.optCounts[o.nome] || 0;
        const c = ws.getCell(LINHA_RESUMO_2, col);
        // "~*" — o asterisco é curinga no COUNTIF; escapado conta o caractere literal
        c.value = { formula: `COUNTIF(${rng(col)},"x")+COUNTIF(${rng(col)},"~*")`, result: cnt };
        c.font = { bold: true, size: 9, color: { argb: WHITE } };
        c.fill = fill(MED);   // azul quando > 0: formatação condicional
        c.alignment = { vertical: 'middle', horizontal: 'center' };
        c.border = bordaFina;
    });
    [C.base, C.opc].forEach(col => {
        const c = ws.getCell(LINHA_RESUMO_2, col);
        c.fill = fill(MED);
        c.border = bordaFina;
    });
    ([[C.sub, d.totals.subTotal], [C.desc, d.totals.desconto], [C.total, d.totals.totalVenda]] as [number, number][]).forEach(([col, val]) => {
        const c = ws.getCell(LINHA_RESUMO_2, col);
        c.value = { formula: `${L(col)}${linhaTotal}`, result: val };
        c.numFmt = FMT_MOEDA;
        c.font = { bold: true, size: 9, color: { argb: WHITE } };
        c.fill = fill(DARK);
        c.alignment = { vertical: 'middle', horizontal: 'center' };
        c.border = bordaFina;
    });

    // ── 4. Linha de preços dos opcionais (editável — alimenta a fórmula) ───
    const cPrecoLbl = ws.getCell(LINHA_PRECOS, C.cliente);
    cPrecoLbl.value = nOpts > 0 ? 'PREÇO DOS OPCIONAIS (R$) — edite aqui para recalcular →' : '';
    cPrecoLbl.font = { italic: true, size: 8, color: { argb: 'FF64748B' } };
    cPrecoLbl.alignment = { vertical: 'middle', horizontal: 'right' };
    opcionaisAtivos.forEach((o, i) => {
        const c = ws.getCell(LINHA_PRECOS, C.optIni + i);
        c.value = precoOpcional(o, precosEdicao);
        c.numFmt = '#,##0.00';
        c.font = { bold: true, size: 8 };
        c.fill = fill(AMARELO_EDIT);
        c.alignment = { vertical: 'middle', horizontal: 'center', textRotation: 90 };
        c.border = bordaFina;
    });
    ws.getRow(LINHA_PRECOS).height = nOpts > 0 ? 56 : 6;

    // ── 5. Cabeçalho ───────────────────────────────────────────────────────
    const headers: { col: number; label: string; rotate?: boolean }[] = [
        { col: C.cat, label: 'CAT.' },
        { col: C.stand, label: 'STAND' },
        { col: C.cliente, label: 'CLIENTE' },
        ...d.comboLabels.map((l, i) => ({ col: C.comboIni + i, label: d.comboDisplay[l] || l, rotate: true })),
        ...opcionaisAtivos.map((o, i) => ({ col: C.optIni + i, label: o.nome.toUpperCase(), rotate: true })),
        { col: C.base, label: 'PREÇO BASE' },
        { col: C.opc, label: 'OPCIONAIS' },
        { col: C.sub, label: 'SUBTOTAL' },
        { col: C.desc, label: 'DESCONTO' },
        { col: C.total, label: 'TOTAL' },
        { col: C.tipo, label: 'TIPO' },
        { col: C.isStand, label: 'É STAND' },
        { col: C.baseStand, label: 'STAND PADRÃO (R$)' },
        { col: C.valorStand, label: 'PARTE STAND' },
        { col: C.merchCombo, label: 'MERCH. DO COMBO' },
        ...d.comboLabels.map((l, i) => ({ col: C.precoIni + i, label: 'PREÇO ' + (d.comboDisplay[l] || l) })),
    ];
    headers.forEach(h => {
        const c = ws.getCell(LINHA_CABECALHO, h.col);
        c.value = h.label;
        c.font = { bold: true, size: h.rotate ? 7 : 8, color: { argb: WHITE } };
        c.fill = fill(DARK);
        c.alignment = { vertical: h.rotate ? 'bottom' : 'middle', horizontal: 'center', wrapText: true, textRotation: h.rotate ? 90 : 0 };
        c.border = bordaFina;
    });
    ws.getRow(LINHA_CABECALHO).height = 78;

    // ── 6. Linhas de dados ─────────────────────────────────────────────────
    const fOpcionais = (r: number) => nOpts > 0
        ? `SUMPRODUCT((${L(C.optIni)}${r}:${L(C.optIni + nOpts - 1)}${r}="x")*(${L(C.optIni)}$${LINHA_PRECOS}:${L(C.optIni + nOpts - 1)}$${LINHA_PRECOS}))`
        : '0';

    d.linhas.forEach((ln, i) => {
        const r = primeira + i;
        const row = ws.getRow(r);
        row.height = 16;
        const catHex = ln.catIndex >= 0 ? CAT_PALETTES[ln.catIndex % CAT_PALETTES.length] : 'FFFFFF';
        const rowBg = 'FF' + (ln.isAvail ? clarear(catHex) : catHex);
        const sel = (ln.row.opcionais_selecionados as Record<string, string>) || {};

        for (let col = C.cat; col <= C.total; col++) {
            const c = ws.getCell(r, col);
            c.fill = fill(rowBg);
            c.border = bordaFina;
            c.alignment = { vertical: 'middle', horizontal: 'center' };
            c.font = { size: 8, color: { argb: 'FF1E1E28' } };
        }

        const cCat = ws.getCell(r, C.cat);
        cCat.value = ln.cat?.tag || '';
        cCat.font = { size: 7, color: { argb: 'FF505064' } };

        const cStand = ws.getCell(r, C.stand);
        cStand.value = ln.row.stand_nr;
        cStand.font = { bold: true, size: 8 };

        const cCli = ws.getCell(r, C.cliente);
        if (ln.isAvail && !ln.clienteNome) {
            cCli.value = 'DISPONÍVEL';
            cCli.font = { italic: true, size: 8, color: { argb: 'FF8C8CA0' } };
        } else {
            cCli.value = ln.clienteNome.toUpperCase();
            cCli.font = { bold: true, size: 8 };
        }
        cCli.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

        // Marcas: só o valor — a cor vem da formatação condicional (troca junto com a marca)
        d.comboLabels.forEach((lbl, k) => {
            const c = ws.getCell(r, C.comboIni + k);
            if (ln.comboBase === lbl && !ln.isAvail) c.value = ln.isStar ? '*' : 'x';
            c.font = { bold: true, size: 9 };
            c.dataValidation = validacaoMarca;
        });
        opcionaisAtivos.forEach((o, k) => {
            const c = ws.getCell(r, C.optIni + k);
            const val = sel[o.nome] || '';
            if (val === 'x' || val === '*') c.value = val;
            c.font = { bold: true, size: 9 };
            c.dataValidation = validacaoMarca;
        });

        const t = ln.totais;
        // PREÇO BASE lê a marca do combo: "x" puxa o preço da linha para aquele tipo,
        // "*" (cortesia/permuta) ou vazio (DISPONÍVEL) = 0 — mesma regra do sistema
        const cBase = ws.getCell(r, C.base);
        cBase.value = {
            formula: `SUMPRODUCT((${L(C.comboIni)}${r}:${L(C.comboIni + nCombos - 1)}${r}="x")*(${L(C.precoIni)}${r}:${L(C.precoIni + nCombos - 1)}${r}))`,
            result: t.precoBase,
        };
        cBase.numFmt = FMT_MOEDA;
        cBase.font = { size: 8, color: { argb: TEXTO } };

        const cOpc = ws.getCell(r, C.opc);
        cOpc.value = { formula: fOpcionais(r), result: t.totalOpcionais };
        cOpc.numFmt = FMT_MOEDA;
        cOpc.font = { size: 8, color: { argb: TEXTO } };

        const cSub = ws.getCell(r, C.sub);
        cSub.value = { formula: `${L(C.base)}${r}+${L(C.opc)}${r}`, result: t.subTotal };
        cSub.numFmt = FMT_MOEDA;
        cSub.font = { size: 8, color: { argb: TEXTO } };

        // Desconto: destaque laranja quando > 0 vem da formatação condicional
        const cDesc = ws.getCell(r, C.desc);
        cDesc.value = t.desconto;
        cDesc.numFmt = FMT_MOEDA;
        cDesc.font = { size: 8, color: { argb: CINZA_ZERO } };

        const cTot = ws.getCell(r, C.total);
        cTot.value = { formula: `${L(C.sub)}${r}-${L(C.desc)}${r}`, result: t.totalVenda };
        cTot.numFmt = FMT_MOEDA;
        cTot.font = { bold: true, size: 8, color: { argb: DARK } };

        // Colunas auxiliares (ocultas) que alimentam o resumo
        ws.getCell(r, C.tipo).value = ln.row.tipo_venda;
        ws.getCell(r, C.isStand).value = ln.isStand ? 1 : 0;
        ws.getCell(r, C.baseStand).value = ln.baseStand;
        ln.precosCombo.forEach((preco, k) => { ws.getCell(r, C.precoIni + k).value = preco; });
        // Parte "stand" = min(preço base, stand padrão); merchandising = o que sobra do combo
        ws.getCell(r, C.valorStand).value = {
            formula: `IF(${L(C.isStand)}${r}=1,MIN(${L(C.base)}${r},${L(C.baseStand)}${r}),0)`,
            result: ln.valorStand,
        };
        ws.getCell(r, C.merchCombo).value = {
            formula: `IF(${L(C.isStand)}${r}=1,${L(C.base)}${r}-${L(C.valorStand)}${r},0)`,
            result: ln.merchCombo,
        };
    });

    // ── 6b. Formatação condicional (igual à tela: a cor segue a marca/valor) ──
    if (nLinhas > 0) {
        const faixa = (c1: number, c2: number) => `${L(c1)}${primeira}:${L(c2)}${ultimaDados}`;
        const regrasMarca: ExcelJS.ConditionalFormattingRule[] = [
            { type: 'cellIs', operator: 'equal', formulae: ['"x"'], style: cfMarca(GREEN_X), priority: 1 },
            { type: 'cellIs', operator: 'equal', formulae: ['"*"'], style: cfMarca(CYAN_S), priority: 2 },
        ];
        ws.addConditionalFormatting({ ref: faixa(C.comboIni, C.comboIni + nCombos - 1), rules: regrasMarca });
        if (nOpts > 0) ws.addConditionalFormatting({ ref: faixa(C.optIni, C.optIni + nOpts - 1), rules: regrasMarca });
        // Valores zerados em cinza (base, opcionais, subtotal, total)
        ws.addConditionalFormatting({
            ref: `${faixa(C.base, C.sub)} ${faixa(C.total, C.total)}`,
            rules: [{ type: 'cellIs', operator: 'equal', formulae: [0], style: { font: { color: { argb: CINZA_ZERO } } }, priority: 3 }],
        });
        // Desconto > 0: fundo laranja claro + texto laranja escuro em negrito
        ws.addConditionalFormatting({
            ref: faixa(C.desc, C.desc),
            rules: [{ type: 'cellIs', operator: 'greaterThan', formulae: [0], style: { fill: cfFill('FFFFEBD2'), font: { bold: true, color: { argb: 'FFA03C00' } } }, priority: 4 }],
        });
        // Resumo geral: contagem > 0 acende (verde nos combos, azul nos opcionais)
        ws.addConditionalFormatting({
            ref: `${L(C.comboIni)}${LINHA_RESUMO_2}:${L(C.comboIni + nCombos - 1)}${LINHA_RESUMO_2}`,
            rules: [{ type: 'cellIs', operator: 'greaterThan', formulae: [0], style: { fill: cfFill(GREEN_X) }, priority: 5 }],
        });
        if (nOpts > 0) ws.addConditionalFormatting({
            ref: `${L(C.optIni)}${LINHA_RESUMO_2}:${L(C.optIni + nOpts - 1)}${LINHA_RESUMO_2}`,
            rules: [{ type: 'cellIs', operator: 'greaterThan', formulae: [0], style: { fill: cfFill(CYAN_S) }, priority: 6 }],
        });
    }

    // ── 7. Linha de totais ─────────────────────────────────────────────────
    const somaBase = d.linhas.reduce((s, l) => addMonetario(s, l.totais.precoBase), 0);
    const somaOpc = d.linhas.reduce((s, l) => addMonetario(s, l.totais.totalOpcionais), 0);
    for (let col = C.cat; col <= C.total; col++) {
        const c = ws.getCell(linhaTotal, col);
        c.fill = fill(TOT_BG);
        c.border = bordaFina;
        c.font = { bold: true, size: 8, color: { argb: WHITE } };
        c.alignment = { vertical: 'middle', horizontal: 'center' };
    }
    ws.getRow(linhaTotal).height = 18;
    ws.getCell(linhaTotal, C.cat).value = 'TOTAL';
    ([[C.base, somaBase], [C.opc, somaOpc], [C.sub, d.totals.subTotal], [C.desc, d.totals.desconto], [C.total, d.totals.totalVenda]] as [number, number][])
        .forEach(([col, val]) => {
            const c = ws.getCell(linhaTotal, col);
            c.value = { formula: `SUM(${rng(col)})`, result: val };
            c.numFmt = FMT_MOEDA;
        });

    // ── 8. Larguras e colunas ocultas ──────────────────────────────────────
    ws.getColumn(C.cat).width = 9;
    ws.getColumn(C.stand).width = 10;
    ws.getColumn(C.cliente).width = 36;
    for (let col = C.comboIni; col < C.base; col++) ws.getColumn(col).width = 4.5;
    [C.base, C.opc, C.sub, C.desc, C.total].forEach(col => { ws.getColumn(col).width = 14; });
    for (let col = C.tipo; col <= C.ultima; col++) ws.getColumn(col).hidden = true;
    ws.pageSetup.printArea = `A1:${L(C.total)}${linhaTotal}`;

    montarAbaResumo(wb, ws.name, d, p, C, primeira, ultimaDados, linhaTotal);

    return wb.xlsx.writeBuffer();
}

// ─── Aba "Resumo": quantidades + abertura stand × merchandising ─────────────

export const ABA_RESUMO = 'Resumo';

function montarAbaResumo(
    wb: ExcelJS.Workbook,
    nomeAbaPlanilha: string,
    d: DadosRelatorioVendas,
    p: ParamsRelatorioVendas,
    C: ReturnType<typeof mapaColunas>,
    primeira: number,
    ultimaDados: number,
    linhaTotal: number,
) {
    const { opcionaisAtivos } = p;
    const a = d.abertura;
    const nLinhas = d.linhas.length;
    const L = (n: number) => colLetra(n);
    const PL = `'${nomeAbaPlanilha}'!`;
    const fim = nLinhas > 0 ? ultimaDados : primeira;
    const rng = (col: number) => `${PL}${L(col)}${primeira}:${L(col)}${fim}`;
    const rIsStand = rng(C.isStand), rTipo = rng(C.tipo), rBase = rng(C.base);

    const ws = wb.addWorksheet(ABA_RESUMO, {
        pageSetup: { orientation: 'portrait', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    ws.getColumn(1).width = 52;
    ws.getColumn(2).width = 12;
    ws.getColumn(3).width = 20;

    // Banner
    ws.mergeCells('A1:C1');
    const banner = ws.getCell('A1');
    banner.value = `RESUMO DE VENDAS — ${p.titulo.toUpperCase()}`;
    banner.font = { bold: true, size: 13, color: { argb: WHITE } };
    banner.fill = fill(DARK);
    banner.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(1).height = 26;

    let r = 3;
    const secao = (titulo: string) => {
        ws.mergeCells(r, 1, r, 3);
        const c = ws.getCell(r, 1);
        c.value = titulo;
        c.font = { bold: true, size: 10, color: { argb: WHITE } };
        c.fill = fill(DARK);
        c.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        ws.getRow(r).height = 20;
        r++;
        ['DESCRIÇÃO', 'QTDE', 'VALOR (R$)'].forEach((h, i) => {
            const hc = ws.getCell(r, i + 1);
            hc.value = h;
            hc.font = { bold: true, size: 8, color: { argb: WHITE } };
            hc.fill = fill(MED);
            hc.alignment = { vertical: 'middle', horizontal: i === 0 ? 'left' : 'center', indent: i === 0 ? 1 : 0 };
            hc.border = bordaFina;
        });
        r++;
    };
    type Val = number | string | { formula: string; result?: number | string };
    const linha = (desc: string, qtde: Val | null, valor: Val | null, opts: { bold?: boolean; bg?: string; indent?: number; corValor?: string } = {}) => {
        const cDesc = ws.getCell(r, 1);
        cDesc.value = desc;
        cDesc.font = { bold: !!opts.bold, size: 9 };
        cDesc.alignment = { vertical: 'middle', horizontal: 'left', indent: opts.indent ?? 1 };
        const cQ = ws.getCell(r, 2);
        if (qtde !== null) cQ.value = qtde as ExcelJS.CellValue;
        cQ.font = { bold: !!opts.bold, size: 9 };
        cQ.alignment = { vertical: 'middle', horizontal: 'center' };
        const cV = ws.getCell(r, 3);
        if (valor !== null) { cV.value = valor as ExcelJS.CellValue; cV.numFmt = FMT_MOEDA; }
        cV.font = { bold: !!opts.bold, size: 9, color: opts.corValor ? { argb: opts.corValor } : undefined };
        cV.alignment = { vertical: 'middle', horizontal: 'right' };
        [cDesc, cQ, cV].forEach(c => { c.border = bordaFina; if (opts.bg) c.fill = fill(opts.bg); });
        ws.getRow(r).height = 16;
        return r++;
    };

    // ── Seção 1: quantidades e valores ─────────────────────────────────────
    secao('QUANTIDADES E VALORES');
    const somaBaseStands = d.comboLabels.reduce((s, l) => addMonetario(s, a.comboValores[l] || 0), 0);
    linha('Stands no mapa', { formula: `COUNTIF(${rIsStand},1)`, result: d.totalStands }, null);
    linha('Stands vendidos (inclui cortesias/permutas)',
        { formula: `COUNTIFS(${rIsStand},1,${rTipo},"<>DISPONÍVEL")`, result: d.vendasCount },
        { formula: `SUMIFS(${rBase},${rIsStand},1)`, result: somaBaseStands },
        { bold: true, bg: 'FFEFF4FA' });
    d.comboLabels.forEach((lbl, i) => {
        const col = C.comboIni + i;
        linha(`${d.comboDisplay[lbl] || lbl}`,
            { formula: `COUNTIFS(${rng(col)},"x",${rIsStand},1)`, result: d.comboXCounts[lbl] || 0 },
            { formula: `SUMIFS(${rBase},${rng(col)},"x",${rIsStand},1)`, result: a.comboValores[lbl] || 0 },
            { indent: 3 });
    });
    {
        const fStar = d.comboLabels.map((_, i) => `COUNTIFS(${rng(C.comboIni + i)},"~*",${rIsStand},1)`).join('+');
        linha('Cortesia / permuta (*)', { formula: fStar, result: a.starCount }, 0, { indent: 3, corValor: 'FFA0A0B4' });
    }
    linha('Merchandising avulso (não-stand)',
        { formula: `COUNTIFS(${rIsStand},0,${rTipo},"<>DISPONÍVEL")`, result: a.merchAvulsoCount },
        { formula: `SUMIFS(${rBase},${rIsStand},0)`, result: a.merchAvulso },
        { bold: true, bg: 'FFEFF4FA' });
    if (opcionaisAtivos.length > 0) {
        linha('Opcionais (marcados com "x")',
            { formula: opcionaisAtivos.map((_, i) => `COUNTIF(${rng(C.optIni + i)},"x")`).join('+'), result: opcionaisAtivos.reduce((s, o) => s + d.linhas.filter(l => ((l.row.opcionais_selecionados as Record<string, string>) || {})[o.nome] === 'x').length, 0) },
            { formula: `SUM(${rng(C.opc)})`, result: a.opcionais },
            { bold: true, bg: 'FFEFF4FA' });
        opcionaisAtivos.forEach((o, i) => {
            const col = C.optIni + i;
            const cnt = d.linhas.filter(l => ((l.row.opcionais_selecionados as Record<string, string>) || {})[o.nome] === 'x').length;
            linha(o.nome,
                { formula: `COUNTIF(${rng(col)},"x")`, result: cnt },
                { formula: `COUNTIF(${rng(col)},"x")*${PL}${L(col)}$${LINHA_PRECOS}`, result: a.optValores[o.nome] || 0 },
                { indent: 3 });
        });
    }
    linha('Descontos concedidos', null, { formula: `-SUM(${rng(C.desc)})`, result: -a.descontos }, { corValor: 'FFA03C00' });
    linha('TOTAL GERAL', null, { formula: `${PL}${L(C.total)}${linhaTotal}`, result: d.totals.totalVenda }, { bold: true, bg: 'FFDCE6F2' });
    r++;

    // ── Seção 2: abertura stand × merchandising ────────────────────────────
    secao('ABERTURA: O QUE É STAND E O QUE É MERCHANDISING');
    const rValorStand = linha('Valor de stand (parte "stand padrão" de cada venda)', null,
        { formula: `SUM(${rng(C.valorStand)})`, result: a.valorStand });
    const rMerchCombo = linha('Merchandising dos combos (combo − stand padrão)', null,
        { formula: `SUM(${rng(C.merchCombo)})`, result: a.merchCombos });
    const rMerchAvulso = linha('Merchandising avulso (não-stand)', null,
        { formula: `SUMIFS(${rBase},${rIsStand},0)`, result: a.merchAvulso });
    const rMerchTotal = linha('Total de merchandising (combos + avulso)', null,
        { formula: `C${rMerchCombo}+C${rMerchAvulso}`, result: addMonetario(a.merchCombos, a.merchAvulso) },
        { bold: true, bg: 'FFEFF4FA' });
    const rOpc = linha('Opcionais', null, { formula: `SUM(${rng(C.opc)})`, result: a.opcionais });
    const rDesc = linha('Descontos concedidos', null, { formula: `-SUM(${rng(C.desc)})`, result: -a.descontos }, { corValor: 'FFA03C00' });
    linha('TOTAL GERAL (confere com a aba Planilha de Vendas)', null,
        { formula: `C${rValorStand}+C${rMerchTotal}+C${rOpc}+C${rDesc}`, result: d.totals.totalVenda },
        { bold: true, bg: 'FFDCE6F2' });
    r++;
    const nota = ws.getCell(r, 1);
    ws.mergeCells(r, 1, r, 3);
    nota.value = 'Combo = stand padrão da categoria + merchandising. Cortesias/permutas (*) entram na contagem, mas com valor zero. Tudo recalcula ao editar a aba Planilha de Vendas.';
    nota.font = { italic: true, size: 8, color: { argb: 'FF64748B' } };
    nota.alignment = { wrapText: true, vertical: 'top' };
    ws.getRow(r).height = 30;
}
