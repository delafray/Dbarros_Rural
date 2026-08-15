/**
 * Checklist condicional do Centro de Custo (RF-020/021/041/042) — puro, sem IO.
 * As SEEDS codificam o levantamento (MODULO-CUSTOS/DOC 05: Tela 1 obrigatórios,
 * estrutura, detalhes) com CONDIÇÕES DE ATIVAÇÃO sobre o perfil (RF-042:
 * "dia de campo na fazenda" mostra meia dúzia; "Avenida Paulista" mostra tudo)
 * e SUGESTÕES por público (rel. 18: banheiros 1/50, ambulância por porte...).
 *
 * Testado em utils/checklistEvento.test.ts.
 */

export interface PerfilChecklist {
    local_publico: boolean | null;
    publico_esperado: number | null;
    tem_animais: boolean;
    tem_show: boolean;
    vende_alcool: boolean;
    cobra_ingresso: boolean;
    tem_estruturas: boolean;
    local_fechado: boolean;
}

export type CamadaChecklist = 'governamental' | 'estrutura' | 'detalhes';

export interface ItemChecklist {
    chave: string;
    rotulo: string;
    camada: CamadaChecklist;
    /** slug da categoria de custo que o item alimenta */
    categoriaSlug: string;
    /** dias de antecedência mínima → prazo-alerta retroativo (RF-021) */
    prazoDias?: number;
    /** true = nasce ticado e não é opcional (kit compliance RF-041) */
    obrigatorio?: boolean;
    /** opções de modalidade (ex.: banheiro) */
    modalidades?: string[];
    descricao?: string;
    condicao: (p: PerfilChecklist) => boolean;
    /** sugestão de quantidade em função do perfil (rel. 18) */
    sugestao?: (p: PerfilChecklist) => { quantidade: number; rotulo?: string } | null;
}

const sempre = () => true;
const publico = (p: PerfilChecklist) => p.publico_esperado ?? 0;

