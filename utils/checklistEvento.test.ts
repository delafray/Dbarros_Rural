import { describe, it, expect } from 'vitest';
import {
    gerarChecklist,
    calcularPrazoLimite,
    PERFIL_VAZIO,
    SEEDS_CHECKLIST,
    type PerfilChecklist,
} from './checklistEvento';

const perfil = (over: Partial<PerfilChecklist>): PerfilChecklist => ({ ...PERFIL_VAZIO, ...over });

describe('gerarChecklist — modularidade RF-042', () => {
    it('dia de campo na fazenda: só o essencial aparece', () => {
        const itens = gerarChecklist(PERFIL_VAZIO);
        const chaves = itens.map(i => i.chave);
        // essenciais de qualquer evento:
        expect(chaves).toContain('seguro_rc');
        expect(chaves).toContain('sinalizacao_compliance');
        expect(chaves).toContain('limpeza');
        // nada de animais/show/estruturas:
        expect(chaves).not.toContain('gta_animais');
        expect(chaves).not.toContain('ecad');
        expect(chaves).not.toContain('bombeiros_avcb');
        expect(chaves).not.toContain('art_estruturas');
        expect(itens.length).toBeLessThan(12);
    });

    it('"Avenida Paulista": tudo acende', () => {
        const itens = gerarChecklist(perfil({
            local_publico: true, publico_esperado: 10_000, tem_animais: true,
            tem_show: true, vende_alcool: true, cobra_ingresso: true,
            tem_estruturas: true, local_fechado: false,
        }));
        const chaves = itens.map(i => i.chave);
        for (const c of ['art_estruturas', 'art_eletrica', 'bombeiros_avcb', 'alvara_prefeitura',
            'licenca_ambiental', 'defesa_cadastro_recinto', 'gta_animais', 'seguro_profissionais',
            'ecad', 'juizado_infancia', 'alvara_bebida', 'pulseiras_etarias', 'estacionamento',
            'posto_medico', 'caixas_cobranca', 'vigilancia_montagem', 'torneio_leiteiro']) {
            expect(chaves).toContain(c);
        }
        expect(itens.length).toBe(SEEDS_CHECKLIST.length);
    });

    it('gatilhos encadeados: animais puxa o bloco sanitário inteiro', () => {
        const chaves = gerarChecklist(perfil({ tem_animais: true })).map(i => i.chave);
        for (const c of ['defesa_cadastro_recinto', 'defesa_autorizacao', 'veterinario_rt',
            'gta_animais', 'seguro_profissionais', 'torneio_leiteiro', 'posto_medico']) {
            expect(chaves).toContain(c);
        }
    });

    it('álcool puxa alvará + pulseiras + banheiro em razão maior (1/35)', () => {
        const itens = gerarChecklist(perfil({ vende_alcool: true, publico_esperado: 3500 }));
        const chaves = itens.map(i => i.chave);
        expect(chaves).toContain('alvara_bebida');
        expect(chaves).toContain('pulseiras_etarias');
        const banheiros = itens.find(i => i.chave === 'banheiros')!;
        expect(banheiros.sugestaoQuantidade).toBe(100); // 3500/35
    });

    it('compliance é obrigatório mesmo com tudo desligado (RF-041)', () => {
        const item = gerarChecklist(PERFIL_VAZIO).find(i => i.chave === 'sinalizacao_compliance')!;
        expect(item.obrigatorio).toBe(true);
    });

    it('é determinístico', () => {
        const p = perfil({ tem_show: true, publico_esperado: 800 });
        expect(gerarChecklist(p, '2026-09-10')).toEqual(gerarChecklist(p, '2026-09-10'));
    });
});

describe('sugestões por público (rel. 18/23/25/26)', () => {
    it('banheiros 1/50 sem álcool', () => {
        const b = gerarChecklist(perfil({ publico_esperado: 5000 })).find(i => i.chave === 'banheiros')!;
        expect(b.sugestaoQuantidade).toBe(100);
        expect(b.modalidades).toContain('conteiner');
    });
    it('gerador por porte: 500 kVA para 2.000 pessoas', () => {
        const g = gerarChecklist(perfil({ publico_esperado: 2000 })).find(i => i.chave === 'energia_gerador')!;
        expect(g.sugestaoQuantidade).toBe(500);
        expect(g.sugestaoRotulo).toBe('kVA');
    });
    it('ambulâncias: 1 até 5 mil, 2 acima', () => {
        const p1 = gerarChecklist(perfil({ tem_animais: true, publico_esperado: 4000 }))
            .find(i => i.chave === 'posto_medico')!;
        const p2 = gerarChecklist(perfil({ tem_animais: true, publico_esperado: 12000 }))
            .find(i => i.chave === 'posto_medico')!;
        expect(p1.sugestaoQuantidade).toBe(1);
        expect(p2.sugestaoQuantidade).toBe(2);
    });
    it('segurança: 1/100 com show, 1/150 sem', () => {
        const com = gerarChecklist(perfil({ tem_show: true, publico_esperado: 3000 }))
            .find(i => i.chave === 'seguranca')!;
        const sem = gerarChecklist(perfil({ publico_esperado: 3000 }))
            .find(i => i.chave === 'seguranca')!;
        expect(com.sugestaoQuantidade).toBe(30);
        expect(sem.sugestaoQuantidade).toBe(20);
    });
    it('sem público informado, sem sugestão (nunca chuta)', () => {
        const b = gerarChecklist(PERFIL_VAZIO).find(i => i.chave === 'banheiros')!;
        expect(b.sugestaoQuantidade).toBeNull();
    });
});

describe('calcularPrazoLimite (prazo-alerta retroativo, RF-021)', () => {
    it('evento 10/09 com 60 dias → limite 12/07', () => {
        expect(calcularPrazoLimite('2026-09-10', 60)).toBe('2026-07-12');
    });
    it('vira mês e ano corretamente', () => {
        expect(calcularPrazoLimite('2026-01-15', 30)).toBe('2025-12-16');
    });
    it('sem data ou sem prazo → null; data inválida → null', () => {
        expect(calcularPrazoLimite(null, 60)).toBeNull();
        expect(calcularPrazoLimite('2026-09-10', undefined)).toBeNull();
        expect(calcularPrazoLimite('abc', 60)).toBeNull();
    });
    it('prazos fluem para os itens gerados (bombeiros 60d)', () => {
        const avcb = gerarChecklist(perfil({ tem_estruturas: true }), '2026-09-10')
            .find(i => i.chave === 'bombeiros_avcb')!;
        expect(avcb.prazoLimite).toBe('2026-07-12');
    });
});
