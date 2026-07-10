import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { menuA4Service } from '../../services/menuA4Service';
import { CardapioProjeto } from '../../services/cardapioProjetosService';

interface AbaMenuA4Props {
  projeto: CardapioProjeto;
}

export const AbaMenuA4: React.FC<AbaMenuA4Props> = ({ projeto }) => {
  const navigate = useNavigate();
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    menuA4Service
      .listar(projeto.id)
      .then(setMenus)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projeto.id]);

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await menuA4Service.excluir(id);
      setMenus((prev) => prev.filter((m) => m.id !== id));
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === menus.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(menus.map((m) => m.id));
    }
  };

  const handleGerarA3 = () => {
    if (selectedIds.length === 0) return;
    navigate('/a3-preview-a4', { state: { selectedIds, projetoId: projeto.id } });
  };

  return (
    <div>
      {/* Toolbar da aba */}
      <div className="flex items-center justify-end gap-3 mb-4">
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
          onClick={() => navigate(`/cardapios/projeto/${projeto.id}/a4/novo`)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2 rounded-lg shadow transition-all"
        >
          <PlusIcon className="w-4 h-4" />
          Novo Menu A4
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
      ) : menus.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
          <PageIcon className="w-16 h-16 opacity-25" />
          <p className="text-base font-medium">Nenhum menu A4 neste projeto</p>
          <button
            onClick={() => navigate(`/cardapios/projeto/${projeto.id}/a4/novo`)}
            className="text-blue-600 hover:underline text-sm font-semibold"
          >
            Criar primeiro menu A4 →
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
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    checked={menus.length > 0 && selectedIds.length === menus.length}
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
              {menus.map((menu) => (
                <tr
                  key={menu.id}
                  className={`transition-colors cursor-pointer ${
                    selectedIds.includes(menu.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                  }`}
                  onClick={() => navigate(`/cardapios/projeto/${projeto.id}/a4/${menu.id}`)}
                >
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      checked={selectedIds.includes(menu.id)}
                      onChange={() => toggleSelect(menu.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800">{menu.empresa}</p>
                    {menu.titulo && <p className="text-xs text-slate-400">{menu.titulo}</p>}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">
                    {(menu.itens as any[])?.length ?? 0}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">
                    {(menu.itens as any[])?.reduce((s: number, g: any) => s + (g.itens?.length ?? 0), 0) ?? 0}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {new Date(menu.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => navigate(`/cardapios/projeto/${projeto.id}/a4/${menu.id}`)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                        title="Editar"
                      >
                        <EditIcon className="w-4 h-4" />
                      </button>
                      {confirmDeleteId === menu.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs font-bold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                          >
                            Não
                          </button>
                          <button
                            onClick={() => handleDelete(menu.id)}
                            disabled={deletingId === menu.id}
                            className="text-xs font-bold px-2 py-1 rounded bg-red-500 hover:bg-red-600 text-white disabled:opacity-60"
                          >
                            {deletingId === menu.id ? '...' : 'Sim'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(menu.id)}
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

const PlusIcon  = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>;
const PageIcon  = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>;
const EditIcon  = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>;
const TrashIcon = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>;
const PrintIcon = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>;

export default AbaMenuA4;
