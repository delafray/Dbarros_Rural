import { describe, it, expect, vi, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gerarPdfA3, nomeArquivoPdfA3 } from './A3PdfExporter';
import { FONTES_A3_PADRAO, A3DuploMenuData, LayoutResult } from './a3DuploLayout';
import { resolveTema } from '../../utils/cardapioTema';

// fetch mockado: fontes vêm de public/fonts (Node não tem fetch de /fonts)
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

describe('gerarPdfA3 (PDF vetorial p/ Corel)', () => {
    it('gera um PDF válido com fontes embutidas, variantes e categorias ocultas', async () => {
        const menus: A3DuploMenuData[] = [
            {
                empresa: 'CHARLES',
                titulo: 'PASTELARIA',
                itens: [
                    { categoria: 'BEBIDAS', itens: [
                        { item: 'Caldo de Cana', valor: '300ml - R$ 10,00 / 500ml - R$ 15,00', descricao: '' },
                        { item: 'Pastelão', valor: 'R$ 15,00', descricao: 'Sabores: carne ou queijo' },
                    ]},
                ],
            },
        ];
        const layout: LayoutResult = {
            scale: 1,
            spacing: 1,
            numColunas: 2,
            paginas: [[[{ menuIdx: 0, grupos: menus[0].itens, isContinuacao: false }]]],
        };
        const blob = await gerarPdfA3({
            menus,
            layout,
            fontes: { ...FONTES_A3_PADRAO, linhas: 0.85, mostrarCategorias: false },
            tema: resolveTema(null),
            fundoUrl: null,
        });
        const buf = Buffer.from(await blob.arrayBuffer());
        expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
        expect(buf.length).toBeGreaterThan(50_000); // fontes TTF embutidas
        // Sem fontes-padrão não usadas — o Corel pedia substituição delas
        expect(buf.includes('ZapfDingbats')).toBe(false);
        expect(buf.includes('Times-Roman')).toBe(false);
    }, 30_000);

    it('nomeArquivoPdfA3 monta o nome amigável e remove caracteres inválidos', () => {
        expect(nomeArquivoPdfA3('91ª EXPOZEBU', 10)).toBe('Cardápio A3 - 91ª EXPOZEBU - 10 parceiros.pdf');
        expect(nomeArquivoPdfA3('A/B', 1)).toBe('Cardápio A3 - A-B - 1 parceiro.pdf');
        expect(nomeArquivoPdfA3(null, 2)).toBe('Cardápio A3 - Evento - 2 parceiros.pdf');
    });
});
