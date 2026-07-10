import React, { useLayoutEffect, useRef, useState } from 'react';
import Layout from '../Layout';
import { CardapioGroup } from '../../utils/cardapioParser';
import { CardapioTema, resolveTema, withAlpha } from '../../utils/cardapioTema';
import {
  A3DuploMenuData,
  COL_CHOICES,
  SPACING_COMPACT,
  MeasurementMatrix,
  ColumnContent,
  LayoutResult,
  calcularLayout,
} from './a3DuploLayout';

// Re-export para os consumidores existentes (pages/A3Preview*)
export type { A3DuploMenuData };

// ─── Constantes de página A3 ────────────────────────────────────────────────
const MM_TO_PX = 96 / 25.4;
const A3_W_MM = 297;
const A3_H_MM = 420;
const PAGE_PAD_MM = 15;
const COL_GAP_MM = 10;

const CONTENT_W_PX = (A3_W_MM - 2 * PAGE_PAD_MM) * MM_TO_PX;
const CONTENT_H_PX = (A3_H_MM - 2 * PAGE_PAD_MM) * MM_TO_PX;

function colWidthPx(numCols: number): number {
  const gapTotal = (numCols - 1) * COL_GAP_MM * MM_TO_PX;
  return (CONTENT_W_PX - gapTotal) / numCols;
}

// ─── Componente EmpresaBlock ────────────────────────────────────────────────
interface EmpresaBlockProps {
  t: CardapioTema;
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
  t, empresa, titulo, grupos, scale, spacing = 1, widthPx, isContinuacao, containerRef, groupRefCallback,
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
            color: t.corDouradoClaro,
            textTransform: 'uppercase',
            marginBottom: '2px',
            fontWeight: 'bold',
          }}>{titulo}</div>
        )}
        <div style={{
          fontSize: `${26 * scale}px`,
          color: t.corDouradoClaro,
          fontFamily: '"Arial Black", Impact, sans-serif',
          textTransform: 'uppercase',
          textShadow: `0 0 10px ${t.corDourado}55`,
          lineHeight: 1.05,
        }}>
          {empresa}{isContinuacao ? ' ›' : ''}
        </div>
        <div style={{
          margin: '6px auto',
          width: '60%',
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${t.corDourado}, transparent)`,
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
              color: t.corDouradoClaro,
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
                  <span style={{ fontSize: `${12.5 * scale}px`, color: t.corTexto, fontWeight: 600 }}>
                    {item.item}
                  </span>
                  {item.descricao && (
                    <span style={{
                      fontSize: `${9.5 * scale}px`,
                      color: t.corTextoSuave,
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
                    borderBottom: `1px dotted ${withAlpha(t.corTextoSuave, 0.55)}`,
                    alignSelf: 'baseline',
                  }} />
                )}
                <span style={{
                  fontSize: `${13 * scale}px`,
                  color: t.corDouradoClaro,
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

// ─── Componente exportado ───────────────────────────────────────────────────
export interface A3DuploCanvasProps {
  menus: A3DuploMenuData[];
  /** Tema do projeto (cores) */
  tema?: Partial<CardapioTema> | null;
  /** Imagem de fundo das páginas A3 (cover); null = cor sólida do tema */
  fundoUrl?: string | null;
}

export const A3DuploCanvas: React.FC<A3DuploCanvasProps> = ({ menus, tema = null, fundoUrl = null }) => {
  const t = resolveTema(tema);
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
            background: ${t.corFundo} !important;
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
                      t={t}
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
            <div className="flex flex-col gap-12 print-area" style={{ background: t.corFundo }}>
              {layout.paginas.map((pagina, pi) => (
                <div
                  key={pi}
                  className="shadow-2xl page-a3"
                  style={{
                    width: `${A3_W_MM}mm`,
                    height: `${A3_H_MM}mm`,
                    backgroundColor: t.corFundo,
                    // Fundo custom do projeto — cover em cada página (sai na
                    // impressão graças ao print-color-adjust: exact do @media print)
                    ...(fundoUrl
                      ? {
                          backgroundImage: `url(${fundoUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center center',
                          backgroundRepeat: 'no-repeat',
                        }
                      : {}),
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
                            t={t}
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
