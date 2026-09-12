import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import {
    montarDadosRelatorioVendas,
    gerarPlanilhaVendasXlsx,
    mapaColunas,
    colLetra,
    precoOpcional,
    ParamsRelatorioVendas,
    LINHA_RESUMO_2,
    LINHA_PRECOS,
    LINHA_CABECALHO,
    PRIMEIRA_LINHA_DADOS,
    ABA_RESUMO,
} from './relatorioVendasXlsx';
import { calculateRowTotals } from './planilhaCalc';

type Formula = { formula?: string; result?: unknown };
// ExcelJS não grava o cache quando o resultado é 0 (volta undefined na leitura);
// o Excel recalcula ao abrir (fullCalcOnLoad), então 0 e undefined são equivalentes aqui
const f = (c: ExcelJS.Cell) => {
    const v = c.value as Formula;
    return { ...v, result: v?.result === undefined && v?.formula ? 0 : v?.result };
};

const OPT_TENDA = { id: 'opt-tenda', nome: 'Tenda', preco_base: 500 };
const OPT_ENERGIA = { id: 'opt-energia', nome: 'Energia', preco_base: 200 };

const params: ParamsRelatorioVendas = {
    titulo: 'Expo Rural 2026',
    categorias: [
        { tag: 'NAMING', prefix: 'Naming', count: 2, standBase: 20000, combos: [25000, 30000], comboNames: ['Ouro', 'Prata'], ordem: 1 },
        { tag: 'MERC', prefix: 'Merc', count: 2, standBase: 1000, is_stand: false, ordem: 2 },
    ] as ParamsRelatorioVendas['categorias'],
    estandes: [
        { stand_nr: 'Naming 10', tipo_venda: 'COMBO 01', opcionais_selecionados: { Tenda: 'x' }, desconto: 1000, cliente_id: 'cli-1' },
        { stand_nr: 'Naming 2', tipo_venda: 'STAND PADRÃO', opcionais_selecionados: { Energia: '*' }, desconto: 0, cliente_nome_livre: 'Fazenda Boa Vista' },
        { stand_nr: 'Naming 1', tipo_venda: 'COMBO 02*', opcionais_selecionados: {}, desconto: 0, cliente_id: 'cli-2' },
        { stand_nr: 'Naming 3', tipo_venda: 'DISPONÍVEL', opcionais_selecionados: {}, desconto: 0 },
        { stand_nr: 'Merc 1', tipo_venda: 'STAND PADRÃO', opcionais_selecionados: {}, desconto: 0, cliente_nome_livre: 'Camisetas' },
        { stand_nr: 'Merc 2', tipo_venda: 'DISPONÍVEL', opcionais_selecionados: {}, desconto: 0 },  // em branco → some
    ],
    opcionaisAtivos: [OPT_TENDA, OPT_ENERGIA],
    precosEdicao: { 'opt-tenda': 800 },   // Tenda vale 800 nesta edição; Energia fica no preço-base
    clientes: [
        { id: 'cli-1', nome_fantasia: 'Agro Norte', razao_social: 'Agro Norte Ltda' },
        { id: 'cli-2', nome_fantasia: null, razao_social: 'Sementes do Sul S.A.' },
    ],
    geradoEm: new Date(2026, 8, 12),
};

