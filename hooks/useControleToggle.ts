import React, { useState, useCallback } from "react";
import { PlanilhaEstande } from "../services/planilhaVendasService";
import {
  imagensService,
  ImagemConfig,
  RecebimentosMap,
  StandImagemStatus,
} from "../services/imagensService";
import { RowStatus } from "./useControleFilters";

interface UseControleToggleParams {
  columnConfigs: ImagemConfig[];
  estandes: PlanilhaEstande[];
  isApplicable: (row: PlanilhaEstande, cfg: ImagemConfig) => boolean;
  recebimentos: RecebimentosMap;
  setRecebimentos: React.Dispatch<React.SetStateAction<RecebimentosMap>>;
  setStatusMap: React.Dispatch<React.SetStateAction<Record<string, StandImagemStatus>>>;
  appDialog: { alert: (opts: { title: string; message: string; type: string }) => Promise<void> };
}

export function useControleToggle({
  columnConfigs,
  estandes,
  isApplicable,
  recebimentos,
  setRecebimentos,
  setStatusMap,
  appDialog,
}: UseControleToggleParams) {
  const [saving, setSaving] = useState<string | null>(null);

  const getRowStatus = useCallback(
    (row: PlanilhaEstande): RowStatus => {
      const applicable = columnConfigs.filter((cfg) => isApplicable(row, cfg));
      if (applicable.length === 0) return "sem_config";
      const rowRec = recebimentos[row.id] || {};
      const received = applicable.filter((cfg) => rowRec[cfg.id]).length;
      if (received === 0) return "pendente";
      if (received === applicable.length) return "completo";
      return "parcial";
    },
    [columnConfigs, isApplicable, recebimentos],
  );

  const handleToggle = useCallback(
    async (estandeId: string, imagemConfigId: string, currentValue: boolean) => {
      const cellKey = `${estandeId}-${imagemConfigId}`;
      if (saving === cellKey) return;
      setSaving(cellKey);

      const newValue = !currentValue;

      // Optimistic update
      setRecebimentos((prev) => ({
        ...prev,
        [estandeId]: { ...(prev[estandeId] || {}), [imagemConfigId]: newValue },
      }));

      try {
        await imagensService.setRecebimento(estandeId, imagemConfigId, newValue);

        const applicable = columnConfigs.filter((cfg) => {
          const estande = estandes.find((e) => e.id === estandeId);
          return estande ? isApplicable(estande, cfg) : false;
        });
        const newMap = {
          ...(recebimentos[estandeId] || {}),
          [imagemConfigId]: newValue,
        };
        const newStatus = imagensService.computeStandStatus(
          newMap,
          applicable.map((c) => c.id),
        );
        await imagensService.upsertStatus(estandeId, newStatus);

        setStatusMap((prev) => ({
          ...prev,
          [estandeId]: {
            id: prev[estandeId]?.id || "",
            estande_id: estandeId,
            status: newStatus,
            observacoes: prev[estandeId]?.observacoes || null,
            atualizado_em: new Date().toISOString(),
          },
        }));
      } catch (err) {
        // Rollback
        setRecebimentos((prev) => ({
          ...prev,
          [estandeId]: {
            ...(prev[estandeId] || {}),
            [imagemConfigId]: currentValue,
          },
        }));
        void appDialog.alert({ title: "Erro", message: "Erro ao salvar. Tente novamente.", type: "danger" });
      } finally {
        setSaving(null);
      }
    },
    [saving, columnConfigs, estandes, isApplicable, recebimentos, appDialog, setRecebimentos, setStatusMap],
  );

  return { saving, getRowStatus, handleToggle };
}
