import React from 'react';
import { ImagemConfig, OrigemTipo } from '../../services/imagensService';

interface Props {
  imagensModal: { tipo: OrigemTipo; ref: string; label: string };
  imagens: ImagemConfig[];
  novaImagem: { tipo: "imagem" | "logo"; descricao: string; dimensoes: string };
  setNovaImagem: React.Dispatch<React.SetStateAction<{ tipo: "imagem" | "logo"; descricao: string; dimensoes: string }>>;
  savingImagem: boolean;
  editingImagem: { id: string; tipo: "imagem" | "logo"; descricao: string; dimensoes: string } | null;
  setEditingImagem: React.Dispatch<React.SetStateAction<{ id: string; tipo: "imagem" | "logo"; descricao: string; dimensoes: string } | null>>;
  onClose: () => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: () => void;
}

const ConfigImagensModal: React.FC<Props> = ({
  imagensModal, imagens, novaImagem, setNovaImagem,
  savingImagem, editingImagem, setEditingImagem,
  onClose, onAdd, onRemove, onUpdate,
}) => {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">
              {imagensModal.tipo === "stand_categoria" ? "Categoria" : imagensModal.tipo === "item_opcional" ? "Item Opcional" : "Imagem Avulsa"}
            </span>
            <p className="font-black text-sm uppercase">Imagens — {imagensModal.label}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none ml-4">×</button>
        </div>

        {/* Lista existente */}
        <div className="flex-1 overflow-y-auto">
          {imagens.length === 0 ? (
            <div className="px-6 py-6 text-center text-slate-400 italic text-sm">Nenhuma imagem configurada ainda.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {imagens.map((cfg) => {
                const isEditing = editingImagem?.id === cfg.id;
                return (
                  <li key={cfg.id} className="px-5 py-2 hover:bg-slate-50">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <select
                            value={editingImagem.tipo}
                            onChange={(e) => setEditingImagem((p) => p ? { ...p, tipo: e.target.value as "imagem" | "logo", dimensoes: "" } : null)}
                            className="border border-slate-300 text-sm px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 w-28 shrink-0"
                          >
                            <option value="imagem">📐 Imagem</option>
                            <option value="logo">🏷️ Logo</option>
                          </select>
                          <input
                            autoFocus
                            type="text"
                            value={editingImagem.descricao}
                            onChange={(e) => setEditingImagem((p) => p ? { ...p, descricao: e.target.value } : null)}
                            onKeyDown={(e) => e.key === "Enter" && onUpdate()}
                            className="flex-1 border border-violet-400 text-sm px-3 py-1 focus:outline-none focus:ring-1 focus:ring-violet-400"
                            placeholder="Descrição"
                          />
                          {editingImagem.tipo === "imagem" && (
                            <input
                              type="text"
                              value={editingImagem.dimensoes}
                              onChange={(e) => setEditingImagem((p) => p ? { ...p, dimensoes: e.target.value } : null)}
                              onKeyDown={(e) => e.key === "Enter" && onUpdate()}
                              className="w-28 shrink-0 border border-slate-300 text-sm px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-400"
                              placeholder="Dimensões"
                            />
                          )}
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditingImagem(null)} className="text-xs text-slate-500 border border-slate-300 px-3 py-1 hover:bg-slate-100 transition-colors">Cancelar</button>
                          <button onClick={onUpdate} disabled={savingImagem || !editingImagem.descricao.trim()} className="text-xs bg-violet-700 hover:bg-violet-600 text-white px-4 py-1 font-bold transition-colors disabled:opacity-50">
                            {savingImagem ? "Salvando..." : "Salvar"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{cfg.tipo === "logo" ? "🏷️" : "📐"}</span>
                          <div>
                            <span className="font-semibold text-slate-800 text-sm">{cfg.descricao}</span>
                            {cfg.dimensoes && <span className="ml-2 text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5">{cfg.dimensoes}</span>}
                            <span className="ml-2 text-[10px] font-bold uppercase text-violet-500">{cfg.tipo}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingImagem({ id: cfg.id, tipo: cfg.tipo, descricao: cfg.descricao, dimensoes: cfg.dimensoes || "" })}
                            className="text-slate-400 hover:text-violet-600 hover:bg-violet-50 p-1 rounded transition-colors"
                            title="Editar"
                          >✏️</button>
                          <button onClick={() => onRemove(cfg.id)} className="text-red-400 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors" title="Remover">✕</button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Formulário de adição */}
        <div className="flex-shrink-0 border-t border-slate-200 px-5 py-4 bg-slate-50 space-y-3">
          <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Adicionar imagem</p>
          <div className="flex gap-2">
            <select
              value={novaImagem.tipo}
              onChange={(e) => setNovaImagem((p) => ({ ...p, tipo: e.target.value as "imagem" | "logo", dimensoes: "" }))}
              className="border border-slate-300 text-sm px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 w-28 shrink-0"
            >
              <option value="imagem">📐 Imagem</option>
              <option value="logo">🏷️ Logo</option>
            </select>
            <input
              type="text"
              placeholder="Descrição (ex: Testeira, Fundo)"
              className="flex-1 border border-slate-300 text-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400"
              value={novaImagem.descricao}
              onChange={(e) => setNovaImagem((p) => ({ ...p, descricao: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && onAdd()}
            />
            {novaImagem.tipo === "imagem" && (
              <input
                type="text"
                placeholder="Dimensões (ex: 5x1m)"
                className="w-28 shrink-0 border border-slate-300 text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400"
                value={novaImagem.dimensoes}
                onChange={(e) => setNovaImagem((p) => ({ ...p, dimensoes: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && onAdd()}
              />
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="text-sm text-slate-600 border border-slate-300 px-4 py-1.5 hover:bg-slate-100 transition-colors">Fechar</button>
            <button onClick={onAdd} disabled={savingImagem || !novaImagem.descricao.trim()} className="text-sm bg-violet-700 hover:bg-violet-600 text-white px-5 py-1.5 font-bold transition-colors disabled:opacity-50">
              {savingImagem ? "Salvando..." : "+ Adicionar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigImagensModal;
