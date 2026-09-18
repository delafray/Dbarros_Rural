import React from "react";
import { ORDEM_STATUS, ESTILO_STATUS, ResumoFamilia } from "../../utils/mapaCalc";

interface ResumoFamiliasProps {
  resumoFamilias: ResumoFamilia[];
  resumoTotal: ResumoFamilia;
  foraDoMapa: string[];
  familiaSelecionada: string | null;
  onSelecionarFamilia: (familia: string | null) => void;
  /** Tabela do resumo por família aberta? (a legenda de cores fica sempre visível) */
  resumoAberto: boolean;
  onAlternarResumo: () => void;
}

/** Resumo por família (clicável para filtrar o mapa), recolhível. Fica embaixo do painel do estande. Só visual. */
const ResumoFamilias: React.FC<ResumoFamiliasProps> = ({
  resumoFamilias,
  resumoTotal,
  foraDoMapa,
  familiaSelecionada,
  onSelecionarFamilia,
  resumoAberto,
  onAlternarResumo,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 space-y-3 text-xs">
      {/* Resumo por família (recolhível; fechado por padrão — pedido do usuário 18/09) */}
      <div>
        <button
          type="button"
          onClick={onAlternarResumo}
          aria-expanded={resumoAberto}
          className="w-full flex items-center justify-between font-bold text-slate-400 uppercase text-[10px] tracking-wide hover:text-slate-600"
          title={resumoAberto ? "Recolher resumo por família" : "Mostrar resumo por família"}
        >
          <span>{resumoAberto ? "▾" : "▸"} Resumo por família</span>
          <span className="font-normal normal-case tracking-normal">
            {resumoTotal.total} estandes
            {!resumoAberto && familiaSelecionada && ` · filtro: ${familiaSelecionada}`}
          </span>
        </button>
        {resumoAberto && (
        <div className="overflow-x-auto mt-1.5">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="text-slate-400 uppercase text-[9px]">
                <th className="text-left font-normal py-0.5 pr-2">Família</th>
                <th className="text-right font-normal px-1">Tot</th>
                {ORDEM_STATUS.map((s) => (
                  <th key={s} className="text-right font-normal px-1" title={ESTILO_STATUS[s].label}>
                    {ESTILO_STATUS[s].label.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resumoFamilias.map((f) => (
                <tr
                  key={f.familia}
                  className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50 ${
                    familiaSelecionada === f.familia ? "bg-blue-50" : ""
                  }`}
                  onClick={() => onSelecionarFamilia(familiaSelecionada === f.familia ? null : f.familia)}
                  title="Clique para filtrar o mapa por esta família"
                >
                  <td className="py-0.5 pr-2 font-bold text-slate-700">{f.familia}</td>
                  <td className="text-right px-1 font-mono text-slate-600">{f.total}</td>
                  {ORDEM_STATUS.map((s) => (
                    <td key={s} className="text-right px-1 font-mono text-slate-600">
                      {f.porStatus[s] || ""}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-slate-300 font-bold text-slate-900">
                <td className="py-1 pr-2">TOTAL</td>
                <td className="text-right px-1 font-mono">{resumoTotal.total}</td>
                {ORDEM_STATUS.map((s) => (
                  <td key={s} className="text-right px-1 font-mono">
                    {resumoTotal.porStatus[s] || ""}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        )}
        {familiaSelecionada && (
          <button
            className="mt-1.5 text-blue-600 hover:underline text-[10px]"
            onClick={() => onSelecionarFamilia(null)}
            type="button"
          >
            Limpar filtro de família
          </button>
        )}
      </div>

      {foraDoMapa.length > 0 && (
        <div className="text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 text-[10px] leading-snug">
          {foraDoMapa.length} estande{foraDoMapa.length > 1 ? "s" : ""} da planilha não{" "}
          {foraDoMapa.length > 1 ? "estão" : "está"} na planta: {foraDoMapa.join(", ")}
        </div>
      )}
    </div>
  );
};

export default ResumoFamilias;
