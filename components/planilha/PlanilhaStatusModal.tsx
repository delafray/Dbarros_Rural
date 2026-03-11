import React from 'react';
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PlanilhaEstande } from '../../services/planilhaVendasService';
import { ImagemConfig, StandImagemStatus, StandStatus } from '../../services/imagensService';
import { ClienteComContatos } from '../../services/clientesService';

interface Props {
  statusModal: { rowId: string; obs: string };
  row: PlanilhaEstande;
  imagens: ImagemConfig[];
  statusMap: Record<string, StandImagemStatus>;
  clientes: ClienteComContatos[];
  modalRecebimentos: Record<string, boolean>;
  modalRecebLoading: boolean;
  onClose: () => void;
  onObsChange: (obs: string) => void;
  onToggleRecebimento: (configId: string) => void;
  onSave: (status: StandStatus) => void;
}

const PlanilhaStatusModal: React.FC<Props> = ({
  statusModal,
  row,
  imagens,
  statusMap,
  clientes,
  modalRecebimentos,
  modalRecebLoading,
  onClose,
  onObsChange,
  onToggleRecebimento,
  onSave,
}) => {
  const currentStatus = statusMap[row.id]?.status || "pendente";
  const cliente = clientes.find((c) => c.id === row.cliente_id);
  const nomeCliente = cliente
    ? cliente.nome_fantasia ||
      (cliente.tipo_pessoa === "PJ" ? cliente.razao_social : cliente.nome_completo)
    : row.cliente_nome_livre || row.stand_nr;

  const st = statusMap[row.id];
  const fmtDate = (d: string | null | undefined) =>
    d ? format(parseISO(d), "dd/MM/yy HH:mm", { locale: ptBR }) : null;

  const items = [
    { key: "pendente" as StandStatus, label: "Pendente", date: fmtDate(st?.pendente_em), active: currentStatus === "pendente", activeClass: "bg-yellow-100 border-yellow-400 text-yellow-800", hoverClass: "hover:bg-yellow-50 hover:border-yellow-300" },
    { key: "solicitado" as StandStatus, label: "Solicitado", date: fmtDate(st?.solicitado_em), active: currentStatus === "solicitado", activeClass: "bg-blue-100 border-blue-400 text-blue-800", hoverClass: "hover:bg-blue-50 hover:border-blue-300" },
    { key: "completo" as StandStatus, label: "Completo", date: fmtDate(st?.completo_em), active: currentStatus === "completo", activeClass: "bg-green-100 border-green-400 text-green-800", hoverClass: "hover:bg-green-50 hover:border-green-300" },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
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
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none ml-4">
            ×
          </button>
        </div>

        {/* Lista de imagens exigidas */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-3">
            Imagens exigidas ({imagens.length})
          </p>
          {imagens.length === 0 ? (
            <p className="text-slate-400 italic text-sm">Nenhuma imagem configurada para este stand.</p>
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
                      onClick={() => onToggleRecebimento(cfg.id)}
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
              Observação (opcional)
            </label>
            <textarea
              rows={2}
              className="w-full border border-slate-300 text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none"
              placeholder="Ex: Cliente enviou só a logo, falta a testeira"
              value={statusModal.obs}
              onChange={(e) => onObsChange(e.target.value)}
            />
          </div>
        </div>

        {/* Botões de status */}
        <div className="flex-shrink-0 border-t border-slate-200 px-5 py-4 bg-slate-50">
          <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-3">Atualizar status</p>
          <div className="flex gap-2">
            {items.map(({ key, label, date, active, activeClass, hoverClass }) => (
              <div key={key} className="flex-1 flex flex-col items-center gap-0.5">
                <button
                  onClick={() => onSave(key)}
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
          <div className="mt-3 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 text-sm text-slate-500 py-1.5 hover:bg-slate-100 transition-colors border border-transparent"
            >
              Cancelar
            </button>
            <button
              onClick={() => onSave(currentStatus as StandStatus)}
              className="flex-1 text-sm font-bold text-white bg-slate-700 hover:bg-slate-900 py-1.5 transition-colors"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanilhaStatusModal;
