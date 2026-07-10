import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  cardapioProjetosService,
  CardapioProjeto,
  CardapioAssetTipo,
} from '../../services/cardapioProjetosService';
import {
  CardapioTema,
  TEMA_PADRAO,
  resolveTema,
} from '../../utils/cardapioTema';
import { renderCardapioToDataURL } from '../cardapio/CardapioRenderer';
import { CardapioGroup } from '../../utils/cardapioParser';
import EventoEdicaoSelect from './EventoEdicaoSelect';

// Menu de exemplo para o mini-preview do tema
const PREVIEW_GRUPOS: CardapioGroup[] = [
  {
    categoria: 'CORTES NA BRASA',
    itens: [
      { item: 'Picanha na Brasa', valor: 'R$ 69,00', descricao: '~250g grelhada na parrilla, farofa do chef' },
      { item: 'Ancho na Parrilla', valor: 'R$ 65,00', descricao: '' },
    ],
  },
  {
    categoria: 'BEBIDAS',
    itens: [
      { item: 'Chopp Artesanal', valor: 'R$ 15,00', descricao: '' },
      { item: 'Caipirinha', valor: 'R$ 18,00', descricao: '' },
    ],
  },
];

const CAMPOS_TEMA: { key: keyof CardapioTema; label: string; hint: string }[] = [
  { key: 'corFundo',        label: 'Fundo',           hint: 'Cor dos painéis (sob a imagem de fundo)' },
  { key: 'corDourado',      label: 'Destaque',        hint: 'Linhas, brilhos e parafusos' },
  { key: 'corDouradoClaro', label: 'Destaque claro',  hint: 'Empresa, categorias e preços' },
  { key: 'corTexto',        label: 'Texto',           hint: 'Nomes dos itens' },
  { key: 'corTextoSuave',   label: 'Texto suave',     hint: 'Descrições e pontilhados' },
];

// ─── Campo de upload de imagem reutilizável ───────────────────────────────────
interface ImagemUploadFieldProps {
  titulo: string;
  hint: string;
  url: string | null;
  uploading: boolean;
  previewClass: string; // controla proporção/enquadramento da miniatura
  onFile: (file: File | null) => void;
  onRemove: () => void;
}

const ImagemUploadField: React.FC<ImagemUploadFieldProps> = ({
  titulo, hint, url, uploading, previewClass, onFile, onRemove,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">{titulo}</p>
      <p className="text-xs text-slate-400 mb-2">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0] ?? null);
          e.target.value = ''; // permite re-selecionar o mesmo arquivo
        }}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex-1 py-2.5 px-4 rounded-lg border-2 border-dashed border-slate-300 hover:border-amber-400 text-sm font-medium text-slate-500 hover:text-amber-600 transition-all disabled:opacity-50"
        >
          {uploading ? 'Enviando...' : url ? 'Trocar imagem' : 'Enviar imagem'}
        </button>
        {url && (
          <button
            onClick={onRemove}
            className="text-xs font-bold px-3 py-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500"
          >
            Remover
          </button>
        )}
      </div>
      {url && (
        <img src={url} alt={titulo} className={`mt-2 w-full rounded-lg border border-slate-200 ${previewClass}`} />
      )}
    </div>
  );
};

// ─── Aba de Configuração ──────────────────────────────────────────────────────
interface AbaConfiguracaoProps {
  projeto: CardapioProjeto;
  onProjetoChange: (projeto: CardapioProjeto) => void;
}

