import React, { useState, useEffect } from "react";
import { planilhaVendasService, PlanilhaEstande } from "../services/planilhaVendasService";
import { TIPO_DISPONIVEL, TIPO_RESERVADO, isReservado } from "../utils/planilhaCalc";

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

  /**
   * Ciclo da célula (mesmo do mapa, 18/09): vazio → RESERVADO* → x (rótulo) → * (rótulo*) → vazio.
   * Reservado exige cliente: sem cliente devolve "precisa_cliente" e a tela abre o modal
   * (depois grava RESERVADO* junto com o cliente). Clicar num combo diferente do marcado troca
   * o combo direto (regra antiga preservada). Devolve o tipo gravado ou "precisa_cliente".
   */
  const handleSelectCombo = async (rowId: string, comboLabel: string): Promise<string | "precisa_cliente" | undefined> => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    const oldTipo = row.tipo_venda;
    const tipo = (row.tipo_venda || "").trim();
    const temCliente = !!row.cliente_id || !!(row.cliente_nome_livre && row.cliente_nome_livre.trim());
    let newTipo: string;
    if (!tipo || tipo === TIPO_DISPONIVEL) {
      if (!temCliente) return "precisa_cliente";
      newTipo = TIPO_RESERVADO;
    }
    else if (isReservado(tipo)) newTipo = comboLabel;
    else if (tipo === comboLabel) newTipo = comboLabel + "*";
    else if (tipo === comboLabel + "*") newTipo = TIPO_DISPONIVEL;
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
    return newTipo;
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

  const handleClienteSelect = (rowId: string, clienteId: string | null, nomeLivre: string | null, opts?: { reservar?: boolean }) => {
    const row = rows.find((r) => r.id === rowId);
    const oldClienteId = row?.cliente_id ?? null;
    const oldNomeLivre = row?.cliente_nome_livre ?? null;
    const oldTipo = row?.tipo_venda ?? TIPO_DISPONIVEL;
    const temCliente = !!clienteId || !!(nomeLivre && nomeLivre.trim());
    const updates: Partial<PlanilhaEstande> = { cliente_id: clienteId, cliente_nome_livre: nomeLivre };
    // Veio do clique "reservar" numa linha sem cliente: com cliente escolhido, grava RESERVADO* junto.
    if (opts?.reservar && temCliente && (!oldTipo || oldTipo === TIPO_DISPONIVEL)) updates.tipo_venda = TIPO_RESERVADO;
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...updates } : r)));
    planilhaVendasService
      .updateEstande(rowId, updates)
      .catch(() => {
        setRows((prev) =>
          prev.map((r) =>
            r.id === rowId
              ? { ...r, cliente_id: oldClienteId, cliente_nome_livre: oldNomeLivre, tipo_venda: oldTipo }
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