describe('montarDadosRelatorioVendas (mesma organização do PDF)', () => {
    const d = montarDadosRelatorioVendas(params);

    it('ordena por ordem da categoria e número do stand (numérico, não alfabético)', () => {
        expect(d.linhas.map(l => l.row.stand_nr)).toEqual(['Naming 1', 'Naming 2', 'Naming 3', 'Naming 10', 'Merc 1']);
    });

    it('omite linha não-stand totalmente em branco, mas mantém a que tem cliente', () => {
        expect(d.linhas.some(l => l.row.stand_nr === 'Merc 2')).toBe(false);
        expect(d.linhas.some(l => l.row.stand_nr === 'Merc 1')).toBe(true);
    });

    it('monta os rótulos de combo com os nomes customizados', () => {
        expect(d.comboLabels).toEqual(['STAND PADRÃO', 'COMBO 01', 'COMBO 02']);
        expect(d.comboDisplay['COMBO 01']).toBe('Ouro');
        expect(d.comboDisplay['COMBO 02']).toBe('Prata');
    });

    it('conta só stands reais: 4 stands, 3 vendidos (o DISPONÍVEL não conta)', () => {
        expect(d.totalStands).toBe(4);
        expect(d.vendasCount).toBe(3);
    });

    it('conta combos com "x" (cortesia com "*" não entra) e opcionais com "x" ou "*"', () => {
        expect(d.comboXCounts['COMBO 01']).toBe(1);
        expect(d.comboXCounts['STAND PADRÃO']).toBe(1);   // Merc 1 é não-stand, não conta
        expect(d.comboXCounts['COMBO 02']).toBe(0);       // cortesia
        expect(d.optCounts['Tenda']).toBe(1);
        expect(d.optCounts['Energia']).toBe(1);           // "*" conta na contagem
    });

    it('resolve o nome do cliente: nome livre > nome fantasia > razão social', () => {
        const nomes = Object.fromEntries(d.linhas.map(l => [l.row.stand_nr, l.clienteNome]));
        expect(nomes['Naming 2']).toBe('Fazenda Boa Vista');
        expect(nomes['Naming 10']).toBe('Agro Norte');
        expect(nomes['Naming 1']).toBe('Sementes do Sul S.A.');
        expect(nomes['Naming 3']).toBe('');
    });

    it('totais batem com a soma de calculateRowTotals linha a linha', () => {
        // Naming 10: 25000 + 800 (Tenda) − 1000 = 24800 | Naming 2: 20000 (Energia "*" não soma)
        // Naming 1: cortesia = 0 | Naming 3: 0 | Merc 1: 1000
        expect(d.totals.subTotal).toBe(46800);
        expect(d.totals.desconto).toBe(1000);
        expect(d.totals.totalVenda).toBe(45800);
    });

    it('abertura stand × merchandising fecha com o total geral', () => {
        const a = d.abertura;
        expect(a.valorStand).toBe(40000);       // Naming 2 (20000) + parte stand do Naming 10 (20000)
        expect(a.merchCombos).toBe(5000);       // Naming 10: 25000 − 20000
        expect(a.merchAvulso).toBe(1000);       // Merc 1
        expect(a.merchAvulsoCount).toBe(1);
        expect(a.opcionais).toBe(800);
        expect(a.descontos).toBe(1000);
        expect(a.starCount).toBe(1);
        expect(a.comboValores).toEqual({ 'STAND PADRÃO': 20000, 'COMBO 01': 25000, 'COMBO 02': 0 });
        expect(a.optValores).toEqual({ Tenda: 800, Energia: 0 });
        expect(a.valorStand + a.merchCombos + a.merchAvulso + a.opcionais - a.descontos).toBe(d.totals.totalVenda);
    });

    it('preço do opcional: usa o da edição quando existe, senão o preço-base', () => {
        expect(precoOpcional(OPT_TENDA, params.precosEdicao)).toBe(800);
        expect(precoOpcional(OPT_ENERGIA, params.precosEdicao)).toBe(200);
    });
});

describe('colLetra / mapaColunas', () => {
    it('converte índice em letra de coluna do Excel', () => {
        expect(colLetra(1)).toBe('A');
        expect(colLetra(26)).toBe('Z');
        expect(colLetra(27)).toBe('AA');
        expect(colLetra(52)).toBe('AZ');
    });

    it('posiciona as colunas financeiras depois dos combos e opcionais', () => {
        const C = mapaColunas(3, 2);
        expect(C.comboIni).toBe(4);
        expect(C.optIni).toBe(7);
        expect(C.base).toBe(9);
        expect(C.total).toBe(13);
        expect(C.isStand).toBe(15);
        expect(C.precoIni).toBe(19);
        expect(C.ultima).toBe(21);      // 3 combos → 3 colunas de preço
    });
});

