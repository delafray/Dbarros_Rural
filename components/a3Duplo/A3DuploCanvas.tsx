import React, { useLayoutEffect, useRef, useState } from 'react';
import Layout from '../Layout';
import { CardapioGroup } from '../../utils/cardapioParser';

export interface A3DuploMenuData {
  id?: string;
  titulo?: string;
  empresa: string;
  itens: CardapioGroup[];
}

// ─── Constantes de página A3 ────────────────────────────────────────────────
const MM_TO_PX = 96 / 25.4;
const A3_W_MM = 297;
const A3_H_MM = 420;
const PAGE_PAD_MM = 15;
const COL_GAP_MM = 10;

const CONTENT_W_PX = (A3_W_MM - 2 * PAGE_PAD_MM) * MM_TO_PX;
const CONTENT_H_PX = (A3_H_MM - 2 * PAGE_PAD_MM) * MM_TO_PX;

const COL_CHOICES = [2, 3, 4];
const SCALE_STEPS: number[] = (() => {
  const arr: number[] = [];
  for (let s = 1.0; s >= 0.5 - 1e-9; s -= 0.05) arr.push(Math.round(s * 100) / 100);
  return arr;
})();
const SPACING_STEPS = [1.0, 0.85, 0.7, 0.55];
const SPACING_COMPACT = 0.5; // usado na medição auxiliar

// Empresa fixada no início da primeira página (ignora ordem/balanceamento)
const PINNED_EMPRESA = 'BAR';
function isPinned(menu: A3DuploMenuData): boolean {
  return (menu.empresa || '').trim().toUpperCase() === PINNED_EMPRESA;
}

function resolveH(full: number, compact: number, spacing: number): number {
  // Interpolação linear entre spacing=1.0 (full) e spacing=0.5 (compact)
  const t = (1 - spacing) / (1 - SPACING_COMPACT);
  return full * (1 - t) + compact * t;
}

const GOLD = '#D4AF37';
const GOLD_BRIGHT = '#FFE066';
const BG_DARK = '#011464';

function colWidthPx(numCols: number): number {
  const gapTotal = (numCols - 1) * COL_GAP_MM * MM_TO_PX;
  return (CONTENT_W_PX - gapTotal) / numCols;
}

// ─── Tipos internos ─────────────────────────────────────────────────────────
interface EmpresaMeasurement {
  blockH_full: number;
  blockH_compact: number;
  headerH_full: number;
  headerH_compact: number;
  groupsH_full: number[];
  groupsH_compact: number[];
}

type MeasurementMatrix = Record<number, EmpresaMeasurement[]>;

interface ColumnContent {
  menuIdx: number;
  grupos: CardapioGroup[];
  isContinuacao: boolean;
}

interface LayoutResult {
  scale: number;
  spacing: number;
  numColunas: number;
  paginas: ColumnContent[][][];
  fallback?: boolean;
}

// ─── Componente EmpresaBlock ────────────────────────────────────────────────
interface EmpresaBlockProps {
  empresa: string;
  titulo?: string;
  grupos: CardapioGroup[];
  scale: number;
  spacing?: number;
  widthPx: number;
  isContinuacao?: boolean;
  containerRef?: (el: HTMLDivElement | null) => void;
  groupRefCallback?: (el: HTMLDivElement | null, gi: number) => void;
}