export const AbaConfiguracao: React.FC<AbaConfiguracaoProps> = ({ projeto, onProjetoChange }) => {
  const [nome, setNome] = useState(projeto.nome);
  const [edicaoId, setEdicaoId] = useState<string | null>(projeto.edicao_id);
  const [tema, setTema] = useState<CardapioTema>(resolveTema(projeto.tema));
  const [fundoBannerUrl, setFundoBannerUrl] = useState<string | null>(projeto.fundo_banner_url);
  const [fundoA4Url, setFundoA4Url] = useState<string | null>(projeto.fundo_a4_url);
  const [fundoA3Url, setFundoA3Url] = useState<string | null>(projeto.fundo_a3_url);
  const [chancelaUrl, setChancelaUrl] = useState<string | null>(projeto.chancela_url);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<CardapioAssetTipo | null>(null);

  // ── Mini-preview do tema (usa o mesmo renderer do banner) ─────────────────
  const [previewUrl, setPreviewUrl] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      renderCardapioToDataURL('CHURRASCO BBQ', 'EXEMPLO', PREVIEW_GRUPOS, 1, {
        tema,
        fundoUrl: fundoBannerUrl,
      })
        .then(setPreviewUrl)
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [tema, fundoBannerUrl]);

  const isTemaPadrao = useMemo(
    () =>
      (Object.keys(TEMA_PADRAO) as (keyof CardapioTema)[]).every(
        (k) => tema[k].toLowerCase() === TEMA_PADRAO[k].toLowerCase()
      ),
    [tema]
  );

  const setterPorTipo: Record<CardapioAssetTipo, (url: string | null) => void> = {
    'fundo-banner': setFundoBannerUrl,
    'fundo-a4': setFundoA4Url,
    'fundo-a3': setFundoA3Url,
    'chancela': setChancelaUrl,
  };

  const handleUpload = async (tipo: CardapioAssetTipo, file: File | null) => {
    if (!file) return;
    try {
      setUploading(tipo);
      setError(null);
      const url = await cardapioProjetosService.uploadAsset(file, tipo);
      setterPorTipo[tipo](url);
    } catch (e: any) {
      setError(e.message || 'Erro no upload');
    } finally {
      setUploading(null);
    }
  };

  const handleRestaurarPadrao = () => {
    setTema({ ...TEMA_PADRAO });
    setFundoBannerUrl(null);
    setFundoA4Url(null);
    setFundoA3Url(null);
    setChancelaUrl(null);
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      setError('O nome do projeto é obrigatório.');
      return;
    }
    try {
      setIsSaving(true);
      setError(null);
      const atualizado = await cardapioProjetosService.atualizar(projeto.id, {
        nome: nome.trim(),
        edicao_id: edicaoId,
        tema: isTemaPadrao ? null : tema,
        fundo_banner_url: fundoBannerUrl,
        fundo_a4_url: fundoA4Url,
        fundo_a3_url: fundoA3Url,
        chancela_url: chancelaUrl,
      });
      onProjetoChange(atualizado);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* ── Formulário ─────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-[420px] flex-shrink-0 flex flex-col gap-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="ml-4 font-bold">×</button>
          </div>
        )}

        {/* Evento */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
            Evento do projeto
          </p>
          <p className="text-xs text-slate-400 mb-3">
            Escolha um evento cadastrado na lista ou digite um nome livre.
          </p>
          <EventoEdicaoSelect
            nome={nome}
            onChange={({ nome: n, edicaoId: id }) => {
              setNome(n);
              setEdicaoId(id);
            }}
          />
          {edicaoId && (
            <p className="mt-2 text-xs text-green-600 font-medium">
              ✓ Vinculado a um evento cadastrado no sistema
            </p>
          )}
        </div>

        {/* Cores */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
            Cores do tema
          </p>
          <div className="flex flex-col gap-2.5">
            {CAMPOS_TEMA.map(({ key, label, hint }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="color"
                  value={tema[key]}
                  onChange={(e) => setTema((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
                />
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-slate-700">{label}</span>
                  <span className="block text-xs text-slate-400">{hint}</span>
                </span>
                <code className="text-xs text-slate-400 uppercase">{tema[key]}</code>
              </label>
            ))}
          </div>
        </div>

        {/* Fundos por formato */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-4">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider -mb-1">
            Imagens de fundo (por formato)
          </p>
          <ImagemUploadField
            titulo="Fundo do Banner"
            hint="Paisagem 1600×880 (2m × 1,10m) — também usado no Painel Duplo. Até ~3000px / 4MB."
            url={fundoBannerUrl}
            uploading={uploading === 'fundo-banner'}
            previewClass="h-20 object-cover"
            onFile={(f) => handleUpload('fundo-banner', f)}
            onRemove={() => setFundoBannerUrl(null)}
          />
          <ImagemUploadField
            titulo="Fundo do Menu A4"
            hint="Retrato 210×297mm (A4). Aplicado em modo cover no preview e no PNG."
            url={fundoA4Url}
            uploading={uploading === 'fundo-a4'}
            previewClass="h-28 object-cover"
            onFile={(f) => handleUpload('fundo-a4', f)}
            onRemove={() => setFundoA4Url(null)}
          />
          <ImagemUploadField
            titulo="Fundo do A3 Duplo"
            hint="Retrato 297×420mm (A3). Sai na impressão/PDF das páginas A3."
            url={fundoA3Url}
            uploading={uploading === 'fundo-a3'}
            previewClass="h-28 object-cover"
            onFile={(f) => handleUpload('fundo-a3', f)}
            onRemove={() => setFundoA3Url(null)}
          />
        </div>

        {/* Chancela */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <ImagemUploadField
            titulo="Chancela do rodapé (A4)"
            hint="Sem imagem, o A4 usa a chancela padrão do sistema."
            url={chancelaUrl}
            uploading={uploading === 'chancela'}
            previewClass="h-16 object-contain bg-slate-50"
            onFile={(f) => handleUpload('chancela', f)}
            onRemove={() => setChancelaUrl(null)}
          />
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm px-5 py-2.5 rounded-lg shadow transition-all"
          >
            {isSaving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            {isSaving ? 'Salvando...' : 'Salvar configuração'}
          </button>
          <button
            onClick={handleRestaurarPadrao}
            className="text-sm font-semibold text-slate-500 hover:text-slate-700 px-3 py-2.5"
            title="Volta para o visual padrão (azul + dourado, sem imagens)"
          >
            Restaurar visual padrão
          </button>
          {saveSuccess && (
            <span className="text-green-600 text-sm font-semibold animate-pulse">✓ Salvo!</span>
          )}
        </div>
      </div>

      {/* ── Mini-preview ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
          Preview do tema (banner de exemplo)
        </p>
        <div className="w-full rounded-2xl border border-slate-200 shadow-inner bg-slate-900 overflow-hidden" style={{ minHeight: 200 }}>
          {previewUrl ? (
            <img src={previewUrl} alt="Preview do tema" style={{ width: '100%', height: 'auto', display: 'block' }} />
          ) : (
            <div className="flex items-center justify-center py-20 text-slate-500 text-sm opacity-40">
              Gerando preview...
            </div>
          )}
        </div>
        <p className="text-xs text-slate-400 text-center">
          O preview usa o fundo do Banner. Os fundos de A4 e A3 aparecem nos próprios editores/previews. Alterações valem após salvar.
        </p>
      </div>
    </div>
  );
};

export default AbaConfiguracao;
