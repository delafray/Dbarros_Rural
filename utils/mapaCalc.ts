/**
 * Regras puras do Mapa de Vendas (sem React, sem banco).
 *
 * Fonte única de: normalização de código (planta "P-01" ⇄ planilha "P 01"),
 * status de um estande a partir da linha da planilha, cores por status e
 * resumos por família. Espelha as marcas da planilha:
 *   x  = venda (tipo_venda sem "*")      → vendido  (verde #00B050, igual à planilha)
 *   *  = cortesia/permuta (com "*")      → cortesia (roxo claro)
 *   RESERVADO <rótulo>*                  → reservado (laranja; vale zero, por isso leva *)
 *   cliente anotado sem marca nenhuma    → cliente_sem_status (ERRO: pisca azul claro/escuro até corrigir)
 *   DISPONÍVEL sem cliente               → livre    (azul #00B0F0 da planilha)
 *   código do mapa ausente na planilha   → sem_planilha (alerta de sincronização)
 */
import { TIPO_DISPONIVEL, isReservado, reservadoDe, rotuloDaMarca } from './planilhaCalc';

export type StatusEstande = 'livre' | 'reservado' | 'vendido' | 'cortesia' | 'cliente_sem_status' | 'sem_planilha';

export interface EstandeMapa {
    codigo: string;              // "P-01" (como na planta)
    stand_nr: string;            // "P 01" (como na planilha)
    familia: string;             // "P"
    pontos: number[][] | null;   // [[x,y],...] no viewBox do mapa
    centro: [number, number];
    area?: number | null;
    obs?: string | null;
}

export interface MapaPublicado {
    id: string;
    edicao_id: string;
    versao: string;
    view_box: string;
    fundo_path: string | null;
    estandes: EstandeMapa[];
    gerado_em?: string | null;
}

/** Subconjunto da linha de planilha_vendas_estandes que o mapa precisa. */
export interface LinhaPlanilhaMapa {
    stand_nr: string;
    tipo_venda: string | null;
    cliente_id?: string | null;
    cliente_nome_livre?: string | null;
    /** "Nome no mapa" editado para ESTE estande (18/09); null = nome fantasia do cliente. */
    mapa_rotulo?: string | null;
}

export const DISPONIVEL = TIPO_DISPONIVEL;

/**
 * Normaliza qualquer grafia para o formato da planilha: "P-01", "p01", "P 1" → "P 01".
 * Família = 1 a 3 letras (P, PR, AL). Devolve null se não for um código LETRAS+NÚMERO.
 */
export function normalizarCodigo(texto: string | null | undefined): string | null {
    if (!texto) return null;
    const m = texto.trim().toUpperCase().match(/^([A-Z]{1,3})[\s-]?(\d{1,3})$/);
    if (!m) return null;
    return `${m[1]} ${m[2].padStart(2, '0')}`;
}

/** "P 01" → "P-01" (formato da planta). */
export function codigoDaPlanta(standNr: string): string {
    const n = normalizarCodigo(standNr);
    return n ? n.replace(' ', '-') : standNr;
}

export function statusDoEstande(linha: LinhaPlanilhaMapa | undefined | null): StatusEstande {
    if (!linha) return 'sem_planilha';
    const tipo = (linha.tipo_venda || '').trim();
    if (isReservado(tipo)) return 'reservado';
    if (tipo && tipo !== DISPONIVEL) {
        return tipo.includes('*') ? 'cortesia' : 'vendido';
    }
    if (linha.cliente_id || (linha.cliente_nome_livre && linha.cliente_nome_livre.trim())) {
        return 'cliente_sem_status';
    }
    return 'livre';
}

export interface EstiloStatus {
    fill: string;
    stroke: string;
    texto: string;   // cor do rótulo dentro do polígono
    label: string;
    /** Se presente, o polígono OSCILA entre `fill` e esta cor (chama atenção: decisão pendente). */
    piscaAte?: string;
    /** Estande MARCADO sem cliente oscila entre `fill` e esta cor quase branca — no mapa tem de ser
     *  nítido (pedido 18/09); a planilha usa seus próprios tons suaves. */
    semCliente?: string;
}

