import { useState, useEffect, useMemo } from "react";
import { mapaVendasService } from "../services/mapaVendasService";
import {
  planilhaVendasService,
  PlanilhaConfig,
  PlanilhaEstande,
  CategoriaSetup,
} from "../services/planilhaVendasService";
import { itensOpcionaisService, ItemOpcional } from "../services/itensOpcionaisService";
import { clientesService, ClienteComContatos } from "../services/clientesService";
import { eventosService, EventoEdicao } from "../services/eventosService";
import { usePlanilhaRealtime } from "./usePlanilhaRealtime";
import {
  MapaPublicado,
  EstandeMapa,
  StatusEstande,
  indexarPlanilha,
  statusDoEstande,
  linhaDoEstande,
  resumoPorFamilia,
  resumoGeral as calcResumoGeral,
  estandesForaDoMapa,
  nomeClienteDaLinha,
  ResumoFamilia,
} from "../utils/mapaCalc";
import {
  getCategoriaOfStandNr,
  calculateRowTotals,
  EstandeCalc,
  OpcionalCalc,
  TotaisRow,
} from "../utils/planilhaCalc";

/** Um item pronto para o MapaSvg desenhar: geometria + status já resolvido. */
export interface ItemMapa {
  estande: EstandeMapa;
  status: StatusEstande;
  clienteNome: string | null;
}

