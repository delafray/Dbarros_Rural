import React from "react";
import { ImagemConfig, AvulsoStatus } from "../../services/imagensService";

interface ControleAvulsasSectionProps {
  avulsas: ImagemConfig[];
  avulsaAddOpen: boolean;
  setAvulsaAddOpen: (v: boolean) => void;
  novaAvulsa: { tipo: "imagem" | "logo"; descricao: string; dimensoes: string };
  setNovaAvulsa: React.Dispatch<React.SetStateAction<{ tipo: "imagem" | "logo"; descricao: string; dimensoes: string }>>;
  savingAvulsa: boolean;
  editingAvulsa: { id: string; tipo: "imagem" | "logo"; descricao: string; dimensoes: string } | null;
  setEditingAvulsa: (v: { id: string; tipo: "imagem" | "logo"; descricao: string; dimensoes: string } | null) => void;
  handleAddAvulsa: () => void;
  handleUpdateAvulsoStatus: (id: string, status: AvulsoStatus) => void;
  handleRemoveAvulsa: (id: string) => void;
  handleUpdateAvulsa: () => void;
}

const avulsoStatusColor: Record<string, string> = {
  pendente: "bg-slate-100 text-slate-600",
  solicitado: "bg-blue-100 text-blue-700",
  recebido: "bg-green-100 text-green-700",
};

