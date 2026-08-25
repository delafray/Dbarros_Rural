import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lonaService, CardapioLona } from '../../services/lonaService';
import { CardapioProjeto } from '../../services/cardapioProjetosService';

interface AbaLonaProps {
  projeto: CardapioProjeto;
}

export const AbaLona: React.FC<AbaLonaProps> = ({ projeto }) => {
  const navigate = useNavigate();
  const [lonas, setLonas] = useState<CardapioLona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    lonaService
      .listar(projeto.id)
      .then(setLonas)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projeto.id]);

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await lonaService.excluir(id);
      setLonas((prev) => prev.filter((l) => l.id !== id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-end gap-3 mb-4">
        <button
          onClick={() => navigate(`/cardapios/projeto/${projeto.id}/lona/novo`)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2 rounded-lg shadow transition-all"
        >
          <PlusIcon className="w-4 h-4" />
          Nova Lona
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : lonas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
          <BannerIcon className="w-16 h-16 opacity-25" />
          <p className="text-base font-medium">Nenhuma lona neste projeto</p>
          <p className="text-sm max-w-md text-center">
            A lona agrega os menus A4 do projeto num formato grande de impressão
            (ex.: 100×300cm) com área útil configurável e logos por estabelecimento.
          </p>
          <button
            onClick={() => navigate(`/cardapios/projeto/${projeto.id}/lona/novo`)}
            className="text-blue-600 hover:underline text-sm font-semibold"
          >
            Criar primeira lona →
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Lona</th>
                <th className="px-4 py-3 text-center">Dimensões</th>
                <th className="px-4 py-3 text-center">Área útil</th>
                <th className="px-4 py-3 text-center">Blocos</th>
                <th className="px-4 py-3">Criada em</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lonas.map((lona) => (
                <tr
                  key={lona.id}
                  className="transition-colors cursor-pointer hover:bg-slate-50"
                  onClick={() => navigate(`/cardapios/projeto/${projeto.id}/lona/${lona.id}`)}
                >
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800">{lona.nome}</p>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600 whitespace-nowrap">
                    {Number(lona.largura_cm)}×{Number(lona.altura_cm)}cm
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600 whitespace-nowrap">
                    {Number(lona.util_largura_cm)}×{Number(lona.util_altura_cm)}cm
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">
                    {lona.blocos?.length ?? 0}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {new Date(lona.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => navigate(`/cardapios/projeto/${projeto.id}/lona/${lona.id}`)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                        title="Editar"
                      >
                        <EditIcon className="w-4 h-4" />
                      </button>
                      {confirmDeleteId === lona.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs font-bold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                          >
                            Não
                          </button>
                          <button
                            onClick={() => handleDelete(lona.id)}
                            disabled={deletingId === lona.id}
                            className="text-xs font-bold px-2 py-1 rounded bg-red-500 hover:bg-red-600 text-white disabled:opacity-60"
                          >
                            {deletingId === lona.id ? '...' : 'Sim'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(lona.id)}
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
    </div>
  );
};

const PlusIcon   = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>;
const EditIcon   = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>;
const TrashIcon  = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>;
const BannerIcon = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><rect x="7" y="2" width="10" height="20" rx="1"/><path strokeLinecap="round" d="M9.5 6h5M9.5 9h5M9.5 12h3"/></svg>;

export default AbaLona;
