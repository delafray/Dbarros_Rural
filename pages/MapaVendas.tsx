import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Button } from "../components/UI";
import { useAuth } from "../context/AuthContext";
import { useAppDialog } from "../context/DialogContext";
import { useMapaVendas } from "../hooks/useMapaVendas";
import MapaSvg from "../components/mapa/MapaSvg";
import PainelEstande from "../components/mapa/PainelEstande";
import LegendaCores from "../components/mapa/LegendaCores";
import ResumoFamilias from "../components/mapa/ResumoFamilias";
import { PdfActionsModal, PdfProgressModal } from "../components/photos/PdfModals";
import { gerarMapaPdf } from "../utils/mapaPdf";
import { carregarImagemPdf } from "../utils/pdfVetorial";

const CHAVE_RESUMO_ABERTO = "mapa-vendas:resumo-aberto";
const CHAVE_MOSTRAR_NOMES = "mapa-vendas:mostrar-nomes";

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

  // Resumo por família/legenda: recolhido por padrão (pedido do usuário 18/09) para o
  // painel do estande ficar no topo; a escolha fica no navegador.
  const [resumoAberto, setResumoAberto] = useState<boolean>(() => {
    try { return localStorage.getItem(CHAVE_RESUMO_ABERTO) === "1"; } catch { return false; }
  });
  // Botão "Nomes": estandes ocupados mostram o nome fantasia do cliente no lugar do código.
  const [mostrarNomes, setMostrarNomes] = useState<boolean>(() => {
    try { return localStorage.getItem(CHAVE_MOSTRAR_NOMES) === "1"; } catch { return false; }
  });
  const alternarNomes = () => {
    setMostrarNomes((v) => {
      try { localStorage.setItem(CHAVE_MOSTRAR_NOMES, v ? "0" : "1"); } catch { /* sem storage */ }
      return !v;
    });
  };
  // Imprimir: gera PDF A3 deitado VETORIAL (fundo em imagem) do que está na tela e abre o modal
  // Visualizar / Baixar / Compartilhar (mesmo das fotos) — nada de diálogo do navegador.
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [pdfPronto, setPdfPronto] = useState<{ blob: Blob; fileName: string } | null>(null);
  const imprimirMapa = async () => {
    if (!mapa) return;
    try {
      setGerandoPdf(true);
      const img = fundoUrl ? await carregarImagemPdf(fundoUrl) : null;
      const blob = await gerarMapaPdf({
        viewBox: mapa.view_box,
        itens: itensFiltrados,
        mostrarNomes,
        fundo: img ? { data: img.data, formato: img.data.startsWith("data:image/jpeg") ? "JPEG" : "PNG" } : null,
        titulo: `Mapa de Vendas — ${edicao?.titulo ?? ""} (${mapa.versao})`,
      });
      const slug = (edicao?.titulo ?? "mapa").replace(/[^\w\-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      setPdfPronto({ blob, fileName: `mapa-vendas-${slug}-${mostrarNomes ? "nomes" : "numeros"}.pdf` });
    } catch (err) {
      console.error("Erro ao gerar PDF do mapa:", err);
      void appDialog.alert({ title: "Erro", message: "Não foi possível gerar o PDF do mapa.", type: "danger" });
    } finally {
      setGerandoPdf(false);
    }
  };
  const alternarResumo = () => {
    setResumoAberto((v) => {
      try { localStorage.setItem(CHAVE_RESUMO_ABERTO, v ? "0" : "1"); } catch { /* sem storage: só não lembra */ }
      return !v;
    });
  };

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
    definirCliente,
    definirRotuloMapa,
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
      <Button
        variant={mostrarNomes ? "primary" : "outline"}
        size="sm"
        onClick={alternarNomes}
        title={mostrarNomes ? "Mostrando o nome do cliente nos estandes ocupados — clique para voltar aos números" : "Mostrar o nome do cliente nos estandes vendidos, reservados e cortesia"}
      >
        🏷️ {mostrarNomes ? "Números" : "Nomes"}
      </Button>
      {mapa && (
        <Button
          variant="outline"
          size="sm"
          onClick={imprimirMapa}
          title="Imprimir o mapa em A3 deitado, como está na tela (fundo em imagem, estandes e textos em vetor)"
        >
          🖨️ Imprimir
        </Button>
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
            mostrarNomes={mostrarNomes}
          />
        </div>

        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-3">
          <LegendaCores />

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
              onSelecionarCliente={
                isVisitor ? undefined : (id, nome) => definirCliente(estandeAtual.codigo, id, nome)
              }
              onDefinirRotuloMapa={
                isVisitor ? undefined : (rotulo) => definirRotuloMapa(estandeAtual.codigo, rotulo)
              }
            />
          )}

          <ResumoFamilias
            resumoFamilias={resumoFamilias}
            resumoTotal={resumoTotal}
            foraDoMapa={foraDoMapa}
            familiaSelecionada={filtroFamilia}
            onSelecionarFamilia={setFiltroFamilia}
            resumoAberto={resumoAberto}
            onAlternarResumo={alternarResumo}
          />
        </div>
      </div>

      <PdfProgressModal isExporting={gerandoPdf} exportProgress="Desenhando o mapa em vetor (A3 deitado)…" />
      <PdfActionsModal
        isOpen={!!pdfPronto}
        blob={pdfPronto?.blob ?? null}
        fileName={pdfPronto?.fileName ?? "mapa-vendas.pdf"}
        onClose={() => setPdfPronto(null)}
      />
    </Layout>
  );
};

export default MapaVendas;
