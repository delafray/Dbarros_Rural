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

export function usePlanilhaData(edicaoId: string | undefined, navigate: (path: string) => void) {
  const [loading, setLoading] = useState(true);
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
    if (edicaoId) loadData();
  }, [edicaoId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [configData, edicaoData] = await Promise.all([
        planilhaVendasService.getConfig(edicaoId!),
        eventosService.getEdicaoById(edicaoId!),
      ]);

      if (!configData) {
        if (confirm("Nenhuma configuração encontrada. Deseja configurar agora?")) {
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

  const configsByOrigem = useMemo(
    () => imagensService.buildConfigsByOrigem(imagensConfig),
    [imagensConfig],
  );

  const getCategoriaOfRow = useCallback(
    (row: PlanilhaEstande): CategoriaSetup | undefined => {
      const nr = row.stand_nr.toLowerCase();
      const sortedCats = [...categorias].sort((a, b) => {
        const idA = (a.prefix || a.tag || "").length;
        const idB = (b.prefix || b.tag || "").length;
        return idB - idA;
      });
      return sortedCats.find((c) => {
        const id = (c.prefix || c.tag || "").toLowerCase().trim();
        if (!id) return false;
        return nr === id || nr.startsWith(`${id} `);
      });
    },
    [categorias],
  );

  const getPrecoForCombo = useCallback(
    (cat: CategoriaSetup | undefined, row: PlanilhaEstande, tipoVenda: string): number => {
      if (!cat || tipoVenda.includes("*")) return 0;
      const tipo = tipoVenda.replace("*", "").trim();

      if (cat.tipo_precificacao === 'area_livre') {
        if (tipo === "STAND PADRÃO") {
          if (row.total_override != null) return Number(row.total_override);
          if (row.area_m2 != null) {
            const pm2 = row.preco_m2_override ?? cat.preco_m2 ?? 0;
            return Number(row.area_m2) * Number(pm2);
          }
          return 0;
        }
        const match = tipo.match(/COMBO (\d+)/);
        if (match) {
          const comboOverrides = (row.combo_overrides as Record<string, number>) || {};
          if (comboOverrides[tipo] != null) return comboOverrides[tipo];
          const idx = parseInt(match[1], 10) - 1;
          const base = row.total_override ??
            (row.area_m2 != null ? Number(row.area_m2) * Number(row.preco_m2_override ?? cat.preco_m2 ?? 0) : 0);
          const adicional = Array.isArray(cat.combos_adicionais) ? (cat.combos_adicionais[idx] || 0) : 0;
          return base + adicional;
        }
        return 0;
      }

      if (tipo === "STAND PADRÃO") return cat.standBase || 0;
      const match = tipo.match(/COMBO (\d+)/);
      if (match) {
        const idx = parseInt(match[1], 10) - 1;
        if (Array.isArray(cat.combos)) return (cat.combos as number[])[idx] || 0;
      }
      return 0;
    },
    [],
  );

  const calculateRow = useCallback(
    (row: PlanilhaEstande) => {
      const cat = getCategoriaOfRow(row);
      const precoBase = getPrecoForCombo(cat, row, row.tipo_venda);

      const selecoes = (row.opcionais_selecionados as Record<string, string>) || {};
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

      return { precoBase, totalOpcionais, subTotal, desconto, totalVenda, valorPago, pendente };
    },
    [getCategoriaOfRow, getPrecoForCombo, opcionaisAtivos, precosEdicao],
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
    config,
    edicao,
    rows,
    setRows,
    clientes,
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
