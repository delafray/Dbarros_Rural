import { describe, it, expect } from 'vitest';
import { PROMPT_CARDAPIO_IA, PROMPT_CARDAPIO_IA_V2 } from './promptCardapioIA';

describe('PROMPT_CARDAPIO_IA_V2 (variante detalhada)', () => {
    it('as âncoras do Prompt 1 existem (senão os replace falham em silêncio)', () => {
        expect(PROMPT_CARDAPIO_IA).toContain(
            '5. Itens com o mesmo preço que mudam só o sabor: UMA linha, com "Sabores: ..." na descrição.'
        );
        expect(PROMPT_CARDAPIO_IA).toContain(
            'O texto final deve estar em português correto e profissional, pronto para impressão.'
        );
    });

    it('V2 contém os dois adendos e o Prompt 1 segue sem eles', () => {
        expect(PROMPT_CARDAPIO_IA_V2).toContain('PREÇOS DIFERENTES');
        expect(PROMPT_CARDAPIO_IA_V2).toContain('regionais, dialetais ou estilizados');
        expect(PROMPT_CARDAPIO_IA).not.toContain('PREÇOS DIFERENTES');
        expect(PROMPT_CARDAPIO_IA).not.toContain('regionais, dialetais ou estilizados');
    });

    it('V2 preserva o restante do prompt (formato de saída e regra dos tamanhos)', () => {
        expect(PROMPT_CARDAPIO_IA_V2).toContain('CATEGORIA | ITEM | VALOR | DESCRIÇÃO');
        expect(PROMPT_CARDAPIO_IA_V2).toContain('220ml - R$ 20,00 / 330ml - R$ 28,00 / 550ml - R$ 37,00');
        expect(PROMPT_CARDAPIO_IA_V2.length).toBeGreaterThan(PROMPT_CARDAPIO_IA.length);
    });
});
