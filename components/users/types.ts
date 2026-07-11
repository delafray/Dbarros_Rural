import { User } from '../../services/authService';
import { AlertType } from '../AlertModal';

export interface EdicaoAtiva {
    id: string;
    titulo: string;
    data_inicio: string | null;
    data_fim: string | null;
}

export interface TempUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    users: User[];
    edicoesAtivas: EdicaoAtiva[];
    formLoading: boolean;
    setFormLoading: (v: boolean) => void;
    onCreated: () => Promise<void>;
    showAlert: (title: string, message: string, type?: AlertType, onConfirm?: () => void) => void;
}
