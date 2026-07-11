import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../Layout';
import { CardapioGroup } from '../../utils/cardapioParser';
import { CardapioTema, TEMA_PADRAO, resolveTema, temaEhPadrao, withAlpha } from '../../utils/cardapioTema';
import {
  A3DuploMenuData,
  COL_CHOICES,
  SPACING_COMPACT,
  MeasurementMatrix,
  ColumnContent,
  LayoutResult,
  calcularLayout,
  FontesA3,
  FONTES_A3_PADRAO,
  resolveFontes,
  fontesSaoPadrao,
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
  fontes: FontesA3;
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
  t, fontes, empresa, titulo, grupos, scale, spacing = 1, widthPx, isContinuacao, containerRef, groupRefCallback,
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
            fontSize: `${fontes.titulo * scale}px`,
            color: t.corDouradoClaro,
            textTransform: 'uppercase',
            marginBottom: '2px',
            fontWeight: 'bold',
          }}>{titulo}</div>
        )}
        <div style={{
          fontSize: `${fontes.empresa * scale}px`,
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
              fontSize: `${fontes.categoria * scale}px`,
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
              <div key={ii} style={{ marginBottom: `${5 * scale * spacing}px` }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}>
                  <span style={{
                    fontSize: `${fontes.item * scale}px`,
                    color: t.corTexto,
                    fontWeight: 600,
                    minWidth: 0,
                  }}>
                    {item.item}
                  </span>
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
                    fontSize: `${fontes.preco * scale}px`,
                    color: t.corDouradoClaro,
                    fontWeight: 900,
                    fontFamily: '"Arial Black", Impact, sans-serif',
                    whiteSpace: 'nowrap',
                  }}>{item.valor}</span>
                </div>
                {/* Descrição abaixo da linha, largura total da coluna — só
                    quebra quando realmente falta espaço (antes: maxWidth 85%
                    de uma coluna auto-dimensionada forçava quebra sempre) */}
                {item.descricao && (
                  <div style={{
                    fontSize: `${fontes.descricao * scale}px`,
                    color: t.corTextoSuave,
                    marginTop: '2px',
                    fontStyle: 'italic',
                    lineHeight: 1.3,
                  }}>{item.descricao}</div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Painel de controle de fontes ───────────────────────────────────────────
const CAMPOS_FONTE: { key: keyof FontesA3; label: string }[] = [
  { key: 'empresa',   label: 'Empresa' },
  { key: 'titulo',    label: 'Título' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'item',      label: 'Item' },
  { key: 'descricao', label: 'Descrição' },
  { key: 'preco',     label: 'Preço' },
];

const FONTE_MIN = 6;
const FONTE_MAX = 40;
const FONTE_STEP = 0.5;

const CAMPOS_COR: { key: keyof CardapioTema; label: string }[] = [
  { key: 'corFundo',        label: 'Fundo' },
  { key: 'corDourado',      label: 'Destaque' },
  { key: 'corDouradoClaro', label: 'Destaque claro' },
  { key: 'corTexto',        label: 'Texto' },
  { key: 'corTextoSuave',   label: 'Texto suave' },
];

// ─── Componente exportado ───────────────────────────────────────────────────
export interface A3DuploCanvasProps {
  menus: A3DuploMenuData[];
  /** Tema do projeto (cores) */
  tema?: Partial<CardapioTema> | null;
  /** Imagem de fundo das páginas A3 (cover); null = cor sólida do tema */
  fundoUrl?: string | null;
  /** Nome do projeto/evento — usado no nome do arquivo PDF */
  nomeProjeto?: string | null;
  /** Fontes salvas no projeto (null = padrão) */
  fontesIniciais?: Partial<FontesA3> | null;
  /** Persiste fontes + cores do tema no projeto (null = padrão). Ausente = sem botão salvar */
  onSalvarAjustes?: (ajustes: {
    fontes: FontesA3 | null;
    tema: Partial<CardapioTema> | null;
  }) => Promise<void>;
}

export const A3DuploCanvas: React.FC<A3DuploCanvasProps> = ({
  menus, tema = null, fundoUrl = null, nomeProjeto = null, fontesIniciais = null, onSalvarAjustes,
}) => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'measuring' | 'ready'>('measuring');
  const [layout, setLayout] = useState<LayoutResult | null>(null);
  const [fontes, setFontes] = useState<FontesA3>(() => resolveFontes(fontesIniciais));
  // Cores editáveis (interligadas com o tema do projeto — valem p/ banner e A4 ao salvar)
  const [temaEdit, setTemaEdit] = useState<CardapioTema>(() => resolveTema(tema));
  const [zoom, setZoom] = useState(0.45);
  const [isSavingFontes, setIsSavingFontes] = useState(false);
  const [fontesSalvas, setFontesSalvas] = useState(false);

  const t = temaEdit;

  type RefBucket = { blockEl: HTMLDivElement | null; groupEls: (HTMLDivElement | null)[] };
  const measurementRefs = useRef<Record<number, { full: RefBucket[]; compact: RefBucket[] }>>({});
  // Últimas medições — permite re-distribuir (ex: afastamento do topo) sem re-medir
  const lastMeasurements = useRef<MeasurementMatrix | null>(null);

  const topoMm = fontes.topoMm ?? 0;
  const pageContentH = CONTENT_H_PX - topoMm * MM_TO_PX;

  // Re-mede tudo e re-distribui (usado quando as fontes mudam)
  const remeasure = () => {
    measurementRefs.current = {};
    setLayout(null);
    setPhase('measuring');
  };

  // Depois que o usuário mexe em QUALQUER controle, os valores dele mandam:
  // nenhuma sincronização com o banco pode sobrescrever a edição em andamento
  // (era isso que fazia a tela "voltar ao padrão" após salvar).
  const userEditouRef = useRef(false);

  // Fontes/tema salvos do projeto podem chegar depois do mount (fetch assíncrono)
  const fontesIniciaisJson = JSON.stringify(fontesIniciais ?? null);
  useEffect(() => {
    if (userEditouRef.current) return;
    setFontes(resolveFontes(fontesIniciais));
    remeasure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontesIniciaisJson]);

  const temaJson = JSON.stringify(tema ?? null);
  useEffect(() => {
    if (userEditouRef.current) return;
    setTemaEdit(resolveTema(tema));
    // cores não afetam alturas — sem re-medição
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temaJson]);

  const changeFonte = (key: keyof FontesA3, delta: number) => {
    userEditouRef.current = true;
    setFontes((prev) => ({
      ...prev,
      [key]: Math.min(FONTE_MAX, Math.max(FONTE_MIN, Math.round((prev[key] + delta) * 2) / 2)),
    }));
    setFontesSalvas(false);
    remeasure();
  };

  const handleVoltarPadrao = () => {
    userEditouRef.current = true;
    setFontes({ ...FONTES_A3_PADRAO });
    setTemaEdit({ ...TEMA_PADRAO });
    setFontesSalvas(false);
    remeasure();
  };

  const handleSalvarAjustes = async () => {
    if (!onSalvarAjustes) return;
    try {
      setIsSavingFontes(true);
      await onSalvarAjustes({
        fontes: fontesSaoPadrao(fontes) ? null : fontes,
        tema: temaEhPadrao(temaEdit) ? null : temaEdit,
      });
      setFontesSalvas(true);
      setTimeout(() => setFontesSalvas(false), 3000);
    } catch (e: any) {
      alert('Erro ao salvar ajustes: ' + (e?.message || e));
    } finally {
      setIsSavingFontes(false);
    }
  };

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

    lastMeasurements.current = measurements;
    const result = calcularLayout(menus, measurements, pageContentH);
    setLayout(result);
    setPhase('ready');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, menus, fontes]);

  // Afastamento do topo só muda a altura útil — re-distribui sem re-medir
  useEffect(() => {
    if (phase !== 'ready' || !lastMeasurements.current) return;
    setLayout(calcularLayout(menus, lastMeasurements.current, pageContentH));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topoMm]);

  const handlePrint = () => window.print();
  // NOTA: o gerador de PDF vetorial (A3PdfExporter) está pausado — ver
  // PENDENTE-PDF-VETORIAL-A3.md na raiz do repo e o commit ec6e846 para retomar.

  const statusTxt = layout
    ? `Preview A3 Duplo — ${menus.length} empresa${menus.length === 1 ? '' : 's'} · ${layout.numColunas} col · fonte ${(layout.scale * 100).toFixed(0)}% · espaço ${(layout.spacing * 100).toFixed(0)}%${layout.fallback ? ' (estouro!)' : ''}`
    : 'Calculando layout…';

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .zoom-wrap { zoom: 1 !important; }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
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
                      fontes={fontes}
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-600 font-bold text-sm px-4 py-2.5 rounded-lg border border-slate-200 shadow transition-all"
              title="Voltar para o projeto"
            >
              ← Voltar
            </button>
            {layout && (
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-2.5 rounded-lg shadow-lg transition-all animate-in fade-in"
              >
                🖨️ Imprimir / Salvar PDF Vetorial
              </button>
            )}
          </div>
        }
      >
        <div className="flex gap-4 p-4 bg-slate-200 min-h-full items-start">
          {/* ── Painel de fontes (não sai na impressão) ─────────────────── */}
          <div className="no-print w-60 flex-shrink-0 sticky top-4 bg-white rounded-xl border border-slate-200 shadow-lg p-4 flex flex-col gap-3">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Fontes (px)
            </p>
            <p className="text-[11px] text-slate-400 -mt-2">
              Ao ajustar, a distribuição é recalculada — a escala global se adapta para tudo caber.
            </p>

            {CAMPOS_FONTE.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-700 flex-1">{label}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => changeFonte(key, -FONTE_STEP)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm"
                    title={`Diminuir ${label}`}
                  >
                    −
                  </button>
                  <span
                    className={`w-11 text-center text-sm font-mono ${
                      fontes[key] !== FONTES_A3_PADRAO[key] ? 'text-indigo-600 font-bold' : 'text-slate-500'
                    }`}
                    title={`Padrão: ${FONTES_A3_PADRAO[key]}px`}
                  >
                    {fontes[key]}
                  </span>
                  <button
                    onClick={() => changeFonte(key, FONTE_STEP)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm"
                    title={`Aumentar ${label}`}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}

            {/* Cores do tema — interligadas com o projeto (valem p/ banner e A4) */}
            <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Cores do tema
              </p>
              <p className="text-[11px] text-slate-400 -mt-1">
                Cores do projeto — ao salvar, valem também para o banner e o A4.
              </p>
              {CAMPOS_COR.map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between gap-2 cursor-pointer">
                  <span className="text-sm font-semibold text-slate-700">{label}</span>
                  <span className="flex items-center gap-1.5">
                    <code className="text-[10px] text-slate-400 uppercase">{temaEdit[key]}</code>
                    <input
                      type="color"
                      value={temaEdit[key]}
                      onChange={(e) => {
                        userEditouRef.current = true;
                        setTemaEdit((prev) => ({ ...prev, [key]: e.target.value }));
                        setFontesSalvas(false);
                      }}
                      className="w-8 h-7 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
                    />
                  </span>
                </label>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
              {onSalvarAjustes && (
                <button
                  onClick={handleSalvarAjustes}
                  disabled={isSavingFontes}
                  className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm px-3 py-2 rounded-lg shadow transition-all"
                >
                  {isSavingFontes ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  {isSavingFontes ? 'Salvando...' : fontesSalvas ? '✓ Salvo!' : 'Salvar no projeto'}
                </button>
              )}
              <button
                onClick={handleVoltarPadrao}
                className="w-full text-sm font-semibold text-slate-500 hover:text-slate-700 px-3 py-1.5"
              >
                Voltar ao padrão
              </button>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Zoom</span>
                <span className="text-xs text-slate-400 font-mono">{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.25}
                max={1}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Afastar do topo — empurra o conteúdo p/ baixo p/ centralizar melhor */}
            <div className="border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Afastar do topo</span>
                <span className={`text-xs font-mono ${topoMm > 0 ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
                  {topoMm} mm
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={60}
                step={1}
                value={topoMm}
                onChange={(e) => {
                  userEditouRef.current = true;
                  setFontes((prev) => ({ ...prev, topoMm: Number(e.target.value) }));
                  setFontesSalvas(false);
                }}
                className="w-full accent-indigo-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Empurra o conteúdo para baixo (0 = padrão). Salva junto com as fontes.
              </p>
            </div>
          </div>

          {/* ── Páginas lado a lado ─────────────────────────────────────── */}
          <div className="flex-1 overflow-auto pb-24">
            {!layout ? (
              <div className="flex justify-center py-20">
                <span className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="zoom-wrap" style={{ zoom }}>
                <div
                  className="flex flex-row items-start gap-10 print-area"
                  style={{ background: t.corFundo, width: 'fit-content' }}
                >
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
                        paddingTop: `${PAGE_PAD_MM + topoMm}mm`,
                        margin: '0 auto',
                        boxSizing: 'border-box',
                        display: 'flex',
                        gap: `${COL_GAP_MM}mm`,
                        fontFamily: 'Arial, Helvetica, sans-serif',
                        overflow: 'hidden',
                        flexShrink: 0,
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
                                fontes={fontes}
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
              </div>
            )}
          </div>
        </div>
      </Layout>

    </>
  );
};

export default A3DuploCanvas;
