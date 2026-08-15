import { describe, it, expect } from 'vitest';
import { proximoNivel, rotuloNivel, aplicarSimulacao, NivelSimulacao } from './simulacaoAcesso';
import { podeVerCentroCusto } from './acessoCustos';
import { User } from '../services/authService';

const dono: User = {
    id: '1',
    name: 'Ronaldo',
    email: 'ronaldo@ronaldoborba.com.br',
    isAdmin: true,
    isVisitor: false,
    isActive: true,
    createdAt: '2026-01-01',
    isTemp: false,
    canManageTags: true,
    isProjetista: false,
};

describe('simulação de visão (botão do Dashboard)', () => {
    it('cicla Super Admin → Admin → Usuário → Super Admin', () => {
        expect(proximoNivel(null)).toBe('admin');
        expect(proximoNivel('admin')).toBe('usuario');
        expect(proximoNivel('usuario')).toBe(null);
    });

    it('rotula cada nível como na tela de Usuários', () => {
        expect(rotuloNivel(null)).toBe('Super Admin');
        expect(rotuloNivel('admin')).toBe('Admin');
        expect(rotuloNivel('usuario')).toBe('Usuário');
    });

    it('sem simulação, devolve o usuário real intacto', () => {
        expect(aplicarSimulacao(dono, null)).toBe(dono);
        expect(aplicarSimulacao(null, 'admin')).toBe(null);
    });

    it('nível Admin = admin SEM gestão (como o Bruno)', () => {
        const sim = aplicarSimulacao(dono, 'admin')!;
        expect(sim.isAdmin).toBe(true);
        expect(sim.canManageTags).toBe(false);
        expect(sim.isProjetista).toBe(false);
        expect(sim.isVisitor).toBe(false);
    });

    it('nível Usuário = nenhuma flag (como a Luciene)', () => {
        const sim = aplicarSimulacao(dono, 'usuario')!;
        expect(sim.isAdmin).toBe(false);
        expect(sim.canManageTags).toBe(false);
        expect(sim.isProjetista).toBe(false);
        expect(sim.isVisitor).toBe(false);
    });

    it('simulação esconde o Centro de Custo (RF-060 responde ao e-mail trocado)', () => {
        expect(podeVerCentroCusto(dono)).toBe(true);
        (['admin', 'usuario'] as NivelSimulacao[]).forEach(nivel => {
            expect(podeVerCentroCusto(aplicarSimulacao(dono, nivel))).toBe(false);
        });
    });

    it('não altera identidade além do necessário (id e nome preservados)', () => {
        const sim = aplicarSimulacao(dono, 'admin')!;
        expect(sim.id).toBe(dono.id);
        expect(sim.name).toBe(dono.name);
    });
});
