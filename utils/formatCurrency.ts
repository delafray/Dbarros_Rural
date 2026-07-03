/**
 * Formatação de moeda BRL centralizada.
 * Antes desta util existirem 8 implementações inline divergentes espalhadas
 * por pages/hooks/components — usar sempre estas funções.
 */

const brlFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

const brlNumberFormatter = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

/** "R$ 1.234,56" — para exibição em telas. */
export function formatBRL(value: number | null | undefined): string {
    return brlFormatter.format(value || 0);
}

/**
 * "1.234,56" (sem o símbolo) — para contextos que montam o "R$" à parte,
 * como PDFs (o espaço do Intl é NBSP e pode renderizar errado no jsPDF).
 */
export function formatBRLNumber(value: number | null | undefined): string {
    return brlNumberFormatter.format(value || 0);
}
