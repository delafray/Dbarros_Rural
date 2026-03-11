import React, { useState, useEffect } from "react";
import { PlanilhaEstande } from "../services/planilhaVendasService";
import {
  imagensService,
  ImagemConfig,
  RecebimentosMap,
  StandImagemStatus,
  StandStatus,
} from "../services/imagensService";

const STATUS_ORDER: Record<StandStatus, number> = { pendente: 0, solicitado: 1, completo: 2 };
const TS_KEY: Record<StandStatus, 'pendente_em' | 'solicitado_em' | 'completo_em'> = {
  pendente: 'pendente_em', solicitado: 'solicitado_em', completo: 'completo_em',
};
const STATUS_LABELS: Record<StandStatus, string> = {
  pendente: 'Pendente', solicitado: 'Solicitado', completo: 'Completo',
};

export { STATUS_ORDER, TS_KEY, STATUS_LABELS };

interface UsePlanilhaStatusModalParams {
  rows: PlanilhaEstande[];
  statusMap: Record<string, StandImagemStatus>;
  setStatusMap: React.Dispatch<React.SetStateAction<Record<string, StandImagemStatus>>>;
  setRecebimentosMap: React.Dispatch<React.SetStateAction<RecebimentosMap>>;
  getImagensDoStand: (row: PlanilhaEstande) => ImagemConfig[];
  appDialog: { alert: (opts: { title: string; message: string; type: string }) => Promise<void> };
}

export function usePlanilhaStatusModal({
  rows,
  statusMap,
  setStatusMap,
  setRecebimentosMap,
  getImagensDoStand,
  appDialog,
}: UsePlanilhaStatusModalParams) {
  const [statusModal, setStatusModal] = useState<{ rowId: string; obs: string } | null>(null);
  const [modalRecebimentos, setModalRecebimentos] = useState<Record<string, boolean>>({});
  const [modalRecebLoading, setModalRecebLoading] = useState(false);
  const [pendingCompleteConfirm, setPendingCompleteConfirm] = useState<{
    imgTotal: number;
    imgRecebidas: number;
    imgDoStand: ImagemConfig[];
  } | null>(null);

  useEffect(() => {
    if (!statusModal?.rowId) { setModalRecebimentos({}); return; }
    setModalRecebLoading(true);
    imagensService.getRecebimentosByEstande(statusModal.rowId)
      .then(setModalRecebimentos)
      .catch(console.error)
      .finally(() => setModalRecebLoading(false));
  }, [statusModal?.rowId]);

  const handleToggleRecebimento = (configId: string) => {
    setModalRecebimentos((prev) => ({ ...prev, [configId]: !prev[configId] }));
  };

  const handleSaveModal = async (status: StandStatus, forceComplete = false) => {
    if (!statusModal) return;
    const row = rows.find((r) => r.id === statusModal.rowId);
    const imgDoStand = row ? getImagensDoStand(row) : [];
    const existingSt = statusMap[statusModal.rowId];
    const currentLevel = STATUS_ORDER[existingSt?.status as StandStatus ?? 'pendente'] ?? 0;
    const newLevel = STATUS_ORDER[status];

    // Intercepta COMPLETO com imagens pendentes
    if (status === 'completo' && !forceComplete && imgDoStand.length > 0) {
      const totalImgs = imgDoStand.length;
      const recebidas = imgDoStand.filter((cfg) => !!modalRecebimentos[cfg.id]).length;
      if (recebidas < totalImgs) {
        setPendingCompleteConfirm({ imgTotal: totalImgs, imgRecebidas: recebidas, imgDoStand });
        return;
      }
    }

    // Detecta regressão de status
    let clearTimestamps: Array<'pendente_em' | 'solicitado_em' | 'completo_em'> | undefined;
    if (newLevel < currentLevel) {
      const confirmed = confirm(
        `Atenção: você está voltando de "${STATUS_LABELS[existingSt.status]}" para "${STATUS_LABELS[status]}".\n\nAs datas registradas nos status superiores serão apagadas. Confirma?`
      );
      if (!confirmed) return;
      clearTimestamps = (Object.keys(STATUS_ORDER) as StandStatus[])
        .filter((s) => STATUS_ORDER[s] > newLevel)
        .map((s) => TS_KEY[s]);
    }

    try {
      const recebimentosParaSalvar = forceComplete
        ? Object.fromEntries(imgDoStand.map((cfg) => [cfg.id, true]))
        : modalRecebimentos;

      if (imgDoStand.length > 0) {
        await Promise.all(
          imgDoStand.map((cfg: ImagemConfig) =>
            imagensService.setRecebimento(statusModal.rowId, cfg.id, !!recebimentosParaSalvar[cfg.id]),
          ),
        );
      }
      await imagensService.upsertStatus(statusModal.rowId, status, statusModal.obs, existingSt, clearTimestamps);
      // Atualiza recebimentosMap para o contador na badge
      const newRec: Record<string, boolean> = {};
      imgDoStand.forEach((cfg: ImagemConfig) => { newRec[cfg.id] = !!recebimentosParaSalvar[cfg.id]; });
      setRecebimentosMap((prev) => ({
        ...prev,
        [statusModal.rowId]: { ...(prev[statusModal.rowId] || {}), ...newRec },
      }));
      const now = new Date().toISOString();
      const tsKey = TS_KEY[status];
      setStatusMap((prev) => {
        const existing = prev[statusModal.rowId] as any;
        const updated: any = {
          ...existing,
          id: existing?.id || "",
          estande_id: statusModal.rowId,
          status,
          observacoes: statusModal.obs || null,
          atualizado_em: now,
          [tsKey]: existing?.[tsKey] ?? now,
        };
        if (clearTimestamps) clearTimestamps.forEach((k) => { updated[k] = null; });
        return { ...prev, [statusModal.rowId]: updated as StandImagemStatus };
      });
      setStatusModal(null);
      setPendingCompleteConfirm(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as any)?.message || JSON.stringify(err);
      void appDialog.alert({ title: 'Erro', message: 'Erro ao salvar: ' + msg, type: 'danger' });
    }
  };

  return {
    statusModal,
    setStatusModal,
    modalRecebimentos,
    modalRecebLoading,
    handleToggleRecebimento,
    handleSaveModal,
    pendingCompleteConfirm,
    setPendingCompleteConfirm,
  };
}
