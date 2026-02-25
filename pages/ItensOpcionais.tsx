import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { itensOpcionaisService, ItemOpcional } from '../services/itensOpcionaisService';

const ItensOpcionais: React.FC = () => {
    const [itens, setItens] = useState<ItemOpcional[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estado para novo item / edição
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ nome: '', preco_base: 0 });
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        loadItens();
    }, []);

    const loadItens = async () => {
        try {
            setIsLoading(true);
            const data = await itensOpcionaisService.getItens();
            setItens(data);
            setError(null);
        } catch (err) {
            setError('Erro ao carregar itens opcionais');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const startEdit = (item: ItemOpcional) => {
        setEditingId(item.id);
        setEditForm({ nome: item.nome, preco_base: Number(item.preco_base) });
        setIsAdding(false);
    };

    const handleSave = async () => {
        try {
            if (!editForm.nome) return;

            await itensOpcionaisService.upsertItem({
                id: editingId || undefined,
                nome: editForm.nome,
                preco_base: editForm.preco_base
            });

            setEditingId(null);
            setIsAdding(false);
            loadItens();
        } catch (err) {
            alert('Erro ao salvar item');
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja excluir este item?')) return;
        try {
            await itensOpcionaisService.deleteItem(id);
            loadItens();
        } catch (err) {
            alert('Erro ao excluir item');
            console.error(err);
        }
    };

    const formatMoney = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    return (
        <Layout title="Cadastros · Itens Opcionais">
            <div className="max-w-4xl mx-auto p-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
                        Itens Opcionais
                    </h1>
                    {!isAdding && !editingId && (
                        <button
                            onClick={() => {
                                setIsAdding(true);
                                setEditForm({ nome: '', preco_base: 0 });
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-bold rounded shadow-sm flex items-center gap-2 transition-colors uppercase"
                        >
                            + Adicionar Item
                        </button>
                    )}
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 rounded">
                        <span>⚠️</span> {error}
                    </div>
                )}

                <div className="bg-white border border-slate-200 shadow-sm overflow-hidden rounded">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                                <th className="px-4 py-3 border-r border-slate-200">Descrição do Item (Vertical na Planilha)</th>
                                <th className="px-4 py-3 border-r border-slate-200 w-40 text-right">Preço Base</th>
                                <th className="px-4 py-3 w-32 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Formulário de Adição */}
                            {isAdding && (
                                <tr className="bg-blue-50/50 text-[13px] border-b border-blue-100">
                                    <td className="px-4 py-2 border-r border-slate-200">
                                        <input
                                            autoFocus
                                            type="text"
                                            className="w-full bg-white border border-blue-300 rounded px-2 py-1 text-[13px] outline-none focus:ring-1 focus:ring-blue-500"
                                            placeholder="Nome do opcional..."
                                            value={editForm.nome}
                                            onChange={e => setEditForm({ ...editForm, nome: e.target.value })}
                                        />
                                    </td>
                                    <td className="px-4 py-2 border-r border-slate-200">
                                        <input
                                            type="number"
                                            className="w-full bg-white border border-blue-300 rounded px-2 py-1 text-[13px] outline-none focus:ring-1 focus:ring-blue-500 text-right font-mono"
                                            value={editForm.preco_base}
                                            onChange={e => setEditForm({ ...editForm, preco_base: Number(e.target.value) })}
                                        />
                                    </td>
                                    <td className="px-4 py-2 flex justify-center gap-2">
                                        <button onClick={handleSave} className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors" title="Salvar">
                                            ✓
                                        </button>
                                        <button onClick={() => setIsAdding(false)} className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors" title="Cancelar">
                                            ✕
                                        </button>
                                    </td>
                                </tr>
                            )}

                            {isLoading && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400 text-sm">Carregando itens...</td>
                                </tr>
                            )}

                            {!isLoading && itens.length === 0 && !isAdding && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400 text-sm">Nenhum item cadastrado.</td>
                                </tr>
                            )}

                            {itens.map(item => (
                                <tr key={item.id} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors text-[13px] ${editingId === item.id ? 'bg-blue-50/30' : ''}`}>
                                    <td className="px-4 py-2.5 border-r border-slate-200 font-medium text-slate-700">
                                        {editingId === item.id ? (
                                            <input
                                                autoFocus
                                                type="text"
                                                className="w-full bg-white border border-blue-300 rounded px-2 py-1 text-[13px] outline-none"
                                                value={editForm.nome}
                                                onChange={e => setEditForm({ ...editForm, nome: e.target.value })}
                                            />
                                        ) : (
                                            item.nome
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5 border-r border-slate-200 text-right font-mono text-slate-600">
                                        {editingId === item.id ? (
                                            <input
                                                type="number"
                                                className="w-full bg-white border border-blue-300 rounded px-2 py-1 text-[13px] outline-none text-right font-mono"
                                                value={editForm.preco_base}
                                                onChange={e => setEditForm({ ...editForm, preco_base: Number(e.target.value) })}
                                            />
                                        ) : (
                                            formatMoney(Number(item.preco_base))
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex justify-center gap-1.5">
                                            {editingId === item.id ? (
                                                <>
                                                    <button onClick={handleSave} className="p-1 text-green-600 hover:bg-green-100 rounded" title="Confirmar">
                                                        ✓
                                                    </button>
                                                    <button onClick={() => setEditingId(null)} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Cancelar">
                                                        ✕
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => startEdit(item)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
                                                        ✎
                                                    </button>
                                                    <button onClick={() => handleDelete(item.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir">
                                                        🗑
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-500 leading-relaxed italic">
                    <strong>Regra de Negócio:</strong> Os preços definidos aqui são os valores base padrão.
                    Ao editar um evento específico, esses itens serão carregados por padrão com estes valores,
                    permitindo que você ajuste o valor fixo individualmente por evento se necessário.
                </div>
            </div>
        </Layout>
    );
};

export default ItensOpcionais;
