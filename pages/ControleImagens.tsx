import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAppDialog } from "../context/DialogContext";
import { Atendimento } from "../services/atendimentosService";
import { atendimentosService } from "../services/atendimentosService";
import ResolucaoAtendimentoModal from "../components/ResolucaoAtendimentoModal";

import { useControleData } from "../hooks/useControleData";
import { useControleFilters } from "../hooks/useControleFilters";
import { useControleToggle } from "../hooks/useControleToggle";
import { useControleStatusModal } from "../hooks/useControleStatusModal";
import { useControleAvulsas } from "../hooks/useControleAvulsas";
import { useControleDriveLink } from "../hooks/useControleDriveLink";

import ControleTopBar from "../components/controle/ControleTopBar";
import ControleTable from "../components/controle/ControleTable";
import ControleAvulsasSection from "../components/controle/ControleAvulsasSection";
import ControleDetailModal from "../components/controle/ControleDetailModal";
import DriveLinkWidget from "../components/controle/DriveLinkWidget";

const ControleImagens: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const appDialog = useAppDialog();
  const initialEdicaoId = (location.state as any)?.edicaoId ?? "";

  const [atendimentoModal, setAtendimentoModal] = useState<Atendimento | null>(null);

  const data = useControleData(initialEdicaoId);

  const { saving, getRowStatus, handleToggle } = useControleToggle({
    columnConfigs: data.columnConfigs,
    estandes: data.estandes,
    isApplicable: data.isApplicable,
    recebimentos: data.recebimentos,
    setRecebimentos: data.setRecebimentos,
    setStatusMap: data.setStatusMap,
    appDialog,
  });

  const { searchTerm, setSearchTerm, filterStatus, setFilterStatus, filteredEstandes, counts } =
    useControleFilters({
      activeEstandes: data.activeEstandes,
      clientes: data.clientes,
      categorias: data.categorias,
      getCategoriaOfRow: data.getCategoriaOfRow,
      getRowStatus,
    });

  const { detailModal, setDetailModal, handleSaveStatus } = useControleStatusModal({
    statusMap: data.statusMap,
    setStatusMap: data.setStatusMap,
    appDialog,
  });

  const avulsas = useControleAvulsas({
    selectedEdicaoId: data.selectedEdicaoId,
    imagensConfig: data.imagensConfig,
    setImagensConfig: data.setImagensConfig,
    appDialog,
  });

  const driveLink = useControleDriveLink(data.selectedEdicaoId);

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

          {data.selectedEdicaoId && <DriveLinkWidget {...driveLink} />}

          {data.selectedEdicaoId && (
            <button
              onClick={() => navigate(`/planilha-vendas/${data.selectedEdicaoId}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors whitespace-nowrap"
              title="Abrir planilha desta edicao"
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
      <ControleTopBar
        edicoes={data.edicoes}
        selectedEdicaoId={data.selectedEdicaoId}
        setSelectedEdicaoId={data.setSelectedEdicaoId}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        counts={counts}
        activeEstandes={data.activeEstandes}
      />

      <div className="overflow-x-auto bg-white shadow-xl border border-slate-200 rounded-lg">
        {data.loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Carregando dados...</div>
        ) : !data.selectedEdicaoId ? (
          <div className="p-8 text-center text-slate-400 text-sm">Selecione uma edicao acima.</div>
        ) : !data.config ? (
          <div className="p-8 text-center text-slate-400 text-sm">Planilha nao configurada para esta edicao.</div>
        ) : data.columnConfigs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Nenhuma imagem configurada para esta edicao.{" "}
            <span className="text-blue-500">Configure em &#x2699;&#xfe0f; Setup &gt; Imagens.</span>
          </div>
        ) : data.activeEstandes.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Nenhum stand com cliente vinculado nesta edicao.</div>
        ) : (
          <ControleTable
            filteredEstandes={filteredEstandes}
            columnConfigs={data.columnConfigs}
            clientes={data.clientes}
            recebimentos={data.recebimentos}
            statusMap={data.statusMap}
            phoneMap={data.phoneMap}
            atendimentoMap={data.atendimentoMap}
            saving={saving}
            getCategoriaOfRow={data.getCategoriaOfRow}
            isApplicable={data.isApplicable}
            getRowStatus={getRowStatus}
            handleToggle={handleToggle}
            setDetailModal={setDetailModal}
            setAtendimentoModal={setAtendimentoModal}
          />
        )}
      </div>

      {data.selectedEdicaoId && (
        <ControleAvulsasSection {...avulsas} />
      )}

      {detailModal && (
        <ControleDetailModal
          detailModal={detailModal}
          estandes={data.estandes}
          clientes={data.clientes}
          columnConfigs={data.columnConfigs}
          recebimentos={data.recebimentos}
          statusMap={data.statusMap}
          saving={saving}
          getCategoriaOfRow={data.getCategoriaOfRow}
          isApplicable={data.isApplicable}
          handleToggle={handleToggle}
          handleSaveStatus={handleSaveStatus}
          setDetailModal={setDetailModal}
        />
      )}

      {atendimentoModal && (
        <ResolucaoAtendimentoModal
          atendimento={atendimentoModal}
          onClose={() => setAtendimentoModal(null)}
          onSuccess={() => {
            setAtendimentoModal(null);
            atendimentosService.getByEdicao(data.selectedEdicaoId)
              .then(data.setAtendimentos)
              .catch(console.error);
          }}
        />
      )}
    </Layout>
  );
};

export default ControleImagens;
