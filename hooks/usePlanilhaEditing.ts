import React, { useState, useEffect } from "react";
import { planilhaVendasService, PlanilhaEstande } from "../services/planilhaVendasService";
import { supabase } from "../services/supabaseClient";

export function usePlanilhaEditing(
  rows: PlanilhaEstande[],
  setRows: React.Dispatch<React.SetStateAction<PlanilhaEstande[]>>,
) {
  const [editing, setEditing] = useState<{ id: string; field: string; val: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<{ rowId: string; field: string } | null>(null);
  const [editingM2, setEditingM2] = useState<{ id: string; val: string } | null>(null);
  const [m2AvisoModal, setM2AvisoModal] = useState(false);

  // Clear pending action on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPendingAction(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSelectCombo = async (rowId: string, comboLabel: string) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    let newTipo: string;
    if (row.tipo_venda === comboLabel) newTipo = comboLabel + "*";
    else if (row.tipo_venda === comboLabel + "*") newTipo = "DISPONÍVEL";
    else newTipo = comboLabel;
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, tipo_venda: newTipo } : r)),
    );
    planilhaVendasService
      .updateEstande(rowId, { tipo_venda: newTipo })
      .catch((err) => console.error("Erro ao salvar combo:", err));
  };

  const handleToggleOpcional = async (rowId: string, optNome: string) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    const sel = { ...((row.opcionais_selecionados as Record<string, string>) || {}) };
    const cur = sel[optNome] || "";
    if (cur === "") sel[optNome] = "x";
    else if (cur === "x") sel[optNome] = "*";
    else sel[optNome] = "";
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, opcionais_selecionados: sel } : r)),
    );
    planilhaVendasService
      .updateEstande(rowId, { opcionais_selecionados: sel })
      .catch((err) => console.error("Erro ao salvar opcional:", err));
  };

  const handleUpdateField = (rowId: string, field: string, value: unknown) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)),
    );
    planilhaVendasService
      .updateEstande(rowId, { [field]: value } as Partial<PlanilhaEstande>)
      .catch((err) => console.error(`Erro ao salvar ${field}:`, err));
  };

  const handleObsChange = (rowId: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, observacoes: value } : r)),
    );
  };

  const handleObsBlur = (rowId: string, value: string) => {
    planilhaVendasService
      .updateEstande(rowId, { observacoes: value })
      .catch((err) => console.error("Erro ao salvar obs:", err));
  };

  const handleClienteSelect = (rowId: string, clienteId: string | null, nomeLivre: string | null) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? { ...r, cliente_id: clienteId, cliente_nome_livre: nomeLivre }
          : r,
      ),
    );
    planilhaVendasService
      .updateEstande(rowId, { cliente_id: clienteId, cliente_nome_livre: nomeLivre })
      .catch((err) => console.error("Erro ao salvar cliente:", err));
  };

  const handleSaveM2 = async (rowId: string, newVal: string) => {
    const parsed = parseFloat(newVal);
    const area_m2 = isNaN(parsed) ? null : parsed;
    setEditingM2(null);
    if (area_m2 === null) return;
    await supabase
      .from("planilha_vendas_estandes")
      .update({ area_m2 })
      .eq("id", rowId);
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, area_m2 } : r)),
    );
    setM2AvisoModal(true);
  };

  return {
    editing,
    setEditing,
    pendingAction,
    setPendingAction,
    editingM2,
    setEditingM2,
    m2AvisoModal,
    setM2AvisoModal,
    handleSelectCombo,
    handleToggleOpcional,
    handleUpdateField,
    handleObsChange,
    handleObsBlur,
    handleClienteSelect,
    handleSaveM2,
  };
}
