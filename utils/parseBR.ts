/**
 * Parse de entrada "suja" em formato brasileiro — puro, sem IO (RNF-009).
 * Usado pela grade (digitação livre), pelo paste TSV (rel. 09) e pela
 * importação das planilhas de fornecedor (RF-028/029).
 *
 * Filosofia RNF-002: aceitar o que der para entender, devolver null para o
 * que não der — NUNCA lançar exceção nem devolver NaN.
 *
 * Testado em utils/parseBR.test.ts (meta ≥95% — RNF-014).
 */

// ────────────────────────────────────────────────────────────────────────────
// Números em formato BR: "R$ 1.234,56", "1.234", "12,5", "1234.56"
// ────────────────────────────────────────────────────────────────────────────

/**
 * Converte texto monetário/numérico BR em número.
 * Regras (rel. 09):
 *  - remove "R$", espaços (inclusive NBSP) e sinais de milhar;
 *  - tem '.' E ',' → '.' é milhar, ',' é decimal ("1.234,56" → 1234.56);
 *  - só ',' → decimal ("12,5" → 12.5);
 *  - só '.' → AMBÍGUO: um único '.' seguido de exatamente 3 dígitos no fim é
 *    milhar BR ("1.234" → 1234); qualquer outro caso é decimal ("12.5" → 12.5,
 *    "1.2345" → 1.2345). Vários pontos ("1.234.567") são milhar.
 *  - suporta negativo ("-12,5" ou "(12,5)" estilo contábil).
 * Retorna null quando não há número reconhecível.
 */
export function parseNumeroBR(texto: unknown): number | null {
    if (typeof texto === 'number') return Number.isFinite(texto) ? texto : null;
    if (typeof texto !== 'string') return null;

    let s = texto
        .replace(/ /g, ' ')       // NBSP vindo do Excel
        .replace(/R\$\s*/gi, '')
        .trim();
    if (s === '') return null;

    // Notação contábil: (123,45) = negativo
    let negativo = false;
    const contabil = /^\((.*)\)$/.exec(s);
    if (contabil) {
        negativo = true;
        s = contabil[1].trim();
    }
    if (s.startsWith('-')) {
        negativo = !negativo;
        s = s.slice(1).trim();
    }
    if (s.startsWith('+')) s = s.slice(1).trim();

    s = s.replace(/\s/g, '');
    if (!/^[\d.,]+$/.test(s)) return null;

    const temPonto = s.includes('.');
    const temVirgula = s.includes(',');

    let normalizado: string;
    if (temPonto && temVirgula) {
        // BR pleno: ponto = milhar, vírgula = decimal — mas só se a ordem for essa
        if (s.lastIndexOf('.') > s.lastIndexOf(',')) return null; // "1,234.56" (US) → rejeita: ambíguo demais
        normalizado = s.replace(/\./g, '').replace(',', '.');
    } else if (temVirgula) {
        if ((s.match(/,/g) ?? []).length > 1) return null; // "1,2,3"
        normalizado = s.replace(',', '.');
    } else if (temPonto) {
        const pontos = s.match(/\./g) ?? [];
        if (pontos.length > 1) {
            // "1.234.567" → milhar (todos os grupos após o 1º devem ter 3 dígitos)
            if (!/^\d{1,3}(\.\d{3})+$/.test(s)) return null;
            normalizado = s.replace(/\./g, '');
        } else {
            // Um único ponto: "1.234" (exatos 3 dígitos no fim) é milhar BR
            normalizado = /^\d{1,3}\.\d{3}$/.test(s) ? s.replace('.', '') : s;
        }
    } else {
        normalizado = s;
    }

    const n = Number(normalizado);
    if (!Number.isFinite(n)) return null;
    return negativo ? -n : n;
}

/** Formata número como moeda BRL ("R$ 1.234,56"). */
export function formatBRL(valor: number): string {
    if (!Number.isFinite(valor)) return 'R$ 0,00';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ────────────────────────────────────────────────────────────────────────────
// Datas BR: "dd/mm/aaaa", "dd/mm/aa", "dd/mm" (assume ano corrente)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Converte data BR em ISO "yyyy-mm-dd" (rel. 09: nunca passar dd/mm ao Date()).
 * Anos de 2 dígitos: 00–69 → 20xx, 70–99 → 19xx. Valida o calendário de
 * verdade (31/02 → null). Retorna null para o irreconhecível.
 */
export function parseDataBR(texto: unknown, anoPadrao?: number): string | null {
    if (typeof texto !== 'string') return null;
    const m = /^\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?\s*$/.exec(texto);
    if (!m) return null;

    const dia = Number(m[1]);
    const mes = Number(m[2]);
    let ano: number;
    if (m[3] === undefined) {
        ano = anoPadrao ?? new Date().getFullYear();
    } else if (m[3].length === 2) {
        const n = Number(m[3]);
        ano = n <= 69 ? 2000 + n : 1900 + n;
    } else {
        ano = Number(m[3]);
    }

    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
    const d = new Date(Date.UTC(ano, mes - 1, dia));
    if (d.getUTCFullYear() !== ano || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) {
        return null; // 31/02 etc.
    }
    const mm = String(mes).padStart(2, '0');
    const dd = String(dia).padStart(2, '0');
    return `${ano}-${mm}-${dd}`;
}

// ────────────────────────────────────────────────────────────────────────────
// CNPJ (RF-028: validação e chave de deduplicação)
// ────────────────────────────────────────────────────────────────────────────

/** Remove tudo que não é dígito. */
export function limparCNPJ(texto: unknown): string {
    if (typeof texto !== 'string' && typeof texto !== 'number') return '';
    return String(texto).replace(/\D/g, '');
}

/**
 * Valida CNPJ pelos dígitos verificadores (módulo 11).
 * Aceita com ou sem máscara. Rejeita sequências repetidas (00.000.000/0000-00).
 */
export function validarCNPJ(texto: unknown): boolean {
    const cnpj = limparCNPJ(texto);
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    const calcDV = (base: string): number => {
        let peso = base.length - 7; // 5 para 12 dígitos, 6 para 13
        let soma = 0;
        for (const ch of base) {
            soma += Number(ch) * peso;
            peso -= 1;
            if (peso < 2) peso = 9;
        }
        const resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    };

    const dv1 = calcDV(cnpj.slice(0, 12));
    if (dv1 !== Number(cnpj[12])) return false;
    const dv2 = calcDV(cnpj.slice(0, 13));
    return dv2 === Number(cnpj[13]);
}

/** Formata "12345678000195" → "12.345.678/0001-95" (entrada inválida volta como veio). */
export function formatCNPJ(texto: unknown): string {
    const cnpj = limparCNPJ(texto);
    if (cnpj.length !== 14) return typeof texto === 'string' ? texto : '';
    return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
}
