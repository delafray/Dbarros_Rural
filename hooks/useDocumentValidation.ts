import type { Dispatch, SetStateAction } from 'react';
import { onlyDigits } from '../utils/masks';

/**
 * Fábrica genérica que unifica os 3 handlers de blur/validação quase idênticos
 * (CPF, CNPJ e CPF do responsável) do CadastroCliente.
 *
 * Mesma lógica original: se houver dígitos e o documento for inválido, grava a
 * mensagem no campo de erro correspondente; caso contrário, limpa o erro.
 */
export function makeDocumentBlurHandler<K extends string>(params: {
    getValue: () => string;
    validate: (raw: string) => boolean;
    field: K;
    message: string;
    setErros: Dispatch<SetStateAction<Partial<Record<K, string | undefined>>>>;
}) {
    const { getValue, validate, field, message, setErros } = params;
    return () => {
        const raw = onlyDigits(getValue());
        if (raw.length > 0 && !validate(raw)) {
            setErros(e => ({ ...e, [field]: message }));
        } else {
            setErros(e => ({ ...e, [field]: undefined }));
        }
    };
}
