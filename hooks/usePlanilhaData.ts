import { useState, useEffect, useMemo, useCallback } from "react";
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
import {
  imagensService,
  ImagemConfig,
  RecebimentosMap,
  StandImagemStatus,
} from "../services/imagensService";
import {
  getCategoriaOfStandNr,
  getPrecoForCombo as calcPrecoForCombo,
  calculateRowTotals,
  EstandeCalc,
  OpcionalCalc,
} from "../utils/planilhaCalc";

export function usePlanilhaData(
  edicaoId: string | undefined,
  navigate: (path: string) => void,
  appDialog?: { confirm: (opts: { title: string; message: string; confirmText?: string; type?: string }) => Promise<boolean> },
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<PlanilhaConfig | null>(null);
  const [edicao, setEdicao] = useState<
    (EventoEdicao & { eventos: { nome: string } | null }) | null
  >(null);
  const [rows, setRows] = useState<PlanilhaEstande[]>([]);
  const [allItensOpcionais, setAllItensOpcionais] = useState<ItemOpcional[]>([]);
  const [clientes, setClientes] = useState<ClienteComContatos[]>([]);
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [imagensConfig, setImagensConfig] = useState<ImagemConfig[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, StandImagemStatus>>({});
  const [recebimentosMap, setRecebimentosMap] = useState<RecebimentosMap>({});

  useEffect(() => {
    if (!edicaoId) return;
    // Cancelamento: se o usuário trocar de edição com o fetch em voo, os
    // resultados da edição anterior são descartados (evita misturar dados).
    let cancelled = false;
    loadData(() => cancelled);
    return () => { cancelled = true; };
  }, [edicaoId]);

  const loadData = async (isCancelled: () => boolean = () => false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, edicaoData] = await Promise.all([
        planilhaVendasService.getConfig(edicaoId!),
        eventosService.getEdicaoById(edicaoId!),
      ]);

      if (isCancelled()) return;

      if (!configData) {
        // appDialog em vez de confirm() nativo (PWA standalone); mantém fallback
        const wantsSetup = appDialog
          ? await appDialog.confirm({
              title: 'Configuração não encontrada',
              message: 'Nenhuma configuração encontrada. Deseja configurar agora?',
              confirmText: 'Configurar',
              type: 'info',
            })
          : confirm("Nenhuma configuração encontrada. Deseja configurar agora?");
        if (wantsSetup) {
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

      if (isCancelled()) return;

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
      if (!isCancelled()) {
        setError("Não foi possível carregar a planilha. Verifique a conexão e tente novamente.");
      }
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  };

  // ─── Derived data ─────────────────────────────────────────────
  const categorias = useMemo<CategoriaSetup[]>(
    () => (config ? (config.categorias_config as unknown as CategoriaSetup[]) : []),
    [config],
  );

  const opcionaisAtivos = useMemo<ItemOpcional[]>(() => {
    if (!config?.opcionais_ativos) return [];
    const nomes = (config.opcionais_nomes as Record<string, string>) || {};
    return config.opcionais_ativos
      .map((id) => {
        if (nomes[id]) {
          return {
            id,
            nome: nomes[id],
            preco_base: 0,
            created_at: null,
            tipo_padrao: null,
          } as ItemOpcional;
        }
        return allItensOpcionais.find((item) => item.id === id) || null;
      })
      .filter(Boolean) as ItemOpcional[];
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

  const precosEdicao = useMemo<Record<string, number>>(
    () => (config?.opcionais_precos as Record<string, number>) || {},
    [config],
  );

  const clienteMap = useMemo<Map<string, ClienteComContatos>>(
    () => new Map(clientes.map((c) => [c.id, c])),
    [clientes],
  );

  const configsByOrigem = useMemo(
    () => imagensService.buildConfigsByOrigem(imagensConfig),
    [imagensConfig],
  );

  // Lógica de precificação extraída para utils/planilhaCalc.ts (funções puras,
  // testadas em utils/planilhaCalc.test.ts). Os callbacks abaixo só delegam.
  const getCategoriaOfRow = useCallback(
    (row: PlanilhaEstande): CategoriaSetup | undefined =>
      getCategoriaOfStandNr(row.stand_nr, categorias) as CategoriaSetup | undefined,
    [categorias],
  );

  const getPrecoForCombo = useCallback(
    (cat: CategoriaSetup | undefined, row: PlanilhaEstande, tipoVenda: string): number =>
      calcPrecoForCombo(cat, row as unknown as EstandeCalc, tipoVenda),
    [],
  );

  const calculateRow = useCallback(
    (row: PlanilhaEstande) => {
      const cat = getCategoriaOfRow(row);
      return calculateRowTotals(
        row as unknown as EstandeCalc,
        cat,
        opcionaisAtivos as unknown as OpcionalCalc[],
        precosEdicao,
      );
    },
    [getCategoriaOfRow, opcionaisAtivos, precosEdicao],
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
      const sel = (row.opcionais_selecionados as Record<string, string>) || {};
      const result: ImagemConfig[] = [];
      imagensConfig.forEach((cfg) => {
        if (cfg.origem_tipo === "stand_categoria" && cfg.origem_ref === cat?.tag)
          result.push(cfg);
        else if (cfg.origem_tipo === "item_opcional" && (sel[cfg.origem_ref] === "x" || sel[cfg.origem_ref] === "*"))
          result.push(cfg);
      });
      return result;
    },
    [getCategoriaOfRow, imagensConfig],
  );

  return {
    loading,
    error,
    config,
    edicao,
    rows,
    setRows,
    clientes,
    clienteMap,
    atendimentos,
    imagensConfig,
    statusMap,
    setStatusMap,
    recebimentosMap,
    setRecebimentosMap,
    categorias,
    opcionaisAtivos,
    numCombos,
    comboLabels,
    comboNamesDisplay,
    atendimentoMap,
    precosEdicao,
    getCategoriaOfRow,
    calculateRow,
    getComputedStatus,
    getImagensDoStand,
  };
}
