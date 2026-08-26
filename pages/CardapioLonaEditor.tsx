import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { LINHAS_MIN, LINHAS_MAX } from '../utils/cardapioParser';
import {
  PX_PER_CM,
  calcExportPxPerCm,
  LonaDimensoes,
  LONA_PADRAO,
  FontesLona,
  FONTES_LONA_PADRAO,
  resolveFontesLona,
  fontesLonaSaoPadrao,
  LonaBloco,
  LonaBlocoConfig,
  LOGO_MAX_LARGURA_CM_PADRAO,
  LOGO_MAX_ALTURA_CM_PADRAO,
  MIN_ITEM_FONT_CM,
  ContrasteModo,
  PaletaTexto,
  CONTRASTE_MINIMO,
} from '../components/cardapioLona/cardapioLonaConfig';
import {
  renderLonaToDataURL,
  exportLonaPng,
  exportLonaPdf,
  LonaFundoModo,
  AvisoContraste,
} from '../components/cardapioLona/CardapioLonaRenderer';
import { CardapioGroup } from '../utils/cardapioParser';
import { lonaService } from '../services/lonaService';
import { menuA4Service } from '../services/menuA4Service';
import { cardapioProjetosService, CardapioProjeto } from '../services/cardapioProjetosService';

const CAMPOS_FONTES: { key: 'titulo' | 'categoria' | 'item' | 'descricao' | 'preco'; label: string }[] = [
  { key: 'titulo',    label: 'Título (sem logo)' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'item',      label: 'Item' },
  { key: 'descricao', label: 'Descrição' },
  { key: 'preco',     label: 'Preço' },
];
const FONTE_STEP = 0.05;
const FONTE_MIN = 0.5;
const FONTE_MAX = 2;

interface MenuRow {
  id: string;
  titulo: string;
  empresa: string;
  itens: CardapioGroup[];
  logo_url: string | null;
}

