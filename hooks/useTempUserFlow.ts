import { useState } from 'react';
import { authService, User } from '../services/authService';
import { AlertType } from '../components/AlertModal';
import { APP_PUBLIC_URL } from '../utils/constants';

interface UseTempUserFlowOptions {
    users: User[];
    edicoesAtivas: { id: string; titulo: string }[];
    formLoading: boolean;
    setFormLoading: (v: boolean) => void;
    onCreated: () => Promise<void>;
    showAlert: (title: string, message: string, type?: AlertType, onConfirm?: () => void) => void;
}

export function useTempUserFlow({
    users,
    edicoesAtivas,
    formLoading,
    setFormLoading,
    onCreated,
    showAlert,
}: UseTempUserFlowOptions) {
    const [tempExpiresAt, setTempExpiresAt] = useState('');
    const [tempEdicaoId, setTempEdicaoId] = useState('');
    const [createdTempUser, setCreatedTempUser] = useState<{ user: User; passwordRaw: string } | null>(null);
    const [existingTempForEdicao, setExistingTempForEdicao] = useState<User | null>(null);
    // Senha do visitante existente, lida sob demanda via RPC (só admin) — a coluna
    // temp_password_plain não vem mais no objeto User (leitura geral não a expõe).
    const [existingTempPassword, setExistingTempPassword] = useState<string | null>(null);
    const [confirmCreateAnother, setConfirmCreateAnother] = useState(false);
    const [whatsappCopied, setWhatsappCopied] = useState(false);

    const reset = () => {
        setCreatedTempUser(null);
        setTempEdicaoId('');
        setTempExpiresAt('');
        setExistingTempForEdicao(null);
        setExistingTempPassword(null);
        setConfirmCreateAnother(false);
    };

    const handleEdicaoChange = (id: string) => {
        setTempEdicaoId(id);
        setConfirmCreateAnother(false);
        setExistingTempPassword(null);
        if (id) {
            const found =
                users.find(
                    (u: User) =>
                        u.isVisitor &&
                        u.isActive !== false &&
                        u.edicaoId === id &&
                        (!u.expiresAt || new Date(u.expiresAt) >= new Date())
                ) ?? null;
            setExistingTempForEdicao(found);
            if (found) {
                authService.getTempPassword(found.id)
                    .then(setExistingTempPassword)
                    .catch(() => setExistingTempPassword(null));
            }
        } else {
            setExistingTempForEdicao(null);
        }
    };

    const handleCreateTempUser = async () => {
        if (!tempExpiresAt || !tempEdicaoId) {
            showAlert('Campos Obrigatórios', 'Selecione a edição e a data limite de acesso.', 'warning');
            return;
        }
        setFormLoading(true);
        try {
            const edicaoTitulo = edicoesAtivas.find(e => e.id === tempEdicaoId)?.titulo ?? '';
            const result = await authService.createTempUser(new Date(tempExpiresAt), tempEdicaoId, edicaoTitulo);
            setCreatedTempUser(result);
            await onCreated();
        } catch (err: any) {
            showAlert('Erro Operacional', 'Erro ao criar usuário temporário: ' + err.message, 'error');
        } finally {
            setFormLoading(false);
        }
    };

    const handleCopyTempUser = () => {
        if (!createdTempUser) return;

        const message =
            `*Acesso Temporário - Dbarros Rural*\n\n` +
            `Olá! Segue seu acesso de visitante:\n\n` +
            `🔗 *Link:* ${APP_PUBLIC_URL}/#/login\n` +
            `👤 *Usuário:* ${createdTempUser.user.email.replace('@temp.local', '')}\n` +
            `🔑 *Senha:* ${createdTempUser.passwordRaw}\n\n` +
            `📅 *Válido até:* ${new Date(createdTempUser.user.expiresAt!).toLocaleDateString()}\n\n` +
            `Acesse para visualizar e baixar as fotos.`;

        navigator.clipboard.writeText(message);
        setWhatsappCopied(true);
        setTimeout(() => setWhatsappCopied(false), 4000);
    };

    const handleCopyExistingWhatsapp = (existingUser: User, edicaoNome: string) => {
        const login = existingUser.email.replace('@temp.local', '');
        const senha = existingTempPassword ?? '(não disponível)';
        const expira = existingUser.expiresAt
            ? new Date(existingUser.expiresAt).toLocaleDateString('pt-BR')
            : '—';
        const msg =
            `*Acesso Temporário - Dbarros Rural*\n\nOlá! Segue seu acesso de visitante para *${edicaoNome}*:\n\n` +
            `🔗 *Link:* ${APP_PUBLIC_URL}/#/login\n` +
            `👤 *Usuário:* ${login}\n` +
            `🔑 *Senha:* ${senha}\n\n` +
            `📅 *Válido até:* ${expira}\n\nAcesse para visualizar a planilha e atendimentos.`;
        navigator.clipboard.writeText(msg);
        setWhatsappCopied(true);
        setTimeout(() => setWhatsappCopied(false), 4000);
    };

    return {
        tempExpiresAt,
        setTempExpiresAt,
        tempEdicaoId,
        createdTempUser,
        existingTempForEdicao,
        setExistingTempForEdicao,
        existingTempPassword,
        confirmCreateAnother,
        setConfirmCreateAnother,
        whatsappCopied,
        reset,
        handleEdicaoChange,
        handleCreateTempUser,
        handleCopyTempUser,
        handleCopyExistingWhatsapp,
    };
}
