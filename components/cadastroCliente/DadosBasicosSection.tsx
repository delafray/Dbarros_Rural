import React from 'react';
import { onlyDigits } from '../../utils/masks';
import type { TipoPessoa, DadosCliente, Endereco, CnpjPreview } from './types';

interface DadosBasicosSectionProps {
    tipoPessoa: TipoPessoa;
    setTipoPessoa: (t: TipoPessoa) => void;
    dados: DadosCliente;
    erros: { cnpj?: string; cpf?: string; cpfResponsavel?: string };
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleBlurCPF: () => void;
    handleBlurCNPJ: () => void;
    handleBlurCPFResponsavel: () => void;
    cnpjSearching: boolean;
    cnpjPreview: CnpjPreview | null;
    setCnpjPreview: (p: CnpjPreview | null) => void;
    buscarCNPJ: () => void;
    handleUsarDadosCNPJ: () => void;
    enderecos: Endereco[];
    handleAddEndereco: () => void;
    handleUpdateEndereco: (id: string, field: keyof Endereco, value: string) => void;
    cepLoading: Record<string, boolean>;
    cepErros: Record<string, string>;
    handleCepBlur: (endId: string, rawValue: string) => void;
    handleCepChange: (endId: string, rawValue: string) => void;
}

const DadosBasicosSection: React.FC<DadosBasicosSectionProps> = ({
    tipoPessoa,
    setTipoPessoa,
    dados,
    erros,
    handleInputChange,
    handleBlurCPF,
    handleBlurCNPJ,
    handleBlurCPFResponsavel,
    cnpjSearching,
    cnpjPreview,
    setCnpjPreview,
    buscarCNPJ,
    handleUsarDadosCNPJ,
    enderecos,
    handleAddEndereco,
    handleUpdateEndereco,
    cepLoading,
    cepErros,
    handleCepBlur,
    handleCepChange,
}) => {
    return (
        <div className="animate-in fade-in duration-300">
            {/* Toggle PF / PJ */}
            <div className="flex bg-slate-100 p-1 rounded-lg w-fit mb-6">
                <button
                    onClick={() => setTipoPessoa('PJ')}
                    className={`px-6 py-1.5 text-sm font-bold rounded-md transition-all ${tipoPessoa === 'PJ' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Pessoa Jurídica (PJ)
                </button>
                <button
                    onClick={() => setTipoPessoa('PF')}
                    className={`px-6 py-1.5 text-sm font-bold rounded-md transition-all ${tipoPessoa === 'PF' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Pessoa Física (PF)
                </button>
            </div>

            {/* Grid Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {tipoPessoa === 'PF' ? (
                    <>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nome Completo</label>
                            <input name="nome" value={dados.nome} onChange={handleInputChange} type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Digite o nome completo" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">CPF</label>
                            <input
                                name="cpf"
                                value={dados.cpf}
                                onChange={handleInputChange}
                                onBlur={handleBlurCPF}
                                maxLength={14}
                                type="text"
                                inputMode="numeric"
                                className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 outline-none ${erros.cpf ? 'border-red-400 focus:ring-red-300 bg-red-50' : 'border-slate-300 focus:ring-blue-500'}`}
                                placeholder="000.000.000-00"
                            />
                            {erros.cpf && <p className="text-red-500 text-[11px] mt-1 font-medium">{erros.cpf}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">RG</label>
                            <input name="rg" value={dados.rg} onChange={handleInputChange} type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="00.000.000-X" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Data de Nascimento</label>
                            <input name="dataNascimento" value={dados.dataNascimento} onChange={handleInputChange} type="date" min="1900-01-01" max="2099-12-31" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nome Fantasia</label>
                            <input name="nomeFantasia" value={dados.nomeFantasia} onChange={handleInputChange} type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nome pelo qual é conhecido" />
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Razão Social</label>
                            <input name="razaoSocial" value={dados.razaoSocial} onChange={handleInputChange} type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nome da Empresa LTDA" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nome Fantasia</label>
                            <input name="nomeFantasia" value={dados.nomeFantasia} onChange={handleInputChange} type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nome Comercial" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Responsável pela Empresa</label>
                            <input name="responsavelEmpresa" value={dados.responsavelEmpresa} onChange={handleInputChange} type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nome do responsável" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">CPF do Responsável</label>
                            <input
                                name="cpfResponsavel"
                                value={dados.cpfResponsavel}
                                onChange={handleInputChange}
                                onBlur={handleBlurCPFResponsavel}
                                maxLength={14}
                                type="text"
                                inputMode="numeric"
                                className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 outline-none ${erros.cpfResponsavel ? 'border-red-400 focus:ring-red-300 bg-red-50' : 'border-slate-300 focus:ring-blue-500'}`}
                                placeholder="000.000.000-00"
                            />
                            {erros.cpfResponsavel && <p className="text-red-500 text-[11px] mt-1 font-medium">{erros.cpfResponsavel}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">CNPJ</label>
                            <div className="flex gap-2 items-start">
                                <div className="flex-1">
                                    <input
                                        name="cnpj"
                                        value={dados.cnpj}
                                        onChange={(e) => { handleInputChange(e); setCnpjPreview(null); }}
                                        onBlur={handleBlurCNPJ}
                                        maxLength={18}
                                        type="text"
                                        inputMode="numeric"
                                        className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 outline-none ${erros.cnpj ? 'border-red-400 focus:ring-red-300 bg-red-50' : 'border-slate-300 focus:ring-blue-500'}`}
                                        placeholder="00.000.000/0001-00"
                                    />
                                    {erros.cnpj && <p className="text-red-500 text-[11px] mt-1 font-medium">{erros.cnpj}</p>}
                                </div>
                                <button
                                    type="button"
                                    onClick={buscarCNPJ}
                                    disabled={cnpjSearching || onlyDigits(dados.cnpj).length !== 14}
                                    className="mt-0 flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    {cnpjSearching ? (
                                        <svg className="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
                                    )}
                                    Buscar Dados
                                </button>
                            </div>

                            {/* Card de Preview CNPJ */}
                            {cnpjPreview && (
                                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4 col-span-2">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <span className="text-xs font-black text-blue-700 uppercase tracking-wide">Dados encontrados na Receita Federal</span>
                                        </div>
                                        <button onClick={() => setCnpjPreview(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mb-4">
                                        <div><span className="font-bold text-slate-500">Razão Social: </span><span className="text-slate-800">{cnpjPreview.razao_social}</span></div>
                                        <div><span className="font-bold text-slate-500">Nome Fantasia: </span><span className="text-slate-800">{cnpjPreview.nome_fantasia || '—'}</span></div>
                                        <div className="col-span-2"><span className="font-bold text-slate-500">Endereço: </span><span className="text-slate-800">{[cnpjPreview.logradouro, cnpjPreview.numero, cnpjPreview.complemento, cnpjPreview.bairro, cnpjPreview.municipio, cnpjPreview.uf].filter(Boolean).join(', ')}</span></div>
                                        <div><span className="font-bold text-slate-500">CEP: </span><span className="text-slate-800">{cnpjPreview.cep || '—'}</span></div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={handleUsarDadosCNPJ}
                                            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                            Usar esses dados
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCnpjPreview(null)}
                                            className="px-4 py-1.5 text-xs font-bold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                                        >
                                            Ignorar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Inscrição Estadual</label>
                            <input name="inscricaoEstadual" value={dados.inscricaoEstadual} onChange={handleInputChange} type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="ISENTO ou Numeração" />
                        </div>
                    </>
                )}

            </div>

                {/* Endereço Principal — apenas na aba Dados Básicos */}
                {(
                    <div className="mt-6 pt-6 border-t border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                Endereço Principal
                            </h3>
                            {enderecos.length === 0 && (
                                <button
                                    type="button"
                                    onClick={handleAddEndereco}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                    Adicionar Endereço Principal
                                </button>
                            )}
                        </div>

                        {enderecos.length === 0 ? (
                            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                                <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                                <p className="text-xs text-slate-400">Nenhum endereço cadastrado. Clique em "Adicionar" ou use a busca por CNPJ.</p>
                            </div>
                        ) : (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                                    <div className="md:col-span-4 mb-1">
                                        <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Tema / Título</label>
                                        <input
                                            value={enderecos[0].tema}
                                            onChange={(e) => handleUpdateEndereco(enderecos[0].id, 'tema', e.target.value)}
                                            type="text"
                                            className="w-full sm:w-1/3 border-b-2 border-slate-300 px-0 py-1 text-sm font-bold text-slate-800 focus:border-blue-500 bg-transparent outline-none placeholder:font-normal"
                                            placeholder="Ex: Comercial, Fazenda..."
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">CEP</label>
                                        <input
                                            value={enderecos[0].cep}
                                            onChange={(e) => handleCepChange(enderecos[0].id, e.target.value)}
                                            onBlur={(e) => handleCepBlur(enderecos[0].id, e.target.value)}
                                            maxLength={9}
                                            type="text"
                                            inputMode="numeric"
                                            className={`w-full border rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 outline-none bg-white ${cepErros[enderecos[0].id] ? 'border-red-400 focus:ring-red-300 bg-red-50' : 'border-slate-300 focus:ring-blue-500'}`}
                                            placeholder="00000-000"
                                        />
                                        {cepLoading[enderecos[0].id] && (
                                            <svg className="animate-spin absolute right-2 top-[34px] w-4 h-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                        )}
                                        {cepErros[enderecos[0].id] && <p className="text-red-500 text-[11px] mt-1 font-medium">{cepErros[enderecos[0].id]}</p>}
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Logradouro</label>
                                        <input value={enderecos[0].logradouro} onChange={(e) => handleUpdateEndereco(enderecos[0].id, 'logradouro', e.target.value)} type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 outline-none bg-white" placeholder="Rua, Avenida..." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Número</label>
                                        <input value={enderecos[0].numero} onChange={(e) => handleUpdateEndereco(enderecos[0].id, 'numero', e.target.value)} type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 outline-none bg-white" placeholder="S/N" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Complemento</label>
                                        <input value={enderecos[0].complemento} onChange={(e) => handleUpdateEndereco(enderecos[0].id, 'complemento', e.target.value)} type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 outline-none bg-white" placeholder="Apto, Bloco..." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Bairro</label>
                                        <input value={enderecos[0].bairro} onChange={(e) => handleUpdateEndereco(enderecos[0].id, 'bairro', e.target.value)} type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 outline-none bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Cidade</label>
                                        <input value={enderecos[0].cidade} onChange={(e) => handleUpdateEndereco(enderecos[0].id, 'cidade', e.target.value)} type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 outline-none bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">UF</label>
                                        <input value={enderecos[0].estado} onChange={(e) => handleUpdateEndereco(enderecos[0].id, 'estado', e.target.value)} type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 outline-none bg-white" placeholder="SP" />
                                    </div>
                                </div>
                                {enderecos.length > 1 && (
                                    <p className="text-[11px] text-slate-400 mt-2">
                                        + {enderecos.length - 1} endereço(s) adicional(is) na aba <strong>Endereços</strong>.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}
        </div>
    );
};

export default DadosBasicosSection;
