import { describe, it, expect, beforeEach } from 'vitest';
import { marcarEscritaLocal, campoRecemEscrito, mesclarEcoRealtime, limparEscritasLocais, JANELA_MS } from './escritasLocais';

type Linha = { id: string; tipo_venda: string; cliente_id: string | null; desconto: number };
const linha = (): Linha => ({ id: 'r1', tipo_venda: 'STAND PADRÃO', cliente_id: null, desconto: 0 });

describe('escritasLocais (eco do realtime não desfaz clique rápido)', () => {
    beforeEach(() => limparEscritasLocais());

    it('campo recém-escrito aqui é autoridade local dentro da janela', () => {
        marcarEscritaLocal('r1', { tipo_venda: 'x' }, 1000);
        expect(campoRecemEscrito('r1', 'tipo_venda', 1000 + JANELA_MS - 1)).toBe(true);
        expect(campoRecemEscrito('r1', 'tipo_venda', 1000 + JANELA_MS)).toBe(false);
        expect(campoRecemEscrito('r1', 'cliente_id', 1500)).toBe(false);
        expect(campoRecemEscrito('r2', 'tipo_venda', 1500)).toBe(false);
    });

    it('eco antigo não sobrescreve o campo recém-escrito; os outros campos entram', () => {
        marcarEscritaLocal('r1', { tipo_venda: 'RESERVADO STAND PADRÃO*' }, 1000);
        const local = { ...linha(), tipo_venda: 'RESERVADO STAND PADRÃO*' };
        const eco = { id: 'r1', tipo_venda: 'STAND PADRÃO', cliente_id: 'c9', desconto: 0 };
        const m = mesclarEcoRealtime(local, eco, 1200);
        expect(m.tipo_venda).toBe('RESERVADO STAND PADRÃO*');
        expect(m.cliente_id).toBe('c9');
    });

    it('passada a janela, o eco vale (consistência entre usuários)', () => {
        marcarEscritaLocal('r1', { tipo_venda: 'x' }, 1000);
        const m = mesclarEcoRealtime(linha(), { tipo_venda: 'COMBO 01' }, 1000 + JANELA_MS + 1);
        expect(m.tipo_venda).toBe('COMBO 01');
    });

    it('eco sem mudança devolve o MESMO objeto (não re-renderiza à toa)', () => {
        const l = linha();
        expect(mesclarEcoRealtime(l, { tipo_venda: 'STAND PADRÃO', desconto: 0 }, 5000)).toBe(l);
    });

    it('sequência de cliques rápidos: o último clique vence mesmo com ecos fora de ordem', () => {
        let l = linha();
        marcarEscritaLocal('r1', { tipo_venda: 'RESERVADO STAND PADRÃO*' }, 1000);
        l = { ...l, tipo_venda: 'RESERVADO STAND PADRÃO*' };
        marcarEscritaLocal('r1', { tipo_venda: 'STAND PADRÃO*' }, 1100);
        l = { ...l, tipo_venda: 'STAND PADRÃO*' };
        // eco da 1ª gravação chega depois da 2ª marcação
        l = mesclarEcoRealtime(l, { tipo_venda: 'RESERVADO STAND PADRÃO*' }, 1300);
        expect(l.tipo_venda).toBe('STAND PADRÃO*');
        l = mesclarEcoRealtime(l, { tipo_venda: 'STAND PADRÃO*' }, 1400);
        expect(l.tipo_venda).toBe('STAND PADRÃO*');
    });
});
