import React from 'react';
import { ClienteSelectorWidget, ClienteComContato } from './ClienteSelectorWidget';

interface Props {
    onSelect: (clienteId: string | null, nomeLivre: string | null) => void;
    onClose: () => void;
    currentClienteId?: string | null;
    currentNomeLivre?: string | null;
}

const ClienteSelectorPopup: React.FC<Props> = ({
    onSelect, onClose, currentClienteId, currentNomeLivre
}) => {
    
    // O Widget exporta o cliente completo. O popup legado espera apenas o ID.
    const handleWidgetSelect = (cliente: ClienteComContato | null, nomeLivre: string | null) => {
        onSelect(cliente?.id || null, nomeLivre);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white shadow-2xl w-full max-w-6xl rounded-lg flex flex-col max-h-[90vh] overflow-hidden">
                {/* -- Header Wrapper -- */}
                <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between shrink-0">
                    <div>
                        <span className="font-bold text-sm">Selecionar Cliente para o Stand</span>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
                </div>

                <div className="flex-1 overflow-hidden">
                    <ClienteSelectorWidget 
                        onSelect={handleWidgetSelect}
                        currentClienteId={currentClienteId}
                        currentNomeLivre={currentNomeLivre}
                    />
                </div>
            </div>
        </div>
    );
};

export default ClienteSelectorPopup;
