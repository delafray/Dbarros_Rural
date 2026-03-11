import React from 'react';
import { ItemOpcional } from '../../services/itensOpcionaisService';

interface Props {
  opcionaisDisponiveis: ItemOpcional[];
  opcionaisSelecionados: string[];
  opcionaisUsados: Set<string>;
  onToggle: (id: string) => void;
  onClose: () => void;
}

const ConfigOpcionaisPopup: React.FC<Props> = ({
  opcionaisDisponiveis, opcionaisSelecionados, opcionaisUsados, onToggle, onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh] overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between flex-shrink-0">
          <span className="font-bold text-sm uppercase tracking-wider">Selecionar Itens Opcionais</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {opcionaisDisponiveis.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400 italic text-sm">
              Nenhum item opcional cadastrado. Acesse "Opcionais" para criar.
            </div>
          ) : (
            opcionaisDisponiveis.map((item) => {
              const selected = opcionaisSelecionados.includes(item.id);
              const emUso = opcionaisUsados.has(item.nome);
              return (
                <label
                  key={item.id}
                  className={`flex items-center gap-3 px-5 py-3 transition-colors ${selected ? "bg-blue-50" : "hover:bg-slate-50"} ${emUso ? "cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <input type="checkbox" checked={selected} onChange={() => onToggle(item.id)} className="w-4 h-4 accent-blue-600" />
                  <div className="flex-1">
                    <span className={`font-semibold text-sm ${selected ? "text-blue-900" : "text-slate-800"}`}>{item.nome}</span>
                    {emUso && (
                      <span className="ml-2 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5">
                        🔒 em uso na planilha
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    R$ {Number(item.preco_base).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </label>
              );
            })
          )}
        </div>
        <div className="flex-shrink-0 px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">{opcionaisSelecionados.length} selecionado(s)</span>
          <button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold px-5 py-2 transition-colors">✓ Confirmar</button>
        </div>
      </div>
    </div>
  );
};

export default ConfigOpcionaisPopup;
