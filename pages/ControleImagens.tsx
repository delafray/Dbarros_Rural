import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { eventosService, EventoEdicao } from "../services/eventosService";
import {
  planilhaVendasService,
  PlanilhaConfig,
  PlanilhaEstande,
  CategoriaSetup,
} from "../services/planilhaVendasService";
import { clientesService, Cliente } from "../services/clientesService";
import {
  imagensService,
  ImagemConfig,
  RecebimentosMap,
  StandImagemStatus,
  StandStatus,
  AvulsoStatus,
} from "../services/imagensService";

type FilterStatus = "todos" | "pendente" | "parcial" | "completo";
type RowStatus = "sem_config" | "pendente" | "parcial" | "completo";

// Normaliza texto para busca: remove acentos, espaços, lowercase
function simplify(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
}

const naturalSort = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

const ControleImagens: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialEdicaoId = (location.state as any)?.edicaoId ?? "";

  // ── Seleção de edição ─────────────────────────────────────────
  const [edicoes, setEdicoes] = useState<
    (EventoEdicao & { eventos: { nome: string } | null })[]
  >([]);
  const [selectedEdicaoId, setSelectedEdicaoId] = useState<string>("");

  // ── Dados da edição selecionada ───────────────────────────────
  const [config, setConfig] = useState<PlanilhaConfig | null>(null);
  const [estandes, setEstandes] = useState<PlanilhaEstande[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [imagensConfig, setImagensConfig] = useState<ImagemConfig[]>([]);
  const [recebimentos, setRecebimentos] = useState<RecebimentosMap>({});
  const [statusMap, setStatusMap] = useState<Record<string, StandImagemStatus>>(
    {},
  );

  // ── UI ────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("todos");
  const [saving, setSaving] = useState<string | null>(null);
  const [detailModal, setDetailModal] = useState<{ rowId: string; obs: string } | null>(null);

  // ── Imagens Avulsas ───────────────────────────────────────────
  const [avulsaAddOpen, setAvulsaAddOpen] = useState(false);
  const [novaAvulsa, setNovaAvulsa] = useState({ tipo: "imagem" as "imagem" | "logo", descricao: "", dimensoes: "" });
  const [savingAvulsa, setSavingAvulsa] = useState(false);
  const [editingAvulsa, setEditingAvulsa] = useState<{
    id: string;
    tipo: "imagem" | "logo";
    descricao: string;
    dimensoes: string;
  } | null>(null);

  // ── Carrega edições ativas no mount ───────────────────────────
  useEffect(() => {
    eventosService
      .getActiveEdicoes()
      .then((data) => {
        setEdicoes(data);
        if (data.length > 0) {
          if (initialEdicaoId && data.find((e) => e.id === initialEdicaoId)) {
            setSelectedEdicaoId(initialEdicaoId);
          } else {
            const barraMansa = data.find((e) =>
              ((e.eventos as any)?.nome || '').toLowerCase().includes('barra mansa') ||
              (e.titulo || '').toLowerCase().includes('barra mansa'),
            );
            setSelectedEdicaoId((barraMansa || data[0]).id);
          }
        }
      })
      .catch((err) => console.error("Erro ao carregar edições:", err));
  }, []);

  // ── Carrega dados da edição selecionada ───────────────────────
  useEffect(() => {
    if (!selectedEdicaoId) return;
    loadEdicao(selectedEdicaoId);
  }, [selectedEdicaoId]);

  const loadEdicao = async (edicaoId: string) => {
    setLoading(true);
    setEstandes([]);
    setRecebimentos({});
    setStatusMap({});
    try {
      const [configData, listaClientes, imagens] = await Promise.all([
        planilhaVendasService.getConfig(edicaoId),
        clientesService.getClientes(),
        imagensService.getConfig(edicaoId),
      ]);

      setConfig(configData);
      setClientes(listaClientes);
      setImagensConfig(imagens || []);

      if (configData) {
        const [estandesData, recData, statusData] = await Promise.all([
          planilhaVendasService.getEstandes(configData.id),
          imagensService.getRecebimentos(configData.id),
          imagensService.getStatusByConfig(configData.id),
        ]);
        setEstandes(estandesData);
        setRecebimentos(recData);
        setStatusMap(statusData);
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers de categoria ──────────────────────────────────────
  const categorias = useMemo<CategoriaSetup[]>(
    () =>
      config
        ? (config.categorias_config as unknown as CategoriaSetup[])
        : [],
    [config],
  );

  const getCategoriaOfRow = useCallback(
    (row: PlanilhaEstande): CategoriaSetup | undefined => {
      const nr = row.stand_nr.toLowerCase();
      const sorted = [...categorias].sort((a, b) => {
        const idA = (a.prefix || a.tag || "").length;
        const idB = (b.prefix || b.tag || "").length;
        return idB - idA;
      });
      return sorted.find((c) => {
        const id = (c.prefix || c.tag || "").toLowerCase().trim();
        if (!id) return false;
        return nr === id || nr.startsWith(`${id} `);
      });
    },
    [categorias],
  );

  // ── Configs aplicáveis a um stand ────────────────────────────
  const isApplicable = useCallback(
    (row: PlanilhaEstande, cfg: ImagemConfig): boolean => {
      if (cfg.origem_tipo === "stand_categoria") {
        const cat = getCategoriaOfRow(row);
        return cat?.tag === cfg.origem_ref;
      }
      if (cfg.origem_tipo === "item_opcional") {
        const sel =
          (row.opcionais_selecionados as Record<string, string>) || {};
        return sel[cfg.origem_ref] === "x" || sel[cfg.origem_ref] === "*";
      }
      return false;
    },
    [getCategoriaOfRow],
  );

  // Apenas configs de stand_categoria e item_opcional (não avulso)
  // Ordenação: stand_categoria primeiro (na ordem das categorias do setup), depois item_opcional
  const columnConfigs = useMemo(() => {
    const filtered = imagensConfig.filter((cfg) => cfg.origem_tipo !== "avulso");
    return [...filtered].sort((a, b) => {
      if (a.origem_tipo !== b.origem_tipo) {
        return a.origem_tipo === "stand_categoria" ? -1 : 1;
      }
      if (a.origem_tipo === "stand_categoria") {
        const idxA = categorias.findIndex((c) => c.tag === a.origem_ref);
        const idxB = categorias.findIndex((c) => c.tag === b.origem_ref);
        return idxA - idxB;
      }
      return 0;
    });
  }, [imagensConfig, categorias]);

  // ── Status por linha ─────────────────────────────────────────
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

  // ── Stands com cliente vinculado ──────────────────────────────
  const activeEstandes = useMemo(
    () => estandes.filter((e) => e.cliente_id || e.cliente_nome_livre),
    [estandes],
  );

  // ── Ordenação + filtros ───────────────────────────────────────
  const filteredEstandes = useMemo(() => {
    let result = [...activeEstandes];

    // Ordena por ordem de categoria, depois por stand_nr
    result.sort((a, b) => {
      const catA = getCategoriaOfRow(a);
      const catB = getCategoriaOfRow(b);
      const ordA = catA?.ordem ?? 0;
      const ordB = catB?.ordem ?? 0;
      if (ordA !== ordB) return ordA - ordB;
      if (catA && catB) {
        const idxA = categorias.findIndex((c) => c === catA);
        const idxB = categorias.findIndex((c) => c === catB);
        if (idxA !== idxB) return idxA - idxB;
      }
      return naturalSort(a.stand_nr, b.stand_nr);
    });

    // Busca inteligente (PROMPT_15)
    if (searchTerm.trim()) {
      const q = simplify(searchTerm);
      result = result.filter((row) => {
        if (simplify(row.stand_nr).includes(q)) return true;
        const cliente = clientes.find((c) => c.id === row.cliente_id);
        const nome = cliente
          ? cliente.tipo_pessoa === "PJ"
            ? cliente.razao_social || ""
            : cliente.nome_completo || ""
          : row.cliente_nome_livre || "";
        return simplify(nome).includes(q);
      });
    }

    // Filtro por status
    if (filterStatus !== "todos") {
      result = result.filter((row) => {
        const s = getRowStatus(row);
        if (filterStatus === "pendente")
          return s === "pendente" || s === "sem_config";
        if (filterStatus === "parcial") return s === "parcial";
        if (filterStatus === "completo") return s === "completo";
        return true;
      });
    }

    return result;
  }, [
    activeEstandes,
    searchTerm,
    filterStatus,
    getCategoriaOfRow,
    categorias,
    clientes,
    getRowStatus,
  ]);

  // ── Contadores do resumo ──────────────────────────────────────
  const counts = useMemo(() => {
    const pendente = activeEstandes.filter((e) => {
      const s = getRowStatus(e);
      return s === "pendente" || s === "sem_config";
    }).length;
    const parcial = activeEstandes.filter(
      (e) => getRowStatus(e) === "parcial",
    ).length;
    const completo = activeEstandes.filter(
      (e) => getRowStatus(e) === "completo",
    ).length;
    return { pendente, parcial, completo, total: activeEstandes.length };
  }, [activeEstandes, getRowStatus]);

  // ── Toggle de recebimento ─────────────────────────────────────
  const handleToggle = useCallback(
    async (estandeId: string, imagemConfigId: string, currentValue: boolean) => {
      const cellKey = `${estandeId}-${imagemConfigId}`;
      if (saving === cellKey) return;
      setSaving(cellKey);

      const newValue = !currentValue;

      // Update optimista
      setRecebimentos((prev) => ({
        ...prev,
        [estandeId]: { ...(prev[estandeId] || {}), [imagemConfigId]: newValue },
      }));

      try {
        await imagensService.setRecebimento(estandeId, imagemConfigId, newValue);

        // Recalcula e sincroniza status geral → planilha badge
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

        // Atualiza statusMap local
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
        alert("Erro ao salvar. Tente novamente.");
      } finally {
        setSaving(null);
      }
    },
    [saving, columnConfigs, estandes, isApplicable, recebimentos],
  );

  const STATUS_ORDER: Record<StandStatus, number> = { pendente: 0, solicitado: 1, completo: 2 };
  const TS_KEY: Record<StandStatus, 'pendente_em' | 'solicitado_em' | 'completo_em'> = {
    pendente: 'pendente_em', solicitado: 'solicitado_em', completo: 'completo_em',
  };
  const STATUS_LABELS: Record<StandStatus, string> = {
    pendente: 'Pendente', solicitado: 'Solicitado', completo: 'Completo',
  };

  // ── Salva status + obs do modal de detalhe ───────────────────
  const handleSaveStatus = async (rowId: string, status: StandStatus, obs: string) => {
    const existingSt = statusMap[rowId];
    const currentLevel = STATUS_ORDER[existingSt?.status as StandStatus ?? 'pendente'] ?? 0;
    const newLevel = STATUS_ORDER[status];

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
        // Limpa timestamps superiores no estado local também
        if (clearTimestamps) clearTimestamps.forEach((k) => { updated[k] = null; });
        return { ...prev, [rowId]: updated as StandImagemStatus };
      });

      setDetailModal(null);
    } catch (err) {
      alert("Erro ao salvar: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // ── Handlers de Imagens Avulsas ──────────────────────────────
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
      alert("Erro ao adicionar: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSavingAvulsa(false);
    }
  };

  const handleUpdateAvulsoStatus = async (id: string, status: AvulsoStatus) => {
    try {
      await imagensService.updateAvulsoStatus(id, status);
      setImagensConfig((prev) => prev.map((c) => (c.id === id ? { ...c, avulso_status: status } : c)));
    } catch (err) {
      alert("Erro ao atualizar status: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleRemoveAvulsa = async (id: string) => {
    if (!confirm("Remover esta imagem avulsa?")) return;
    try {
      await imagensService.removeConfig(id);
      setImagensConfig((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert("Erro ao remover: " + (err instanceof Error ? err.message : String(err)));
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
      alert("Erro ao atualizar: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSavingAvulsa(false);
    }
  };

  // ── Estilos ───────────────────────────────────────────────────
  const thStyle =
    "border border-slate-400/40 px-1 py-1 text-[11px] font-bold uppercase whitespace-nowrap text-white text-center bg-[#1F497D]";
  const tdStyle =
    "border border-slate-200 text-[12px] px-1.5 py-0.5 whitespace-nowrap";

  // ── Render ────────────────────────────────────────────────────
  return (
    <Layout
      title="Controle de Imagens"
      headerActions={
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar stand ou cliente..."
            value={searchTerm}
            onChange={(ev) => setSearchTerm(ev.target.value)}
            className="border border-slate-300 text-sm px-3 py-1.5 rounded w-52 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          {selectedEdicaoId && (
            <button
              onClick={() => navigate(`/planilha-vendas/${selectedEdicaoId}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors whitespace-nowrap"
              title="Abrir planilha desta edição"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 6h18M3 14h18M3 18h18" />
              </svg>
              Planilha
            </button>
          )}
        </div>
      }
    >
      {/* ── Barra superior ── */}
      <div className="flex flex-wrap gap-2 items-center mb-3">
        {/* Seletor de edição */}
        <select
          value={selectedEdicaoId}
          onChange={(e) => setSelectedEdicaoId(e.target.value)}
          className="border border-slate-300 text-sm px-2 py-1.5 bg-white rounded font-medium text-slate-700 max-w-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="">Selecione uma edição...</option>
          {edicoes.map((e) => (
            <option key={e.id} value={e.id}>
              {(e.eventos as any)?.nome} — {e.titulo}
            </option>
          ))}
        </select>

        {/* Filtros de status */}
        <div className="flex gap-1">
          {(
            [
              { key: "todos", label: "Todos" },
              { key: "pendente", label: "Pendente" },
              { key: "parcial", label: "Parcial" },
              { key: "completo", label: "Completo" },
            ] as { key: FilterStatus; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`text-[10px] font-bold uppercase px-2 py-1 border rounded-sm transition-colors ${filterStatus === key
                  ? key === "todos"
                    ? "bg-slate-800 text-white border-slate-800"
                    : key === "pendente"
                      ? "bg-red-600 text-white border-red-600"
                      : key === "parcial"
                        ? "bg-yellow-500 text-white border-yellow-500"
                        : "bg-green-600 text-white border-green-600"
                  : "bg-white text-slate-500 border-slate-300 hover:bg-slate-50"
                }`}
            >
              {label}
              {key !== "todos" && (
                <span className="ml-1 opacity-75">
                  ({counts[key as keyof typeof counts]})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Badges de resumo */}
        {activeEstandes.length > 0 && (
          <div className="ml-auto flex gap-2 text-[11px] flex-wrap">
            <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 font-bold">
              {counts.pendente} pendente{counts.pendente !== 1 ? "s" : ""}
            </span>
            <span className="bg-yellow-100 text-yellow-700 border border-yellow-200 px-2 py-0.5 font-bold">
              {counts.parcial} parcial{counts.parcial !== 1 ? "is" : ""}
            </span>
            <span className="bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 font-bold">
              {counts.completo} completo{counts.completo !== 1 ? "s" : ""}
            </span>
            <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 font-bold">
              {counts.total} total
            </span>
          </div>
        )}
      </div>

      {/* ── Tabela ── */}
      <div
        className="overflow-x-auto bg-white shadow-xl border border-slate-200 rounded-lg"
      >
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Carregando dados...
          </div>
        ) : !selectedEdicaoId ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Selecione uma edição acima.
          </div>
        ) : !config ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Planilha não configurada para esta edição.
          </div>
        ) : columnConfigs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Nenhuma imagem configurada para esta edição.{" "}
            <span className="text-blue-500">
              Configure em ⚙️ Setup &gt; Imagens.
            </span>
          </div>
        ) : activeEstandes.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Nenhum stand com cliente vinculado nesta edição.
          </div>
        ) : (
          <table
            className="border-collapse text-[11px] font-sans w-full"
            style={{ minWidth: "max-content" }}
          >
            <thead className="sticky top-0 z-10 shadow-sm">
              {/* ── Linha de legenda das colunas de imagem ── */}
              <tr className="bg-slate-900 text-white">
                <th
                  colSpan={2}
                  className="border border-white/10 px-2 py-1 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase"
                >
                  Stand / Cliente
                </th>
                {columnConfigs.map((cfg) => {
                  const hasSubLabel = cfg.dimensoes || cfg.tipo === "logo";
                  return (
                    <th
                      key={cfg.id}
                      className="border border-white/10 px-1 py-0.5 text-center"
                      style={{
                        width: hasSubLabel ? "40px" : "30px",
                        minWidth: hasSubLabel ? "40px" : "30px",
                      }}
                      title={cfg.descricao + (cfg.dimensoes ? ` — ${cfg.dimensoes}` : "")}
                    >
                      <span
                        className={`inline-block text-[8px] font-bold uppercase px-1 py-0 rounded-sm ${cfg.origem_tipo === "stand_categoria"
                            ? "bg-violet-600/60 text-violet-200"
                            : "bg-blue-600/60 text-blue-200"
                          }`}
                      >
                        {cfg.origem_tipo === "stand_categoria"
                          ? cfg.origem_ref
                          : "OPC"}
                      </span>
                    </th>
                  );
                })}
                <th
                  colSpan={2}
                  className="border border-white/10 px-2 py-0.5 text-center text-[10px] text-slate-400 font-bold"
                >
                  Status / Obs
                </th>
              </tr>

              {/* ── Headers das colunas ── */}
              <tr className="bg-[#1F497D]">
                <th className={`${thStyle} w-[90px] min-w-[90px]`}>Stand</th>
                <th className={`${thStyle} min-w-[200px] text-left px-2`}>
                  Cliente
                </th>
                {columnConfigs.map((cfg) => {
                  const subLabel = cfg.dimensoes
                    ? cfg.dimensoes
                    : cfg.tipo === "logo"
                      ? "logo"
                      : null;
                  return (
                    <th
                      key={cfg.id}
                      className={`${thStyle} align-bottom p-0`}
                      style={{
                        width: subLabel ? "40px" : "30px",
                        minWidth: subLabel ? "40px" : "30px",
                      }}
                      title={
                        cfg.descricao +
                        (cfg.dimensoes ? ` (${cfg.dimensoes})` : "")
                      }
                    >
                      {/* Dois painéis verticais lado a lado: descrição + dimensão/tipo */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "flex-end",
                          justifyContent: "center",
                          height: "110px",
                          paddingBottom: "6px",
                          gap: "3px",
                        }}
                      >
                        {/* Painel 1: descrição */}
                        <div
                          style={{
                            writingMode: "vertical-rl",
                            transform: "rotate(180deg)",
                            whiteSpace: "nowrap",
                            fontSize:
                              cfg.descricao.length > 14 ? "7px" : "8px",
                            fontWeight: "bold",
                            textTransform: "uppercase",
                            color: "white",
                            lineHeight: 1,
                          }}
                        >
                          {cfg.descricao}
                        </div>

                        {/* Painel 2: dimensão ou "logo" */}
                        {subLabel && (
                          <div
                            style={{
                              writingMode: "vertical-rl",
                              transform: "rotate(180deg)",
                              whiteSpace: "nowrap",
                              fontSize: cfg.dimensoes ? "10px" : "8px",
                              fontWeight: cfg.dimensoes ? "600" : "normal",
                              color:
                                cfg.tipo === "logo"
                                  ? "#c4b5fd"
                                  : "#94a3b8",
                              lineHeight: 1,
                              letterSpacing: "0.3px",
                            }}
                          >
                            {subLabel}
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
                <th className={`${thStyle} w-20`}>Status</th>
                <th className={`${thStyle} min-w-[140px] text-left px-2`}>
                  Observações
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredEstandes.map((row, i) => {
                const cat = getCategoriaOfRow(row);
                const rowRec = recebimentos[row.id] || {};
                const status = getRowStatus(row);
                const applicable = columnConfigs.filter((cfg) =>
                  isApplicable(row, cfg),
                );
                const receivedCount = applicable.filter(
                  (cfg) => rowRec[cfg.id],
                ).length;
                const obs = statusMap[row.id]?.observacoes || "";

                const cliente = clientes.find((c) => c.id === row.cliente_id);
                const nomeCliente = cliente
                  ? cliente.tipo_pessoa === "PJ"
                    ? cliente.razao_social || ""
                    : cliente.nome_completo || ""
                  : row.cliente_nome_livre || "";

                const rowBg =
                  status === "completo"
                    ? "bg-green-50/50"
                    : status === "parcial"
                      ? "bg-yellow-50/40"
                      : status === "pendente"
                        ? i % 2 === 0
                          ? "bg-white"
                          : "bg-slate-50/60"
                        : i % 2 === 0
                          ? "bg-white"
                          : "bg-slate-50/60";

                return (
                  <tr
                    key={row.id}
                    className={`${rowBg} border-b border-slate-200 hover:bg-blue-50/40 transition-colors`}
                  >
                    {/* Stand nº */}
                    <td
                      className={`${tdStyle} px-1 py-0 align-middle w-[90px] min-w-[90px] max-w-[90px]`}
                    >
                      <div className="flex items-center gap-1 leading-none">
                        {cat?.tag && (
                          <span
                            className="text-[7px] text-slate-500/80 font-normal uppercase tracking-tighter text-left pointer-events-none shrink-0"
                            style={{ lineHeight: 1 }}
                          >
                            {cat.tag}
                          </span>
                        )}
                        <span className="flex-1 text-center font-bold text-[11px] whitespace-nowrap">
                          {cat?.prefix?.trim()
                            ? row.stand_nr
                            : row.stand_nr
                              .replace(
                                new RegExp(`^${cat?.tag ?? ""}\\s*`, "i"),
                                "",
                              )
                              .trim()}
                        </span>
                      </div>
                    </td>

                    {/* Cliente */}
                    <td
                      className={`${tdStyle} max-w-[240px] min-w-[180px]`}
                    >
                      <span className="font-semibold text-slate-800 truncate block max-w-[230px]">
                        {nomeCliente}
                      </span>
                    </td>

                    {/* Colunas de imagem */}
                    {columnConfigs.map((cfg) => {
                      const app = isApplicable(row, cfg);
                      const cellKey = `${row.id}-${cfg.id}`;
                      const isSaving = saving === cellKey;

                      if (!app) {
                        return (
                          <td
                            key={cfg.id}
                            className={`${tdStyle} text-center text-slate-200 w-8`}
                          >
                            <span className="text-[11px]">—</span>
                          </td>
                        );
                      }

                      const received = rowRec[cfg.id] ?? false;

                      return (
                        <td
                          key={cfg.id}
                          className={`${tdStyle} text-center w-8 cursor-pointer select-none transition-colors ${isSaving
                              ? "opacity-50"
                              : received
                                ? "bg-green-50/60 hover:bg-green-100/60"
                                : "hover:bg-red-50/60"
                            }`}
                          onClick={() =>
                            !isSaving && handleToggle(row.id, cfg.id, received)
                          }
                          title={
                            isSaving
                              ? "Salvando..."
                              : received
                                ? `${cfg.descricao}: recebido — clique para desmarcar`
                                : `${cfg.descricao}: pendente — clique para marcar como recebido`
                          }
                        >
                          {isSaving ? (
                            <span className="text-slate-400 text-[10px]">
                              ···
                            </span>
                          ) : received ? (
                            <span className="text-green-600 font-black text-[16px] leading-none">
                              ✓
                            </span>
                          ) : (
                            <span
                              className="inline-block w-3.5 h-3.5 rounded-full border-2 border-red-500 bg-red-100"
                              style={{ boxShadow: "0 0 0 1px #ef4444" }}
                            />
                          )}
                        </td>
                      );
                    })}

                    {/* Status badge */}
                    <td className={`${tdStyle} text-center w-20`}>
                      {status === "sem_config" ? (
                        <span className="text-slate-300 text-[9px]">—</span>
                      ) : (
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 border inline-block ${status === "completo"
                              ? "bg-green-100 text-green-700 border-green-300"
                              : status === "parcial"
                                ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                                : "bg-red-100 text-red-600 border-red-200"
                            }`}
                          title={`${receivedCount} de ${applicable.length} recebidas`}
                        >
                          {receivedCount}/{applicable.length}
                        </span>
                      )}
                    </td>

                    {/* Observações */}
                    <td className={`${tdStyle} min-w-[140px] max-w-[220px]`}>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-[10px] italic truncate flex-1" title={obs}>
                          {obs}
                        </span>
                        <button
                          onClick={() => setDetailModal({ rowId: row.id, obs })}
                          title="Abrir detalhes"
                          className="flex-shrink-0 text-slate-300 hover:text-violet-500 text-[13px] leading-none transition-colors px-0.5"
                        >
                          ⊞
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredEstandes.length === 0 && (
                <tr>
                  <td
                    colSpan={2 + columnConfigs.length + 2}
                    className="py-8 text-center text-slate-400"
                  >
                    Nenhum resultado para a busca ou filtro selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Imagens Avulsas ── */}
      {selectedEdicaoId && (() => {
        const avulsas = imagensConfig.filter((c) => c.origem_tipo === "avulso");
        const avulsoStatusColor: Record<string, string> = {
          pendente: "bg-slate-100 text-slate-600",
          solicitado: "bg-blue-100 text-blue-700",
          recebido: "bg-green-100 text-green-700",
        };
        return (
          <div className="mt-4 bg-white border border-slate-200 overflow-hidden shadow-sm">
            <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-sm uppercase tracking-wider">Imagens Avulsas</span>
                <span className="ml-3 text-slate-400 text-xs">não vinculadas a stands específicos (produtor, portal de entrada, palco...)</span>
              </div>
              <button
                onClick={() => { setAvulsaAddOpen((v) => !v); setNovaAvulsa({ tipo: "imagem", descricao: "", dimensoes: "" }); }}
                className="text-xs bg-violet-700 hover:bg-violet-600 text-white px-4 py-1.5 font-bold transition-colors"
              >
                + Adicionar
              </button>
            </div>

            {/* Formulário de adição inline */}
            {avulsaAddOpen && (
              <div className="px-5 py-3 bg-violet-50 border-b border-violet-200 flex gap-2 items-center flex-wrap">
                <select
                  value={novaAvulsa.tipo}
                  onChange={(e) => setNovaAvulsa((p) => ({ ...p, tipo: e.target.value as "imagem" | "logo", dimensoes: "" }))}
                  className="border border-slate-300 text-sm px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 w-28 shrink-0"
                >
                  <option value="imagem">📐 Imagem</option>
                  <option value="logo">🏷️ Logo</option>
                </select>
                <input
                  autoFocus
                  type="text"
                  placeholder="Descrição (ex: Fundo de Palco)"
                  className="flex-1 min-w-[180px] border border-slate-300 text-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400"
                  value={novaAvulsa.descricao}
                  onChange={(e) => setNovaAvulsa((p) => ({ ...p, descricao: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleAddAvulsa()}
                />
                {novaAvulsa.tipo === "imagem" && (
                  <input
                    type="text"
                    placeholder="Dimensões (ex: 10x5)"
                    className="w-32 shrink-0 border border-slate-300 text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400"
                    value={novaAvulsa.dimensoes}
                    onChange={(e) => setNovaAvulsa((p) => ({ ...p, dimensoes: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && handleAddAvulsa()}
                  />
                )}
                <button
                  onClick={handleAddAvulsa}
                  disabled={savingAvulsa || !novaAvulsa.descricao.trim()}
                  className="text-sm bg-violet-700 hover:bg-violet-600 text-white px-5 py-1.5 font-bold transition-colors disabled:opacity-50 shrink-0"
                >
                  {savingAvulsa ? "Salvando..." : "+ Adicionar"}
                </button>
                <button
                  onClick={() => setAvulsaAddOpen(false)}
                  className="text-sm text-slate-500 border border-slate-300 px-4 py-1.5 hover:bg-slate-100 transition-colors shrink-0"
                >
                  Cancelar
                </button>
              </div>
            )}

            {avulsas.length === 0 && !avulsaAddOpen ? (
              <div className="px-6 py-6 text-center text-slate-400 italic text-sm">
                Nenhuma imagem avulsa cadastrada.
              </div>
            ) : avulsas.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-[11px] font-bold uppercase text-slate-500">Descrição</th>
                      <th className="px-4 py-2 text-center text-[11px] font-bold uppercase text-slate-500 w-24">Tipo</th>
                      <th className="px-4 py-2 text-center text-[11px] font-bold uppercase text-slate-500 w-28">Dimensões</th>
                      <th className="px-4 py-2 text-center text-[11px] font-bold uppercase text-slate-500 w-36">Status</th>
                      <th className="w-20" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {avulsas.map((av) => {
                      const isEditing = editingAvulsa?.id === av.id;
                      if (isEditing) {
                        return (
                          <tr key={av.id} className="bg-violet-50">
                            <td colSpan={5} className="px-3 py-2">
                              <div className="flex gap-2 items-center">
                                <select
                                  value={editingAvulsa.tipo}
                                  onChange={(e) =>
                                    setEditingAvulsa((p) =>
                                      p ? { ...p, tipo: e.target.value as "imagem" | "logo", dimensoes: "" } : null
                                    )
                                  }
                                  className="border border-slate-300 text-sm px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 w-28 shrink-0"
                                >
                                  <option value="imagem">📐 Imagem</option>
                                  <option value="logo">🏷️ Logo</option>
                                </select>
                                <input
                                  autoFocus
                                  type="text"
                                  value={editingAvulsa.descricao}
                                  onChange={(e) =>
                                    setEditingAvulsa((p) => p ? { ...p, descricao: e.target.value } : null)
                                  }
                                  onKeyDown={(e) => e.key === "Enter" && handleUpdateAvulsa()}
                                  className="flex-1 border border-violet-400 text-sm px-3 py-1 focus:outline-none focus:ring-1 focus:ring-violet-400"
                                  placeholder="Descrição"
                                />
                                {editingAvulsa.tipo === "imagem" && (
                                  <input
                                    type="text"
                                    value={editingAvulsa.dimensoes}
                                    onChange={(e) =>
                                      setEditingAvulsa((p) => p ? { ...p, dimensoes: e.target.value } : null)
                                    }
                                    onKeyDown={(e) => e.key === "Enter" && handleUpdateAvulsa()}
                                    className="w-28 shrink-0 border border-slate-300 text-sm px-2 py-1 focus:outline-none"
                                    placeholder="Dimensões"
                                  />
                                )}
                                <button
                                  onClick={handleUpdateAvulsa}
                                  disabled={savingAvulsa || !editingAvulsa.descricao.trim()}
                                  className="text-xs bg-violet-700 hover:bg-violet-600 text-white px-4 py-1.5 font-bold transition-colors disabled:opacity-50 shrink-0"
                                >
                                  {savingAvulsa ? "Salvando..." : "Salvar"}
                                </button>
                                <button
                                  onClick={() => setEditingAvulsa(null)}
                                  className="text-xs text-slate-500 border border-slate-300 px-3 py-1.5 hover:bg-slate-100 transition-colors shrink-0"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      return (
                        <tr key={av.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-semibold text-slate-800">{av.descricao}</td>
                          <td className="px-4 py-2 text-center text-xs text-slate-500 uppercase">{av.tipo}</td>
                          <td className="px-4 py-2 text-center text-xs font-mono text-slate-500">{av.dimensoes || "—"}</td>
                          <td className="px-4 py-2 text-center">
                            <select
                              value={av.avulso_status}
                              onChange={(e) => handleUpdateAvulsoStatus(av.id, e.target.value as AvulsoStatus)}
                              className={`text-xs font-bold px-2 py-1 border-0 rounded cursor-pointer focus:outline-none ${avulsoStatusColor[av.avulso_status] || "bg-slate-100 text-slate-600"}`}
                            >
                              <option value="pendente">Pendente</option>
                              <option value="solicitado">Solicitado</option>
                              <option value="recebido">Recebido</option>
                            </select>
                          </td>
                          <td className="px-2 text-center">
                            <button
                              onClick={() => setEditingAvulsa({ id: av.id, tipo: av.tipo, descricao: av.descricao, dimensoes: av.dimensoes || "" })}
                              className="text-slate-400 hover:text-violet-600 hover:bg-violet-50 p-1 rounded transition-colors"
                              title="Editar"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleRemoveAvulsa(av.id)}
                              className="text-red-400 hover:text-red-700 hover:bg-red-50 p-1 transition-colors"
                              title="Remover"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        );
      })()}

      <style>{`
        .vertical-text {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          white-space: nowrap;
        }
      `}</style>

      {/* ── Modal de detalhe ── */}
      {detailModal && (() => {
        const row = estandes.find((e) => e.id === detailModal.rowId);
        if (!row) return null;
        const cliente = clientes.find((c) => c.id === row.cliente_id);
        const nomeCliente = cliente
          ? cliente.tipo_pessoa === "PJ" ? cliente.razao_social : cliente.nome_completo
          : row.cliente_nome_livre || row.stand_nr;
        const cat = getCategoriaOfRow(row);
        const applicable = columnConfigs.filter((cfg) => isApplicable(row, cfg));
        const rowRec = recebimentos[row.id] || {};
        const currentStatus: StandStatus = statusMap[row.id]?.status || "pendente";

        return (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setDetailModal(null)}
          >
            <div className="bg-white shadow-2xl w-full max-w-md flex flex-col max-h-[85vh] overflow-hidden border border-slate-200">
              {/* Header */}
              <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between flex-shrink-0">
                <div>
                  <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">
                    {row.stand_nr}
                  </span>
                  <p className="font-black text-sm truncate max-w-[280px]">{nomeCliente}</p>
                </div>
                <button
                  onClick={() => setDetailModal(null)}
                  className="text-slate-400 hover:text-white text-2xl leading-none ml-4"
                >×</button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                {/* Lista de imagens com checkboxes */}
                <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-3">
                  Imagens exigidas ({applicable.length})
                </p>
                {applicable.length === 0 ? (
                  <p className="text-slate-400 italic text-sm">Nenhuma imagem configurada para este stand.</p>
                ) : (
                  <ul className="space-y-1">
                    {applicable.map((cfg) => {
                      const recebido = !!rowRec[cfg.id];
                      const cellKey = `${row.id}-${cfg.id}`;
                      const isSaving = saving === cellKey;
                      return (
                        <li
                          key={cfg.id}
                          className={`flex items-center gap-2 text-sm py-1 px-2 rounded transition-colors ${recebido ? "bg-green-50" : "hover:bg-slate-50"}`}
                        >
                          <button
                            onClick={() => !isSaving && handleToggle(row.id, cfg.id, recebido)}
                            disabled={isSaving}
                            title={recebido ? "Marcar como não recebido" : "Marcar como recebido"}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSaving ? "opacity-50 cursor-wait" :
                                recebido ? "bg-green-500 border-green-500 text-white" : "bg-white border-slate-300 hover:border-green-400"
                              }`}
                          >
                            {recebido && <span className="text-[10px] font-black leading-none">✓</span>}
                          </button>
                          <span>{cfg.tipo === "logo" ? "🏷️" : "📐"}</span>
                          <span className={`font-semibold flex-1 ${recebido ? "text-green-700 line-through" : "text-slate-700"}`}>
                            {cfg.descricao}
                          </span>
                          {cfg.dimensoes && (
                            <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1">{cfg.dimensoes}</span>
                          )}
                          <span className="text-[10px] text-violet-400 uppercase">{cfg.tipo}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Observação */}
                <div className="mt-4">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                    Observação (opcional)
                  </label>
                  <textarea
                    rows={3}
                    className="w-full border border-slate-300 text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none"
                    placeholder="Ex: Cliente enviou só a logo, falta a testeira"
                    value={detailModal.obs}
                    onChange={(e) => setDetailModal((p) => p ? { ...p, obs: e.target.value } : null)}
                  />
                </div>
              </div>

              {/* Rodapé */}
              <div className="flex-shrink-0 border-t border-slate-200 px-5 py-4 bg-slate-50">
                <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-3">Atualizar status</p>
                <div className="flex gap-2">
                  {(["pendente", "solicitado", "completo"] as StandStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSaveStatus(detailModal.rowId, s, detailModal.obs)}
                      className={`flex-1 text-xs font-bold px-3 py-2 border transition-colors capitalize ${currentStatus === s
                          ? s === "pendente" ? "bg-yellow-100 border-yellow-400 text-yellow-800"
                            : s === "solicitado" ? "bg-blue-100 border-blue-400 text-blue-800"
                              : "bg-green-100 border-green-400 text-green-800"
                          : "border-slate-300 text-slate-500 hover:bg-slate-100"
                        }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setDetailModal(null)}
                    className="flex-1 text-sm text-slate-500 py-1.5 hover:bg-slate-100 transition-colors border border-transparent"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleSaveStatus(detailModal.rowId, currentStatus, detailModal.obs)}
                    className="flex-1 text-sm font-bold text-white bg-slate-700 hover:bg-slate-900 py-1.5 transition-colors"
                  >
                    Salvar obs.
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </Layout>
  );
};

export default ControleImagens;
