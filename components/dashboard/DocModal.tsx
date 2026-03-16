import React from 'react';
import { useAppDialog } from '../../context/DialogContext';

export type DocModalState = {
    tipo: 'proposta_comercial' | 'planta_baixa' | 'relatorio_pdf';
    url: string;
    edicaoTitulo: string;
    isPdfBlob?: boolean;
} | null;

interface DocModalProps {
    docModal: NonNullable<DocModalState>;
    onClose: () => void;
}

export const DocModal: React.FC<DocModalProps> = ({ docModal, onClose }) => {
    const appDialog = useAppDialog();
    const label = docModal.tipo === 'proposta_comercial' ? 'Proposta Comercial'
        : docModal.tipo === 'planta_baixa' ? 'Planta Baixa'
        : 'Relatório PDF';
    const url = docModal.url;
    const nomeEdicao = docModal.edicaoTitulo.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
    const prefix = docModal.tipo === 'proposta_comercial' ? 'PROPOSTA_COMERCIAL'
        : docModal.tipo === 'planta_baixa' ? 'PLANTA_BAIXA'
        : 'RELATORIO_PDF';
    // Extracted extension logic
    let tempExt = 'pdf';
    if (!docModal.isPdfBlob && url) {
        // Tenta pegar a extensão correta da URL (ex: .png, .jpg, .pdf)
        const pathSegments = url.split('?')[0].split('/');
        const lastSegment = pathSegments[pathSegments.length - 1];
        if (lastSegment && lastSegment.includes('.')) {
            const extPart = lastSegment.split('.').pop();
            // Apenas aceita se for uma string curta (3 ou 4 letras no final)
            if (extPart && extPart.length <= 4 && /^[a-zA-Z0-9]+$/.test(extPart)) {
                tempExt = extPart.toLowerCase();
            }
        }
    }
    const ext = tempExt;

    // Default fileName que será ajustado caso do download descubra outra extensão via type
    const baseFileName = `${prefix}_${nomeEdicao}`;
    let fileName = `${baseFileName}.${ext}`;

    const handleDownload = async () => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            
            // Adjust extension based on actual mimetype if we defaulted to pdf incorrectly
            if (blob.type && !docModal.isPdfBlob) {
                const mimeExt = blob.type.split('/')[1]?.split('+')[0]; // image/jpeg -> jpeg, application/pdf -> pdf
                if (mimeExt && mimeExt !== ext && mimeExt !== 'octet-stream') {
                   // map common mime parts to proper extension
                   const mapExe: Record<string, string> = {
                      'jpeg': 'jpg', 'svg+xml': 'svg', 'plain': 'txt'
                   };
                   const finalExt = mapExe[mimeExt] || mimeExt;
                   fileName = `${baseFileName}.${finalExt}`;
                }
            }

            const objectUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(objectUrl);
        } catch {
            void appDialog.alert({ title: 'Erro', message: 'Não foi possível baixar o arquivo.', type: 'danger' });
        }
    };

    const handleShare = async () => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            
            // Adjust extension based on actual mimetype
            if (blob.type && !docModal.isPdfBlob) {
                const mimeExt = blob.type.split('/')[1]?.split('+')[0];
                if (mimeExt && mimeExt !== ext && mimeExt !== 'octet-stream') {
                   const mapExe: Record<string, string> = {
                      'jpeg': 'jpg', 'svg+xml': 'svg', 'plain': 'txt'
                   };
                   const finalExt = mapExe[mimeExt] || mimeExt;
                   fileName = `${baseFileName}.${finalExt}`;
                }
            }

            const file = new File([blob], fileName, { type: blob.type });
            if (typeof navigator.share !== 'function') {
                void appDialog.alert({ title: 'Aviso', message: 'Seu navegador não suporta compartilhamento. Use o botão Baixar.', type: 'warning' });
                return;
            }
            try {
                await navigator.share({ files: [file], title: fileName });
            } catch (shareErr: unknown) {
                if (shareErr instanceof Error && shareErr.name === 'AbortError') return;
                try {
                    await navigator.share({ title: fileName, url });
                } catch {
                    void appDialog.alert({ title: 'Erro', message: 'Não foi possível compartilhar. Use o botão Baixar.', type: 'danger' });
                }
            }
        } catch {
            void appDialog.alert({ title: 'Erro', message: 'Não foi possível preparar o arquivo para compartilhar.', type: 'danger' });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-[320px] p-6 flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
                <div className="w-16 h-16 rounded-full bg-green-50 border-4 border-green-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <div className="text-center">
                    <p className="text-[11px] text-slate-500 font-medium">O que deseja fazer com a</p>
                    <p className="text-[13px] font-black text-slate-800 uppercase tracking-wide">{label}?</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[250px]">{docModal.edicaoTitulo}</p>
                </div>
                <div className="w-full flex flex-col gap-2">
                    <button
                        onClick={() => window.open(url, '_blank')}
                        className="w-full py-3 rounded-xl bg-blue-600 text-white font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        Visualizar
                    </button>
                    <button
                        onClick={handleDownload}
                        className="w-full py-3 rounded-xl bg-slate-800 text-white font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Baixar
                    </button>
                    <button
                        onClick={handleShare}
                        className="w-full py-3 rounded-xl bg-green-600 text-white font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                        Compartilhar
                    </button>
                </div>
                <button onClick={onClose} className="text-[11px] text-slate-400 hover:text-slate-600 font-medium transition-colors">
                    Fechar
                </button>
            </div>
        </div>
    );
};
