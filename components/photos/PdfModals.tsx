import React from 'react';
import { Modal, LoadingSpinner, Button } from '../UI';

interface PdfProgressModalProps {
  isExporting: boolean;
  exportProgress: string;
}

export const PdfProgressModal: React.FC<PdfProgressModalProps> = ({ isExporting, exportProgress }) => (
  <Modal isOpen={isExporting} onClose={() => { }} title="Exportando Relatorio" maxWidth="max-w-sm">
    <div className="flex flex-col items-center justify-center py-6 text-center space-y-6">
      <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center mb-2 animate-pulse shadow-inner border border-blue-100">
        <LoadingSpinner />
      </div>
      <div className="space-y-3 w-full px-4">
        <h3 className="text-xl font-black text-slate-800 tracking-tight">Gerando PDF</h3>
        <p className="text-sm font-bold text-blue-600 bg-blue-50 py-2 px-4 rounded-xl border border-blue-100 shadow-sm">{exportProgress || 'Iniciando o processo...'}</p>
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-6 shadow-inner relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400 background-animate w-[200%] h-full"></div>
        </div>
      </div>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-6 max-w-[250px] leading-relaxed">
        Por favor, nao feche o aplicativo. O processo pode levar alguns minutos dependendo da quantidade de fotos.
      </p>
    </div>
  </Modal>
);

interface PdfActionsModalProps {
  isOpen: boolean;
  blob: Blob | null;
  fileName: string;
  onClose: () => void;
}

export const PdfActionsModal: React.FC<PdfActionsModalProps> = ({ isOpen, blob, fileName, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="PDF Gerado com Sucesso!" maxWidth="max-w-sm">
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center shadow-inner">
        <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="text-xs font-bold text-slate-500 text-center">O que deseja fazer com o PDF?</p>

      <div className="flex flex-col gap-2 w-full mt-1">
        <button
          onClick={() => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank', 'noopener');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black uppercase tracking-widest transition-all active:scale-95 shadow-md shadow-blue-500/20"
        >
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Visualizar PDF
        </button>

        <button
          onClick={() => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 5000);
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-black uppercase tracking-widest transition-all active:scale-95 shadow-md"
        >
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Baixar PDF
        </button>

        {typeof navigator.share === 'function' && (
          <button
            onClick={async () => {
              if (!blob) return;
              const pdfFile = new File([blob], fileName, { type: 'application/pdf' });
              try {
                await navigator.share({
                  title: 'Dbarros Rural',
                  text: 'Conforme combinado, segue arquivo para referencia.',
                  files: [pdfFile]
                });
              } catch { }
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-black uppercase tracking-widest transition-all active:scale-95 shadow-md shadow-green-500/20"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Compartilhar
          </button>
        )}
      </div>

      <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 font-bold mt-1 transition-colors">
        Fechar
      </button>
    </div>
  </Modal>
);