const EmpresaBlock: React.FC<EmpresaBlockProps> = ({
  empresa, titulo, grupos, scale, spacing = 1, widthPx, isContinuacao, containerRef, groupRefCallback,
}) => {
  return (
    <div
      ref={containerRef}
      style={{
        width: widthPx,
        marginBottom: `${15 * scale * spacing}px`,
        breakInside: 'avoid',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: `${10 * scale * spacing}px` }}>
        {titulo && !isContinuacao && (
          <div style={{
            fontSize: `${15 * scale}px`,
            color: GOLD_BRIGHT,
            textTransform: 'uppercase',
            marginBottom: '2px',
            fontWeight: 'bold',
          }}>{titulo}</div>
        )}
        <div style={{
          fontSize: `${26 * scale}px`,
          color: GOLD_BRIGHT,
          fontFamily: '"Arial Black", Impact, sans-serif',
          textTransform: 'uppercase',
          textShadow: `0 0 10px ${GOLD}55`,
          lineHeight: 1.05,
        }}>
          {empresa}{isContinuacao ? ' ›' : ''}
        </div>
        <div style={{
          margin: '6px auto',
          width: '60%',
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
          opacity: 0.8,
        }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: `${12 * scale * spacing}px` }}>
        {grupos.map((grupo, gi) => (
          <div
            key={gi}
            ref={(el) => groupRefCallback?.(el, gi)}
            style={{ breakInside: 'avoid' }}
          >
            <h3 style={{
              fontSize: `${15 * scale}px`,
              fontWeight: 900,
              color: GOLD_BRIGHT,
              marginTop: 0,
              marginBottom: `${6 * scale * spacing}px`,
              textTransform: 'uppercase',
              fontFamily: '"Arial Black", Impact, sans-serif',
              letterSpacing: '0.4px',
            }}>
              {grupo.categoria}
            </h3>
            {grupo.itens.map((item: any, ii: number) => (
              <div key={ii} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: `${5 * scale * spacing}px`,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: `${12.5 * scale}px`, color: '#FFFFFF', fontWeight: 600 }}>
                    {item.item}
                  </span>
                  {item.descricao && (
                    <span style={{
                      fontSize: `${9.5 * scale}px`,
                      color: '#b8cce0',
                      marginTop: '2px',
                      fontStyle: 'italic',
                      maxWidth: '85%',
                    }}>{item.descricao}</span>
                  )}
                </div>
                {item.valor && (
                  <span style={{
                    flex: 1,
                    minWidth: '12px',
                    margin: '0 8px',
                    borderBottom: '1px dotted rgba(184,204,224,0.55)',
                    alignSelf: 'baseline',
                  }} />
                )}
                <span style={{
                  fontSize: `${13 * scale}px`,
                  color: GOLD_BRIGHT,
                  fontWeight: 900,
                  fontFamily: '"Arial Black", Impact, sans-serif',
                  whiteSpace: 'nowrap',
                }}>{item.valor}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Algoritmo de distribuição ──────────────────────────────────────────────

type Chunk = { menuIdx: number; grupos: CardapioGroup[]; isContinuacao: boolean; h: number };
type EmpresaChunked = { idx: number; chunks: Chunk[]; altTotal: number };

function quebrarEmpresa(
  menu: A3DuploMenuData,
  idx: number,
  meas: EmpresaMeasurement,
  scale: number,
  spacing: number,
  pageH: number
): Chunk[] | null {
  const blockH = resolveH(meas.blockH_full, meas.blockH_compact, spacing) * scale;
  const grupos = menu.itens || [];

  if (blockH <= pageH) {
    return [{ menuIdx: idx, grupos, isContinuacao: false, h: blockH }];
  }

  const chunks: Chunk[] = [];
  const headerH = resolveH(meas.headerH_full, meas.headerH_compact, spacing) * scale;
  let currentGrupos: CardapioGroup[] = [];
  let currentH = headerH;

  for (let gi = 0; gi < grupos.length; gi++) {
    const gh = resolveH(meas.groupsH_full[gi] || 0, meas.groupsH_compact[gi] || 0, spacing) * scale;
    if (headerH + gh > pageH) return null;

    if (currentH + gh > pageH && currentGrupos.length > 0) {
      chunks.push({
        menuIdx: idx,
        grupos: currentGrupos,
        isContinuacao: chunks.length > 0,
        h: currentH,
      });
      currentGrupos = [];
      currentH = headerH;
    }
    currentGrupos.push(grupos[gi]);
    currentH += gh;
  }
  if (currentGrupos.length > 0) {
    chunks.push({
      menuIdx: idx,
      grupos: currentGrupos,
      isContinuacao: chunks.length > 0,
      h: currentH,
    });
  }
  return chunks;
}

function tentarLayout(
  menus: A3DuploMenuData[],
  meas: EmpresaMeasurement[],
  scale: number,
  spacing: number,
  numCols: number,
  pageH: number
): ColumnContent[][][] | null {
  const empresas: EmpresaChunked[] = [];
  for (let i = 0; i < menus.length; i++) {
    const chunks = quebrarEmpresa(menus[i], i, meas[i], scale, spacing, pageH);
    if (!chunks) return null;
    if (chunks.length > numCols) return null;
    const altTotal = chunks.reduce((s, c) => s + c.h, 0);
    empresas.push({ idx: i, chunks, altTotal });
  }

  // Separa empresas pinadas (ex: BAR) das demais. Pinadas vão 100% na página 0.
  const pinned = empresas.filter((e) => isPinned(menus[e.idx]));
  const others = empresas.filter((e) => !isPinned(menus[e.idx]));
  others.sort((a, b) => b.altTotal - a.altTotal);

  const pagEmpresas: EmpresaChunked[][] = [[], []];
  const pagAlturas = [0, 0];
  for (const p of pinned) {
    pagEmpresas[0].push(p);
    pagAlturas[0] += p.altTotal;
  }
  for (const e of others) {
    const p = pagAlturas[0] <= pagAlturas[1] ? 0 : 1;
    pagEmpresas[p].push(e);
    pagAlturas[p] += e.altTotal;
  }

  const paginas: ColumnContent[][][] = [];
  for (let pi = 0; pi < pagEmpresas.length; pi++) {
    const empresasDaPag = pagEmpresas[pi];
    // pinadas ficam no início; demais, ordenadas desc
    const pinadasDaPag = empresasDaPag.filter((e) => isPinned(menus[e.idx]));
    const othersDaPag = empresasDaPag.filter((e) => !isPinned(menus[e.idx]));
    othersDaPag.sort((a, b) => b.altTotal - a.altTotal);

    const colunas: ColumnContent[][] = Array.from({ length: numCols }, () => []);
    const alturasCol = new Array(numCols).fill(0);

    let falhou = false;

    // Aloca pinadas nas colunas iniciais em sequência
    let proximaCol = 0;
    for (const emp of pinadasDaPag) {
      const k = emp.chunks.length;
      if (proximaCol + k > numCols) { falhou = true; break; }
      for (let j = 0; j < k; j++) {
        if (alturasCol[proximaCol + j] + emp.chunks[j].h > pageH) { falhou = true; break; }
      }
      if (falhou) break;
      for (let j = 0; j < k; j++) {
        const c = emp.chunks[j];
        colunas[proximaCol + j].push({
          menuIdx: c.menuIdx, grupos: c.grupos, isContinuacao: c.isContinuacao,
        });
        alturasCol[proximaCol + j] += c.h;
      }
      proximaCol += k;
    }
    if (falhou) return null;

    for (const emp of othersDaPag) {
      if (emp.chunks.length === 1) {
        const c = emp.chunks[0];
        let bestCol = -1;
        let bestH = Infinity;
        for (let ci = 0; ci < numCols; ci++) {
          if (alturasCol[ci] + c.h <= pageH && alturasCol[ci] < bestH) {
            bestH = alturasCol[ci];
            bestCol = ci;
          }
        }
        if (bestCol === -1) { falhou = true; break; }
        colunas[bestCol].push({ menuIdx: c.menuIdx, grupos: c.grupos, isContinuacao: c.isContinuacao });
        alturasCol[bestCol] += c.h;
      } else {
        const k = emp.chunks.length;
        let startBest = -1;
        let maxFreeBest = -Infinity;
        for (let start = 0; start + k <= numCols; start++) {
          let ok = true;
          let freeSum = 0;
          for (let j = 0; j < k; j++) {
            if (alturasCol[start + j] + emp.chunks[j].h > pageH) { ok = false; break; }
            freeSum += (pageH - alturasCol[start + j]);
          }
          if (ok && freeSum > maxFreeBest) {
            maxFreeBest = freeSum;
            startBest = start;
          }
        }
        if (startBest === -1) { falhou = true; break; }
        for (let j = 0; j < k; j++) {
          const c = emp.chunks[j];
          colunas[startBest + j].push({
            menuIdx: c.menuIdx, grupos: c.grupos, isContinuacao: c.isContinuacao,
          });
          alturasCol[startBest + j] += c.h;
        }
      }
    }
    if (falhou) return null;
    paginas.push(colunas);
  }
  return paginas;
}

function calcularLayout(
  menus: A3DuploMenuData[],
  measurements: MeasurementMatrix,
  pageH: number
): LayoutResult {
  // Ordem: maximiza fonte; se não couber, compacta espaçamento; só depois aumenta colunas; por último reduz fonte.
  for (const scale of SCALE_STEPS) {
    for (const spacing of SPACING_STEPS) {
      for (const numCols of COL_CHOICES) {
        const meas = measurements[numCols];
        if (!meas) continue;
        const result = tentarLayout(menus, meas, scale, spacing, numCols, pageH);
        if (result) return { scale, spacing, numColunas: numCols, paginas: result };
      }
    }
  }
  const scale = SCALE_STEPS[SCALE_STEPS.length - 1];
  const spacing = SPACING_STEPS[SPACING_STEPS.length - 1];
  const numCols = 4;
  const paginas: ColumnContent[][][] = [0, 1].map(() => Array.from({ length: numCols }, () => [] as ColumnContent[]));
  menus.forEach((menu, idx) => {
    const pIdx = idx < Math.ceil(menus.length / 2) ? 0 : 1;
    const cIdx = idx % numCols;
    paginas[pIdx][cIdx].push({ menuIdx: idx, grupos: menu.itens || [], isContinuacao: false });
  });
  return { scale, spacing, numColunas: numCols, paginas, fallback: true };
}

// ─── Componente exportado ───────────────────────────────────────────────────
export interface A3DuploCanvasProps {
  menus: A3DuploMenuData[];
}

export const A3DuploCanvas: React.FC<A3DuploCanvasProps> = ({ menus }) => {
  const [phase, setPhase] = useState<'measuring' | 'ready'>('measuring');
  const [layout, setLayout] = useState<LayoutResult | null>(null);

  type RefBucket = { blockEl: HTMLDivElement | null; groupEls: (HTMLDivElement | null)[] };
  const measurementRefs = useRef<Record<number, { full: RefBucket[]; compact: RefBucket[] }>>({});

  if (Object.keys(measurementRefs.current).length === 0 && menus.length > 0) {
    const fresh: Record<number, { full: RefBucket[]; compact: RefBucket[] }> = {};
    for (const n of COL_CHOICES) {
      fresh[n] = {
        full: menus.map(() => ({ blockEl: null, groupEls: [] })),
        compact: menus.map(() => ({ blockEl: null, groupEls: [] })),
      };
    }
    measurementRefs.current = fresh;
  }

  useLayoutEffect(() => {
    if (phase !== 'measuring') return;
    if (menus.length === 0) return;

    const measurements: MeasurementMatrix = {};
    for (const n of COL_CHOICES) {
      const fullRefs = measurementRefs.current[n]?.full || [];
      const compactRefs = measurementRefs.current[n]?.compact || [];
      measurements[n] = menus.map((_, idx) => {
        const ef = fullRefs[idx];
        const ec = compactRefs[idx];
        const blockH_full = ef?.blockEl?.offsetHeight || 0;
        const blockH_compact = ec?.blockEl?.offsetHeight || 0;
        const groupsH_full = (ef?.groupEls || []).map((g) => g?.offsetHeight || 0);
        const groupsH_compact = (ec?.groupEls || []).map((g) => g?.offsetHeight || 0);
        const fg_full = ef?.groupEls?.[0];
        const fg_compact = ec?.groupEls?.[0];
        const headerH_full = fg_full ? fg_full.offsetTop : 0;
        const headerH_compact = fg_compact ? fg_compact.offsetTop : 0;
        return {
          blockH_full, blockH_compact,
          headerH_full, headerH_compact,
          groupsH_full, groupsH_compact,
        };
      });
    }

    const result = calcularLayout(menus, measurements, CONTENT_H_PX);
    setLayout(result);
    setPhase('ready');
  }, [phase, menus]);

  const handlePrint = () => window.print();

  const statusTxt = layout
    ? `Preview A3 Duplo — ${menus.length} empresa${menus.length === 1 ? '' : 's'} · ${layout.numColunas} col · fonte ${(layout.scale * 100).toFixed(0)}% · espaço ${(layout.spacing * 100).toFixed(0)}%${layout.fallback ? ' (estouro!)' : ''}`
    : 'Calculando layout…';

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: ${BG_DARK} !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .page-a3 {
            page-break-after: always;
            break-after: page;
            margin: 0 !important;
            box-shadow: none !important;
          }
          @page { size: A3 portrait; margin: 0; }
          .no-print { display: none !important; }
        }
      `}</style>

      {phase === 'measuring' && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: -99999,
            top: 0,
            visibility: 'hidden',
            pointerEvents: 'none',
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}
        >
          {COL_CHOICES.map((n) =>
            (['full', 'compact'] as const).map((variant) => {
              const spacing = variant === 'full' ? 1.0 : SPACING_COMPACT;
              return (
                <div key={`${n}-${variant}`} style={{ width: colWidthPx(n), marginBottom: 50 }}>
                  {menus.map((menu, idx) => (
                    <EmpresaBlock
                      key={`m-${n}-${variant}-${idx}`}
                      empresa={menu.empresa}
                      titulo={menu.titulo}
                      grupos={menu.itens || []}
                      scale={1}
                      spacing={spacing}
                      widthPx={colWidthPx(n)}
                      containerRef={(el) => {
                        const bucket = measurementRefs.current[n]?.[variant];
                        if (bucket && bucket[idx]) bucket[idx].blockEl = el;
                      }}
                      groupRefCallback={(el, gi) => {
                        const bucket = measurementRefs.current[n]?.[variant];
                        if (bucket && bucket[idx]) bucket[idx].groupEls[gi] = el;
                      }}
                    />
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}

      <Layout
        title={statusTxt}
        headerActions={
          layout && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-2.5 rounded-lg shadow-lg transition-all animate-in fade-in"
            >
              🖨️ Imprimir / Salvar PDF Vetorial
            </button>
          )
        }
      >
        <div className="p-6 overflow-auto bg-slate-200 flex justify-center pb-24">
          {!layout ? (
            <div className="flex justify-center py-20">
              <span className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-12 print-area" style={{ background: BG_DARK }}>
              {layout.paginas.map((pagina, pi) => (
                <div
                  key={pi}
                  className="shadow-2xl page-a3"
                  style={{
                    width: `${A3_W_MM}mm`,
                    height: `${A3_H_MM}mm`,
                    backgroundColor: BG_DARK,
                    padding: `${PAGE_PAD_MM}mm`,
                    margin: '0 auto',
                    boxSizing: 'border-box',
                    display: 'flex',
                    gap: `${COL_GAP_MM}mm`,
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    overflow: 'hidden',
                  }}
                >
                  {pagina.map((coluna, ci) => (
                    <div
                      key={ci}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        minWidth: 0,
                      }}
                    >
                      {coluna.map((bloco, bi) => {
                        const menu = menus[bloco.menuIdx];
                        return (
                          <EmpresaBlock
                            key={`${pi}-${ci}-${bi}`}
                            empresa={menu.empresa}
                            titulo={menu.titulo}
                            grupos={bloco.grupos}
                            scale={layout.scale}
                            spacing={layout.spacing}
                            widthPx={colWidthPx(layout.numColunas)}
                            isContinuacao={bloco.isContinuacao}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
};

export default A3DuploCanvas;