/** Seeds do levantamento — lista ABERTA (novos itens: acrescentar aqui). */
export const SEEDS_CHECKLIST: ItemChecklist[] = [
    // ── Camada 1: GOVERNAMENTAL / OBRIGATÓRIOS (Tela 1 — "os preocupantes") ──
    {
        chave: 'art_estruturas', rotulo: 'ART das estruturas (eng. civil)',
        camada: 'governamental', categoriaSlug: 'taxas-legais', prazoDias: 45,
        condicao: p => p.tem_estruturas,
    },
    {
        chave: 'art_eletrica', rotulo: 'ART elétrica (eng. eletricista)',
        camada: 'governamental', categoriaSlug: 'taxas-legais', prazoDias: 45,
        condicao: p => p.tem_estruturas,
    },
    {
        chave: 'bombeiros_avcb', rotulo: 'Corpo de Bombeiros (AVCB/PTOT)',
        camada: 'governamental', categoriaSlug: 'taxas-legais', prazoDias: 60,
        condicao: p => p.tem_estruturas || (publico(p) > 250),
    },
    {
        chave: 'alvara_prefeitura', rotulo: 'Alvará da prefeitura',
        camada: 'governamental', categoriaSlug: 'taxas-legais', prazoDias: 40,
        condicao: p => p.local_publico === true || publico(p) > 250,
    },
    {
        chave: 'licenca_ambiental', rotulo: 'Licença ambiental',
        camada: 'governamental', categoriaSlug: 'taxas-legais', prazoDias: 60,
        condicao: p => p.local_publico === true,
    },
    {
        chave: 'defesa_cadastro_recinto', rotulo: 'Cadastro do recinto (defesa agropecuária)',
        camada: 'governamental', categoriaSlug: 'taxas-legais', prazoDias: 90,
        condicao: p => p.tem_animais,
    },
    {
        chave: 'defesa_autorizacao', rotulo: 'Autorização sanitária do evento com animais',
        camada: 'governamental', categoriaSlug: 'taxas-legais', prazoDias: 30,
        condicao: p => p.tem_animais,
    },
    {
        chave: 'veterinario_rt', rotulo: 'Veterinário RT credenciado (presente no evento)',
        camada: 'governamental', categoriaSlug: 'animais', prazoDias: 30,
        condicao: p => p.tem_animais,
    },
    {
        chave: 'gta_animais', rotulo: 'GTA dos animais (+ retorno e mapa pós-evento)',
        camada: 'governamental', categoriaSlug: 'animais', prazoDias: 7,
        condicao: p => p.tem_animais,
    },
    {
        chave: 'seguro_profissionais', rotulo: 'Seguro de vida profissionais (Lei 10.519)',
        camada: 'governamental', categoriaSlug: 'taxas-legais', prazoDias: 15,
        condicao: p => p.tem_animais,
    },
    {
        chave: 'seguro_rc', rotulo: 'Seguro de responsabilidade civil do evento',
        camada: 'governamental', categoriaSlug: 'taxas-legais', prazoDias: 15,
        condicao: sempre,
    },
    {
        chave: 'ecad', rotulo: 'ECAD (direitos autorais da música)',
        camada: 'governamental', categoriaSlug: 'taxas-legais', prazoDias: 15,
        condicao: p => p.tem_show,
    },
    {
        chave: 'juizado_infancia', rotulo: 'Alvará do Juizado da Infância (menores em show)',
        camada: 'governamental', categoriaSlug: 'taxas-legais', prazoDias: 30,
        condicao: p => p.tem_show && p.cobra_ingresso,
    },
    {
        chave: 'alvara_bebida', rotulo: 'Alvará de venda de bebida alcoólica',
        camada: 'governamental', categoriaSlug: 'taxas-legais', prazoDias: 30,
        condicao: p => p.vende_alcool,
    },
    {
        chave: 'sinalizacao_compliance', rotulo: 'Kit sinalização compliance (saídas, proibições, preços)',
        camada: 'governamental', categoriaSlug: 'programacao-visual',
        obrigatorio: true, condicao: sempre,
        descricao: 'Saídas de emergência; proibido fumar; proibida venda de álcool/tabaco a menores; cardápios com preços (RF-041)',
    },
    {
        chave: 'pulseiras_etarias', rotulo: 'Pulseiras de identificação etária',
        camada: 'governamental', categoriaSlug: 'programacao-visual', prazoDias: 15,
        condicao: p => p.vende_alcool,
        sugestao: p => (publico(p) > 0 ? { quantidade: Math.ceil(publico(p) * 1.1) } : null),
    },

    // ── Camada 2: ESTRUTURA do local ─────────────────────────────────────────
    {
        chave: 'banheiros', rotulo: 'Banheiros para o público',
        camada: 'estrutura', categoriaSlug: 'sanitarios',
        modalidades: ['local', 'quimico', 'conteiner', 'carreta_vip'],
        condicao: sempre,
        // rel. 18: 1/50 (1/35 com álcool) + 5% PCD
        sugestao: p => {
            const pub = publico(p);
            if (pub <= 0) return null;
            const razao = p.vende_alcool ? 35 : 50;
            return { quantidade: Math.ceil(pub / razao), rotulo: 'unidades' };
        },
    },
    {
        chave: 'energia_gerador', rotulo: 'Energia / gerador (kVA estimado)',
        camada: 'estrutura', categoriaSlug: 'eletrica',
        condicao: sempre,
        // rel. 18: porte por público, +20% margem, backup 30% fica no descritivo
        sugestao: p => {
            const pub = publico(p);
            if (pub <= 0) return null;
            const kva = pub <= 200 ? 150 : pub <= 500 ? 250 : pub <= 2000 ? 500 : 750;
            return { quantidade: kva, rotulo: 'kVA' };
        },
    },
    {
        chave: 'agua', rotulo: 'Abastecimento de água (pipa/reservatório)',
        camada: 'estrutura', categoriaSlug: 'estruturas', condicao: sempre,
    },
    {
        chave: 'internet', rotulo: 'Internet / conectividade (maquininhas, transmissão)',
        camada: 'estrutura', categoriaSlug: 'internet-ti', condicao: sempre,
    },
    {
        chave: 'estacionamento', rotulo: 'Estacionamento (terreno, orientadores, iluminação)',
        camada: 'estrutura', categoriaSlug: 'estruturas',
        condicao: p => publico(p) > 200,
    },

    // ── Camada 4: DETALHES operacionais ──────────────────────────────────────
    {
        chave: 'limpeza', rotulo: 'Equipe de limpeza',
        camada: 'detalhes', categoriaSlug: 'limpeza', condicao: sempre,
        // rel. 25: 1 auxiliar / 150-250 pessoas
        sugestao: p => {
            const pub = publico(p);
            return pub > 0 ? { quantidade: Math.max(2, Math.ceil(pub / 200)), rotulo: 'pessoas/dia' } : null;
        },
    },
    {
        chave: 'seguranca', rotulo: 'Segurança / brigada',
        camada: 'detalhes', categoriaSlug: 'seguranca', condicao: sempre,
        // rel. 26: 1/100 com show+álcool; 1/150 diurno familiar
        sugestao: p => {
            const pub = publico(p);
            if (pub <= 0) return null;
            const razao = p.tem_show || p.vende_alcool ? 100 : 150;
            return { quantidade: Math.ceil(pub / razao), rotulo: 'pessoas/turno' };
        },
    },
    {
        chave: 'posto_medico', rotulo: 'Posto médico / ambulância',
        camada: 'detalhes', categoriaSlug: 'saude', prazoDias: 15,
        condicao: p => p.tem_animais || publico(p) > 500,
        // rel. 18: 1 ambulância até 5 mil; 2 até 15 mil
        sugestao: p => {
            const pub = publico(p);
            if (pub <= 0) return null;
            return { quantidade: pub <= 5000 ? 1 : 2, rotulo: 'ambulâncias' };
        },
    },
    {
        chave: 'caixas_cobranca', rotulo: 'Sistema de cobrança (caixas fixos + ambulantes)',
        camada: 'detalhes', categoriaSlug: 'alimentacao',
        condicao: p => p.vende_alcool || p.cobra_ingresso,
        // rel. 23: 1 ambulante / 250 pessoas
        sugestao: p => {
            const pub = publico(p);
            return pub > 0 ? { quantidade: Math.ceil(pub / 250), rotulo: 'ambulantes' } : null;
        },
    },
    {
        chave: 'alimentacao_staff', rotulo: 'Alimentação da equipe (marmitex)',
        camada: 'detalhes', categoriaSlug: 'rh-equipe', condicao: sempre,
    },
    {
        chave: 'vigilancia_montagem', rotulo: 'Vigilância patrimonial da montagem/desmontagem',
        camada: 'detalhes', categoriaSlug: 'seguranca',
        condicao: p => p.tem_estruturas,
    },
    {
        chave: 'manutencao_plantao', rotulo: 'Manutenção de plantão (eletricista/hidráulica)',
        camada: 'detalhes', categoriaSlug: 'manutencao',
        condicao: p => p.tem_estruturas,
    },
    {
        chave: 'som_locucao', rotulo: 'Som / locução do parque',
        camada: 'detalhes', categoriaSlug: 'som-luz-telao', condicao: sempre,
    },
    {
        chave: 'divulgacao', rotulo: 'Divulgação (rádio, redes, panfletos)',
        camada: 'detalhes', categoriaSlug: 'divulgacao', condicao: sempre,
    },
    {
        chave: 'torneio_leiteiro', rotulo: 'Torneio leiteiro (tanque, latões, higienização)',
        camada: 'detalhes', categoriaSlug: 'animais', prazoDias: 30,
        condicao: p => p.tem_animais,
    },
];

