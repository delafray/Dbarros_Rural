import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { cardapioService, Cardapio } from '../services/cardapioService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Cardapios: React.FC = () => {
  const navigate = useNavigate();
  const [cardapios, setCardapios] = useState<Cardapio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await cardapioService.listar();
      setCardapios(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar cardápios');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await cardapioService.excluir(id);
      setCardapios((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const headerActions = (
    <button
      onClick={() => navigate('/cardapios/novo')}
      className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-bold text-sm px-4 py-2 rounded-lg shadow transition-all"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      Novo Cardápio
    </button>
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
      ) : cardapios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
          <MenuBoardIcon className="w-16 h-16 opacity-20" />
          <p className="text-lg font-semibold">Nenhum cardápio cadastrado</p>
          <button
            onClick={() => navigate('/cardapios/novo')}
            className="mt-2 bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm px-5 py-2.5 rounded-lg shadow transition-all"
          >
            Criar primeiro cardápio
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cardapios.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Mini banner preview */}
              <div
                className="w-full h-24 relative flex flex-col items-center justify-center cursor-pointer"
                style={{
                  background: 'linear-gradient(155deg, #071422 0%, #0e254e 50%, #071422 100%)',
                  border: 'none',
                }}
                onClick={() => navigate(`/cardapios/${c.id}`)}
              >
                <span className="text-[10px] font-bold tracking-[4px] text-amber-400 uppercase opacity-80">
                  {c.titulo}
                </span>
                <span
                  className="font-black uppercase text-amber-300 tracking-widest drop-shadow"
                  style={{ fontSize: Math.min(28, Math.floor(160 / Math.max(c.empresa.length, 1))) }}
                >
                  {c.empresa}
                </span>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-60" />
              </div>

              {/* Card info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{c.empresa}</p>
                    <p className="text-xs text-slate-500">{c.titulo}</p>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap mt-0.5">
                    {format(new Date(c.created_at), "dd/MM/yy", { locale: ptBR })}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mb-4">
                  {(c.itens as any[]).reduce((sum, g) => sum + (g.itens?.length || 0), 0)} itens •{' '}
                  {(c.itens as any[]).length} categorias
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/cardapios/${c.id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold py-2 rounded-lg transition-colors"
                  >
                    <EditIcon className="w-3.5 h-3.5" />
                    Editar
                  </button>

                  {confirmDeleteId === c.id ? (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs font-bold px-2 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
                      >
                        Não
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deletingId === c.id}
                        className="text-xs font-bold px-2 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-60"
                      >
                        {deletingId === c.id ? '...' : 'Sim'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(c.id)}
                      className="flex items-center justify-center p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                      title="Excluir"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
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
const EditIcon = (props: any) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
  </svg>
);
const TrashIcon = (props: any) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

export default Cardapios;
