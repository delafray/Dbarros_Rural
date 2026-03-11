import React, { useState } from "react";
import {
  imagensService,
  ImagemConfig,
  OrigemTipo,
  AvulsoStatus,
} from "../services/imagensService";

interface UseConfigImagensParams {
  edicaoId: string | undefined;
  imagensConfig: ImagemConfig[];
  setImagensConfig: React.Dispatch<React.SetStateAction<ImagemConfig[]>>;
  appDialog: { alert: (opts: { title: string; message: string; type: string }) => Promise<void> };
}

export function useConfigImagens({
  edicaoId,
  imagensConfig,
  setImagensConfig,
  appDialog,
}: UseConfigImagensParams) {
  const [imagensModal, setImagensModal] = useState<{ tipo: OrigemTipo; ref: string; label: string } | null>(null);
  const [novaImagem, setNovaImagem] = useState({ tipo: "imagem" as "imagem" | "logo", descricao: "", dimensoes: "" });
  const [savingImagem, setSavingImagem] = useState(false);
  const [editingImagem, setEditingImagem] = useState<{
    id: string; tipo: "imagem" | "logo"; descricao: string; dimensoes: string;
  } | null>(null);

  const getImagensForRef = (tipo: OrigemTipo, ref: string) =>
    imagensConfig.filter((c) => c.origem_tipo === tipo && c.origem_ref === ref);

  const handleOpenImagensModal = (tipo: OrigemTipo, ref: string, label: string, tipoPadrao?: "imagem" | "logo" | null) => {
    setImagensModal({ tipo, ref, label });
    setNovaImagem({ tipo: tipoPadrao ?? "imagem", descricao: "", dimensoes: "" });
    setEditingImagem(null);
  };

  const handleAddImagem = async () => {
    if (!novaImagem.descricao.trim() || !edicaoId || !imagensModal) return;
    setSavingImagem(true);
    try {
      const added = await imagensService.addConfig({
        edicao_id: edicaoId,
        origem_tipo: imagensModal.tipo,
        origem_ref: imagensModal.ref,
        tipo: novaImagem.tipo,
        descricao: novaImagem.descricao.trim(),
        dimensoes: novaImagem.tipo === "imagem" && novaImagem.dimensoes.trim() ? novaImagem.dimensoes.trim() : null,
      });
      setImagensConfig((prev) => [...prev, added]);
      setNovaImagem({ tipo: "imagem", descricao: "", dimensoes: "" });
    } catch (err) {
      await appDialog.alert({ title: 'Erro', message: 'Erro ao adicionar: ' + (err instanceof Error ? err.message : String(err)), type: 'danger' });
    } finally {
      setSavingImagem(false);
    }
  };

  const handleRemoveImagem = async (id: string) => {
    try {
      await imagensService.removeConfig(id);
      setImagensConfig((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      await appDialog.alert({ title: 'Erro', message: 'Erro ao remover: ' + (err instanceof Error ? err.message : String(err)), type: 'danger' });
    }
  };

  const handleUpdateImagem = async () => {
    if (!editingImagem || !editingImagem.descricao.trim()) return;
    setSavingImagem(true);
    try {
      const updated = await imagensService.updateConfig(editingImagem.id, {
        tipo: editingImagem.tipo,
        descricao: editingImagem.descricao.trim(),
        dimensoes: editingImagem.tipo === "imagem" && editingImagem.dimensoes.trim() ? editingImagem.dimensoes.trim() : null,
      });
      setImagensConfig((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditingImagem(null);
    } catch (err) {
      await appDialog.alert({ title: 'Erro', message: 'Erro ao atualizar: ' + (err instanceof Error ? err.message : String(err)), type: 'danger' });
    } finally {
      setSavingImagem(false);
    }
  };

  const handleUpdateAvulsoStatus = async (id: string, status: AvulsoStatus) => {
    try {
      await imagensService.updateAvulsoStatus(id, status);
      setImagensConfig((prev) => prev.map((c) => (c.id === id ? { ...c, avulso_status: status } : c)));
    } catch (err) {
      await appDialog.alert({ title: 'Erro', message: 'Erro ao atualizar status: ' + (err instanceof Error ? err.message : String(err)), type: 'danger' });
    }
  };

  return {
    imagensModal, setImagensModal,
    novaImagem, setNovaImagem,
    savingImagem, editingImagem, setEditingImagem,
    getImagensForRef, handleOpenImagensModal,
    handleAddImagem, handleRemoveImagem, handleUpdateImagem,
    handleUpdateAvulsoStatus,
  };
}
