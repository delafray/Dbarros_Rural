import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Button } from "../components/UI";
import {
  planilhaVendasService,
  PlanilhaConfig,
  PlanilhaEstande,
  CategoriaSetup,
} from "../services/planilhaVendasService";
import {
  itensOpcionaisService,
  ItemOpcional,
} from "../services/itensOpcionaisService";
import { clientesService, ClienteComContatos } from "../services/clientesService";
import { atendimentosService, Atendimento } from "../services/atendimentosService";
import { eventosService, EventoEdicao } from "../services/eventosService";
import ClienteSelectorPopup from "../components/ClienteSelectorPopup";
import ResolucaoAtendimentoModal from "../components/ResolucaoAtendimentoModal";
import {
  imagensService,
  ImagemConfig,
  RecebimentosMap,
  StandImagemStatus,
  StandStatus,
} from "../services/imagensService";
import { supabase } from "../services/supabaseClient";

// Module-level constant — not recreated on every render
const naturalSort = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

const PlanilhaVendas: React.FC = () => {
  const { edicaoId } = useParams<{ edicaoId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<PlanilhaConfig | null>(null);
  const [edicao, setEdicao] = useState<
    (EventoEdicao & { eventos: { nome: string } | null }) | null
  >(null);
  const [rows, setRows] = useState<PlanilhaEstande[]>([]);
  const [allItensOpcionais, setAllItensOpcionais] = useState<ItemOpcional[]>(
    [],
  );
  const [clientes, setClientes] = useState<ClienteComContatos[]>([]);
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [atendimentoModal, setAtendimentoModal] = useState<Atendimento | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [popupRowId, setPopupRowId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    id: string;
    field: string;
    val: string;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    rowId: string;
    field: string;
  } | null>(null);
  const [imagensConfig, setImagensConfig] = useState<ImagemConfig[]>([]);
  const [statusMap, setStatusMap] = useState<
    Record<string, StandImagemStatus>
  >({});
  const [recebimentosMap, setRecebimentosMap] = useState<RecebimentosMap>({});
  const [statusModal, setStatusModal] = useState<{
    rowId: string;
    obs: string;
  } | null>(null);
  const [modalRecebimentos, setModalRecebimentos] = useState<Record<string, boolean>>({});
  const [modalRecebLoading, setModalRecebLoading] = useState(false);
  const [realtimeToast, setRealtimeToast] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!statusModal?.rowId) { setModalRecebimentos({}); return; }
    setModalRecebLoading(true);
    imagensService.getRecebimentosByEstande(statusModal.rowId)
      .then(setModalRecebimentos)
      .catch(console.error)
      .finally(() => setModalRecebLoading(false));
  }, [statusModal?.rowId]);

  useEffect(() => {
    if (edicaoId) loadData();
  }, [edicaoId]);

  // ─── Realtime subscription ────────────────────────────────────
  useEffect(() => {
    if (!config?.id) return;

    const channel = supabase
      .channel(`planilha_realtime_${config.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "planilha_vendas_estandes",
          filter: `config_id=eq.${config.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setRows((prev) => {
              if (prev.some((r) => r.id === (payload.new as PlanilhaEstande).id)) return prev;
              return [...prev, payload.new as PlanilhaEstande];
            });
          } else if (payload.eventType === "UPDATE") {
            setRows((prev) =>
              prev.map((r) =>
                r.id === (payload.new as PlanilhaEstande).id
                  ? (payload.new as PlanilhaEstande)
                  : r,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            setRows((prev) =>
              prev.filter((r) => r.id !== (payload.old as { id: string }).id),
            );
          }
          // Show toast notification
          setRealtimeToast(true);
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          toastTimerRef.current = setTimeout(() => setRealtimeToast(false), 3000);
        },
      )
      .subscribe();

    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [config?.id]);

  // Clear pending action on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPendingAction(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [configData, edicaoData] = await Promise.all([
        planilhaVendasService.getConfig(edicaoId!),
        eventosService.getEdicaoById(edicaoId!),
      ]);

      if (!configData) {
        if (
          confirm("Nenhuma configuração encontrada. Deseja configurar agora?")
        ) {
          navigate(`/configuracao-vendas/${edicaoId}`);
        }
        return;
      }

      const [estandes, opcionais, listaClientes, imagens, statusData, recData, listaAtendimentos] =
        await Promise.all([
          planilhaVendasService.getEstandes(configData.id),
          itensOpcionaisService.getItens(),
          clientesService.getClientesComContatos(),
          imagensService.getConfig(edicaoId!),
          imagensService.getStatusByConfig(configData.id),
          imagensService.getRecebimentos(configData.id),
          atendimentosService.getByEdicao(edicaoId!),
        ]);

      setConfig(configData);
      setEdicao(edicaoData);
      setRows(estandes);
      setAllItensOpcionais(opcionais);
      setClientes(listaClientes);
      setAtendimentos(listaAtendimentos);
      setImagensConfig(imagens || []);
      setStatusMap(statusData || {});
      setRecebimentosMap(recData || {});
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Derived data ─────────────────────────────────────────────
  const categorias = useMemo<CategoriaSetup[]>(
    () =>
      config ? (config.categorias_config as unknown as CategoriaSetup[]) : [],
    [config],
  );

  const opcionaisAtivos = useMemo<ItemOpcional[]>(() => {
    if (!config?.opcionais_ativos) return [];
    return allItensOpcionais.filter((item) =>
      config.opcionais_ativos?.includes(item.id),
    );
  }, [config, allItensOpcionais]);

  const numCombos = useMemo(() => {
    let max = 0;
    categorias.forEach((c) => {
      const len = Array.isArray(c.combos) ? c.combos.length : 3;
      if (len > max) max = len;
    });
    return max;
  }, [categorias]);

  const comboLabels = useMemo(() => {
    const labels = ["STAND PADRÃO"];
    for (let i = 1; i <= numCombos; i++)
      labels.push(`COMBO ${String(i).padStart(2, "0")}`);
    return labels;
  }, [numCombos]);

  const comboNamesDisplay = useMemo(() => {
    const names: Record<string, string> = { "STAND PADRÃO": "STAND PADRÃO" };
    let customNames: string[] = [];
    if (categorias.length > 0 && Array.isArray(categorias[0].comboNames)) {
      customNames = categorias[0].comboNames;
    }

    for (let i = 1; i <= numCombos; i++) {
      const defaultLabel = `COMBO ${String(i).padStart(2, "0")}`;
      const custom = customNames[i - 1];
      names[defaultLabel] = custom ? custom : defaultLabel;
    }
    return names;
  }, [numCombos, categorias]);

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);

  // ─── Atendimento map: clienteId → último atendimento desta edição ────
  const atendimentoMap = useMemo<Record<string, Atendimento>>(() => {
    const map: Record<string, Atendimento> = {};
    const sorted = [...atendimentos].sort((a, b) => {
      const da = a.updated_at || a.created_at;
      const db = b.updated_at || b.created_at;
      return db.localeCompare(da);
    });
    for (const at of sorted) {
      if (at.cliente_id && !map[at.cliente_id]) {
        map[at.cliente_id] = at;
      }
    }
    return map;
  }, [atendimentos]);

  // ─── Row helpers ──────────────────────────────────────────────
  // Espelha a lógica de buildStandNr: match pelo prefixo (se existir) ou pela tag
  const getCategoriaOfRow = useCallback(
    (row: PlanilhaEstande): CategoriaSetup | undefined => {
      const nr = row.stand_nr.toLowerCase();

      // Ordena do identificador mais longo para o mais curto para evitar falso match (ex: "M" casando "MA 01")
      const sortedCats = [...categorias].sort((a, b) => {
        const idA = (a.prefix || a.tag || "").length;
        const idB = (b.prefix || b.tag || "").length;
        return idB - idA;
      });

      return sortedCats.find((c) => {
        const id = (c.prefix || c.tag || "").toLowerCase().trim();
        if (!id) return false;
        // Match exato: "M 01" começa com "m " ou é apenas "m"
        return nr === id || nr.startsWith(`${id} `);
      });
    },
    [categorias],
  );

  const precosEdicao = useMemo<Record<string, number>>(
    () => (config?.opcionais_precos as Record<string, number>) || {},
    [config],
  );

  const configsByOrigem = useMemo(
    () => imagensService.buildConfigsByOrigem(imagensConfig),
    [imagensConfig],
  );

  const getComputedStatus = useCallback(
    (row: PlanilhaEstande) => {
      const cat = getCategoriaOfRow(row);
      const manual = statusMap[row.id];
      return imagensService.computeStatus(
        (row.opcionais_selecionados as Record<string, string>) || null,
        cat?.tag,
        configsByOrigem,
        manual?.status,
      );
    },
    [getCategoriaOfRow, configsByOrigem, statusMap],
  );

  const getImagensDoStand = useCallback(
    (row: PlanilhaEstande) => {
      const cat = getCategoriaOfRow(row);
      const sel =
        (row.opcionais_selecionados as Record<string, string>) || {};
      const result: ImagemConfig[] = [];
      imagensConfig.forEach((cfg) => {
        if (
          cfg.origem_tipo === "stand_categoria" &&
          cfg.origem_ref === cat?.tag
        )
          result.push(cfg);
        else if (
          cfg.origem_tipo === "item_opcional" &&
          (sel[cfg.origem_ref] === "x" || sel[cfg.origem_ref] === "*")
        )
          result.push(cfg);
      });
      return result;
    },
    [getCategoriaOfRow, imagensConfig],
  );


  // Apenas atualiza o estado local — DB é salvo em handleSaveModal
  const handleToggleRecebimento = (configId: string) => {
    setModalRecebimentos((prev) => ({ ...prev, [configId]: !prev[configId] }));
  };

  const STATUS_ORDER: Record<StandStatus, number> = { pendente: 0, solicitado: 1, completo: 2 };
  const TS_KEY: Record<StandStatus, 'pendente_em' | 'solicitado_em' | 'completo_em'> = {
    pendente: 'pendente_em', solicitado: 'solicitado_em', completo: 'completo_em',
  };
  const STATUS_LABELS: Record<StandStatus, string> = {
    pendente: 'Pendente', solicitado: 'Solicitado', completo: 'Completo',
  };

  // Salva tudo de uma vez: checkboxes + status + obs
  const handleSaveModal = async (status: StandStatus) => {
    if (!statusModal) return;
    const row = rows.find((r) => r.id === statusModal.rowId);
    const imgDoStand = row ? getImagensDoStand(row) : [];
    const existingSt = statusMap[statusModal.rowId];
    const currentLevel = STATUS_ORDER[existingSt?.status as StandStatus ?? 'pendente'] ?? 0;
    const newLevel = STATUS_ORDER[status];

    // Detecta regressão de status — pede confirmação e limpa timestamps superiores
    let clearTimestamps: Array<'pendente_em' | 'solicitado_em' | 'completo_em'> | undefined;
    if (newLevel < currentLevel) {
      const confirmed = confirm(
        `Atenção: você está voltando de "${STATUS_LABELS[existingSt.status]}" para "${STATUS_LABELS[status]}".\n\nAs datas registradas nos status superiores serão apagadas. Confirma?`
      );
      if (!confirmed) return;
      // Coleta quais timestamps precisam ser zerados (todos acima do novo status)
      clearTimestamps = (Object.keys(STATUS_ORDER) as StandStatus[])
        .filter((s) => STATUS_ORDER[s] > newLevel)
        .map((s) => TS_KEY[s]);
    }

    try {
      if (imgDoStand.length > 0) {
        await Promise.all(
          imgDoStand.map((cfg: ImagemConfig) =>
            imagensService.setRecebimento(statusModal.rowId, cfg.id, !!modalRecebimentos[cfg.id]),
          ),
        );
      }
      await imagensService.upsertStatus(statusModal.rowId, status, statusModal.obs, existingSt, clearTimestamps);
      // Atualiza recebimentosMap para o contador na badge
      const newRec: Record<string, boolean> = {};
      imgDoStand.forEach((cfg: ImagemConfig) => { newRec[cfg.id] = !!modalRecebimentos[cfg.id]; });
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
        // Limpa timestamps superiores no estado local também
        if (clearTimestamps) clearTimestamps.forEach((k) => { updated[k] = null; });
        return { ...prev, [statusModal.rowId]: updated as StandImagemStatus };
      });
      setStatusModal(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as any)?.message || JSON.stringify(err);
      alert("Erro ao salvar: " + msg);
    }
  };

  const getPrecoForCombo = (
    cat: CategoriaSetup | undefined,
    tipoVenda: string,
  ): number => {
    if (!cat || tipoVenda.includes("*")) return 0;
    const tipo = tipoVenda.replace("*", "").trim();
    if (tipo === "STAND PADRÃO") return cat.standBase || 0;
    const match = tipo.match(/COMBO (\d+)/);
    if (match) {
      const idx = parseInt(match[1], 10) - 1;
      if (Array.isArray(cat.combos)) return (cat.combos as number[])[idx] || 0;
    }
    return 0;
  };

  const calculateRow = useCallback(
    (row: PlanilhaEstande) => {
      const cat = getCategoriaOfRow(row);
      const precoBase = getPrecoForCombo(cat, row.tipo_venda);

      const selecoes =
        (row.opcionais_selecionados as Record<string, string>) || {};
      let totalOpcionais = 0;
      opcionaisAtivos.forEach((opt) => {
        if (selecoes[opt.nome] === "x") {
          const preco =
            precosEdicao[opt.id] !== undefined
              ? Number(precosEdicao[opt.id])
              : Number(opt.preco_base);
          totalOpcionais += preco;
        }
      });

      const subTotal = precoBase + totalOpcionais;
      const desconto = Number(row.desconto) || 0;
      const totalVenda = subTotal - desconto;
      const valorPago = Number(row.valor_pago) || 0;
      const pendente = totalVenda - valorPago;

      return {
        precoBase,
        totalOpcionais,
        subTotal,
        desconto,
        totalVenda,
        valorPago,
        pendente,
      };
    },
    [getCategoriaOfRow, opcionaisAtivos, precosEdicao],
  );

  // ─── Summary row ─────────────────────────────────────────────
  const summary = useMemo(() => {
    const comboXCounts: Record<string, number> = {};
    const comboStarCounts: Record<string, number> = {};
    const optCounts: Record<string, number> = {};

    comboLabels.forEach((l) => {
      comboXCounts[l] = 0;
      comboStarCounts[l] = 0;
    });
    opcionaisAtivos.forEach((o) => {
      optCounts[o.nome] = 0;
    });

    rows.forEach((row) => {
      const tipo = row.tipo_venda;
      if (tipo !== "DISPONÍVEL") {
        const isStar = tipo.endsWith("*");
        const baseLabel = tipo.replace("*", "").trim();
        if (isStar)
          comboStarCounts[baseLabel] = (comboStarCounts[baseLabel] || 0) + 1;
        else comboXCounts[baseLabel] = (comboXCounts[baseLabel] || 0) + 1;
      }
      const sel = (row.opcionais_selecionados as Record<string, string>) || {};
      opcionaisAtivos.forEach((opt) => {
        const val = sel[opt.nome];
        if (val === "x" || val === "*")
          optCounts[opt.nome] = (optCounts[opt.nome] || 0) + 1;
      });
    });

    return { comboXCounts, comboStarCounts, optCounts };
  }, [rows, comboLabels, opcionaisAtivos]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          const c = calculateRow(row);
          acc.subTotal += c.subTotal;
          acc.desconto += c.desconto;
          acc.totalVenda += c.totalVenda;
          acc.valorPago += c.valorPago;
          acc.pendente += c.pendente;
          return acc;
        },
        { subTotal: 0, desconto: 0, totalVenda: 0, valorPago: 0, pendente: 0 },
      ),
    [rows, calculateRow],
  );

  // ─── Update handlers ──────────────────────────────────────────
  const handleSelectCombo = async (rowId: string, comboLabel: string) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    let newTipo: string;
    if (row.tipo_venda === comboLabel) newTipo = comboLabel + "*";
    else if (row.tipo_venda === comboLabel + "*") newTipo = "DISPONÍVEL";
    else newTipo = comboLabel;
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, tipo_venda: newTipo } : r)),
    );
    planilhaVendasService
      .updateEstande(rowId, { tipo_venda: newTipo })
      .catch((err) => console.error("Erro ao salvar combo:", err));
  };

  const handleToggleOpcional = async (rowId: string, optNome: string) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    const sel = {
      ...((row.opcionais_selecionados as Record<string, string>) || {}),
    };
    const cur = sel[optNome] || "";
    if (cur === "") sel[optNome] = "x";
    else if (cur === "x") sel[optNome] = "*";
    else sel[optNome] = "";
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId ? { ...r, opcionais_selecionados: sel } : r,
      ),
    );
    planilhaVendasService
      .updateEstande(rowId, { opcionais_selecionados: sel })
      .catch((err) => console.error("Erro ao salvar opcional:", err));
  };

  const handleUpdateField = (rowId: string, field: string, value: unknown) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)),
    );
    planilhaVendasService
      .updateEstande(rowId, { [field]: value } as Partial<PlanilhaEstande>)
      .catch((err) => console.error(`Erro ao salvar ${field}:`, err));
  };

  const handleObsChange = (rowId: string, value: string) => {
    setRows(
      rows.map((r) => (r.id === rowId ? { ...r, observacoes: value } : r)),
    );
  };

  const handleObsBlur = (rowId: string, value: string) => {
    planilhaVendasService
      .updateEstande(rowId, { observacoes: value })
      .catch((err) => console.error("Erro ao salvar obs:", err));
  };

  const handleClienteSelect = (
    rowId: string,
    clienteId: string | null,
    nomeLivre: string | null,
  ) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? { ...r, cliente_id: clienteId, cliente_nome_livre: nomeLivre }
          : r,
      ),
    );
    planilhaVendasService
      .updateEstande(rowId, {
        cliente_id: clienteId,
        cliente_nome_livre: nomeLivre,
      })
      .catch((err) => console.error("Erro ao salvar cliente:", err));
  };

  // ─── Render ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const arr = rows.filter(
      (r) =>
        r.stand_nr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clientes
          .find((c) => c.id === r.cliente_id)
          ?.nome_fantasia?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        clientes
          .find((c) => c.id === r.cliente_id)
          ?.razao_social?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        r.cliente_nome_livre?.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return arr.sort((a, b) => {
      const catA = getCategoriaOfRow(a);
      const catB = getCategoriaOfRow(b);
      const ordA = catA?.ordem ?? 0;
      const ordB = catB?.ordem ?? 0;

      // 1. Ordem numérica explícita
      if (ordA !== ordB) return ordA - ordB;

      // 2. Desempate por Ordem de Inserção na Configuração (para quando a Ordem é 1-1, 2-2)
      if (catA && catB) {
        const idxA = categorias.findIndex((c) => c === catA);
        const idxB = categorias.findIndex((c) => c === catB);
        if (idxA !== idxB) return idxA - idxB;
      }

      // 3. Desempate dentro do mesmo prefixo/categoria: M 01, M 02
      return naturalSort(a.stand_nr, b.stand_nr);
    });
  }, [rows, clientes, searchTerm, getCategoriaOfRow, categorias]);

  if (loading)
    return (
      <Layout title="Planilha">
        <div className="p-8 text-center">Carregando dados da planilha...</div>
      </Layout>
    );

  const thStyle =
    "border border-slate-300 px-1 py-1 text-[11px] font-normal uppercase whitespace-nowrap text-white text-center bg-[#1F497D]";
  const tdStyle =
    "border border-slate-300 text-[12px] px-2 py-0 whitespace-nowrap";

  const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const formatPeriodo = (ini: string | null, fim: string | null): string => {
    if (!ini) return '';
    const d1 = new Date(ini);
    const dia1 = d1.getUTCDate();
    const mes1 = d1.getUTCMonth();
    if (!fim) return `${dia1} de ${MESES[mes1]}`;
    const d2 = new Date(fim);
    const dia2 = d2.getUTCDate();
    const mes2 = d2.getUTCMonth();
    if (mes1 === mes2) return `${dia1} a ${dia2} de ${MESES[mes1]}`;
    return `${dia1} de ${MESES[mes1]} a ${dia2} de ${MESES[mes2]}`;
  };
  const periodo = edicao ? formatPeriodo(edicao.data_inicio, edicao.data_fim) : '';

  return (
    <Layout
      title={edicao ? `Planilha :: ${edicao.titulo}${periodo ? ` · ${periodo}` : ''}` : "Planilha de Vendas"}
      headerActions={
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/configuracao-vendas/${edicaoId}`)}
          >
            ⚙️ Setup
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/controle-imagens', { state: { edicaoId } })}
          >
            🖼 Controle de Imagens
          </Button>
          <input
            type="text"
            placeholder="Buscar estande ou cliente..."
            className="px-3 py-1.5 border rounded text-sm w-56"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      }
    >
      {/* Realtime update toast */}
      {realtimeToast && (
        <div
          className="fixed bottom-5 right-5 z-[200] flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white"
          style={{ background: "#1e293b", opacity: 0.92 }}
        >
          <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Atualizado por outro usuário
        </div>
      )}
      <div
        className="overflow-x-auto overflow-y-auto bg-white shadow-xl rounded-lg border border-slate-200 select-none w-full"
        style={{ maxHeight: "calc(100vh - 80px)" }}
      >
        <table
          className="border-collapse text-[11px] font-sans select-none w-full"
        >
          <thead className="sticky top-0 z-10 shadow-sm">
            {/* ── Row 1: Summary Titles ── */}
            <tr className="bg-slate-900 text-white">
              <th
                colSpan={2}
                className="border border-white/10 px-2 py-1 text-left text-[11px] font-black tracking-widest text-slate-400 uppercase whitespace-nowrap"
              >
                Resumo Geral
              </th>
              {comboLabels.map((l) => (
                <th
                  key={l}
                  className="border border-white/10 text-[8px] text-slate-500 font-normal uppercase leading-none overflow-hidden max-w-[24px]"
                ></th>
              ))}
              {opcionaisAtivos.map((o) => (
                <th
                  key={o.id}
                  className="border border-white/10 text-[8px] text-slate-500 font-normal uppercase leading-none overflow-hidden max-w-[24px]"
                ></th>
              ))}
              <th className="border border-white/10 px-2 py-1 text-center text-[11px] text-slate-400 font-bold uppercase">
                SubTotal
              </th>
              <th className="border border-white/10 px-2 py-1 text-center text-[11px] text-yellow-500/90 font-bold uppercase">
                Desconto
              </th>
              <th className="border border-white/10 px-2 py-1 text-center text-[11px] text-white font-bold uppercase bg-slate-800/40">
                Total Vendas
              </th>
              <th className="border border-white/10 px-2 py-1 text-center text-[11px] text-green-400 font-bold uppercase bg-slate-800/40">
                Pago
              </th>
              <th className="border border-white/10 px-2 py-1 text-center text-[11px] text-red-400 font-bold uppercase bg-slate-800/40">
                Pendente
              </th>
              <th className="border border-white/10 bg-violet-900/20" />
              <th className="border border-white/10 bg-violet-900/30" />
              <th className="border border-white/10 bg-violet-900/30" />
            </tr>

            {/* ── Row 2: Summary Values ── */}
            <tr className="bg-slate-800 text-slate-300">
              <th className="border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-tighter text-center">
                <div className="text-[8px] text-slate-500 font-normal leading-none">stands</div>
                <div className="text-[13px] font-black text-white leading-none">{rows.length}</div>
              </th>
              <th className="border border-white/10 px-2 py-0.5 text-[10px] text-left uppercase font-black text-slate-400">
                Totais:
              </th>
              {comboLabels.map((label) => {
                const x = summary.comboXCounts[label] || 0;
                const s = summary.comboStarCounts[label] || 0;
                return (
                  <th
                    key={label}
                    className="border border-white/10 px-1 py-0.5 text-center text-[10px] font-mono text-green-400 font-bold"
                  >
                    {x + s}
                  </th>
                );
              })}
              {opcionaisAtivos.map((o) => (
                <th
                  key={o.id}
                  className="border border-white/10 px-1 py-0.5 text-center text-[10px] text-green-400 font-mono font-bold"
                >
                  {summary.optCounts[o.nome] || 0}
                </th>
              ))}
              <th className={`${thStyle} text-right font-mono`}>
                {formatMoney(totals.subTotal)}
              </th>
              <th className={`${thStyle} text-right font-mono text-yellow-400`}>
                {formatMoney(totals.desconto)}
              </th>
              <th
                className={`${thStyle} text-right font-mono font-black text-white bg-slate-700/60 text-[12px]`}
              >
                {formatMoney(totals.totalVenda)}
              </th>
              <th
                className={`${thStyle} text-right font-mono font-black text-green-400 bg-slate-700/60 text-[12px]`}
              >
                {formatMoney(totals.valorPago)}
              </th>
              <th
                className={`${thStyle} text-right font-mono font-black text-red-400 bg-slate-700/60 text-[12px]`}
              >
                {formatMoney(totals.pendente)}
              </th>
              <th className="border border-white/10 bg-violet-900/20" />
              <th className="border border-white/10 bg-violet-900/30" />
              <th className="border border-white/10 bg-violet-900/30" />
            </tr>

            {/* ── Row 3: Column headers (Excel Style) ── */}
            <tr className="bg-[#1F497D]">
              <th className={`${thStyle} w-16`}>Stand</th>
              <th className={`${thStyle} min-w-[180px]`}>Cliente</th>
              {comboLabels.map((label) => (
                <th
                  key={label}
                  className={`${thStyle} w-6 align-bottom p-0 font-normal`}
                  title={label}
                >
                  <div
                    className="vertical-text h-20 flex items-end justify-center uppercase text-[8px] leading-none py-1 px-0.5 text-white font-normal"
                    style={{
                      fontSize:
                        comboNamesDisplay[label].length > 10 ? "7px" : "8px",
                    }}
                  >
                    {comboNamesDisplay[label]}
                  </div>
                </th>
              ))}
              {opcionaisAtivos.map((opt) => (
                <th
                  key={opt.id}
                  className={`${thStyle} w-6 align-bottom p-0 font-normal`}
                >
                  <div className="vertical-text h-20 flex items-end justify-center uppercase text-[8px] leading-none py-1 px-0.5 font-normal">
                    {opt.nome}
                  </div>
                </th>
              ))}
              <th className={`${thStyle}`}>SubTotal</th>
              <th className={`${thStyle}`}>Desconto</th>
              <th className={`${thStyle}`}>TOTAL</th>
              <th className={`${thStyle} bg-[#385723]`}>PAGO</th>
              <th className={`${thStyle} bg-[#C00000]`}>PENDENTE</th>
              <th
                className={`${thStyle} w-20 bg-violet-900/60`}
                title="Status de recebimento de imagens"
              >
                Imagens
              </th>
              <th className={`${thStyle} w-px whitespace-nowrap bg-violet-900/60`}>Cadastro</th>
              <th className={`${thStyle} w-px whitespace-nowrap bg-violet-900/60`}>Contato</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((row) => {
              const cat = getCategoriaOfRow(row);
              const calc = calculateRow(row);
              const sel =
                (row.opcionais_selecionados as Record<string, string>) || {};

              return (
                <tr
                  key={row.id}
                  className={`${cat?.cor || "bg-white"} border-b border-slate-300 hover:brightness-95`}
                >
                  {/* Stand nº */}
                  <td
                    className={`${tdStyle} px-1 py-0 align-middle w-[90px] min-w-[90px] max-w-[90px]`}
                  >
                    <div className="flex items-center gap-1 leading-none">
                      {/* TAG: sempre visível, pequena */}
                      {cat?.tag && (
                        <span
                          className="text-[7px] text-slate-500/80 font-normal uppercase tracking-tighter text-left pointer-events-none shrink-0"
                          style={{ lineHeight: 1 }}
                        >
                          {cat.tag}
                        </span>
                      )}
                      {/* Se tem prefixo → mostra stand_nr completo ("M 01")
                                                Se não tem prefixo → retira a tag do início e mostra só o número ("01") */}
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

                  {/* Cliente — clica para abrir popup */}
                  <td
                    className={`${tdStyle} min-w-[200px] cursor-pointer group px-2`}
                    onClick={() => setPopupRowId(row.id)}
                    title="Clique para selecionar cliente"
                  >
                    {(() => {
                      const cliente = clientes.find(
                        (c) => c.id === row.cliente_id,
                      );
                      if (cliente) {
                        return (
                          <span className="font-bold text-slate-900 truncate block">
                            {cliente.tipo_pessoa === "PJ"
                              ? cliente.razao_social
                              : cliente.nome_completo}
                          </span>
                        );
                      }
                      if (row.cliente_nome_livre)
                        return (
                          <span className="text-amber-900 font-black italic truncate block">
                            {row.cliente_nome_livre}
                          </span>
                        );
                      return (
                        <span className="text-slate-400 italic text-[11px] group-hover:text-blue-500 transition-colors uppercase">
                          Disponível
                        </span>
                      );
                    })()}
                  </td>

                  {/* Combo columns */}
                  {comboLabels.map((label) => {
                    const isX = row.tipo_venda === label;
                    const isStar = row.tipo_venda === label + "*";
                    const isPending =
                      pendingAction?.rowId === row.id &&
                      pendingAction?.field === label;

                    return (
                      <td
                        key={label}
                        className={`${tdStyle} text-center cursor-pointer font-black select-none w-6 h-5 leading-none px-0
                                                ${
                                                  isPending
                                                    ? "!bg-slate-400 !text-white"
                                                    : isX
                                                      ? "!bg-[#00B050] !text-white ring-1 ring-inset ring-black/10"
                                                      : isStar
                                                        ? "!bg-[#00B0F0] !text-white ring-1 ring-inset ring-black/10"
                                                        : "!bg-white hover:bg-blue-100/50 text-transparent"
                                                }`}
                        onClick={() => {
                          if (isPending) {
                            handleSelectCombo(row.id, label);
                            setPendingAction(null);
                          } else {
                            setPendingAction({ rowId: row.id, field: label });
                          }
                        }}
                        title={
                          isPending
                            ? "Clique novamente para confirmar"
                            : isX
                              ? `${comboNamesDisplay[label]} (clique para cortesia)`
                              : isStar
                                ? `${comboNamesDisplay[label]} - Cortesia (clique para limpar)`
                                : comboNamesDisplay[label]
                        }
                      >
                        <span className="flex items-center justify-center w-full h-full text-[11px]">
                          {isPending ? "?" : isX ? "x" : isStar ? "*" : ""}
                        </span>
                      </td>
                    );
                  })}

                  {/* Optional columns */}
                  {opcionaisAtivos.map((opt) => {
                    const status = sel[opt.nome] || "";
                    const isPending =
                      pendingAction?.rowId === row.id &&
                      pendingAction?.field === opt.nome;

                    return (
                      <td
                        key={opt.id}
                        className={`${tdStyle} text-center cursor-pointer font-black w-6 h-5 leading-none select-none px-0
                                                ${
                                                  isPending
                                                    ? "!bg-slate-400 !text-white"
                                                    : status === "x"
                                                      ? "!bg-[#00B050] !text-white ring-1 ring-inset ring-black/10"
                                                      : status === "*"
                                                        ? "!bg-[#00B0F0] !text-white ring-1 ring-inset ring-black/10"
                                                        : "!bg-white hover:bg-slate-100/50 text-transparent"
                                                }`}
                        onClick={() => {
                          if (isPending) {
                            handleToggleOpcional(row.id, opt.nome);
                            setPendingAction(null);
                          } else {
                            setPendingAction({
                              rowId: row.id,
                              field: opt.nome,
                            });
                          }
                        }}
                        title={
                          isPending
                            ? "Clique novamente para confirmar"
                            : opt.nome
                        }
                      >
                        <span className="flex items-center justify-center w-full h-full text-[11px]">
                          {isPending ? "?" : status}
                        </span>
                      </td>
                    );
                  })}

                  {/* Sub Total */}
                  <td
                    className={`${tdStyle} px-2 py-0 text-right font-mono font-bold bg-[#D9E1F2]/50 whitespace-nowrap text-slate-700`}
                  >
                    {formatMoney(calc.subTotal)}
                  </td>

                  {/* Desconto */}
                  <td
                    className={`${tdStyle} px-2 py-0 text-right font-mono bg-white cursor-pointer group`}
                    onClick={() => {
                      if (
                        !(
                          editing?.id === row.id &&
                          editing?.field === "desconto"
                        )
                      )
                        setEditing({
                          id: row.id,
                          field: "desconto",
                          val: String(row.desconto || ""),
                        });
                    }}
                    title="Clique para editar"
                  >
                    {editing?.id === row.id && editing?.field === "desconto" ? (
                      <input
                        autoFocus
                        type="text"
                        className="w-full bg-slate-100 text-right font-mono outline-none border-b border-red-400 min-w-[70px] px-1"
                        value={editing.val}
                        onChange={(e) =>
                          setEditing({ ...editing, val: e.target.value })
                        }
                        onBlur={() => {
                          const num = Number(
                            editing?.val.replace(",", ".") || 0,
                          );
                          setRows(
                            rows.map((r) =>
                              r.id === row.id ? { ...r, desconto: num } : r,
                            ),
                          );
                          handleUpdateField(row.id, "desconto", num);
                          setEditing(null);
                        }}
                        onKeyDown={(e) =>
                          e.key === "Enter" &&
                          (e.currentTarget as HTMLInputElement).blur()
                        }
                      />
                    ) : (
                      <span
                        className={`group-hover:text-blue-500 transition-colors ${(row.desconto || 0) > 0 ? "text-yellow-600 font-bold" : "text-slate-400"}`}
                      >
                        {formatMoney(row.desconto ?? 0)}
                      </span>
                    )}
                  </td>

                  {/* Total Vendas */}
                  <td
                    className={`${tdStyle} text-right font-mono font-black text-[12px] bg-[#D9E1F2]/60 text-slate-900`}
                  >
                    {formatMoney(calc.totalVenda)}
                  </td>

                  {/* Valor Pago */}
                  <td
                    className={`${tdStyle} px-2 py-0 text-right font-mono text-[12px] bg-green-50/60 cursor-pointer group`}
                    onClick={() => {
                      if (
                        !(
                          editing?.id === row.id &&
                          editing?.field === "valor_pago"
                        )
                      )
                        setEditing({
                          id: row.id,
                          field: "valor_pago",
                          val: String(row.valor_pago || ""),
                        });
                    }}
                    title="Clique para editar"
                  >
                    {editing?.id === row.id &&
                    editing?.field === "valor_pago" ? (
                      <input
                        autoFocus
                        type="text"
                        className="w-full bg-slate-100 text-right font-mono outline-none border-b border-green-500 font-bold px-1 min-w-[70px]"
                        value={editing.val}
                        onChange={(e) =>
                          setEditing({ ...editing, val: e.target.value })
                        }
                        onBlur={() => {
                          const num = Number(
                            editing?.val.replace(",", ".") || 0,
                          );
                          setRows(
                            rows.map((r) =>
                              r.id === row.id ? { ...r, valor_pago: num } : r,
                            ),
                          );
                          handleUpdateField(row.id, "valor_pago", num);
                          setEditing(null);
                        }}
                        onKeyDown={(e) =>
                          e.key === "Enter" &&
                          (e.currentTarget as HTMLInputElement).blur()
                        }
                      />
                    ) : (
                      <span className="text-green-900 font-bold group-hover:text-blue-500 transition-colors">
                        {formatMoney(row.valor_pago ?? 0)}
                      </span>
                    )}
                  </td>

                  {/* Pendente */}
                  <td
                    className={`${tdStyle} text-right font-mono font-black text-[12px] ${calc.pendente > 0 ? "text-red-600 bg-red-50/30" : calc.pendente < 0 ? "text-blue-600" : "text-slate-300"}`}
                  >
                    {formatMoney(calc.pendente)}
                  </td>

                  {/* Imagens status */}
                  {(() => {
                    const hasCliente =
                      row.cliente_id || row.cliente_nome_livre;
                    if (!hasCliente)
                      return (
                        <td
                          className={`${tdStyle} w-20 text-center`}
                        />
                      );
                    const computed = getComputedStatus(row);
                    const imgDoStand = getImagensDoStand(row);
                    const rowRec = recebimentosMap[row.id] || {};
                    const receivedCount = imgDoStand.filter((c: ImagemConfig) => rowRec[c.id]).length;
                    const todasRecebidas = computed === "solicitado" && imgDoStand.length > 0 && receivedCount === imgDoStand.length;
                    const badgeConfig = {
                      sem_config: {
                        label: "Sem config",
                        cls: "bg-slate-100 text-slate-400 border-slate-200",
                      },
                      pendente: {
                        label: "Pendente",
                        cls: "bg-yellow-100 text-yellow-700 border-yellow-300 cursor-pointer hover:bg-yellow-200",
                      },
                      solicitado: {
                        label: "Solicitado",
                        cls: todasRecebidas
                          ? "bg-green-100 text-green-800 border-green-400 cursor-pointer hover:bg-green-200"
                          : "bg-blue-100 text-blue-700 border-blue-300 cursor-pointer hover:bg-blue-200",
                      },
                      completo: {
                        label: "Completo",
                        cls: "bg-green-100 text-green-700 border-green-300 cursor-pointer hover:bg-green-200",
                      },
                    }[computed];
                    return (
                      <td className={`${tdStyle} w-20 text-center px-1`}>
                        <button
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 border rounded-sm transition-colors w-full ${badgeConfig.cls}`}
                          onClick={() =>
                            computed !== "sem_config" &&
                            setStatusModal({
                              rowId: row.id,
                              obs: statusMap[row.id]?.observacoes || "",
                            })
                          }
                          title={
                            computed === "sem_config"
                              ? "Configure imagens na tela de Setup"
                              : "Clique para atualizar status"
                          }
                        >
                          {badgeConfig.label}
                          {imgDoStand.length > 0 && (
                            <span className="ml-1">
                              {receivedCount}/{imgDoStand.length}
                            </span>
                          )}
                        </button>
                      </td>
                    );
                  })()}

                  {/* Cadastro — abre cadastro do cliente */}
                  <td className={`${tdStyle} w-px text-center px-1 bg-violet-50/30`}>
                    {row.cliente_id && clientes.find((c) => c.id === row.cliente_id) ? (
                      <button
                        onClick={() => navigate(`/clientes/editar/${row.cliente_id}`)}
                        className="text-violet-700 hover:text-violet-900 hover:underline text-[10px] font-bold transition-colors whitespace-nowrap"
                        title="Abrir cadastro do cliente"
                      >
                        Abrir
                      </button>
                    ) : (
                      <span className="text-slate-200 text-[10px]">—</span>
                    )}
                  </td>

                  {/* Contato — abre histórico de atendimento */}
                  <td className={`${tdStyle} w-px text-center px-1 bg-violet-50/30`}>
                    {row.cliente_id && atendimentoMap[row.cliente_id] ? (
                      <button
                        onClick={() => setAtendimentoModal(atendimentoMap[row.cliente_id])}
                        className="text-blue-600 hover:text-blue-800 hover:underline text-[10px] font-bold transition-colors whitespace-nowrap"
                        title="Ver histórico de atendimento"
                      >
                        Histórico
                      </button>
                    ) : (
                      <span className="text-slate-200 text-[10px]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5 + comboLabels.length + opcionaisAtivos.length + 5}
                  className="py-8 text-center text-slate-400"
                >
                  {rows.length === 0
                    ? "Nenhum estande gerado. Vá em ⚙️ Setup para configurar e gerar a planilha."
                    : "Nenhum resultado para a busca."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
                .vertical-text {
                    writing-mode: vertical-rl;
                    transform: rotate(180deg);
                    white-space: nowrap;
                }
            `}</style>

      {popupRowId &&
        (() => {
          const popupRow = rows.find((r) => r.id === popupRowId);
          const popupCliente = clientes.find((c: ClienteComContatos) => c.id === popupRow?.cliente_id);
          const popupClienteNome = popupCliente
            ? (popupCliente.tipo_pessoa === 'PJ'
                ? (popupCliente.razao_social || popupCliente.nome_fantasia)
                : popupCliente.nome_completo) || null
            : null;
          const rowHasData = !!popupRow && (
            popupRow.tipo_venda !== 'DISPONÍVEL' ||
            Object.keys((popupRow.opcionais_selecionados as Record<string, unknown>) || {}).length > 0
          );
          return (
            <ClienteSelectorPopup
              currentClienteId={popupRow?.cliente_id}
              currentNomeLivre={popupRow?.cliente_nome_livre}
              currentClienteNome={popupClienteNome}
              rowHasData={rowHasData}
              onSelect={(clienteId, nomeLivre) =>
                handleClienteSelect(popupRowId, clienteId, nomeLivre)
              }
              onClose={() => setPopupRowId(null)}
            />
          );
        })()}

      {/* ── Modal de Histórico de Atendimento ── */}
      {atendimentoModal && (
        <ResolucaoAtendimentoModal
          atendimento={atendimentoModal}
          onClose={() => setAtendimentoModal(null)}
          onSuccess={() => setAtendimentoModal(null)}
        />
      )}

      {/* ── Modal de Status de Imagens ── */}
      {statusModal &&
        (() => {
          const row = rows.find((r) => r.id === statusModal.rowId);
          if (!row) return null;
          const imagens = getImagensDoStand(row);
          const currentStatus = statusMap[row.id]?.status || "pendente";
          const cliente = clientes.find((c) => c.id === row.cliente_id);
          const nomeCliente =
            cliente
              ? cliente.tipo_pessoa === "PJ"
                ? cliente.razao_social
                : cliente.nome_completo
              : row.cliente_nome_livre || row.stand_nr;
          return (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
              onClick={(e) =>
                e.target === e.currentTarget && setStatusModal(null)
              }
            >
              <div className="bg-white shadow-2xl w-full max-w-md flex flex-col max-h-[85vh] overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between flex-shrink-0">
                  <div>
                    <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">
                      {row.stand_nr}
                    </span>
                    <p className="font-black text-sm truncate max-w-[280px]">
                      {nomeCliente}
                    </p>
                  </div>
                  <button
                    onClick={() => setStatusModal(null)}
                    className="text-slate-400 hover:text-white text-2xl leading-none ml-4"
                  >
                    ×
                  </button>
                </div>

                {/* Lista de imagens exigidas */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-3">
                    Imagens exigidas ({imagens.length})
                  </p>
                  {imagens.length === 0 ? (
                    <p className="text-slate-400 italic text-sm">
                      Nenhuma imagem configurada para este stand.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {imagens.map((cfg) => {
                        const recebido = !!modalRecebimentos[cfg.id];
                        return (
                          <li
                            key={cfg.id}
                            className={`flex items-center gap-2 text-sm py-1 px-2 rounded transition-colors ${recebido ? "bg-green-50" : "hover:bg-slate-50"}`}
                          >
                            <button
                              onClick={() => handleToggleRecebimento(cfg.id)}
                              disabled={modalRecebLoading}
                              title={recebido ? "Marcar como não recebido" : "Marcar como recebido"}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                recebido
                                  ? "bg-green-500 border-green-500 text-white"
                                  : "bg-white border-slate-300 hover:border-green-400"
                              }`}
                            >
                              {recebido && <span className="text-[10px] font-black leading-none">✓</span>}
                            </button>
                            <span>{cfg.tipo === "logo" ? "🏷️" : "📐"}</span>
                            <span className={`font-semibold flex-1 ${recebido ? "text-green-700 line-through" : "text-slate-700"}`}>
                              {cfg.descricao}
                            </span>
                            {cfg.dimensoes && (
                              <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1">
                                {cfg.dimensoes}
                              </span>
                            )}
                            <span className="text-[10px] text-violet-400 uppercase">
                              {cfg.tipo}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <div className="mt-4">
                    <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                      Observação (opcional)
                    </label>
                    <textarea
                      rows={2}
                      className="w-full border border-slate-300 text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none"
                      placeholder="Ex: Cliente enviou só a logo, falta a testeira"
                      value={statusModal.obs}
                      onChange={(e) =>
                        setStatusModal((p) =>
                          p ? { ...p, obs: e.target.value } : null,
                        )
                      }
                    />
                  </div>
                </div>

                {/* Botões de status */}
                <div className="flex-shrink-0 border-t border-slate-200 px-5 py-4 bg-slate-50">
                  <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-3">
                    Atualizar status
                  </p>
                  {(() => {
                    const st = statusMap[row.id];
                    const fmtDate = (d: string | null | undefined) =>
                      d ? format(parseISO(d), "dd/MM/yy HH:mm", { locale: ptBR }) : null;
                    const items = [
                      { key: "pendente" as StandStatus, label: "Pendente", date: fmtDate(st?.pendente_em), active: currentStatus === "pendente", activeClass: "bg-yellow-100 border-yellow-400 text-yellow-800", hoverClass: "hover:bg-yellow-50 hover:border-yellow-300" },
                      { key: "solicitado" as StandStatus, label: "Solicitado", date: fmtDate(st?.solicitado_em), active: currentStatus === "solicitado", activeClass: "bg-blue-100 border-blue-400 text-blue-800", hoverClass: "hover:bg-blue-50 hover:border-blue-300" },
                      { key: "completo" as StandStatus, label: "Completo", date: fmtDate(st?.completo_em), active: currentStatus === "completo", activeClass: "bg-green-100 border-green-400 text-green-800", hoverClass: "hover:bg-green-50 hover:border-green-300" },
                    ];
                    return (
                      <div className="flex gap-2">
                        {items.map(({ key, label, date, active, activeClass, hoverClass }) => (
                          <div key={key} className="flex-1 flex flex-col items-center gap-0.5">
                            <button
                              onClick={() => handleSaveModal(key)}
                              className={`w-full text-xs font-bold px-3 py-2 border transition-colors ${active ? activeClass : `border-slate-300 text-slate-500 ${hoverClass}`}`}
                            >
                              {label}
                            </button>
                            {date && (
                              <span className="text-[9px] text-slate-400 font-mono leading-tight text-center">{date}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setStatusModal(null)}
                      className="flex-1 text-sm text-slate-500 py-1.5 hover:bg-slate-100 transition-colors border border-transparent"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleSaveModal(currentStatus as StandStatus)}
                      className="flex-1 text-sm font-bold text-white bg-slate-700 hover:bg-slate-900 py-1.5 transition-colors"
                    >
                      Salvar
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

export default PlanilhaVendas;
