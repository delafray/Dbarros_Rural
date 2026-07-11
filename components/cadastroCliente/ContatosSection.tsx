import React from 'react';
import { maskTelefone } from '../../utils/masks';
import type { Contato } from './types';

interface ContatosSectionProps {
    contatos: Contato[];
    handleAddContato: () => void;
    handleTogglePrincipal: (id: string) => void;
    handleUpdateContato: (id: string, field: keyof Contato, value: any) => void;
    handleRemoveContato: (id: string) => void;
}

const ContatosSection: React.FC<ContatosSectionProps> = ({
    contatos,
    handleAddContato,
    handleTogglePrincipal,
    handleUpdateContato,
    handleRemoveContato,
}) => {
    return (
        <div className="animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-slate-800">Contatos do Cliente</h3>
                <button
                    onClick={handleAddContato}
                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                    Adicionar Contato
                </button>
            </div>

            {contatos.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                    <p className="text-xs font-medium text-slate-400">Nenhum contato adicionado ainda.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-1.5">
                    {contatos.map((contato) => (
                        <div key={contato.id} className={`relative border rounded-lg px-3 py-2 ${contato.principal ? 'bg-blue-50/40 border-blue-200' : 'bg-white border-slate-200'}`}>
                            {/* Header: toggle + delete */}
                            <div className="flex items-center justify-between mb-2">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div
                                        onClick={() => handleTogglePrincipal(contato.id)}
                                        className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${contato.principal ? 'bg-blue-600' : 'bg-slate-200'}`}
                                    >
                                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${contato.principal ? 'translate-x-4' : ''}`} />
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${contato.principal ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-500'}`}>
                                        Contato Principal
                                    </span>
                                    {contato.principal && (
                                        <span className="bg-blue-100 text-blue-700 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Ativo</span>
                                    )}
                                </label>
                                <button
                                    onClick={() => handleRemoveContato(contato.id)}
                                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>

                            {/* Campos em linha única */}
                            <div className="grid grid-cols-4 gap-2">
                                <div>
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Nome</label>
                                    <input
                                        value={contato.nome}
                                        onChange={(e) => handleUpdateContato(contato.id, 'nome', e.target.value)}
                                        type="text"
                                        className="w-full border border-slate-300 rounded px-2 py-1 text-[12px] focus:ring-1 focus:ring-blue-400 outline-none bg-white"
                                        placeholder="João Silva"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Cargo</label>
                                    <input
                                        value={contato.cargo}
                                        onChange={(e) => handleUpdateContato(contato.id, 'cargo', e.target.value)}
                                        type="text"
                                        className="w-full border border-slate-300 rounded px-2 py-1 text-[12px] focus:ring-1 focus:ring-blue-400 outline-none bg-white"
                                        placeholder="Gerente, Comprador..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">E-mail</label>
                                    <input
                                        value={contato.email}
                                        onChange={(e) => handleUpdateContato(contato.id, 'email', e.target.value)}
                                        type="email"
                                        className="w-full border border-slate-300 rounded px-2 py-1 text-[12px] focus:ring-1 focus:ring-blue-400 outline-none bg-white"
                                        placeholder="exemplo@email.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Telefone</label>
                                    <input
                                        value={contato.telefone}
                                        onChange={(e) => handleUpdateContato(contato.id, 'telefone', maskTelefone(e.target.value))}
                                        maxLength={15}
                                        inputMode="tel"
                                        type="text"
                                        className="w-full border border-slate-300 rounded px-2 py-1 text-[12px] focus:ring-1 focus:ring-blue-400 outline-none bg-white"
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ContatosSection;
