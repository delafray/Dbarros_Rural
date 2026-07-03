/**
 * Utilitários de data centralizados e testados (utils/dateUtils.test.ts).
 * Regra do projeto: strings "YYYY-MM-DD" (date-only) são sempre interpretadas
 * como data LOCAL — `new Date("YYYY-MM-DD")` interpreta como UTC midnight e
 * desloca 1 dia em UTC-3, causando os bugs de "evento no dia errado".
 */

/**
 * Converte uma data em timestamp numérico para ORDENAÇÃO.
 * Aceita: "DD/MM/YYYY" (local), "YYYY-MM-DD" (local), ISO completo com hora.
 * null/undefined/inválido → Infinity (vai para o final da ordenação).
 */
export function parseDataFlexivel(d: string | null | undefined): number {
    if (!d) return Infinity;
    const s = d.trim();
    if (s.includes('/')) {
        const parts = s.split('/'); // DD/MM/YYYY
        if (parts.length >= 3) {
            const ts = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
            return isNaN(ts) ? Infinity : ts;
        }
        return Infinity;
    }
    // Date-only ISO: interpretar como meia-noite LOCAL (não UTC)
    const dateOnly = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
        return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])).getTime();
    }
    const ts = new Date(s).getTime();
    return isNaN(ts) ? Infinity : ts;
}

/**
 * Junta a data de um <input type="date"> ("YYYY-MM-DD") com uma hora fixa,
 * produzindo um timestamp ISO VÁLIDO para gravar no banco.
 * (Substitui o padrão bugado `${data} T10:00:00Z` — espaço antes do T = Invalid Date.)
 */
export function buildDayTimestamp(dateStr: string, time: string): string | null {
    if (!dateStr) return null;
    return `${dateStr}T${time}:00Z`;
}

/** "DD/MM/AAAA". Date-only é formatada por partes (sem Date) para não deslocar o dia. */
export function formatDateBR(iso: string | null | undefined): string {
    if (!iso) return '—';
    const dateOnly = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnly && iso.trim().length === 10) {
        return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
    }
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** "DD/MM/AA HH:MM" — formato compacto usado nas listagens. */
export function formatDateTimeBR(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit',
    });
}
