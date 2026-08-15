import { describe, it, expect } from 'vitest';
import { podeVerCentroCusto } from './acessoCustos';

describe('podeVerCentroCusto (RF-060 — acesso exclusivo em produção)', () => {
    it('autoriza o e-mail do dono da licença', () => {
        expect(podeVerCentroCusto({ email: 'ronaldo@ronaldoborba.com.br' })).toBe(true);
    });

    it('autoriza com variação de caixa e espaços', () => {
        expect(podeVerCentroCusto({ email: '  RONALDO@RonaldoBorba.com.BR ' })).toBe(true);
    });

    it('nega qualquer outro usuário, mesmo admin', () => {
        expect(podeVerCentroCusto({ email: 'admin@dbarros.com.br' })).toBe(false);
        expect(podeVerCentroCusto({ email: 'ronaldo@outrodominio.com.br' })).toBe(false);
    });

    it('nega prefixo/sufixo parecidos (não é substring)', () => {
        expect(podeVerCentroCusto({ email: 'ronaldo@ronaldoborba.com.br.evil.com' })).toBe(false);
        expect(podeVerCentroCusto({ email: 'xronaldo@ronaldoborba.com.br' })).toBe(false);
    });

    it('nega usuário nulo, indefinido ou sem e-mail', () => {
        expect(podeVerCentroCusto(null)).toBe(false);
        expect(podeVerCentroCusto(undefined)).toBe(false);
        expect(podeVerCentroCusto({})).toBe(false);
        expect(podeVerCentroCusto({ email: '' })).toBe(false);
    });
});