/**
 * Cores (decisão do usuário 17/09): LIVRE = azul da planilha (#00B0F0), VENDIDO =
 * verde da planilha (#00B050). Cortesia/permuta em roxo claro, RESERVADO em laranja.
 * CLIENTE SEM STATUS (18/09) = cliente escolhido na planilha sem marca nenhuma: é erro e
 * oscila entre azul claro e azul escuro até alguém decidir — clique no mapa/célula e dê um
 * status, ou volte a "disponível" pelo modal da planilha (a planilha é o cérebro).
 */
export const ESTILO_STATUS: Record<StatusEstande, EstiloStatus> = {
    livre:        { fill: '#00B0F0', stroke: '#075985', texto: '#082F49', label: 'Livre' },
    reservado:    { fill: '#FDBA74', semCliente: '#FFF7ED', stroke: '#C2410C', texto: '#431407', label: 'Reservado' },
    vendido:      { fill: '#00B050', semCliente: '#ECFDF5', stroke: '#14532D', texto: '#FFFFFF', label: 'Vendido' },
    cortesia:     { fill: '#C084FC', semCliente: '#F5EBFF', stroke: '#6B21A8', texto: '#3B0764', label: 'Cortesia / permuta' },
    cliente_sem_status: { fill: '#00B0F0', piscaAte: '#1E3A8A', stroke: '#1E3A8A', texto: '#FFFFFF', label: 'Cliente sem status (corrigir)' },
    sem_planilha: { fill: '#FCA5A5', stroke: '#B91C1C', texto: '#111827', label: 'Sem linha na planilha' },
};

export const ORDEM_STATUS: StatusEstande[] = ['livre', 'reservado', 'vendido', 'cortesia', 'cliente_sem_status', 'sem_planilha'];

/** Rótulo da venda do estande sem combo (mesma 1ª coluna da planilha). */
export const STAND_PADRAO = 'STAND PADRÃO';

/**
 * Próximo tipo_venda ao clicar de novo no estande já selecionado — mesmo ciclo da
 * célula da planilha (usePlanilhaEditing.handleSelectCombo), decisão do usuário 18/09:
 *   vazio/DISPONÍVEL → STAND PADRÃO (x, vendido) → RESERVADO STAND PADRÃO* → STAND PADRÃO* (cortesia) → DISPONÍVEL.
 * Se a linha já tem um COMBO, o ciclo segue com o mesmo combo (COMBO 02 → COMBO 02* → DISPONÍVEL),
 * sem trocar a escolha feita na planilha. Cliente anotado não é tocado (reservado volta sozinho).
 */
export function proximoTipoVenda(tipoAtual: string | null | undefined): string {
    const tipo = (tipoAtual || '').trim();
    if (!tipo || tipo === DISPONIVEL) return STAND_PADRAO;
    if (isReservado(tipo)) return `${rotuloDaMarca(tipo)}*`;
    if (tipo.endsWith('*')) return DISPONIVEL;
    return reservadoDe(tipo);
}

export interface TransicaoClique {
    /** Campos a gravar na linha da planilha — SÓ o status. Cliente nunca é tocado pelo clique. */
    updates: { tipo_venda: string };
}

/**
 * Clique de novo no estande selecionado, pela planta: livre → vendido → reservado → cortesia → livre,
 * SEMPRE fechando em azul (decisão do usuário 18/09). Status não exige cliente e NUNCA mexe no
 * cliente (regra 18/09, mapa e planilha): estande que volta a livre com cliente anotado vira
 * "cliente sem status" e oscila até alguém tirar o cliente pelo modal — só ali se limpa cliente.
 */
export function transicaoCliqueMapa(linha: LinhaPlanilhaMapa): TransicaoClique {
    return { updates: { tipo_venda: proximoTipoVenda(linha.tipo_venda) } };
}

/** Status que o estande passa a ter depois do clique (para o tooltip "clique de novo: …"). */
export function statusAposClique(linha: LinhaPlanilhaMapa | undefined | null): StatusEstande {
    if (!linha) return 'sem_planilha';
    return statusDoEstande({ ...linha, ...transicaoCliqueMapa(linha).updates });
}

/** Índice stand_nr normalizado → linha da planilha. */
export function indexarPlanilha<T extends LinhaPlanilhaMapa>(linhas: T[]): Map<string, T> {
    const idx = new Map<string, T>();
    for (const l of linhas) {
        const k = normalizarCodigo(l.stand_nr) ?? l.stand_nr;
        idx.set(k, l);
    }
    return idx;
}