describe('gerarPlanilhaVendasXlsx (arquivo com fórmulas vivas)', () => {
    async function gerar() {
        const buf = await gerarPlanilhaVendasXlsx(params);
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buf as Buffer);
        return wb.worksheets[0];
    }
    const C = mapaColunas(3, 2);
    const d = montarDadosRelatorioVendas(params);

    it('cabeçalho traz as colunas do PDF mais PREÇO BASE e OPCIONAIS', async () => {
        const ws = await gerar();
        const h = ws.getRow(LINHA_CABECALHO);
        expect(h.getCell(C.cat).value).toBe('CAT.');
        expect(h.getCell(C.cliente).value).toBe('CLIENTE');
        expect(h.getCell(C.comboIni + 1).value).toBe('Ouro');           // nome customizado
        expect(h.getCell(C.optIni).value).toBe('TENDA');
        expect(h.getCell(C.base).value).toBe('PREÇO BASE');
        expect(h.getCell(C.opc).value).toBe('OPCIONAIS');
        expect(h.getCell(C.total).value).toBe('TOTAL');
    });

    it('cada linha tem SUBTOTAL e TOTAL como fórmula, com o resultado igual ao cálculo do sistema', async () => {
        const ws = await gerar();
        d.linhas.forEach((ln, i) => {
            const r = PRIMEIRA_LINHA_DADOS + i;
            const esperado = calculateRowTotals(ln.row, ln.cat, params.opcionaisAtivos, params.precosEdicao);
            const sub = f(ws.getCell(r, C.sub));
            const tot = f(ws.getCell(r, C.total));
            expect(sub.formula).toBe(`${colLetra(C.base)}${r}+${colLetra(C.opc)}${r}`);
            expect(sub.result).toBe(esperado.subTotal);
            expect(tot.formula).toBe(`${colLetra(C.sub)}${r}-${colLetra(C.desc)}${r}`);
            expect(tot.result).toBe(esperado.totalVenda);
            expect(f(ws.getCell(r, C.base)).result).toBe(esperado.precoBase);
            expect(ws.getCell(r, C.desc).value).toBe(esperado.desconto);
        });
    });

    it('PREÇO BASE lê a marca do combo como o sistema: "x" puxa o preço, "*" (cortesia) vale 0', async () => {
        const ws = await gerar();
        const linha = (nr: string) => PRIMEIRA_LINHA_DADOS + d.linhas.findIndex(l => l.row.stand_nr === nr);
        // fórmula: marcas dos combos × preços ocultos da linha
        const rN10 = linha('Naming 10');
        const base = f(ws.getCell(rN10, C.base));
        expect(base.formula).toBe(`SUMPRODUCT((${colLetra(C.comboIni)}${rN10}:${colLetra(C.comboIni + 2)}${rN10}="x")*(${colLetra(C.precoIni)}${rN10}:${colLetra(C.precoIni + 2)}${rN10}))`);
        expect(base.result).toBe(25000);
        // preços ocultos da linha: STAND PADRÃO, COMBO 01, COMBO 02 da categoria NAMING
        expect([0, 1, 2].map(k => ws.getCell(rN10, C.precoIni + k).value)).toEqual([20000, 25000, 30000]);
        // cortesia: marca "*" → base 0, mas os preços continuam lá (trocar por "x" no Excel puxa 30000)
        const rN1 = linha('Naming 1');
        expect(ws.getCell(rN1, C.comboIni + 2).value).toBe('*');
        expect(f(ws.getCell(rN1, C.base)).result).toBe(0);
        expect(ws.getCell(rN1, C.precoIni + 2).value).toBe(30000);
        // não-stand: preço do STAND PADRÃO da categoria MERC
        expect(ws.getCell(linha('Merc 1'), C.precoIni).value).toBe(1000);
        for (let k = 0; k < 3; k++) expect(ws.getColumn(C.precoIni + k).hidden).toBe(true);
    });

    it('OPCIONAIS soma as marcas "x" pela linha de preços editável (SUMPRODUCT)', async () => {
        const ws = await gerar();
        const rNaming10 = PRIMEIRA_LINHA_DADOS + d.linhas.findIndex(l => l.row.stand_nr === 'Naming 10');
        const opc = f(ws.getCell(rNaming10, C.opc));
        expect(opc.formula).toContain('SUMPRODUCT');
        expect(opc.formula).toContain(`$${LINHA_PRECOS}`);
        expect(opc.result).toBe(800);
        // linha de preços: Tenda 800 (edição), Energia 200 (base)
        expect(ws.getCell(LINHA_PRECOS, C.optIni).value).toBe(800);
        expect(ws.getCell(LINHA_PRECOS, C.optIni + 1).value).toBe(200);
    });

    it('marca "x" no combo vendido, "*" na cortesia e nada no DISPONÍVEL', async () => {
        const ws = await gerar();
        const linha = (nr: string) => PRIMEIRA_LINHA_DADOS + d.linhas.findIndex(l => l.row.stand_nr === nr);
        expect(ws.getCell(linha('Naming 10'), C.comboIni + 1).value).toBe('x');   // COMBO 01
        expect(ws.getCell(linha('Naming 1'), C.comboIni + 2).value).toBe('*');    // COMBO 02*
        expect(ws.getCell(linha('Naming 3'), C.comboIni).value).toBeNull();
        expect(ws.getCell(linha('Naming 3'), C.cliente).value).toBe('DISPONÍVEL');
        expect(ws.getCell(linha('Naming 2'), C.optIni + 1).value).toBe('*');      // Energia "*"
    });

    it('linha TOTAL usa SUM sobre as colunas financeiras, com o resultado já calculado', async () => {
        const ws = await gerar();
        const linhaTotal = PRIMEIRA_LINHA_DADOS + d.linhas.length;
        expect(ws.getCell(linhaTotal, C.cat).value).toBe('TOTAL');
        const tot = f(ws.getCell(linhaTotal, C.total));
        expect(tot.formula).toBe(`SUM(${colLetra(C.total)}${PRIMEIRA_LINHA_DADOS}:${colLetra(C.total)}${linhaTotal - 1})`);
        expect(tot.result).toBe(45800);
        expect(f(ws.getCell(linhaTotal, C.desc)).result).toBe(1000);
    });

    it('resumo conta com COUNTIF/COUNTIFS e escapa o "*" (curinga no Excel)', async () => {
        const ws = await gerar();
        const stands = f(ws.getCell(LINHA_RESUMO_2, C.cat));
        expect(stands.formula).toContain('COUNTIF(');
        expect(stands.result).toBe('STANDS  4');
        const vendas = f(ws.getCell(LINHA_RESUMO_2, C.cliente));
        expect(vendas.formula).toContain('COUNTIFS(');
        expect(vendas.result).toBe('VENDAS  3 DE 4  (75%)');
        const combo1 = f(ws.getCell(LINHA_RESUMO_2, C.comboIni + 1));
        expect(combo1.formula).toContain('"x"');
        expect(combo1.result).toBe(1);
        const energia = f(ws.getCell(LINHA_RESUMO_2, C.optIni + 1));
        expect(energia.formula).toContain('"~*"');
        expect(energia.result).toBe(1);
        // totais do resumo apontam para a linha TOTAL
        expect(f(ws.getCell(LINHA_RESUMO_2, C.total)).result).toBe(45800);
    });

    it('colunas auxiliares (TIPO, É STAND) existem e ficam ocultas', async () => {
        const ws = await gerar();
        expect(ws.getColumn(C.tipo).hidden).toBe(true);
        expect(ws.getColumn(C.isStand).hidden).toBe(true);
        const rMerc = PRIMEIRA_LINHA_DADOS + d.linhas.findIndex(l => l.row.stand_nr === 'Merc 1');
        expect(ws.getCell(rMerc, C.isStand).value).toBe(0);
        expect(ws.getCell(PRIMEIRA_LINHA_DADOS, C.isStand).value).toBe(1);
        expect(ws.getCell(PRIMEIRA_LINHA_DADOS, C.tipo).value).toBe('COMBO 02*');
    });

    it('sai em paisagem, ajustada à largura, com cabeçalho congelado', async () => {
        const ws = await gerar();
        expect(ws.pageSetup.orientation).toBe('landscape');
        expect(ws.pageSetup.fitToWidth).toBe(1);
        expect(ws.views[0]).toMatchObject({ state: 'frozen', ySplit: LINHA_CABECALHO });
    });

    it('colunas ocultas abrem o preço base em parte "stand" e parte "merchandising do combo"', async () => {
        const ws = await gerar();
        const linha = (nr: string) => PRIMEIRA_LINHA_DADOS + d.linhas.findIndex(l => l.row.stand_nr === nr);
        // Naming 10: COMBO 01 = 25000 → stand padrão 20000 + merchandising 5000
        expect(ws.getCell(linha('Naming 10'), C.baseStand).value).toBe(20000);
        expect(f(ws.getCell(linha('Naming 10'), C.valorStand)).result).toBe(20000);
        expect(f(ws.getCell(linha('Naming 10'), C.merchCombo)).result).toBe(5000);
        expect(f(ws.getCell(linha('Naming 10'), C.merchCombo)).formula).toContain('IF(');
        // Naming 2: STAND PADRÃO → tudo stand, nada de merchandising
        expect(f(ws.getCell(linha('Naming 2'), C.merchCombo)).result).toBe(0);
        // Cortesia e não-stand não entram na parte "stand"
        expect(f(ws.getCell(linha('Naming 1'), C.valorStand)).result).toBe(0);
        expect(f(ws.getCell(linha('Merc 1'), C.valorStand)).result).toBe(0);
        [C.baseStand, C.valorStand, C.merchCombo].forEach(col => expect(ws.getColumn(col).hidden).toBe(true));
    });

    it('sem opcionais ativos e sem estandes: gera sem erro e com totais zerados', async () => {
        const buf = await gerarPlanilhaVendasXlsx({ ...params, estandes: [], opcionaisAtivos: [] });
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buf as Buffer);
        const ws = wb.worksheets[0];
        const C0 = mapaColunas(3, 0);
        expect(f(ws.getCell(PRIMEIRA_LINHA_DADOS, C0.total)).result).toBe(0);
        expect(f(ws.getCell(LINHA_RESUMO_2, C0.cat)).result).toBe('STANDS  0');
        expect(f(ws.getCell(LINHA_RESUMO_2, C0.cliente)).result).toBe('VENDAS  0 DE 0  (0%)');
    });
});

