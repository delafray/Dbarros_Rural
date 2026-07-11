import React, { useEffect, useState } from 'react';
import { CardapioGroup, CardapioItem } from '../../utils/cardapioParser';

/**
 * Editor estruturado do cardápio: cada campo separado (sem risco de quebrar
 * o TSV apagando um Tab). Ao aplicar, devolve a estrutura consolidada —
 * categorias com o mesmo nome são fundidas na ordem de primeira aparição.
 */

interface GrupoEdit {
  categoria: string;
  itens: CardapioItem[];
}

interface EditorItensModalProps {
  aberto: boolean;
  titulo: string;
  empresa: string;
  grupos: CardapioGroup[];
  onAplicar: (dados: { titulo: string; empresa: string; grupos: CardapioGroup[] }) => void;
  onFechar: () => void;
}

const itemVazio = (): CardapioItem => ({ item: '', valor: '', descricao: '' });

export const EditorItensModal: React.FC<EditorItensModalProps> = ({
  aberto, titulo, empresa, grupos, onAplicar, onFechar,
}) => {
  const [tituloEdit, setTituloEdit] = useState(titulo);
  const [empresaEdit, setEmpresaEdit] = useState(empresa);
  const [gruposEdit, setGruposEdit] = useState<GrupoEdit[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  // Recarrega a cópia editável sempre que o modal abre
  useEffect(() => {
    if (!aberto) return;
    setTituloEdit(titulo);
    setEmpresaEdit(empresa);
    setGruposEdit(
      grupos.length > 0
        ? grupos.map((g) => ({ categoria: g.categoria, itens: g.itens.map((i) => ({ ...i })) }))
        : [{ categoria: '', itens: [itemVazio()] }]
    );
    setErro(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  // Trava o scroll da página de fundo enquanto o modal está aberto
  // (senão a rodinha do mouse rola a tela principal por trás)
  useEffect(() => {
    if (!aberto) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [aberto]);

  if (!aberto) return null;

  const setCategoria = (gi: number, nome: string) =>
    setGruposEdit((prev) => prev.map((g, i) => (i === gi ? { ...g, categoria: nome } : g)));

  const setItemCampo = (gi: number, ii: number, campo: keyof CardapioItem, valor: string) =>
    setGruposEdit((prev) =>
      prev.map((g, i) =>
        i === gi
          ? { ...g, itens: g.itens.map((it, j) => (j === ii ? { ...it, [campo]: valor } : it)) }
          : g
      )
    );

  const addItem = (gi: number) =>
    setGruposEdit((prev) =>
      prev.map((g, i) => (i === gi ? { ...g, itens: [...g.itens, itemVazio()] } : g))
    );

  const removeItem = (gi: number, ii: number) =>
    setGruposEdit((prev) =>
      prev.map((g, i) => (i === gi ? { ...g, itens: g.itens.filter((_, j) => j !== ii) } : g))
    );

  const addGrupo = () =>
    setGruposEdit((prev) => [...prev, { categoria: '', itens: [itemVazio()] }]);

  const removeGrupo = (gi: number) =>
    setGruposEdit((prev) => prev.filter((_, i) => i !== gi));

  const handleAplicar = () => {
    setErro(null);

    // Consolida: descarta linhas totalmente vazias, valida o resto e funde
    // categorias com o mesmo nome (ordem de primeira aparição)
    const ordem: string[] = [];
    const porCategoria = new Map<string, CardapioItem[]>();

    for (const g of gruposEdit) {
      const itensPreenchidos = g.itens.filter(
        (i) => i.item.trim() || i.valor.trim() || i.descricao.trim()
      );
      if (itensPreenchidos.length === 0) continue; // grupo vazio → ignora

      const cat = g.categoria.trim().toUpperCase();
      if (!cat) {
        setErro('Há itens em uma categoria sem nome — dê um nome à categoria.');
        return;
      }
      const semNome = itensPreenchidos.find((i) => !i.item.trim());
      if (semNome) {
        setErro(`Há um item sem nome na categoria "${cat}" — preencha ou remova a linha.`);
        return;
      }

      if (!porCategoria.has(cat)) {
        porCategoria.set(cat, []);
        ordem.push(cat);
      }
      porCategoria.get(cat)!.push(
        ...itensPreenchidos.map((i) => ({
          item: i.item.trim(),
          valor: i.valor.trim(),
          descricao: i.descricao.trim(),
        }))
      );
    }

    if (ordem.length === 0) {
      setErro('O cardápio precisa de pelo menos um item.');
      return;
    }
    if (!empresaEdit.trim()) {
      setErro('O nome da empresa é obrigatório.');
      return;
    }

    onAplicar({
      titulo: tituloEdit.trim().toUpperCase(),
      empresa: empresaEdit.trim().toUpperCase(),
      grupos: ordem.map((cat) => ({ categoria: cat, itens: porCategoria.get(cat)! })),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onFechar}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col"
        style={{ maxHeight: '88vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4 p-5 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Editar itens do cardápio</h2>
            <p className="text-xs text-slate-400">
              Edite campo a campo, sem risco de quebrar o formato. Ao aplicar, o texto é regenerado consolidado.
            </p>
          </div>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 font-bold text-xl leading-none">×</button>
        </div>

        {/* Corpo rolável */}
        <div
          className="flex-1 p-5 flex flex-col gap-4"
          style={{ minHeight: 0, overflowY: 'auto' }}
        >
          {/* Título + Empresa */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Segmento (título pequeno)
              </label>
              <input
                type="text"
                value={tituloEdit}
                onChange={(e) => setTituloEdit(e.target.value)}
                placeholder="Ex: LANCHES, ESPETOS..."
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Empresa
              </label>
              <input
                type="text"
                value={empresaEdit}
                onChange={(e) => setEmpresaEdit(e.target.value)}
                placeholder="Nome do estabelecimento"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-700 font-semibold"
              />
            </div>
          </div>

          {/* Grupos */}
          {gruposEdit.map((grupo, gi) => (
            <div key={gi} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 bg-slate-50 border-b border-slate-200 px-3 py-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
                  Categoria
                </span>
                <input
                  type="text"
                  value={grupo.categoria}
                  onChange={(e) => setCategoria(gi, e.target.value)}
                  placeholder="Ex: SORVETES"
                  className="flex-1 text-sm font-bold uppercase border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-700 bg-white"
                />
                <button
                  onClick={() => removeGrupo(gi)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-500 transition-colors flex-shrink-0"
                  title="Remover categoria e seus itens"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 flex flex-col gap-2">
                {/* Cabeçalho das colunas */}
                <div className="flex gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  <span className="flex-1">Item</span>
                  <span className="w-40 flex-shrink-0">Valor</span>
                  <span className="flex-1">Descrição</span>
                  <span className="w-7 flex-shrink-0" />
                </div>

                {grupo.itens.map((item, ii) => (
                  <div key={ii} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={item.item}
                      onChange={(e) => setItemCampo(gi, ii, 'item', e.target.value)}
                      placeholder="Sorvete Delícia"
                      className="flex-1 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-700"
                    />
                    <input
                      type="text"
                      value={item.valor}
                      onChange={(e) => setItemCampo(gi, ii, 'valor', e.target.value)}
                      placeholder="R$ 23,00"
                      className="w-40 flex-shrink-0 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-700"
                    />
                    <input
                      type="text"
                      value={item.descricao}
                      onChange={(e) => setItemCampo(gi, ii, 'descricao', e.target.value)}
                      placeholder="Ingredientes, sabores..."
                      className="flex-1 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-700"
                    />
                    <button
                      onClick={() => removeItem(gi, ii)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400 hover:text-red-500 transition-colors flex-shrink-0"
                      title="Remover item"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => addItem(gi)}
                  className="self-start text-xs font-bold text-amber-600 hover:text-amber-700 px-1 py-1"
                >
                  + Adicionar item
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={addGrupo}
            className="self-start text-sm font-bold text-blue-600 hover:text-blue-700 px-1"
          >
            + Nova categoria
          </button>
        </div>

        {/* Rodapé */}
        <div className="border-t border-slate-100 p-4 flex items-center justify-between gap-3">
          <p className="text-xs text-red-500 font-medium flex-1">{erro}</p>
          <button
            onClick={onFechar}
            className="text-sm font-semibold text-slate-500 hover:text-slate-700 px-4 py-2"
          >
            Cancelar
          </button>
          <button
            onClick={handleAplicar}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2 rounded-lg shadow transition-all"
          >
            Aplicar no cardápio
          </button>
        </div>
      </div>
    </div>
  );
};

const TrashIcon = (props: any) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

export default EditorItensModal;
