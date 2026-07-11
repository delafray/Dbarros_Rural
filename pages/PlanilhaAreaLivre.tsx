import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAppDialog } from "../context/DialogContext";
import {
  planilhaVendasService,
  CategoriaSetup,
  PlanilhaEstandeAL,
} from "../services/planilhaVendasService";
import { clientesService, ClienteComContatos } from "../services/clientesService";
import CurrencyField from "../components/CurrencyField";
import M2Field from "../components/inputs/M2Field";
import { useDirtyState } from "../hooks/useDirtyState";
import { formatBRL } from "../utils/formatCurrency";
import {
  ALRow,
  useAreaLivreCalculations,
  applyAtualizarPrecos,
  applyM2Change,
  applyPrecoM2Change,
  applyComboChange,
} from "../hooks/useAreaLivreCalculations";

// ── Helpers ──────────────────────────────────────────────────
const formatMoney = formatBRL;

const PlanilhaAreaLivre: React.FC = () => {
  const { edicaoId, categoriaTag } = useParams<{ edicaoId: string; categoriaTag: string }>();
  const navigate = useNavigate();
  const appDialog = useAppDialog();
  const decodedTag = decodeURIComponent(categoriaTag || "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<CategoriaSetup | null>(null);
  const [comboNames, setComboNames] = useState<string[]>([]);
  const [rows, setRows] = useState<ALRow[]>([]);
  const [clientes, setClientes] = useState<ClienteComContatos[]>([]);
  // Dirty state (hook compartilhado)
  const {
    isDirty, showDirtyModal,
    markDirty, markClean,
    safeNavigate,
    confirmDiscard, cancelDiscard,
  } = useDirtyState();
  // Referência a todas as categorias da config (para salvar de volta)
  const [allCategorias, setAllCategorias] = useState<CategoriaSetup[]>([]);
  // Refs dos inputs m² para navegação com Enter
  const m2Refs = useRef<Map<number, HTMLInputElement>>(new Map());

  // ── Cálculos (memoizados) ──────────────────────────────────
  const { calcTotal, calcCombo } = useAreaLivreCalculations(comboNames, categoria);

  // ── Load ──────────────────────────────────────────────────
  useEffect(() => {
    if (edicaoId) loadData();
  }, [edicaoId, categoriaTag]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [config, clientesList] = await Promise.all([
        planilhaVendasService.getConfig(edicaoId!),
        clientesService.getClientes(),
      ]);

      if (!config) {
        await appDialog.alert({ title: "Erro", message: "Configuração não encontrada.", type: "danger" });
        navigate(`/configuracao-vendas/${edicaoId}`);
        return;
      }

      setConfigId(config.id);

      const storedCats = (config.categorias_config as unknown as CategoriaSetup[]) || [];
      setAllCategorias(storedCats);
      const cat = storedCats.find((c) => c.tag === decodedTag);

      if (!cat || cat.tipo_precificacao !== "area_livre") {
        await appDialog.alert({ title: "Erro", message: "Categoria não encontrada ou não é Área Livre.", type: "danger" });
        navigate(`/configuracao-vendas/${edicaoId}`);
        return;
      }

      setCategoria(cat);

      // Nomes dos combos
      let names: string[] = [];
      if (Array.isArray(cat.comboNames) && cat.comboNames.length > 0) {
        names = [...cat.comboNames];
      } else if (storedCats.length > 0 && Array.isArray(storedCats[0].comboNames)) {
        names = [...storedCats[0].comboNames];
      }
      const numCombos = Array.isArray(cat.combos_adicionais) ? cat.combos_adicionais.length : 0;
      while (names.length < numCombos) {
        names.push(`COMBO ${String(names.length + 1).padStart(2, "0")}`);
      }
      setComboNames(names.slice(0, numCombos));

      setClientes(clientesList || []);

      // Buscar estandes desta categoria via service
      const prefix = (cat.prefix || cat.tag || "").trim().toUpperCase();
      const estandes = await planilhaVendasService.getEstandesAL(config.id, prefix);

      const alRows: ALRow[] = estandes.map((e) => {
        const eAL = e as unknown as PlanilhaEstandeAL;
        const combo_overrides = (eAL.combo_overrides as Record<string, number>) || {};
        return {
          id: e.id,
          stand_nr: e.stand_nr,
          cliente_id: e.cliente_id,
          cliente_nome_livre: e.cliente_nome_livre,
          area_m2: eAL.area_m2 ?? null,
          preco_m2: eAL.preco_m2_override ?? cat.preco_m2 ?? null,
          preco_m2_is_override: eAL.preco_m2_override != null,
          total_override: eAL.total_override ?? null,
          combo_overrides,
          total_stale: false,
        };
      });

      setRows(alRows);
    } catch (err) {
      console.error(err);
      await appDialog.alert({ title: "Erro", message: String(err), type: "danger" });
    } finally {
      setLoading(false);
    }
  };

  // ── Config handlers (preco_m2, combos) ─────────────────────
  const updatePrecoM2Ref = (val: number | null) => {
    setCategoria((prev) => prev ? { ...prev, preco_m2: val ?? undefined } : prev);
    // Atualiza rows que não têm override para refletir novo valor de referência
    setRows((prev) => prev.map((r) =>
      r.preco_m2_is_override ? r : { ...r, preco_m2: val }
    ));
    markDirty();
  };

  const addCombo = () => {
    const newName = `COMBO ${String(comboNames.length + 1).padStart(2, "0")}`;
    setComboNames((prev) => [...prev, newName]);
    setCategoria((prev) => {
      if (!prev) return prev;
      const adicionais = Array.isArray(prev.combos_adicionais) ? [...prev.combos_adicionais, 0] : [0];
      const names = Array.isArray(prev.comboNames) ? [...prev.comboNames, newName] : [newName];
      return { ...prev, combos_adicionais: adicionais, comboNames: names };
    });
    markDirty();
  };

  const removeCombo = () => {
    if (comboNames.length === 0) return;
    const removedName = comboNames[comboNames.length - 1];
    setComboNames((prev) => prev.slice(0, -1));
    setCategoria((prev) => {
      if (!prev) return prev;
      const adicionais = Array.isArray(prev.combos_adicionais) ? prev.combos_adicionais.slice(0, -1) : [];
      const names = Array.isArray(prev.comboNames) ? prev.comboNames.slice(0, -1) : [];
      return { ...prev, combos_adicionais: adicionais, comboNames: names };
    });
    // Limpa override do combo removido nos rows
    setRows((prev) => prev.map((r) => {
      const overrides = { ...r.combo_overrides };
      delete overrides[removedName];
      return { ...r, combo_overrides: overrides };
    }));
    markDirty();
  };

  const updateComboName = (ci: number, name: string) => {
    const oldName = comboNames[ci];
    setComboNames((prev) => prev.map((n, i) => i === ci ? name : n));
    setCategoria((prev) => {
      if (!prev) return prev;
      const names = Array.isArray(prev.comboNames) ? [...prev.comboNames] : [];
      while (names.length <= ci) names.push(`COMBO ${String(names.length + 1).padStart(2, "0")}`);
      names[ci] = name;
      return { ...prev, comboNames: names };
    });
    // Renomeia a chave nos overrides dos rows
    if (oldName !== name) {
      setRows((prev) => prev.map((r) => {
        if (r.combo_overrides[oldName] == null) return r;
        const overrides = { ...r.combo_overrides };
        overrides[name] = overrides[oldName];
        delete overrides[oldName];
        return { ...r, combo_overrides: overrides };
      }));
    }
    markDirty();
  };

  const updateComboAdicional = (ci: number, val: number) => {
    setCategoria((prev) => {
      if (!prev) return prev;
      const arr = Array.isArray(prev.combos_adicionais) ? [...prev.combos_adicionais] : [];
      while (arr.length <= ci) arr.push(0);
      arr[ci] = val;
      return { ...prev, combos_adicionais: arr };
    });
    markDirty();
  };

  // ── Atualizar / Fixar preços ────────────────────────────
  const precosFixados = categoria?.precos_fixados === true;

  const [m2Faltando, setM2Faltando] = useState<Set<string>>(new Set());

  const handleAtualizarPrecos = async () => {
    if (precosFixados || !categoria) return;

    // Verifica se todos os stands têm metragem preenchida
    const semM2 = rows.filter((r) => r.area_m2 == null || r.area_m2 <= 0);
    if (semM2.length > 0) {
      setM2Faltando(new Set(semM2.map((r) => r.id)));
      await appDialog.alert({
        title: "Metragem pendente",
        message: `${semM2.length} stand(s) sem metragem (m²). Preencha todos antes de atualizar preços.`,
        type: "warning",
      });
      return;
    }
    setM2Faltando(new Set());

    const pm2 = categoria.preco_m2 ?? 0;
    setRows((prev) =>
      applyAtualizarPrecos(prev, pm2, categoria.combos_adicionais || [], comboNames)
    );
    markDirty();
  };

  const handleFixarPrecos = async () => {
    const ok = await appDialog.confirm({
      title: "Fixar Preços",
      message: "Após fixar, os preços não serão mais recalculados automaticamente. Deseja continuar?",
      confirmText: "Fixar",
      type: "warning",
    });
    if (!ok) return;
    setCategoria((prev) => prev ? { ...prev, precos_fixados: true } : prev);
    markDirty();
  };

  // ── Row Handlers ─────────────────────────────────────────
  const updateRow = (id: string, patch: Partial<ALRow>) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));
    markDirty();
  };

  const handleM2Change = (id: string, val: number | null) => {
    setRows((prev) => applyM2Change(prev, id, val));
    // Limpa destaque de faltando se preencheu
    if (val != null && val > 0) {
      setM2Faltando((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
    markDirty();
  };

  const handlePrecoM2Change = (id: string, val: number | null) => {
    setRows((prev) => applyPrecoM2Change(prev, id, val, categoria?.preco_m2));
    markDirty();
  };

  const handleTotalChange = (id: string, val: number | null) => {
    updateRow(id, { total_override: val, total_stale: false });
  };

  const handleComboChange = (id: string, ci: number, val: number | null) => {
    setRows((prev) => applyComboChange(prev, id, ci, val, comboNames));
    markDirty();
  };

  // ── Salvar (estandes + config da categoria) ────────────────
  const handleSave = async () => {
    try {
      setSaving(true);

      // 1. Salva os estandes
      await planilhaVendasService.saveEstandesAL(rows);

      // 2. Salva a configuração da categoria (preco_m2, combos_adicionais, comboNames)
      if (configId && categoria) {
        const updatedCats = allCategorias.map((c) =>
          c.tag === decodedTag
            ? {
                ...c,
                preco_m2: categoria.preco_m2,
                combos_adicionais: categoria.combos_adicionais,
                comboNames: categoria.comboNames,
                precos_fixados: categoria.precos_fixados,
              }
            : c,
        );
        await planilhaVendasService.saveCategoriasConfig(configId, updatedCats);
        setAllCategorias(updatedCats);
      }

      markClean();
      const todosLimpos = rows.every((r) => r.area_m2 == null && r.total_override == null);
      if (todosLimpos) {
        await appDialog.alert({ title: "Salvo!", message: "Dados limpos. Use o botao 'Desmarcar AL' para remover o modo Area Livre.", type: "success" });
      } else {
        await appDialog.alert({ title: "Salvo!", message: "Planilha AL salva com sucesso!", type: "success" });
        navigate(`/configuracao-vendas/${edicaoId}`);
      }
    } catch (err) {
      console.error(err);
      await appDialog.alert({ title: "Erro", message: String(err), type: "danger" });
    } finally {
      setSaving(false);
    }
  };

  // ── Desmarcar / Excluir AL ─────────────────────────────────
  const hasAnyData = rows.some((r) => r.area_m2 != null || r.total_override != null);

  const handleUnmarkAL = async () => {
    if (hasAnyData) {
      await appDialog.alert({
        title: "Dados presentes",
        message: "Existem stands com dados configurados. Limpe todos os campos de m² e total antes de desmarcar.",
        type: "warning",
      });
      return;
    }
    const ok = await appDialog.confirm({
      title: "Desmarcar Área Livre",
      message: `Tem certeza? A categoria "${decodedTag}" voltará para modo fixo. Esta ação removerá a configuração AL.`,
      confirmText: "Desmarcar",
      type: "danger",
    });
    if (!ok) return;
    try {
      const config = await planilhaVendasService.getConfig(edicaoId!);
      if (!config) return;
      const storedCats = (config.categorias_config as unknown as CategoriaSetup[]) || [];
      await planilhaVendasService.unmarkAreaLivre(config.id, storedCats, decodedTag);
      navigate(`/configuracao-vendas/${edicaoId}`);
    } catch (err) {
      await appDialog.alert({ title: "Erro", message: String(err), type: "danger" });
    }
  };

  // ── Render ────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout title="Planilha Área Livre">
        <div className="p-8 text-center text-slate-500">Carregando...</div>
      </Layout>
    );
  }

  if (!categoria) return null;

  const numCombos = Array.isArray(categoria.combos_adicionais) ? categoria.combos_adicionais.length : 0;

  return (
    <Layout title={`Planilha Área Livre — ${decodedTag}`}>
      {/* Modal de alterações não salvas */}
      {showDirtyModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 bg-amber-50 border-b border-amber-200">
              <h2 className="font-black text-slate-800">Alterações não salvas</h2>
              <p className="text-sm text-amber-700 mt-1">Você tem alterações não salvas. Deseja sair mesmo assim?</p>
            </div>
            <div className="flex gap-3 px-6 py-4 justify-end bg-slate-50">
              <button
                onClick={cancelDiscard}
                className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Ficar aqui
              </button>
              <button
                onClick={confirmDiscard}
                className="px-4 py-2 text-sm font-black text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Sair sem salvar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-full mx-auto p-2 pb-32 space-y-2">
        {/* Header compacto */}
        <div className="bg-amber-50 border border-slate-300 px-3 py-1.5 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="font-black text-amber-900 text-[11px] uppercase tracking-wide">
              {decodedTag} — Área Livre
            </span>
            <span className="text-amber-700 text-[10px]">{rows.length} stand(s)</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {!hasAnyData && (
              <button
                onClick={handleUnmarkAL}
                className="text-[10px] font-bold px-2 py-0.5 border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
              >
                Desmarcar AL
              </button>
            )}
            <button
              onClick={() => safeNavigate(`/configuracao-vendas/${edicaoId}`)}
              className="text-[10px] font-bold px-2 py-0.5 border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              ← Voltar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`text-[10px] font-bold px-3 py-0.5 text-white transition-colors ${saving ? "bg-slate-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>

        {/* ── Painel de configuração: Preço/m² + Combos ── */}
        <div className="bg-white border border-slate-300 overflow-hidden">
          <div className="bg-[#1F497D] text-white px-3 py-1 flex flex-wrap gap-2 items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-bold text-[11px] uppercase tracking-wider">Configuração de Preços</span>
              {precosFixados && (
                <span className="text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 uppercase tracking-wider">Fixado</span>
              )}
            </div>
            <div className="flex gap-1.5 items-center">
              {!precosFixados && (
                <>
                  <button
                    onClick={addCombo}
                    className="text-[10px] font-black bg-green-700 hover:bg-green-600 text-white px-3 py-1 transition-colors"
                  >
                    + Combo
                  </button>
                  <div className="w-4" />
                  <button
                    onClick={removeCombo}
                    disabled={numCombos === 0}
                    className={`text-[10px] font-black px-3 py-1 text-white transition-colors ${numCombos === 0 ? "bg-red-900 opacity-40 cursor-not-allowed" : "bg-red-700 hover:bg-red-600"}`}
                  >
                    − Remover Combo
                  </button>
                  <div className="w-px h-4 bg-white/30 mx-1" />
                  <button
                    onClick={handleAtualizarPrecos}
                    className="text-[10px] font-black bg-amber-600 hover:bg-amber-500 text-white px-3 py-1 transition-colors"
                  >
                    Atualizar Preços
                  </button>
                  <div className="w-4" />
                  <button
                    onClick={handleFixarPrecos}
                    className="text-[10px] font-black bg-red-700 hover:bg-red-600 text-white px-3 py-1 transition-colors"
                  >
                    Fixar Preços
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-2 py-0.5 text-right text-[11px] font-bold uppercase text-amber-600 border border-slate-300 w-32 whitespace-nowrap">
                    Preço/m² Ref.
                  </th>
                  {comboNames.map((name, ci) => (
                    <th key={ci} className="px-1 py-0.5 text-center text-[11px] font-bold uppercase text-blue-600 border border-slate-300 min-w-[100px] whitespace-nowrap">
                      <input
                        type="text"
                        disabled={precosFixados}
                        className={`w-full text-center bg-transparent border-b border-transparent focus:border-blue-400 focus:outline-none placeholder:text-blue-300 transition-colors uppercase text-blue-700 text-[11px] ${precosFixados ? "opacity-60 cursor-not-allowed" : ""}`}
                        value={name}
                        onChange={(e) => updateComboName(ci, e.target.value)}
                        placeholder={`COMBO ${String(ci + 1).padStart(2, "0")}`}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={`px-1 py-0.5 border border-slate-300 ${precosFixados ? "bg-slate-100" : "bg-amber-50/40"}`}>
                    {precosFixados ? (
                      <span className="block w-full px-1 py-0.5 text-right font-mono font-bold text-[12px] text-slate-500">
                        {categoria.preco_m2 != null ? formatMoney(categoria.preco_m2) : "—"}
                      </span>
                    ) : (
                      <CurrencyField
                        value={categoria.preco_m2 ?? null}
                        onChange={(n) => updatePrecoM2Ref(n)}
                        className="w-full px-1 py-0.5 border border-amber-200 text-right font-mono font-bold text-[12px] bg-white/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                    )}
                  </td>
                  {comboNames.map((_, ci) => (
                    <td key={ci} className={`px-1 py-0.5 border border-slate-300 ${precosFixados ? "bg-slate-100" : ""}`} title={`Adicional fixo do ${comboNames[ci]}`}>
                      {precosFixados ? (
                        <span className="block w-full px-1 py-0.5 text-right font-mono font-black text-[12px] text-slate-500">
                          {Array.isArray(categoria.combos_adicionais) && categoria.combos_adicionais[ci] != null ? formatMoney(categoria.combos_adicionais[ci]) : "—"}
                        </span>
                      ) : (
                        <CurrencyField
                          value={Array.isArray(categoria.combos_adicionais) ? categoria.combos_adicionais[ci] ?? null : null}
                          onChange={(n) => updateComboAdicional(ci, n ?? 0)}
                          className="w-full px-1 py-0.5 border border-blue-200 text-right text-blue-900 font-black font-mono text-[12px] bg-white/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                          placeholder="Adicional"
                        />
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Tabela de stands (densidade industrial) ── */}
        <div className="overflow-x-auto bg-white border border-slate-300">
          <table className="text-[12px] font-sans w-full border-collapse">
            <thead className="bg-[#1F497D] text-white sticky top-0 z-10">
              <tr>
                <th className="px-2 py-1 text-left text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border border-slate-300 w-20">Stand</th>
                {/* Cliente oculto por enquanto — reativar futuramente */}
                <th className="px-2 py-1 text-center text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border border-slate-300 w-16 text-amber-300">m²</th>
                <th className="px-2 py-1 text-center text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border border-slate-300 w-24 text-amber-300">R$/m²</th>
                <th className="px-2 py-1 text-center text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border border-slate-300 w-28 text-green-300">Total Base</th>
                {comboNames.map((name, ci) => (
                  <th key={ci} className="px-2 py-1 text-center text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border border-slate-300 w-28 text-blue-300">
                    {name}
                    {categoria.combos_adicionais?.[ci] != null && (
                      <span className="block text-[8px] text-blue-400/70 font-normal">+{formatMoney(categoria.combos_adicionais[ci])}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => {
                const totalCalc = row.area_m2 != null && row.preco_m2 != null ? row.area_m2 * row.preco_m2 : null;
                const totalDisplay = row.total_override ?? totalCalc;
                const isStale = row.total_stale;

                return (
                  <tr key={row.id} className={`hover:bg-blue-100/40 transition-colors ${rowIdx % 2 === 0 ? "" : "bg-slate-200/40"}`}>
                    {/* Stand */}
                    <td className="px-2 py-0.5 border border-slate-300 font-bold text-[12px] whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span className="text-[7px] text-slate-400 uppercase tracking-tighter">{categoria.tag}</span>
                        <span>{row.stand_nr}</span>
                      </div>
                    </td>

                    {/* Cliente oculto por enquanto */}

                    {/* m² */}
                    <td className={`px-0.5 py-0.5 border border-slate-300 ${m2Faltando.has(row.id) ? "bg-red-100" : ""}`}>
                      <M2Field
                        value={row.area_m2}
                        onChange={(v) => handleM2Change(row.id, v)}
                        inputRef={(el) => { if (el) m2Refs.current.set(rowIdx, el); else m2Refs.current.delete(rowIdx); }}
                        onEnter={() => { const next = m2Refs.current.get(rowIdx + 1); if (next) next.focus(); }}
                        className={`w-full px-1 py-0.5 text-center font-black text-[12px] border focus:outline-none focus:ring-1 ${m2Faltando.has(row.id) ? "border-red-400 bg-red-50 focus:ring-red-400 text-red-700 animate-pulse" : "border-amber-200 bg-amber-50/50 focus:ring-amber-400"}`}
                      />
                    </td>

                    {/* Preço/m² */}
                    <td className="px-0.5 py-0.5 border border-slate-300">
                      <CurrencyField
                        value={row.preco_m2}
                        onChange={(v) => handlePrecoM2Change(row.id, v)}
                        className={`w-full px-1 py-0.5 text-right font-mono font-bold text-[12px] border focus:outline-none focus:ring-1 focus:ring-amber-400 ${row.preco_m2_is_override ? "border-amber-400 bg-amber-100/50" : "border-amber-200 bg-amber-50/30"}`}
                      />
                    </td>

                    {/* Total Base */}
                    <td className={`px-0.5 py-0.5 border border-slate-300 ${isStale ? "bg-red-100" : ""}`}>
                      <CurrencyField
                        value={totalDisplay}
                        onChange={(v) => handleTotalChange(row.id, v)}
                        placeholder={totalCalc != null ? formatMoney(totalCalc) : "—"}
                        className={`w-full px-1 py-0.5 text-right font-mono font-black text-[12px] border focus:outline-none focus:ring-1 ${isStale ? "border-red-400 bg-red-50 focus:ring-red-400 text-red-700" : "border-green-200 bg-green-50/30 focus:ring-green-400"}`}
                      />
                    </td>

                    {/* Combos */}
                    {comboNames.map((name, ci) => {
                      const adicional = categoria.combos_adicionais?.[ci] ?? 0;
                      const comboCalc = totalDisplay != null ? totalDisplay + adicional : null;
                      const comboOverride = row.combo_overrides[name];
                      const comboDisplay = comboOverride ?? comboCalc;
                      const comboStale = isStale && comboOverride != null;
                      return (
                        <td key={ci} className={`px-0.5 py-0.5 border border-slate-300 ${comboStale ? "bg-red-100" : ""}`}>
                          <CurrencyField
                            value={comboDisplay}
                            onChange={(v) => handleComboChange(row.id, ci, v)}
                            placeholder={comboCalc != null ? formatMoney(comboCalc) : "—"}
                            className={`w-full px-1 py-0.5 text-right font-mono font-black text-[12px] border focus:outline-none focus:ring-1 ${comboStale ? "border-red-400 bg-red-50 focus:ring-red-400 text-red-700" : "border-blue-200 bg-blue-50/30 focus:ring-blue-400 text-blue-900"}`}
                          />
                        </td>
                      );
                    })}

                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4 + numCombos + 1} className="px-3 py-4 text-center text-slate-400 italic text-[11px]">
                    Nenhum stand encontrado para esta categoria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default PlanilhaAreaLivre;
