import { Atendimento, atendimentosService, probBgColor, probTextColor } from './atendimentosService';

// Cores padrão do sistema
const DARK: [number, number, number] = [31, 73, 125];
const WHITE: [number, number, number] = [255, 255, 255];
const BORDER: [number, number, number] = [180, 196, 214];
const HEADER_BG: [number, number, number] = [52, 102, 163];
const ROW_ALT: [number, number, number] = [245, 248, 252];

// Dimensões A4 paisagem em mm
const PW = 297;
const PH = 210;
const MX = 7;
const MY = 7;
const AW = PW - MX * 2;
const TITLE_H = 10;
const HDR_H = 7;
const ROW_H = 5.5;

/** Carrega o logo da Dbarros como dataURL */
async function loadLogo(): Promise<string | null> {
    try {
        const resp = await fetch('/dbarros.png');
        if (!resp.ok) return null;
        const blob = await resp.blob();
        return new Promise<string>(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

/** Ordena atendimentos: % DESC, depois registro ASC */
function sortAtendimentos(list: Atendimento[]): Atendimento[] {
    return [...list].sort((a, b) => {
        const pA = a.probabilidade === null ? -1 : a.probabilidade;
        const pB = b.probabilidade === null ? -1 : b.probabilidade;
        if (pA !== pB) return pB - pA;
        // Mesmo %, ordena por data de registro (mais antigo primeiro)
        const tA = a.ultima_obs_at ? new Date(a.ultima_obs_at).getTime() : 0;
        const tB = b.ultima_obs_at ? new Date(b.ultima_obs_at).getTime() : 0;
        return tA - tB;
    });
}

/** Formata data ISO para pt-BR curto */
function fmt(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit',
    });
}

/** Trunca texto ao limite de caracteres */
function trunc(text: string | null | undefined, limit: number): string {
    if (!text) return '—';
    return text.length <= limit ? text : text.substring(0, limit) + '...';
}

/**
 * Gera e abre o relatório PDF de atendimentos em nova aba.
 * @param atendimentos lista completa (será re-ordenada internamente)
 * @param edicaoTitulo título da edição para o cabeçalho
 */
export async function generateAtendimentosReport(
    atendimentos: Atendimento[],
    edicaoTitulo: string,
): Promise<string> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const logoDataUrl = await loadLogo();
    const sorted = sortAtendimentos(atendimentos);

    // Larguras das colunas (total = AW)
    const NUM_W = 8;      // #
    const PROB_W = 10;    // %
    const NOME_W = 52;    // Empresa/Cliente
    const CONT_W = 36;    // Contato
    const REG_W = 28;     // Registro
    const AND_W = AW - NUM_W - PROB_W - NOME_W - CONT_W - REG_W; // Andamento (resto)

    // ── Banner de topo ──────────────────────────────────────────────────────────
    const drawBanner = (pg: number) => {
        doc.setFillColor(...DARK);
        doc.rect(MX, MY, AW, TITLE_H, 'F');

        // Esquerda: título
        doc.setTextColor(...WHITE);
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.text(edicaoTitulo.toUpperCase(), MX + 4, MY + 6.5);

        // Direita: data | página
        doc.setFontSize(7); doc.setFont('helvetica', 'normal');
        const dataStr = `Gerado em ${new Date().toLocaleDateString('pt-BR')}  |  Pág. ${pg}`;
        doc.text(dataStr, PW - MX - 3, MY + 6.5, { align: 'right' });

        // Centro: logo + nome
        const LOGO_H = TITLE_H - 2;
        const LOGO_W = LOGO_H * 1.176;
        const brandText = 'Dbarros Eventos Agro';
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        const brandW = doc.getTextDimensions(brandText).w;
        const totalBrandW = LOGO_W + 1.5 + brandW;
        const brandX = PW / 2 - totalBrandW / 2;
        if (logoDataUrl) {
            doc.addImage(logoDataUrl, 'PNG', brandX, MY + 1, LOGO_W, LOGO_H);
        }
        doc.setTextColor(...WHITE);
        doc.text(brandText, brandX + LOGO_W + 1.5, MY + 6.5);
    };

    // ── Cabeçalho das colunas ──────────────────────────────────────────────────
    const drawColHeaders = (y: number) => {
        const cols = [
            { label: '#', w: NUM_W },
            { label: '%', w: PROB_W },
            { label: 'EMPRESA / CLIENTE', w: NOME_W },
            { label: 'CONTATO', w: CONT_W },
            { label: 'REGISTRO', w: REG_W },
            { label: 'ANDAMENTO', w: AND_W },
        ];
        let x = MX;
        cols.forEach(col => {
            doc.setFillColor(...HEADER_BG);
            doc.rect(x, y, col.w, HDR_H, 'F');
            doc.setDrawColor(...BORDER);
            doc.rect(x, y, col.w, HDR_H, 'S');
            doc.setTextColor(...WHITE);
            doc.setFontSize(7); doc.setFont('helvetica', 'bold');
            doc.text(col.label, x + col.w / 2, y + HDR_H / 2 + 1.5, { align: 'center' });
            x += col.w;
        });
        return y + HDR_H;
    };

    // ── Linha de dados ─────────────────────────────────────────────────────────
    const drawRow = (a: Atendimento, idx: number, y: number) => {
        const isAlt = idx % 2 === 1;
        const rowBg: [number, number, number] = isAlt ? ROW_ALT : WHITE;

        const nome = atendimentosService.getNomeExibicao(a);
        const contato = atendimentosService.getContatoExibicao(a);
        const registro = fmt(a.ultima_obs_at);
        const andamento = a.ultima_obs || '—';

        const drawCell = (x: number, w: number, bg?: [number, number, number]) => {
            doc.setFillColor(...(bg ?? rowBg));
            doc.rect(x, y, w, ROW_H, 'F');
            doc.setDrawColor(...BORDER);
            doc.rect(x, y, w, ROW_H, 'S');
        };

        const midY = y + ROW_H / 2 + 2;
        let x = MX;

        // # (número da linha)
        drawCell(x, NUM_W);
        doc.setTextColor(120, 130, 150);
        doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
        doc.text(String(idx + 1), x + NUM_W / 2, midY, { align: 'center' });
        x += NUM_W;

        // % (badge de probabilidade)
        const prob = a.probabilidade;
        if (prob !== null) {
            const bgHex = probBgColor[prob] ?? '#eee';
            const fgHex = probTextColor[prob] ?? '#333';
            const parsedBg = hexToRgb(bgHex);
            const parsedFg = hexToRgb(fgHex);
            drawCell(x, PROB_W, parsedBg as [number, number, number]);
            const pad = 0.8;
            doc.setFillColor(...(parsedBg as [number, number, number]));
            doc.roundedRect(x + pad, y + pad, PROB_W - pad * 2, ROW_H - pad * 2, 1, 1, 'F');
            doc.setTextColor(...(parsedFg as [number, number, number]));
            doc.setFontSize(7); doc.setFont('helvetica', 'bold');
            doc.text(String(prob), x + PROB_W / 2, midY, { align: 'center' });
        } else {
            drawCell(x, PROB_W);
            doc.setTextColor(160, 160, 180);
            doc.setFontSize(7); doc.setFont('helvetica', 'normal');
            doc.text('—', x + PROB_W / 2, midY, { align: 'center' });
        }
        x += PROB_W;

        // Empresa / Cliente
        drawCell(x, NOME_W);
        doc.setTextColor(30, 30, 40);
        doc.setFontSize(7); doc.setFont('helvetica', 'bold');
        doc.text(trunc(nome.toUpperCase(), 28), x + 2, midY);
        x += NOME_W;

        // Contato
        drawCell(x, CONT_W);
        doc.setTextColor(60, 70, 90);
        doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
        doc.text(trunc(contato, 20), x + 2, midY);
        x += CONT_W;

        // Registro
        drawCell(x, REG_W);
        doc.setTextColor(80, 90, 110);
        doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
        doc.text(registro, x + 2, midY);
        x += REG_W;

        // Andamento (campo largo — usa splitTextToSize para caber na célula)
        drawCell(x, AND_W);
        doc.setTextColor(40, 50, 70);
        doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
        const andLines = doc.splitTextToSize(andamento, AND_W - 4);
        // Exibe apenas 1 linha no modo tabela (ROW_H é pequeno)
        doc.text(andLines[0] || '—', x + 2, midY);
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    let page = 1;
    drawBanner(page);
    let curY = MY + TITLE_H + 1;
    curY = drawColHeaders(curY);

    for (let i = 0; i < sorted.length; i++) {
        if (curY + ROW_H > PH - MY) {
            doc.addPage();
            page++;
            drawBanner(page);
            curY = MY + TITLE_H + 1;
            curY = drawColHeaders(curY);
        }
        drawRow(sorted[i], i, curY);
        curY += ROW_H;
    }

    // Linha de rodapé com total
    if (curY + ROW_H <= PH - MY) {
        const cols = [NUM_W, PROB_W, NOME_W, CONT_W, REG_W, AND_W];
        let x = MX;
        cols.forEach((w, ci) => {
            doc.setFillColor(...DARK);
            doc.rect(x, curY, w, ROW_H, 'F');
            doc.setDrawColor(...BORDER);
            doc.rect(x, curY, w, ROW_H, 'S');
            if (ci === 0) {
                doc.setTextColor(...WHITE);
                doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
                doc.text('TOTAL', x + w / 2, curY + ROW_H / 2 + 2, { align: 'center' });
            } else if (ci === 2) {
                doc.setTextColor(...WHITE);
                doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
                doc.text(`${sorted.length} registros`, x + w / 2, curY + ROW_H / 2 + 2, { align: 'center' });
            }
            x += w;
        });
    }

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    return url;
}

/** Converte hex (#RRGGBB) para [r, g, b] */
function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
        : [200, 200, 200];
}
