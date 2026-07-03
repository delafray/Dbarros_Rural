/**
 * Aritmética monetária segura (testada em utils/money.test.ts).
 * Somar floats diretamente (ex: `acc += valor`) acumula erro de IEEE-754 —
 * R$ 0,10 não tem representação binária exata. Estas funções operam em
 * CENTAVOS inteiros, onde a soma é exata.
 */

/** Arredonda um valor para centavos (2 casas). */
export function roundCentavos(v: number): number {
    return Math.round((v + Number.EPSILON) * 100) / 100;
}

/** Soma uma lista de valores monetários sem drift de float. */
export function somaMonetaria(values: number[]): number {
    const totalCentavos = values.reduce((s, v) => s + Math.round((v + Number.EPSILON) * 100), 0);
    return totalCentavos / 100;
}

/** Soma incremental segura: `acc = addMonetario(acc, valor)`. */
export function addMonetario(acc: number, v: number): number {
    return (Math.round((acc + Number.EPSILON) * 100) + Math.round((v + Number.EPSILON) * 100)) / 100;
}
