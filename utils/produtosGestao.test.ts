import { describe, expect, it } from 'vitest';
import {
    agruparHistoricoPorProduto,
    cadeiaDeModificacoes,
    interpretarErroExclusao,
} from './produtosGestao';
import type { CustoProdutoNomeHistorico } from '../types/custos';

const h = (produto_id: string, nome_anterior: string, nome_novo: string, alterado_em: string): CustoProdutoNomeHistorico => ({
    id: `${produto_id}-${nome_novo}`, produto_id, nome_anterior, nome_novo, alterado_em, alterado_por: null,
});

describe('agruparHistoricoPorProduto', () => {
    it('agrupa mantendo a ordem cronológica recebida', () => {
        const m = agruparHistoricoPorProduto([
            h('p1', 'A', 'B', '2026-01-01T00:00:00Z'),
            h('p2', 'X', 'Y', '2026-02-01T00:00:00Z'),
            h('p1', 'B', 'C', '2026-03-01T00:00:00Z'),
        ]);
        expect(m.get('p1')?.map(x => x.nome_novo)).toEqual(['B', 'C']);
        expect(m.get('p1')?.[0].nome_anterior).toBe('A');  // nome ORIGINAL preservado
        expect(m.get('p2')).toHaveLength(1);
        expect(m.get('p3')).toBeUndefined();
    });
    it('histórico vazio → mapa vazio', () => {
        expect(agruparHistoricoPorProduto([]).size).toBe(0);
    });
});

describe('cadeiaDeModificacoes (o hover do RF-059)', () => {
    it('mostra cada renomeação com data BR', () => {
        const s = cadeiaDeModificacoes([h('p1', 'Tenda velha', 'Tenda nova', '2026-08-04T12:00:00Z')]);
        expect(s).toContain('"Tenda velha" → "Tenda nova"');
        expect(s).toMatch(/em \d{2}\/\d{2}\/\d{4}/);
    });
    it('cadeia com 2 renomeações vira 2 linhas', () => {
        const s = cadeiaDeModificacoes([
            h('p1', 'A', 'B', '2026-01-01T12:00:00Z'),
            h('p1', 'B', 'C', '2026-02-01T12:00:00Z'),
        ]);
        expect(s.split('\n')).toHaveLength(2);
    });
    it('sem histórico → string vazia', () => {
        expect(cadeiaDeModificacoes([])).toBe('');
    });
});

describe('interpretarErroExclusao (trava EM_USO)', () => {
    it('EM_USO vira bloqueio com motivo limpo', () => {
        const r = interpretarErroExclusao(new Error('EM_USO: produto está em 3 item(ns) de evento — desative em vez de excluir'));
        expect(r.bloqueado).toBe(true);
        expect(r.motivo).toMatch(/^produto está em 3/);
    });
    it('outro erro não é bloqueio', () => {
        const r = interpretarErroExclusao(new Error('rede caiu'));
        expect(r).toEqual({ bloqueado: false, motivo: 'rede caiu' });
    });
    it('erro não-Error também funciona', () => {
        expect(interpretarErroExclusao('EM_USO: x').bloqueado).toBe(true);
    });
});
