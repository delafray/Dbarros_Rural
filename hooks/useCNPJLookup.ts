import { useState } from 'react';
import { onlyDigits, validarCNPJ } from '../utils/masks';
import type { CnpjPreview } from '../components/cadastroCliente/types';

/**
 * Encapsula a busca de CNPJ na BrasilAPI, com estado de loading e preview.
 * Extraído verbatim de CadastroCliente.tsx (handleBuscarCNPJ).
 *
 * @param getCnpj    retorna o valor atual do campo CNPJ (mascarado)
 * @param onInvalid  chamado quando o CNPJ é inválido ou não encontrado, com a mensagem
 */
export function useCNPJLookup(getCnpj: () => string, onInvalid: (message: string) => void) {
    const [cnpjSearching, setCnpjSearching] = useState(false);
    const [cnpjPreview, setCnpjPreview] = useState<CnpjPreview | null>(null);

    const buscarCNPJ = async () => {
        const raw = onlyDigits(getCnpj());
        if (raw.length !== 14 || !validarCNPJ(raw)) {
            onInvalid('CNPJ inválido');
            return;
        }
        setCnpjPreview(null);
        setCnpjSearching(true);
        try {
            const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${raw}`);
            if (!res.ok) throw new Error('CNPJ não encontrado');
            const data = await res.json();
            setCnpjPreview(data);
        } catch {
            onInvalid('CNPJ não encontrado na Receita Federal');
        } finally {
            setCnpjSearching(false);
        }
    };

    return { cnpjSearching, cnpjPreview, setCnpjPreview, buscarCNPJ };
}
