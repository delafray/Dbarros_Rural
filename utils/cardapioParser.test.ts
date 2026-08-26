import { describe, it, expect } from 'vitest';
import {
    parseCardapioText,
    gerarTextoCardapio,
    splitGroups,
    getItemWeight,
    calcFontSize,
    parseValorComposto,
    formatValorInline,
    VARIANTES_EMPILHA_MIN,
    type CardapioGroup,
} from './cardapioParser';

const TSV = [
    'Churrasco BBQ',
    'Masmorra',
    'CATEGORIA\tITEM\tVALOR (R$)\tDESCRIÇÃO',
    'Carnes\tPicanha\t50,00\tao ponto',
    'Carnes\tCostela\t40,00\t',
    'Bebidas\tCerveja\t10,00\tlong neck',
].join('\n');

describe('parseCardapioText', () => {
    it('extrai título e empresa (em maiúsculas) das duas primeiras linhas', () => {
        const p = parseCardapioText(TSV)!;
        expect(p.titulo).toBe('CHURRASCO BBQ');
        expect(p.empresa).toBe('MASMORRA');
    });

    it('agrupa itens por categoria na ordem de primeira aparição', () => {
        const p = parseCardapioText(TSV)!;
        expect(p.grupos.map((g) => g.categoria)).toEqual(['CARNES', 'BEBIDAS']);
        expect(p.grupos[0].itens).toHaveLength(2);
        expect(p.grupos[0].itens[0]).toEqual({ item: 'Picanha', valor: '50,00', descricao: 'ao ponto' });
        expect(p.grupos[1].itens[0].item).toBe('Cerveja');
    });

    it('pula a linha de cabeçalho mesmo se não estiver na 3ª posição', () => {
        const semHeaderFixo = 'Titulo\nEmpresa\nCarnes\tPicanha\t50\t';
        // sem linha CATEGORIA/ITEM, dataStartIdx fica em 2 → primeira linha de dados é lida
        const p = parseCardapioText(semHeaderFixo)!;
        expect(p.grupos[0].categoria).toBe('CARNES');
    });

    it('retorna null quando há menos de 2 linhas não vazias', () => {
        expect(parseCardapioText('')).toBeNull();
        expect(parseCardapioText('   \n\n  ')).toBeNull();
        expect(parseCardapioText('SóTitulo')).toBeNull();
    });

    it('ignora linhas com menos de 2 colunas ou com item vazio', () => {
        // 'Carnes' sozinho → 1 coluna (pulada); 'Bebidas\t\t5\tx' → item vazio (pulado)
        const t = 'T\nE\nCATEGORIA\tITEM\tVALOR\tDESC\nCarnes\nBebidas\t\t5\tx';
        const p = parseCardapioText(t)!;
        expect(p.grupos).toHaveLength(0);
    });
});

describe('gerarTextoCardapio (inverso do parse)', () => {
    it('faz round-trip estável a partir da estrutura parseada', () => {
        const p = parseCardapioText(TSV)!;
        const texto = gerarTextoCardapio(p.titulo, p.empresa, p.grupos);
        const reparse = parseCardapioText(texto)!;
        expect(reparse.titulo).toBe(p.titulo);
        expect(reparse.empresa).toBe(p.empresa);
        expect(reparse.grupos).toEqual(p.grupos);
    });

    it('limpa tabs e quebras de linha que corromperiam o TSV', () => {
        const grupos: CardapioGroup[] = [
            { categoria: 'Carnes', itens: [{ item: 'Pic\tanha', valor: '5\n0', descricao: 'ao\rponto' }] },
        ];
        const texto = gerarTextoCardapio('Tit', 'Emp', grupos);
        // nenhuma célula de dado deve conter tab/CR/LF interno além dos separadores
        const linhaDado = texto.split('\n')[3];
        expect(linhaDado).toBe('CARNES\tPic anha\t5 0\tao ponto');
    });
});