export function linhaDoEstande<T extends LinhaPlanilhaMapa>(estande: EstandeMapa, indice: Map<string, T>): T | undefined {
    return indice.get(normalizarCodigo(estande.stand_nr) ?? estande.stand_nr)
        ?? indice.get(normalizarCodigo(estande.codigo) ?? estande.codigo);
}

export interface ResumoFamilia {
    familia: string;
    total: number;
    porStatus: Record<StatusEstande, number>;
}

function contadorVazio(): Record<StatusEstande, number> {
    return { livre: 0, reservado: 0, vendido: 0, cortesia: 0, cliente_sem_status: 0, sem_planilha: 0 };
}

export function resumoPorFamilia(estandes: EstandeMapa[], indice: Map<string, LinhaPlanilhaMapa>): ResumoFamilia[] {
    const mapa = new Map<string, ResumoFamilia>();
    for (const e of estandes) {
        const r = mapa.get(e.familia) ?? { familia: e.familia, total: 0, porStatus: contadorVazio() };
        r.total += 1;
        r.porStatus[statusDoEstande(linhaDoEstande(e, indice))] += 1;
        mapa.set(e.familia, r);
    }
    return [...mapa.values()].sort((a, b) => a.familia.localeCompare(b.familia));
}

export function resumoGeral(estandes: EstandeMapa[], indice: Map<string, LinhaPlanilhaMapa>): ResumoFamilia {
    const total: ResumoFamilia = { familia: 'TOTAL', total: 0, porStatus: contadorVazio() };
    for (const f of resumoPorFamilia(estandes, indice)) {
        total.total += f.total;
        for (const s of ORDEM_STATUS) total.porStatus[s] += f.porStatus[s];
    }
    return total;
}

/** Estandes da planilha que não existem no mapa (planta desatualizada ou código divergente). */
export function estandesForaDoMapa(estandes: EstandeMapa[], linhas: LinhaPlanilhaMapa[]): string[] {
    const noMapa = new Set(estandes.map((e) => normalizarCodigo(e.stand_nr) ?? e.stand_nr));
    return linhas
        .map((l) => normalizarCodigo(l.stand_nr) ?? l.stand_nr)
        .filter((k) => !noMapa.has(k))
        .sort();
}

/** Converte "0 0 W H" em {w, h}; null se malformado. */
export function parseViewBox(viewBox: string): { x: number; y: number; w: number; h: number } | null {
    const p = viewBox.trim().split(/\s+/).map(Number);
    if (p.length !== 4 || p.some((n) => !Number.isFinite(n)) || p[2] <= 0 || p[3] <= 0) return null;
    return { x: p[0], y: p[1], w: p[2], h: p[3] };
}

export function pontosParaAtributo(pontos: number[][] | null | undefined): string {
    if (!pontos || pontos.length < 3) return '';
    return pontos.map(([x, y]) => `${x},${y}`).join(' ');
}

/**
 * Subconjunto de ClienteComContatos (services/clientesService.ts) usado só
 * para resolver o nome de exibição — mantém este módulo sem depender do
 * client Supabase.
 */
export interface ClienteNome {
    nome_fantasia?: string | null;
    razao_social?: string | null;
    nome_completo?: string | null;
    tipo_pessoa?: string | null;
}

/**
 * Nome de exibição do cliente vinculado a uma linha da planilha — mesma
 * prioridade usada na tela da planilha (TempPlanilha): nome_fantasia, senão
 * razão social (PJ) ou nome completo (PF), senão o nome livre digitado.
 */
export function nomeClienteDaLinha(
    linha: { cliente_id?: string | null; cliente_nome_livre?: string | null } | null | undefined,
    clienteMap: Map<string, ClienteNome>,
): string | null {
    if (!linha) return null;
    const cliente = linha.cliente_id ? clienteMap.get(linha.cliente_id) : undefined;
    if (cliente) {
        return (
            cliente.nome_fantasia ||
            (cliente.tipo_pessoa === 'PJ' ? cliente.razao_social : cliente.nome_completo) ||
            null
        );
    }
    return linha.cliente_nome_livre?.trim() || null;
}

/** Caixa delimitadora (largura/altura) de um polígono, em unidades do viewBox. */
export const MAX_CHARS_ROTULO_MAPA = 40;

