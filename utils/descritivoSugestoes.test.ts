import { describe, expect, it } from 'vitest';
import {
    mesclarComBusca,
    normalizarTexto,
    parseQuantidade,
    produtosDoGrupo,
    resolverProdutoPorNome,
    sugerirLocal,
    type ProdutoCatalogoLeve,
} from './descritivoSugestoes';

const G1 = 'grupo-tenda';
const G2 = 'grupo-piso';

const catalogo: ProdutoCatalogoLeve[] = [
    { id: 'p1', nome: 'Tenda piramidal 5,00x5,00m', unidade: 'un', grupo_id: G1, frequencia_uso: 85, ativo: true },
    { id: 'p2', nome: 'Tenda piramidal 10,00x10,00m', unidade: 'un', grupo_id: G1, frequencia_uso: 70, ativo: true },
    { id: 'p3', nome: 'Tenda piramidal 3,00x3,00m', unidade: 'un', grupo_id: G1, frequencia_uso: 3, ativo: true },
    { id: 'p4', nome: 'Fechamento lateral em lona com ilhós para tenda 5x5', unidade: 'un', grupo_id: G1, frequencia_uso: 40, ativo: false },
    { id: 'p5', nome: 'Revestimento do piso em Deck', unidade: 'm2', grupo_id: G2, frequencia_uso: 200, ativo: true },
];

describe('produtosDoGrupo', () => {
    it('filtra pelo grupo e ordena por frequência (mais usados primeiro)', () => {
        const r = produtosDoGrupo(catalogo, G1);
        expect(r.map(p => p.id)).toEqual(['p1', 'p2', 'p4', 'p3']);
    });

    it('grupo sem produtos → vazio', () => {
        expect(produtosDoGrupo(catalogo, 'inexistente')).toEqual([]);
    });
});

describe('sugerirLocal (comportamento original do Prosperitas)', () => {
    const grupo = produtosDoGrupo(catalogo, G1);

    it('substring case-insensitive, preservando a ordem por uso', () => {
        const r = sugerirLocal(grupo, 'tenda');
        expect(r.map(s => s.id)).toEqual(['p1', 'p2', 'p4', 'p3']);
    });

    it('filtra por trecho específico', () => {
        expect(sugerirLocal(grupo, '10,00').map(s => s.id)).toEqual(['p2']);
    });

    it('query vazia/espaços → nada (dropdown fechado)', () => {
        expect(sugerirLocal(grupo, '   ')).toEqual([]);
    });

    it('respeita o teto de sugestões', () => {
        expect(sugerirLocal(grupo, 'tenda', 2)).toHaveLength(2);
    });

    it('mapeia badge de uso, sigla e inativo', () => {
        const r = sugerirLocal(grupo, 'ilhós');
        expect(r[0]).toMatchObject({ id: 'p4', uso: 40, sigla: 'un', ativo: false });
    });
});

describe('mesclarComBusca (RF-058: a busca lidera, o local completa)', () => {
    const grupo = produtosDoGrupo(catalogo, G1);

    it('resultado da busca vem primeiro, sem duplicar com o local', () => {
        const locais = sugerirLocal(grupo, 'tenda');
        // busca "Mercado Livre" devolveu p3 no topo (ex.: typo corrigido)
        const r = mesclarComBusca(grupo, locais, [{ id: 'p3' }]);
        expect(r.map(s => s.id)).toEqual(['p3', 'p1', 'p2', 'p4']);
    });

    it('descarta resultado da busca que não é do grupo da seção', () => {
        const locais = sugerirLocal(grupo, 'tenda');
        const r = mesclarComBusca(grupo, locais, [{ id: 'p5' }]);
        expect(r.map(s => s.id)).toEqual(['p1', 'p2', 'p4', 'p3']);
    });

    it('respeita o teto mesmo com busca + local', () => {
        const locais = sugerirLocal(grupo, 'tenda');
        const r = mesclarComBusca(grupo, locais, [{ id: 'p3' }], 2);
        expect(r.map(s => s.id)).toEqual(['p3', 'p1']);
    });

    it('busca vazia → só o local', () => {
        const locais = sugerirLocal(grupo, '5x5');
        expect(mesclarComBusca(grupo, locais, [])).toEqual(locais);
    });
});

describe('resolverProdutoPorNome (o doAddItem original resolve por nome)', () => {
    const grupo = produtosDoGrupo(catalogo, G1);

    it('acha por nome exato ignorando caixa e espaços das pontas', () => {
        expect(resolverProdutoPorNome(grupo, '  tenda piramidal 5,00x5,00m ')?.id).toBe('p1');
    });

    it('nome que não casa → null (vira item sem produto? não: exige catálogo)', () => {
        expect(resolverProdutoPorNome(grupo, 'tenda 99x99')).toBeNull();
    });

    it('vazio → null', () => {
        expect(resolverProdutoPorNome(grupo, '')).toBeNull();
    });
});

describe('normalizarTexto (sem LIKE sensível a acento em fase nenhuma)', () => {
    it('remove acentos e baixa a caixa como o unaccent do banco', () => {
        expect(normalizarTexto('Elétrica')).toBe('eletrica');
        expect(normalizarTexto('IMPRESSÃO À MÃO')).toBe('impressao a mao');
        expect(normalizarTexto('bagum')).toBe('bagum');
    });
    it('filtro local acha "Tenda piramidal" digitando sem cedilha/acento', () => {
        const grupo: ProdutoCatalogoLeve[] = [
            { id: 'x', nome: 'Instalação elétrica básica', unidade: 'un', grupo_id: 'g', frequencia_uso: 1, ativo: true },
        ];
        expect(sugerirLocal(grupo, 'instalacao eletrica')).toHaveLength(1);
        expect(resolverProdutoPorNome(grupo, 'INSTALACAO ELETRICA BASICA')?.id).toBe('x');
    });
});

describe('parseQuantidade', () => {
    it('aceita vírgula decimal', () => expect(parseQuantidade('2,5')).toBe(2.5));
    it('aceita ponto', () => expect(parseQuantidade('18')).toBe(18));
    it('zero → null', () => expect(parseQuantidade('0')).toBeNull());
    it('lixo → null', () => expect(parseQuantidade('abc')).toBeNull());
    it('vazio → null', () => expect(parseQuantidade('')).toBeNull());
});
