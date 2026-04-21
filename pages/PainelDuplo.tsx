import React, { useCallback, useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { cardapioService, Cardapio } from '../services/cardapioService';
import { CardapioGroup } from '../utils/cardapioParser';
import {
  exportPainelDuplo,
  renderPainelPreview,
  PANEL_W,
  PANEL_H,
} from '../components/painelDuplo/PainelDuploRenderer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const EXPORT_SCALES = [
  { label: 'Prévia (1×)',   scale: 1, desc: 'Resolução baixa — p/ conferência' },
  { label: 'Alta (4×)',     scale: 4, desc: '~200dpi — pronto para gráfica' },
];

const PainelDuplo: React.FC = () => {
  // ── Banner list ─────────────────────────────────────────────────────────────
  const [cardapios,  setCardapios]  = useState<Cardapio[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [listError,  setListError]  = useState<string | null>(null);

  // ── Selected banner ─────────────────────────────────────────────────────────
  const [selected,   setSelected]   = useState<Cardapio | null>(null);

  // ── Logo uploads ────────────────────────────────────────────────────────────
  const [logoEsq,    setLogoEsq]    = useState<File | null>(null);
  const [logoDir,    setLogoDir]    = useState<File | null>(null);
  const inputEsqRef  = useRef<HTMLInputElement>(null);
  const inputDirRef  = useRef<HTMLInputElement>(null);

  // ── Preview ─────────────────────────────────────────────────────────────────
  const [previewEsq, setPreviewEsq] = useState('');
  const [previewDir, setPreviewDir] = useState('');
  const [isRendering, setIsRendering] = useState(false);

  // ── Export ──────────────────────────────────────────────────────────────────
  const [isExporting,  setIsExporting]  = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [showScaleMenu, setShowScaleMenu] = useState(false);
  const scaleMenuRef = useRef<HTMLDivElement>(null);

  // ── Load banner list ────────────────────────────────────────────────────────
  useEffect(() => {
    cardapioService
      .listar()
      .then(setCardapios)
      .catch((e) => setListError(e.message))
      .finally(() => setIsLoading(false));
  }, []);

  // ── Auto-load esquerda.png / direita.png from public/ folder ────────────
  // Place the files at: public/esquerda.png and public/direita.png
  useEffect(() => {
    const tryLoad = async (filename: string): Promise<File | null> => {
      try {
        const res = await fetch(`/${filename}`, { cache: 'no-cache' });
        if (!res.ok) return null;
        const blob = await res.blob();
        return new File([blob], filename, { type: blob.type || 'image/png' });
      } catch {
        return null;
      }
    };

    Promise.all([tryLoad('esquerda.png'), tryLoad('direita.png')]).then(([esq, dir]) => {
      if (esq) setLogoEsq(esq);
      if (dir) setLogoDir(dir);
    });
  }, []);

  // ── Close export menu on outside click ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (scaleMenuRef.current && !scaleMenuRef.current.contains(e.target as Node))
        setShowScaleMenu(false);
    };
    if (showScaleMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showScaleMenu]);

  // ── Re-render preview on change ─────────────────────────────────────────────
  useEffect(() => {
    if (!selected) { setPreviewEsq(''); setPreviewDir(''); return; }
    setIsRendering(true);
    const t = setTimeout(async () => {
      try {
        const grupos = selected.itens as CardapioGroup[];
        const [esq, dir] = await renderPainelPreview(
          selected.titulo, selected.empresa, grupos, logoEsq, logoDir,
        );
        setPreviewEsq(esq);
        setPreviewDir(dir);
      } catch (err) {
        console.error(err);
      } finally {
        setIsRendering(false);
      }
    }, 320);
    return () => clearTimeout(t);
  }, [selected, logoEsq, logoDir]);

  // ── Export handler ──────────────────────────────────────────────────────────
  const handleExport = useCallback(async (scale: number) => {
    if (!selected) return;
    setShowScaleMenu(false);
    try {
      setIsExporting(true);
      await exportPainelDuplo(
        selected.titulo,
        selected.empresa,
        selected.itens as CardapioGroup[],
        logoEsq,
        logoDir,
        scale,
        setExportStatus,
      );
    } catch (e: any) {
      alert('Erro ao exportar: ' + e.message);
    } finally {
      setIsExporting(false);
      setExportStatus('');
    }
  }, [selected, logoEsq, logoDir]);

  // ── Preview scale for display ───────────────────────────────────────────────
  // Show panels at ~35% of their base pixel size
  const PREVIEW_SCALE = 0.35;
  const previewW = Math.round(PANEL_W * PREVIEW_SCALE);
  const previewH = Math.round(PANEL_H * PREVIEW_SCALE);

  // ── Header actions ──────────────────────────────────────────────────────────
  const headerActions = selected ? (
    <div ref={scaleMenuRef} className="relative">
      <button
        onClick={() => setShowScaleMenu((v) => !v)}
        disabled={isExporting}
        className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-300 text-white font-bold text-sm px-4 py-2 rounded-lg shadow transition-all"
      >
        {isExporting ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {exportStatus || 'Exportando...'}
          </>
        ) : (
          <>
            <DownloadIcon className="w-4 h-4" />
            Exportar Painéis
            <ChevronIcon className={`w-3 h-3 transition-transform ${showScaleMenu ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {showScaleMenu && !isExporting && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 min-w-[220px] overflow-hidden">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-2.5 pb-1">
            Qualidade de exportação
          </p>
          {EXPORT_SCALES.map(({ label, scale, desc }) => (
            <button
              key={scale}
              onClick={() => handleExport(scale)}
              className="w-full text-left px-3 py-2.5 hover:bg-amber-50 transition-colors border-t border-slate-100 first:border-0"
            >
              <p className="text-sm font-bold text-slate-700">{label}</p>
              <p className="text-xs text-slate-400">{desc}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  ) : null;

  return (
    <Layout title="Painel Duplo" headerActions={headerActions}>
      <div className="flex gap-6 h-full min-h-0 p-4">

        {/* ── Left: banner list ──────────────────────────────────────────────── */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            Selecione o Cardápio Banner
          </p>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : listError ? (
            <p className="text-sm text-red-500 px-1">{listError}</p>
          ) : cardapios.length === 0 ? (
            <p className="text-sm text-slate-400 px-1">Nenhum cardápio salvo.</p>
          ) : (
            <div className="flex flex-col gap-1.5 overflow-y-auto">
              {cardapios.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    selected?.id === c.id
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700'
                  }`}
                >
                  <p className="font-bold text-sm truncate">{c.empresa}</p>
                  <p className={`text-xs truncate mt-0.5 ${selected?.id === c.id ? 'text-blue-200' : 'text-slate-500'}`}>
                    {c.titulo}
                  </p>
                  <p className={`text-[10px] mt-1 ${selected?.id === c.id ? 'text-blue-300' : 'text-slate-400'}`}>
                    {format(new Date(c.updated_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: uploads + preview ───────────────────────────────────────── */}
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
            <PanelIcon className="w-16 h-16 opacity-20" />
            <p className="text-sm font-medium">← Selecione um cardápio para montar os painéis</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4 min-w-0">

            {/* Logo uploads */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Imagens dos Painéis (1030mm × 1030mm + sangria)
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Esquerda */}
                <div>
                  <input
                    ref={inputEsqRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => setLogoEsq(e.target.files?.[0] ?? null)}
                  />
                  <button
                    onClick={() => inputEsqRef.current?.click()}
                    className={`w-full py-3 px-4 rounded-lg border-2 border-dashed text-sm font-medium transition-all ${
                      logoEsq
                        ? 'border-green-400 bg-green-50 text-green-700'
                        : 'border-slate-300 hover:border-amber-400 text-slate-500 hover:text-amber-600'
                    }`}
                  >
                    {logoEsq ? (
                      <><CheckIcon className="w-4 h-4 inline mr-1.5" />{logoEsq.name}</>
                    ) : (
                      <><UploadIcon className="w-4 h-4 inline mr-1.5" />Painel Esquerdo</>
                    )}
                  </button>
                  <p className="text-[10px] text-slate-400 mt-1 text-center">esquerda.png</p>
                </div>

                {/* Direita */}
                <div>
                  <input
                    ref={inputDirRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => setLogoDir(e.target.files?.[0] ?? null)}
                  />
                  <button
                    onClick={() => inputDirRef.current?.click()}
                    className={`w-full py-3 px-4 rounded-lg border-2 border-dashed text-sm font-medium transition-all ${
                      logoDir
                        ? 'border-green-400 bg-green-50 text-green-700'
                        : 'border-slate-300 hover:border-amber-400 text-slate-500 hover:text-amber-600'
                    }`}
                  >
                    {logoDir ? (
                      <><CheckIcon className="w-4 h-4 inline mr-1.5" />{logoDir.name}</>
                    ) : (
                      <><UploadIcon className="w-4 h-4 inline mr-1.5" />Painel Direito</>
                    )}
                  </button>
                  <p className="text-[10px] text-slate-400 mt-1 text-center">direita.png</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 flex items-start gap-2">
                <InfoIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Prepare cada imagem em <strong>1030mm × 1030mm</strong> (970mm de conteúdo + 30mm de sangria em cada lateral e na base).
                  Coloque os arquivos em <code className="bg-amber-100 px-1 rounded">public/esquerda.png</code> e <code className="bg-amber-100 px-1 rounded">public/direita.png</code> para pré-carregamento automático.
                </span>
              </div>
            </div>

            {/* Preview panels */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Preview dos Painéis
                </p>
                {isRendering && (
                  <span className="text-xs text-slate-400 animate-pulse">Renderizando...</span>
                )}
              </div>

              <div className="flex gap-4 overflow-x-auto pb-2">
                {/* Left panel */}
                <div className="flex flex-col items-center gap-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Painel Esquerdo
                  </p>
                  <div
                    className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 flex-shrink-0"
                    style={{ width: previewW, height: previewH }}
                  >
                    {previewEsq ? (
                      <img src={previewEsq} alt="Painel esquerdo" style={{ width: '100%', height: '100%', objectFit: 'fill' }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                        {isRendering ? '...' : 'Selecione um cardápio'}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">824 × 1731px base</p>
                </div>

                {/* Right panel */}
                <div className="flex flex-col items-center gap-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Painel Direito
                  </p>
                  <div
                    className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 flex-shrink-0"
                    style={{ width: previewW, height: previewH }}
                  >
                    {previewDir ? (
                      <img src={previewDir} alt="Painel direito" style={{ width: '100%', height: '100%', objectFit: 'fill' }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                        {isRendering ? '...' : 'Selecione um cardápio'}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">824 × 1731px base</p>
                </div>
              </div>

              <p className="text-xs text-slate-400 text-center">
                Arquivo: 1030 × 2160mm · Área útil: 970 × 2100mm · Menu: 850mm centralizado · Sangria: 30mm
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const DownloadIcon = (props: any) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);
const ChevronIcon = (props: any) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);
const UploadIcon = (props: any) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);
const CheckIcon = (props: any) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const InfoIcon = (props: any) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const PanelIcon = (props: any) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
  </svg>
);

export default PainelDuplo;
