import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { CANVAS_W, CANVAS_H } from '../components/cardapio/CardapioCanvas';
import {
  renderCardapioToDataURL,
  exportCardapioRenderer,
  RENDER_SCALES,
} from '../components/cardapio/CardapioRenderer';
import { parseCardapioText, CardapioGroup } from '../utils/cardapioParser';
import { cardapioService } from '../services/cardapioService';

const PLACEHOLDER = `CHURRASCO BBQ
MASMORRA
CATEGORIA\tITEM\tVALOR (R$)\tDESCRIÇÃO
CORTES NA BRASA\tPicanha na Brasa\tR$ 69,00\t~250g grelhada na parrilla, farofa crocante do chef, mandioca cozida
CORTES NA BRASA\tAncho na Parrilla\tR$ 65,00\t~250g ancho maturado na parrilla, farofa crocante do chef, mandioca cozida
BURGERS PREMIUM\tBurger Triplo Bacon\tR$ 55,00\t150g blend bovino/suíno, creme de queijo, maionese de bacon, fatias de bacon`;

const CardapioEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  // previewContainerRef — used to measure available width for scaling the img
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const [rawText, setRawText] = useState('');
  const [titulo, setTitulo] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [grupos, setGrupos] = useState<CardapioGroup[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isRendering, setIsRendering] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);

  // ── Load existing cardapio (edit mode) ──────────────────────────────────
  useEffect(() => {
    if (!id) return;
    cardapioService
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

  // ── Parse text as user types ─────────────────────────────────────────────
  const handleTextChange = useCallback((text: string) => {
    setRawText(text);
    if (!text.trim()) {
      setTitulo('');
      setEmpresa('');
      setGrupos([]);
      setParseError(null);
      return;
    }
    const parsed = parseCardapioText(text);
    if (!parsed) {
      setParseError('Cole o texto no formato correto (veja o exemplo acima)');
      return;
    }
    setParseError(null);
    setTitulo(parsed.titulo);
    setEmpresa(parsed.empresa);
    setGrupos(parsed.grupos);
  }, []);

  // ── Close export menu on outside click ──────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    if (showExportMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  // ── Responsive preview scale (kept for container height) ──────────────────
  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => { /* height managed by img aspect ratio */ });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ── Live preview via Canvas2D renderer (same engine as PNG export) ─────────
  useEffect(() => {
    if (grupos.length === 0 && !titulo) {
      setPreviewUrl('');
      return;
    }
    setIsRendering(true);
    const timer = setTimeout(() => {
      renderCardapioToDataURL(titulo, empresa, grupos, 1)
        .then(setPreviewUrl)
        .catch(() => {})
        .finally(() => setIsRendering(false));
    }, 280);
    return () => clearTimeout(timer);
  }, [titulo, empresa, grupos]);

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!titulo || !empresa || grupos.length === 0) {
      setError('Cole o texto do cardápio antes de salvar.');
      return;
    }
    try {
      setIsSaving(true);
      setError(null);
      const payload = { titulo, empresa, conteudo_raw: rawText, itens: grupos };
      if (isEditMode && id) {
        await cardapioService.atualizar(id, payload);
      } else {
        const saved = await cardapioService.salvar(payload);
        navigate(`/cardapios/${saved.id}`, { replace: true });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Export PNG (Canvas2D renderer — no DOM capture, pixel-perfect) ——————
  const handleExport = async (scale: number) => {
    setShowExportMenu(false);
    if (grupos.length === 0) return;
    try {
      setIsExporting(true);
      setError(null);
      const filename = `cardapio-${empresa.toLowerCase().replace(/\s+/g, '-') || 'menu'}`;
      await exportCardapioRenderer(titulo, empresa, grupos, filename, scale, setExportStatus);
    } catch (e: any) {
      setError(e.message || 'Erro ao exportar');
    } finally {
      setIsExporting(false);
      setExportStatus('');
    }
  };

  const totalItens = grupos.reduce((s, g) => s + g.itens.length, 0);

  const headerActions = (
    <div className="flex items-center gap-2">
      {saveSuccess && (
        <span className="text-green-600 text-sm font-semibold animate-pulse">
          ✓ Salvo!
        </span>
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

        {/* Export quality dropdown — state controlled, no hover gap issues */}
        {showExportMenu && !isExporting && grupos.length > 0 && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 min-w-[190px] overflow-hidden">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-2.5 pb-1">
              Qualidade
            </p>
            {[
              { label: 'Rápido (1×)', scale: RENDER_SCALES.PREVIEW, desc: 'Prévia — 1600×880px' },
              { label: 'Médio (2×)', scale: RENDER_SCALES.MEDIUM, desc: '~150dpi — 3200×1760px' },
              { label: 'Alta (4×)', scale: RENDER_SCALES.HIGH, desc: '~300dpi — 6400×3520px' },
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
      <Layout title={isEditMode ? 'Editar Cardápio' : 'Novo Cardápio'}>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title={isEditMode ? 'Editar Cardápio' : 'Novo Cardápio'}
      headerActions={headerActions}
    >
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="ml-4 font-bold">×</button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 h-full">
        {/* ── Left panel: text input ─────────────────────────────────────── */}
        <div className="w-full lg:w-[400px] lg:flex-shrink-0 flex flex-col gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Cole o texto do cardápio
            </p>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Formato esperado: primeira linha = tipo (ex: CHURRASCO BBQ), segunda = empresa (ex: MASMORRA), depois a tabela com colunas separadas por <strong className="text-slate-600">Tab</strong>.
            </p>

            <textarea
              id="cardapio-texto"
              value={rawText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={PLACEHOLDER}
              className="w-full h-80 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-700 placeholder:text-slate-300"
              spellCheck={false}
            />

            {parseError && (
              <p className="mt-2 text-xs text-red-500 font-medium">{parseError}</p>
            )}

            {grupos.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-full">
                  {grupos.length} categorias
                </span>
                <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2.5 py-1 rounded-full">
                  {totalItens} itens
                </span>
                <span className="text-xs bg-green-50 text-green-700 font-semibold px-2.5 py-1 rounded-full">
                  {empresa || '—'}
                </span>
              </div>
            )}
          </div>

          {/* Instructions card */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-700 space-y-1.5">
            <p className="font-bold text-blue-800 mb-2">📋 Como formatar a tabela:</p>
            <p>• Linha 1: tipo do evento (ex: CHURRASCO BBQ)</p>
            <p>• Linha 2: nome da empresa (ex: MASMORRA)</p>
            <p>• Linha 3: cabeçalho (CATEGORIA, ITEM, VALOR, DESCRIÇÃO)</p>
            <p>• Próximas linhas: dados separados por <strong>Tab</strong></p>
            <p className="pt-1 text-blue-600">💡 Você pode copiar direto do Excel!</p>
          </div>
        </div>

        {/* ── Right panel: live preview (Canvas2D — idêntico ao PNG exportado) ── */}
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Preview do Cardápio
            </p>
            {isRendering && (
              <span className="text-xs text-slate-400 animate-pulse">Renderizando...</span>
            )}
          </div>

          {/* Preview container — img fills width, height follows aspect ratio */}
          <div
            ref={previewContainerRef}
            className="w-full rounded-2xl border border-slate-200 shadow-inner bg-slate-900 overflow-hidden"
            style={{ minHeight: 240 }}
          >
            {!previewUrl ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
                <svg className="w-12 h-12 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-medium opacity-40">Cole o texto para ver o preview</p>
              </div>
            ) : (
              <img
                src={previewUrl}
                alt="Preview do cardápio"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            )}
          </div>

          <p className="text-xs text-slate-400 text-center">
            Canvas real: {CANVAS_W} × {CANVAS_H}px · Proporcional a 2,00m × 1,10m
          </p>
        </div>
      </div>
    </Layout>

  );
};

// ── Icons ────────────────────────────────────────────────────────────────────
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


export default CardapioEditor;