export const CardapioLonaEditor: React.FC = () => {
  const { projetoId, id } = useParams<{ projetoId: string; id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [projeto, setProjeto] = useState<CardapioProjeto | null>(null);
  const [menus, setMenus] = useState<MenuRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [uploadingLogoId, setUploadingLogoId] = useState<string | null>(null);
  const [uploadingFundo, setUploadingFundo] = useState(false);

  // ── Config da lona ───────────────────────────────────────────────────────
  const [nome, setNome] = useState('');
  const [dim, setDim] = useState<LonaDimensoes>({ ...LONA_PADRAO });
  const [colunas, setColunas] = useState(2);
  const [fundoUrl, setFundoUrl] = useState<string | null>(null);
  const [fundoModo, setFundoModo] = useState<LonaFundoModo>('cor');
  const [logoMaxW, setLogoMaxW] = useState(LOGO_MAX_LARGURA_CM_PADRAO);
  const [logoMaxH, setLogoMaxH] = useState(LOGO_MAX_ALTURA_CM_PADRAO);
  const [blocos, setBlocos] = useState<LonaBlocoConfig[]>([]);
  const [fontes, setFontes] = useState<FontesLona>({ ...FONTES_LONA_PADRAO });
  const [mostrarGuia, setMostrarGuia] = useState(true);
  const [contrasteModo, setContrasteModo] = useState<ContrasteModo>('auto');
  const [scrimOpacidade, setScrimOpacidade] = useState(0);

  // ── Preview ──────────────────────────────────────────────────────────────
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fonteCm, setFonteCm] = useState<number | null>(null);
  const [abaixoDoMinimo, setAbaixoDoMinimo] = useState(false);
  const [paletaUsada, setPaletaUsada] = useState<PaletaTexto | null>(null);
  const [avisosContraste, setAvisosContraste] = useState<AvisoContraste[]>([]);

  // ── Carga inicial ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!projetoId) return;
    Promise.all([
      cardapioProjetosService.buscar(projetoId),
      menuA4Service.listar(projetoId),
      id ? lonaService.buscar(id) : Promise.resolve(null),
    ])
      .then(([proj, menusData, lona]) => {
        setProjeto(proj);
        setMenus(menusData as MenuRow[]);
        if (lona) {
          setNome(lona.nome);
          setDim({
            larguraCm: Number(lona.largura_cm),
            alturaCm: Number(lona.altura_cm),
            utilLarguraCm: Number(lona.util_largura_cm),
            utilAlturaCm: Number(lona.util_altura_cm),
            utilOffsetXCm: lona.util_offset_x_cm != null ? Number(lona.util_offset_x_cm) : null,
            utilOffsetYCm: lona.util_offset_y_cm != null ? Number(lona.util_offset_y_cm) : null,
          });
          setColunas(lona.colunas);
          setFundoUrl(lona.fundo_url);
          setFundoModo(lona.fundo_url ? 'imagem' : 'cor');
          setLogoMaxW(Number(lona.logo_max_largura_cm));
          setLogoMaxH(Number(lona.logo_max_altura_cm));
          setBlocos(lona.blocos ?? []);
          setFontes(resolveFontesLona(lona.fontes));
          setContrasteModo(lona.contraste_modo ?? 'auto');
          setScrimOpacidade(Number(lona.scrim_opacidade ?? 0));
        }
      })
      .catch((e) => setError(e.message || 'Erro ao carregar'))
      .finally(() => setIsLoading(false));
  }, [projetoId, id]);

  // ── Blocos resolvidos (config da lona × menus do projeto) ────────────────
  const blocosResolvidos = useMemo<LonaBloco[]>(() => {
    const byId = new Map<string, MenuRow>(menus.map((m) => [m.id, m]));
    return blocos
      .map((cfg) => {
        const menu = byId.get(cfg.menu_id);
        if (!menu) return null;
        return {
          menuId: menu.id,
          titulo: menu.empresa || menu.titulo,
          grupos: menu.itens ?? [],
          logoUrl: menu.logo_url,
          destaque: !!cfg.destaque,
          logoMaxLarguraCm: cfg.logo_max_largura_cm ?? logoMaxW,
          logoMaxAlturaCm: cfg.logo_max_altura_cm ?? logoMaxH,
        } as LonaBloco;
      })
      .filter((b): b is LonaBloco => b !== null);
  }, [blocos, menus, logoMaxW, logoMaxH]);

  // ── Preview (debounce; o preview É o renderer, sem divergência) ──────────
  useEffect(() => {
    if (blocosResolvidos.length === 0) {
      setPreviewUrl(null);
      setFonteCm(null);
      setAbaixoDoMinimo(false);
      return;
    }
    let cancelado = false;
    const t = setTimeout(() => {
      renderLonaToDataURL(dim, blocosResolvidos, colunas, {
        tema: projeto?.tema ?? null,
        fundoUrl,
        fundoModo,
        fontes,
        mostrarGuia,
        pxPerCm: PX_PER_CM,
        contrasteModo,
        scrimOpacidade,
      })
        .then((r) => {
          if (cancelado) return;
          setPreviewUrl(r.dataUrl);
          setFonteCm(r.fonteCm);
          setAbaixoDoMinimo(r.abaixoDoMinimo);
          setPaletaUsada(r.paleta);
          setAvisosContraste(r.avisosContraste);
        })
        .catch((e) => {
          if (!cancelado) setError(e.message || 'Erro no preview');
        });
    }, 400);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [dim, blocosResolvidos, colunas, fundoUrl, fundoModo, fontes, mostrarGuia, projeto, contrasteModo, scrimOpacidade]);

  // ── Fecha menu de export em clique fora ──────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    if (showExportMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExportMenu]);

  // ── Blocos: incluir/remover/ordenar/configurar ───────────────────────────
  const toggleMenu = (menuId: string) => {
    setBlocos((prev) =>
      prev.some((b) => b.menu_id === menuId)
        ? prev.filter((b) => b.menu_id !== menuId)
        : [...prev, { menu_id: menuId }]
    );
  };

  const moveBloco = (menuId: string, dir: -1 | 1) => {
    setBlocos((prev) => {
      const idx = prev.findIndex((b) => b.menu_id === menuId);
      const novo = idx + dir;
      if (idx < 0 || novo < 0 || novo >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[novo]] = [arr[novo], arr[idx]];
      return arr;
    });
  };

  const patchBloco = (menuId: string, patch: Partial<LonaBlocoConfig>) => {
    setBlocos((prev) =>
      prev.map((b) => (b.menu_id === menuId ? { ...b, ...patch } : b))
    );
  };

  // ── Uploads ──────────────────────────────────────────────────────────────
  const handleUploadLogo = async (menuId: string, file: File) => {
    try {
      setUploadingLogoId(menuId);
      setError(null);
      const url = await cardapioProjetosService.uploadAsset(file, 'logo');
      await menuA4Service.atualizar(menuId, { logo_url: url });
      setMenus((prev) => prev.map((m) => (m.id === menuId ? { ...m, logo_url: url } : m)));
    } catch (e: any) {
      setError(e.message || 'Erro no upload da logo');
    } finally {
      setUploadingLogoId(null);
    }
  };

  const handleRemoverLogo = async (menuId: string) => {
    try {
      await menuA4Service.atualizar(menuId, { logo_url: null });
      setMenus((prev) => prev.map((m) => (m.id === menuId ? { ...m, logo_url: null } : m)));
    } catch (e: any) {
      setError(e.message || 'Erro ao remover logo');
    }
  };

  const handleUploadFundo = async (file: File) => {
    try {
      setUploadingFundo(true);
      setError(null);
      const url = await cardapioProjetosService.uploadAsset(file, 'fundo-lona');
      setFundoUrl(url);
      setFundoModo('imagem');
    } catch (e: any) {
      setError(e.message || 'Erro no upload do fundo');
    } finally {
      setUploadingFundo(false);
    }
  };

  // ── Salvar ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!projetoId) return;
    if (!nome.trim()) {
      setError('Dê um nome à lona antes de salvar.');
      return;
    }
    try {
      setIsSaving(true);
      setError(null);
      const payload = {
        projeto_id: projetoId,
        nome: nome.trim(),
        largura_cm: dim.larguraCm,
        altura_cm: dim.alturaCm,
        util_largura_cm: dim.utilLarguraCm,
        util_altura_cm: dim.utilAlturaCm,
        util_offset_x_cm: dim.utilOffsetXCm ?? null,
        util_offset_y_cm: dim.utilOffsetYCm ?? null,
        fundo_url: fundoUrl,
        logo_max_largura_cm: logoMaxW,
        logo_max_altura_cm: logoMaxH,
        colunas,
        blocos,
        fontes: fontesLonaSaoPadrao(fontes) ? null : fontes,
        contraste_modo: contrasteModo,
        scrim_opacidade: scrimOpacidade,
      };
      if (isEditMode && id) {
        await lonaService.atualizar(id, payload);
      } else {
        const salva = await lonaService.criar(payload);
        navigate(`/cardapios/projeto/${projetoId}/lona/${salva.id}`, { replace: true });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExport = async (formato: 'png' | 'pdf', modo: LonaFundoModo) => {
    setShowExportMenu(false);
    if (blocosResolvidos.length === 0) return;
    try {
      setIsExporting(true);
      setError(null);
      const filename = `lona-${(nome || 'cardapio').toLowerCase().replace(/\s+/g, '-')}`;
      const opts = {
        tema: projeto?.tema ?? null,
        fundoUrl,
        fundoModo: modo,
        fontes,
        contrasteModo,
        scrimOpacidade,
      };
      if (formato === 'png') {
        await exportLonaPng(dim, blocosResolvidos, colunas, filename, setExportStatus, opts);
      } else {
        await exportLonaPdf(dim, blocosResolvidos, colunas, filename, setExportStatus, opts);
      }
    } catch (e: any) {
      setError(e.message || 'Erro ao exportar');
    } finally {
      setIsExporting(false);
      setExportStatus('');
    }
  };

  const exportPxPerCm = calcExportPxPerCm(dim.larguraCm, dim.alturaCm);

  // ── Campos numéricos em cm ───────────────────────────────────────────────
  const numInput = (
    value: number | null | undefined,
    onChange: (v: number | null) => void,
    opts: { placeholder?: string; allowEmpty?: boolean } = {}
  ) => (
    <input
      type="number"
      min={0}
      step={0.5}
      value={value ?? ''}
      placeholder={opts.placeholder}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '') {
          onChange(opts.allowEmpty ? null : 0);
          return;
        }
        const v = Number(raw);
        if (!Number.isNaN(v)) onChange(v);
      }}
      className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700 bg-slate-50"
    />
  );

  const headerActions = (
    <div className="flex items-center gap-2">
      {saveSuccess && (
        <span className="text-green-600 text-sm font-semibold animate-pulse">✓ Salvo!</span>
      )}
      <button
        onClick={handleSave}
        disabled={isSaving}
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
          disabled={isExporting || blocosResolvidos.length === 0}
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
              Exportar
              <ChevronIcon className={`w-3 h-3 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>

        {showExportMenu && !isExporting && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 min-w-[240px] overflow-hidden">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-2.5 pb-1">
              Com fundo — arquivo final
            </p>
            <button
              onClick={() => handleExport('pdf', fundoUrl ? 'imagem' : 'cor')}
              className="w-full text-left px-3 py-2.5 hover:bg-amber-50 transition-colors"
            >
              <p className="text-sm font-bold text-slate-700">PDF {dim.larguraCm}×{dim.alturaCm}cm</p>
              <p className="text-xs text-slate-400">{fundoUrl ? 'Arte de fundo + cardápio' : 'Cor do tema + cardápio'}</p>
            </button>
            <button
              onClick={() => handleExport('png', fundoUrl ? 'imagem' : 'cor')}
              className="w-full text-left px-3 py-2.5 hover:bg-amber-50 transition-colors border-t border-slate-100"
            >
              <p className="text-sm font-bold text-slate-700">PNG {dim.larguraCm}×{dim.alturaCm}cm</p>
              <p className="text-xs text-slate-400">
                {Math.round(dim.larguraCm * exportPxPerCm)}×{Math.round(dim.alturaCm * exportPxPerCm)}px (~{Math.round(exportPxPerCm * 2.54)}dpi)
              </p>
            </button>

            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-2.5 pb-1 border-t border-slate-200">
              Sem fundo — para compor no Corel
            </p>
            <button
              onClick={() => handleExport('png', 'transparente')}
              className="w-full text-left px-3 py-2.5 hover:bg-amber-50 transition-colors"
            >
              <p className="text-sm font-bold text-slate-700">PNG transparente</p>
              <p className="text-xs text-slate-400">Só o cardápio, mesma posição — alinha 1:1 sobre o vetor</p>
            </button>
            <button
              onClick={() => handleExport('pdf', 'transparente')}
              className="w-full text-left px-3 py-2.5 hover:bg-amber-50 transition-colors border-t border-slate-100"
            >
              <p className="text-sm font-bold text-slate-700">PDF transparente</p>
              <p className="text-xs text-slate-400">Página {dim.larguraCm}×{dim.alturaCm}cm sem a arte</p>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Layout title="Lona de Cardápio">
        <div className="flex items-center justify-center py-24">
          <span className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  const blocosSet = new Set(blocos.map((b) => b.menu_id));

  return (
    <Layout title={isEditMode ? 'Editar Lona' : 'Nova Lona'} headerActions={headerActions}>
      <div className="flex gap-6 h-full min-h-0 p-4">
        {/* ── Painel esquerdo — configuração ──────────────────────────────── */}
        <div className="w-96 flex-shrink-0 flex flex-col gap-4 overflow-y-auto pr-1">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Identificação + dimensões */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col gap-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Lona
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Cubo árvores — frente"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700 bg-slate-50"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 mb-1">Largura final (cm)</p>
                {numInput(dim.larguraCm, (v) => setDim((d) => ({ ...d, larguraCm: v || 1 })))}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 mb-1">Altura final (cm)</p>
                {numInput(dim.alturaCm, (v) => setDim((d) => ({ ...d, alturaCm: v || 1 })))}
              </div>
            </div>
          </div>

          {/* Área útil */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col gap-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Área útil do cardápio
            </label>
            <p className="text-[11px] text-slate-400">
              O cardápio só é distribuído dentro desta área — o resto da lona fica
              livre para as artes do fundo. Offsets vazios = área centralizada.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 mb-1">Largura (cm)</p>
                {numInput(dim.utilLarguraCm, (v) => setDim((d) => ({ ...d, utilLarguraCm: v || 1 })))}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 mb-1">Altura (cm)</p>
                {numInput(dim.utilAlturaCm, (v) => setDim((d) => ({ ...d, utilAlturaCm: v || 1 })))}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 mb-1">Offset X (cm)</p>
                {numInput(dim.utilOffsetXCm, (v) => setDim((d) => ({ ...d, utilOffsetXCm: v })), { placeholder: 'centro', allowEmpty: true })}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 mb-1">Offset Y (cm)</p>
                {numInput(dim.utilOffsetYCm, (v) => setDim((d) => ({ ...d, utilOffsetYCm: v })), { placeholder: 'centro', allowEmpty: true })}
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600 mt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={mostrarGuia}
                onChange={(e) => setMostrarGuia(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-red-500 focus:ring-red-400"
              />
              Mostrar guia da área útil no preview (não sai no export)
            </label>
          </div>

          {/* Fundo */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col gap-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Fundo da lona
            </label>
            <div className="flex gap-1.5">
              {([
                { modo: 'imagem' as const, label: 'Arte', disabled: !fundoUrl },
                { modo: 'cor' as const, label: 'Cor do tema', disabled: false },
                { modo: 'transparente' as const, label: 'Transparente', disabled: false },
              ]).map(({ modo, label, disabled }) => (
                <button
                  key={modo}
                  onClick={() => setFundoModo(modo)}
                  disabled={disabled}
                  className={`flex-1 text-xs font-bold px-2 py-2 rounded-lg border transition-all disabled:opacity-40 ${
                    fundoModo === modo
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 hover:border-blue-400 text-slate-500 hover:text-blue-600 font-bold text-xs px-3 py-2 rounded-xl transition-all cursor-pointer">
                {uploadingFundo ? 'Enviando...' : fundoUrl ? 'Trocar arte de fundo' : 'Enviar arte de fundo'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={uploadingFundo}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadFundo(f);
                    e.target.value = '';
                  }}
                />
              </label>
              {fundoUrl && (
                <button
                  onClick={() => {
                    setFundoUrl(null);
                    setFundoModo('cor');
                  }}
                  className="text-xs font-bold text-red-500 hover:text-red-600 px-2 py-2"
                >
                  Remover
                </button>
              )}
            </div>
          </div>

          {/* Contraste do texto */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col gap-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Contraste do texto
            </label>
            <div className="flex gap-1.5">
              {([
                { modo: 'auto' as const, label: 'Automático' },
                { modo: 'claro' as const, label: 'Texto claro' },
                { modo: 'escuro' as const, label: 'Texto escuro' },
              ]).map(({ modo, label }) => (
                <button
                  key={modo}
                  onClick={() => setContrasteModo(modo)}
                  className={`flex-1 text-xs font-bold px-2 py-2 rounded-lg border transition-all ${
                    contrasteModo === modo
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              Automático mede a luminância da arte dentro da área útil e escolhe
              texto claro (fundo escuro) ou escuro (fundo claro).
              {contrasteModo === 'auto' && paletaUsada && (
                <> Detectado agora: <span className="font-bold text-slate-600">texto {paletaUsada}</span>.</>
              )}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">Véu de contraste</span>
              <input
                type="range"
                min={0}
                max={80}
                step={5}
                value={Math.round(scrimOpacidade * 100)}
                onChange={(e) => setScrimOpacidade(Number(e.target.value) / 100)}
                className="flex-1 accent-indigo-600"
              />
              <span className={`w-10 text-right text-xs font-mono ${scrimOpacidade > 0 ? 'text-indigo-600 font-bold' : 'text-slate-500'}`}>
                {Math.round(scrimOpacidade * 100)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Camada semitransparente atrás da área útil que garante leitura sobre
              artes movimentadas (escura sob texto claro, clara sob texto escuro).
              Sai no export, inclusive no modo transparente.
            </p>
          </div>

          {/* Colunas + logos globais */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col gap-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Distribuição
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 flex-1">Colunas de blocos</span>
              <div className="flex gap-1">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    onClick={() => setColunas(n)}
                    className={`w-8 h-8 text-xs font-bold rounded-lg border transition-all ${
                      colunas === n
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 mb-1">Logo — largura máx. (cm)</p>
                {numInput(logoMaxW, (v) => setLogoMaxW(v || 1))}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 mb-1">Logo — altura máx. (cm)</p>
                {numInput(logoMaxH, (v) => setLogoMaxH(v || 1))}
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Limites globais das logos — proporção sempre preservada; o limite mais
              restritivo manda. Cada bloco pode ter ajuste fino próprio.
            </p>
          </div>

          {/* Blocos */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col gap-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Blocos da lona ({blocos.length} de {menus.length} menus)
            </label>
            <p className="text-[11px] text-slate-400">
              Marque os menus do projeto que entram nesta lona. ★ = bloco destaque
              (largura total, categorias lado a lado — ex.: BAR, vinhos).
            </p>
            {menus.length === 0 && (
              <p className="text-xs text-slate-400 italic py-2">
                Este projeto ainda não tem menus A4 — crie-os na aba Menu A4.
              </p>
            )}
            {/* Selecionados, na ordem da lona */}
            {blocos.map((cfg, idx) => {
              const menu = menus.find((m) => m.id === cfg.menu_id);
              if (!menu) return null;
              return (
                <div key={cfg.menu_id} className="border border-indigo-200 bg-indigo-50/40 rounded-lg p-2 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked
                      onChange={() => toggleMenu(cfg.menu_id)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700 flex-1 truncate">{menu.empresa || menu.titulo}</span>
                    <button
                      onClick={() => patchBloco(cfg.menu_id, { destaque: !cfg.destaque })}
                      title={cfg.destaque ? 'Bloco destaque (clique para desmarcar)' : 'Marcar como destaque (largura total)'}
                      className={`p-0.5 rounded ${cfg.destaque ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'}`}
                    >
                      <StarIcon className="w-4 h-4" filled={!!cfg.destaque} />
                    </button>
                    <button onClick={() => moveBloco(cfg.menu_id, -1)} disabled={idx === 0} className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30">▲</button>
                    <button onClick={() => moveBloco(cfg.menu_id, 1)} disabled={idx === blocos.length - 1} className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30">▼</button>
                  </div>
                  <div className="flex items-center gap-2 pl-6">
                    {menu.logo_url ? (
                      <>
                        <img src={menu.logo_url} alt="" className="h-6 max-w-[64px] object-contain bg-white rounded border border-slate-200" />
                        <label className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer">
                          {uploadingLogoId === menu.id ? 'Enviando...' : 'Trocar'}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            disabled={uploadingLogoId !== null}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUploadLogo(menu.id, f);
                              e.target.value = '';
                            }}
                          />
                        </label>
                        <button onClick={() => handleRemoverLogo(menu.id)} className="text-[11px] font-semibold text-red-400 hover:text-red-600">
                          Remover
                        </button>
                      </>
                    ) : (
                      <label className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer">
                        {uploadingLogoId === menu.id ? 'Enviando logo...' : '+ Logo do estabelecimento'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          disabled={uploadingLogoId !== null}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadLogo(menu.id, f);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    )}
                  </div>
                  {menu.logo_url && (
                    <div className="grid grid-cols-2 gap-2 pl-6">
                      <div>
                        <p className="text-[10px] text-slate-400 mb-0.5">Larg. máx. (cm) — vazio = global</p>
                        {numInput(cfg.logo_max_largura_cm, (v) => patchBloco(cfg.menu_id, { logo_max_largura_cm: v }), { placeholder: `${logoMaxW}`, allowEmpty: true })}
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 mb-0.5">Alt. máx. (cm) — vazio = global</p>
                        {numInput(cfg.logo_max_altura_cm, (v) => patchBloco(cfg.menu_id, { logo_max_altura_cm: v }), { placeholder: `${logoMaxH}`, allowEmpty: true })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {/* Não selecionados */}
            {menus.filter((m) => !blocosSet.has(m.id)).map((menu) => (
              <div key={menu.id} className="border border-slate-200 rounded-lg p-2 flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => toggleMenu(menu.id)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-500 flex-1 truncate">{menu.empresa || menu.titulo}</span>
                {menu.logo_url && <img src={menu.logo_url} alt="" className="h-5 max-w-[48px] object-contain" />}
              </div>
            ))}
          </div>

          {/* Fontes */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-600">Fontes desta lona</p>
              <button
                onClick={() => setFontes({ ...FONTES_LONA_PADRAO })}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
              >
                Voltar ao padrão
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Ajuste em % sobre o tamanho automático — o encaixe recalcula para caber
              na área útil. Salvo junto com a lona.
            </p>
            {CAMPOS_FONTES.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700 flex-1">{label}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setFontes((prev) => ({
                      ...prev,
                      [key]: Math.max(FONTE_MIN, Math.round((prev[key] - FONTE_STEP) * 100) / 100),
                    }))}
                    className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs"
                  >
                    −
                  </button>
                  <span className={`w-11 text-center text-xs font-mono ${fontes[key] !== 1 ? 'text-indigo-600 font-bold' : 'text-slate-500'}`}>
                    {Math.round(fontes[key] * 100)}%
                  </span>
                  <button
                    onClick={() => setFontes((prev) => ({
                      ...prev,
                      [key]: Math.min(FONTE_MAX, Math.round((prev[key] + FONTE_STEP) * 100) / 100),
                    }))}
                    className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}

            {/* Juntar linhas — compressão ponderada (descrição encolhe menos) */}
            <div className="border-t border-slate-100 pt-2 mt-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-700">Juntar linhas</span>
                <span className={`text-xs font-mono ${fontes.linhas !== 1 ? 'text-indigo-600 font-bold' : 'text-slate-500'}`}>
                  {Math.round(fontes.linhas * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={LINHAS_MIN}
                max={LINHAS_MAX}
                step={0.05}
                value={fontes.linhas}
                onChange={(e) => setFontes((prev) => ({ ...prev, linhas: Number(e.target.value) }))}
                className="w-full accent-indigo-600"
              />
              <p className="text-[11px] text-slate-400 mt-0.5">
                Menos = itens mais juntos → a fonte automática cresce para
                preencher a área útil. A descrição (já colada) encolhe menos que
                os espaços largos.
              </p>
            </div>

            {/* Categorias visíveis? (DOCES, LANCHES... de todos os blocos) */}
            <label className="flex items-center justify-between gap-2 cursor-pointer border-t border-slate-100 pt-2">
              <span className="text-xs font-semibold text-slate-700">Mostrar categorias</span>
              <input
                type="checkbox"
                checked={fontes.mostrarCategorias}
                onChange={(e) => setFontes((prev) => ({ ...prev, mostrarCategorias: e.target.checked }))}
                className="w-4 h-4 accent-indigo-600 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* ── Painel direito — preview ─────────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {avisosContraste.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 text-amber-800 text-xs">
              <p className="font-semibold mb-0.5">
                ⚠️ Contraste abaixo de {CONTRASTE_MINIMO.toLocaleString('pt-BR')}:1 em {avisosContraste.length} bloco(s):
              </p>
              <p>
                {avisosContraste
                  .map((a) => `${a.titulo} (${a.ratio.toLocaleString('pt-BR')}:1)`)
                  .join(' · ')}
              </p>
              <p className="mt-0.5 text-amber-700">
                A arte está clara/ruidosa nessas regiões — aumente o véu de contraste
                ou reposicione a área útil.
              </p>
            </div>
          )}
          {abaixoDoMinimo && fonteCm !== null && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 text-amber-800 text-xs font-semibold">
              ⚠️ Fonte dos itens em {(fonteCm * 10).toFixed(1)}mm — abaixo do mínimo
              legível ({MIN_ITEM_FONT_CM * 10}mm para leitura em pé). Reduza itens,
              aumente a área útil ou diminua o número de colunas.
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-auto bg-slate-100 rounded-xl border border-slate-200 flex items-start justify-center p-4">
            {blocosResolvidos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                <PageIcon className="w-16 h-16 opacity-30" />
                <p className="text-sm font-medium">Marque os menus que entram na lona para ver o preview</p>
              </div>
            ) : previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview da lona"
                className="shadow-lg"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <span className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400 text-center">
            Lona {dim.larguraCm}×{dim.alturaCm}cm · área útil {dim.utilLarguraCm}×{dim.utilAlturaCm}cm
            {fonteCm !== null && <> · fonte dos itens ≈ {(fonteCm * 10).toFixed(1)}mm</>}
            {paletaUsada && <> · texto {paletaUsada}{contrasteModo === 'auto' ? ' (auto)' : ''}</>}
            {' '}· export {Math.round(dim.larguraCm * exportPxPerCm)}×{Math.round(dim.alturaCm * exportPxPerCm)}px
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
const StarIcon = ({ filled, ...props }: any) => (
  <svg {...props} fill={filled ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
  </svg>
);

export default CardapioLonaEditor;
