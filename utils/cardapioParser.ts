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

/**
 * Weight (em units) of a single item in the canvas layout.
 * When avgCharsPerLine is given, estimates how many lines the description
 * will wrap into. Otherwise assumes 1-line description (legacy behavior).
 */
export function getItemWeight(item: CardapioItem, avgCharsPerLine?: number): number {
  let descWeight = 0;
  if (item.descricao) {
    const lines = avgCharsPerLine && avgCharsPerLine > 0
      ? Math.max(1, Math.ceil(item.descricao.length / avgCharsPerLine))
      : 1;
    descWeight = ITEM_DESC_WEIGHT * lines;
  }
  return ITEM_WEIGHT_BASE + descWeight + ITEM_MARGIN_WEIGHT;
}

/** Total weight (em units) of a category group */
export function getGroupWeight(group: CardapioGroup, avgCharsPerLine?: number): number {
  return CAT_WEIGHT + CAT_MARGIN_WEIGHT +
    group.itens.reduce((s, i) => s + getItemWeight(i, avgCharsPerLine), 0);
}

/** Split groups into two balanced columns */
export function splitGroups(
  grupos: CardapioGroup[],
  avgCharsPerLine?: number
): [CardapioGroup[], CardapioGroup[]] {
  if (grupos.length === 0) return [[], []];
  if (grupos.length === 1) return [grupos, []];

  const total = grupos.reduce((s, g) => s + getGroupWeight(g, avgCharsPerLine), 0);
  let accumulated = 0;
  let splitIdx = grupos.length - 1;

  for (let i = 0; i < grupos.length; i++) {
    const w = getGroupWeight(grupos[i], avgCharsPerLine);
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
  avgCharsPerLine?: number
): number {
  if (grupos.length === 0 || availableHeightPx <= 0) return 16;

  const [left, right] = splitGroups(grupos, avgCharsPerLine);

  const totalEm = (grps: CardapioGroup[]) =>
    grps.reduce((sum, g) => sum + getGroupWeight(g, avgCharsPerLine), 0);

  const maxEm = Math.max(totalEm(left), totalEm(right));
  if (maxEm <= 0) return 16;

  const fs = availableHeightPx / maxEm;
  return Math.max(7, Math.min(28, fs));
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
