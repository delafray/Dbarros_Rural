// Parser for menu text input format:
// Line 1: titulo (e.g., "CHURRASCO BBQ")
// Line 2: empresa (e.g., "MASMORRA")
// Line 3: header row (CATEGORIA TAB ITEM TAB VALOR TAB DESCRIÇÃO) - skipped
// Lines 4+: data rows separated by tabs

export interface CardapioItem {
  item: string;
  valor: string;
  descricao: string;
}

export interface CardapioGroup {
  categoria: string;
  itens: CardapioItem[];
}

export interface CardapioParsed {
  titulo: string;
  empresa: string;
  grupos: CardapioGroup[];
  raw: string;
}

const ITEM_WEIGHT_BASE = 1.4;       // item name height in em
const ITEM_DESC_WEIGHT = 0.9;       // description height in em
const ITEM_MARGIN_WEIGHT = 0.5;     // margin between items
const CAT_WEIGHT = 2.3;             // category header height in em
const CAT_MARGIN_WEIGHT = 0.5;      // margin after category header
const VARIANTE_WEIGHT = 1.45;       // each stacked size/price line in em

/**
 * A partir de quantas variantes o item vira sublinhas. 2 = TODO valor
 * composto empilha — o inline de 2 variantes quebrava em cardápios pequenos
 * (fonte grande → preço engole a coluna e o nome quebra palavra a palavra).
 */
export const VARIANTES_EMPILHA_MIN = 2;

/** Uma opção de tamanho/preço de um valor composto (ex: "300ml" / "R$ 10,00") */
export interface PrecoVariante {
  rotulo: string;
  preco: string;
}

// Convenção produzida pelo prompt da IA (promptCardapioIA regra 3):
// "Rótulo - R$ 0,00 / Rótulo - R$ 0,00". Aceita hífen ou en-dash.
const VARIANTE_RE = /^(.{1,24}?)\s*[-–]\s*(R\$\s?\d[\d.,]*)$/;

/**
 * Detecta valor composto (tamanhos com preços) e o devolve estruturado.
 * Retorna null para preço simples ou formato fora da convenção — nesse
 * caso o valor segue sendo tratado como string opaca (comportamento atual).
 */
export function parseValorComposto(valor: string): PrecoVariante[] | null {
  if (!valor || !valor.includes('/')) return null;
  const partes = valor.split('/').map((p) => p.trim());
  if (partes.length < 2) return null;

  const variantes: PrecoVariante[] = [];
  for (const parte of partes) {
    const m = parte.match(VARIANTE_RE);
    if (!m) return null;
    variantes.push({ rotulo: m[1].trim(), preco: m[2].replace(/R\$\s?/, 'R$ ').trim() });
  }
  return variantes;
}

/** Forma compacta de exibição inline: "P R$ 30,00 · G R$ 35,00" */
export function formatValorInline(variantes: PrecoVariante[]): string {
  return variantes.map((v) => `${v.rotulo} ${v.preco}`).join(' · ');
}

// ─── Controle "juntar linhas" (compartilhado A3/Lona) ───────────────────────
export const LINHAS_MIN = 0.7;
export const LINHAS_MAX = 1.3;

/**
 * Sensibilidade de cada tipo de espaço ao controle "juntar linhas": espaços
 * que já são apertados (descrição colada no item) encolhem menos; espaços
 * largos (entre itens/grupos) encolhem o valor cheio do controle.
 */
export const LINHAS_SENS = {
  descricao: 0.5,   // marginTop e line-height da descrição/sublinhas
  categoria: 0.75,  // respiro após o título da categoria e após o cabeçalho
  item: 1,          // margem entre itens, entre grupos e entre empresas
} as const;

/**
 * Aplica o controle "juntar linhas" a um espaço: linhas=0.9 com sens=0.5
 * reduz 5%; com sens=1 reduz os 10% cheios. Aumentar (linhas>1) segue a
 * mesma proporção.
 */
export function aplicarLinhas(base: number, sens: number, linhas: number): number {
  return base * (1 - (1 - linhas) * sens);
}

/**
 * Multiplicadores de fonte por elemento (1 = padrão) — permitem que o
 * auto-fit desconte fontes customizadas na estimativa de altura.
 * `linhas`/`mostrarCategorias` (opcionais) fazem o peso acompanhar os
 * controles "juntar linhas" e "ocultar categorias" onde eles existem.
 */
export interface PesoFontes {
  categoria?: number;
  item?: number;
  descricao?: number;
  preco?: number;
  /** Compressão vertical (1 = padrão; ver LINHAS_MIN/MAX) */
  linhas?: number;
  /** false = títulos de categoria ocultos (peso da categoria zerado) */
  mostrarCategorias?: boolean;
}

/**
 * Weight (em units) of a single item in the canvas layout.
 * When avgCharsPerLine is given, estimates how many lines the description
 * will wrap into. Otherwise assumes 1-line description (legacy behavior).
 */
export function getItemWeight(
  item: CardapioItem,
  avgCharsPerLine?: number,
  m?: PesoFontes
): number {
  // A linha do item tem a altura do maior entre nome e preço
  const linhaMult = Math.max(m?.item ?? 1, m?.preco ?? 1);
  const lin = m?.linhas ?? 1;
  const variantes = parseValorComposto(item.valor);
  const empilhado = !!variantes && variantes.length >= VARIANTES_EMPILHA_MIN;
  const margem = aplicarLinhas(ITEM_MARGIN_WEIGHT, LINHAS_SENS.item, lin);
  let descWeight = 0;
  if (item.descricao) {
    const lines = avgCharsPerLine && avgCharsPerLine > 0
      ? Math.max(1, Math.ceil(item.descricao.length / avgCharsPerLine))
      : 1;
    descWeight = aplicarLinhas(ITEM_DESC_WEIGHT, LINHAS_SENS.descricao, lin) *
      lines * (m?.descricao ?? 1);
  }
  if (empilhado) {
    // Nome em linha própria (sem preço ao lado) + uma sublinha por variante
    return ITEM_WEIGHT_BASE * (m?.item ?? 1) +
      variantes!.length * aplicarLinhas(VARIANTE_WEIGHT, LINHAS_SENS.descricao, lin) * linhaMult +
      descWeight + margem;
  }
  return ITEM_WEIGHT_BASE * linhaMult + descWeight + margem;
}

