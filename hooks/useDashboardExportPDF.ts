import React, { useState } from 'react';
import { useAppDialog } from '../context/DialogContext';
import { planilhaVendasService, CategoriaSetup } from '../services/planilhaVendasService';
import { itensOpcionaisService } from '../services/itensOpcionaisService';
import { clientesService } from '../services/clientesService';
import { EventoEdicao } from '../services/eventosService';

// Tipagem baseada no que o Dashboard usa
export type EdicaoComDocsPDF = EventoEdicao & {
    eventos: { nome: string } | null;
    proposta_comercial_path?: string | null;
    planta_baixa_path?: string | null;
};

export const useDashboardExportPDF = (setDocModal: React.Dispatch<React.SetStateAction<any>>) => {
    const appDialog = useAppDialog();
    const [pdfProgress, setPdfProgress] = useState<number | null>(null);
    const [pdfTitle, setPdfTitle] = useState('');

    const handleExportPdf = async (e: React.MouseEvent, edicao: EdicaoComDocsPDF) => {
        e.stopPropagation();
        setPdfProgress(0);
        setPdfTitle(edicao.titulo);
        try {
            const config = await planilhaVendasService.getConfig(edicao.id);
            if (!config) {
                setPdfProgress(null);
                await appDialog.alert({ title: 'Aviso', message: 'Esta edição não possui configuração de planilha.', type: 'warning' });
                return;
            }
            setPdfProgress(10);

            const [estandes, allOpcionais, listaClientes] = await Promise.all([
                planilhaVendasService.getEstandes(config.id),
                itensOpcionaisService.getItens(),
                clientesService.getClientesComContatos(),
            ]);
            setPdfProgress(30);

            const categorias = (config.categorias_config as unknown as CategoriaSetup[]) || [];
            const opcionaisAtivos = allOpcionais.filter(item => config.opcionais_ativos?.includes(item.id));
            const precosEdicao = (config.opcionais_precos as Record<string, number>) || {};

            const getCategoria = (nr: string) => {
                const nrLow = nr.toLowerCase();
                const sorted2 = [...categorias].sort((a, b) =>
                    (b.prefix || b.tag || '').length - (a.prefix || a.tag || '').length
                );
                return sorted2.find(c => {
                    const id = (c.prefix || c.tag || '').toLowerCase().trim();
                    return id && (nrLow === id || nrLow.startsWith(id + ' '));
                });
            };

            const calcRow = (row: { stand_nr: string; tipo_venda: string; opcionais_selecionados: unknown; desconto: number | null }) => {
                const cat = getCategoria(row.stand_nr);
                const tipo = row.tipo_venda;
                let precoBase = 0;
                if (cat && !tipo.includes('*')) {
                    if (tipo === 'STAND PADRÃO') precoBase = cat.standBase || 0;
                    else {
                        const m = tipo.match(/COMBO (\d+)/);
                        if (m) precoBase = (cat.combos as number[])?.[parseInt(m[1], 10) - 1] || 0;
                    }
                }
                const sel = (row.opcionais_selecionados as Record<string, string>) || {};
                let totalOpts = 0;
                opcionaisAtivos.forEach(opt => {
                    if (sel[opt.nome] === 'x') {
                        const p = precosEdicao[opt.id] !== undefined ? Number(precosEdicao[opt.id]) : Number(opt.preco_base);
                        totalOpts += p;
                    }
                });
                const subTotal = precoBase + totalOpts;
                const desconto = Number(row.desconto) || 0;
                return { subTotal, desconto, totalVenda: subTotal - desconto };
            };

            setPdfProgress(40);

            const sorted = [...estandes].sort((a, b) => {
                const catA = getCategoria(a.stand_nr);
                const catB = getCategoria(b.stand_nr);
                const ordA = catA?.ordem ?? 0, ordB = catB?.ordem ?? 0;
                if (ordA !== ordB) return ordA - ordB;
                if (catA && catB) {
                    const iA = categorias.findIndex(c => c === catA);
                    const iB = categorias.findIndex(c => c === catB);
                    if (iA !== iB) return iA - iB;
                }
                return a.stand_nr.localeCompare(b.stand_nr, undefined, { numeric: true, sensitivity: 'base' });
            });

            // combo labels & display names
            let maxCombos = 0;
            categorias.forEach(c => { const l = Array.isArray(c.combos) ? c.combos.length : 0; if (l > maxCombos) maxCombos = l; });
            const comboLabels: string[] = ['STAND PADRÃO'];
            for (let i = 1; i <= maxCombos; i++) comboLabels.push('COMBO ' + String(i).padStart(2, '0'));
            const customNames = categorias[0]?.comboNames || [];
            const comboDisplay: Record<string, string> = {};
            comboDisplay['STAND PADRÃO'] = 'STAND PADRÃO';
            for (let i = 1; i <= maxCombos; i++) {
                const key = 'COMBO ' + String(i).padStart(2, '0');
                comboDisplay[key] = customNames[i - 1] || key;
            }

            // Only count real stands (is_stand !== false) for the RESUMO
            const standsOnly = sorted.filter(row => {
                const cat = getCategoria(row.stand_nr);
                return cat ? (cat as any).is_stand !== false : true;
            });
            const totalStands = standsOnly.length;

            // Totals & per-column counts
            const totals = { subTotal: 0, desconto: 0, totalVenda: 0 };
            const comboXCounts: Record<string, number> = {};
            const optCounts: Record<string, number> = {};
            comboLabels.forEach(l => { comboXCounts[l] = 0; });
            opcionaisAtivos.forEach(o => { optCounts[o.nome] = 0; });
            // vendas count from standsOnly only
            let vendasCount = 0;
            sorted.forEach(row => {
                const c = calcRow(row);
                totals.subTotal += c.subTotal;
                totals.desconto += c.desconto;
                totals.totalVenda += c.totalVenda;
                const isSt = (getCategoria(row.stand_nr) as any)?.is_stand !== false;
                if (row.tipo_venda !== 'DISPONÍVEL' && isSt) vendasCount++;
                const base = row.tipo_venda.replace('*', '').trim();
                if (!row.tipo_venda.endsWith('*') && row.tipo_venda !== 'DISPONÍVEL')
                    comboXCounts[base] = (comboXCounts[base] || 0) + 1;
                const sel = (row.opcionais_selecionados as Record<string, string>) || {};
                opcionaisAtivos.forEach(o => {
                    if (sel[o.nome] === 'x' || sel[o.nome] === '*') optCounts[o.nome] = (optCounts[o.nome] || 0) + 1;
                });
            });

            setPdfProgress(50);

            // Category color palette
            const CAT_PALETTES: [number, number, number][] = [
                [226, 223, 248], // lavanda
                [255, 255, 210], // amarelo
                [210, 240, 210], // verde
                [255, 228, 210], // pessego
                [210, 235, 255], // azul claro
                [240, 210, 240], // lilas
            ];
            const catColors: Record<string, [number, number, number]> = {};
            categorias.forEach((c, i) => { catColors[c.tag] = CAT_PALETTES[i % CAT_PALETTES.length]; });

            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

            const PW = 297, PH = 210, MX = 7, MY = 7;
            const AW = PW - MX * 2;

            const nCombos = comboLabels.length;
            const nOpts = opcionaisAtivos.length;
            const FIN_W = 28;
            const CAT_W = 16;
            const STAND_W = 18;
            const THIN = Math.max(10, Math.min(18, 90 / Math.max(nCombos + nOpts, 1)));
            const CLIENTE_W = Math.max(25, AW - CAT_W - STAND_W - nCombos * THIN - nOpts * THIN - FIN_W * 3);

            type Col = { key: string; label: string; w: number; rotate?: boolean };
            const allCols: Col[] = [
                { key: 'categoria', label: 'CAT.', w: CAT_W },
                { key: 'stand_nr', label: 'STAND', w: STAND_W },
                { key: 'cliente', label: 'CLIENTE', w: CLIENTE_W },
                ...comboLabels.map(l => ({ key: 'combo_' + l, label: comboDisplay[l] || l, w: THIN, rotate: true })),
                ...opcionaisAtivos.map(o => ({ key: 'opt_' + o.nome, label: o.nome.toUpperCase(), w: THIN, rotate: true })),
                { key: 'subTotal', label: 'SUBTOTAL', w: FIN_W },
                { key: 'desconto', label: 'DESCONTO', w: FIN_W },
                { key: 'total', label: 'TOTAL', w: FIN_W },
            ];

            const DARK: [number, number, number] = [31, 73, 125];
            const MED: [number, number, number] = [52, 102, 163];
            const GOLD: [number, number, number] = [212, 160, 0];
            const WHITE: [number, number, number] = [255, 255, 255];
            const BORDER: [number, number, number] = [180, 196, 214];
            const TOT_BG: [number, number, number] = [15, 42, 85];
            const GREEN_X: [number, number, number] = [22, 163, 74];
            const CYAN_S: [number, number, number] = [6, 148, 162];

            const fmtMoney = (v: number) =>
                'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            const TITLE_H = 10;
            const RES_H1 = 7;
            const RES_H2 = 7;
            const HDR_H = 20;
            const ROW_H = 5.5;

            setPdfProgress(60);

            // Carrega logo para o banner (transparente)
            let logoDataUrl: string | null = null;
            try {
                const resp = await fetch('/dbarros.png');
                if (resp.ok) {
                    const blob = await resp.blob();
                    logoDataUrl = await new Promise<string>(resolve => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(blob);
                    });
                }
            } catch { /* sem logo, sem problema */ }

            let page = 1;

            const drawPageBanner = (pg: number) => {
                doc.setFillColor(...DARK);
                doc.rect(MX, MY, AW, TITLE_H, 'F');
                doc.setTextColor(...WHITE);
                // Esquerda: título da edição
                doc.setFontSize(12); doc.setFont('helvetica', 'bold');
                const ttl = edicao.titulo.toUpperCase();
                doc.text(ttl, MX + 4, MY + 6.5);
                // Direita: gerado em
                doc.setFontSize(7); doc.setFont('helvetica', 'normal');
                doc.text('Gerado em ' + new Date().toLocaleDateString('pt-BR') + '  |  Pág. ' + pg, PW - MX - 3, MY + 6.5, { align: 'right' });
                // Centro: logo + nome empresa
                const LOGO_H = TITLE_H - 2; // 8mm de altura
                const LOGO_W = LOGO_H * 1.176; // proporção real 1023/870 da dbarros.png
                const brandText = 'Dbarros Eventos Agro';
                doc.setFontSize(12); doc.setFont('helvetica', 'bold');
                const brandW = doc.getTextDimensions(brandText).w;
                const totalBrandW = LOGO_W + 1.5 + brandW;
                const brandX = PW / 2 - totalBrandW / 2;
                if (logoDataUrl) {
                    doc.addImage(logoDataUrl, 'PNG', brandX, MY + 1, LOGO_W, LOGO_H);
                }
                doc.setTextColor(...WHITE); // fonte 16pt já está setada acima
                doc.text(brandText, brandX + LOGO_W + 1.5, MY + 6.5);
            };


            const drawResumoGeral = (y: number): number => {
                const finStart = allCols.length - 3;
                const mainW = allCols.slice(0, finStart).reduce((s, c) => s + c.w, 0);

                // row1: banner
                doc.setFillColor(...DARK);
                doc.rect(MX, y, mainW, RES_H1, 'F');
                doc.setTextColor(...WHITE); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
                doc.text('RESUMO GERAL', MX + 4, y + RES_H1 / 2 + 1.5);

                let fx = MX + mainW;
                const finLabels = ['SUBTOTAL', 'DESCONTO', 'TOTAL'];
                const finColors: [number, number, number][] = [WHITE, WHITE, WHITE];
                allCols.slice(finStart).forEach((col, i) => {
                    doc.setFillColor(...DARK);
                    doc.rect(fx, y, col.w, RES_H1, 'F');
                    doc.setDrawColor(...BORDER); doc.rect(fx, y, col.w, RES_H1, 'S');
                    doc.setTextColor(...finColors[i]);
                    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
                    doc.text(finLabels[i], fx + col.w / 2, y + RES_H1 / 2 + 1.5, { align: 'center' });
                    fx += col.w;
                });

                // row2: counts — without large number, just label and count side by side
                const y2 = y + RES_H1;
                const standsW = CAT_W + STAND_W;
                doc.setFillColor(...MED);
                doc.rect(MX, y2, standsW, RES_H2, 'F');
                doc.setDrawColor(...BORDER); doc.rect(MX, y2, standsW, RES_H2, 'S');
                doc.setTextColor(...WHITE); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
                // Centered: "STANDS  39"
                doc.text('STANDS  ' + totalStands, MX + standsW / 2, y2 + RES_H2 / 2 + 1.5, { align: 'center' });

                let rx = MX + standsW;
                const pct = totalStands > 0 ? Math.round((vendasCount / totalStands) * 100) : 0;
                doc.setFillColor(...MED);
                doc.rect(rx, y2, CLIENTE_W, RES_H2, 'F');
                doc.setDrawColor(...BORDER); doc.rect(rx, y2, CLIENTE_W, RES_H2, 'S');
                doc.setTextColor(...WHITE); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
                doc.text('VENDAS  ' + vendasCount + ' DE ' + totalStands + '  (' + pct + '%)', rx + CLIENTE_W / 2, y2 + RES_H2 / 2 + 1.5, { align: 'center' });
                rx += CLIENTE_W;

                comboLabels.forEach(lbl => {
                    const cnt = comboXCounts[lbl] || 0;
                    doc.setFillColor(...(cnt > 0 ? GREEN_X : MED));
                    doc.rect(rx, y2, THIN, RES_H2, 'F');
                    doc.setDrawColor(...BORDER); doc.rect(rx, y2, THIN, RES_H2, 'S');
                    doc.setTextColor(...WHITE); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
                    doc.text(String(cnt), rx + THIN / 2, y2 + RES_H2 / 2 + 1.5, { align: 'center' });
                    rx += THIN;
                });

                opcionaisAtivos.forEach(o => {
                    const cnt = optCounts[o.nome] || 0;
                    doc.setFillColor(...(cnt > 0 ? CYAN_S : MED));
                    doc.rect(rx, y2, THIN, RES_H2, 'F');
                    doc.setDrawColor(...BORDER); doc.rect(rx, y2, THIN, RES_H2, 'S');
                    doc.setTextColor(...WHITE); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
                    doc.text(String(cnt), rx + THIN / 2, y2 + RES_H2 / 2 + 1.5, { align: 'center' });
                    rx += THIN;
                });

                // financial totals — centered
                allCols.slice(finStart).forEach((col, i) => {
                    doc.setFillColor(...DARK);
                    doc.rect(rx, y2, col.w, RES_H2, 'F');
                    doc.setDrawColor(...BORDER); doc.rect(rx, y2, col.w, RES_H2, 'S');
                    doc.setTextColor(...finColors[i]); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
                    const val = [totals.subTotal, totals.desconto, totals.totalVenda][i];
                    doc.text(fmtMoney(val), rx + col.w / 2, y2 + RES_H2 / 2 + 1.5, { align: 'center' });
                    rx += col.w;
                });

                return y2 + RES_H2;
            };

            const drawColHeaders = (y: number): number => {
                let x = MX;
                allCols.forEach(col => {
                    doc.setFillColor(...DARK);
                    doc.rect(x, y, col.w, HDR_H, 'F');
                    doc.setDrawColor(...BORDER); doc.rect(x, y, col.w, HDR_H, 'S');
                    doc.setTextColor(...WHITE);
                    if (col.rotate) {
                        doc.setFontSize(5.5); doc.setFont('helvetica', 'bold');
                        // text rotated 90 degrees, starts at bottom of cell going up, centered horizontally
                        doc.text(col.label, x + col.w / 2 + 1.5, y + HDR_H - 2, { angle: 90, align: 'left' });
                    } else {
                        doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
                        const lines = doc.splitTextToSize(col.label, col.w - 2);
                        const baseY = y + HDR_H / 2 - ((lines.length - 1) * 3.5) / 2 + 1.5;
                        lines.forEach((ln: string, li: number) =>
                            doc.text(ln, x + col.w / 2, baseY + li * 3.5, { align: 'center' })
                        );
                    }
                    x += col.w;
                });
                return y + HDR_H;
            };

            const drawDataRow = (row: (typeof sorted)[0], y: number) => {
                const cat = getCategoria(row.stand_nr);
                const { subTotal, desconto, totalVenda } = calcRow(row);
                const sel = (row.opcionais_selecionados as Record<string, string>) || {};
                const isAvail = row.tipo_venda === 'DISPONÍVEL';
                const catBg: [number, number, number] = cat ? (catColors[cat.tag] ?? WHITE) : WHITE;
                const rowBg: [number, number, number] = isAvail
                    ? [Math.min(255, catBg[0] + 12), Math.min(255, catBg[1] + 12), Math.min(255, catBg[2] + 12)]
                    : catBg;
                const clienteNome = row.cliente_nome_livre
                    || listaClientes.find(c => c.id === row.cliente_id)?.nome_fantasia
                    || listaClientes.find(c => c.id === row.cliente_id)?.razao_social || '';

                let x = MX;
                allCols.forEach(col => {
                    // desconto com fundo clarinho se houver desconto, senao rowBg como o resto
                    const isDesc = col.key === 'desconto' && desconto > 0;
                    doc.setFillColor(...(isDesc ? ([255, 235, 210] as [number, number, number]) : rowBg));
                    doc.rect(x, y, col.w, ROW_H, 'F');
                    doc.setDrawColor(...BORDER); doc.rect(x, y, col.w, ROW_H, 'S');
                    // vertical center Y
                    const midY = y + ROW_H / 2 + 2;
                    doc.setTextColor(30, 30, 40); doc.setFontSize(7); doc.setFont('helvetica', 'normal');

                    if (col.key === 'categoria') {
                        doc.setFontSize(6); doc.setTextColor(80, 80, 100); doc.setFont('helvetica', 'normal');
                        doc.text(cat?.tag || '', x + col.w / 2, midY, { align: 'center' });
                    } else if (col.key === 'stand_nr') {
                        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
                        doc.text(row.stand_nr, x + col.w / 2, midY, { align: 'center' });
                    } else if (col.key === 'cliente') {
                        if (isAvail && !clienteNome) {
                            doc.setTextColor(140, 140, 160); doc.setFont('helvetica', 'italic'); doc.setFontSize(7);
                            doc.text('DISPONÍVEL', x + 2, midY);
                        } else {
                            doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
                            const t = doc.splitTextToSize((clienteNome || '').toUpperCase(), col.w - 3)[0] || '';
                            doc.text(t, x + 2, midY);
                        }
                    } else if (col.key.startsWith('combo_')) {
                        const lbl = col.key.replace('combo_', '');
                        const base = row.tipo_venda.replace('*', '').trim();
                        const isStar = row.tipo_venda.endsWith('*');
                        if (base === lbl && !isAvail) {
                            doc.setFillColor(...(isStar ? CYAN_S : GREEN_X));
                            // filled square inside cell, centered
                            const pad = 1.2;
                            doc.roundedRect(x + pad, y + pad, col.w - pad * 2, ROW_H - pad * 2, 1, 1, 'F');
                            doc.setTextColor(...WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
                            // centro do quadrado interno + ajuste baseline 8pt (* sobe mais, precisa +1mm extra)
                            const boxCenterY = y + pad + (ROW_H - pad * 2) / 2 + 0.8;
                            const charY = isStar ? boxCenterY + 0.6 : boxCenterY;
                            doc.text(isStar ? '*' : 'x', x + col.w / 2, charY, { align: 'center' });
                        }
                    } else if (col.key.startsWith('opt_')) {
                        // key = 'opt_' + o.nome — find exact by nome
                        const optNome = col.key.replace('opt_', '');
                        const opt = opcionaisAtivos.find(o => o.nome === optNome);
                        const val = opt ? (sel[opt.nome] || '') : '';
                        if (val === 'x' || val === '*') {
                            doc.setFillColor(...CYAN_S);
                            const pad = 1.2;
                            doc.roundedRect(x + pad, y + pad, col.w - pad * 2, ROW_H - pad * 2, 1, 1, 'F');
                            doc.setTextColor(...WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
                            const boxCenterY2 = y + pad + (ROW_H - pad * 2) / 2 + 0.8;
                            const charY2 = val === '*' ? boxCenterY2 + 0.6 : boxCenterY2;
                            doc.text(val, x + col.w / 2, charY2, { align: 'center' });
                        }
                    } else if (col.key === 'subTotal') {
                        doc.setFontSize(7);
                        doc.setTextColor(...(subTotal > 0 ? ([30, 30, 40] as [number, number, number]) : ([160, 160, 180] as [number, number, number])));
                        // centered in column
                        doc.text(fmtMoney(subTotal), x + col.w / 2, midY, { align: 'center' });
                    } else if (col.key === 'desconto') {
                        doc.setFontSize(7);
                        if (desconto > 0) {
                            doc.setFont('helvetica', 'bold');
                            doc.setTextColor(160, 60, 0); // texto laranja escuro sobre fundo clarinho
                            doc.text(fmtMoney(desconto), x + col.w / 2, midY, { align: 'center' });
                        } else {
                            doc.setTextColor(160, 160, 180);
                            doc.text('R$ 0,00', x + col.w / 2, midY, { align: 'center' });
                        }
                    } else if (col.key === 'total') {
                        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
                        doc.setTextColor(...(totalVenda > 0 ? DARK : ([160, 160, 180] as [number, number, number])));
                        doc.text(fmtMoney(totalVenda), x + col.w / 2, midY, { align: 'center' });
                    }
                    x += col.w;
                });
            };

            const drawTotalsRow = (y: number) => {
                let x = MX;
                allCols.forEach(col => {
                    doc.setFillColor(...TOT_BG);
                    doc.rect(x, y, col.w, ROW_H, 'F');
                    doc.setDrawColor(...BORDER); doc.rect(x, y, col.w, ROW_H, 'S');
                    const midY = y + ROW_H / 2 + 2;
                    doc.setTextColor(...WHITE); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
                    if (col.key === 'categoria') {
                        doc.text('TOTAL', x + col.w / 2, midY, { align: 'center' });
                    } else if (col.key === 'subTotal') {
                        doc.text(fmtMoney(totals.subTotal), x + col.w / 2, midY, { align: 'center' });
                    } else if (col.key === 'desconto') {
                        if (totals.desconto > 0) doc.text(fmtMoney(totals.desconto), x + col.w / 2, midY, { align: 'center' });
                    } else if (col.key === 'total') {
                        doc.text(fmtMoney(totals.totalVenda), x + col.w / 2, midY, { align: 'center' });
                    }
                    x += col.w;
                });
            };

            // render
            setPdfProgress(65);
            drawPageBanner(page);
            let curY = MY + TITLE_H + 1;
            curY = drawResumoGeral(curY);
            curY = drawColHeaders(curY);

            // Itens não-stand (Merc., etc.) só são omitidos se TUDO estiver em branco/nulo
            const rowsForPdf = sorted.filter(row => {
                const cat = getCategoria(row.stand_nr);
                const isStand = cat ? (cat as any).is_stand !== false : true;
                if (isStand) return true;
                // tem cliente vinculado (FK) ou nome livre digitado
                if (row.cliente_id) return true;
                if (row.cliente_nome_livre && String(row.cliente_nome_livre).trim() !== '') return true;
                // tem tipo preenchido (não DISPONÍVEL)
                if (row.tipo_venda && row.tipo_venda !== 'DISPONÍVEL') return true;
                // tem QUALQUER opcional com algum valor não vazio
                const sel = (row.opcionais_selecionados as Record<string, string>) || {};
                if (Object.values(sel).some(v => v && v.trim() !== '')) return true;
                // tem desconto
                if (Number(row.desconto) > 0) return true;
                return false;
            });

            for (let i = 0; i < rowsForPdf.length; i++) {
                if (curY + ROW_H > PH - MY - ROW_H) {
                    doc.addPage(); page++;
                    drawPageBanner(page);
                    curY = MY + TITLE_H + 1;
                    curY = drawColHeaders(curY);
                }
                drawDataRow(rowsForPdf[i], curY);
                curY += ROW_H;
                if (i % 5 === 0) setPdfProgress(65 + Math.round((i / rowsForPdf.length) * 22));
            }
            if (curY + ROW_H > PH - MY) { doc.addPage(); curY = MY + TITLE_H + 1; }
            drawTotalsRow(curY);

            setPdfProgress(90);
            const blob = doc.output('blob');
            const url = URL.createObjectURL(blob);
            setPdfProgress(100);
            await new Promise(r => setTimeout(r, 500));
            setPdfProgress(null);
            setDocModal({ tipo: 'relatorio_pdf', url, edicaoTitulo: edicao.titulo, isPdfBlob: true });
        } catch (err: any) {
            setPdfProgress(null);
            await appDialog.alert({ title: 'Erro ao gerar PDF', message: err?.message || 'Erro desconhecido.', type: 'danger' });
        }
    };

    return {
        pdfProgress,
        pdfTitle,
        handleExportPdf,
    };
};
