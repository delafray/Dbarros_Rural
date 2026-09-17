/**
 * Regras puras do Mapa de Vendas (sem React, sem banco).
 *
 * Fonte única de: normalização de código (planta "P-01" ⇄ planilha "P 01"),
 * status de um estande a partir da linha da planilha, cores por status e
 * resumos por família. Espelha as marcas da planilha:
 *   x  = venda (tipo_venda sem "*")      → vendido  (verde #00B050, igual à planilha)
 *   *  = cortesia/permuta (com "*")      → cortesia (azul  #00B0F0, igual à planilha)
 *   cliente anotado sem x/*              → reservado
 *   DISPONÍVEL sem cliente               → livre
 *   código do mapa ausente na planilha   → sem_planilha (alerta de sincronização)
 */

export type StatusEstande = 'livre' | 'reservado' | 'vendido' | 'cortesia' | 'sem_planilha';

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
}

export const DISPONIVEL = 'DISPONÍVEL';

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
    if (tipo && tipo !== DISPONIVEL) {
        return tipo.includes('*') ? 'cortesia' : 'vendido';
    }
    if (linha.cliente_id || (linha.cliente_nome_livre && linha.cliente_nome_livre.trim())) {
        return 'reservado';
    }
    return 'livre';
}

export interface EstiloStatus {
    fill: string;
    stroke: string;
    texto: string;   // cor do rótulo dentro do polígono
    label: string;
}

/**
 * Cores: verde e azul iguais aos da planilha (x e *). Livre em BRANCO com contorno
 * escuro — a planta do Corel é cheia de cinzas e amarelos, então o vago fica
 * "vazio" e só o ocupado carrega cor (bate o olho e vê vendido/cortesia).
 * Reservado em laranja (amarelo se confundia com as células da planta).
 */
export const ESTILO_STATUS: Record<StatusEstande, EstiloStatus> = {
    livre:        { fill: '#FFFFFF', stroke: '#334155', texto: '#1E293B', label: 'Livre' },
    reservado:    { fill: '#FDBA74', stroke: '#C2410C', texto: '#431407', label: 'Reservado' },
    vendido:      { fill: '#00B050', stroke: '#14532D', texto: '#FFFFFF', label: 'Vendido' },
    cortesia:     { fill: '#00B0F0', stroke: '#075985', texto: '#FFFFFF', label: 'Cortesia / permuta' },
    sem_planilha: { fill: '#FCA5A5', stroke: '#B91C1C', texto: '#111827', label: 'Sem linha na planilha' },
};

export const ORDEM_STATUS: StatusEstande[] = ['livre', 'reservado', 'vendido', 'cortesia', 'sem_planilha'];

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
    return { livre: 0, reservado: 0, vendido: 0, cortesia: 0, sem_planilha: 0 };
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
export function tamanhoFonteRotulo(pontos: number[][] | null | undefined): number {
    const box = bboxDePontos(pontos);
    if (!box) return 0;
    const menorLado = Math.min(box.w, box.h);
    const fonte = menorLado * 0.35;
    if (fonte < 1.2) return 0;
    return Math.min(fonte, 6);
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
