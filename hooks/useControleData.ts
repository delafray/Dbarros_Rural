import { useState, useEffect, useMemo, useCallback } from "react";
import { eventosService, EventoEdicao } from "../services/eventosService";
import {
  planilhaVendasService,
  PlanilhaConfig,
  PlanilhaEstande,
  CategoriaSetup,
} from "../services/planilhaVendasService";
import { clientesService, ClienteComContatos } from "../services/clientesService";
import {
  imagensService,
  ImagemConfig,
  RecebimentosMap,
  StandImagemStatus,
} from "../services/imagensService";
import { atendimentosService, Atendimento } from "../services/atendimentosService";

export function useControleData(initialEdicaoId: string) {
  // -- Edicoes
  const [edicoes, setEdicoes] = useState<
    (EventoEdicao & { eventos: { nome: string } | null })[]
  >([]);
  const [selectedEdicaoId, setSelectedEdicaoId] = useState<string>("");

  // -- Dados da edicao selecionada
  const [config, setConfig] = useState<PlanilhaConfig | null>(null);
  const [estandes, setEstandes] = useState<PlanilhaEstande[]>([]);
  const [clientes, setClientes] = useState<ClienteComContatos[]>([]);
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [imagensConfig, setImagensConfig] = useState<ImagemConfig[]>([]);
  const [recebimentos, setRecebimentos] = useState<RecebimentosMap>({});
  const [statusMap, setStatusMap] = useState<Record<string, StandImagemStatus>>({});
  const [loading, setLoading] = useState(false);

  // -- Carrega edicoes ativas no mount
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
              ((e.eventos as any)?.nome || "").toLowerCase().includes("barra mansa") ||
              (e.titulo || "").toLowerCase().includes("barra mansa"),
            );
            setSelectedEdicaoId((barraMansa || data[0]).id);
          }
        }
      })
      .catch((err) => console.error("Erro ao carregar edicoes:", err));
  }, []);

  // -- Carrega dados da edicao selecionada
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
      const [configData, listaClientes, imagens, listaAtendimentos] = await Promise.all([
        planilhaVendasService.getConfig(edicaoId),
        clientesService.getClientesComContatos(),
        imagensService.getConfig(edicaoId),
        atendimentosService.getByEdicao(edicaoId),
      ]);

      setConfig(configData);
      setClientes(listaClientes);
      setAtendimentos(listaAtendimentos);
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

  // -- Helpers de categoria
  const categorias = useMemo<CategoriaSetup[]>(
    () => config ? (config.categorias_config as unknown as CategoriaSetup[]) : [],
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

  // -- Configs aplicaveis a um stand
  const isApplicable = useCallback(
    (row: PlanilhaEstande, cfg: ImagemConfig): boolean => {
      if (cfg.origem_tipo === "stand_categoria") {
        const cat = getCategoriaOfRow(row);
        return cat?.tag === cfg.origem_ref;
      }
      if (cfg.origem_tipo === "item_opcional") {
        const sel = (row.opcionais_selecionados as Record<string, string>) || {};
        return sel[cfg.origem_ref] === "x" || sel[cfg.origem_ref] === "*";
      }
      return false;
    },
    [getCategoriaOfRow],
  );

  // Colunas ordenadas: stand_categoria primeiro, depois item_opcional
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

  // -- Stands com cliente vinculado
  const activeEstandes = useMemo(
    () => estandes.filter((e) => e.cliente_id || e.cliente_nome_livre),
    [estandes],
  );

  // -- Mapa telefone
  const phoneMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    const sorted = [...atendimentos].sort((a, b) => {
      const da = a.updated_at || a.created_at;
      const db = b.updated_at || b.created_at;
      return db.localeCompare(da);
    });
    for (const at of sorted) {
      if (at.cliente_id && !map[at.cliente_id]) {
        const tel = atendimentosService.getTelefoneExibicao(at);
        if (tel !== "\u2014") map[at.cliente_id] = tel;
      }
    }
    for (const c of clientes) {
      if (!map[c.id] && c.contatos && c.contatos.length > 0) {
        const principal = c.contatos.find((ct) => ct.principal);
        const raw = principal?.telefone ?? (c.contatos.length === 1 ? c.contatos[0].telefone : null);
        if (raw) map[c.id] = atendimentosService.formatTelefone(raw);
      }
    }
    return map;
  }, [atendimentos, clientes]);

  // -- Mapa atendimento
  const atendimentoMap = useMemo<Record<string, Atendimento>>(() => {
    const map: Record<string, Atendimento> = {};
    const sorted = [...atendimentos].sort((a, b) => {
      const da = a.updated_at || a.created_at;
      const db = b.updated_at || b.created_at;
      return db.localeCompare(da);
    });
    for (const at of sorted) {
      if (at.cliente_id && !map[at.cliente_id]) map[at.cliente_id] = at;
    }
    return map;
  }, [atendimentos]);

  return {
    edicoes,
    selectedEdicaoId,
    setSelectedEdicaoId,
    config,
    estandes,
    clientes,
    atendimentos,
    setAtendimentos,
    imagensConfig,
    setImagensConfig,
    recebimentos,
    setRecebimentos,
    statusMap,
    setStatusMap,
    loading,
    categorias,
    getCategoriaOfRow,
    isApplicable,
    columnConfigs,
    activeEstandes,
    phoneMap,
    atendimentoMap,
  };
}
