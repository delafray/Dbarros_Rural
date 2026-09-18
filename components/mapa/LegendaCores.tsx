import React from "react";
import { ORDEM_STATUS, ESTILO_STATUS } from "../../utils/mapaCalc";

/** Legenda de cores do mapa. Sempre visível, acima do painel do estande (pedido do usuário 18/09). */
const LegendaCores: React.FC = () => (
  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 text-xs">
    <div className="font-bold text-slate-400 uppercase text-[10px] mb-1.5 tracking-wide">Legenda</div>
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {ORDEM_STATUS.map((s) => (
        <div key={s} className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm border flex-shrink-0"
            style={{
              background: ESTILO_STATUS[s].piscaAte
                ? `linear-gradient(135deg, ${ESTILO_STATUS[s].fill} 45%, ${ESTILO_STATUS[s].piscaAte} 55%)`
                : ESTILO_STATUS[s].fill,
              borderColor: ESTILO_STATUS[s].stroke,
            }}
          />
          <span className="text-slate-600">{ESTILO_STATUS[s].label}</span>
        </div>
      ))}
    </div>
  </div>
);

export default LegendaCores;