describe('parseValorComposto / formatValorInline', () => {
    it('preço simples não é composto', () => {
        expect(parseValorComposto('R$ 20,00')).toBeNull();
        expect(parseValorComposto('')).toBeNull();
    });

    it('reconhece 2 variantes P/G', () => {
        const v = parseValorComposto('P - R$ 30,00 / G - R$ 35,00')!;
        expect(v).toEqual([
            { rotulo: 'P', preco: 'R$ 30,00' },
            { rotulo: 'G', preco: 'R$ 35,00' },
        ]);
    });

    it('reconhece 3+ variantes com rótulos nomeados', () => {
        const v = parseValorComposto('300ml - R$ 10,00 / 500ml - R$ 15,00 / 700ml - R$ 20,00')!;
        expect(v.map((x) => x.rotulo)).toEqual(['300ml', '500ml', '700ml']);
        expect(v.map((x) => x.preco)).toEqual(['R$ 10,00', 'R$ 15,00', 'R$ 20,00']);
    });

    it('reconhece 4 variantes (caso Batata no Cone)', () => {
        const v = parseValorComposto('Pequena - R$ 15,00 / Média - R$ 25,00 / Grande - R$ 30,00 / Caixa - R$ 40,00')!;
        expect(v).toHaveLength(4);
        expect(v[3]).toEqual({ rotulo: 'Caixa', preco: 'R$ 40,00' });
    });

    it('normaliza "R$" colado no número e aceita en-dash', () => {
        const v = parseValorComposto('P – R$30,00 / G – R$35,00')!;
        expect(v[0].preco).toBe('R$ 30,00');
    });

    it('barra sem o padrão rótulo-preço não vira composto', () => {
        expect(parseValorComposto('R$ 20,00 / kg')).toBeNull();
        expect(parseValorComposto('meio / inteiro')).toBeNull();
    });

    it('formatValorInline junta com separador ·', () => {
        const v = parseValorComposto('P - R$ 30,00 / G - R$ 35,00')!;
        expect(formatValorInline(v)).toBe('P R$ 30,00 · G R$ 35,00');
    });
});

describe('layout: getItemWeight / splitGroups / calcFontSize', () => {
    it('item com descrição pesa mais que item sem descrição', () => {
        const semDesc = getItemWeight({ item: 'X', valor: '1', descricao: '' });
        const comDesc = getItemWeight({ item: 'X', valor: '1', descricao: 'algo' });
        expect(comDesc).toBeGreaterThan(semDesc);
    });

    it('item empilhado (3+ variantes) pesa mais que item de preço simples', () => {
        const simples = getItemWeight({ item: 'X', valor: 'R$ 10,00', descricao: '' });
        const duasVar = getItemWeight({ item: 'X', valor: 'P - R$ 30,00 / G - R$ 35,00', descricao: '' });
        const tresVar = getItemWeight({
            item: 'X',
            valor: '300ml - R$ 10,00 / 500ml - R$ 15,00 / 700ml - R$ 20,00',
            descricao: '',
        });
        // 2 variantes seguem inline → mesma altura do preço simples
        expect(duasVar).toBe(simples);
        // 3+ variantes viram sublinhas → uma linha extra por variante
        expect(VARIANTES_EMPILHA_MIN).toBe(3);
        expect(tresVar).toBeGreaterThan(simples + 2);
    });

    it('descrição longa quebra em mais linhas quando avgCharsPerLine é dado', () => {
        const item = { item: 'X', valor: '1', descricao: 'a'.repeat(60) };
        const umaLinha = getItemWeight(item, 1000);
        const varias = getItemWeight(item, 10); // ~6 linhas
        expect(varias).toBeGreaterThan(umaLinha);
    });

    it('splitGroups: 0 grupos → duas colunas vazias; 1 grupo → tudo na primeira', () => {
        expect(splitGroups([])).toEqual([[], []]);
        const um: CardapioGroup[] = [{ categoria: 'A', itens: [{ item: 'i', valor: '1', descricao: '' }] }];
        expect(splitGroups(um)).toEqual([um, []]);
    });

    it('splitGroups distribui em duas colunas quando há vários grupos', () => {
        const g = (c: string): CardapioGroup => ({ categoria: c, itens: [{ item: 'i', valor: '1', descricao: '' }] });
        const [esq, dir] = splitGroups([g('A'), g('B'), g('C'), g('D')]);
        expect(esq.length).toBeGreaterThan(0);
        expect(dir.length).toBeGreaterThan(0);
        expect(esq.length + dir.length).toBe(4);
    });

    it('calcFontSize fica no intervalo [7, 28]', () => {
        const grupos: CardapioGroup[] = [{ categoria: 'A', itens: [{ item: 'i', valor: '1', descricao: '' }] }];
        expect(calcFontSize([], 500)).toBe(16); // sem grupos → default
        expect(calcFontSize(grupos, 0)).toBe(16); // altura inválida → default
        const fsPequeno = calcFontSize(grupos, 10);
        const fsGrande = calcFontSize(grupos, 100000);
        expect(fsPequeno).toBeGreaterThanOrEqual(7);
        expect(fsGrande).toBeLessThanOrEqual(28);
    });
});
