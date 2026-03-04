// ============================================================
// masks.ts — Máscaras e validadores para formulários BR
// ============================================================

/** Remove tudo que não for dígito */
export const onlyDigits = (v: string): string => v.replace(/\D/g, '');

// -----------------------------------------------------------
// Máscaras
// -----------------------------------------------------------

export const maskCNPJ = (v: string): string => {
    const d = onlyDigits(v).slice(0, 14);
    return d
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
};

export const maskCPF = (v: string): string => {
    const d = onlyDigits(v).slice(0, 11);
    return d
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
};

export const maskTelefone = (v: string): string => {
    const d = onlyDigits(v).slice(0, 11);
    if (d.length <= 10) {
        // Fixo: (00) 0000-0000
        return d
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{4})(\d)/, '$1-$2');
    }
    // Celular: (00) 00000-0000
    return d
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
};

export const maskCEP = (v: string): string => {
    const d = onlyDigits(v).slice(0, 8);
    return d.replace(/(\d{5})(\d)/, '$1-$2');
};

// -----------------------------------------------------------
// Validadores
// -----------------------------------------------------------

/** Valida CNPJ com dígitos verificadores */
export const validarCNPJ = (v: string): boolean => {
    const d = onlyDigits(v);
    if (d.length !== 14) return false;
    if (/^(\d)\1+$/.test(d)) return false; // todos iguais

    const calc = (weights: number[]) =>
        d.split('').slice(0, weights.length).reduce((acc, n, i) => acc + parseInt(n) * weights[i], 0);

    const mod = (n: number) => {
        const r = n % 11;
        return r < 2 ? 0 : 11 - r;
    };

    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    const d1 = mod(calc(w1));
    const d2 = mod(calc(w2));

    return d1 === parseInt(d[12]) && d2 === parseInt(d[13]);
};

/** Valida CPF com dígitos verificadores */
export const validarCPF = (v: string): boolean => {
    const d = onlyDigits(v);
    if (d.length !== 11) return false;
    if (/^(\d)\1+$/.test(d)) return false; // todos iguais

    const soma = (len: number) =>
        d.split('').slice(0, len).reduce((acc, n, i) => acc + parseInt(n) * (len + 1 - i), 0);

    const dig = (s: number) => {
        const r = (s * 10) % 11;
        return r >= 10 ? 0 : r;
    };

    return dig(soma(9)) === parseInt(d[9]) && dig(soma(10)) === parseInt(d[10]);
};
