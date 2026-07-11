import { Atendimento } from '../../services/atendimentosService';

export interface Contato {
    id: string;
    nome: string;
    telefone: string;
    cargo: string;
    principal: boolean;
}

export interface ClienteOption {
    id: string;
    label: string;
    nome_fantasia: string | null;
    contatos: Contato[];
}

export type SortKey = 'nome' | 'contato' | 'prob' | 'registro' | 'retorno' | 'obs';

export interface HistoricoPopupProps {
    atendimento: Atendimento;
    onClose: () => void;
    onSaved: (updated: Atendimento) => void;
    isVisitor?: boolean;
}

export interface AtendimentoFormProps {
    edicaoId: string;
    atendimento?: Atendimento | null;
    clientes: ClienteOption[];
    onClose: () => void;
    onSaved: (a: Atendimento) => void;
    onViewHistory: (a: Atendimento) => void;
    existingAtendimentos: Atendimento[];
}
