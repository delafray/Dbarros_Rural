import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { itensOpcionaisService, ItemOpcional } from '../services/itensOpcionaisService';

type TipoPadrao = 'imagem' | 'logo' | null;

interface EditModal {
    id: string | null; // null = novo item
    nome: string;
    preco_base: number;
    tipo_padrao: TipoPadrao;
}

const TIPO_BADGE: Record<string, { label: string; cls: string }> = {
    imagem: { label: '📐 Imagem', cls: 'bg-violet-100 text-violet-700 border-violet-300' },
    logo:   { label: '🏷️ Logo',  cls: 'bg-blue-100 text-blue-700 border-blue-300' },
};

const ItensOpcionais: React.FC = () => {
    const [itens, setItens] = useState<ItemOpcional[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const [editModal, setEditModal] = useState<EditModal | null>(null);
    const [bloqueioModal, setBloqueioModal] = useState<{ nome: string; planilhas: { titulo: string; evento: string }[] } | null>(null);

    useEffect(() => { loadItens(); }, []);

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

    const openNew = () => setEditModal({ id: null, nome: '', preco_base: 0, tipo_padrao: null });
    const openEdit = (item: ItemOpcional) => setEditModal({
        id: item.id,
        nome: item.nome,
        preco_base: Number(item.preco_base),
        tipo_padrao: (item.tipo_padrao as TipoPadrao) ?? null,
    });

    const handleSave = async () => {
        if (!editModal || !editModal.nome.trim()) return;
        setSaving(true);
        try {
            const itemAnterior = editModal.id ? itens.find(i => i.id === editModal.id) : null;
            const nomeAnterior = itemAnterior?.nome;

            await itensOpcionaisService.upsertItem({
                id: editModal.id || undefined,
                nome: editModal.nome.trim(),
                preco_base: editModal.preco_base,
                tipo_padrao: editModal.tipo_padrao,
            });

            if (nomeAnterior && nomeAnterior !== editModal.nome.trim()) {
                await itensOpcionaisService.renameItemReferences(nomeAnterior, editModal.nome.trim());
            }

            setEditModal(null);
            loadItens();
        } catch (err) {
            alert('Erro ao salvar item');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, nome: string) => {
        let planilhas: { titulo: string; evento: string }[] = [];
        try {
            planilhas = await itensOpcionaisService.getPlanilhasUsingItem(id);
        } catch (err) {
            console.error('Erro ao verificar uso do item:', err);
            alert('Não foi possível verificar se o item está em uso. Tente novamente.');
            return;
        }

        if (planilhas.length > 0) {
            setBloqueioModal({ nome, planilhas });
            return;
        }

        if (!confirm('Deseja excluir este item?')) return;
        try {
            await itensOpcionaisService.deleteItem(id);
            loadItens();
        } catch (err) {
            alert('Erro ao excluir item');
            console.error(err);
        }
    };

    const formatMoney = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    return (
        <Layout title="Cadastros · Itens Opcionais">
            <div className="max-w-4xl mx-auto p-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
                        Itens Opcionais
                    </h1>
                    <button
                        onClick={openNew}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-bold rounded shadow-sm flex items-center gap-2 transition-colors uppercase"
                    >
                        + Adicionar Item
                    </button>
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
                                <th className="px-4 py-3 border-r border-slate-200 w-36 text-right">Preço Base</th>
                                <th className="px-4 py-3 border-r border-slate-200 w-36 text-center">Tipo Padrão</th>
                                <th className="px-4 py-3 w-24 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-sm">Carregando itens...</td>
                                </tr>
                            )}

                            {!isLoading && itens.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-sm">Nenhum item cadastrado.</td>
                                </tr>
                            )}

                            {itens.map(item => {
                                const badge = item.tipo_padrao ? TIPO_BADGE[item.tipo_padrao] : null;
                                return (
                                    <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors text-[13px]">
                                        <td className="px-4 py-2.5 border-r border-slate-200 font-medium text-slate-700">
                                            {item.nome}
                                        </td>
                                        <td className="px-4 py-2.5 border-r border-slate-200 text-right font-mono text-slate-600">
                                            {formatMoney(Number(item.preco_base))}
                                        </td>
                                        <td className="px-4 py-2.5 border-r border-slate-200 text-center">
                                            {badge ? (
                                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 border rounded-full ${badge.cls}`}>
                                                    {badge.label}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 text-[11px]">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex justify-center gap-1.5">
                                                <button
                                                    onClick={() => openEdit(item)}
                                                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    title="Editar"
                                                >
                                                    ✎
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id, item.nome)}
                                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Excluir"
                                                >
                                                    🗑
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-500 leading-relaxed italic">
                    <strong>Regra de Negócio:</strong> Os preços definidos aqui são os valores base padrão.
                    Ao editar um evento específico, esses itens serão carregados por padrão com estes valores,
                    permitindo que você ajuste o valor fixo individualmente por evento se necessário.
                    O <strong>Tipo Padrão</strong> pré-seleciona automaticamente o tipo de imagem ao configurar o item em uma edição de evento.
                </div>
            </div>

            {/* ── Modal de Edição / Adição ── */}
            {editModal && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
                    onClick={(e) => e.target === e.currentTarget && setEditModal(null)}
                >
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        {/* Header */}
                        <div className="bg-blue-700 px-5 py-4 flex items-center justify-between">
                            <h2 className="text-white font-black text-[13px] uppercase tracking-wide">
                                {editModal.id ? 'Editar Item Opcional' : 'Novo Item Opcional'}
                            </h2>
                            <button
                                onClick={() => setEditModal(null)}
                                className="text-white/70 hover:text-white text-lg leading-none"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Form */}
                        <div className="px-5 py-5 space-y-4">
                            {/* Nome */}
                            <div>
                                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                                    Descrição do Item
                                </label>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Ex: Blimp, Logo LED, Rádio Feira..."
                                    className="w-full border border-slate-300 rounded px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    value={editModal.nome}
                                    onChange={e => setEditModal(m => m ? { ...m, nome: e.target.value } : m)}
                                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Este texto aparece na vertical na planilha de vendas.</p>
                            </div>

                            {/* Preço Base */}
                            <div>
                                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                                    Preço Base (R$)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="w-full border border-slate-300 rounded px-3 py-2 text-[13px] font-mono text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    value={editModal.preco_base}
                                    onChange={e => setEditModal(m => m ? { ...m, preco_base: Number(e.target.value) } : m)}
                                />
                            </div>

                            {/* Tipo Padrão */}
                            <div>
                                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-2">
                                    Tipo Padrão de Imagem
                                </label>
                                <div className="flex gap-2">
                                    {[
                                        { value: null,      label: '— Sem tipo',              cls: editModal.tipo_padrao === null   ? 'bg-slate-200 border-slate-400 text-slate-700'   : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300' },
                                        { value: 'imagem',  label: '📐 Imagem (com dimensões)', cls: editModal.tipo_padrao === 'imagem' ? 'bg-violet-100 border-violet-500 text-violet-700' : 'bg-white border-slate-200 text-slate-500 hover:border-violet-300' },
                                        { value: 'logo',    label: '🏷️ Logo',                  cls: editModal.tipo_padrao === 'logo'   ? 'bg-blue-100 border-blue-500 text-blue-700'     : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300' },
                                    ].map(opt => (
                                        <button
                                            key={String(opt.value)}
                                            type="button"
                                            onClick={() => setEditModal(m => m ? { ...m, tipo_padrao: opt.value as TipoPadrao } : m)}
                                            className={`flex-1 border rounded px-2 py-2 text-[11px] font-bold transition-colors text-center ${opt.cls}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1.5">
                                    Pré-seleciona o tipo ao configurar imagens desta edição de evento. "Imagem" mostra o campo de dimensões; "Logo" o oculta.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-5 pb-5 flex justify-end gap-2">
                            <button
                                onClick={() => setEditModal(null)}
                                className="px-4 py-2 text-[12px] font-bold text-slate-600 border border-slate-300 rounded hover:bg-slate-50 transition-colors uppercase"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !editModal.nome.trim()}
                                className="px-5 py-2 text-[12px] font-bold text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors uppercase disabled:opacity-50"
                            >
                                {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal de bloqueio de exclusão ── */}
            {bloqueioModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                        <div className="bg-red-600 px-5 py-4 flex items-center gap-3">
                            <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            </svg>
                            <h2 className="text-white font-black text-[13px] uppercase tracking-wide">Impossível Excluir</h2>
                        </div>
                        <div className="px-5 py-4">
                            <p className="text-[13px] text-slate-700 mb-3">
                                O item <strong>"{bloqueioModal.nome}"</strong> está vinculado às seguintes planilhas:
                            </p>
                            <ul className="space-y-1.5 mb-4">
                                {bloqueioModal.planilhas.map((p, i) => (
                                    <li key={i} className="flex items-center gap-2 bg-red-50 border border-red-100 rounded px-3 py-2">
                                        <span className="text-red-400">📋</span>
                                        <div>
                                            <div className="text-[11px] font-bold text-slate-700">{p.titulo}</div>
                                            <div className="text-[10px] text-slate-500">{p.evento}</div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <p className="text-[11px] text-slate-500 italic mb-4">
                                Para excluir, acesse cada planilha acima → <strong>⚙️ Setup</strong> → aba de Itens Opcionais → desmarque este item.
                            </p>
                            <button
                                onClick={() => setBloqueioModal(null)}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-[12px] uppercase py-2 rounded transition-colors"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default ItensOpcionais;
