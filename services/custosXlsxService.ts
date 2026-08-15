/**
 * Planilhas Excel bloqueadas ida-e-volta com fornecedores (RF-027/028/029).
 * ExcelJS (decisão do plano 70): proteção de folha com células destravadas.
 *
 * Segurança honesta (RNF-011): proteção de Excel é ANTI-ERRO, não anti-fraude —
 * guia o fornecedor a digitar só onde deve; a validação de verdade acontece na
 * importação (CNPJ, números, ids).
 *
 * Round-trip testado em services/custosXlsxService.test.ts.
 */

import ExcelJS from 'exceljs';
import { limparCNPJ, parseNumeroBR, validarCNPJ } from '../utils/parseBR';

const SENHA_FOLHA = 'dbarros';        // trava de edição (anti-erro)
const MARCA_COTACAO = 'DBARROS_COTACAO_V1';
const MARCA_CADASTRO = 'DBARROS_CADASTRO_FORNECEDOR_V1';

const CINZA = 'FFF1F5F9';
const AZUL = 'FF0F172A';

function cabecalho(ws: ExcelJS.Worksheet, titulo: string, subtitulo: string) {
    ws.mergeCells('A1:F1');
    const t = ws.getCell('A1');
    t.value = titulo;
    t.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } };
    t.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(1).height = 24;
    ws.mergeCells('A2:F2');
    ws.getCell('A2').value = subtitulo;
    ws.getCell('A2').font = { italic: true, size: 9 };
}

// ────────────────────────────────────────────────────────────────────────────
// COTAÇÃO (RF-029): itens travados, fornecedor digita só o preço unitário
// ────────────────────────────────────────────────────────────────────────────

export interface ItemCotacaoXlsx {
    itemId: string;
    descricao: string;
    formato: string | null;
    quantidade: number;      // quantidade consolidada (qtd × fator)
    unidade: string;
}

export interface ExclusaoCotacaoXlsx {
    chave: string;
    pergunta: string;
}

/** Perguntas padrão de exclusão (RF-052) — lista aberta. */
export const EXCLUSOES_PADRAO: ExclusaoCotacaoXlsx[] = [
    { chave: 'frete', pergunta: 'Frete/mobilização INCLUSO no preço? (SIM/NÃO — se não, valor extra)' },
    { chave: 'alim_equipe', pergunta: 'Alimentação e hospedagem da SUA equipe inclusas?' },
    { chave: 'combustivel', pergunta: 'Combustível incluso (gerador: locação completa)?' },
    { chave: 'horas_extras', pergunta: 'Horas extras: valor por hora além do combinado' },
    { chave: 'art', pergunta: 'ART inclusa?' },
    { chave: 'validade', pergunta: 'Validade desta cotação (dd/mm/aaaa)' },
];

