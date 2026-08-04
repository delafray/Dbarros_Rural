import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import {
    gerarPlanilhaCotacao,
    importarPlanilhaCotacao,
    gerarPlanilhaCadastroFornecedor,
    importarPlanilhaCadastroFornecedor,
    EXCLUSOES_PADRAO,
} from './custosXlsxService';

const ID1 = '11111111-1111-4111-8111-111111111111';
const ID2 = '22222222-2222-4222-8222-222222222222';

async function gerarCotacaoTeste() {
    return gerarPlanilhaCotacao({
        pedidoNome: 'Tendas do Rodeio 2026',
        fornecedor: { razao_social: 'Tendas Boi Bravo Ltda', cnpj: '00394460005887' },
        itens: [
            { itemId: ID1, descricao: 'Tenda 5x5', formato: '5x5', quantidade: 29, unidade: 'un' },
            { itemId: ID2, descricao: 'Piso deck', formato: 'm2', quantidade: 1000, unidade: 'm2' },
        ],
    });
}

describe('round-trip da COTAÇÃO (RF-029): gera travada → fornecedor preenche → importa', () => {
    it('a folha nasce protegida com só o preço destravado', async () => {
        const buf = await gerarCotacaoTeste();
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buf as Buffer);
        const ws = wb.worksheets[0];
        const protecao = (ws as unknown as { sheetProtection?: { sheet?: boolean } }).sheetProtection;
        expect(protecao?.sheet).toBe(true);                    // folha travada
        const linhaItem = ws.getRow(8);
        expect(linhaItem.getCell(2).protection?.locked ?? true).toBe(true);   // descrição travada
        expect(linhaItem.getCell(6).protection?.locked).toBe(false);          // preço LIVRE
        const formulaTotal = (ws.getRow(9).getCell(7).value as { formula?: string })?.formula ?? '';
        expect(formulaTotal).toContain('D9');                                 // fórmula de auto-soma
    });

    it('fornecedor digita preços e condições → importação recupera tudo por id', async () => {
        const buf = await gerarCotacaoTeste();
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buf as Buffer);
        const ws = wb.worksheets[0];
        // "o fornecedor preenche": preço das duas linhas + frete
        ws.getRow(8).getCell(6).value = 2761;
        ws.getRow(9).getCell(6).value = 32.5;
        // primeira linha de condições (frete)
        let linhaFrete = 0;
        ws.eachRow((row, n) => {
            if (String(row.getCell(1).value ?? '') === 'frete') linhaFrete = n;
        });
        ws.getRow(linhaFrete).getCell(5).value = 'NÃO — R$ 1.200,00';
        const devolvido = await wb.xlsx.writeBuffer();

        const r = await importarPlanilhaCotacao(devolvido as Buffer);
        expect(r.linhas).toEqual([
            { itemId: ID1, precoUnitario: 2761 },
            { itemId: ID2, precoUnitario: 32.5 },
        ]);
        const frete = r.exclusoes.find(e => e.chave === 'frete');
        expect(frete?.resposta).toContain('1.200');
        expect(r.exclusoes.length).toBe(EXCLUSOES_PADRAO.length);
        expect(r.avisos).toEqual([]);
    });

    it('preço em texto BR ("2.761,00") também é entendido na volta', async () => {
        const buf = await gerarCotacaoTeste();
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buf as Buffer);
        wb.worksheets[0].getRow(8).getCell(6).value = 'R$ 2.761,00';
        const r = await importarPlanilhaCotacao(await wb.xlsx.writeBuffer() as Buffer);
        expect(r.linhas[0]).toEqual({ itemId: ID1, precoUnitario: 2761 });
    });

    it('linha sem preço vira aviso, não erro nem zero fantasma', async () => {
        const buf = await gerarCotacaoTeste();
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buf as Buffer);
        wb.worksheets[0].getRow(8).getCell(6).value = 2761;    // só a 1ª
        const r = await importarPlanilhaCotacao(await wb.xlsx.writeBuffer() as Buffer);
        expect(r.linhas).toHaveLength(1);
        expect(r.avisos.some(a => a.includes('Piso deck'))).toBe(true);
    });

    it('arquivo que não é do sistema é rejeitado com mensagem clara', async () => {
        const estranho = new ExcelJS.Workbook();
        estranho.addWorksheet('Qualquer').getCell('A1').value = 'planilha alheia';
        await expect(importarPlanilhaCotacao(await estranho.xlsx.writeBuffer() as Buffer))
            .rejects.toThrow(/não é uma cotação/);
    });
});

describe('round-trip do CADASTRO (RF-027/028)', () => {
    it('gera com autocomplete, fornecedor completa, importa com CNPJ limpo', async () => {
        const buf = await gerarPlanilhaCadastroFornecedor({ razao_social: 'Tendas Boi Bravo' });
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buf as Buffer);
        const ws = wb.worksheets[0];
        // pré-preenchimento (RF-027) na célula destravada:
        expect(ws.getCell('C6').value).toBe('Tendas Boi Bravo');
        expect(ws.getCell('C6').protection?.locked).toBe(false);
        // fornecedor preenche CNPJ com máscara e cidade:
        ws.getCell('C7').value = '00.394.460/0058-87';
        let linhaCidade = 0;
        ws.eachRow((row, n) => {
            if (String(row.getCell(1).value ?? '') === 'cidade') linhaCidade = n;
        });
        ws.getRow(linhaCidade).getCell(3).value = 'Perdizes';

        const r = await importarPlanilhaCadastroFornecedor(await wb.xlsx.writeBuffer() as Buffer);
        expect(r.campos.razao_social).toBe('Tendas Boi Bravo');
        expect(r.campos.cnpj).toBe('00394460005887');          // limpo p/ dedup (RF-028)
        expect(r.campos.cidade).toBe('Perdizes');
        expect(r.avisos).toEqual([]);
    });

    it('CNPJ inválido vira aviso e campo vazio (nunca entra lixo na chave)', async () => {
        const buf = await gerarPlanilhaCadastroFornecedor();
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buf as Buffer);
        const ws = wb.worksheets[0];
        ws.getCell('C6').value = 'Fornecedor X';
        ws.getCell('C7').value = '11.111.111/1111-11';
        const r = await importarPlanilhaCadastroFornecedor(await wb.xlsx.writeBuffer() as Buffer);
        expect(r.campos.cnpj).toBe('');
        expect(r.avisos.some(a => /CNPJ inválido/.test(a))).toBe(true);
    });

    it('sem razão social → aviso', async () => {
        const buf = await gerarPlanilhaCadastroFornecedor();
        const r = await importarPlanilhaCadastroFornecedor(buf as Buffer);
        expect(r.avisos.some(a => /Razão social/.test(a))).toBe(true);
    });
});
