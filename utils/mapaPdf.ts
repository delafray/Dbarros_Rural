/**
 * PDF do Mapa de Vendas (botão 🖨️ Imprimir, 18/09): A3 deitado, VETORIAL.
 * Fundo = imagem (única parte raster); estandes = polígonos; textos = fonte embutida
 * (LiberationSans Bold) — abrem nítidos em qualquer zoom. Mesmas regras de rótulo da tela
 * (código + m², ou nome no modo Nomes: direção e linhas de layoutNomeEstande).
 *
 * Unidade 'pt' e página exatamente do tamanho do viewBox da planta (1190,55 × 841,89 pt = A3
 * deitado): coordenadas do mapa entram 1:1, sem conversão.
 */
import type { jsPDF } from 'jspdf';
import {
    ESTILO_STATUS,
    StatusEstande,
    EstandeMapa,
    parseViewBox,
    tamanhoFonteRotulo,
    layoutNomeEstande,
    bboxDePontos,
} from './mapaCalc';

export interface ItemMapaPdf {
    estande: EstandeMapa;
    status: StatusEstande;
    rotuloMapa: string | null;
}

export interface OpcoesMapaPdf {
    viewBox: string;
    itens: ItemMapaPdf[];
    mostrarNomes: boolean;
    /** dataURL PNG/JPEG do fundo (null = só os polígonos). */
    fundo?: { data: string; formato: 'PNG' | 'JPEG' } | null;
    titulo?: string;
}

const FONTE = 'LiberationSans';

function hex(doc: jsPDF, h: string): [number, number, number] {
    const v = h.replace('#', '');
    return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

/**
 * Desenha um texto centralizado em (cx, cy), com rotação opcional (graus, sentido do SVG).
 * O jsPDF aplica `align`/`baseline` ANTES de girar (no eixo da página), o que desloca o texto
 * virado. Por isso o ponto de partida (esquerda, linha-base) é calculado aqui no eixo girado.
 */
function textoCentrado(doc: jsPDF, texto: string, cx: number, cy: number, size: number, cor: string, rotacaoSvg = 0) {
    doc.setFontSize(size);
    doc.setTextColor(...hex(doc, cor));
    const angulo = -rotacaoSvg; // jsPDF: positivo = anti-horário; SVG rotate(-45) é anti-horário na tela
    const a = (angulo * Math.PI) / 180;
    const w = doc.getTextWidth(texto);
    // direção do texto na página (y para baixo) e "para baixo" no quadro do texto (do meio até a linha-base)
    const dx = Math.cos(a), dy = -Math.sin(a);
    const nx = Math.sin(a), ny = Math.cos(a);
    const meio = size * 0.35; // altura-x/2 aproximada: leva o meio visual do texto até a linha-base
    const x = cx - dx * (w / 2) + nx * meio;
    const y = cy - dy * (w / 2) + ny * meio;
    doc.text(texto, x, y, { angle: angulo });
}

/**
 * Monta o documento (síncrono, dado o jsPDF já carregado e as fontes registradas).
 * Separado de `gerarMapaPdf` para poder ser testado sem rede.
 */
export function desenharMapaPdf(doc: jsPDF, o: OpcoesMapaPdf, fonteDisponivel = true): void {
    const box = parseViewBox(o.viewBox);
    if (!box) throw new Error('viewBox inválido');
    if (fonteDisponivel) doc.setFont(FONTE, 'bold'); else doc.setFont('helvetica', 'bold');

    if (o.fundo) doc.addImage(o.fundo.data, o.fundo.formato, box.x, box.y, box.w, box.h);

    const GState = (doc as any).GState;
    for (const { estande, status, rotuloMapa } of o.itens) {
        if (!estande.pontos || estande.pontos.length < 3) continue;
        const estilo = ESTILO_STATUS[status];
        doc.setFillColor(...hex(doc, estilo.fill));
        doc.setDrawColor(...hex(doc, estilo.stroke));
        doc.setLineWidth(0.4);
        if (GState) doc.setGState(new GState({ opacity: 0.85, 'stroke-opacity': 0.85 }));
        const p0 = estande.pontos[0];
        const segs = estande.pontos.slice(1).map((p, i) => {
            const prev = estande.pontos[i];
            return [p[0] - prev[0], p[1] - prev[1]];
        });
        doc.lines(segs, p0[0], p0[1], [1, 1], 'FD', true);
        if (GState) doc.setGState(new GState({ opacity: 1, 'stroke-opacity': 1 }));

        const [cx, cy] = estande.centro;
        const nome = o.mostrarNomes && rotuloMapa ? layoutNomeEstande(estande.pontos, rotuloMapa) : null;
        if (nome) {
            if (nome.linhas.length === 1) {
                textoCentrado(doc, nome.linhas[0], cx, cy, nome.fonte, estilo.texto, nome.rotacao);
            } else {
                // duas linhas: mesmo deslocamento do SVG (−0,55em / +0,55em), no eixo já rotacionado
                const d = nome.fonte * 0.55;
                const rad = (nome.rotacao * Math.PI) / 180;
                const dx = -Math.sin(rad) * d, dy = Math.cos(rad) * d; // "para cima" no eixo do texto
                textoCentrado(doc, nome.linhas[0], cx - dx, cy - dy, nome.fonte, estilo.texto, nome.rotacao);
                textoCentrado(doc, nome.linhas[1], cx + dx, cy + dy, nome.fonte, estilo.texto, nome.rotacao);
            }
            continue;
        }
        const fonte = tamanhoFonteRotulo(estande.pontos, estande.codigo);
        if (fonte <= 0) continue;
        const bb = bboxDePontos(estande.pontos);
        const comArea = estande.area != null && !!bb && bb.h >= fonte * 2.1;
        if (comArea) {
            textoCentrado(doc, estande.codigo, cx, cy - fonte * 0.42, fonte, estilo.texto);
            textoCentrado(doc, `${estande.area} m²`, cx, cy + fonte * 0.73, fonte * 0.62, estilo.texto);
        } else {
            textoCentrado(doc, estande.codigo, cx, cy, fonte, estilo.texto);
        }
    }
    if (o.titulo) doc.setProperties({ title: o.titulo });
}

/** Gera o PDF (carrega jsPDF e as fontes sob demanda). Devolve o Blob para o modal Visualizar/Baixar/Compartilhar. */
export async function gerarMapaPdf(o: OpcoesMapaPdf): Promise<Blob> {
    const { jsPDF } = await import('jspdf');
    const { registrarFontesPdf } = await import('./pdfVetorial');
    const box = parseViewBox(o.viewBox);
    if (!box) throw new Error('viewBox inválido');
    const doc = new jsPDF({ unit: 'pt', format: [box.w, box.h], orientation: box.w >= box.h ? 'landscape' : 'portrait', compress: true });
    let fonteOk = true;
    try { await registrarFontesPdf(doc); } catch { fonteOk = false; }
    desenharMapaPdf(doc, o, fonteOk);
    return doc.output('blob');
}
