import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  cardapioProjetosService,
  CardapioProjetoComContagens,
} from '../services/cardapioProjetosService';
import EventoEdicaoSelect from '../components/cardapioProjeto/EventoEdicaoSelect';
import { PROMPT_CARDAPIO_IA } from '../components/cardapioProjeto/promptCardapioIA';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CardapioProjetos: React.FC = () => {
  const navigate = useNavigate();
  const [projetos, setProjetos] = useState<CardapioProjetoComContagens[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Modal "Novo Projeto" ────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novaEdicaoId, setNovaEdicaoId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // ── Exclusão ────────────────────────────────────────────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Modal do prompt de formatação via IA ────────────────────────────────
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptCopiado, setPromptCopiado] = useState(false);

  const handleCopiarPrompt = async () => {
    try {
      await navigator.clipboard.writeText(PROMPT_CARDAPIO_IA);
      setPromptCopiado(true);
      setTimeout(() => setPromptCopiado(false), 2500);
    } catch {
      alert('Não foi possível copiar automaticamente — selecione o texto e copie manualmente.');
    }
  };

  const load = () => {
    setIsLoading(true);
    setError(null);
    cardapioProjetosService
      .listarComContagens()
      .then(setProjetos)
      .catch((e) => setError(e.message || 'Erro ao carregar projetos'))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const handleCriar = async () => {
    if (!novoNome.trim()) return;
    try {
      setIsCreating(true);
      const criado = await cardapioProjetosService.criar({
        nome: novoNome.trim(),
        edicao_id: novaEdicaoId,
      });
      navigate(`/cardapios/projeto/${criado.id}?tab=config`);
    } catch (e: any) {
      setError(e.message || 'Erro ao criar projeto');
      setIsCreating(false);
      setShowModal(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await cardapioProjetosService.excluir(id);
      setProjetos((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      setError(e.message || 'Erro ao excluir');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const headerActions = (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setShowPrompt(true)}
        title="Prompt pronto para colar numa IA e formatar cardápios bagunçados no padrão do sistema"
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2 rounded-lg shadow transition-all"
      >
        <SparklesIcon className="w-4 h-4" />
        Prompt p/ IA
      </button>
      <button
        onClick={() => { setNovoNome(''); setNovaEdicaoId(null); setShowModal(true); }}
        className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-bold text-sm px-4 py-2 rounded-lg shadow transition-all"
      >
        <PlusIcon className="w-4 h-4" />
        Novo Projeto
      </button>
    </div>
  );

  return (
    <Layout title="Cardápios" headerActions={headerActions}>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projetos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
          <MenuBoardIcon className="w-16 h-16 opacity-20" />
          <p className="text-lg font-semibold">Nenhum projeto de cardápio</p>
          <p className="text-sm">Crie um projeto por evento (ex: 91ª EXPOZEBU, Campolina...)</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-2 bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm px-5 py-2.5 rounded-lg shadow transition-all"
          >
            Criar primeiro projeto
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Projeto / Evento</th>
                <th className="px-4 py-3 text-center">Menus A4</th>
                <th className="px-4 py-3 text-center">Banners</th>
                <th className="px-4 py-3 text-center">Tema</th>
                <th className="px-4 py-3">Criado em</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projetos.map((p) => (
                <tr
                  key={p.id}
                  className="transition-colors cursor-pointer hover:bg-slate-50"
                  onClick={() => navigate(`/cardapios/projeto/${p.id}`)}
                >
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800">{p.nome}</p>
                    {p.edicao_id && (
                      <p className="text-xs text-green-600">✓ evento cadastrado</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">{p.totalA4}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{p.totalBanners}</td>
                  <td className="px-4 py-3 text-center">
                    {p.tema || p.fundo_banner_url || p.fundo_a4_url || p.fundo_a3_url || p.chancela_url ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-white shadow"
                          style={{ background: p.tema?.corFundo || '#011464' }}
                        />
                        personalizado
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">padrão</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {format(new Date(p.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {confirmDeleteId === p.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-red-600 font-medium">
                          Apaga {p.totalA4 + p.totalBanners} cardápio(s)!
                        </span>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs font-bold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                        >
                          Não
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deletingId === p.id}
                          className="text-xs font-bold px-2 py-1 rounded bg-red-500 hover:bg-red-600 text-white disabled:opacity-60"
                        >
                          {deletingId === p.id ? '...' : 'Sim'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(p.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                        title="Excluir projeto (apaga os cardápios dele)"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal do Prompt p/ IA ──────────────────────────────────────────── */}
      {showPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowPrompt(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Prompt de formatação para IA</h2>
                <p className="text-sm text-slate-400">
                  Transforma cardápios bagunçados (WhatsApp, fotos) no padrão exato do sistema.
                </p>
              </div>
              <button
                onClick={() => setShowPrompt(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 space-y-1 mb-3">
              <p><strong>1.</strong> Copie o prompt e cole numa IA (ChatGPT, Claude, Gemini...).</p>
              <p><strong>2.</strong> Envie os cardápios bagunçados — um por vez ou todos juntos; ela separa por estabelecimento.</p>
              <p><strong>3.</strong> Para cada estabelecimento, selecione da linha do segmento até a última linha da tabela e copie.</p>
              <p className="bg-amber-100 border border-amber-200 rounded-lg px-2 py-1.5 text-amber-800">
                <strong>4. ⚠️ Cole PRIMEIRO no Excel</strong> (a tabela vira células) e então <strong>copie do Excel</strong> o bloco inteiro.
              </p>
              <p><strong>5.</strong> Cole no editor (Novo Menu A4 ou Novo Cardápio) — as colunas entram certinhas.</p>
            </div>

            <pre className="flex-1 min-h-0 overflow-auto bg-slate-50 border border-slate-200 rounded-xl p-4 text-[11px] leading-relaxed text-slate-700 whitespace-pre-wrap font-mono">
              {PROMPT_CARDAPIO_IA}
            </pre>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowPrompt(false)}
                className="text-sm font-semibold text-slate-500 hover:text-slate-700 px-4 py-2"
              >
                Fechar
              </button>
              <button
                onClick={handleCopiarPrompt}
                className={`flex items-center gap-2 font-bold text-sm px-5 py-2 rounded-lg shadow transition-all text-white ${
                  promptCopiado ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {promptCopiado ? '✓ Copiado!' : 'Copiar prompt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Novo Projeto ─────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !isCreating && setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-slate-800 mb-1">Novo Projeto de Cardápio</h2>
            <p className="text-sm text-slate-400 mb-4">
              Um projeto agrupa os menus A4, banners e painéis de um evento.
            </p>

            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Evento
            </label>
            <EventoEdicaoSelect
              nome={novoNome}
              onChange={({ nome, edicaoId }) => {
                setNovoNome(nome);
                setNovaEdicaoId(edicaoId);
              }}
              autoFocus
            />
            {novaEdicaoId && (
              <p className="mt-1.5 text-xs text-green-600 font-medium">
                ✓ Vinculado a um evento cadastrado
              </p>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                disabled={isCreating}
                className="text-sm font-semibold text-slate-500 hover:text-slate-700 px-4 py-2"
              >
                Cancelar
              </button>
              <button
                onClick={handleCriar}
                disabled={isCreating || !novoNome.trim()}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-300 text-white font-bold text-sm px-5 py-2 rounded-lg shadow transition-all"
              >
                {isCreating && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {isCreating ? 'Criando...' : 'Criar projeto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

const MenuBoardIcon = (props: any) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
  </svg>
);
const TrashIcon = (props: any) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);
const PlusIcon = (props: any) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);
const SparklesIcon = (props: any) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
  </svg>
);

export default CardapioProjetos;
