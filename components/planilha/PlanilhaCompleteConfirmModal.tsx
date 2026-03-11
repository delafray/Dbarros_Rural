import React from 'react';
import { StandStatus } from '../../services/imagensService';

interface Props {
  imgTotal: number;
  imgRecebidas: number;
  onCancel: () => void;
  onConfirm: (status: StandStatus, force: boolean) => void;
}

const PlanilhaCompleteConfirmModal: React.FC<Props> = ({ imgTotal, imgRecebidas, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 bg-amber-50 border-b border-amber-200">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div>
          <h2 className="font-black text-slate-800 text-sm">Arquivos de imagem pendentes</h2>
          <p className="text-xs text-amber-700 font-medium mt-0.5">
            {imgRecebidas} de {imgTotal} arquivos recebidos
          </p>
        </div>
      </div>

      <div className="px-6 py-5 space-y-3">
        <p className="text-sm text-slate-700 leading-relaxed">
          Você está marcando este stand como <strong>Completo</strong>, mas ainda há{' '}
          <strong className="text-amber-600">
            {imgTotal - imgRecebidas} arquivo{imgTotal - imgRecebidas > 1 ? 's' : ''} sem confirmação de recebimento.
          </strong>
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <p className="text-xs text-blue-800 font-semibold leading-relaxed">
            💡 Ao confirmar, <strong>todos os arquivos serão automaticamente marcados como recebidos</strong> — tanto na planilha quanto no Controle de Imagens.
          </p>
        </div>
        <p className="text-xs text-slate-500">
          Deseja continuar e confirmar que os arquivos estão com você?
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancelar — vou revisar
        </button>
        <button
          onClick={() => onConfirm('completo', true)}
          className="px-4 py-2 text-xs font-black text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
        >
          Confirmar — arquivos estão comigo
        </button>
      </div>
    </div>
  </div>
);

export default PlanilhaCompleteConfirmModal;