export async function gerarPlanilhaCotacao(params: {
    pedidoNome: string;
    fornecedor: { razao_social: string; cnpj: string | null };
    itens: ItemCotacaoXlsx[];
    exclusoes?: ExclusaoCotacaoXlsx[];
}): Promise<ExcelJS.Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Dbarros Rural — Centro de Custo';
    const ws = wb.addWorksheet('Cotação', { properties: { defaultColWidth: 14 } });

    cabecalho(ws, `PEDIDO DE ORÇAMENTO — ${params.pedidoNome}`,
        'Preencha SOMENTE as células amarelas (preço unitário e condições). O resto está travado.');

    ws.getCell('A4').value = 'Fornecedor:';
    ws.getCell('B4').value = params.fornecedor.razao_social;
    ws.getCell('A5').value = 'CNPJ:';
    ws.getCell('B5').value = params.fornecedor.cnpj ?? '';
    ws.getCell('E4').value = MARCA_COTACAO;
    ws.getCell('E4').font = { size: 6, color: { argb: 'FFCCCCCC' } };

    // Tabela de itens
    const header = ['ID', 'Descrição', 'Formato', 'Qtde', 'Unid.', 'Preço Unit. (R$)', 'Total (R$)'];
    const hRow = ws.addRow([]);
    ws.getRow(7).values = header;
    ws.getRow(7).font = { bold: true };
    ws.getRow(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CINZA } };
    void hRow;

    let r = 8;
    const primeira = r;
    for (const item of params.itens) {
        const row = ws.getRow(r);
        row.values = [item.itemId, item.descricao, item.formato ?? '', item.quantidade, item.unidade, null, null];
        const preco = row.getCell(6);
        preco.protection = { locked: false };                  // ÚNICA célula editável da linha
        preco.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3C4' } };
        preco.numFmt = '#,##0.00';
        const total = row.getCell(7);
        total.value = { formula: `D${r}*F${r}` };              // auto-soma da linha
        total.numFmt = '#,##0.00';
        r++;
    }
    const totalRow = ws.getRow(r + 1);
    totalRow.getCell(6).value = 'TOTAL:';
    totalRow.getCell(6).font = { bold: true };
    totalRow.getCell(7).value = { formula: `SUM(G${primeira}:G${r - 1})` };
    totalRow.getCell(7).numFmt = '#,##0.00';
    totalRow.getCell(7).font = { bold: true };

    // Exclusões (RF-052)
    let e = r + 3;
    ws.getCell(`A${e}`).value = 'CONDIÇÕES (responda ao lado):';
    ws.getCell(`A${e}`).font = { bold: true };
    e++;
    for (const ex of params.exclusoes ?? EXCLUSOES_PADRAO) {
        ws.getCell(`A${e}`).value = ex.chave;
        ws.getCell(`A${e}`).font = { size: 6, color: { argb: 'FFCCCCCC' } };
        ws.getCell(`B${e}`).value = ex.pergunta;
        const resp = ws.getCell(`E${e}`);
        resp.protection = { locked: false };
        resp.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3C4' } };
        e++;
    }

    ws.getColumn(1).hidden = true;                             // ids fora da vista
    ws.getColumn(2).width = 42;
    ws.getColumn(6).width = 16;
    ws.getColumn(7).width = 16;

    await ws.protect(SENHA_FOLHA, { selectLockedCells: true, selectUnlockedCells: true });
    return wb.xlsx.writeBuffer();
}

export interface CotacaoImportada {
    linhas: { itemId: string; precoUnitario: number }[];
    exclusoes: { chave: string; resposta: string }[];
    avisos: string[];
}

/** Importa a planilha devolvida pelo fornecedor: só os preços e condições. */
export async function importarPlanilhaCotacao(buffer: ArrayBuffer | Buffer): Promise<CotacaoImportada> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as Buffer);
    const ws = wb.worksheets[0];
    if (!ws) throw new Error('Arquivo sem planilha');
    if (ws.getCell('E4').value !== MARCA_COTACAO) {
        throw new Error('Este arquivo não é uma cotação gerada pelo sistema');
    }

    const linhas: CotacaoImportada['linhas'] = [];
    const exclusoes: CotacaoImportada['exclusoes'] = [];
    const avisos: string[] = [];
    let emCondicoes = false;

    ws.eachRow((row, n) => {
        if (n < 8) return;
        const a = String(row.getCell(1).value ?? '').trim();
        const b = String(row.getCell(2).value ?? '').trim();
        if (/^CONDIÇÕES/i.test(String(row.getCell(1).value ?? '')) || /^CONDIÇÕES/i.test(b)) {
            emCondicoes = true;
            return;
        }
        if (emCondicoes) {
            if (a) {
                const resp = row.getCell(5).value;
                exclusoes.push({ chave: a, resposta: resp == null ? '' : String(resp).trim() });
            }
            return;
        }
        // Linha de item: A tem o uuid
        if (/^[0-9a-f-]{36}$/i.test(a)) {
            const bruto = row.getCell(6).value;
            const preco = typeof bruto === 'number' ? bruto : parseNumeroBR(String(bruto ?? ''));
            if (preco === null || preco < 0) {
                avisos.push(`Item "${b}": preço vazio ou irreconhecível — ignorado`);
            } else {
                linhas.push({ itemId: a, precoUnitario: preco });
            }
        }
    });

    if (linhas.length === 0) avisos.push('Nenhum preço preenchido na planilha');
    return { linhas, exclusoes, avisos };
}