/**
 * Texto desenhado no estande no modo "Nomes": o rótulo editado para o estande, se houver,
 * senão o nome do cliente (fantasia → razão social/nome → nome livre). O rótulo mora na
 * linha da planilha e o banco o zera quando o cliente da linha muda.
 */
export function rotuloMapaDaLinha(
    linha: { cliente_id?: string | null; cliente_nome_livre?: string | null; mapa_rotulo?: string | null } | null | undefined,
    clienteMap: Map<string, ClienteNome>,
): string | null {
    if (!linha) return null;
    const r = linha.mapa_rotulo?.trim();
    if (r) return r;
    return nomeClienteDaLinha(linha, clienteMap);
}

export function bboxDePontos(pontos: number[][] | null | undefined): { w: number; h: number } | null {
    if (!pontos || pontos.length < 3) return null;
    const xs = pontos.map((p) => p[0]);
    const ys = pontos.map((p) => p[1]);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    if (!(w > 0) || !(h > 0)) return null;
    return { w, h };
}

/**
 * Tamanho de fonte (unidades do viewBox) do rótulo do código dentro do
 * polígono do estande — proporcional ao menor lado. 0 = estande pequeno
 * demais para caber texto legível; o SVG deve esconder o <text> nesse caso.
 */
export function tamanhoFonteRotulo(pontos: number[][] | null | undefined, texto = 'P-01'): number {
    const box = bboxDePontos(pontos);
    if (!box) return 0;
    const menorLado = Math.min(box.w, box.h);
    // Também limita pela LARGURA do texto: "PR-01" (5 chars) invadia o vizinho no mesmo 5x5 (18/09).
    const porLargura = (box.w * 0.9) / (Math.max(1, texto.length) * 0.62);
    const fonte = Math.min(menorLado * 0.35, porLargura);
    if (fonte < 1.2) return 0;
    return Math.min(fonte, 6);
}

// ─── Nome do cliente dentro do estande (botão "Nomes", 18/09) ───────────────────

export const MAX_CHARS_NOME_ESTANDE = 14;
/** Largura média de um caractere em negrito ≈ 0,62 × tamanho da fonte. */
const LARGURA_CHAR = 0.62;
const FONTE_MIN_NOME = 1.5;
const FONTE_MAX_NOME = 6;
const SUFIXOS_EMPRESA = /\s+(LTDA\.?|S\.?\/?A\.?|ME|EPP|EIRELI|MEI|S\.?S\.?)$/i;

/**
 * Abrevia o nome (fantasia) para caber num estande: tira sufixos societários, junta
 * palavras enquanto couber em `max` e, se nem a primeira couber, corta com "…".
 */
export function abreviarNomeCliente(nome: string | null | undefined, max = MAX_CHARS_NOME_ESTANDE): string {
    let n = (nome || '').replace(/\s+/g, ' ').trim();
    if (!n) return '';
    n = n.replace(SUFIXOS_EMPRESA, '').trim();
    if (n.length <= max) return n;
    const palavras = n.split(' ');
    let saida = '';
    for (const p of palavras) {
        const tentativa = saida ? `${saida} ${p}` : p;
        if (tentativa.length > max) break;
        saida = tentativa;
    }
    if (saida) return saida;
    return `${palavras[0].slice(0, Math.max(1, max - 1))}…`;
}

export type RotacaoRotulo = 0 | -90 | -45;

export interface LayoutNomeEstande {
    /** 1 ou 2 linhas (nome composto quebra em duas quando isso deixa a fonte maior). */
    linhas: string[];
    fonte: number;          // unidades do viewBox
    rotacao: RotacaoRotulo; // 0 = horizontal, -90 = vertical (lê de baixo p/ cima), -45 = diagonal
}

const ENTRELINHA = 1.1;

/** Melhor quebra de um nome composto em duas linhas: a que deixa a linha mais longa mais curta. */
export function quebrarEmDuasLinhas(texto: string): [string, string] | null {
    const palavras = texto.split(' ');
    if (palavras.length < 2) return null;
    let melhor: [string, string] | null = null;
    let maiorLinha = Infinity;
    for (let i = 1; i < palavras.length; i++) {
        const a = palavras.slice(0, i).join(' ');
        const b = palavras.slice(i).join(' ');
        const m = Math.max(a.length, b.length);
        if (m < maiorLinha) { maiorLinha = m; melhor = [a, b]; }
    }
    return melhor;
}

