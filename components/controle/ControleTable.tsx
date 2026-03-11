import React from "react";
import { useNavigate } from "react-router-dom";
import { PlanilhaEstande, CategoriaSetup } from "../../services/planilhaVendasService";
import { ImagemConfig, RecebimentosMap, StandImagemStatus } from "../../services/imagensService";
import { ClienteComContatos } from "../../services/clientesService";
import { Atendimento } from "../../services/atendimentosService";
import { RowStatus } from "../../hooks/useControleFilters";

const thStyle =
  "border border-slate-400/40 px-1 py-1 text-[11px] font-bold uppercase whitespace-nowrap text-white text-center bg-[#1F497D]";
const tdStyle =
  "border border-slate-200 text-[12px] px-1.5 py-0.5 whitespace-nowrap";

interface ControleTableProps {
  filteredEstandes: PlanilhaEstande[];
  columnConfigs: ImagemConfig[];
  clientes: ClienteComContatos[];
  recebimentos: RecebimentosMap;
  statusMap: Record<string, StandImagemStatus>;
  phoneMap: Record<string, string>;
  atendimentoMap: Record<string, Atendimento>;
  saving: string | null;
  getCategoriaOfRow: (row: PlanilhaEstande) => CategoriaSetup | undefined;
  isApplicable: (row: PlanilhaEstande, cfg: ImagemConfig) => boolean;
  getRowStatus: (row: PlanilhaEstande) => RowStatus;
  handleToggle: (estandeId: string, imagemConfigId: string, currentValue: boolean) => void;
  setDetailModal: (v: { rowId: string; obs: string } | null) => void;
  setAtendimentoModal: (a: Atendimento | null) => void;
}

