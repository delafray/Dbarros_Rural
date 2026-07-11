import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { maskCNPJ, maskCPF, maskCEP, validarCNPJ, validarCPF } from '../utils/masks';
import { isTemporaryId } from '../utils/isTemporaryId';
import { clientesService } from '../services/clientesService';
import { makeDocumentBlurHandler } from './useDocumentValidation';
import { useCNPJLookup } from './useCNPJLookup';
import { useCEPLookup } from './useCEPLookup';
import type {
    TabType,
    TipoPessoa,
    Endereco,
    Contato,
    StandVinculado,
    AtendimentoVinculado,
    DadosCliente,
} from '../components/cadastroCliente/types';

interface UseCadastroClienteParams {
    id: string | undefined;
    initialTab: TabType | undefined;
    appDialog: {
        alert: (opts: { title: string; message: string; type: string }) => Promise<any>;
    };
    navigate: (to: string, opts?: { replace?: boolean }) => void;
}

const DADOS_INICIAIS: DadosCliente = {
    nome: '',
    cpf: '',
    rg: '',
    dataNascimento: '',
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    inscricaoEstadual: '',
    responsavelEmpresa: '',
    cpfResponsavel: '',
};

export function useCadastroCliente({ id, initialTab, appDialog, navigate }: UseCadastroClienteParams) {
    const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'dados');
    const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>('PJ');
    const [clienteId, setClienteId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);

    // Erros de validação dos dados básicos
    const [erros, setErros] = useState<{ cnpj?: string; cpf?: string; cpfResponsavel?: string }>({});

    // Formulário: Dados Básicos
    const [dados, setDados] = useState<DadosCliente>(DADOS_INICIAIS);

    // Contratos: dados vinculados (leitura)
    const [standsVinculados, setStandsVinculados] = useState<StandVinculado[]>([]);
    const [atendimentosVinculados, setAtendimentosVinculados] = useState<AtendimentoVinculado[]>([]);

    // Contatos Dinâmicos
    const [contatos, setContatos] = useState<Contato[]>([]);
    const [contatosToDelete, setContatosToDelete] = useState<string[]>([]);

    // Endereços
    const [enderecos, setEnderecos] = useState<Endereco[]>([]);
    const [enderecosToDelete, setEnderecosToDelete] = useState<string[]>([]);

    useEffect(() => {
        if (id) {
            setClienteId(id);
            fetchClienteData(id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchClienteData = async (uid: string) => {
        try {
            setLoading(true);
            const result = await clientesService.fetchClienteCompleto(uid);
            setTipoPessoa(result.tipoPessoa);
            setDados(result.dados);
            setEnderecos(result.enderecos);
            setContatos(result.contatos);
            setStandsVinculados(result.standsVinculados);
            setAtendimentosVinculados(result.atendimentosVinculados);
        } catch (error: any) {
            console.error('Erro ao carregar dados do cliente:', error);
            await appDialog.alert({ title: 'Erro', message: 'Erro ao carregar dados: ' + error.message, type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    // -- Contatos --
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
        if (!isTemporaryId(id)) {
            setContatosToDelete([...contatosToDelete, id]);
        }
    };

    // -- Endereços --
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
        if (!isTemporaryId(id)) {
            setEnderecosToDelete([...enderecosToDelete, id]);
        }
    };

    // -- Dados básicos --
    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let masked = value;

        if (name === 'cnpj') masked = maskCNPJ(value);
        else if (name === 'cpf') masked = maskCPF(value);
        else if (name === 'cpfResponsavel') masked = maskCPF(value);

        setDados({ ...dados, [name]: masked });
    };

    // Validações de documento (fábrica genérica unificando os 3 handlers)
    const handleBlurCPFResponsavel = makeDocumentBlurHandler({
        getValue: () => dados.cpfResponsavel,
        validate: validarCPF,
        field: 'cpfResponsavel',
        message: 'CPF inválido',
        setErros,
    });

    const handleBlurCNPJ = makeDocumentBlurHandler({
        getValue: () => dados.cnpj,
        validate: validarCNPJ,
        field: 'cnpj',
        message: 'CNPJ inválido',
        setErros,
    });

    const handleBlurCPF = makeDocumentBlurHandler({
        getValue: () => dados.cpf,
        validate: validarCPF,
        field: 'cpf',
        message: 'CPF inválido',
        setErros,
    });

    // -- Busca CNPJ (BrasilAPI) --
    const { cnpjSearching, cnpjPreview, setCnpjPreview, buscarCNPJ } = useCNPJLookup(
        () => dados.cnpj,
        (message) => setErros(e => ({ ...e, cnpj: message }))
    );

    const handleUsarDadosCNPJ = () => {
        if (!cnpjPreview) return;
        setDados(d => ({
            ...d,
            razaoSocial: cnpjPreview.razao_social || d.razaoSocial,
            nomeFantasia: cnpjPreview.nome_fantasia || cnpjPreview.razao_social || d.nomeFantasia,
        }));
        // Preencher ou criar endereço principal
        const cepLimpo = (cnpjPreview.cep || '').replace(/\D/g, '');
        const novoEnd: Endereco = {
            id: Math.random().toString(36).substring(7),
            tema: 'Comercial',
            cep: cepLimpo ? maskCEP(cepLimpo) : '',
            logradouro: cnpjPreview.logradouro || '',
            numero: cnpjPreview.numero || '',
            complemento: cnpjPreview.complemento || '',
            bairro: cnpjPreview.bairro || '',
            cidade: cnpjPreview.municipio || '',
            estado: cnpjPreview.uf || '',
        };
        setEnderecos(prev => prev.length === 0 ? [novoEnd] : [{ ...prev[0], ...novoEnd, id: prev[0].id }, ...prev.slice(1)]);
        setCnpjPreview(null);
    };

    // -- Busca CEP (ViaCEP) --
    const { cepLoading, cepErros, handleCepBlur, handleCepChange } = useCEPLookup({
        updateEndereco: handleUpdateEndereco,
        setEnderecos,
    });

    // -- Salvamento --
    const handleSaveCliente = async () => {
        try {
            setSaving(true);

            const result = await clientesService.saveClienteCompleto({
                clienteId,
                tipoPessoa,
                dados,
                enderecos,
                contatos,
                enderecosToDelete,
                contatosToDelete,
            });

            if (result.status === 'duplicado') {
                setSaving(false);
                const { campo, nome } = result.duplicado;
                if (campo === 'cpf') {
                    return appDialog.alert({
                        title: 'CPF em Uso',
                        message: `Este CPF já está cadastrado para o cliente: ${nome}`,
                        type: 'warning'
                    });
                }
                return appDialog.alert({
                    title: 'CNPJ em Uso',
                    message: `Este CNPJ já está cadastrado para o cliente: ${nome}`,
                    type: 'warning'
                });
            }

            const currentClientId = result.clienteId;
            setClienteId(currentClientId);
            setEnderecosToDelete([]);
            setContatosToDelete([]);
            setEnderecos(result.enderecos);
            setContatos(result.contatos);

            await appDialog.alert({ title: 'Salvo!', message: 'Tudo salvo com sucesso!', type: 'success' });

            // Se era um cadastro novo, navega para a URL correta de edição sem recarregar
            if (!id) {
                navigate(`/clientes/editar/${currentClientId}`, { replace: true });
            }
        } catch (error: any) {
            console.error('Erro ao salvar cliente:', error);
            await appDialog.alert({ title: 'Erro', message: 'Erro ao salvar cliente: ' + (error.message || 'Erro desconhecido'), type: 'danger' });
        } finally {
            setSaving(false);
        }
    };

    const isTabLocked = (tab: TabType) => {
        return tab !== 'dados' && !clienteId;
    };

    return {
        // estado geral
        activeTab, setActiveTab,
        tipoPessoa, setTipoPessoa,
        clienteId,
        saving,
        loading,
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
    };
}
