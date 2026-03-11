import React, { useState } from "react";
import {
  imagensService,
  ImagemConfig,
  AvulsoStatus,
} from "../services/imagensService";

interface UseControleAvulsasParams {
  selectedEdicaoId: string;
  imagensConfig: ImagemConfig[];
  setImagensConfig: React.Dispatch<React.SetStateAction<ImagemConfig[]>>;
  appDialog: {
    confirm: (opts: { title: string; message: string; confirmText: string; type: string }) => Promise<boolean>;
    alert: (opts: { title: string; message: string; type: string }) => Promise<void>;
  };
}

export function useControleAvulsas({
  selectedEdicaoId,
  imagensConfig,
  setImagensConfig,
  appDialog,
}: UseControleAvulsasParams) {
  const [avulsaAddOpen, setAvulsaAddOpen] = useState(false);
  const [novaAvulsa, setNovaAvulsa] = useState({ tipo: "imagem" as "imagem" | "logo", descricao: "", dimensoes: "" });
  const [savingAvulsa, setSavingAvulsa] = useState(false);
  const [editingAvulsa, setEditingAvulsa] = useState<{
    id: string;
    tipo: "imagem" | "logo";
    descricao: string;
    dimensoes: string;
  } | null>(null);

  const avulsas = imagensConfig.filter((c) => c.origem_tipo === "avulso");

  const handleAddAvulsa = async () => {
    if (!novaAvulsa.descricao.trim() || !selectedEdicaoId) return;
    setSavingAvulsa(true);
    try {
      const added = await imagensService.addConfig({
        edicao_id: selectedEdicaoId,
        origem_tipo: "avulso",
        origem_ref: "__avulso__",
        tipo: novaAvulsa.tipo,
        descricao: novaAvulsa.descricao.trim(),
        dimensoes: novaAvulsa.tipo === "imagem" && novaAvulsa.dimensoes.trim() ? novaAvulsa.dimensoes.trim() : null,
      });
      setImagensConfig((prev) => [...prev, added]);
      setNovaAvulsa({ tipo: "imagem", descricao: "", dimensoes: "" });
      setAvulsaAddOpen(false);
    } catch (err) {
      await appDialog.alert({
        title: "Erro",
        message: "Erro ao adicionar: " + (err instanceof Error ? err.message : String(err)),
        type: "danger",
      });
    } finally {
      setSavingAvulsa(false);
    }
  };

  const handleUpdateAvulsoStatus = async (id: string, status: AvulsoStatus) => {
    try {
      await imagensService.updateAvulsoStatus(id, status);
      setImagensConfig((prev) => prev.map((c) => (c.id === id ? { ...c, avulso_status: status } : c)));
    } catch (err) {
      await appDialog.alert({
        title: "Erro",
        message: "Erro ao atualizar status: " + (err instanceof Error ? err.message : String(err)),
        type: "danger",
      });
    }
  };

  const handleRemoveAvulsa = async (id: string) => {
    const confirmed = await appDialog.confirm({
      title: "Remover Imagem",
      message: "Remover esta imagem avulsa?",
      confirmText: "Remover",
      type: "danger",
    });
    if (!confirmed) return;
    try {
      await imagensService.removeConfig(id);
      setImagensConfig((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      await appDialog.alert({
        title: "Erro",
        message: "Erro ao remover: " + (err instanceof Error ? err.message : String(err)),
        type: "danger",
      });
    }
  };

  const handleUpdateAvulsa = async () => {
    if (!editingAvulsa || !editingAvulsa.descricao.trim()) return;
    setSavingAvulsa(true);
    try {
      const updated = await imagensService.updateConfig(editingAvulsa.id, {
        tipo: editingAvulsa.tipo,
        descricao: editingAvulsa.descricao.trim(),
        dimensoes: editingAvulsa.tipo === "imagem" && editingAvulsa.dimensoes.trim() ? editingAvulsa.dimensoes.trim() : null,
      });
      setImagensConfig((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditingAvulsa(null);
    } catch (err) {
      await appDialog.alert({
        title: "Erro",
        message: "Erro ao atualizar: " + (err instanceof Error ? err.message : String(err)),
        type: "danger",
      });
    } finally {
      setSavingAvulsa(false);
    }
  };

  return {
    avulsas,
    avulsaAddOpen,
    setAvulsaAddOpen,
    novaAvulsa,
    setNovaAvulsa,
    savingAvulsa,
    editingAvulsa,
    setEditingAvulsa,
    handleAddAvulsa,
    handleUpdateAvulsoStatus,
    handleRemoveAvulsa,
    handleUpdateAvulsa,
  };
}