const ControleTable: React.FC<ControleTableProps> = ({
  filteredEstandes,
  columnConfigs,
  clientes,
  recebimentos,
  statusMap,
  phoneMap,
  atendimentoMap,
  saving,
  getCategoriaOfRow,
  isApplicable,
  getRowStatus,
  handleToggle,
  setDetailModal,
  setAtendimentoModal,
}) => {
  const navigate = useNavigate();

  return (
    <table
      className="border-collapse text-[11px] font-sans w-full"
      style={{ minWidth: "max-content" }}
    >
      <thead className="sticky top-0 z-10 shadow-sm">
        {/* Linha de legenda */}
        <tr className="bg-slate-900 text-white">
          <th colSpan={2} className="border border-white/10 px-2 py-1 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase">
            Stand / Cliente
          </th>
          <th className="border border-white/10 px-1 py-0.5 text-center text-[10px] text-slate-400 font-bold whitespace-nowrap w-px">
            Tel.
          </th>
          {columnConfigs.map((cfg) => {
            const hasSubLabel = cfg.dimensoes || cfg.tipo === "logo";
            return (
              <th
                key={cfg.id}
                className="border border-white/10 px-1 py-0.5 text-center"
                style={{ width: hasSubLabel ? "40px" : "30px", minWidth: hasSubLabel ? "40px" : "30px" }}
                title={cfg.descricao + (cfg.dimensoes ? ` — ${cfg.dimensoes}` : "")}
              >
                <span className={`inline-block text-[8px] font-bold uppercase px-1 py-0 rounded-sm ${
                  cfg.origem_tipo === "stand_categoria" ? "bg-violet-600/60 text-violet-200" : "bg-blue-600/60 text-blue-200"
                }`}>
                  {cfg.origem_tipo === "stand_categoria" ? cfg.origem_ref : "OPC"}
                </span>
              </th>
            );
          })}
          <th colSpan={2} className="border border-white/10 px-2 py-0.5 text-center text-[10px] text-slate-400 font-bold">
            Status / Obs
          </th>
        </tr>

        {/* Headers */}
        <tr className="bg-[#1F497D]">
          <th className={`${thStyle} w-[90px] min-w-[90px]`}>Stand</th>
          <th className={`${thStyle} whitespace-nowrap text-left px-2`}>Cliente</th>
          <th className={`${thStyle} whitespace-nowrap w-px px-1`}>Tel.</th>
          {columnConfigs.map((cfg) => {
            const subLabel = cfg.dimensoes ? cfg.dimensoes : cfg.tipo === "logo" ? "logo" : null;
            return (
              <th
                key={cfg.id}
                className={`${thStyle} align-bottom p-0`}
                style={{ width: subLabel ? "40px" : "30px", minWidth: subLabel ? "40px" : "30px" }}
                title={cfg.descricao + (cfg.dimensoes ? ` (${cfg.dimensoes})` : "")}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "flex-end",
                    justifyContent: "center",
                    height: "110px",
                    paddingBottom: "6px",
                    gap: "3px",
                  }}
                >
                  <div
                    style={{
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                      whiteSpace: "nowrap",
                      fontSize: cfg.descricao.length > 14 ? "7px" : "8px",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      color: "white",
                      lineHeight: 1,
                    }}
                  >
                    {cfg.descricao}
                  </div>
                  {subLabel && (
                    <div
                      style={{
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                        whiteSpace: "nowrap",
                        fontSize: cfg.dimensoes ? "10px" : "8px",
                        fontWeight: cfg.dimensoes ? "600" : "normal",
                        color: cfg.tipo === "logo" ? "#c4b5fd" : "#94a3b8",
                        lineHeight: 1,
                        letterSpacing: "0.3px",
                      }}
                    >
                      {subLabel}
                    </div>
                  )}
                </div>
              </th>
            );
          })}
          <th className={`${thStyle} w-20`}>Status</th>
          <th className={`${thStyle} min-w-[140px] text-left px-2`}>Observacoes</th>
        </tr>
      </thead>

      <tbody>
        {filteredEstandes.map((row, i) => {
          const cat = getCategoriaOfRow(row);
          const rowRec = recebimentos[row.id] || {};
          const status = getRowStatus(row);
          const applicable = columnConfigs.filter((cfg) => isApplicable(row, cfg));
          const receivedCount = applicable.filter((cfg) => rowRec[cfg.id]).length;
          const obs = statusMap[row.id]?.observacoes || "";

          const cliente = clientes.find((c) => c.id === row.cliente_id);
          const nomeCliente = cliente
            ? cliente.nome_fantasia || (cliente.tipo_pessoa === "PJ" ? cliente.razao_social || "" : cliente.nome_completo || "")
            : row.cliente_nome_livre || "";

          const rowBg =
            status === "completo" ? "bg-green-50/50"
            : status === "parcial" ? "bg-yellow-50/40"
            : i % 2 === 0 ? "bg-white" : "bg-slate-50/60";

          return (
            <tr key={row.id} className={`${rowBg} border-b border-slate-200 hover:bg-blue-50/40 transition-colors`}>
              {/* Stand nr */}
              <td className={`${tdStyle} px-1 py-0 align-middle w-[90px] min-w-[90px] max-w-[90px]`}>
                <div className="flex items-center gap-1 leading-none">
                  {cat?.tag && (
                    <span className="text-[7px] text-slate-500/80 font-normal uppercase tracking-tighter text-left pointer-events-none shrink-0" style={{ lineHeight: 1 }}>
                      {cat.tag}
                    </span>
                  )}
                  <span className="flex-1 text-center font-bold text-[11px] whitespace-nowrap">
                    {cat?.prefix?.trim()
                      ? row.stand_nr
                      : row.stand_nr.replace(new RegExp(`^${cat?.tag ?? ""}\\s*`, "i"), "").trim()}
                  </span>
                </div>
              </td>

              {/* Cliente */}
              <td className={`${tdStyle} whitespace-nowrap`}>
                {cliente ? (
                  <span
                    className="font-semibold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => navigate(`/clientes/editar/${cliente.id}`)}
                    title="Abrir cadastro do cliente"
                  >
                    {nomeCliente}
                  </span>
                ) : (
                  <span className="font-semibold text-slate-800">{nomeCliente}</span>
                )}
              </td>

              {/* Telefone */}
              <td className={`${tdStyle} w-px px-1`}>
                {row.cliente_id && phoneMap[row.cliente_id] ? (
                  atendimentoMap[row.cliente_id] ? (
                    <button
                      onClick={() => setAtendimentoModal(atendimentoMap[row.cliente_id])}
                      className="text-blue-600 hover:text-blue-800 font-mono text-[11px] hover:underline transition-colors text-left"
                      title="Ver historico de atendimento"
                    >
                      {phoneMap[row.cliente_id]}
                    </button>
                  ) : (
                    <span className="text-slate-500 font-mono text-[11px]">{phoneMap[row.cliente_id]}</span>
                  )
                ) : (
                  <span className="text-slate-300 text-[11px]">—</span>
                )}
              </td>

              {/* Image columns */}
              {columnConfigs.map((cfg) => {
                const app = isApplicable(row, cfg);
                const cellKey = `${row.id}-${cfg.id}`;
                const isSaving = saving === cellKey;

                if (!app) {
                  return (
                    <td key={cfg.id} className={`${tdStyle} text-center text-slate-200 w-8`}>
                      <span className="text-[11px]">—</span>
                    </td>
                  );
                }

                const received = rowRec[cfg.id] ?? false;

                return (
                  <td
                    key={cfg.id}
                    className={`${tdStyle} text-center w-8 cursor-pointer select-none transition-colors ${
                      isSaving ? "opacity-50" : received ? "bg-green-50/60 hover:bg-green-100/60" : "hover:bg-red-50/60"
                    }`}
                    onClick={() => !isSaving && handleToggle(row.id, cfg.id, received)}
                    title={
                      isSaving ? "Salvando..."
                      : received ? `${cfg.descricao}: recebido — clique para desmarcar`
                      : `${cfg.descricao}: pendente — clique para marcar como recebido`
                    }
                  >
                    {isSaving ? (
                      <span className="text-slate-400 text-[10px]">···</span>
                    ) : received ? (
                      <span className="text-green-600 font-black text-[16px] leading-none">&#x2713;</span>
                    ) : (
                      <span
                        className="inline-block w-3.5 h-3.5 rounded-full border-2 border-red-500 bg-red-100"
                        style={{ boxShadow: "0 0 0 1px #ef4444" }}
                      />
                    )}
                  </td>
                );
              })}

              {/* Status badge */}
              <td className={`${tdStyle} text-center w-20`}>
                {status === "sem_config" ? (
                  <span className="text-slate-300 text-[9px]">—</span>
                ) : (
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.5 border inline-block ${
                      status === "completo" ? "bg-green-100 text-green-700 border-green-300"
                      : status === "parcial" ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                      : "bg-red-100 text-red-600 border-red-200"
                    }`}
                    title={`${receivedCount} de ${applicable.length} recebidas`}
                  >
                    {receivedCount}/{applicable.length}
                  </span>
                )}
              </td>

              {/* Observacoes */}
              <td className={`${tdStyle} min-w-[140px] max-w-[220px]`}>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-[10px] italic truncate flex-1" title={obs}>{obs}</span>
                  <button
                    onClick={() => setDetailModal({ rowId: row.id, obs })}
                    title="Abrir detalhes"
                    className="flex-shrink-0 text-slate-300 hover:text-violet-500 text-[13px] leading-none transition-colors px-0.5"
                  >
                    &#x229e;
                  </button>
                </div>
              </td>
            </tr>
          );
        })}

        {filteredEstandes.length === 0 && (
          <tr>
            <td colSpan={2 + columnConfigs.length + 3} className="py-8 text-center text-slate-400">
              Nenhum resultado para a busca ou filtro selecionado.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

export default ControleTable;
