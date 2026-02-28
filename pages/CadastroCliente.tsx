import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { supabase } from '../services/supabaseClient';

type TabType = 'dados' | 'enderecos' | 'contatos' | 'contratos';
type TipoPessoa = 'PF' | 'PJ';

interface Endereco {
    id: string;
    tema: string;
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
}

interface Contato {
    id: string;
    nome: string;
    email: string;
    telefone: string;
    cargo: string;
    principal: boolean;
}

interface StandVinculado {
    id: string;
    stand_nr: string;
    tipo_venda: string;
    opcionais_selecionados: Record<string, boolean> | null;
    planilha_configuracoes?: {
        edicao_id: string | null;
        opcionais_ativos: string[] | null;
        eventos_edicoes?: { titulo: string; eventos?: { nome: string } | null } | null;
    } | null;
}

interface AtendimentoVinculado {
    id: string;
    edicao_id: string;
    contato_nome: string | null;
    telefone: string | null;
    ultima_obs: string | null;
    ultima_obs_at: string | null;
    data_retorno: string | null;
    eventos_edicoes?: { titulo: string; eventos?: { nome: string } | null } | null;
    contatos?: { nome: string | null; telefone: string | null } | null;
    users?: { name: string | null } | null;
}

const CadastroCliente: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const initialTab = (location.state as any)?.tab as TabType | undefined;
    const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'dados');
    const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>('PJ');
    const [clienteId, setClienteId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (id) {
            setClienteId(id);
            fetchClienteData(id);
        }
    }, [id]);

    const fetchClienteData = async (uid: string) => {
        try {
            setLoading(true);

            // 1. Buscar dados básicos
            const { data: client, error: clientError } = await supabase
                .from('clientes')
                .select('*')
                .eq('id', uid)
                .single();

            if (clientError) throw clientError;

            if (client) {
                setTipoPessoa(client.tipo_pessoa as TipoPessoa);
                setDados({
                    nome: client.nome_completo || '',
                    cpf: client.cpf || '',
                    rg: client.rg || '',
                    dataNascimento: client.data_nascimento || '',
                    razaoSocial: client.razao_social || '',
                    nomeFantasia: client.nome_fantasia || '',
                    cnpj: client.cnpj || '',
                    inscricaoEstadual: client.inscricao_estadual || '',
                });
            }

            // 2. Buscar endereços
            const { data: ends, error: endsError } = await supabase
                .from('enderecos')
                .select('*')
                .eq('cliente_id', uid);

            if (endsError) throw endsError;
            if (ends) setEnderecos(ends as Endereco[]);

            // 3. Buscar contatos
            const { data: conts, error: contsError } = await supabase
                .from('contatos')
                .select('*')
                .eq('cliente_id', uid);

            if (contsError) throw contsError;
            if (conts) {
                // Se nenhum for principal, o primeiro será considerado principal
                const formattedConts = (conts as any[]).map((c, idx) => ({
                    ...c,
                    principal: c.principal ?? (idx === 0)
                }));
                setContatos(formattedConts as Contato[]);
            }

            // 4. Buscar estandes vinculados na planilha de vendas
            const { data: stands } = await supabase
                .from('planilha_vendas_estandes')
                .select(`
                    id, stand_nr, tipo_venda, opcionais_selecionados,
                    planilha_configuracoes(
                        edicao_id, opcionais_ativos,
                        eventos_edicoes(titulo, eventos(nome))
                    )
                `)
                .eq('cliente_id', uid)
                .not('tipo_venda', 'eq', 'DISPONÍVEL')
                .order('stand_nr');

            setStandsVinculados((stands as unknown as StandVinculado[]) || []);

            // 5. Buscar atendimentos vinculados ao cliente
            const { data: atends } = await supabase
                .from('atendimentos')
                .select(`
                    id, edicao_id, contato_nome, telefone, ultima_obs, ultima_obs_at, data_retorno,
                    eventos_edicoes(titulo, eventos(nome)),
                    contatos(nome, telefone),
                    users(name)
                `)
                .eq('cliente_id', uid)
                .order('ultima_obs_at', { ascending: false });

            setAtendimentosVinculados((atends as unknown as AtendimentoVinculado[]) || []);

        } catch (error: any) {
            console.error('Erro ao carregar dados do cliente:', error);
            alert('Erro ao carregar dados: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Formulário: Dados Básicos
    const [dados, setDados] = useState({
        nome: '',
        cpf: '',
        rg: '',
        dataNascimento: '',
        razaoSocial: '',
        nomeFantasia: '',
        cnpj: '',
        inscricaoEstadual: '',
    });

    // Contratos: dados vinculados (leitura)
    const [standsVinculados, setStandsVinculados] = useState<StandVinculado[]>([]);
    const [atendimentosVinculados, setAtendimentosVinculados] = useState<AtendimentoVinculado[]>([]);

    // Contatos Dinâmicos
    const [contatos, setContatos] = useState<Contato[]>([]);
    const [contatosToDelete, setContatosToDelete] = useState<string[]>([]);

    const handleAddContato = () => {
        setContatos([
            ...contatos,
            {
                id: Math.random().toString(36).substring(7),
                nome: '',
                email: '',
                telefone: '',
                cargo: '',
                principal: contatos.length === 0 // Primeiro contato é o principal por padrão
            }
        ]);
    };

    const handleTogglePrincipal = (id: string) => {
        setContatos(contatos.map(cont => ({
            ...cont,
            principal: cont.id === id
        })));
    };

    const handleUpdateContato = (id: string, field: keyof Contato, value: any) => {
        setContatos(contatos.map(contato => contato.id === id ? { ...contato, [field]: value } : contato));
    };

    const handleRemoveContato = (id: string) => {
        setContatos(contatos.filter(contato => contato.id !== id));
        // Se o ID não for temporário (tamanho pequeno gerado por Math.random), marca para deleção
        if (id.length > 10) {
            setContatosToDelete([...contatosToDelete, id]);
        }
    };

    // Endereços
    const [enderecos, setEnderecos] = useState<Endereco[]>([]);
    const [enderecosToDelete, setEnderecosToDelete] = useState<string[]>([]);

    const handleAddEndereco = () => {
        setEnderecos([
            ...enderecos,
            {
                id: Math.random().toString(36).substring(7),
                tema: '',
                cep: '',
                logradouro: '',
                numero: '',
                complemento: '',
                bairro: '',
                cidade: '',
                estado: '',
            }
        ]);
    };

    const handleUpdateEndereco = (id: string, field: keyof Endereco, value: string) => {
        setEnderecos(enderecos.map(end => end.id === id ? { ...end, [field]: value } : end));
    };

    const handleRemoveEndereco = (id: string) => {
        setEnderecos(enderecos.filter(end => end.id !== id));
        if (id.length > 10) {
            setEnderecosToDelete([...enderecosToDelete, id]);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDados({ ...dados, [e.target.name]: e.target.value });
    };

    const handleSaveCliente = async () => {
        try {
            setSaving(true);

            // 0. Pegar usuário atual para associar ao registro
            const { data: { user } } = await supabase.auth.getUser();

            // 1. Salvar ou atualizar o Cliente
            const payload = {
                id: clienteId || undefined,
                tipo_pessoa: tipoPessoa,
                nome_completo: tipoPessoa === 'PF' ? dados.nome : null,
                cpf: tipoPessoa === 'PF' ? dados.cpf : null,
                rg: tipoPessoa === 'PF' ? dados.rg : null,
                data_nascimento: tipoPessoa === 'PF' ? (dados.dataNascimento || null) : null,
                razao_social: tipoPessoa === 'PJ' ? dados.razaoSocial : null,
                nome_fantasia: tipoPessoa === 'PJ' ? dados.nomeFantasia : null,
                cnpj: tipoPessoa === 'PJ' ? dados.cnpj : null,
                inscricao_estadual: tipoPessoa === 'PJ' ? dados.inscricaoEstadual : null,
                user_id: user?.id || null // Associa ao usuário logado
            };

            const { data: clientData, error: clientError } = await supabase
                .from('clientes')
                .upsert(payload)
                .select()
                .single();

            if (clientError) {
                console.error('Erro no upsert de clientes:', clientError);
                throw new Error(`Erro ao salvar dados básicos: ${clientError.message}`);
            }

            if (clientData) {
                const currentClientId = clientData.id;
                setClienteId(currentClientId);

                // 2. Processar Deleções de Endereços
                if (enderecosToDelete.length > 0) {
                    const { error: delEndError } = await supabase
                        .from('enderecos')
                        .delete()
                        .in('id', enderecosToDelete);
                    if (delEndError) throw new Error(`Erro ao deletar endereços: ${delEndError.message}`);
                    setEnderecosToDelete([]);
                }

                if (contatosToDelete.length > 0) {
                    const { error: delContError } = await supabase
                        .from('contatos')
                        .delete()
                        .in('id', contatosToDelete);
                    if (delContError) throw new Error(`Erro ao deletar contatos: ${delContError.message}`);
                    setContatosToDelete([]);
                }

                // 4. Salvar Endereços
                const updatedEnderecos: Endereco[] = [];
                if (enderecos.length > 0) {
                    const enderecosToSave = enderecos.map(end => {
                        const obj: any = {
                            cliente_id: currentClientId,
                            tema: end.tema || '',
                            cep: end.cep || '',
                            logradouro: end.logradouro || '',
                            numero: end.numero || '',
                            complemento: end.complemento || '',
                            bairro: end.bairro || '',
                            cidade: end.cidade || '',
                            estado: end.estado || ''
                        };
                        if (end.id && end.id.length > 10) obj.id = end.id;
                        return obj;
                    });

                    // Para evitar o erro "null value in column id", separamos novos de existentes
                    const newEnds = enderecosToSave.filter(e => !e.id);
                    const existingEnds = enderecosToSave.filter(e => e.id);

                    if (newEnds.length > 0) {
                        const { data: savedNew, error: newErr } = await supabase.from('enderecos').insert(newEnds).select();
                        if (newErr) throw new Error(`Erro ao inserir novos endereços: ${newErr.message}`);
                        if (savedNew) updatedEnderecos.push(...(savedNew as any[]));
                    }

                    if (existingEnds.length > 0) {
                        const { data: savedExt, error: extErr } = await supabase.from('enderecos').upsert(existingEnds).select();
                        if (extErr) throw new Error(`Erro ao atualizar endereços existentes: ${extErr.message}`);
                        if (savedExt) updatedEnderecos.push(...(savedExt as any[]));
                    }
                }
                setEnderecos(updatedEnderecos);

                // 5. Salvar Contatos
                const updatedContatos: Contato[] = [];
                if (contatos.length > 0) {
                    const contatosToSave = contatos.map(cont => {
                        const obj: any = {
                            cliente_id: currentClientId,
                            nome: cont.nome || '',
                            email: cont.email || '',
                            telefone: cont.telefone || '',
                            cargo: cont.cargo || '',
                            principal: cont.principal || false
                        };
                        if (cont.id && cont.id.length > 10) obj.id = cont.id;
                        return obj;
                    });

                    const newConts = contatosToSave.filter(c => !c.id);
                    const existingConts = contatosToSave.filter(c => c.id);

                    if (newConts.length > 0) {
                        const { data: savedNew, error: newErr } = await supabase.from('contatos').insert(newConts).select();
                        if (newErr) throw new Error(`Erro ao inserir novos contatos: ${newErr.message}`);
                        if (savedNew) updatedContatos.push(...(savedNew as any[]));
                    }

                    if (existingConts.length > 0) {
                        const { data: savedExt, error: extErr } = await supabase.from('contatos').upsert(existingConts).select();
                        if (extErr) throw new Error(`Erro ao atualizar contatos existentes: ${extErr.message}`);
                        if (savedExt) updatedContatos.push(...(savedExt as any[]));
                    }
                }
                setContatos(updatedContatos);

                alert('Tudo salvo com sucesso!');

                // Se era um cadastro novo, navega para a URL correta de edição sem recarregar
                if (!id) {
                    navigate(`/clientes/editar/${currentClientId}`, { replace: true });
                }
            }
        } catch (error: any) {
            console.error('Erro ao salvar cliente:', error);
            alert('Erro ao salvar cliente: ' + (error.message || 'Erro desconhecido'));
        } finally {
            setSaving(false);
        }
    };

    const isTabLocked = (tab: TabType) => {
        return tab !== 'dados' && !clienteId;
    };

    const headerActions = (
        <button
            onClick={() => navigate('/clientes')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-white hover:shadow-sm rounded-xl transition-all"
        >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar para Lista
        </button>
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
                                            <input name="cpf" value={dados.cpf} onChange={handleInputChange} type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="000.000.000-00" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">RG</label>
                                            <input name="rg" value={dados.rg} onChange={handleInputChange} type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="00.000.000-X" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Data de Nascimento</label>
                                            <input name="dataNascimento" value={dados.dataNascimento} onChange={handleInputChange} type="date" min="1900-01-01" max="2099-12-31" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
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
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">CNPJ</label>
                                            <input name="cnpj" value={dados.cnpj} onChange={handleInputChange} type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="00.000.000/0001-00" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Inscrição Estadual</label>
                                            <input name="inscricaoEstadual" value={dados.inscricaoEstadual} onChange={handleInputChange} type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="ISENTO ou Numeração" />
                                        </div>
                                    </>
                                )}

                                {/* Removed Context: Contatos moved to its own tab */}
                            </div>
                        </div>
                    )}

                    {/* Aba: ENDEREÇOS */}
                    {activeTab === 'enderecos' && (
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

                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">CEP</label>
                                                    <input value={end.cep} onChange={(e) => handleUpdateEndereco(end.id, 'cep', e.target.value)} type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 outline-none" placeholder="00000-000" />
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
                    )}

                    {/* Aba: CONTATOS */}
                    {activeTab === 'contatos' && (
                        <div className="animate-in fade-in duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-bold text-slate-800">Contatos do Cliente</h3>
                                <button
                                    onClick={handleAddContato}
                                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 hover:shadow-sm px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                    Adicionar Contato
                                </button>
                            </div>

                            {contatos.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                                    <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                    <p className="text-sm font-medium text-slate-500">Nenhum contato adicionado ainda.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {contatos.map((contato) => (
                                        <div key={contato.id} className="relative bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                            <button
                                                onClick={() => handleRemoveContato(contato.id)}
                                                className="absolute top-4 right-4 text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pr-10">
                                                <div className="lg:col-span-4 mb-2 flex items-center gap-3">
                                                    <label className="flex items-center gap-2 cursor-pointer group">
                                                        <div
                                                            onClick={() => handleTogglePrincipal(contato.id)}
                                                            className={`w-10 h-5 rounded-full transition-colors relative ${contato.principal ? 'bg-blue-600' : 'bg-slate-200'}`}
                                                        >
                                                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${contato.principal ? 'translate-x-5' : ''}`} />
                                                        </div>
                                                        <span className={`text-[11px] font-bold uppercase tracking-wider ${contato.principal ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-500'}`}>
                                                            Contato Principal
                                                        </span>
                                                    </label>
                                                    {contato.principal && (
                                                        <span className="bg-blue-100 text-blue-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Ativo</span>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">Nome</label>
                                                    <input
                                                        value={contato.nome}
                                                        onChange={(e) => handleUpdateContato(contato.id, 'nome', e.target.value)}
                                                        type="text"
                                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 outline-none"
                                                        placeholder="João Silva"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">Cargo</label>
                                                    <input
                                                        value={contato.cargo}
                                                        onChange={(e) => handleUpdateContato(contato.id, 'cargo', e.target.value)}
                                                        type="text"
                                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 outline-none"
                                                        placeholder="Gerente, Comprador..."
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">E-mail</label>
                                                    <input
                                                        value={contato.email}
                                                        onChange={(e) => handleUpdateContato(contato.id, 'email', e.target.value)}
                                                        type="email"
                                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 outline-none"
                                                        placeholder="exemplo@email.com"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">Telefone</label>
                                                    <input
                                                        value={contato.telefone}
                                                        onChange={(e) => handleUpdateContato(contato.id, 'telefone', e.target.value)}
                                                        type="text"
                                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 outline-none"
                                                        placeholder="(00) 00000-0000"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Aba: CONTRATOS */}
                    {activeTab === 'contratos' && (
                        <div className="animate-in fade-in duration-300 space-y-8">

                            {/* Listagem 1: Participações em Planilhas */}
                            <div>
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
                                    Participações em Planilhas
                                </h3>
                                {standsVinculados.length === 0 ? (
                                    <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                                        <p className="text-xs text-slate-400">Nenhum stand vinculado a este cliente.</p>
                                    </div>
                                ) : (
                                    <div className="border border-slate-300 overflow-hidden">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-slate-100 border-b border-slate-300">
                                                    <th className="text-left px-3 py-1 font-bold text-slate-600 uppercase tracking-wider text-[11px] border-r border-slate-300">Evento</th>
                                                    <th className="text-left px-3 py-1 font-bold text-slate-600 uppercase tracking-wider text-[11px] border-r border-slate-300">Stand</th>
                                                    <th className="text-left px-3 py-1 font-bold text-slate-600 uppercase tracking-wider text-[11px] border-r border-slate-300">Contrato</th>
                                                    <th className="text-left px-3 py-1 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Opcionais</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {standsVinculados.map((stand) => {
                                                    const edicao = stand.planilha_configuracoes?.eventos_edicoes;
                                                    const eventoNome = edicao?.eventos?.nome;
                                                    const edicaoTitulo = edicao?.titulo;
                                                    const eventoLabel = eventoNome
                                                        ? `${eventoNome} — ${edicaoTitulo}`
                                                        : (edicaoTitulo || '—');

                                                    const opcsObj = (stand.opcionais_selecionados || {}) as Record<string, string>;
                                                    const opcsSelecionadas = Object.entries(opcsObj)
                                                        .filter(([, v]) => v === 'x' || v === '*')
                                                        .map(([k]) => k);

                                                    const tipoVenda = stand.tipo_venda || '—';
                                                    const isCombo = tipoVenda.toLowerCase().includes('combo');
                                                    const isPadrao = tipoVenda === 'PADRÃO' || tipoVenda === 'PADRAO';

                                                    return (
                                                        <tr key={stand.id} className="hover:bg-blue-100/40 even:bg-slate-200/40 transition-colors">
                                                            <td className="px-3 py-0.5 border-b border-r border-slate-300 whitespace-nowrap max-w-[220px] truncate text-[12px] text-slate-700 font-medium" title={eventoLabel}>
                                                                {eventoLabel}
                                                            </td>
                                                            <td className="px-3 py-0.5 border-b border-r border-slate-300 whitespace-nowrap text-[12px]">
                                                                <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-px text-[11px]">
                                                                    {stand.stand_nr}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-0.5 border-b border-r border-slate-300 whitespace-nowrap text-[12px]">
                                                                <span className={`inline-flex items-center px-2 py-px text-[10px] font-bold uppercase tracking-wide ${isCombo ? 'bg-violet-100 text-violet-700' :
                                                                    isPadrao ? 'bg-blue-100 text-blue-700' :
                                                                        'bg-amber-100 text-amber-700'
                                                                    }`}>
                                                                    {tipoVenda}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-0.5 border-b border-slate-300 text-[12px] text-slate-600 whitespace-nowrap truncate max-w-[240px]" title={opcsSelecionadas.join(' - ')}>
                                                                {opcsSelecionadas.length > 0
                                                                    ? opcsSelecionadas.join(' - ')
                                                                    : <span className="text-slate-300">—</span>
                                                                }
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Listagem 2: Atendimentos */}
                            <div>
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                    Histórico de Atendimentos
                                </h3>
                                {atendimentosVinculados.length === 0 ? (
                                    <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                                        <p className="text-xs text-slate-400">Nenhum atendimento registrado para este cliente.</p>
                                    </div>
                                ) : (
                                    <div className="border border-slate-300 overflow-hidden">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-slate-100 border-b border-slate-300">
                                                    <th className="text-left px-3 py-1 font-bold text-slate-600 uppercase tracking-wider text-[11px] border-r border-slate-300">Evento</th>
                                                    <th className="text-left px-3 py-1 font-bold text-slate-600 uppercase tracking-wider text-[11px] border-r border-slate-300">Contato</th>
                                                    <th className="text-left px-3 py-1 font-bold text-slate-600 uppercase tracking-wider text-[11px] border-r border-slate-300 text-blue-600">Usuário</th>
                                                    <th className="text-left px-3 py-1 font-bold text-slate-600 uppercase tracking-wider text-[11px] border-r border-slate-300">Último Contato</th>
                                                    <th className="text-left px-3 py-1 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-blue-600">Última Obs. ↗</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {atendimentosVinculados.map((atend) => {
                                                    const edicao = atend.eventos_edicoes;
                                                    const eventoNome = edicao?.eventos?.nome;
                                                    const edicaoTitulo = edicao?.titulo;
                                                    const eventoLabel = eventoNome
                                                        ? `${eventoNome} — ${edicaoTitulo}`
                                                        : (edicaoTitulo || '—');

                                                    const contatoNome = atend.contatos?.nome || atend.contato_nome || '—';
                                                    const contatoTel = atend.contatos?.telefone || atend.telefone;

                                                    const formatTel = (tel: string | null | undefined) => {
                                                        if (!tel) return null;
                                                        const d = tel.replace(/\D/g, '');
                                                        if (d.length === 11) return `(${d.slice(0, 2)}) ${d[2]} ${d.slice(3, 7)}-${d.slice(7)}`;
                                                        if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
                                                        return tel;
                                                    };

                                                    const formatDate = (iso: string | null | undefined) => {
                                                        if (!iso) return null;
                                                        const d = new Date(iso);
                                                        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                                    };

                                                    const obs = atend.ultima_obs;
                                                    const obsLabel = obs ? (obs.length > 65 ? obs.slice(0, 65) + '…' : obs) : null;

                                                    return (
                                                        <tr key={atend.id} className="hover:bg-blue-100/40 even:bg-slate-200/40 transition-colors">
                                                            <td className="px-3 py-0.5 border-b border-r border-slate-300 whitespace-nowrap max-w-[200px] truncate text-[12px] text-slate-700 font-medium" title={eventoLabel}>
                                                                {eventoLabel}
                                                            </td>
                                                            <td className="px-3 py-0.5 border-b border-r border-slate-300 whitespace-nowrap text-[12px]">
                                                                <span className="font-semibold text-slate-800">{contatoNome}</span>
                                                                {formatTel(contatoTel) && (
                                                                    <span className="text-slate-400 text-[10px] ml-2">{formatTel(contatoTel)}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-0.5 border-b border-r border-slate-300 whitespace-nowrap text-[12px] text-blue-700 font-bold">
                                                                {atend.users?.name || 'Sistema'}
                                                            </td>
                                                            <td className="px-3 py-0.5 border-b border-r border-slate-300 whitespace-nowrap text-[12px] text-slate-500">
                                                                {formatDate(atend.ultima_obs_at) || <span className="text-slate-300">—</span>}
                                                            </td>
                                                            <td
                                                                className="px-3 py-0.5 border-b border-slate-300 text-[12px] text-slate-500 max-w-[220px] truncate cursor-pointer hover:text-blue-600 hover:bg-blue-50/60 transition-colors"
                                                                title={obs ? `${obs} — clique para abrir` : 'Clique para abrir atendimento'}
                                                                onClick={() => navigate(`/atendimentos/${atend.edicao_id}`)}
                                                            >
                                                                {obsLabel || <span className="text-blue-400 italic text-[11px]">abrir ↗</span>}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                        </div>
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