/**
 * Escolhe, para o polígono do estande, a direção (horizontal, vertical ou diagonal), o número de
 * linhas (1 ou 2) e o tamanho de fonte em que o nome cabe DENTRO do estande sem invadir o
 * vizinho. Se nem abreviando cabe legível, devolve null (o mapa mostra o código). Só geometria.
 */
export function layoutNomeEstande(pontos: number[][] | null | undefined, nome: string | null | undefined): LayoutNomeEstande | null {
    const box = bboxDePontos(pontos);
    if (!box) return null;
    // Parte do nome inteiro (sem sufixo societário, até 40 chars): estande largo pode mostrar mais que 14.
    const base = abreviarNomeCliente(nome, 40);
    if (!base) return null;
    const folga = 0.88; // margem para não encostar na borda
    const opcoes: { rotacao: RotacaoRotulo; comprimento: number; transversal: number; duasLinhas: boolean }[] = [
        { rotacao: 0, comprimento: box.w * folga, transversal: box.h * 0.75, duasLinhas: true },
        { rotacao: -90, comprimento: box.h * folga, transversal: box.w * 0.75, duasLinhas: true },
        { rotacao: -45, comprimento: Math.hypot(box.w, box.h) * 0.72, transversal: Math.min(box.w, box.h) * 0.55, duasLinhas: false },
    ];
    // Tenta o texto inteiro; se não couber legível, encurta progressivamente.
    const candidatos = [base];
    for (let max = base.length - 1; max >= 5; max--) {
        const c = abreviarNomeCliente(base, max);
        if (c !== candidatos[candidatos.length - 1]) candidatos.push(c);
    }
    for (const texto of candidatos) {
        let melhor: LayoutNomeEstande | null = null;
        const considerar = (cand: LayoutNomeEstande) => {
            // Horizontal/1 linha é o padrão; só troca se a alternativa render fonte ao menos 15% maior.
            if (cand.fonte >= FONTE_MIN_NOME && (!melhor || cand.fonte > melhor.fonte * 1.15)) melhor = cand;
        };
        const duas = quebrarEmDuasLinhas(texto);
        for (const o of opcoes) {
            considerar({
                linhas: [texto],
                fonte: Math.min(FONTE_MAX_NOME, o.comprimento / (texto.length * LARGURA_CHAR), o.transversal),
                rotacao: o.rotacao,
            });
            if (duas && o.duasLinhas) {
                const maior = Math.max(duas[0].length, duas[1].length);
                considerar({
                    linhas: duas,
                    fonte: Math.min(FONTE_MAX_NOME, o.comprimento / (maior * LARGURA_CHAR), o.transversal / (2 * ENTRELINHA)),
                    rotacao: o.rotacao,
                });
            }
        }
        if (melhor) return melhor;
    }
    return null;
}

/** Limita o zoom do mapa a um intervalo razoável (evita zoom negativo/infinito). */
export function clampZoom(zoom: number, min = 0.5, max = 8): number {
    if (!Number.isFinite(zoom)) return min;
    return Math.min(max, Math.max(min, zoom));
}

/** Próximo zoom a partir da roda do mouse (deltaY negativo = aproxima ~10% por "tick"). */
export function zoomComRoda(zoomAtual: number, deltaY: number, min = 0.5, max = 8): number {
    const fator = deltaY < 0 ? 1.1 : 1 / 1.1;
    return clampZoom(zoomAtual * fator, min, max);
}

/**
 * Pan novo para que o ponto `p` (em unidades do viewBox, ANTES da transformação
 * translate(pan) scale(zoom)) continue debaixo do cursor ao trocar o zoom.
 * Conta: p = pan + zoom·q  ⇒  pan' = p − (p − pan)·(zoomNovo/zoom).
 */
export function panParaZoomNoPonto(
    pan: { x: number; y: number }, zoom: number, zoomNovo: number, p: { x: number; y: number },
): { x: number; y: number } {
    if (!(zoom > 0) || !Number.isFinite(zoomNovo)) return pan;
    const k = zoomNovo / zoom;
    return { x: p.x - (p.x - pan.x) * k, y: p.y - (p.y - pan.y) * k };
}
