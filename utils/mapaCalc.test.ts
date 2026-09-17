import { describe, it, expect } from 'vitest';
import {
    normalizarCodigo, codigoDaPlanta, statusDoEstande, indexarPlanilha, linhaDoEstande,
    resumoPorFamilia, resumoGeral, estandesForaDoMapa, parseViewBox, pontosParaAtributo,
    ESTILO_STATUS, ORDEM_STATUS, type EstandeMapa, type LinhaPlanilhaMapa,
} from './mapaCalc';

const est = (codigo: string, familia = codigo[0]): EstandeMapa => ({
    codigo, stand_nr: codigo.replace('-', ' '), familia, pontos: [[0, 0], [1, 0], [1, 1], [0, 1]], centro: [0.5, 0.5],
});

describe('normalizarCodigo (planta "P-01" ⇄ planilha "P 01")', () => {
    it('converte hífen, sem separador e minúsculas para o formato da planilha', () => {
        expect(normalizarCodigo('P-01')).toBe('P 01');
        expect(normalizarCodigo('p01')).toBe('P 01');
        expect(normalizarCodigo('P 1')).toBe('P 01');
        expect(normalizarCodigo(' L-20 ')).toBe('L 20');
    });
    it('devolve null para o que não é código', () => {
        expect(normalizarCodigo('')).toBeNull();
        expect(normalizarCodigo(null)).toBeNull();
        expect(normalizarCodigo('25m²')).toBeNull();
        expect(normalizarCodigo('AL PREMIUM 01')).toBeNull();
    });
    it('codigoDaPlanta faz o caminho inverso e preserva o que não reconhece', () => {
        expect(codigoDaPlanta('P 01')).toBe('P-01');
        expect(codigoDaPlanta('XYZ')).toBe('XYZ');
    });
});

describe('statusDoEstande (marcas da planilha)', () => {
    it('sem linha na planilha → sem_planilha', () => {
        expect(statusDoEstande(undefined)).toBe('sem_planilha');
        expect(statusDoEstande(null)).toBe('sem_planilha');
    });
    it('DISPONÍVEL sem cliente → livre', () => {
        expect(statusDoEstande({ stand_nr: 'P 01', tipo_venda: 'DISPONÍVEL' })).toBe('livre');
        expect(statusDoEstande({ stand_nr: 'P 01', tipo_venda: null })).toBe('livre');
        expect(statusDoEstande({ stand_nr: 'P 01', tipo_venda: '' })).toBe('livre');
    });
    it('x (tipo de venda sem *) → vendido, seja STAND PADRÃO ou COMBO', () => {
        expect(statusDoEstande({ stand_nr: 'P 01', tipo_venda: 'STAND PADRÃO' })).toBe('vendido');
        expect(statusDoEstande({ stand_nr: 'P 01', tipo_venda: 'COMBO 03' })).toBe('vendido');
    });
    it('* (cortesia/permuta) → cortesia', () => {
        expect(statusDoEstande({ stand_nr: 'P 01', tipo_venda: 'STAND PADRÃO*' })).toBe('cortesia');
        expect(statusDoEstande({ stand_nr: 'P 01', tipo_venda: 'COMBO 01*' })).toBe('cortesia');
    });
    it('cliente anotado sem x/* → reservado (id ou nome livre)', () => {
        expect(statusDoEstande({ stand_nr: 'P 01', tipo_venda: 'DISPONÍVEL', cliente_id: 'c1' })).toBe('reservado');
        expect(statusDoEstande({ stand_nr: 'P 01', tipo_venda: 'DISPONÍVEL', cliente_nome_livre: 'Fulano' })).toBe('reservado');
        expect(statusDoEstande({ stand_nr: 'P 01', tipo_venda: 'DISPONÍVEL', cliente_nome_livre: '   ' })).toBe('livre');
    });
    it('venda com cliente continua vendido (x manda sobre reserva)', () => {
        expect(statusDoEstande({ stand_nr: 'P 01', tipo_venda: 'COMBO 02', cliente_id: 'c1' })).toBe('vendido');
    });
});

describe('estilos', () => {
    it('todo status tem estilo e verde/azul iguais aos da planilha', () => {
        for (const s of ORDEM_STATUS) expect(ESTILO_STATUS[s].fill).toMatch(/^#[0-9A-F]{6}$/i);
        expect(ESTILO_STATUS.vendido.fill).toBe('#00B050');
        expect(ESTILO_STATUS.cortesia.fill).toBe('#00B0F0');
    });
});

describe('índice e resumos', () => {
    const linhas: LinhaPlanilhaMapa[] = [
        { stand_nr: 'P 01', tipo_venda: 'STAND PADRÃO' },
        { stand_nr: 'P 02', tipo_venda: 'COMBO 01*' },
        { stand_nr: 'P 03', tipo_venda: 'DISPONÍVEL', cliente_nome_livre: 'Reserva' },
        { stand_nr: 'L 01', tipo_venda: 'DISPONÍVEL' },
        { stand_nr: 'L 99', tipo_venda: 'DISPONÍVEL' }, // só na planilha
    ];
    const estandes = [est('P-01'), est('P-02'), est('P-03'), est('P-04'), est('L-01')];

    it('indexarPlanilha casa pelo código normalizado', () => {
        const idx = indexarPlanilha(linhas);
        expect(linhaDoEstande(est('P-01'), idx)?.tipo_venda).toBe('STAND PADRÃO');
        expect(linhaDoEstande(est('P-04'), idx)).toBeUndefined();
    });
    it('resumoPorFamilia conta cada status', () => {
        const r = resumoPorFamilia(estandes, indexarPlanilha(linhas));
        expect(r.map((f) => f.familia)).toEqual(['L', 'P']);
        const p = r.find((f) => f.familia === 'P')!;
        expect(p.total).toBe(4);
        expect(p.porStatus).toEqual({ livre: 0, reservado: 1, vendido: 1, cortesia: 1, sem_planilha: 1 });
    });
    it('resumoGeral soma as famílias', () => {
        const g = resumoGeral(estandes, indexarPlanilha(linhas));
        expect(g.total).toBe(5);
        expect(g.porStatus.livre).toBe(1);
    });
    it('estandesForaDoMapa lista o que a planilha tem e a planta não', () => {
        expect(estandesForaDoMapa(estandes, linhas)).toEqual(['L 99']);
    });
    it('listas vazias não quebram', () => {
        expect(resumoPorFamilia([], new Map())).toEqual([]);
        expect(resumoGeral([], new Map()).total).toBe(0);
        expect(estandesForaDoMapa([], [])).toEqual([]);
    });
});

describe('geometria', () => {
    it('parseViewBox aceita "0 0 W H" e rejeita lixo', () => {
        expect(parseViewBox('0 0 1190.55 841.89')).toEqual({ x: 0, y: 0, w: 1190.55, h: 841.89 });
        expect(parseViewBox('0 0 0 10')).toBeNull();
        expect(parseViewBox('abc')).toBeNull();
    });
    it('pontosParaAtributo monta a string do <polygon>', () => {
        expect(pontosParaAtributo([[1, 2], [3, 4], [5, 6]])).toBe('1,2 3,4 5,6');
        expect(pontosParaAtributo(null)).toBe('');
        expect(pontosParaAtributo([[1, 2]])).toBe('');
    });
});