// ────────────────────────────────────────────────────────────────────────────
// CADASTRO DE FORNECEDOR (RF-027/028)
// ────────────────────────────────────────────────────────────────────────────

const CAMPOS_CADASTRO: { chave: string; rotulo: string }[] = [
    { chave: 'razao_social', rotulo: 'Razão social *' },
    { chave: 'cnpj', rotulo: 'CNPJ' },
    { chave: 'nome_fantasia', rotulo: 'Nome fantasia' },
    { chave: 'email', rotulo: 'E-mail' },
    { chave: 'telefone', rotulo: 'Telefone / WhatsApp' },
    { chave: 'cidade', rotulo: 'Cidade' },
    { chave: 'uf', rotulo: 'UF' },
    { chave: 'observacoes', rotulo: 'Observações (o que fornece, condições)' },
];

export async function gerarPlanilhaCadastroFornecedor(
    preenchido?: Partial<Record<string, string | null>>,
): Promise<ExcelJS.Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Cadastro');
    cabecalho(ws, 'CADASTRO DE FORNECEDOR — Dbarros Rural',
        'Preencha as células amarelas e devolva este arquivo.');
    ws.getCell('E4').value = MARCA_CADASTRO;
    ws.getCell('E4').font = { size: 6, color: { argb: 'FFCCCCCC' } };

    let r = 6;
    for (const campo of CAMPOS_CADASTRO) {
        ws.getCell(`A${r}`).value = campo.chave;
        ws.getCell(`A${r}`).font = { size: 6, color: { argb: 'FFCCCCCC' } };
        ws.getCell(`B${r}`).value = campo.rotulo;
        ws.getCell(`B${r}`).font = { bold: true };
        const valor = ws.getCell(`C${r}`);
        valor.value = preenchido?.[campo.chave] ?? '';         // autocomplete (RF-027)
        valor.protection = { locked: false };
        valor.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3C4' } };
        r++;
    }
    ws.getColumn(1).hidden = true;
    ws.getColumn(2).width = 40;
    ws.getColumn(3).width = 40;

    await ws.protect(SENHA_FOLHA, { selectLockedCells: true, selectUnlockedCells: true });
    return wb.xlsx.writeBuffer();
}

export interface CadastroImportado {
    campos: Record<string, string>;
    avisos: string[];
}

export async function importarPlanilhaCadastroFornecedor(
    buffer: ArrayBuffer | Buffer,
): Promise<CadastroImportado> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as Buffer);
    const ws = wb.worksheets[0];
    if (!ws) throw new Error('Arquivo sem planilha');
    if (ws.getCell('E4').value !== MARCA_CADASTRO) {
        throw new Error('Este arquivo não é um cadastro gerado pelo sistema');
    }

    const campos: Record<string, string> = {};
    const avisos: string[] = [];
    ws.eachRow((row, n) => {
        if (n < 6) return;
        const chave = String(row.getCell(1).value ?? '').trim();
        if (!chave) return;
        const valor = row.getCell(3).value;
        campos[chave] = valor == null ? '' : String(valor).trim();
    });

    if (!campos.razao_social) avisos.push('Razão social não preenchida');
    if (campos.cnpj) {
        const digitos = limparCNPJ(campos.cnpj);
        if (!validarCNPJ(digitos)) {
            avisos.push(`CNPJ inválido: ${campos.cnpj}`);
            campos.cnpj = '';
        } else {
            campos.cnpj = digitos;                             // chave de dedup (RF-028)
        }
    }
    return { campos, avisos };
}
