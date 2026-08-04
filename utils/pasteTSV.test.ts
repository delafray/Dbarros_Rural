import { describe, it, expect } from 'vitest';
import { parseTSV, detectarColunas, ehLinhaDeSecao, processarPaste } from './pasteTSV';

const T = '\t';

describe('parseTSV (a cicatriz do paste emendado)', () => {
    it('quebra de linha DENTRO de célula não vira linha nova', () => {
        // Caso real das planilhas: "Back Drop 5,00 x 2,00\n9,00 x 2,00" numa célula
        const texto = `Back Drop${T}"5,00 x 2,00\n9,00 x 2,00"${T}5000\nBlimps${T}und${T}700`;
        const m = parseTSV(texto);
        expect(m).toHaveLength(2);
        expect(m[0][1]).toContain('9,00 x 2,00');
    });
    it('CRLF do Windows e linhas vazias', () => {
        const m = parseTSV(`a${T}1\r\n\r\nb${T}2\r\n`);
        expect(m).toHaveLength(2);
    });
    it('vazio → matriz vazia', () => {
        expect(parseTSV('')).toEqual([]);
        expect(parseTSV('   ')).toEqual([]);
    });
});

describe('detectarColunas (cabeçalho real das planilhas do usuário)', () => {
    it('reconhece ITENS | QTDE | QTDE | DISCRICAO | VALOR UNIT. | VALOR TOTAL', () => {
        const m = parseTSV(
            `ITENS${T}ITENS${T}QTDE${T}QTDE${T}DISCRICAO${T}VALOR UNIT.${T}VALOR TOTAL`,
        );
        const mapa = detectarColunas(m);
        expect(mapa.temCabecalho).toBe(true);
        expect(mapa.quantidade).toBe(2);
        expect(mapa.fator).toBe(3);       // 2ª QTDE = fator (RF-053)
        expect(mapa.precoUnitario).toBe(5); // VALOR UNIT, não VALOR TOTAL
        expect(mapa.formato).toBe(4);       // DISCRICAO
    });
    it('sem cabeçalho → posicional com aviso', () => {
        const mapa = detectarColunas(parseTSV(`Gelo${T}10${T}30,00`));
        expect(mapa.temCabecalho).toBe(false);
        expect(mapa.descricao).toBe(0);
    });
});

describe('ehLinhaDeSecao (seções e subtotais das planilhas reais)', () => {
    it('célula mesclada exportada (texto repetido) é seção', () => {
        expect(ehLinhaDeSecao(['GIROLANDO', 'GIROLANDO', 'GIROLANDO', 'GIROLANDO'])).toBe(true);
    });
    it('SUBTOTAL e CUSTO TOTAL são ignorados', () => {
        expect(ehLinhaDeSecao(['SUBTOTAL (A)', '', '', '40126.8'])).toBe(true);
        expect(ehLinhaDeSecao(['CUSTO TOTAL (A+B+C)', '', '', ''])).toBe(true);
    });
    it('linha de item normal passa', () => {
        expect(ehLinhaDeSecao(['1', 'Tendas Estandes', '29', '1', 'Tendas (5x5)', '2761'])).toBe(false);
    });
});

describe('processarPaste — colagem da planilha real de Perdizes', () => {
    const pastePerdizes = [
        `ITENS${T}ITENS${T}QTDE${T}QTDE${T}DISCRICAO${T}VALOR UNIT.${T}VALOR TOTAL`,
        `CUSTOS JULGAMENTO${T}CUSTOS JULGAMENTO${T}CUSTOS JULGAMENTO${T}CUSTOS JULGAMENTO${T}CUSTOS JULGAMENTO${T}CUSTOS JULGAMENTO${T}CUSTOS JULGAMENTO`,
        `1${T}Pró Labore Jurado Girolando${T}1${T}3${T}Julgamento${T}8000${T}8000`,
        `7${T}Alimentação Jurado Girolando${T}2${T}3${T}Alimentação${T}40${T}240`,
        `10${T}Deslocamento Jurado${T}240${T}2${T}Km rodado${T}1,76${T}844,8`,
        `SUBTOTAL (A)${T}${T}${T}${T}${T}${T}40126,8`,
        `1${T}Tendas Estandes Expositores${T}29${T}1${T}Tendas (5x5)${T}2.761${T}80.069`,
    ].join('\n');

    it('extrai os itens com qtd × fator × preço BR e ignora seções/subtotais', () => {
        const r = processarPaste(pastePerdizes);
        expect(r.linhas).toHaveLength(4);
        expect(r.ignoradas).toBe(2); // seção mesclada + subtotal

        const jurado = r.linhas[0];
        expect(jurado.descricao).toBe('Pró Labore Jurado Girolando'); // pulou o nº do item
        expect(jurado.quantidade).toBe(1);
        expect(jurado.fator).toBe(3);
        expect(jurado.precoUnitario).toBe(8000);

        const km = r.linhas[2];
        expect(km.quantidade).toBe(240);
        expect(km.fator).toBe(2);
        expect(km.precoUnitario).toBe(1.76);   // vírgula BR

        const tendas = r.linhas[3];
        expect(tendas.quantidade).toBe(29);
        expect(tendas.precoUnitario).toBe(2761); // "2.761" milhar BR
        expect(tendas.formato).toBe('Tendas (5x5)');
    });

    it('paste sem cabeçalho: posicional + aviso de conferência', () => {
        const r = processarPaste(`Gelo${T}10${T}R$ 30,00\nGás P45${T}2${T}150`);
        expect(r.linhas).toHaveLength(2);
        expect(r.linhas[0]).toMatchObject({ descricao: 'Gelo', quantidade: 10, precoUnitario: 30 });
        expect(r.avisos.some(a => /confira/i.test(a))).toBe(true);
    });

    it('lixo total não explode: vira aviso', () => {
        const r = processarPaste('\t\t\n\t\t');
        expect(r.linhas).toHaveLength(0);
        expect(r.avisos.length).toBeGreaterThan(0);
    });

    it('linha só numérica é ignorada, não vira item fantasma', () => {
        const r = processarPaste(`Piso${T}10${T}20\n123${T}456${T}789`);
        expect(r.linhas).toHaveLength(1);
        expect(r.ignoradas).toBe(1);
    });

    it('quantidade suja cai para 1, preço sujo cai para null (RNF-002)', () => {
        const r = processarPaste(`Tenda${T}abc${T}xyz`);
        expect(r.linhas[0]).toMatchObject({ quantidade: 1, fator: 1, precoUnitario: null });
    });
});
