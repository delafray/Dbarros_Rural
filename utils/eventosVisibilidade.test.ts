import { describe, expect, it } from 'vitest';
import { edicaoEmSimulacao, eventoOcultoPorSimulacao } from './eventosVisibilidade';

describe('edicaoEmSimulacao', () => {
    it('simulacao → true', () => {
        expect(edicaoEmSimulacao({ status_custos: 'simulacao' })).toBe(true);
    });
    it('rascunho/confirmada/encerrada/sem status → false', () => {
        expect(edicaoEmSimulacao({ status_custos: 'rascunho' })).toBe(false);
        expect(edicaoEmSimulacao({ status_custos: 'confirmada' })).toBe(false);
        expect(edicaoEmSimulacao({ status_custos: null })).toBe(false);
        expect(edicaoEmSimulacao({})).toBe(false);
        expect(edicaoEmSimulacao(undefined)).toBe(false);
    });
});

describe('eventoOcultoPorSimulacao', () => {
    it('todas as edições em simulação → oculto (evento-estudo do módulo)', () => {
        expect(eventoOcultoPorSimulacao([
            { status_custos: 'simulacao' },
            { status_custos: 'simulacao' },
        ])).toBe(true);
    });
    it('evento sem edições → visível (rascunho normal da gestão)', () => {
        expect(eventoOcultoPorSimulacao([])).toBe(false);
        expect(eventoOcultoPorSimulacao(null)).toBe(false);
        expect(eventoOcultoPorSimulacao(undefined)).toBe(false);
    });
    it('evento real com uma simulação por cima → visível (tem edição real)', () => {
        expect(eventoOcultoPorSimulacao([
            { status_custos: 'rascunho' },
            { status_custos: 'simulacao' },
        ])).toBe(false);
    });
    it('edição sem a coluna (types antigos) → visível', () => {
        expect(eventoOcultoPorSimulacao([{}])).toBe(false);
    });
});
