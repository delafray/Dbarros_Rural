/**
 * Cores das badges de probabilidade de fechamento (0-100, de 10 em 10).
 * Usadas em Atendimentos, ResolucaoAtendimentoModal e no relatório PDF.
 * (Antes moravam no atendimentosService — são apresentação, não dados.)
 */

/** Cor de fundo por probabilidade */
export const probBgColor: Record<number, string> = {
    0: '#FFC7CE',
    10: '#FFB3B3',
    20: '#FFB347',
    30: '#FFC966',
    40: '#FFE066',
    50: '#FFFACC',
    60: '#E8F5C8',
    70: '#D4EDAA',
    80: '#B7E4A0',
    90: '#8ED88A',
    100: '#C6EFCE',
};

/** Cor de texto por probabilidade */
export const probTextColor: Record<number, string> = {
    0: '#9C0006',
    10: '#9C0006',
    20: '#7B3800',
    30: '#6B3A00',
    40: '#5C4600',
    50: '#636003',
    60: '#3A5E00',
    70: '#2E5300',
    80: '#1F4A00',
    90: '#155A12',
    100: '#276221',
};
