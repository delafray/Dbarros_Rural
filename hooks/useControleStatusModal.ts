import React, { useState } from "react";
import {
  imagensService,
  StandImagemStatus,
  StandStatus,
} from "../services/imagensService";

const STATUS_ORDER: Record<StandStatus, number> = { pendente: 0, solicitado: 1, completo: 2 };
const TS_KEY: Record<StandStatus, "pendente_em" | "solicitado_em" | "completo_em"> = {
  pendente: "pendente_em",
  solicitado: "solicitado_em",
  completo: "completo_em",
};
const STATUS_LABELS: Record<StandStatus, string> = {
  pendente: "Pendente",
  solicitado: "Solicitado",
  completo: "Completo",
};

interface UseControleStatusModalParams {
  statusMap: Record<string, StandImagemStatus>;
  setStatusMap: React.Dispatch<React.SetStateAction<Record<string, StandImagemStatus>>>;
  appDialog: {
    confirm: (opts: { title: string; message: string; confirmText: string; type: string }) => Promise<boolean>;
    alert: (opts: { title: string; message: string; type: string }) => Promise<void>;
  };
}

export function useControleStatusModal({
  statusMap,
  setStatusMap,
  appDialog,
}: UseControleStatusModalParams) {
  const [detailModal, setDetailModal] = useState<{ rowId: string; obs: string } | null>(null);

  const handleSaveStatus = async (rowId: string, status: StandStatus, obs: string) => {
    const existingSt = statusMap[rowId];
    const currentLevel = STATUS_ORDER[(existingSt?.status as StandStatus) ?? "pendente"] ?? 0;
    const newLevel = STATUS_ORDER[status];

    let clearTimestamps: Array<"pendente_em" | "solicitado_em" | "completo_em"> | undefined;
    if (newLevel < currentLevel) {
      const confirmed = await appDialog.confirm({
        title: "Regredir status",
        message: `Atencao: voce esta voltando de "${STATUS_LABELS[existingSt.status]}" para "${STATUS_LABELS[status]}".\n\nAs datas registradas nos status superiores serao apagadas. Confirma?`,
        confirmText: "Confirmar",
        type: "warning",
      });
      if (!confirmed) return;
      clearTimestamps = (Object.keys(STATUS_ORDER) as StandStatus[])
        .filter((s) => STATUS_ORDER[s] > newLevel)
        .map((s) => TS_KEY[s]);
    }

    try {
      await imagensService.upsertStatus(rowId, status, obs, existingSt, clearTimestamps);

      const now = new Date().toISOString();
      const tsKey = TS_KEY[status];

      setStatusMap((prev) => {
        const existing = prev[rowId] as any;
        const updated: any = {
          ...existing,
          id: existing?.id || "",
          estande_id: rowId,
          status,
          observacoes: obs || null,
          atualizado_em: now,
          [tsKey]: existing?.[tsKey] ?? now,
        };
        if (clearTimestamps) clearTimestamps.forEach((k) => { updated[k] = null; });
        return { ...prev, [rowId]: updated as StandImagemStatus };
      });

      setDetailModal(null);
    } catch (err) {
      await appDialog.alert({
        title: "Erro",
        message: "Erro ao salvar: " + (err instanceof Error ? err.message : String(err)),
        type: "danger",
      });
    }
  };

  return { detailModal, setDetailModal, handleSaveStatus };
}
