import React from "react";
import {
  planilhaVendasService,
  CategoriaSetup,
} from "../services/planilhaVendasService";
import { imagensService } from "../services/imagensService";
import { supabase } from "../services/supabaseClient";

interface UseConfigSaveParams {
  edicaoId: string | undefined;
  categorias: CategoriaSetup[];
  configId: string | null;
  setConfigId: React.Dispatch<React.SetStateAction<string | null>>;
  savedTags: string[];
  setSavedTags: React.Dispatch<React.SetStateAction<string[]>>;
  savedCounts: Record<string, number>;
  setSavedCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  planilhaExiste: boolean;
  setPlanilhaExiste: React.Dispatch<React.SetStateAction<boolean>>;
  totalStands: number;
  setTotalStands: React.Dispatch<React.SetStateAction<number>>;
  saving: boolean;
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
  comboNames: string[];
  opcionaisSelecionados: string[];
  opcionaisNomes: Record<string, string>;
  opcionaisPrecos: Record<string, number>;
  markClean: () => void;
  navigate: (path: string) => void;
  appDialog: {
    alert: (opts: { title: string; message: string; type: string }) => Promise<void>;
    confirm: (opts: { title: string; message: string; confirmText: string; type: string }) => Promise<boolean>;
  };
}

export function useConfigSave({
  edicaoId,
  categorias,
  configId,
  setConfigId,
  savedTags,
  setSavedTags,
  savedCounts,
  setSavedCounts,
  planilhaExiste,
  setPlanilhaExiste,
  totalStands,
  setTotalStands,
  saving,
  setSaving,
  comboNames,
  opcionaisSelecionados,
  opcionaisNomes,
  opcionaisPrecos,
  markClean,
  navigate,
  appDialog,
}: UseConfigSaveParams) {

  const validateCategorias = (): string | null => {
    const identifiers = new Set<string>();
    for (const cat of categorias) {
      const tagNormalized = (cat.tag || "").trim().toUpperCase();
      if (!tagNormalized || tagNormalized === "NOVA") {
        return `Todas as categorias precisam de uma TAG válida (A TAG "${cat.tag || "vazia"}" não é permitida). Corrija antes de continuar.`;
      }
      if (cat.count < 1) {
        return `A categoria "${cat.tag}" precisa ter ao menos 1 stand (QTD ≥ 1).`;
      }
      const identifier = (cat.prefix || cat.tag || "").trim().toUpperCase();
      if (identifiers.has(identifier)) {
        return `O Identificador/Prefixo "${identifier}" está duplicado. Cada categoria precisa de um prefixo único para evitar erros na geração da planilha.`;
      }
      identifiers.add(identifier);
    }
    return null;
  };

  const validateCountReduction = async (): Promise<string | null> => {
    if (!configId) return null;
    const { data: estandes, error } = await supabase
      .from("planilha_vendas_estandes")
      .select("stand_nr, cliente_id, cliente_nome_livre, tipo_venda, opcionais_selecionados, area_m2, total_override")
      .eq("config_id", configId);
    if (error || !estandes) return null;

    const validStandNrs = new Set<string>();
    for (const cat of categorias) {
      for (let i = 1; i <= cat.count; i++) {
        validStandNrs.add(planilhaVendasService.buildStandNr(cat, i));
      }
    }

    const orphansWithData = (estandes as any[]).filter((e) => {
      if (validStandNrs.has(e.stand_nr)) return false;
      return (
        e.cliente_id ||
        e.cliente_nome_livre ||
        (e.tipo_venda && e.tipo_venda !== "DISPONÍVEL") ||
        (e.opcionais_selecionados && Object.values(e.opcionais_selecionados as Record<string, string>).some(v => !!v))
      );
    });

    if (orphansWithData.length > 0) {
      return `Existem ${orphansWithData.length} estande(s) com dados que ficariam órfãos (ex: ${orphansWithData[0].stand_nr}). Isso ocorre ao reduzir a quantidade, excluir uma categoria ou alterar seu prefixo. Limpe estes estandes na planilha primeiro.`;
    }
    return null;
  };

  const persistConfig = async (): Promise<string> => {
    const categoriasToSave = categorias.map((c) => ({ ...c, comboNames }));
    const payload = {
      edicao_id: edicaoId,
      categorias_config: categoriasToSave as unknown as import("../database.types").Json,
      opcionais_ativos: opcionaisSelecionados,
      opcionais_nomes: opcionaisNomes as unknown as import("../database.types").Json,
      opcionais_precos: opcionaisPrecos as unknown as import("../database.types").Json,
    };
    if (configId) {
      const { data, error } = await supabase.from("planilha_configuracoes").update(payload).eq("id", configId).select().single();
      if (error) throw error;
      return data.id;
    } else {
      const { data, error } = await supabase.from("planilha_configuracoes").insert(payload).select().single();
      if (error) throw error;
      return data.id;
    }
  };

  const handleNavigateToAL = async (cat: CategoriaSetup) => {
    try {
      setSaving(true);
      const savedId = await persistConfig();
      setConfigId(savedId);
      await planilhaVendasService.syncEstandes(savedId, categorias);
      markClean();
      navigate(`/planilha-area-livre/${edicaoId}/${encodeURIComponent(cat.tag)}`);
    } catch (err) {
      await appDialog.alert({ title: 'Erro', message: String(err), type: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!edicaoId) return;
    const catErr = validateCategorias();
    if (catErr) { await appDialog.alert({ title: 'Validacao', message: catErr, type: 'warning' }); return; }
    const err = await validateCountReduction();
    if (err) { await appDialog.alert({ title: 'Validacao', message: err, type: 'warning' }); return; }
    try {
      setSaving(true);
      const renames = savedTags
        .map((oldTag, i) => ({ oldTag, newTag: categorias[i]?.tag }))
        .filter(({ oldTag, newTag }) => oldTag && newTag && oldTag !== newTag);
      if (renames.length > 0) {
        await Promise.all(renames.map(({ oldTag, newTag }) => imagensService.updateOrigemRef(edicaoId, oldTag, newTag)));
      }
      const savedId = await persistConfig();
      setConfigId(savedId);
      setSavedTags(categorias.map((c) => c.tag));
      if (planilhaExiste || savedId) {
        const result = await planilhaVendasService.syncEstandes(savedId, categorias);
        if (result.inserted > 0 || result.deleted > 0) {
          setPlanilhaExiste(true);
          setTotalStands((prev) => prev + result.inserted - result.deleted);
        }
      }
      const counts: Record<string, number> = {};
      categorias.forEach((c) => { counts[c.prefix] = c.count; });
      setSavedCounts(counts);
      markClean();
      await appDialog.alert({ title: 'Salvo!', message: 'Configuracoes salvas!', type: 'success' });
      navigate(`/planilha-vendas/${edicaoId}`);
    } catch (err) {
      console.error(err);
      await appDialog.alert({ title: 'Erro', message: 'Erro ao salvar: ' + (err instanceof Error ? err.message : String(err)), type: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!edicaoId) return;
    if (planilhaExiste) {
      await appDialog.alert({
        title: 'Planilha ja existe',
        message: `Planilha ja existe com ${totalStands} estandes. Limpe os dados na planilha antes de gerar novamente.`,
        type: 'danger',
      });
      return;
    }
    const catErr = validateCategorias();
    if (catErr) { await appDialog.alert({ title: 'Validacao', message: catErr, type: 'warning' }); return; }
    const err = await validateCountReduction();
    if (err) { await appDialog.alert({ title: 'Validacao', message: err, type: 'warning' }); return; }
    const confirmed = await appDialog.confirm({ title: 'Gerar Planilha', message: 'Gerar planilha com as categorias definidas?', confirmText: 'Gerar Planilha', type: 'danger' });
    if (!confirmed) return;
    try {
      setSaving(true);
      const savedId = await persistConfig();
      setConfigId(savedId);
      await planilhaVendasService.generateEstandes(savedId, categorias);
      setPlanilhaExiste(true);
      setTotalStands(categorias.reduce((s, c) => s + c.count, 0));
      await appDialog.alert({ title: 'Gerado!', message: 'Planilha gerada com sucesso!', type: 'success' });
      navigate(`/planilha-vendas/${edicaoId}`);
    } catch (err) {
      console.error(err);
      await appDialog.alert({ title: 'Erro', message: 'Erro ao gerar planilha: ' + (err instanceof Error ? err.message : String(err)), type: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const removeCategoria = async (idx: number) => {
    const cat = categorias[idx];
    const identifier = (cat.prefix || cat.tag || "").trim();
    if (configId && identifier) {
      const { data: estandes } = await supabase
        .from("planilha_vendas_estandes")
        .select("stand_nr, cliente_id, cliente_nome_livre, tipo_venda, opcionais_selecionados")
        .eq("config_id", configId)
        .ilike("stand_nr", `${identifier} %`);
      if (estandes && estandes.length > 0) {
        const comDados = estandes.filter(
          (e) =>
            e.cliente_id ||
            e.cliente_nome_livre ||
            (e.tipo_venda && e.tipo_venda !== "DISPONÍVEL") ||
            (e.opcionais_selecionados && Object.values(e.opcionais_selecionados as Record<string, string>).some(v => !!v)),
        );
        if (comDados.length > 0) {
          await appDialog.alert({
            title: 'Categoria com dados',
            message:
              `A categoria "${cat.tag}" nao pode ser removida.\n\n` +
              `${comDados.length} estande(s) com dados cadastrados:\n` +
              comDados.map((e) => `• ${e.stand_nr}`).join("\n") +
              `\n\nLimpe os dados na planilha antes de remover esta categoria.`,
            type: 'danger',
          });
          return;
        }
      }
    }
    return true; // Signal to caller to remove from state
  };

  return {
    handleSave, handleGenerate, handleNavigateToAL,
    removeCategoria, persistConfig,
  };
}
