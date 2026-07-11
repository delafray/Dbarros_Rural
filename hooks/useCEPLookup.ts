import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { maskCEP, onlyDigits } from '../utils/masks';
import type { Endereco } from '../components/cadastroCliente/types';

/**
 * Encapsula a consulta de CEP no ViaCEP, com estados de loading e erro por endereço.
 * Extraído verbatim de CadastroCliente.tsx (handleCepBlur / handleCepChange).
 */
export function useCEPLookup(params: {
    updateEndereco: (id: string, field: keyof Endereco, value: string) => void;
    setEnderecos: Dispatch<SetStateAction<Endereco[]>>;
}) {
    const { updateEndereco, setEnderecos } = params;

    // Estado de loading por CEP (id do endereço)
    const [cepLoading, setCepLoading] = useState<Record<string, boolean>>({});
    const [cepErros, setCepErros] = useState<Record<string, string>>({});

    const handleCepBlur = (endId: string, rawValue: string) => {
        const digits = onlyDigits(rawValue);
        if (digits.length > 0 && digits.length < 8) {
            setCepErros(prev => ({ ...prev, [endId]: 'CEP incompleto' }));
        } else {
            setCepErros(prev => ({ ...prev, [endId]: '' }));
        }
    };

    const handleCepChange = async (endId: string, rawValue: string) => {
        const masked = maskCEP(rawValue);
        updateEndereco(endId, 'cep', masked);
        // Limpa erro ao começar a corrigir
        if (onlyDigits(rawValue).length === 8) setCepErros(prev => ({ ...prev, [endId]: '' }));

        const digits = onlyDigits(rawValue);
        if (digits.length !== 8) return;

        setCepLoading(prev => ({ ...prev, [endId]: true }));
        try {
            const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
            const data = await res.json();
            if (data.erro) {
                updateEndereco(endId, 'logradouro', '');
                updateEndereco(endId, 'bairro', '');
                updateEndereco(endId, 'cidade', '');
                updateEndereco(endId, 'estado', '');
            } else {
                setEnderecos(prev => prev.map(e =>
                    e.id === endId
                        ? { ...e, logradouro: data.logradouro || '', bairro: data.bairro || '', cidade: data.localidade || '', estado: data.uf || '' }
                        : e
                ));
            }
        } catch {
            // silencia erro de rede
        } finally {
            setCepLoading(prev => ({ ...prev, [endId]: false }));
        }
    };

    return { cepLoading, cepErros, handleCepBlur, handleCepChange };
}
