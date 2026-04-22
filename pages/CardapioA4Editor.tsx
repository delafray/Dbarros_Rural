import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { CardapioA4Canvas } from '../components/cardapioA4/CardapioA4Canvas';
import { CANVAS_W, CANVAS_H } from '../components/cardapioA4/cardapioA4Config';
import { exportMenuA4, A4_RENDER_SCALES } from '../components/cardapioA4/CardapioA4Renderer';
import { parseCardapioText, CardapioGroup } from '../utils/cardapioParser';
import { menuA4Service } from '../services/menuA4Service';

const isEditMode_check = (id?: string) => !!id;

export const CardapioA4Editor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = isEditMode_check(id);

  const canvasRef            = useRef<HTMLDivElement>(null);
  const exportMenuRef        = useRef<HTMLDivElement>(null);

  const [rawText,      setRawText]      = useState('');
  const [titulo,       setTitulo]       = useState('');
  const [empresa,      setEmpresa]      = useState('');
  const [grupos,       setGrupos]       = useState<CardapioGroup[]>([]);
  const [parseError,   setParseError]   = useState<string | null>(null);
  const [isSaving,     setIsSaving]     = useState(false);
  const [isExporting,  setIsExporting]  = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [saveSuccess,  setSaveSuccess]  = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isLoading,    setIsLoading]    = useState(isEditMode);

  // ── Load existing (edit mode) ────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    menuA4Service
      .buscar(id)
      .then((c) => {
        if (!c) return;
        setRawText(c.conteudo_raw);
        setTitulo(c.titulo);
        setEmpresa(c.empresa);
        setGrupos(c.itens as CardapioGroup[]);
      })
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  // ── Parse text ───────────────────────────────────────────────────────────
  const handleTextChange = useCallback((text: string) => {
    setRawText(text);
    if (!text.trim()) {
      setTitulo(''); setEmpresa(''); setGrupos([]); setParseError(null);
      return;
    }
    const parsed = parseCardapioText(text);
    if (!parsed) {
      setParseError('Cole o texto no formato correto');
      return;
    }
    setParseError(null);
    setTitulo(parsed.titulo);
    setEmpresa(parsed.empresa);
    setGrupos(parsed.grupos);
  }, []);

  // ── Close export menu on outside click ──────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    if (showExportMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExportMenu]);




  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!titulo || !empresa || grupos.length === 0) {
      setError('Cole o texto do cardápio antes de salvar.');
      return;
    }
    try {
      setIsSaving(true); setError(null);
      const payload = { titulo, empresa, conteudo_raw: rawText, itens: grupos };
      if (isEditMode && id) {
        await menuA4Service.atualizar(id, payload);
      } else {
        const saved = await menuA4Service.salvar(payload);
        navigate(`/cardapios-a4/${saved.id}`, { replace: true });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Export PNG (Canvas2D — quebra de texto idêntica ao preview) ─────────
  const handleExport = async (scale: number) => {
    setShowExportMenu(false);
    if (grupos.length === 0) return;
    try {
      setIsExporting(true); setError(null);
      const filename = `menu-a4-${empresa.toLowerCase().replace(/\s+/g, '-') || 'menu'}`;
      await exportMenuA4(titulo, empresa, grupos, filename, scale, setExportStatus);
    } catch (e: any) {
      setError(e.message || 'Erro ao exportar');
    } finally {
      setIsExporting(false); setExportStatus('');
    }
  };


  const headerActions = (
    <div className="flex items-center gap-2">
      {saveSuccess && (
        <span className="text-green-600 text-sm font-semibold animate-pulse">✓ Salvo!</span>
      )}

      <button
        onClick={handleSave}
        disabled={isSaving || grupos.length === 0}
        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm px-4 py-2 rounded-lg shadow transition-all"
      >
        {isSaving ? (
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <SaveIcon className="w-4 h-4" />
        )}
        {isSaving ? 'Salvando...' : 'Salvar'}
      </button>

      <div ref={exportMenuRef} className="relative">
        <button
          onClick={() => setShowExportMenu((v) => !v)}
          disabled={isExporting || grupos.length === 0}
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
              Exportar PNG
              <ChevronIcon className={`w-3 h-3 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>

        {showExportMenu && !isExporting && grupos.length > 0 && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 min-w-[200px] overflow-hidden">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-2.5 pb-1">
              Qualidade de impressão
            </p>
            {[
              { label: 'Prévia (1×)', scale: A4_RENDER_SCALES.PREVIEW, desc: '810×1071px' },
              { label: 'Médio (2×)',  scale: A4_RENDER_SCALES.MEDIUM,  desc: '~150dpi — 1620×2142px' },
              { label: 'Alta (4×)',   scale: A4_RENDER_SCALES.HIGH,    desc: '~300dpi — 3240×4284px' },
            ].map(({ label, scale, desc }) => (
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
    </div>
  );

  if (isLoading) {
    return (
      <Layout title="Menu A4">
        <div className="flex items-center justify-center py-24">
          <span className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={isEditMode ? 'Editar Menu A4' : 'Novo Menu A4'} headerActions={headerActions}>
      <div className="flex gap-6 h-full min-h-0 p-4">

        {/* ── Left panel — input ────────────────────────────────────────── */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col gap-3 flex-1">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Dados do Cardápio
              </label>
              <p className="text-xs text-slate-400 mb-2">
                Cole o texto com a estrutura de tabela (mesmo formato do banner).
              </p>
            </div>

            <textarea
              value={rawText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={'CHURRASCO BBQ\t\t\t\nMAZMORRA\t\t\t\nCATEGORIA\tITEM\tVALOR (R$)\tDESCRIÇÃO\nCORTES\tPicanha\tR$ 69,00\tGrelhada na parrilla'}
              rows={22}
              className="w-full text-xs font-mono border border-slate-200 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700 bg-slate-50"
            />

            {parseError && (
              <p className="text-xs text-red-500 font-medium">{parseError}</p>
            )}

            {grupos.length > 0 && (
              <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2 border border-slate-100">
                <span className="font-bold text-slate-700">{empresa}</span>
                {titulo && <> — <span className="italic">{titulo}</span></>}
                <br />
                <span>{grupos.length} categorias · {grupos.reduce((s, g) => s + g.itens.length, 0)} itens</span>
              </div>
            )}
          </div>

          {/* Bleed legend */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
            <p className="text-xs font-bold text-slate-600 mb-2">Legenda do preview</p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-6 h-2 bg-red-200 border border-dashed border-red-400 rounded" />
              <span>Área de sangria (3cm) — inclusa no PNG exportado</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1.5">
              <div className="w-6 h-0 border-t border-dashed border-amber-400" />
              <span>Rodapé reservado para chancela</span>
            </div>
          </div>
        </div>

        {/* ── Right panel — preview ─────────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <div
            className="flex-1 min-h-0 overflow-auto bg-slate-100 rounded-xl border border-slate-200 flex items-start justify-center p-4"
            style={{ position: 'relative' }}
          >
            {grupos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                <PageIcon className="w-16 h-16 opacity-30" />
                <p className="text-sm font-medium">Cole o texto para ver o preview A4</p>
              </div>
            ) : (
              <div style={{ flexShrink: 0 }}>
                <CardapioA4Canvas
                  ref={canvasRef}
                  titulo={titulo}
                  empresa={empresa}
                  grupos={grupos}
                  exporting={isExporting}
                />
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 text-center">
            A4 + sangria: 270×357mm (810×1071px) · Preview em 100%
          </p>
        </div>
      </div>
    </Layout>
  );
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const SaveIcon = (props: any) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 3v4H7V3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 17a2 2 0 100-4 2 2 0 000 4z" />
  </svg>
);
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
const PageIcon = (props: any) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

export default CardapioA4Editor;