const ControleAvulsasSection: React.FC<ControleAvulsasSectionProps> = ({
  avulsas,
  avulsaAddOpen,
  setAvulsaAddOpen,
  novaAvulsa,
  setNovaAvulsa,
  savingAvulsa,
  editingAvulsa,
  setEditingAvulsa,
  handleAddAvulsa,
  handleUpdateAvulsoStatus,
  handleRemoveAvulsa,
  handleUpdateAvulsa,
}) => {
  return (
    <div className="mt-4 bg-white border border-slate-200 overflow-hidden shadow-sm">
      <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
        <div>
          <span className="font-bold text-sm uppercase tracking-wider">Imagens Avulsas</span>
          <span className="ml-3 text-slate-400 text-xs">nao vinculadas a stands especificos (produtor, portal de entrada, palco...)</span>
        </div>
        <button
          onClick={() => { setAvulsaAddOpen(!avulsaAddOpen); setNovaAvulsa({ tipo: "imagem", descricao: "", dimensoes: "" }); }}
          className="text-xs bg-violet-700 hover:bg-violet-600 text-white px-4 py-1.5 font-bold transition-colors"
        >
          + Adicionar
        </button>
      </div>

      {avulsaAddOpen && (
        <div className="px-5 py-3 bg-violet-50 border-b border-violet-200 flex gap-2 items-center flex-wrap">
          <select
            value={novaAvulsa.tipo}
            onChange={(e) => setNovaAvulsa((p) => ({ ...p, tipo: e.target.value as "imagem" | "logo", dimensoes: "" }))}
            className="border border-slate-300 text-sm px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 w-28 shrink-0"
          >
            <option value="imagem">&#x1f4d0; Imagem</option>
            <option value="logo">&#x1f3f7;&#xfe0f; Logo</option>
          </select>
          <input
            autoFocus
            type="text"
            placeholder="Descricao (ex: Fundo de Palco)"
            className="flex-1 min-w-[180px] border border-slate-300 text-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400"
            value={novaAvulsa.descricao}
            onChange={(e) => setNovaAvulsa((p) => ({ ...p, descricao: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && handleAddAvulsa()}
          />
          {novaAvulsa.tipo === "imagem" && (
            <input
              type="text"
              placeholder="Dimensoes (ex: 10x5)"
              className="w-32 shrink-0 border border-slate-300 text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400"
              value={novaAvulsa.dimensoes}
              onChange={(e) => setNovaAvulsa((p) => ({ ...p, dimensoes: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleAddAvulsa()}
            />
          )}
          <button
            onClick={handleAddAvulsa}
            disabled={savingAvulsa || !novaAvulsa.descricao.trim()}
            className="text-sm bg-violet-700 hover:bg-violet-600 text-white px-5 py-1.5 font-bold transition-colors disabled:opacity-50 shrink-0"
          >
            {savingAvulsa ? "Salvando..." : "+ Adicionar"}
          </button>
          <button
            onClick={() => setAvulsaAddOpen(false)}
            className="text-sm text-slate-500 border border-slate-300 px-4 py-1.5 hover:bg-slate-100 transition-colors shrink-0"
          >
            Cancelar
          </button>
        </div>
      )}

      {avulsas.length === 0 && !avulsaAddOpen ? (
        <div className="px-6 py-6 text-center text-slate-400 italic text-sm">
          Nenhuma imagem avulsa cadastrada.
        </div>
      ) : avulsas.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 text-left text-[11px] font-bold uppercase text-slate-500">Descricao</th>
                <th className="px-4 py-2 text-center text-[11px] font-bold uppercase text-slate-500 w-24">Tipo</th>
                <th className="px-4 py-2 text-center text-[11px] font-bold uppercase text-slate-500 w-28">Dimensoes</th>
                <th className="px-4 py-2 text-center text-[11px] font-bold uppercase text-slate-500 w-36">Status</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {avulsas.map((av) => {
                const isEditing = editingAvulsa?.id === av.id;
                if (isEditing) {
                  return (
                    <tr key={av.id} className="bg-violet-50">
                      <td colSpan={5} className="px-3 py-2">
                        <div className="flex gap-2 items-center">
                          <select
                            value={editingAvulsa.tipo}
                            onChange={(e) => setEditingAvulsa(editingAvulsa ? { ...editingAvulsa, tipo: e.target.value as "imagem" | "logo", dimensoes: "" } : null)}
                            className="border border-slate-300 text-sm px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 w-28 shrink-0"
                          >
                            <option value="imagem">&#x1f4d0; Imagem</option>
                            <option value="logo">&#x1f3f7;&#xfe0f; Logo</option>
                          </select>
                          <input
                            autoFocus
                            type="text"
                            value={editingAvulsa.descricao}
                            onChange={(e) => setEditingAvulsa(editingAvulsa ? { ...editingAvulsa, descricao: e.target.value } : null)}
                            onKeyDown={(e) => e.key === "Enter" && handleUpdateAvulsa()}
                            className="flex-1 border border-violet-400 text-sm px-3 py-1 focus:outline-none focus:ring-1 focus:ring-violet-400"
                            placeholder="Descricao"
                          />
                          {editingAvulsa.tipo === "imagem" && (
                            <input
                              type="text"
                              value={editingAvulsa.dimensoes}
                              onChange={(e) => setEditingAvulsa(editingAvulsa ? { ...editingAvulsa, dimensoes: e.target.value } : null)}
                              onKeyDown={(e) => e.key === "Enter" && handleUpdateAvulsa()}
                              className="w-28 shrink-0 border border-slate-300 text-sm px-2 py-1 focus:outline-none"
                              placeholder="Dimensoes"
                            />
                          )}
                          <button
                            onClick={handleUpdateAvulsa}
                            disabled={savingAvulsa || !editingAvulsa.descricao.trim()}
                            className="text-xs bg-violet-700 hover:bg-violet-600 text-white px-4 py-1.5 font-bold transition-colors disabled:opacity-50 shrink-0"
                          >
                            {savingAvulsa ? "Salvando..." : "Salvar"}
                          </button>
                          <button
                            onClick={() => setEditingAvulsa(null)}
                            className="text-xs text-slate-500 border border-slate-300 px-3 py-1.5 hover:bg-slate-100 transition-colors shrink-0"
                          >
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={av.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-semibold text-slate-800">{av.descricao}</td>
                    <td className="px-4 py-2 text-center text-xs text-slate-500 uppercase">{av.tipo}</td>
                    <td className="px-4 py-2 text-center text-xs font-mono text-slate-500">{av.dimensoes || "—"}</td>
                    <td className="px-4 py-2 text-center">
                      <select
                        value={av.avulso_status}
                        onChange={(e) => handleUpdateAvulsoStatus(av.id, e.target.value as AvulsoStatus)}
                        className={`text-xs font-bold px-2 py-1 border-0 rounded cursor-pointer focus:outline-none ${avulsoStatusColor[av.avulso_status] || "bg-slate-100 text-slate-600"}`}
                      >
                        <option value="pendente">Pendente</option>
                        <option value="solicitado">Solicitado</option>
                        <option value="recebido">Recebido</option>
                      </select>
                    </td>
                    <td className="px-2 text-center">
                      <button
                        onClick={() => setEditingAvulsa({ id: av.id, tipo: av.tipo, descricao: av.descricao, dimensoes: av.dimensoes || "" })}
                        className="text-slate-400 hover:text-violet-600 hover:bg-violet-50 p-1 rounded transition-colors"
                        title="Editar"
                      >
                        &#x270f;&#xfe0f;
                      </button>
                      <button
                        onClick={() => handleRemoveAvulsa(av.id)}
                        className="text-red-400 hover:text-red-700 hover:bg-red-50 p-1 transition-colors"
                        title="Remover"
                      >
                        &#x2715;
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
};

export default ControleAvulsasSection;
