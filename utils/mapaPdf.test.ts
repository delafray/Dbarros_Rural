import { describe, it, expect } from 'vitest';
import { jsPDF } from 'jspdf';
import { desenharMapaPdf } from './mapaPdf';

const rect = (x: number, y: number, w: number, h: number) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const est = (codigo: string, x: number, y: number, w = 17.4, h = 17.4, area: number | null = 25) => ({
    codigo, stand_nr: codigo.replace('-', ' '), familia: codigo.split('-')[0], pontos: rect(x, y, w, h),
    centro: [x + w / 2, y + h / 2] as [number, number], area,
});

describe('mapaPdf — PDF vetorial A3 do mapa (botão Imprimir)', () => {
    it('página do tamanho exato do viewBox (A3 deitado), polígonos e textos entram no stream', () => {
        const doc = new jsPDF({ unit: 'pt', format: [1190.55, 841.89], orientation: 'landscape' });
        desenharMapaPdf(doc, {
            viewBox: '0 0 1190.55 841.89',
            mostrarNomes: false,
            itens: [
                { estande: est('P-01', 100, 100), status: 'vendido', rotuloMapa: 'Haras Canaan' },
                { estande: est('PR-02', 130, 100), status: 'reservado', rotuloMapa: null },
                { estande: est('L-03', 160, 100, 40, 3, 100), status: 'livre', rotuloMapa: null },
            ],
        }, false);
        expect(doc.internal.pageSize.getWidth()).toBeCloseTo(1190.55, 1);
        expect(doc.internal.pageSize.getHeight()).toBeCloseTo(841.89, 1);
        const src = doc.output();
        expect(src).toContain('/Type /Page');
        // textos no PDF aparecem como "(…) Tj"; "m" solto é operador moveto, por isso o parêntese
        expect(src).toContain('(P-01)');
        expect(src).toContain('(PR-02)');
        expect(src).toContain('(25 m');       // metragem abaixo do código (estande alto o bastante)
        expect(src).not.toContain('(L-03)');  // L-03 baixo demais (3 pt): sem rótulo nenhum
        expect(src).not.toContain('(100 m');
        expect(src).not.toContain('/Subtype /Image'); // sem fundo: nada raster
    });

    it('modo Nomes: usa o rótulo do mapa; estande sem cliente cai no código', () => {
        const doc = new jsPDF({ unit: 'pt', format: [1190.55, 841.89] });
        desenharMapaPdf(doc, {
            viewBox: '0 0 1190.55 841.89',
            mostrarNomes: true,
            itens: [
                { estande: est('P-01', 100, 100), status: 'vendido', rotuloMapa: 'META AGRONEG' },
                { estande: est('P-02', 130, 100), status: 'livre', rotuloMapa: null },
            ],
        }, false);
        const src = doc.output();
        // nome composto no 5x5 vai em duas linhas: "META" / "AGRONEG"
        expect(src).toContain('(META)');
        expect(src).toContain('(AGRONEG)');
        expect(src).not.toContain('(P-01)');
        expect(src).toContain('(P-02)');
    });

    it('viewBox inválido é erro claro', () => {
        const doc = new jsPDF();
        expect(() => desenharMapaPdf(doc, { viewBox: 'x', mostrarNomes: false, itens: [] }, false)).toThrow('viewBox');
    });
});
