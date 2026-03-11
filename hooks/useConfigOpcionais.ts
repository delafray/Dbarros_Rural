import React, { useState } from "react";
import { ItemOpcional } from "../services/itensOpcionaisService";
import { supabase } from "../services/supabaseClient";

interface UseConfigOpcionaisParams {
  configId: string | null;
  edicaoId: string | undefined;
  opcionaisDisponiveis: ItemOpcional[];
  opcionaisSelecionados: string[];
  setOpcionaisSelecionados: React.Dispatch<React.SetStateAction<string[]>>;
  opcionaisPrecos: Record<string, number>;
  setOpcionaisPrecos: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  opcionaisNomes: Record<string, string>;
  setOpcionaisNomes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  opcionaisUsados: Set<string>;
  salvosOk: Set<string>;
  setSalvosOk: React.Dispatch<React.SetStateAction<Set<string>>>;
  appDialog: {
    alert: (opts: { title: string; message: string; type: string }) => Promise<void>;
    confirm: (opts: { title: string; message: string; confirmText: string; type: string }) => Promise<boolean>;
  };
}

export function useConfigOpcionais({
  configId,
  edicaoId,
  opcionaisDisponiveis,
  opcionaisSelecionados,
  setOpcionaisSelecionados,
  opcionaisPrecos,
  setOpcionaisPrecos,
  opcionaisNomes,
  setOpcionaisNomes,
  opcionaisUsados,
  salvosOk,
  setSalvosOk,
  appDialog,
}: UseConfigOpcionaisParams) {
  const [showOpcionaisPopup, setShowOpcionaisPopup] = useState(false);

  const toggleOpcional = async (id: string) => {
    if (opcionaisSelecionados.includes(id)) {
      const nomeSnapshot = opcionaisNomes[id];
      const nomeDisplay = nomeSnapshot || opcionaisDisponiveis.find((o) => o.id === id)?.nome;
      if (nomeDisplay && opcionaisUsados.has(nomeDisplay)) {
        await appDialog.alert({
          title: 'Item em uso',
          message: `O item "${nomeDisplay}" ja esta marcado em estandes da planilha.\n\nPara remove-lo da edicao, primeiro desmarque-o em todos os estandes na planilha.`,
          type: 'danger',
        });
        return;
      }
      setOpcionaisPrecos((p) => { const n = { ...p }; delete n[id]; return n; });
      setOpcionaisNomes((p) => { const n = { ...p }; delete n[id]; return n; });
      setOpcionaisSelecionados((prev) => prev.filter((x) => x !== id));
      return;
    }
    const item = opcionaisDisponiveis.find((o) => o.id === id);
    if (item) {
      setOpcionaisPrecos((p) => ({ ...p, [id]: Number(item.preco_base) || 0 }));
      setOpcionaisNomes((p) => ({ ...p, [id]: item.nome }));
    }
    setOpcionaisSelecionados((prev) => [...prev, id]);
  };

  const updatePreco = (id: string, value: string) => {
    setOpcionaisPrecos((prev) => ({ ...prev, [id]: Number(value) || 0 }));
  };

  const handleSavePreco = async (id: string) => {
    if (!edicaoId || !configId) {
      await appDialog.alert({ title: 'Aviso', message: 'Salve as configuracoes gerais primeiro.', type: 'warning' });
      return;
    }
    const item = opcionaisDisponiveis.find((o) => o.id === id);
    const nomeDisplay = opcionaisNomes[id] || item?.nome || id;
    const novoPreco = opcionaisPrecos[id] ?? Number(item?.preco_base ?? 0);
    const precoFmt = novoPreco.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

    if (opcionaisUsados.has(nomeDisplay)) {
      const ok = await appDialog.confirm({
        title: 'Atualizar preco',
        message:
          `O item "${nomeDisplay}" ja esta marcado em estandes desta planilha.\n\n` +
          `Ao confirmar, o novo preco de R$ ${precoFmt} sera salvo na configuracao e passara a valer para todos os calculos da edicao.\n\n` +
          `Deseja continuar?`,
        confirmText: 'Confirmar',
        type: 'danger',
      });
      if (!ok) return;
    }

    const newPrecos = { ...opcionaisPrecos, [id]: novoPreco };
    const { error } = await supabase
      .from("planilha_configuracoes")
      .update({ opcionais_precos: newPrecos as unknown as import("../database.types").Json })
      .eq("id", configId);

    if (error) {
      await appDialog.alert({ title: 'Erro', message: 'Erro ao salvar preco: ' + error.message, type: 'danger' });
      return;
    }

    setOpcionaisPrecos(newPrecos);
    setSalvosOk((prev) => new Set(prev).add(id));
    setTimeout(() => setSalvosOk((prev) => { const n = new Set(prev); n.delete(id); return n; }), 2500);
  };

  return {
    showOpcionaisPopup, setShowOpcionaisPopup,
    toggleOpcional, updatePreco, handleSavePreco,
  };
}
