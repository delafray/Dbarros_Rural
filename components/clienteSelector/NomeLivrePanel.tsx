import React, { useState } from 'react';

interface NomeLivrePanelProps {
    initialValue: string;
    onConfirm: (nomeLivre: string | null) => void;
}

/**
 * Painel "Nome Livre" — permite digitar qualquer texto sem vincular ao cadastro.
 * Chama onConfirm com o texto digitado (ou null se vazio).
 */
export const NomeLivrePanel: React.FC<NomeLivrePanelProps> = ({ initialValue, onConfirm }) => {
    const [nomeLivre, setNomeLivre] = useState(initialValue);

    const handleSave = () => onConfirm(nomeLivre.trim() || null);

    return (
        <div className="flex-1 flex flex-col items-start justify-start p-6 gap-3 bg-amber-50/40">
            <p className="text-sm text-amber-800">
                Digite qualquer nome, empresa ou observação — isso ficará solto sem vínculo com o cadastro de clientes real.
            </p>
            <div className="flex gap-2 w-full max-w-lg mt-2">
                <input
                    type="text"
                    autoFocus
                    className="flex-1 border-2 border-amber-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    placeholder="Ex: A Confirmar, Prefeituras, Indecisos..."
                    value={nomeLivre}
                    onChange={e => setNomeLivre(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                />
                <button
                    onClick={handleSave}
                    className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold px-6 py-3 rounded-lg transition-colors"
                >
                    Confirmar e Associar
                </button>
            </div>
        </div>
    );
};
