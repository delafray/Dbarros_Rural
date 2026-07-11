import React, { useState } from 'react';
import { useAppDialog } from '../../context/DialogContext';
import { clientesService } from '../../services/clientesService';
import { maskTelefone } from '../../utils/masks';
import type { ClienteComContato } from '../ClienteSelectorWidget';

interface NovoClientePanelProps {
    onSaved: (cliente: ClienteComContato) => void;
    onCancel: () => void;
}

/**
 * Formulário de cadastro rápido de cliente PJ com contato principal.
 * Ao salvar chama onSaved com o cliente já formatado; ao cancelar chama onCancel.
 */
export const NovoClientePanel: React.FC<NovoClientePanelProps> = ({ onSaved, onCancel }) => {
    const appDialog = useAppDialog();
    const [form, setForm] = useState({ nome: '', contato: '', cargo: '', telefone: '', email: '' });
    const [saving, setSaving] = useState(false);

    const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(prev => ({ ...prev, [field]: e.target.value }));

    const handleSave = async () => {
        if (!form.nome.trim() || !form.contato.trim()) {
            await appDialog.alert({
                title: 'Campo obrigatório',
                message: 'Nome da empresa / Cliente e nome do Contato Principal são obrigatórios.',
                type: 'warning',
            });
            return;
        }

        try {
            setSaving(true);
            const raw = await clientesService.createClienteRapido({
                nome: form.nome,
                contato: form.contato,
                cargo: form.cargo,
                telefone: form.telefone,
                email: form.email,
            });

            // Formatar contato principal (mesmo padrão do formatRow no hook)
            const p = raw.contatos?.find(ct => ct.principal) || raw.contatos?.[0];
            const formatted: ClienteComContato = {
                ...raw,
                contato_nome: p?.nome || 'N/A',
                contato_principal: p?.telefone ? maskTelefone(p.telefone) : 'N/A',
                contato_email: p?.email || 'N/A',
                contato_cargo: p?.cargo || 'N/A',
            };

            onSaved(formatted);
        } catch (err: any) {
            console.error(err);
            await appDialog.alert({
                title: 'Erro',
                message: 'Erro ao cadastrar novo cliente: ' + err.message,
                type: 'danger',
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col p-6 overflow-auto bg-slate-50">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-3xl mx-auto w-full">
                <div className="mb-6 pb-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">Cadastro Rápido de Cliente</h3>
                    <button
                        onClick={onCancel}
                        className="text-slate-400 hover:text-slate-600 font-medium text-sm"
                    >
                        Voltar para Busca
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                            Empresa / Razão Social <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text" autoFocus
                            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ex: Indústria Brasileira S/A"
                            value={form.nome}
                            onChange={set('nome')}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                            Contato Principal <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ex: João da Silva"
                            value={form.contato}
                            onChange={set('contato')}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Cargo</label>
                        <input
                            type="text"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ex: Gerente de Compras"
                            value={form.cargo}
                            onChange={set('cargo')}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Telefone</label>
                        <input
                            type="text"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="(00) 00000-0000"
                            value={form.telefone}
                            onChange={set('telefone')}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Email</label>
                        <input
                            type="email"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="contato@empresa.com"
                            value={form.email}
                            onChange={set('email')}
                        />
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-3 pt-5 border-t border-slate-100">
                    <button
                        onClick={onCancel}
                        className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-md shadow-blue-500/20"
                    >
                        {saving ? 'Salvando...' : 'Salvar e Selecionar'}
                    </button>
                </div>
            </div>
        </div>
    );
};
