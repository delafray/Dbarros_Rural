import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAppDialog } from '../context/DialogContext';
import { useCadastroCliente } from '../hooks/useCadastroCliente';
import DadosBasicosSection from '../components/cadastroCliente/DadosBasicosSection';
import EnderecosSection from '../components/cadastroCliente/EnderecosSection';
import ContatosSection from '../components/cadastroCliente/ContatosSection';
import ContratosSection from '../components/cadastroCliente/ContratosSection';
import type { TabType } from '../components/cadastroCliente/types';

const CadastroCliente: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const appDialog = useAppDialog();
    const initialTab = (location.state as any)?.tab as TabType | undefined;

    const {
        // estado geral
        activeTab, setActiveTab,
        tipoPessoa, setTipoPessoa,
        clienteId,
        saving,
        // dados básicos
        dados,
        erros,
        handleInputChange,
        handleBlurCPF,
        handleBlurCNPJ,
        handleBlurCPFResponsavel,
        // CNPJ lookup
        cnpjSearching,
        cnpjPreview,
        setCnpjPreview,
        buscarCNPJ,
        handleUsarDadosCNPJ,
        // endereços
        enderecos,
        handleAddEndereco,
        handleUpdateEndereco,
        handleRemoveEndereco,
        // CEP lookup
        cepLoading,
        cepErros,
        handleCepBlur,
        handleCepChange,
        // contatos
        contatos,
        handleAddContato,
        handleTogglePrincipal,
        handleUpdateContato,
        handleRemoveContato,
        // contratos (leitura)
        standsVinculados,
        atendimentosVinculados,
        // ações
        handleSaveCliente,
        isTabLocked,
    } = useCadastroCliente({ id, initialTab, appDialog, navigate });

    const headerActions = (
        <div className="flex items-center gap-3">
            <button
                onClick={() => navigate('/clientes')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-white hover:shadow-sm rounded-xl transition-all"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Voltar para Lista
            </button>
            <div className="w-px h-6 bg-slate-200" />
            <button
                onClick={() => navigate('/clientes')}
                disabled={saving}
                className="px-4 py-2 text-sm font-bold text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
                Cancelar
            </button>
            <button
                onClick={handleSaveCliente}
                disabled={saving}
                className="px-4 py-2 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 shadow-md shadow-green-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
                {saving ? (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                )}
                {clienteId ? 'Atualizar Cadastro' : 'Salvar'}
            </button>
        </div>
    );

    return (
        <Layout title={id ? "Editar Cliente" : "Novo Cliente"} headerActions={headerActions}>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[70vh]">

                {/* Helper Note */}
                <div className="bg-blue-50 border-b border-blue-100 p-3 text-xs text-blue-800 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                    {clienteId
                        ? 'Cliente persistido no banco de dados. Você pode preencher as informações adicionais.'
                        : 'Preencha os dados básicos e salve para liberar o cadastro de endereços, contatos e contratos.'}
                </div>

                {/* Header com as Abas */}
                <div className="border-b border-slate-200 px-6 pt-4 flex gap-6">
                    <button
                        onClick={() => setActiveTab('dados')}
                        className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'dados' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Dados Básicos
                    </button>
                    <button
                        onClick={() => !isTabLocked('enderecos') && setActiveTab('enderecos')}
                        disabled={isTabLocked('enderecos')}
                        className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'enderecos' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'} ${isTabLocked('enderecos') ? 'opacity-50 cursor-not-allowed' : 'hover:text-slate-600'}`}
                    >
                        {isTabLocked('enderecos') && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>}
                        Endereços
                        <span className="bg-slate-100 text-slate-500 py-0.5 px-2 rounded-full text-[10px]">{enderecos.length}</span>
                    </button>
                    <button
                        onClick={() => !isTabLocked('contatos') && setActiveTab('contatos')}
                        disabled={isTabLocked('contatos')}
                        className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'contatos' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'} ${isTabLocked('contatos') ? 'opacity-50 cursor-not-allowed' : 'hover:text-slate-600'}`}
                    >
                        {isTabLocked('contatos') && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>}
                        Contatos
                        <span className="bg-slate-100 text-slate-500 py-0.5 px-2 rounded-full text-[10px]">{contatos.length}</span>
                    </button>
                    <button
                        onClick={() => !isTabLocked('contratos') && setActiveTab('contratos')}
                        disabled={isTabLocked('contratos')}
                        className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'contratos' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'} ${isTabLocked('contratos') ? 'opacity-50 cursor-not-allowed' : 'hover:text-slate-600'}`}
                    >
                        {isTabLocked('contratos') && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>}
                        Contratos
                    </button>
                </div>

                {/* Conteúdo das Abas */}
                <div className="p-6">

                    {/* Aba: DADOS BÁSICOS */}
                    {activeTab === 'dados' && (
                        <DadosBasicosSection
                            tipoPessoa={tipoPessoa}
                            setTipoPessoa={setTipoPessoa}
                            dados={dados}
                            erros={erros}
                            handleInputChange={handleInputChange}
                            handleBlurCPF={handleBlurCPF}
                            handleBlurCNPJ={handleBlurCNPJ}
                            handleBlurCPFResponsavel={handleBlurCPFResponsavel}
                            cnpjSearching={cnpjSearching}
                            cnpjPreview={cnpjPreview}
                            setCnpjPreview={setCnpjPreview}
                            buscarCNPJ={buscarCNPJ}
                            handleUsarDadosCNPJ={handleUsarDadosCNPJ}
                            enderecos={enderecos}
                            handleAddEndereco={handleAddEndereco}
                            handleUpdateEndereco={handleUpdateEndereco}
                            cepLoading={cepLoading}
                            cepErros={cepErros}
                            handleCepBlur={handleCepBlur}
                            handleCepChange={handleCepChange}
                        />
                    )}

                    {/* Aba: ENDEREÇOS */}
                    {activeTab === 'enderecos' && (
                        <EnderecosSection
                            enderecos={enderecos}
                            handleAddEndereco={handleAddEndereco}
                            handleUpdateEndereco={handleUpdateEndereco}
                            handleRemoveEndereco={handleRemoveEndereco}
                            cepLoading={cepLoading}
                            cepErros={cepErros}
                            handleCepBlur={handleCepBlur}
                            handleCepChange={handleCepChange}
                        />
                    )}

                    {/* Aba: CONTATOS */}
                    {activeTab === 'contatos' && (
                        <ContatosSection
                            contatos={contatos}
                            handleAddContato={handleAddContato}
                            handleTogglePrincipal={handleTogglePrincipal}
                            handleUpdateContato={handleUpdateContato}
                            handleRemoveContato={handleRemoveContato}
                        />
                    )}

                    {/* Aba: CONTRATOS */}
                    {activeTab === 'contratos' && (
                        <ContratosSection
                            standsVinculados={standsVinculados}
                            atendimentosVinculados={atendimentosVinculados}
                            navigate={navigate}
                        />
                    )}

                </div>

                {/* Footer actions */}
                <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                    <button
                        onClick={() => navigate('/clientes')}
                        disabled={saving}
                        className="px-5 py-2.5 text-sm font-bold text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSaveCliente}
                        disabled={saving}
                        className="px-5 py-2.5 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 shadow-md shadow-green-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? (
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        )}
                        {clienteId ? 'Atualizar Cadastro' : 'Salvar e Próximo'}
                    </button>
                </div>
            </div>
        </Layout>
    );
};

export default CadastroCliente;
