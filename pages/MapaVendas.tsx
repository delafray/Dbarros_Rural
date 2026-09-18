import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Button } from "../components/UI";
import { useAuth } from "../context/AuthContext";
import { useAppDialog } from "../context/DialogContext";
import { useMapaVendas } from "../hooks/useMapaVendas";
import MapaSvg from "../components/mapa/MapaSvg";
import PainelEstande from "../components/mapa/PainelEstande";
import LegendaMapa from "../components/mapa/LegendaMapa";

// Mesmo helper de período usado em TempPlanilha.tsx (cabeçalho no mesmo estilo).
const formatPeriodo = (ini: string | null, fim: string | null): string => {
  if (!ini) return "";
  const d1 = new Date(ini);
  const dia1 = String(d1.getUTCDate()).padStart(2, "0");
  const mes1 = String(d1.getUTCMonth() + 1).padStart(2, "0");
  if (!fim) return `${dia1}/${mes1}`;
  const d2 = new Date(fim);
  const dia2 = String(d2.getUTCDate()).padStart(2, "0");
  const mes2 = String(d2.getUTCMonth() + 1).padStart(2, "0");
  if (mes1 === mes2) return `${dia1}–${dia2}/${mes1}`;
  return `${dia1}/${mes1}–${dia2}/${mes2}`;
};

const MapaVendas: React.FC = () => {
  const { edicaoId } = useParams<{ edicaoId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isVisitor = user?.isVisitor ?? false;
  const appDialog = useAppDialog();

  const {
    loading,
    error,
    mapa,
    fundoUrl,
    edicao,
    config,
    itensFiltrados,
    resumoFamilias,
    resumoTotal,
    foraDoMapa,
    filtroFamilia,
    setFiltroFamilia,
    estandeSelecionado,
    setEstandeSelecionado,
    alternarStatus,
    estandeAtual,
    linhaAtual,
    statusAtual,
    clienteNomeAtual,
    categoriaAtual,
    totaisAtual,
  } = useMapaVendas(edicaoId, isVisitor, appDialog);

  const periodo = edicao ? formatPeriodo(edicao.data_inicio, edicao.data_fim) : "";
  const titulo = edicao
    ? `Mapa de Vendas :: ${edicao.titulo}${periodo ? ` · ${periodo}` : ""}`
    : "Mapa de Vendas";

  const headerActions = (
    <div className="flex gap-2 items-center">
      {mapa && (
        <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap" title="Versão da planta publicada">
          {mapa.versao}
        </span>
      )}
      <Button variant="outline" size="sm" onClick={() => navigate(`/planilha-vendas/${edicaoId}`)}>
        📋 Planilha
      </Button>
      {!isVisitor && (
        <Button variant="outline" size="sm" onClick={() => navigate(`/configuracao-vendas/${edicaoId}`)}>
          ⚙️ Configuração
        </Button>
      )}
    </div>
  );

  if (loading) {
    return (
      <Layout title="Mapa de Vendas">
        <div className="p-8 text-center text-slate-500">Carregando mapa de vendas...</div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Mapa de Vendas">
        <div className="p-8 text-center">
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-800"
          >
            Recarregar
          </button>
        </div>
      </Layout>
    );
  }

  if (!config) {
    return (
      <Layout title={titulo} headerActions={headerActions}>
        <div className="p-8 text-center text-slate-500">
          <p className="font-semibold mb-2">Planilha não configurada para esta edição.</p>
          {!isVisitor && (
            <p className="text-sm">
              Configure a planilha de vendas (⚙️ Configuração) antes de publicar o mapa.
            </p>
          )}
        </div>
      </Layout>
    );
  }

  if (!mapa) {
    return (
      <Layout title={titulo} headerActions={headerActions}>
        <div className="p-8 text-center text-slate-500">
          <p className="font-semibold mb-2">Nenhum mapa publicado para esta edição.</p>
          <p className="text-sm max-w-md mx-auto">
            O mapa é gerado a partir da planta baixa (motor-planta) e publicado pelo administrador.
            Enquanto isso, use a planilha de vendas normalmente.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={titulo} headerActions={headerActions}>
      <div className="flex flex-col lg:flex-row gap-3" style={{ minHeight: "calc(100vh - 96px)" }}>
        <div className="flex-1 min-h-[55vh] lg:min-h-0 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <MapaSvg
            viewBox={mapa.view_box}
            fundoUrl={fundoUrl}
            itens={itensFiltrados}
            selecionado={estandeSelecionado}
            onSelect={setEstandeSelecionado}
            onAlternarStatus={isVisitor ? undefined : alternarStatus}
          />
        </div>

        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-3">
          <LegendaMapa
            resumoFamilias={resumoFamilias}
            resumoTotal={resumoTotal}
            foraDoMapa={foraDoMapa}
            familiaSelecionada={filtroFamilia}
            onSelecionarFamilia={setFiltroFamilia}
          />

          {estandeAtual && (
            <PainelEstande
              edicaoId={edicaoId!}
              estande={estandeAtual}
              status={statusAtual}
              linha={linhaAtual}
              clienteNome={clienteNomeAtual}
              categoria={categoriaAtual}
              totais={totaisAtual}
              isVisitor={isVisitor}
              onClose={() => setEstandeSelecionado(null)}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default MapaVendas;
