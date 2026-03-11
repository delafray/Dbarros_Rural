import React from "react";
import { PlanilhaEstande, CategoriaSetup } from "../../services/planilhaVendasService";
import { ImagemConfig, RecebimentosMap, StandImagemStatus, StandStatus } from "../../services/imagensService";
import { ClienteComContatos } from "../../services/clientesService";

interface ControleDetailModalProps {
  detailModal: { rowId: string; obs: string };
  estandes: PlanilhaEstande[];
  clientes: ClienteComContatos[];
  columnConfigs: ImagemConfig[];
  recebimentos: RecebimentosMap;
  statusMap: Record<string, StandImagemStatus>;
  saving: string | null;
  getCategoriaOfRow: (row: PlanilhaEstande) => CategoriaSetup | undefined;
  isApplicable: (row: PlanilhaEstande, cfg: ImagemConfig) => boolean;
  handleToggle: (estandeId: string, imagemConfigId: string, currentValue: boolean) => void;
  handleSaveStatus: (rowId: string, status: StandStatus, obs: string) => void;
  setDetailModal: (v: { rowId: string; obs: string } | null) => void;
}

const ControleDetailModal: React.FC<ControleDetailModalProps> = ({
  detailModal,
  estandes,
  clientes,
  columnConfigs,
  recebimentos,
  statusMap,
  saving,
  getCategoriaOfRow,
  isApplicable,
  handleToggle,
  handleSaveStatus,
  setDetailModal,
}) => {
  const row = estandes.find((e) => e.id === detailModal.rowId);
  if (!row) return null;

  const cliente = clientes.find((c) => c.id === row.cliente_id);
  const nomeCliente = cliente
    ? cliente.nome_fantasia || (cliente.tipo_pessoa === "PJ" ? cliente.razao_social : cliente.nome_completo)
    : row.cliente_nome_livre || row.stand_nr;

  const applicable = columnConfigs.filter((cfg) => isApplicable(row, cfg));
  const rowRec = recebimentos[row.id] || {};
  const currentStatus: StandStatus = (statusMap[row.id]?.status as StandStatus) || "pendente";

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
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
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
                      title={recebido ? "Marcar como nao recebido" : "Marcar como recebido"}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSaving ? "opacity-50 cursor-wait"
                        : recebido ? "bg-green-500 border-green-500 text-white"
                        : "bg-white border-slate-300 hover:border-green-400"
                      }`}
                    >
                      {recebido && <span className="text-[10px] font-black leading-none">&#x2713;</span>}
                    </button>
                    <span>{cfg.tipo === "logo" ? "\u{1f3f7}\ufe0f" : "\u{1f4d0}"}</span>
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

          <div className="mt-4">
            <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">
              Observacao (opcional)
            </label>
            <textarea
              rows={3}
              className="w-full border border-slate-300 text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none"
              placeholder="Ex: Cliente enviou so a logo, falta a testeira"
              value={detailModal.obs}
              onChange={(e) => setDetailModal({ ...detailModal, obs: e.target.value })}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-slate-200 px-5 py-4 bg-slate-50">
          <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-3">Atualizar status</p>
          <div className="flex gap-2">
            {(["pendente", "solicitado", "completo"] as StandStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => handleSaveStatus(detailModal.rowId, s, detailModal.obs)}
                className={`flex-1 text-xs font-bold px-3 py-2 border transition-colors capitalize ${
                  currentStatus === s
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
};

export default ControleDetailModal;
