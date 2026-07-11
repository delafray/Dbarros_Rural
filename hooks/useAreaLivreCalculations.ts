import { useCallback } from "react";
import { CategoriaSetup } from "../services/planilhaVendasService";

// ── Tipo local para linha editável ────────────────────────────
export interface ALRow {
  id: string;
  stand_nr: string;
  cliente_id: string | null;
  cliente_nome_livre: string | null;
  area_m2: number | null;
  preco_m2: number | null;       // preco_m2_override ou referência da categoria
  preco_m2_is_override: boolean; // true = tem override individual
  total_override: number | null;
  combo_overrides: Record<string, number>;
  // controle interno
  total_stale: boolean; // m² mudou após override → fundo vermelho
}

// ── Funções puras ──────────────────────────────────────────────

/** Total base de um row (usa override se existir, senão area_m2 * preco_m2). */
export function calcTotal(row: ALRow): number {
  if (row.total_override != null) return row.total_override;
  if (row.area_m2 == null || row.preco_m2 == null) return 0;
  return row.area_m2 * row.preco_m2;
}

/** Valor de um combo para um row (usa override se existir, senão total + adicional). */
export function calcCombo(
  row: ALRow,
  ci: number,
  comboNames: string[],
  combosAdicionais: number[] | undefined,
): number {
  const label = comboNames[ci] || `COMBO ${String(ci + 1).padStart(2, "0")}`;
  if (row.combo_overrides[label] != null) return row.combo_overrides[label];
  const adicional = Array.isArray(combosAdicionais) ? (combosAdicionais[ci] ?? 0) : 0;
  return calcTotal(row) + adicional;
}

/** Aplica atualização de preços em todos os rows (retorna novo array — imutável). */
export function applyAtualizarPrecos(
  rows: ALRow[],
  pm2: number,
  combosAdicionais: number[],
  comboNames: string[],
): ALRow[] {
  return rows.map((r) => {
    const base = r.area_m2 != null ? r.area_m2 * pm2 : 0;
    const newCombos: Record<string, number> = {};
    (combosAdicionais || []).forEach((adicional, ci) => {
      const label = comboNames[ci] || `COMBO ${String(ci + 1).padStart(2, "0")}`;
      newCombos[label] = base + adicional;
    });
    return {
      ...r,
      preco_m2: pm2,
      preco_m2_is_override: false,
      total_override: base,
      combo_overrides: newCombos,
      total_stale: false,
    };
  });
}

/** Aplica mudança de m² em um row (retorna novo array — imutável). */
export function applyM2Change(rows: ALRow[], id: string, val: number | null): ALRow[] {
  return rows.map((r) => {
    if (r.id !== id) return r;
    // Se limpou o m², limpa também total_override e combo_overrides
    if (val == null) {
      return { ...r, area_m2: null, total_override: null, combo_overrides: {}, total_stale: false };
    }
    const stale = r.total_override != null || Object.keys(r.combo_overrides).length > 0;
    return { ...r, area_m2: val, total_stale: stale };
  });
}

/** Aplica mudança de preço/m² em um row (retorna novo array — imutável). */
export function applyPrecoM2Change(
  rows: ALRow[],
  id: string,
  val: number | null,
  precoM2Ref: number | undefined,
): ALRow[] {
  return rows.map((r) => {
    if (r.id !== id) return r;
    const stale = r.total_override != null || Object.keys(r.combo_overrides).length > 0;
    return {
      ...r,
      preco_m2: val,
      preco_m2_is_override: val != null && val !== precoM2Ref,
      total_stale: stale,
    };
  });
}

/** Aplica mudança de combo override em um row (retorna novo array — imutável). */
export function applyComboChange(
  rows: ALRow[],
  id: string,
  ci: number,
  val: number | null,
  comboNames: string[],
): ALRow[] {
  const label = comboNames[ci] || `COMBO ${String(ci + 1).padStart(2, "0")}`;
  return rows.map((r) => {
    if (r.id !== id) return r;
    const overrides = { ...r.combo_overrides };
    if (val == null) {
      delete overrides[label];
    } else {
      overrides[label] = val;
    }
    return { ...r, combo_overrides: overrides };
  });
}

// ── Hook (memoiza as funções que precisam de contexto) ──────────

export function useAreaLivreCalculations(
  comboNames: string[],
  categoria: CategoriaSetup | null,
) {
  const calcTotalMemo = useCallback((row: ALRow) => calcTotal(row), []);

  const calcComboMemo = useCallback(
    (row: ALRow, ci: number) =>
      calcCombo(row, ci, comboNames, categoria?.combos_adicionais),
    [comboNames, categoria],
  );

  return { calcTotal: calcTotalMemo, calcCombo: calcComboMemo };
}