describe('aba Resumo (quantidades + abertura stand × merchandising, ligada por fórmula à aba principal)', () => {
    async function gerarResumo() {
        const buf = await gerarPlanilhaVendasXlsx(params);
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buf as Buffer);
        return wb.getWorksheet(ABA_RESUMO)!;
    }
    /** Acha a linha pelo texto da coluna DESCRIÇÃO e devolve {qtde, valor}. */
    function achar(ws: ExcelJS.Worksheet, inicio: string, ocorrencia = 1) {
        let vistas = 0;
        let achada: ExcelJS.Row | undefined;
        ws.eachRow(row => {
            if (achada) return;
            if (String(row.getCell(1).value ?? '').startsWith(inicio)) { vistas++; if (vistas === ocorrencia) achada = row; }
        });
        if (!achada) throw new Error(`linha "${inicio}" não encontrada`);
        return { qtde: f(achada.getCell(2)), valor: f(achada.getCell(3)) };
    }

    it('existe como segunda aba', async () => {
        const ws = await gerarResumo();
        expect(ws).toBeDefined();
        expect(String(ws.getCell('A1').value)).toContain('RESUMO DE VENDAS');
    });

    it('quantidades: stands no mapa, vendidos, por combo, cortesias e merchandising avulso', async () => {
        const ws = await gerarResumo();
        expect(achar(ws, 'Stands no mapa').qtde.result).toBe(4);
        const vendidos = achar(ws, 'Stands vendidos');
        expect(vendidos.qtde.result).toBe(3);
        expect(vendidos.valor.result).toBe(45000);            // 20000 + 25000 + 0 (cortesia)
        expect(vendidos.valor.formula).toContain("SUMIFS('Planilha de Vendas'!");
        expect(achar(ws, 'Ouro').qtde.result).toBe(1);        // COMBO 01 com nome customizado
        expect(achar(ws, 'Ouro').valor.result).toBe(25000);
        expect(achar(ws, 'Cortesia / permuta').qtde.result).toBe(1);
        const merc = achar(ws, 'Merchandising avulso');
        expect(merc.qtde.result).toBe(1);
        expect(merc.valor.result).toBe(1000);
        expect(achar(ws, 'Tenda').qtde.result).toBe(1);
        expect(achar(ws, 'Tenda').valor.result).toBe(800);
        expect(achar(ws, 'Tenda').valor.formula).toContain(`$${LINHA_PRECOS}`);   // conta × preço editável
        expect(achar(ws, 'TOTAL GERAL').valor.result).toBe(45800);
    });

    it('abertura: valor de stand, merchandising dos combos, avulso, e total confere', async () => {
        const ws = await gerarResumo();
        expect(achar(ws, 'Valor de stand').valor.result).toBe(40000);
        const merchCombo = achar(ws, 'Merchandising dos combos');
        expect(merchCombo.valor.result).toBe(5000);
        expect(merchCombo.valor.formula).toContain("SUM('Planilha de Vendas'!");
        expect(achar(ws, 'Merchandising avulso', 2).valor.result).toBe(1000);
        expect(achar(ws, 'Total de merchandising').valor.result).toBe(6000);
        expect(achar(ws, 'Descontos concedidos', 2).valor.result).toBe(-1000);
        const total = achar(ws, 'TOTAL GERAL (confere');
        expect(total.valor.result).toBe(45800);
        expect(total.valor.formula).toMatch(/^C\d+\+C\d+\+C\d+\+C\d+$/);
    });
});
