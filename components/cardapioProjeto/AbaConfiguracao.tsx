import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  cardapioProjetosService,
  CardapioProjeto,
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

interface AbaConfiguracaoProps {
  projeto: CardapioProjeto;
  onProjetoChange: (projeto: CardapioProjeto) => void;
}

export const AbaConfiguracao: React.FC<AbaConfiguracaoProps> = ({ projeto, onProjetoChange }) => {
  const [nome, setNome] = useState(projeto.nome);
  const [edicaoId, setEdicaoId] = useState<string | null>(projeto.edicao_id);
  const [tema, setTema] = useState<CardapioTema>(resolveTema(projeto.tema));
  const [fundoUrl, setFundoUrl] = useState<string | null>(projeto.fundo_url);
  const [chancelaUrl, setChancelaUrl] = useState<string | null>(projeto.chancela_url);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<'fundo' | 'chancela' | null>(null);

  const fundoInputRef = useRef<HTMLInputElement>(null);
  const chancelaInputRef = useRef<HTMLInputElement>(null);

  // ── Mini-preview do tema (usa o mesmo renderer do banner) ─────────────────
  const [previewUrl, setPreviewUrl] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      renderCardapioToDataURL('CHURRASCO BBQ', 'EXEMPLO', PREVIEW_GRUPOS, 1, {
        tema,
        fundoUrl,
      })
        .then(setPreviewUrl)
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [tema, fundoUrl]);

  const isTemaPadrao = useMemo(
    () =>
      (Object.keys(TEMA_PADRAO) as (keyof CardapioTema)[]).every(
        (k) => tema[k].toLowerCase() === TEMA_PADRAO[k].toLowerCase()
      ),
    [tema]
  );

  const handleUpload = async (tipo: 'fundo' | 'chancela', file: File | null) => {
    if (!file) return;
    try {
      setUploading(tipo);
      setError(null);
      const url = await cardapioProjetosService.uploadAsset(file, tipo);
      if (tipo === 'fundo') setFundoUrl(url);
      else setChancelaUrl(url);
    } catch (e: any) {
      setError(e.message || 'Erro no upload');
    } finally {
      setUploading(null);
    }
  };

  const handleRestaurarPadrao = () => {
    setTema({ ...TEMA_PADRAO });
    setFundoUrl(null);
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
        fundo_url: fundoUrl,
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

        {/* Imagens */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-4">
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Imagem de fundo
            </p>
            <p className="text-xs text-slate-400 mb-2">
              Aplicada no banner e no menu A4 (modo cover). Recomendado: até ~3000px e 4MB.
            </p>
            <input
              ref={fundoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => handleUpload('fundo', e.target.files?.[0] ?? null)}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => fundoInputRef.current?.click()}
                disabled={uploading === 'fundo'}
                className="flex-1 py-2.5 px-4 rounded-lg border-2 border-dashed border-slate-300 hover:border-amber-400 text-sm font-medium text-slate-500 hover:text-amber-600 transition-all disabled:opacity-50"
              >
                {uploading === 'fundo' ? 'Enviando...' : fundoUrl ? 'Trocar imagem' : 'Enviar imagem de fundo'}
              </button>
              {fundoUrl && (
                <button
                  onClick={() => setFundoUrl(null)}
                  className="text-xs font-bold px-3 py-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500"
                >
                  Remover
                </button>
              )}
            </div>
            {fundoUrl && (
              <img
                src={fundoUrl}
                alt="Fundo do projeto"
                className="mt-2 w-full h-24 object-cover rounded-lg border border-slate-200"
              />
            )}
          </div>

          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Chancela do rodapé (A4)
            </p>
            <p className="text-xs text-slate-400 mb-2">
              Sem imagem, o A4 usa a chancela padrão do sistema.
            </p>
            <input
              ref={chancelaInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => handleUpload('chancela', e.target.files?.[0] ?? null)}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => chancelaInputRef.current?.click()}
                disabled={uploading === 'chancela'}
                className="flex-1 py-2.5 px-4 rounded-lg border-2 border-dashed border-slate-300 hover:border-amber-400 text-sm font-medium text-slate-500 hover:text-amber-600 transition-all disabled:opacity-50"
              >
                {uploading === 'chancela' ? 'Enviando...' : chancelaUrl ? 'Trocar chancela' : 'Enviar chancela custom'}
              </button>
              {chancelaUrl && (
                <button
                  onClick={() => setChancelaUrl(null)}
                  className="text-xs font-bold px-3 py-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500"
                >
                  Remover
                </button>
              )}
            </div>
            {chancelaUrl && (
              <img
                src={chancelaUrl}
                alt="Chancela do projeto"
                className="mt-2 w-full h-16 object-contain rounded-lg border border-slate-200 bg-slate-50"
              />
            )}
          </div>
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
          As alterações se aplicam aos menus A4, banners e painéis deste projeto após salvar.
        </p>
      </div>
    </div>
  );
};

export default AbaConfiguracao;