/** Total weight (em units) of a category group */
export function getGroupWeight(
  group: CardapioGroup,
  avgCharsPerLine?: number,
  m?: PesoFontes
): number {
  const lin = m?.linhas ?? 1;
  // Categoria oculta: título e respiro dele saem do peso
  const catWeight = m?.mostrarCategorias === false
    ? 0
    : CAT_WEIGHT * (m?.categoria ?? 1) +
      aplicarLinhas(CAT_MARGIN_WEIGHT, LINHAS_SENS.categoria, lin);
  return catWeight +
    group.itens.reduce((s, i) => s + getItemWeight(i, avgCharsPerLine, m), 0);
}

/** Split groups into two balanced columns */
export function splitGroups(
  grupos: CardapioGroup[],
  avgCharsPerLine?: number,
  m?: PesoFontes
): [CardapioGroup[], CardapioGroup[]] {
  if (grupos.length === 0) return [[], []];
  if (grupos.length === 1) return [grupos, []];

  const total = grupos.reduce((s, g) => s + getGroupWeight(g, avgCharsPerLine, m), 0);
  let accumulated = 0;
  let splitIdx = grupos.length - 1;

  for (let i = 0; i < grupos.length; i++) {
    const w = getGroupWeight(grupos[i], avgCharsPerLine, m);
    if (accumulated + w >= total / 2) {
      // Decide: is it better to split before or after this group?
      const diffBefore = Math.abs(total / 2 - accumulated);
      const diffAfter = Math.abs(total / 2 - (accumulated + w));
      splitIdx = diffBefore <= diffAfter ? i : i + 1;
      break;
    }
    accumulated += w;
    splitIdx = i + 1;
  }

  // Ensure at least 1 item per column if possible
  if (splitIdx <= 0) splitIdx = 1;
  if (splitIdx >= grupos.length) splitIdx = grupos.length - 1;

  return [grupos.slice(0, splitIdx), grupos.slice(splitIdx)];
}

/** Calculate optimal base font size to fill the canvas column area */
export function calcFontSize(
  grupos: CardapioGroup[],
  availableHeightPx: number,
  avgCharsPerLine?: number,
  m?: PesoFontes
): number {
  if (grupos.length === 0 || availableHeightPx <= 0) return 16;

  const [left, right] = splitGroups(grupos, avgCharsPerLine, m);

  const totalEm = (grps: CardapioGroup[]) =>
    grps.reduce((sum, g) => sum + getGroupWeight(g, avgCharsPerLine, m), 0);

  const maxEm = Math.max(totalEm(left), totalEm(right));
  if (maxEm <= 0) return 16;

  const fs = availableHeightPx / maxEm;
  return Math.max(7, Math.min(28, fs));
}

/** Remove caracteres que quebrariam o formato TSV (tabs e quebras de linha) */
function limparCampo(v: string): string {
  return (v || '').replace(/[\t\r\n]+/g, ' ').trim();
}

/**
 * Inverso do parse: gera o texto puro (TSV) a partir da estrutura.
 * Usado pelo editor estruturado de itens — o texto volta consolidado
 * (categorias agrupadas na ordem de primeira aparição).
 */
export function gerarTextoCardapio(
  titulo: string,
  empresa: string,
  grupos: CardapioGroup[]
): string {
  const lines: string[] = [
    limparCampo(titulo).toUpperCase(),
    limparCampo(empresa).toUpperCase(),
    'CATEGORIA\tITEM\tVALOR (R$)\tDESCRIÇÃO',
  ];
  for (const g of grupos) {
    for (const i of g.itens) {
      lines.push(
        [
          limparCampo(g.categoria).toUpperCase(),
          limparCampo(i.item),
          limparCampo(i.valor),
          limparCampo(i.descricao),
        ].join('\t')
      );
    }
  }
  return lines.join('\n');
}

/** Parse raw text input into structured data */
export function parseCardapioText(raw: string): Omit<CardapioParsed, 'raw'> | null {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return null;

  const titulo = lines[0].toUpperCase();
  const empresa = lines[1].toUpperCase();

  // Find the header row (contains "CATEGORIA")
  let dataStartIdx = 2;
  for (let i = 2; i < lines.length; i++) {
    const upper = lines[i].toUpperCase();
    if (upper.includes('CATEGORIA') && upper.includes('ITEM')) {
      dataStartIdx = i + 1;
      break;
    }
  }

  const groupsMap = new Map<string, CardapioItem[]>();
  const orderedCategories: string[] = [];

  for (let i = dataStartIdx; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length < 2) continue;

    const categoria = (cols[0] || '').trim().toUpperCase();
    const item = (cols[1] || '').trim();
    const valor = (cols[2] || '').trim();
    const descricao = (cols[3] || '').trim();

    if (!categoria || !item) continue;

    if (!groupsMap.has(categoria)) {
      groupsMap.set(categoria, []);
      orderedCategories.push(categoria);
    }
    groupsMap.get(categoria)!.push({ item, valor, descricao });
  }

  const grupos: CardapioGroup[] = orderedCategories.map((cat) => ({
    categoria: cat,
    itens: groupsMap.get(cat)!,
  }));

  return { titulo, empresa, grupos };
}
