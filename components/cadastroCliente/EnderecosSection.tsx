import React from 'react';
import type { Endereco } from './types';

interface EnderecosSectionProps {
    enderecos: Endereco[];
    handleAddEndereco: () => void;
    handleUpdateEndereco: (id: string, field: keyof Endereco, value: string) => void;
    handleRemoveEndereco: (id: string) => void;
    cepLoading: Record<string, boolean>;
    cepErros: Record<string, string>;
    handleCepBlur: (endId: string, rawValue: string) => void;
    handleCepChange: (endId: string, rawValue: string) => void;
}

const EnderecosSection: React.FC<EnderecosSectionProps> = ({
    enderecos,
    handleAddEndereco,
    handleUpdateEndereco,
    handleRemoveEndereco,
    cepLoading,
    cepErros,
    handleCepBlur,
    handleCepChange,
}) => {
    return (
        <div className="animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-slate-800">Locais Vinculados ao Cliente</h3>
                <button
                    onClick={handleAddEndereco}
                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 hover:shadow-sm px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                    Adicionar Endereço
                </button>
            </div>

            {enderecos.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                    <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <p className="text-sm font-medium text-slate-500">Nenhum endereço cadastrado ainda.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {enderecos.map((end, index) => (
                        <div key={end.id} className="relative bg-white border border-slate-200 rounded-xl p-5 shadow-sm">

                            <button
                                onClick={() => handleRemoveEndereco(end.id)}
                                className="absolute top-4 right-4 text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                title="Remover endereço"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pr-10">
                                <div className="md:col-span-4 mb-2">
                                    <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Tema / Título (Ex: Comercial, Fazenda)</label>
                                    <input
                                        value={end.tema}
                                        onChange={(e) => handleUpdateEndereco(end.id, 'tema', e.target.value)}
                                        type="text"
                                        className="w-full sm:w-1/2 border-b-2 border-slate-300 px-0 py-1 text-lg font-bold text-slate-800 focus:border-blue-500 bg-transparent outline-none placeholder:font-normal placeholder:text-sm"
                                        placeholder="De um título para o local..."
                                    />
                                </div>

                                <div className="relative">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">CEP</label>
                                    <input
                                        value={end.cep}
                                        onChange={(e) => handleCepChange(end.id, e.target.value)}
                                        onBlur={(e) => handleCepBlur(end.id, e.target.value)}
                                        maxLength={9}
                                        type="text"
                                        inputMode="numeric"
                                        className={`w-full border rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 outline-none ${cepErros[end.id] ? 'border-red-400 focus:ring-red-300 bg-red-50' : 'border-slate-300 focus:ring-blue-500'}`}
                                        placeholder="00000-000"
                                    />
                                    {cepLoading[end.id] && (
                                        <svg className="animate-spin absolute right-2 top-[34px] w-4 h-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                    )}
                                    {cepErros[end.id] && <p className="text-red-500 text-[11px] mt-1 font-medium">{cepErros[end.id]}</p>}
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Endereço (Logradouro)</label>
                                    <input value={end.logradouro} onChange={(e) => handleUpdateEndereco(end.id, 'logradouro', e.target.value)} type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 outline-none" placeholder="Rua, Avenida, Estrada..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Número</label>
                                    <input value={end.numero} onChange={(e) => handleUpdateEndereco(end.id, 'numero', e.target.value)} type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 outline-none" placeholder="S/N" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Complemento</label>
                                    <input value={end.complemento} onChange={(e) => handleUpdateEndereco(end.id, 'complemento', e.target.value)} type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 outline-none" placeholder="Apto, Bloco..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Bairro / Setor</label>
                                    <input value={end.bairro} onChange={(e) => handleUpdateEndereco(end.id, 'bairro', e.target.value)} type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Cidade</label>
                                    <input value={end.cidade} onChange={(e) => handleUpdateEndereco(end.id, 'cidade', e.target.value)} type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">UF (Estado)</label>
                                    <input value={end.estado} onChange={(e) => handleUpdateEndereco(end.id, 'estado', e.target.value)} type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 outline-none" placeholder="SP, RJ, MG..." />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EnderecosSection;