export function useMapaVendas(edicaoId: string | undefined, isVisitor = false) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mapa, setMapa] = useState<MapaPublicado | null>(null);
  const [fundoUrl, setFundoUrl] = useState<string | null>(null);
  const [config, setConfig] = useState<PlanilhaConfig | null>(null);
  const [edicao, setEdicao] = useState<
    (EventoEdicao & { eventos: { nome: string } | null }) | null
  >(null);
  const [rows, setRows] = useState<PlanilhaEstande[]>([]);
  const [clientes, setClientes] = useState<ClienteComContatos[]>([]);
  const [allItensOpcionais, setAllItensOpcionais] = useState<ItemOpcional[]>([]);

  const [estandeSelecionado, setEstandeSelecionado] = useState<string | null>(null);
  const [filtroFamilia, setFiltroFamilia] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<StatusEstande | null>(null);

  useEffect(() => {
    if (!edicaoId) return;
    // Cancelamento: se o usuário trocar de edição com o fetch em voo, os
    // resultados da edição anterior são descartados (mesmo padrão de usePlanilhaData).
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // 1ª leva: tudo que não depende de outra resposta.
        const [mapaData, edicaoData, configData, listaClientes, opcionais] = await Promise.all([
          mapaVendasService.getMapaAtivo(edicaoId),
          eventosService.getEdicaoById(edicaoId),
          planilhaVendasService.getConfig(edicaoId),
          isVisitor
            ? clientesService.getClientesComContatosVisitante()
            : clientesService.getClientesComContatos(),
          itensOpcionaisService.getItens(),
        ]);
        if (cancelled) return;

        // 2ª leva: URL assinada do fundo (depende do mapa) + estandes (depende do config).
        const [urlFundo, estandes] = await Promise.all([
          mapaVendasService.getFundoUrl(mapaData?.fundo_path),
          configData ? planilhaVendasService.getEstandes(configData.id) : Promise.resolve([]),
        ]);
        if (cancelled) return;

        setMapa(mapaData);
        setEdicao(edicaoData);
        setConfig(configData);
        setClientes(listaClientes);
        setAllItensOpcionais(opcionais);
        setFundoUrl(urlFundo);
        setRows(estandes);
      } catch (err) {
        console.error("Erro ao carregar mapa de vendas:", err);
        if (!cancelled) {
          setError("Não foi possível carregar o mapa de vendas. Verifique a conexão e tente novamente.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [edicaoId, isVisitor]);

  // Realtime: mesma assinatura de planilha_vendas_estandes usada em TempPlanilha.
  usePlanilhaRealtime(config?.id, setRows);

  // ─── Derivados ─────────────────────────────────────────────────
  const clienteMap = useMemo(
    () => new Map(clientes.map((c) => [c.id, c])),
    [clientes],
  );

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
          return { id, nome: nomes[id], preco_base: 0, created_at: null, tipo_padrao: null } as ItemOpcional;
        }
        return allItensOpcionais.find((item) => item.id === id) || null;
      })
      .filter(Boolean) as ItemOpcional[];
  }, [config, allItensOpcionais]);

  const precosEdicao = useMemo<Record<string, number>>(
    () => (config?.opcionais_precos as Record<string, number>) || {},
    [config],
  );

  const indice = useMemo(() => indexarPlanilha(rows), [rows]);

  // Memoizado: sem isso, `?? []` criaria um array novo a cada render e
  // invalidaria todos os useMemo abaixo enquanto o mapa não carrega.
  const estandes = useMemo<EstandeMapa[]>(() => mapa?.estandes ?? [], [mapa]);

  const itens = useMemo<ItemMapa[]>(
    () =>
      estandes.map((estande) => {
        const linha = linhaDoEstande(estande, indice);
        return {
          estande,
          status: statusDoEstande(linha),
          clienteNome: nomeClienteDaLinha(linha, clienteMap),
        };
      }),
    [estandes, indice, clienteMap],
  );

  const itensFiltrados = useMemo(
    () =>
      itens.filter((item) => {
        if (filtroFamilia && item.estande.familia !== filtroFamilia) return false;
        if (filtroStatus && item.status !== filtroStatus) return false;
        return true;
      }),
    [itens, filtroFamilia, filtroStatus],
  );

  const resumoFamilias = useMemo<ResumoFamilia[]>(
    () => resumoPorFamilia(estandes, indice),
    [estandes, indice],
  );

  const resumoTotal = useMemo<ResumoFamilia>(
    () => calcResumoGeral(estandes, indice),
    [estandes, indice],
  );

  const foraDoMapa = useMemo(
    () => estandesForaDoMapa(estandes, rows),
    [estandes, rows],
  );

  // ─── Estande selecionado ───────────────────────────────────────
  const estandeAtual = useMemo(
    () => estandes.find((e) => e.codigo === estandeSelecionado),
    [estandes, estandeSelecionado],
  );

  const linhaAtual = useMemo(
    () => (estandeAtual ? linhaDoEstande(estandeAtual, indice) : undefined),
    [estandeAtual, indice],
  );

  const statusAtual = useMemo(() => statusDoEstande(linhaAtual), [linhaAtual]);

  const clienteNomeAtual = useMemo(
    () => nomeClienteDaLinha(linhaAtual, clienteMap),
    [linhaAtual, clienteMap],
  );

  const categoriaAtual = useMemo(
    () => (estandeAtual ? getCategoriaOfStandNr(estandeAtual.stand_nr, categorias) : undefined),
    [estandeAtual, categorias],
  );

  const totaisAtual = useMemo<TotaisRow | null>(() => {
    if (!linhaAtual) return null;
    return calculateRowTotals(
      linhaAtual as unknown as EstandeCalc,
      categoriaAtual,
      opcionaisAtivos as unknown as OpcionalCalc[],
      precosEdicao,
    );
  }, [linhaAtual, categoriaAtual, opcionaisAtivos, precosEdicao]);

  return {
    loading,
    error,
    mapa,
    fundoUrl,
    edicao,
    config,
    rows,

    itens,
    itensFiltrados,
    resumoFamilias,
    resumoTotal,
    foraDoMapa,

    filtroFamilia,
    setFiltroFamilia,
    filtroStatus,
    setFiltroStatus,

    estandeSelecionado,
    setEstandeSelecionado,
    estandeAtual,
    linhaAtual,
    statusAtual,
    clienteNomeAtual,
    categoriaAtual,
    totaisAtual,
  };
}
