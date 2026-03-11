import React from "react";
import { EventoEdicao } from "../../services/eventosService";
import { PlanilhaEstande } from "../../services/planilhaVendasService";
import { FilterStatus } from "../../hooks/useControleFilters";

interface ControleTopBarProps {
  edicoes: (EventoEdicao & { eventos: { nome: string } | null })[];
  selectedEdicaoId: string;
  setSelectedEdicaoId: (id: string) => void;
  filterStatus: FilterStatus;
  setFilterStatus: (s: FilterStatus) => void;
  counts: { pendente: number; parcial: number; completo: number; total: number };
  activeEstandes: PlanilhaEstande[];
}

const ControleTopBar: React.FC<ControleTopBarProps> = ({
  edicoes,
  selectedEdicaoId,
  setSelectedEdicaoId,
  filterStatus,
  setFilterStatus,
  counts,
  activeEstandes,
}) => {
  return (
    <div className="flex flex-wrap gap-2 items-center mb-3">
      <select
        value={selectedEdicaoId}
        onChange={(e) => setSelectedEdicaoId(e.target.value)}
        className="border border-slate-300 text-sm px-2 py-1.5 bg-white rounded font-medium text-slate-700 max-w-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
      >
        <option value="">Selecione uma edicao...</option>
        {edicoes.map((e) => (
          <option key={e.id} value={e.id}>
            {(e.eventos as any)?.nome} — {e.titulo}
          </option>
        ))}
      </select>

      <div className="flex gap-1">
        {(
          [
            { key: "todos", label: "Todos" },
            { key: "pendente", label: "Pendente" },
            { key: "parcial", label: "Parcial" },
            { key: "completo", label: "Completo" },
          ] as { key: FilterStatus; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`text-[10px] font-bold uppercase px-2 py-1 border rounded-sm transition-colors ${
              filterStatus === key
                ? key === "todos"
                  ? "bg-slate-800 text-white border-slate-800"
                  : key === "pendente"
                    ? "bg-red-600 text-white border-red-600"
                    : key === "parcial"
                      ? "bg-yellow-500 text-white border-yellow-500"
                      : "bg-green-600 text-white border-green-600"
                : "bg-white text-slate-500 border-slate-300 hover:bg-slate-50"
            }`}
          >
            {label}
            {key !== "todos" && (
              <span className="ml-1 opacity-75">
                ({counts[key as keyof typeof counts]})
              </span>
            )}
          </button>
        ))}
      </div>

      {activeEstandes.length > 0 && (
        <div className="ml-auto flex gap-2 text-[11px] flex-wrap">
          <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 font-bold">
            {counts.pendente} pendente{counts.pendente !== 1 ? "s" : ""}
          </span>
          <span className="bg-yellow-100 text-yellow-700 border border-yellow-200 px-2 py-0.5 font-bold">
            {counts.parcial} parcial{counts.parcial !== 1 ? "is" : ""}
          </span>
          <span className="bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 font-bold">
            {counts.completo} completo{counts.completo !== 1 ? "s" : ""}
          </span>
          <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 font-bold">
            {counts.total} total
          </span>
        </div>
      )}
    </div>
  );
};

export default ControleTopBar;