// ────────────────────────────────────────────────────────────────────────────
// Engine
// ────────────────────────────────────────────────────────────────────────────

export interface ItemChecklistGerado {
    chave: string;
    rotulo: string;
    camada: CamadaChecklist;
    categoriaSlug: string;
    obrigatorio: boolean;
    modalidades: string[];
    descricao: string | null;
    prazoLimite: string | null;        // ISO yyyy-mm-dd
    prazoDias: number | null;
    sugestaoQuantidade: number | null;
    sugestaoRotulo: string | null;
}

/** Data-limite retroativa: dataEvento − prazoDias (RF-021). */
export function calcularPrazoLimite(dataEventoISO: string | null, prazoDias?: number): string | null {
    if (!dataEventoISO || !prazoDias) return null;
    const d = new Date(`${dataEventoISO}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return null;
    d.setUTCDate(d.getUTCDate() - prazoDias);
    return d.toISOString().slice(0, 10);
}

/**
 * Gera o checklist filtrado pelo perfil (RF-042) com prazos e sugestões.
 * Determinístico e puro: mesma entrada → mesma lista.
 */
export function gerarChecklist(
    perfil: PerfilChecklist,
    dataEventoISO: string | null = null,
): ItemChecklistGerado[] {
    return SEEDS_CHECKLIST
        .filter(s => s.obrigatorio || s.condicao(perfil))
        .map(s => {
            const sug = s.sugestao ? s.sugestao(perfil) : null;
            return {
                chave: s.chave,
                rotulo: s.rotulo,
                camada: s.camada,
                categoriaSlug: s.categoriaSlug,
                obrigatorio: s.obrigatorio ?? false,
                modalidades: s.modalidades ?? [],
                descricao: s.descricao ?? null,
                prazoLimite: calcularPrazoLimite(dataEventoISO, s.prazoDias),
                prazoDias: s.prazoDias ?? null,
                sugestaoQuantidade: sug?.quantidade ?? null,
                sugestaoRotulo: sug?.rotulo ?? null,
            };
        });
}

/** Perfil "tudo desligado" — o dia de campo na fazenda (RF-042). */
export const PERFIL_VAZIO: PerfilChecklist = {
    local_publico: null,
    publico_esperado: null,
    tem_animais: false,
    tem_show: false,
    vende_alcool: false,
    cobra_ingresso: false,
    tem_estruturas: false,
    local_fechado: false,
};
