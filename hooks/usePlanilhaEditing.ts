import React, { useState, useEffect } from "react";
import { planilhaVendasService, PlanilhaEstande } from "../services/planilhaVendasService";

interface AppDialog {
  alert: (opts: { title: string; message: string; type: string }) => Promise<void>;
}

export function usePlanilhaEditing(
  rows: PlanilhaEstande[],
  setRows: React.Dispatch<React.SetStateAction<PlanilhaEstande[]>>,
  appDialog: AppDialog,
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

  const showSaveError = (campo: string) => {
    void appDialog.alert({
      title: "Erro ao salvar",
      message: `Não foi possível salvar "${campo}". O valor foi revertido.`,
      type: "danger",
    });
  };

  const handleSelectCombo = async (rowId: string, comboLabel: string) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    const oldTipo = row.tipo_venda;
    let newTipo: string;
    if (row.tipo_venda === comboLabel) newTipo = comboLabel + "*";
    else if (row.tipo_venda === comboLabel + "*") newTipo = "DISPONÍVEL";
    else newTipo = comboLabel;
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, tipo_venda: newTipo } : r)),
    );
    planilhaVendasService
      .updateEstande(rowId, { tipo_venda: newTipo })
      .catch(() => {
        setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, tipo_venda: oldTipo } : r)));
        showSaveError("combo");
      });
  };

  const handleToggleOpcional = async (rowId: string, optNome: string) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    const oldSel = (row.opcionais_selecionados as Record<string, string>) || {};
    const sel = { ...oldSel };
    const cur = sel[optNome] || "";
    if (cur === "") sel[optNome] = "x";
    else if (cur === "x") sel[optNome] = "*";
    else sel[optNome] = "";
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, opcionais_selecionados: sel } : r)),
    );
    planilhaVendasService
      .updateEstande(rowId, { opcionais_selecionados: sel })
      .catch(() => {
        setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, opcionais_selecionados: oldSel } : r)));
        showSaveError(optNome);
      });
  };

  const handleUpdateField = (rowId: string, field: string, value: unknown) => {
    const row = rows.find((r) => r.id === rowId);
    const oldValue = row ? (row as Record<string, unknown>)[field] : undefined;
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)),
    );
    planilhaVendasService
      .updateEstande(rowId, { [field]: value } as Partial<PlanilhaEstande>)
      .catch(() => {
        setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, [field]: oldValue } : r)));
        showSaveError(field);
      });
  };

  const handleObsChange = (rowId: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, observacoes: value } : r)),
    );
  };

  const handleObsBlur = (rowId: string, value: string) => {
    planilhaVendasService
      .updateEstande(rowId, { observacoes: value })
      .catch(() => showSaveError("observações"));
  };

  const handleClienteSelect = (rowId: string, clienteId: string | null, nomeLivre: string | null) => {
    const row = rows.find((r) => r.id === rowId);
    const oldClienteId = row?.cliente_id ?? null;
    const oldNomeLivre = row?.cliente_nome_livre ?? null;
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? { ...r, cliente_id: clienteId, cliente_nome_livre: nomeLivre }
          : r,
      ),
    );
    planilhaVendasService
      .updateEstande(rowId, { cliente_id: clienteId, cliente_nome_livre: nomeLivre })
      .catch(() => {
        setRows((prev) =>
          prev.map((r) =>
            r.id === rowId
              ? { ...r, cliente_id: oldClienteId, cliente_nome_livre: oldNomeLivre }
              : r,
          ),
        );
        showSaveError("cliente");
      });
  };

  const handleSaveM2 = async (rowId: string, newVal: string) => {
    const parsed = parseFloat(newVal);
    const area_m2 = isNaN(parsed) ? null : parsed;
    setEditingM2(null);
    if (area_m2 === null) return;
    const row = rows.find((r) => r.id === rowId);
    const oldArea = row?.area_m2 ?? null;
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, area_m2 } : r)),
    );
    planilhaVendasService
      .updateEstande(rowId, { area_m2 } as Partial<PlanilhaEstande>)
      .then(() => setM2AvisoModal(true))
      .catch(() => {
        setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, area_m2: oldArea } : r)));
        showSaveError("m²");
      });
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
