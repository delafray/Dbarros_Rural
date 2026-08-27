import { describe, it, expect, vi, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gerarPdfMenuA4 } from './A4PdfExporter';
import type { CardapioGroup } from '../../utils/cardapioParser';

// fetch mockado: fontes vêm de public/fonts; chancela falha (skip gracioso)
beforeAll(() => {
    vi.stubGlobal('fetch', async (url: string) => {
        const m = /\/fonts\/(.+)$/.exec(url);
        if (!m) return { ok: false } as any;
        const buf = readFileSync(resolve(__dirname, '../../public/fonts', m[1]));
        return {
            ok: true,
            arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
        } as any;
    });
});

const GRUPOS: CardapioGroup[] = [
    {
        categoria: 'BEBIDAS',
        itens: [
            { item: 'Caldo de Cana', valor: '300ml - R$ 10,00 / 500ml - R$ 15,00 / 700ml - R$ 20,00', descricao: '' },
            { item: 'Água', valor: 'R$ 26,00', descricao: '12 unidades. Com ou sem gás' },
        ],
    },
    {
        categoria: 'PORÇÕES',
        itens: [
            { item: 'Isca de Frango com Batata', valor: 'R$ 45,00', descricao: 'Acompanha batata' },
        ],
    },
];

describe('gerarPdfMenuA4 (PDF vetorial do menu A4)', () => {
    it('gera um PDF válido com as fontes embutidas', async () => {
        const blob = await gerarPdfMenuA4(
            'PASTELARIA E PETISCOS',
            'TABELA EXCLUSIVA ESTANDE / EXPOSITOR PAVILHÃO B / CAMAROTE',
            GRUPOS
        );
        const buf = Buffer.from(await blob.arrayBuffer());
        expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
        // fontes TTF embutidas (subset) → arquivo bem maior que um PDF vazio
        expect(buf.length).toBeGreaterThan(50_000);
        // Sem fontes-padrão não usadas — o Corel pedia substituição delas
        expect(buf.includes('ZapfDingbats')).toBe(false);
        expect(buf.includes('Times-Roman')).toBe(false);
    }, 30_000);

    it('gera também com juntar linhas e categorias ocultas', async () => {
        const blob = await gerarPdfMenuA4('BEBIDAS', 'CHARLES', GRUPOS, {
            fontesA4: { linhas: 0.8, mostrarCategorias: false },
            forcarUmaColuna: true,
        });
        const buf = Buffer.from(await blob.arrayBuffer());
        expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    }, 30_000);
});
