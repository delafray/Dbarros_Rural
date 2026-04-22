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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === cardapios.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(cardapios.map((c) => c.id));
    }
  };

  const handleGerarA3 = () => {
    if (selectedIds.length === 0) return;
    navigate('/a3-preview-cardapios', { state: { selectedIds } });
  };

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
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const headerActions = (
    <div className="flex items-center gap-3">
      {selectedIds.length > 0 && (
        <button
          onClick={handleGerarA3}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2 rounded-lg shadow transition-all animate-in fade-in zoom-in"
        >
          <PrintIcon className="w-4 h-4" />
          Gerar A3 Duplo ({selectedIds.length})
        </button>
      )}
      <button
        onClick={() => navigate('/cardapios/novo')}
        className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-bold text-sm px-4 py-2 rounded-lg shadow transition-all"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Novo Cardápio
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 w-12 text-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    checked={cardapios.length > 0 && selectedIds.length === cardapios.length}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-4 py-3">Empresa / Título</th>
                <th className="px-4 py-3 text-center">Categorias</th>
                <th className="px-4 py-3 text-center">Itens</th>
                <th className="px-4 py-3">Criado em</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cardapios.map((c) => (
                <tr
                  key={c.id}
                  className={`transition-colors cursor-pointer ${
                    selectedIds.includes(c.id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50'
                  }`}
                  onClick={() => navigate(`/cardapios/${c.id}`)}
                >
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      checked={selectedIds.includes(c.id)}
                      onChange={(e) => toggleSelect(c.id, e as any)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800">{c.empresa}</p>
                    {c.titulo && <p className="text-xs text-slate-400">{c.titulo}</p>}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">
                    {(c.itens as any[]).length}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">
                    {(c.itens as any[]).reduce((sum, g) => sum + (g.itens?.length || 0), 0)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => navigate(`/cardapios/${c.id}`)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                        title="Editar"
                      >
                        <EditIcon className="w-4 h-4" />
                      </button>
                      {confirmDeleteId === c.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs font-bold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                          >
                            Não
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            disabled={deletingId === c.id}
                            className="text-xs font-bold px-2 py-1 rounded bg-red-500 hover:bg-red-600 text-white disabled:opacity-60"
                          >
                            {deletingId === c.id ? '...' : 'Sim'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(c.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                          title="Excluir"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
const PrintIcon = (props: any) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
  </svg>
);

export default Cardapios;
