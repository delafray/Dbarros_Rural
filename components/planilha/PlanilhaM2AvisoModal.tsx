import React from 'react';

interface Props {
  onClose: () => void;
}

const PlanilhaM2AvisoModal: React.FC<Props> = ({ onClose }) => (
  <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-5 bg-red-50 border-b-2 border-red-300">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-2xl">
          ⚠️
        </div>
        <div>
          <h2 className="font-black text-red-900 text-base uppercase tracking-wide">ATENÇÃO — Metragem Alterada</h2>
          <p className="text-sm text-red-700 font-medium mt-0.5">Esta alteração requer comunicação imediata</p>
        </div>
      </div>
      <div className="px-6 py-6">
        <p className="text-sm text-slate-700 leading-relaxed font-medium">
          A metragem deste stand foi alterada.
        </p>
        <p className="text-sm text-slate-700 leading-relaxed mt-2">
          <strong>Você deve informar todas as diretorias sobre esta mudança.</strong> Os valores de preço exibidos na planilha podem estar desatualizados — acesse a Planilha AL para recalcular.
        </p>
      </div>
      <div className="flex justify-end px-6 py-4 bg-slate-50 border-t border-slate-200">
        <button
          onClick={onClose}
          className="px-6 py-2 text-sm font-black text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
        >
          Entendido — Vou informar as diretorias
        </button>
      </div>
    </div>
  </div>
);

export default PlanilhaM2AvisoModal;
