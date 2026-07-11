import React from 'react';
import { Button, Modal } from '../UI';

interface CollisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingOrder: number | undefined;
  saving: boolean;
  onReadequar: () => void;
  onContinuar: () => void;
}

const CollisionModal: React.FC<CollisionModalProps> = ({
  isOpen,
  onClose,
  pendingOrder,
  saving,
  onReadequar,
  onContinuar,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    maxWidth="max-w-md"
    title={
      <div className="flex items-center gap-2 text-red-600 font-bold uppercase tracking-tight text-base">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        <span>Conflito de Ordem</span>
      </div>
    }
  >
    <div className="space-y-4 py-1">
      <div className="bg-red-50 p-3 rounded-xl border border-red-100">
        <p className="text-slate-700 font-medium text-center text-sm">
          A posição <span className="font-bold text-red-600">#{pendingOrder}</span> já está ocupada.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <Button
          onClick={onReadequar}
          className="py-3 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider flex flex-col items-center justify-center h-auto text-[11px] shadow-sm active:scale-95 transition-all"
          disabled={saving}
        >
          <span>Readequar</span>
          <span className="text-[9px] opacity-70 lowercase italic font-normal">Empurrar outras tags para frente</span>
        </Button>

        <Button
          onClick={onContinuar}
          className="py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold uppercase tracking-wider flex flex-col items-center justify-center h-auto text-[11px] active:scale-95 transition-all"
          disabled={saving}
        >
          <span>Continuar</span>
          <span className="text-[9px] opacity-70 lowercase italic font-normal">Manter ambas na posição {pendingOrder}</span>
        </Button>

        <Button
          variant="outline"
          onClick={onClose}
          className="py-2.5 border border-slate-200 text-slate-500 font-bold uppercase tracking-wider h-auto text-[10px] active:scale-95 transition-all"
          disabled={saving}
        >
          Cancelar
        </Button>
      </div>
    </div>
  </Modal>
);

export default CollisionModal;
