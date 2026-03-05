import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, Button, Badge, LoadingSpinner } from '../components/UI';
import { eventosService, EventoEdicao } from '../services/eventosService';
import { edicaoDocsService } from '../services/edicaoDocsService';
import DashboardAlerts from '../components/DashboardAlerts';
import ResolucaoAtendimentoModal from '../components/ResolucaoAtendimentoModal';
import { Atendimento } from '../services/atendimentosService';
import { useAuth } from '../context/AuthContext';
import { usePresence } from '../context/PresenceContext';
import { useAppDialog } from '../context/DialogContext';
import { authService, User } from '../services/authService';
import { planilhaVendasService, CategoriaSetup } from '../services/planilhaVendasService';
import { itensOpcionaisService } from '../services/itensOpcionaisService';
import { clientesService } from '../services/clientesService';

type EdicaoComDocs = EventoEdicao & {
    eventos: { nome: string } | null;
    proposta_comercial_path?: string | null;
    planta_baixa_path?: string | null;
};

type DocModalState = { tipo: 'proposta_comercial' | 'planta_baixa' | 'relatorio_pdf'; url: string; edicaoTitulo: string; isPdfBlob?: boolean } | null;

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { onlineUsers } = usePresence();
    const appDialog = useAppDialog();
    const [edicoes, setEdicoes] = useState<EdicaoComDocs[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State for Alerts & Resolution
    const [selectedAtendimento, setSelectedAtendimento] = useState<Atendimento | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [docModal, setDocModal] = useState<DocModalState>(null);
    const [pdfProgress, setPdfProgress] = useState<number | null>(null);
    const [pdfTitle, setPdfTitle] = useState('');

    // State for "Criar acesso ao promotor" modal
    type PromoStep = 'confirm' | 'existing' | 'create' | 'created';
    const [promoModal, setPromoModal] = useState<{ edicao: EdicaoComDocs; step: PromoStep } | null>(null);
    const [allVisitors, setAllVisitors] = useState<User[]>([]);
    const [promoExpiresAt, setPromoExpiresAt] = useState('');
    const [promoCreated, setPromoCreated] = useState<{ user: User; passwordRaw: string } | null>(null);
    const [promoLoading, setPromoLoading] = useState(false);

    useEffect(() => {
        fetchActiveEdicoes();
        // Carrega visitantes ativos para checar duplicatas por edição
        authService.getAllUsers().then(users => {
            setAllVisitors(users.filter((u: User) =>
                u.isVisitor && u.isActive !== false &&
                (!u.expiresAt || new Date(u.expiresAt) >= new Date())
            ));
        }).catch(() => { });
    }, []);

    const fetchActiveEdicoes = async () => {
        try {
            setIsLoading(true);
            const data = await eventosService.getActiveEdicoes();
            setEdicoes(data as EdicaoComDocs[]);
        } catch (err: any) {
            console.error('Erro ao buscar edições ativas:', err);
            setError('Não foi possível carregar o dashboard.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResolutionSuccess = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    const handleOpenPromoModal = (e: React.MouseEvent, edicao: EdicaoComDocs) => {
        e.stopPropagation();
        setPromoExpiresAt('');
        setPromoCreated(null);
        setPromoModal({ edicao, step: 'confirm' });
    };

    const handlePromoConfirm = () => {
        if (!promoModal) return;
        const existing = allVisitors.find(u => u.edicaoId === promoModal.edicao.id) ?? null;
        if (existing) {
            setPromoModal({ ...promoModal, step: 'existing' });
        } else {
            setPromoModal({ ...promoModal, step: 'create' });
        }
    };

    const handlePromoCreate = async () => {
        if (!promoModal || !promoExpiresAt) return;
        setPromoLoading(true);
        try {
            const result = await authService.createTempUser(
                new Date(promoExpiresAt),
                promoModal.edicao.id,
                promoModal.edicao.titulo
            );
            setPromoCreated(result);
            setAllVisitors(prev => [...prev, result.user]);
            setPromoModal({ ...promoModal, step: 'created' });
        } catch (err: any) {
            await appDialog.alert({ title: 'Erro', message: 'Erro ao criar acesso: ' + err.message, type: 'danger' });
        } finally {
            setPromoLoading(false);
        }
    };

    const closePromoModal = () => {
        setPromoModal(null);
        setPromoExpiresAt('');
        setPromoCreated(null);
    };

    const handleExportPdf = async (e: React.MouseEvent, edicao: EdicaoComDocs) => {
        e.stopPropagation();
        setPdfProgress(0);
        setPdfTitle(edicao.titulo);
        try {
            const config = await planilhaVendasService.getConfig(edicao.id);
            if (!config) {
                setPdfProgress(null);
                await appDialog.alert({ title: 'Aviso', message: 'Esta edi\u00e7\u00e3o n\u00e3o possui configura\u00e7\u00e3o de planilha.', type: 'warning' });
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
                    if (tipo === 'STAND PADR\u00c3O') precoBase = cat.standBase || 0;
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
            const comboLabels: string[] = ['STAND PADR\u00c3O'];
            for (let i = 1; i <= maxCombos; i++) comboLabels.push('COMBO ' + String(i).padStart(2, '0'));
            const customNames = categorias[0]?.comboNames || [];
            const comboDisplay: Record<string, string> = {};
            comboDisplay['STAND PADR\u00c3O'] = 'STAND PADR\u00c3O';
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
                if (row.tipo_venda !== 'DISPON\u00cdVEL' && isSt) vendasCount++;
                const base = row.tipo_venda.replace('*', '').trim();
                if (!row.tipo_venda.endsWith('*') && row.tipo_venda !== 'DISPON\u00cdVEL')
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

            let page = 1;

            const drawPageBanner = (pg: number) => {
                doc.setFillColor(...DARK);
                doc.rect(MX, MY, AW, TITLE_H, 'F');
                doc.setTextColor(...WHITE);
                doc.setFontSize(10); doc.setFont('helvetica', 'bold');
                const ttl = ((edicao.eventos?.nome || '') + '  \u2014  ' + edicao.titulo).toUpperCase();
                doc.text(ttl, MX + 4, MY + 6.5);
                doc.setFontSize(7); doc.setFont('helvetica', 'normal');
                // 3mm afastado da borda direita
                doc.text('Gerado em ' + new Date().toLocaleDateString('pt-BR') + '  |  P\u00e1g. ' + pg, PW - MX - 3, MY + 6.5, { align: 'right' });
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
                const finColors: [number, number, number][] = [WHITE, GOLD, WHITE];
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
                const isAvail = row.tipo_venda === 'DISPON\u00cdVEL';
                const catBg: [number, number, number] = cat ? (catColors[cat.tag] ?? WHITE) : WHITE;
                const rowBg: [number, number, number] = isAvail
                    ? [Math.min(255, catBg[0] + 12), Math.min(255, catBg[1] + 12), Math.min(255, catBg[2] + 12)]
                    : catBg;
                const clienteNome = row.cliente_nome_livre
                    || listaClientes.find(c => c.id === row.cliente_id)?.nome_fantasia
                    || listaClientes.find(c => c.id === row.cliente_id)?.razao_social || '';

                let x = MX;
                allCols.forEach(col => {
                    const isFin = col.key === 'subTotal' || col.key === 'desconto' || col.key === 'total';
                    doc.setFillColor(...(isFin ? ([248, 250, 253] as [number, number, number]) : rowBg));
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
                        if (isAvail) {
                            doc.setTextColor(140, 140, 160); doc.setFont('helvetica', 'italic'); doc.setFontSize(7);
                            doc.text('DISPON\u00cdVEL', x + 2, midY);
                        } else {
                            doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
                            const t = doc.splitTextToSize(clienteNome.toUpperCase(), col.w - 3)[0] || '';
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
                            // centro do quadrado interno + ajuste baseline 8pt
                            const boxCenterY = y + pad + (ROW_H - pad * 2) / 2 + 1.0;
                            doc.text(isStar ? '*' : 'x', x + col.w / 2, boxCenterY, { align: 'center' });
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
                            const boxCenterY2 = y + pad + (ROW_H - pad * 2) / 2 + 1.0;
                            doc.text(val, x + col.w / 2, boxCenterY2, { align: 'center' });
                        }
                    } else if (col.key === 'subTotal') {
                        doc.setFontSize(7);
                        doc.setTextColor(...(subTotal > 0 ? ([30, 30, 40] as [number, number, number]) : ([160, 160, 180] as [number, number, number])));
                        // centered in column
                        doc.text(fmtMoney(subTotal), x + col.w / 2, midY, { align: 'center' });
                    } else if (col.key === 'desconto') {
                        // always white text, no amber
                        doc.setFontSize(7); doc.setTextColor(...WHITE);
                        if (desconto > 0) {
                            // highlight background for discount
                            doc.setFillColor(200, 90, 0);
                            doc.rect(x, y, col.w, ROW_H, 'F');
                            doc.setFont('helvetica', 'bold');
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
                        doc.setTextColor(...GOLD);
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

            for (let i = 0; i < sorted.length; i++) {
                if (curY + ROW_H > PH - MY - ROW_H) {
                    doc.addPage(); page++;
                    drawPageBanner(page);
                    curY = MY + TITLE_H + 1;
                    curY = drawColHeaders(curY);
                }
                drawDataRow(sorted[i], curY);
                curY += ROW_H;
                if (i % 5 === 0) setPdfProgress(65 + Math.round((i / sorted.length) * 22));
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

    const allPanelButton = (
        <button
            onClick={() => navigate('/todos-eventos')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all shadow-sm"
        >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Todos os Eventos
        </button>
    );

    const onlineBadge = user?.isAdmin ? (
        <div className="relative group/online flex-shrink-0">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-default select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
                <span className="text-[11px] text-slate-400 leading-none">{onlineUsers.length}</span>
            </div>
            {/* Tooltip */}
            <div className="absolute left-0 top-full mt-2 z-50 hidden group-hover/online:block min-w-[200px] pointer-events-none">
                <div className="bg-slate-900 rounded-xl shadow-2xl p-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Online agora</p>
                    {onlineUsers.length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic">Nenhum usuário</p>
                    ) : (
                        <div className="flex flex-col gap-1.5">
                            {onlineUsers.map((u) => (
                                <div key={u.user_id} className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-[9px] font-black text-white uppercase flex-shrink-0">
                                        {u.name.substring(0, 2)}
                                    </div>
                                    <span className="text-[11px] font-medium text-white truncate flex-1">{u.name}</span>
                                    {u.sessionCount > 1 && (
                                        <span className="text-[9px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full flex-shrink-0 tabular-nums">
                                            ×{u.sessionCount}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    ) : null;

    return (
        <Layout title="Dashboard Central" titleExtras={onlineBadge} headerActions={allPanelButton}>
            <div className="max-w-7xl mx-auto space-y-[2px] animate-in fade-in duration-500">
                <div className="border-t border-slate-100 pt-1">
                    <h2 className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        Edições Ativas
                    </h2>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm font-medium mb-6">
                            {error}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex justify-center p-12">
                            <LoadingSpinner size="lg" />
                        </div>
                    ) : edicoes.length === 0 ? (
                        <Card className="text-center py-16 bg-white border border-slate-200 rounded-xl shadow-sm">
                            <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <h3 className="mt-4 text-sm font-medium text-slate-900">Nenhuma edição ativa no momento</h3>
                            <p className="mt-1 text-sm text-slate-500">Crie um novo evento ou ative uma edição existente para visualizá-la aqui.</p>
                            <div className="mt-6">
                                <Button onClick={() => navigate('/eventos/novo')}>
                                    Criar Novo Evento
                                </Button>
                            </div>
                        </Card>
                    ) : (
                        <div>
                            <Card className="overflow-hidden border-slate-200 shadow-sm transition-all hover:shadow-md">
                                <div className="bg-slate-50 px-4 py-1.5 border-b border-slate-200 flex justify-between items-center">
                                    <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Listagem de Edições
                                    </h3>
                                    <Badge variant="info" className="text-[10px]">{edicoes.length} encontrada(s)</Badge>
                                </div>

                                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                                    {edicoes.map((edicao) => (
                                        <div
                                            key={edicao.id}
                                            className="px-4 py-1 hover:bg-blue-50 transition-colors cursor-pointer group flex items-center justify-between"
                                            onClick={() => navigate(`/planilha-vendas/${edicao.id}`)}
                                        >
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1 rounded border border-blue-100 uppercase">
                                                        {edicao.ano}
                                                    </span>
                                                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest truncate max-w-[220px]">
                                                        {edicao.eventos?.nome || 'Evento'}
                                                    </span>
                                                    {(edicao.data_inicio || edicao.data_fim) && (
                                                        <span className="text-[9px] font-bold text-slate-600 uppercase font-mono bg-slate-50 px-1 rounded border border-slate-100">
                                                            {edicao.data_inicio ? new Date(edicao.data_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '...'} - {edicao.data_fim ? new Date(edicao.data_fim).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '...'}
                                                        </span>
                                                    )}

                                                    {edicao.local && (
                                                        <span className="text-[9px] text-slate-500 truncate italic">
                                                            • {edicao.local}
                                                        </span>
                                                    )}
                                                </div>

                                                <h4 className="text-[11px] font-medium text-slate-500 group-hover:text-blue-500 transition-colors truncate">
                                                    {edicao.titulo}
                                                </h4>
                                            </div>

                                            <div className="flex-shrink-0 flex items-center gap-4 pr-2">
                                                {/* Document quick-access buttons — sempre visíveis; X quando não cadastrado */}
                                                <div className="hidden sm:flex items-center gap-2 border-r border-slate-200 pr-4">
                                                    {/* Proposta Comercial */}
                                                    <div
                                                        className="flex items-center gap-1.5 group/prop cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (edicao.proposta_comercial_path) {
                                                                const url = edicaoDocsService.getPublicUrl(edicao.proposta_comercial_path);
                                                                setDocModal({ tipo: 'proposta_comercial', url, edicaoTitulo: edicao.titulo });
                                                            } else {
                                                                navigate(`/eventos/editar/${edicao.evento_id}`);
                                                            }
                                                        }}
                                                    >
                                                        <div className={`hidden lg:block text-[9px] font-bold uppercase tracking-tighter opacity-60 group-hover/prop:opacity-100 transition-opacity ${edicao.proposta_comercial_path ? 'text-violet-500' : 'text-slate-400'}`}>Proposta</div>
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm border ${edicao.proposta_comercial_path
                                                            ? 'bg-violet-50 text-violet-500 group-hover/prop:bg-violet-600 group-hover/prop:text-white border-violet-100'
                                                            : 'bg-slate-50 text-slate-300 group-hover/prop:bg-slate-200 group-hover/prop:text-slate-500 border-slate-100'
                                                            }`}>
                                                            {edicao.proposta_comercial_path ? (
                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* Planta Baixa */}
                                                    <div
                                                        className="flex items-center gap-1.5 group/planta cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (edicao.planta_baixa_path) {
                                                                const url = edicaoDocsService.getPublicUrl(edicao.planta_baixa_path);
                                                                setDocModal({ tipo: 'planta_baixa', url, edicaoTitulo: edicao.titulo });
                                                            } else {
                                                                navigate(`/eventos/editar/${edicao.evento_id}`);
                                                            }
                                                        }}
                                                    >
                                                        <div className={`hidden lg:block text-[9px] font-bold uppercase tracking-tighter opacity-60 group-hover/planta:opacity-100 transition-opacity ${edicao.planta_baixa_path ? 'text-teal-500' : 'text-slate-400'}`}>Planta</div>
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm border ${edicao.planta_baixa_path
                                                            ? 'bg-teal-50 text-teal-500 group-hover/planta:bg-teal-600 group-hover/planta:text-white border-teal-100'
                                                            : 'bg-slate-50 text-slate-300 group-hover/planta:bg-slate-200 group-hover/planta:text-slate-500 border-slate-100'
                                                            }`}>
                                                            {edicao.planta_baixa_path ? (
                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Botão: Criar acesso ao promotor — visível apenas para admins */}
                                                {user?.isAdmin && (
                                                    <div
                                                        className="flex items-center gap-1.5 group/promo cursor-pointer"
                                                        onClick={(e) => handleOpenPromoModal(e, edicao)}
                                                    >
                                                        <div className="hidden lg:block text-[9px] font-bold text-rose-400 uppercase tracking-tighter opacity-60 group-hover/promo:opacity-100 transition-opacity">Promotor</div>
                                                        <div className="w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center text-rose-400 group-hover/promo:bg-rose-400 group-hover/promo:text-white transition-all shadow-sm border border-rose-100">
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Controle de Imagens */}
                                                <div
                                                    className="flex items-center gap-2 group/img cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate('/controle-imagens', { state: { edicaoId: edicao.id } });
                                                    }}
                                                >
                                                    <div className="hidden sm:block text-[9px] font-bold text-purple-500 uppercase tracking-tighter opacity-60 group-hover/img:opacity-100 transition-opacity">
                                                        Imagens
                                                    </div>
                                                    <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 group-hover/img:bg-purple-600 group-hover/img:text-white transition-all shadow-sm border border-purple-100">
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                </div>

                                                <div
                                                    className="flex items-center gap-2 group/atend cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/atendimentos/${edicao.id}`);
                                                    }}
                                                >
                                                    <div className="hidden sm:block text-[9px] font-bold text-orange-500 uppercase tracking-tighter opacity-60 group-hover/atend:opacity-100 transition-opacity">
                                                        Abrir Atendimento
                                                    </div>
                                                    <div className="w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 group-hover/atend:bg-orange-500 group-hover/atend:text-white transition-all shadow-sm border border-orange-100">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
                                                        </svg>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 group/planilha cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/planilha-vendas/${edicao.id}`); }}>
                                                    <div className="hidden sm:block text-[9px] font-bold text-blue-600 uppercase tracking-tighter opacity-70 group-hover/planilha:opacity-100 transition-opacity">
                                                        Abrir Planilha
                                                    </div>
                                                    <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover/planilha:bg-blue-600 group-hover/planilha:text-white transition-all shadow-sm border border-blue-100">
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </div>
                                                </div>

                                                {/* Exportar PDF */}
                                                <div
                                                    className="flex items-center gap-2 group/pdf cursor-pointer"
                                                    onClick={(e) => handleExportPdf(e, edicao)}
                                                >
                                                    <div className="hidden sm:block text-[9px] font-bold text-emerald-600 uppercase tracking-tighter opacity-70 group-hover/pdf:opacity-100 transition-opacity">
                                                        Exportar PDF
                                                    </div>
                                                    <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover/pdf:bg-emerald-600 group-hover/pdf:text-white transition-all shadow-sm border border-emerald-100">
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex justify-center">
                                    <span className="text-[10px] font-medium text-slate-400 italic">
                                        Role para ver mais edições (se houver)
                                    </span>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>

                {/* Dashboard Alerts - Highlighted Follow-ups */}
                <div className="border-t border-slate-100 pt-6">
                    <DashboardAlerts
                        onOpenResolucao={(a) => setSelectedAtendimento(a)}
                        refreshTrigger={refreshTrigger}
                    />
                </div>


                {/* Modal: Progresso de Geração de PDF */}
                {pdfProgress !== null && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-[340px] p-7 flex flex-col items-center gap-5">
                            <div className="w-14 h-14 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center">
                                <svg className="w-7 h-7 text-emerald-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6" />
                                </svg>
                            </div>
                            <div className="text-center w-full">
                                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Gerando PDF</p>
                                <p className="text-[13px] font-black text-slate-800 truncate max-w-[280px] text-center">{pdfTitle}</p>
                            </div>
                            <div className="w-full">
                                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1.5">
                                    <span>Processando...</span>
                                    <span className="text-emerald-600 font-black">{pdfProgress}%</span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300 ease-out"
                                        style={{ width: `${pdfProgress}%` }}
                                    />
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-400 text-center">
                                {pdfProgress < 30 ? 'Carregando dados da planilha...' :
                                    pdfProgress < 60 ? 'Organizando estandes...' :
                                        pdfProgress < 90 ? 'Montando tabela PDF...' :
                                            'Finalizando documento...'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Modal: Ações de Documento (Proposta / Planta Baixa / PDF) */}
                {docModal && (() => {
                    const label = docModal.tipo === 'proposta_comercial' ? 'Proposta Comercial' : docModal.tipo === 'planta_baixa' ? 'Planta Baixa' : 'Relatório PDF';
                    const url = docModal.url;
                    const nomeEdicao = docModal.edicaoTitulo.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
                    const prefix = docModal.tipo === 'proposta_comercial' ? 'PROPOSTA_COMERCIAL' : docModal.tipo === 'planta_baixa' ? 'PLANTA_BAIXA' : 'RELATORIO_PDF';
                    const ext = docModal.isPdfBlob ? 'pdf' : (url.split('.').pop()?.split('?')[0] || 'pdf');
                    const fileName = `${prefix}_${nomeEdicao}.${ext}`;
                    const handleDownload = async () => {
                        try {
                            const response = await fetch(url);
                            const blob = await response.blob();
                            const objectUrl = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = objectUrl;
                            a.download = fileName;
                            a.click();
                            URL.revokeObjectURL(objectUrl);
                        } catch {
                            alert('Não foi possível baixar o arquivo.');
                        }
                    };
                    const handleShare = async () => {
                        try {
                            const response = await fetch(url);
                            const blob = await response.blob();
                            const file = new File([blob], fileName, { type: blob.type });
                            if (typeof navigator.share !== 'function') {
                                alert('Seu navegador não suporta compartilhamento. Use o botão Baixar.');
                                return;
                            }
                            try {
                                await navigator.share({ files: [file], title: fileName });
                            } catch (shareErr: unknown) {
                                if (shareErr instanceof Error && shareErr.name === 'AbortError') return;
                                try {
                                    await navigator.share({ title: fileName, url });
                                } catch {
                                    alert('Não foi possível compartilhar. Use o botão Baixar.');
                                }
                            }
                        } catch {
                            alert('Não foi possível preparar o arquivo para compartilhar.');
                        }
                    };
                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDocModal(null)}>
                            <div className="bg-white rounded-2xl shadow-2xl w-[320px] p-6 flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
                                <div className="w-16 h-16 rounded-full bg-green-50 border-4 border-green-100 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div className="text-center">
                                    <p className="text-[11px] text-slate-500 font-medium">O que deseja fazer com a</p>
                                    <p className="text-[13px] font-black text-slate-800 uppercase tracking-wide">{label}?</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[250px]">{docModal.edicaoTitulo}</p>
                                </div>
                                <div className="w-full flex flex-col gap-2">
                                    <button
                                        onClick={() => window.open(url, '_blank')}
                                        className="w-full py-3 rounded-xl bg-blue-600 text-white font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        Visualizar
                                    </button>
                                    <button
                                        onClick={handleDownload}
                                        className="w-full py-3 rounded-xl bg-slate-800 text-white font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        Baixar
                                    </button>
                                    <button
                                        onClick={handleShare}
                                        className="w-full py-3 rounded-xl bg-green-600 text-white font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                        Compartilhar
                                    </button>
                                </div>
                                <button onClick={() => setDocModal(null)} className="text-[11px] text-slate-400 hover:text-slate-600 font-medium transition-colors">
                                    Fechar
                                </button>
                            </div>
                        </div>
                    );
                })()}

                {/* Modal: Criar acesso ao promotor */}
                {promoModal && (() => {
                    const existingVisitor = allVisitors.find(u => u.edicaoId === promoModal.edicao.id) ?? null;

                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closePromoModal}>
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                                {/* Header */}
                                <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-white font-black text-sm uppercase tracking-widest">Acesso ao Promotor</h2>
                                        <p className="text-red-200 text-[10px] font-bold mt-0.5 uppercase tracking-wide truncate max-w-[260px]">{promoModal.edicao.titulo}</p>
                                    </div>
                                    <button onClick={closePromoModal} className="text-red-200 hover:text-white p-1 transition-colors">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>

                                <div className="p-6 space-y-5">
                                    {/* STEP 1: Confirmação */}
                                    {promoModal.step === 'confirm' && (
                                        <>
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800">Liberar acesso externo à planilha</p>
                                                    <p className="text-[12px] text-slate-600 mt-1.5 leading-relaxed">
                                                        Você está prestes a gerar um <strong>acesso temporário de leitura</strong> para um promotor ou representante externo. Essa pessoa poderá visualizar a planilha de vendas e o histórico de atendimentos desta edição — <strong>sem permissão para alterar nenhum dado</strong>.
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 mt-2">Certifique-se de enviar as credenciais apenas para a pessoa autorizada.</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3 pt-1">
                                                <button onClick={closePromoModal} className="flex-1 py-2.5 text-xs font-bold text-slate-600 border border-slate-300 hover:border-slate-500 transition-colors">
                                                    Cancelar
                                                </button>
                                                <button onClick={handlePromoConfirm} className="flex-1 py-2.5 text-xs font-black text-white bg-red-600 hover:bg-red-700 transition-colors">
                                                    Entendido, prosseguir
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {/* STEP 2a: Já existe visitante — só cópia */}
                                    {promoModal.step === 'existing' && existingVisitor && (
                                        <>
                                            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-2">
                                                <span className="text-amber-500 text-base flex-shrink-0">⚠️</span>
                                                <p className="text-[11px] text-amber-800 font-bold">Já existe um acesso ativo para esta edição. Copie e envie as credenciais abaixo.</p>
                                            </div>
                                            <div className="bg-slate-50 border border-slate-200 p-3 space-y-2 text-xs font-mono rounded-lg">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-500 font-sans font-bold uppercase text-[10px]">Usuário:</span>
                                                    <div className="flex items-center gap-2">
                                                        <code className="text-slate-800 font-black">{existingVisitor.email.replace('@temp.local', '')}</code>
                                                        <button onClick={() => navigator.clipboard.writeText(existingVisitor.email.replace('@temp.local', ''))} className="text-[10px] text-blue-600 hover:underline font-sans">Copiar</button>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-500 font-sans font-bold uppercase text-[10px]">Senha:</span>
                                                    <div className="flex items-center gap-2">
                                                        {existingVisitor.tempPasswordPlain ? (
                                                            <>
                                                                <code className="text-slate-800 font-black tracking-wider">{existingVisitor.tempPasswordPlain}</code>
                                                                <button onClick={() => navigator.clipboard.writeText(existingVisitor.tempPasswordPlain!)} className="text-[10px] text-blue-600 hover:underline font-sans">Copiar</button>
                                                            </>
                                                        ) : (
                                                            <span className="text-slate-400 italic font-sans text-[10px]">não disponível</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-500 font-sans font-bold uppercase text-[10px]">Expira em:</span>
                                                    <code className="text-amber-700 font-black">{existingVisitor.expiresAt ? new Date(existingVisitor.expiresAt).toLocaleDateString('pt-BR') : '—'}</code>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <button
                                                    onClick={() => {
                                                        const login = existingVisitor.email.replace('@temp.local', '');
                                                        const senha = existingVisitor.tempPasswordPlain ?? '(não disponível)';
                                                        const expira = existingVisitor.expiresAt ? new Date(existingVisitor.expiresAt).toLocaleDateString('pt-BR') : '—';
                                                        const msg = `*Acesso Temporário - Dbarros Rural*\n\nOlá! Segue seu acesso de visitante para *${promoModal.edicao.titulo}*:\n\n🔗 *Link:* https://dbarros.vercel.app/#/login\n👤 *Usuário:* ${login}\n🔑 *Senha:* ${senha}\n\n📅 *Válido até:* ${expira}\n\nAcesse para visualizar a planilha e atendimentos.`;
                                                        navigator.clipboard.writeText(msg);
                                                    }}
                                                    className="w-full flex items-center justify-center gap-2 py-3 text-xs font-black text-white bg-slate-800 hover:bg-slate-950 transition-colors rounded-lg"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                    Copiar texto para WhatsApp
                                                </button>
                                                <p className="text-[10px] text-slate-400 text-center">Clique para copiar. Depois abra o WhatsApp e cole a mensagem pronta.</p>
                                            </div>
                                            <button onClick={closePromoModal} className="w-full py-2 text-[10px] font-bold text-slate-500 hover:text-slate-800 transition-colors">Fechar</button>
                                        </>
                                    )}

                                    {/* STEP 2b: Nenhum visitante — criar novo */}
                                    {promoModal.step === 'create' && (
                                        <>
                                            <p className="text-sm text-slate-600">Nenhum acesso ativo encontrado para esta edição. Defina a data de validade e gere o acesso.</p>
                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Data Limite de Acesso</label>
                                                <input
                                                    type="date"
                                                    value={promoExpiresAt}
                                                    onChange={e => setPromoExpiresAt(e.target.value)}
                                                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-red-500 text-sm font-bold text-slate-800 p-3 rounded-lg outline-none transition-all"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="flex gap-3">
                                                <button onClick={closePromoModal} className="flex-1 py-2.5 text-xs font-bold text-slate-600 border border-slate-300 hover:border-slate-500 transition-colors rounded-lg">
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={handlePromoCreate}
                                                    disabled={promoLoading || !promoExpiresAt}
                                                    className="flex-1 py-2.5 text-xs font-black text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors rounded-lg"
                                                >
                                                    {promoLoading ? 'Gerando...' : 'Gerar Acesso'}
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {/* STEP 3: Criado com sucesso */}
                                    {promoModal.step === 'created' && promoCreated && (
                                        <>
                                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                                <p className="text-sm font-black text-slate-800">Acesso criado com sucesso!</p>
                                            </div>
                                            <div className="space-y-2">
                                                <div>
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Login de Acesso</label>
                                                    <div className="flex bg-slate-50 border border-slate-200 p-1 rounded-lg">
                                                        <code className="flex-1 px-3 py-2 text-sm font-black text-slate-800 break-all">{promoCreated.user.email.replace('@temp.local', '')}</code>
                                                        <button onClick={() => navigator.clipboard.writeText(promoCreated.user.email.replace('@temp.local', ''))} className="p-2 text-slate-400 hover:text-slate-900 transition-colors" title="Copiar">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Senha</label>
                                                    <div className="flex bg-slate-50 border border-slate-200 p-1 rounded-lg">
                                                        <code className="flex-1 px-3 py-2 text-sm font-black text-slate-800 tracking-wider">{promoCreated.passwordRaw}</code>
                                                        <button onClick={() => navigator.clipboard.writeText(promoCreated.passwordRaw)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors" title="Copiar">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-lg">
                                                        <span className="text-[9px] font-black text-amber-600 uppercase block mb-0.5">Expira em</span>
                                                        <span className="text-xs font-black text-amber-900">{new Date(promoCreated.user.expiresAt!).toLocaleDateString('pt-BR')}</span>
                                                    </div>
                                                    <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-lg">
                                                        <span className="text-[9px] font-black text-blue-600 uppercase block mb-0.5">Acesso em</span>
                                                        <span className="text-[10px] font-black text-blue-800">dbarros.vercel.app</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <button
                                                    onClick={() => {
                                                        const login = promoCreated.user.email.replace('@temp.local', '');
                                                        const expira = new Date(promoCreated.user.expiresAt!).toLocaleDateString('pt-BR');
                                                        const msg = `*Acesso Temporário - Dbarros Rural*\n\nOlá! Segue seu acesso de visitante para *${promoModal.edicao.titulo}*:\n\n🔗 *Link:* https://dbarros.vercel.app/#/login\n👤 *Usuário:* ${login}\n🔑 *Senha:* ${promoCreated.passwordRaw}\n\n📅 *Válido até:* ${expira}\n\nAcesse para visualizar a planilha e atendimentos.`;
                                                        navigator.clipboard.writeText(msg);
                                                    }}
                                                    className="w-full flex items-center justify-center gap-2 py-3 text-xs font-black text-white bg-slate-800 hover:bg-slate-950 transition-colors rounded-lg"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                    Copiar texto para WhatsApp
                                                </button>
                                                <p className="text-[10px] text-slate-400 text-center">Clique para copiar. Depois abra o WhatsApp e cole a mensagem pronta.</p>
                                            </div>
                                            <button onClick={closePromoModal} className="w-full py-2 text-[10px] font-bold text-slate-500 hover:text-slate-800 transition-colors">Fechar</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Modals */}
                {selectedAtendimento && (
                    <ResolucaoAtendimentoModal
                        atendimento={selectedAtendimento}
                        onClose={() => setSelectedAtendimento(null)}
                        onSuccess={handleResolutionSuccess}
                    />
                )}
            </div>

        </Layout>
    );
};

export default Dashboard;