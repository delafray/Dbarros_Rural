import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../Layout';
import { CardapioTema, TEMA_PADRAO, resolveTema, temaEhPadrao } from '../../utils/cardapioTema';
import EmpresaBlock from './EmpresaBlock';
import A3ControlPanel from './A3ControlPanel';
import {
  A3DuploMenuData,
  COL_CHOICES,
  SPACING_COMPACT,
  MeasurementMatrix,
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

// Limites do ajuste de fonte (o painel visual vive em A3ControlPanel)
const FONTE_MIN = 6;
const FONTE_MAX = 40;
const FONTE_STEP = 0.5;

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
          {/* ── Painel de ajustes (não sai na impressão) ─────────────── */}
          <A3ControlPanel
            fontes={fontes}
            tema={temaEdit}
            zoom={zoom}
            mostrarSalvar={!!onSalvarAjustes}
            isSaving={isSavingFontes}
            salvo={fontesSalvas}
            onChangeFonte={changeFonte}
            onChangeCor={(key, value) => {
              userEditouRef.current = true;
              setTemaEdit((prev) => ({ ...prev, [key]: value }));
              setFontesSalvas(false);
            }}
            onVoltarPadrao={handleVoltarPadrao}
            onSalvar={handleSalvarAjustes}
            onZoom={setZoom}
            onTopo={(mm) => {
              userEditouRef.current = true;
              setFontes((prev) => ({ ...prev, topoMm: mm }));
              setFontesSalvas(false);
            }}
          />

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
