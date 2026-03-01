import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, Button, Input, Modal } from '../components/UI';
import { AlertModal, AlertType } from '../components/AlertModal';
import { useAuth } from '../context/AuthContext';
import { authService, User } from '../services/authService';
import { exportService } from '../services/api/exportService';
import { supabase } from '../services/supabaseClient';

const Users: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Temp User State
    const [showTempModal, setShowTempModal] = useState(false);
    const [tempExpiresAt, setTempExpiresAt] = useState('');
    const [tempEdicaoId, setTempEdicaoId] = useState('');
    const [edicoesAtivas, setEdicoesAtivas] = useState<{ id: string; titulo: string; data_inicio: string | null; data_fim: string | null }[]>([]);
    const [createdTempUser, setCreatedTempUser] = useState<{ user: User, passwordRaw: string } | null>(null);
    const [existingTempForEdicao, setExistingTempForEdicao] = useState<User | null>(null);
    const [confirmCreateAnother, setConfirmCreateAnother] = useState(false);

    // Form state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');

    // Alert State
    const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; type: AlertType; onConfirm?: () => void }>({ isOpen: false, title: '', message: '', type: 'info' });
    const showAlert = (title: string, message: string, type: AlertType = 'info', onConfirm?: () => void) => setAlertState({ isOpen: true, title, message, type, onConfirm });
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [isVisitor, setIsVisitor] = useState(false);
    const [isActive, setIsActive] = useState(true);
    const [canManageTags, setCanManageTags] = useState(false);
    const [isProjetista, setIsProjetista] = useState(false);
    const [formError, setFormError] = useState('');
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        fetchUsers();
        supabase
            .from('eventos_edicoes')
            .select('id, titulo, data_inicio, data_fim')
            .order('titulo')
            .then(({ data }) => setEdicoesAtivas((data as { id: string; titulo: string; data_inicio: string | null; data_fim: string | null }[]) || []));
    }, []);

    const fetchUsers = async () => {
        try {
            const data = await authService.getAllUsers();
            const activeUsers = data.filter(u => {
                // Visitantes (temporários ou não): ocultar se inativo ou expirado
                if (u.isVisitor) {
                    if (u.isActive === false) return false;
                    if (u.expiresAt && new Date(u.expiresAt) < new Date()) return false;
                    return true;
                }
                // Usuários regulares: sempre mostrar
                return true;
            });

            setUsers(activeUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenForm = (user?: User) => {
        if (user) {
            setEditingId(user.id);
            setName(user.name);
            setEmail(user.email);
            setIsAdmin(user.isAdmin);
            setIsVisitor(user.isVisitor || false);
            setIsActive(user.isActive ?? true);
            setCanManageTags(user.canManageTags || false);
            setIsProjetista(user.isProjetista || false);
            setPassword(''); // Password empty means no change
        } else {
            resetForm();
        }
        setShowForm(true);
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');

        // Safety check: Prevent admin from deactivating themselves
        if (editingId === currentUser?.id && !isActive) {
            setFormError('Você não pode inativar seu próprio usuário.');
            setFormLoading(false);
            return;
        }

        try {
            if (editingId) {
                // Update existing user
                await authService.updateUser(editingId, {
                    name,
                    email,
                    isAdmin,
                    isVisitor,
                    isActive,
                    canManageTags,
                    isProjetista,
                    password: password || undefined
                });
            } else {
                // Create new user
                if (!password) {
                    throw new Error('Senha é obrigatória para novos usuários');
                }
                await authService.register(name, email, password, isAdmin, isVisitor, canManageTags, isProjetista);
            }

            await fetchUsers();
            setShowForm(false);
            resetForm();
        } catch (err: any) {
            setFormError(err.message || 'Erro ao salvar usuário');
        } finally {
            setFormLoading(false);
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
            await fetchUsers();
        } catch (err: any) {
            showAlert('Erro Operacional', 'Erro ao criar usuário temporário: ' + err.message, 'error');
        } finally {
            setFormLoading(false);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setName('');
        setEmail('');
        setPassword('');
        setIsAdmin(false);
        setIsVisitor(false);
        setIsActive(true);
        setCanManageTags(false);
        setIsProjetista(false);
        setFormError('');
    };

    if (!currentUser?.isAdmin) {
        return (
            <Layout title="Acesso Negado">
                <div className="text-center py-12">
                    <h2 className="text-xl font-bold text-red-600">Você não tem permissão para acessar esta página.</h2>
                </div>
            </Layout>
        );
    }

    const handleDeleteUser = (userId: string) => {
        showAlert('Excluir Usuário', 'Tem certeza que deseja excluir permanentemente este usuário? Esta ação não pode ser desfeita.', 'confirm', async () => {
            try {
                await authService.deleteUser(userId);
                await fetchUsers();
            } catch (err: any) {
                showAlert('Erro Operacional', err.message, 'error');
            }
        });
    };

    const handleExportTXT = async (userId: string, userName: string) => {
        setFormLoading(true);
        try {
            await exportService.exportUserHistoryToTXT(userId, userName);
            showAlert('Exportação Finalizada', `O histórico completo de ${userName} foi gerado e o download começou automaticamente!`, 'success');
        } catch (err: any) {
            showAlert('Erro na Exportação', err.message, 'error');
        } finally {
            setFormLoading(false);
        }
    };

    const handleCopyTempUser = () => {
        if (!createdTempUser) return;

        const message = `*Acesso Temporário - Dbarros Rural*\n\n` +
            `Olá! Segue seu acesso de visitante:\n\n` +
            `🔗 *Link:* https://dbarros.vercel.app/#/login\n` +
            `👤 *Usuário:* ${createdTempUser.user.email.replace('@temp.local', '')}\n` +
            `🔑 *Senha:* ${createdTempUser.passwordRaw}\n\n` +
            `📅 *Válido até:* ${new Date(createdTempUser.user.expiresAt!).toLocaleDateString()}\n\n` +
            `Acesse para visualizar e baixar as fotos.`;

        navigator.clipboard.writeText(message);
        showAlert('Sucesso', 'Dados copiados para a área de transferência!', 'success');
    };

    return (
        <Layout title="Gerenciamento de Usuários">
            <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex justify-between items-center w-full sm:w-auto">
                    <p className="text-slate-500 hidden sm:block">Gerencie os usuários do sistema e suas permissões.</p>
                    {/* Botão Voltar Exclusivo Mobile */}
                    <Button onClick={() => window.location.hash = '#/fotos'} className="sm:hidden px-4 py-2 flex-1 flex items-center justify-center text-[11px] font-black uppercase tracking-widest gap-2 shadow-sm text-white">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Voltar ao Início
                    </Button>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" className="flex-1 sm:flex-none justify-center px-3 py-2 text-[10px] sm:text-xs" onClick={() => {
                        setShowTempModal(true);
                        setCreatedTempUser(null);
                        setTempEdicaoId('');
                        setTempExpiresAt('');
                        setExistingTempForEdicao(null);
                        setConfirmCreateAnother(false);
                    }}>
                        Gerar Temp.
                    </Button>
                    <Button className="flex-1 sm:flex-none justify-center px-3 py-2 text-[10px] sm:text-xs" onClick={() => handleOpenForm()}>
                        {showForm ? 'Cancelar' : 'Novo Usuário'}
                    </Button>
                </div>
            </div>

            <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Editar Usuário' : 'Novo Usuário'}>
                <form onSubmit={handleSaveUser} className="space-y-8 pb-2">
                    {formError && (
                        <div className="bg-red-50 text-red-700 p-4 border-l-4 border-red-600 text-[11px] font-black uppercase tracking-widest">
                            {formError}
                        </div>
                    )}

                    {/* Identification Section */}
                    <div className="space-y-5">
                        <div className="flex flex-col md:flex-row gap-5">
                            <div className="flex-1 space-y-1.5 focus-within:text-blue-600 transition-colors">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 inherit">Nome Completo</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required
                                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-blue-600 focus:bg-white text-sm font-bold text-slate-800 p-3 rounded-none outline-none transition-all"
                                    placeholder="Ex: João Silva"
                                />
                            </div>
                            <div className="flex-1 space-y-1.5 focus-within:text-blue-600 transition-colors">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 inherit">Endereço de Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-blue-600 focus:bg-white text-sm font-bold text-slate-800 p-3 rounded-none outline-none transition-all"
                                    placeholder="Ex: joao@email.com"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5 focus-within:text-blue-600 transition-colors">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 inherit">
                                {editingId ? "Credencial de Acesso (Nova Senha)" : "Credencial de Acesso (Senha)"}
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required={!editingId}
                                minLength={4}
                                className="w-full bg-slate-50 border-2 border-slate-200 focus:border-blue-600 focus:bg-white text-sm font-bold text-slate-800 p-3 outline-none transition-all"
                                style={{ borderRadius: '0px' }}
                                placeholder={editingId ? "Deixe em branco para manter a senha atual" : "Mínimo 4 caracteres"}
                            />
                        </div>
                    </div>

                    {/* Role Selection (Asymmetric Grid) */}
                    <div className="space-y-3 pt-4 border-t-2 border-slate-950">
                        <div className="flex justify-between items-end mb-4">
                            <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-900 leading-none">Nível de Acesso</h3>

                            {/* Status Toggle on the right corner */}
                            <label className="group flex items-center cursor-pointer max-w-fit">
                                <div className="relative flex items-center">
                                    <input type="checkbox" className="sr-only" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                                    <div className={`w-10 h-5 transition-colors ${isActive ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                    <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                </div>
                                <span className={`ml-3 text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-green-600' : 'text-slate-400'}`}>
                                    {isActive ? 'Ativo' : 'Inativo'}
                                </span>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <label className={`cursor-pointer p-4 border-2 transition-all relative overflow-hidden ${isAdmin ? 'border-blue-600 bg-blue-50 shadow-[4px_4px_0px_#2563eb] -translate-y-1' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'}`}>
                                <input type="checkbox" className="sr-only" checked={isAdmin} onChange={e => {
                                    setIsAdmin(e.target.checked);
                                    if (e.target.checked) { setIsVisitor(false); setIsProjetista(false); }
                                }} />
                                <div className="flex flex-col gap-1 relative z-10">
                                    <span className={`text-[11px] font-black tracking-widest uppercase ${isAdmin ? 'text-blue-700' : 'text-slate-700'}`}>Super Admin</span>
                                    <span className={`text-[10px] font-bold ${isAdmin ? 'text-blue-600' : 'text-slate-500'}`}>Acesso irrestrito a todo o sistema</span>
                                </div>
                                {isAdmin && <div className="absolute top-0 right-0 w-0 h-0 border-t-[30px] border-l-[30px] border-t-blue-600 border-l-transparent"></div>}
                            </label>

                            <label className={`cursor-pointer p-4 border-2 transition-all relative overflow-hidden ${isProjetista ? 'border-orange-500 bg-orange-50 shadow-[4px_4px_0px_#f97316] -translate-y-1' : 'border-slate-200 bg-white hover:border-orange-300 hover:bg-slate-50'}`}>
                                <input type="checkbox" className="sr-only" checked={isProjetista} onChange={e => {
                                    setIsProjetista(e.target.checked);
                                    if (e.target.checked) { setIsAdmin(false); setIsVisitor(false); setCanManageTags(false); }
                                }} />
                                <div className="flex flex-col gap-1 relative z-10">
                                    <span className={`text-[11px] font-black tracking-widest uppercase ${isProjetista ? 'text-orange-700' : 'text-slate-700'}`}>Usuário</span>
                                    <span className={`text-[10px] font-bold ${isProjetista ? 'text-orange-600/80' : 'text-slate-500'}`}>Gere e edita seus próprios registros</span>
                                </div>
                                {isProjetista && <div className="absolute top-0 right-0 w-0 h-0 border-t-[30px] border-l-[30px] border-t-orange-500 border-l-transparent"></div>}
                            </label>

                            <label className={`cursor-pointer p-4 border-2 transition-all relative overflow-hidden ${isVisitor ? 'border-emerald-500 bg-emerald-50 shadow-[4px_4px_0px_#10b981] -translate-y-1' : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50'}`}>
                                <input type="checkbox" className="sr-only" checked={isVisitor} onChange={e => {
                                    setIsVisitor(e.target.checked);
                                    if (e.target.checked) { setIsAdmin(false); setIsProjetista(false); setCanManageTags(false); }
                                }} />
                                <div className="flex flex-col gap-1 relative z-10">
                                    <span className={`text-[11px] font-black tracking-widest uppercase ${isVisitor ? 'text-emerald-700' : 'text-slate-700'}`}>Visitante</span>
                                    <span className={`text-[10px] font-bold ${isVisitor ? 'text-emerald-600/80' : 'text-slate-500'}`}>Apenas visualiza e exporta PDF</span>
                                </div>
                                {isVisitor && <div className="absolute top-0 right-0 w-0 h-0 border-t-[30px] border-l-[30px] border-t-emerald-500 border-l-transparent"></div>}
                            </label>
                        </div>

                        {/* Sub-permissions conditionally rendered */}
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isAdmin ? 'max-h-24 opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}`}>
                            <label className="flex items-center space-x-3 cursor-pointer p-3 bg-indigo-50 border-2 border-indigo-200 hover:border-indigo-400 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={canManageTags}
                                    onChange={e => setCanManageTags(e.target.checked)}
                                    className="w-5 h-5 text-indigo-600 rounded-none border-indigo-300 focus:ring-indigo-500 bg-white"
                                />
                                <div className="flex flex-col">
                                    <span className="text-indigo-900 text-[10px] font-black uppercase tracking-widest">Master / Diretor (Hierarquia Estendida)</span>
                                    <span className="text-indigo-700/80 text-[10px] font-bold">Pode criar, editar e excluir Categorias e Tags Globais do sistema.</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 pt-6 mt-8">
                        <div className="w-full sm:w-auto">
                            {editingId && currentUser?.id !== editingId && (
                                <button
                                    type="button"
                                    className="w-full sm:w-auto px-6 py-3 bg-white text-red-600 border-2 border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600 text-[10px] font-black uppercase tracking-widest transition-all"
                                    onClick={() => {
                                        handleDeleteUser(editingId);
                                        setShowForm(false);
                                    }}
                                >
                                    Excluir Definitivamente
                                </button>
                            )}
                        </div>
                        <div className="flex w-full sm:w-auto gap-3">
                            <button type="button" className="flex-1 sm:flex-none px-6 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 text-[10px] font-black uppercase tracking-widest transition-colors border-2 border-transparent" onClick={() => setShowForm(false)}>
                                Cancelar
                            </button>
                            <button type="submit" disabled={formLoading} className="flex-1 sm:flex-none px-8 py-3 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest transition-all shadow-[4px_4px_0px_#1e3a8a] active:translate-y-1 active:translate-x-1 active:shadow-none border-2 border-transparent hover:border-blue-900">
                                {formLoading ? 'Salvando...' : 'Gravar Perfil'}
                            </button>
                        </div>
                    </div>

                    {editingId && (
                        <div className="mt-4 pt-4 border-t-2 border-slate-100">
                            <Button
                                type="button"
                                onClick={() => handleExportTXT(editingId, name)}
                                disabled={formLoading}
                                className="w-full py-4 bg-slate-50 text-slate-600 hover:bg-slate-100 border-2 border-slate-200 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Exportar Dados para IA (TXT)
                            </Button>
                        </div>
                    )}
                </form>
            </Modal>

            <Card className="overflow-hidden border-slate-200 shadow-xl shadow-slate-200/50">
                <div className="overflow-x-auto">
                    {/* Desktop Table View */}
                    <table className="hidden md:table w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-4 py-3 font-black text-[10px] text-slate-500 uppercase tracking-widest">Nome</th>
                                <th className="px-4 py-3 font-black text-[10px] text-slate-500 uppercase tracking-widest">Email</th>
                                <th className="px-4 py-3 font-black text-[10px] text-slate-500 uppercase tracking-widest">Status</th>
                                <th className="px-4 py-3 font-black text-[10px] text-slate-500 uppercase tracking-widest">Função</th>
                                <th className="px-4 py-3 font-black text-[10px] text-slate-500 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Carregando...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum usuário encontrado.</td></tr>
                            ) : (
                                users.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 group">
                                        <td className="px-4 py-3 font-bold text-sm text-slate-800">
                                            {user.name}
                                            {user.isTemp && <span className="ml-2 text-[9px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full font-black">TEMP</span>}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 text-sm font-medium">{user.email}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black w-fit uppercase tracking-tighter ${user.isActive !== false
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {user.isActive !== false ? 'Ativo' : 'Inativo'}
                                                </span>
                                                {user.expiresAt && (
                                                    <span className="text-[9px] text-slate-400 mt-0.5 font-bold uppercase tracking-tighter">
                                                        Vence: {new Date(user.expiresAt).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="flex flex-wrap gap-1">
                                                {user.isAdmin && user.canManageTags && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700 uppercase tracking-tighter">Master</span>
                                                )}
                                                {user.isAdmin && !user.canManageTags && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700 uppercase tracking-tighter">Admin</span>
                                                )}
                                                {user.isProjetista && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-700 uppercase tracking-tighter">Usuário</span>
                                                )}
                                                {user.isVisitor && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 uppercase tracking-tighter">Visitante</span>
                                                )}
                                                {!user.isAdmin && !user.isVisitor && !user.isProjetista && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 uppercase tracking-tighter">Usuário</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex gap-1.5 justify-end transition-opacity">
                                                {!user.isVisitor && (
                                                    <Button
                                                        className="px-2.5 py-1 text-[10px] font-black h-auto bg-blue-600 text-white border-2 border-blue-600 hover:bg-blue-700 hover:border-blue-700 uppercase tracking-wider transition-all shadow-sm"
                                                        onClick={() => handleOpenForm(user)}
                                                    >
                                                        Editar
                                                    </Button>
                                                )}
                                                {user.isVisitor && user.isActive !== false && (
                                                    <Button
                                                        className="px-2.5 py-1 text-[10px] font-bold h-auto bg-red-100 text-red-700 border-red-200 hover:bg-red-200 hover:text-red-800 uppercase tracking-wider"
                                                        onClick={() => {
                                                            showAlert('Encerrar Acesso', `Encerrar acesso de "${user.name}"? Ele sairá da lista imediatamente e não poderá mais entrar.`, 'confirm', async () => {
                                                                try {
                                                                    await authService.terminateTempUser(user.id);
                                                                    await fetchUsers();
                                                                } catch (e: any) {
                                                                    showAlert('Erro Operacional', 'Erro ao encerrar usuário: ' + e.message, 'error');
                                                                }
                                                            });
                                                        }}
                                                    >
                                                        Parar
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Mobile Stacked Data Cards View */}
                    <div className="md:hidden flex flex-col divide-y divide-slate-100 bg-white">
                        {loading ? (
                            <div className="p-8 text-center text-slate-500 font-bold text-sm">Carregando...</div>
                        ) : users.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 font-bold text-sm">Nenhum usuário encontrado.</div>
                        ) : (
                            users.map(user => (
                                <div key={user.id} className="flex flex-col p-4 gap-3 bg-white w-full">
                                    {/* Cabecalho do Card Mobile */}
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 pr-2">
                                            <div className="font-black text-sm text-slate-800 flex items-center flex-wrap gap-1.5">
                                                {user.name}
                                                {user.isTemp && <span className="text-[8px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-sm font-black tracking-widest">TEMP</span>}
                                            </div>
                                            <div className="text-slate-500 text-xs font-medium mt-0.5 break-all">{user.email}</div>
                                        </div>
                                        <div className="flex flex-col items-end text-right shrink-0">
                                            <span className={`px-2 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-widest ${user.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {user.isActive !== false ? 'Ativo' : 'Inativo'}
                                            </span>
                                            {user.expiresAt && (
                                                <span className="text-[8px] text-slate-400 mt-1 font-bold uppercase tracking-widest">
                                                    Vence: {new Date(user.expiresAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Funcoes / Roles */}
                                    <div className="flex flex-wrap gap-1.5 w-full">
                                        {user.isAdmin && user.canManageTags && <span className="px-2 py-0.5 rounded-sm text-[9px] font-black bg-purple-100 text-purple-700 uppercase tracking-widest">Master</span>}
                                        {user.isAdmin && !user.canManageTags && <span className="px-2 py-0.5 rounded-sm text-[9px] font-black bg-indigo-100 text-indigo-700 uppercase tracking-widest">Admin</span>}
                                        {user.isProjetista && <span className="px-2 py-0.5 rounded-sm text-[9px] font-black bg-orange-100 text-orange-700 uppercase tracking-widest">Usuário</span>}
                                        {user.isVisitor && <span className="px-2 py-0.5 rounded-sm text-[9px] font-black bg-blue-100 text-blue-700 uppercase tracking-widest">Visitante</span>}
                                        {!user.isAdmin && !user.isVisitor && !user.isProjetista && <span className="px-2 py-0.5 rounded-sm text-[9px] font-black bg-slate-100 text-slate-700 uppercase tracking-widest">Usuário</span>}
                                    </div>

                                    {/* Action Buttons - Full Width na horizontal */}
                                    <div className="flex gap-2 w-full mt-2">
                                        {!user.isVisitor && (
                                            <Button
                                                className="flex-1 py-2.5 text-[10px] shadow-md shadow-blue-500/10 font-black h-auto bg-blue-600 text-white border border-blue-600 uppercase tracking-widest transition-all flex items-center justify-center"
                                                onClick={() => handleOpenForm(user)}
                                            >
                                                Editar
                                            </Button>
                                        )}
                                        {user.isVisitor && user.isActive !== false && (
                                            <Button
                                                className="flex-1 py-2.5 text-[10px] shadow-sm font-black h-auto bg-red-50 text-red-600 border border-red-200 uppercase tracking-widest flex items-center justify-center"
                                                onClick={() => {
                                                    showAlert('Encerrar Acesso', `Encerrar acesso de "${user.name}"? Ele sairá da lista imediatamente e não poderá mais entrar.`, 'confirm', async () => {
                                                        try {
                                                            await authService.terminateTempUser(user.id);
                                                            await fetchUsers();
                                                        } catch (e: any) {
                                                            showAlert('Erro Operacional', 'Erro ao encerrar usuário: ' + e.message, 'error');
                                                        }
                                                    });
                                                }}
                                            >
                                                Parar
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Card>

            {/* Modal de Usuário Temporário */}
            <Modal isOpen={showTempModal} onClose={() => { setShowTempModal(false); setTempEdicaoId(''); setTempExpiresAt(''); setCreatedTempUser(null); setExistingTempForEdicao(null); setConfirmCreateAnother(false); }} title="Acesso Temporário">
                {createdTempUser ? (
                    <div className="space-y-6">
                        {/* Header Minimalista */}
                        <div className="pb-4 border-b border-slate-100">
                            <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-900 leading-tight">
                                Acesso Criado com Sucesso
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                                Compartilhe as credenciais abaixo com o visitante.
                            </p>
                        </div>

                        {/* Credenciais Individuais */}
                        <div className="grid grid-cols-1 gap-3">
                            {/* Login */}
                            <div className="group relative">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Login de Acesso</label>
                                <div className="flex bg-slate-50 border-2 border-slate-200 focus-within:border-slate-400 transition-all p-1">
                                    <code className="flex-1 px-3 py-2 text-sm font-black text-slate-800 break-all select-all">
                                        {createdTempUser.user.email.replace('@temp.local', '')}
                                    </code>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(createdTempUser.user.email.replace('@temp.local', ''));
                                            showAlert('Sucesso', 'Login copiado!', 'success');
                                        }}
                                        className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
                                        title="Copiar login"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Senha */}
                            <div className="group relative">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Senha Temporária</label>
                                <div className="flex bg-slate-50 border-2 border-slate-200 focus-within:border-slate-400 transition-all p-1">
                                    <code className="flex-1 px-3 py-2 text-sm font-black text-slate-800 tracking-wider select-all">
                                        {createdTempUser.passwordRaw}
                                    </code>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(createdTempUser.passwordRaw);
                                            showAlert('Sucesso', 'Senha copiada!', 'success');
                                        }}
                                        className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
                                        title="Copiar senha"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Grid Validade + Site */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-amber-50 border-2 border-amber-100 p-3 flex flex-col justify-center">
                                <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-0.5">Expira em</span>
                                <span className="text-sm font-black text-amber-900 uppercase">
                                    {new Date(createdTempUser.user.expiresAt!).toLocaleDateString('pt-BR')}
                                </span>
                            </div>
                            <div className="bg-blue-50 border-2 border-blue-100 p-3 flex flex-col justify-center">
                                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-0.5">Endereço de Acesso</span>
                                <span className="text-[11px] font-black text-blue-800 leading-none">
                                    dbarros.vercel.app
                                </span>
                            </div>
                        </div>

                        {/* Botões de Ação Final */}
                        <div className="flex flex-col gap-2 pt-2">
                            <button
                                onClick={handleCopyTempUser}
                                className="w-full py-4 bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest hover:bg-slate-950 transition-all flex items-center justify-center gap-3 shadow-lg shadow-slate-200"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Copiar tudo (WhatsApp)
                            </button>
                            <button
                                onClick={() => setShowTempModal(false)}
                                className="w-full py-3 bg-white text-slate-500 hover:text-slate-800 text-[10px] font-black uppercase tracking-widest transition-colors"
                            >
                                Fechar Janela
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-5">
                        <p className="text-slate-500 text-sm">
                            Visitante temporário com acesso <strong>somente leitura</strong> à planilha e atendimentos de uma edição.
                        </p>

                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Edição do Evento</label>
                            <select
                                value={tempEdicaoId}
                                onChange={e => {
                                    const id = e.target.value;
                                    setTempEdicaoId(id);
                                    setConfirmCreateAnother(false);
                                    if (id) {
                                        const found = users.find((u: User) =>
                                            u.isVisitor &&
                                            u.isActive !== false &&
                                            u.edicaoId === id &&
                                            (!u.expiresAt || new Date(u.expiresAt) >= new Date())
                                        ) ?? null;
                                        setExistingTempForEdicao(found);
                                    } else {
                                        setExistingTempForEdicao(null);
                                    }
                                }}
                                className="w-full bg-slate-50 border-2 border-slate-200 focus:border-blue-600 text-sm font-bold text-slate-800 p-3 rounded-none outline-none transition-all"
                            >
                                <option value="">Selecione uma edição...</option>
                                {edicoesAtivas.map(ed => {
                                    const fmtData = (d: string | null) => {
                                        if (!d) return '';
                                        const dt = new Date(d);
                                        return `${String(dt.getUTCDate()).padStart(2, '0')}/${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
                                    };
                                    const periodo = ed.data_inicio
                                        ? ed.data_fim
                                            ? ` · ${fmtData(ed.data_inicio)}–${fmtData(ed.data_fim)}`
                                            : ` · ${fmtData(ed.data_inicio)}`
                                        : '';
                                    return (
                                        <option key={ed.id} value={ed.id}>{ed.titulo}{periodo}</option>
                                    );
                                })}
                            </select>
                        </div>

                        {/* Aviso: já existe visitante ativo para esta edição */}
                        {existingTempForEdicao && !confirmCreateAnother && (
                            <div className="border-2 border-amber-300 bg-amber-50 p-4 space-y-4">
                                {/* Cabeçalho do aviso */}
                                <div className="flex items-start gap-2">
                                    <span className="text-amber-500 text-lg leading-none flex-shrink-0">⚠️</span>
                                    <div>
                                        <p className="text-xs font-black text-amber-800 uppercase tracking-wide">Já existe um visitante ativo para esta edição</p>
                                        <p className="text-[11px] text-amber-700 mt-0.5">O acesso abaixo já foi gerado anteriormente e ainda está válido.</p>
                                    </div>
                                </div>

                                {/* Credenciais */}
                                <div className="bg-white border border-amber-200 p-3 space-y-2 text-xs font-mono">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 font-sans font-bold uppercase text-[10px]">Usuário:</span>
                                        <div className="flex items-center gap-2">
                                            <code className="text-slate-800 font-black">{existingTempForEdicao.email.replace('@temp.local', '')}</code>
                                            <button onClick={() => { navigator.clipboard.writeText(existingTempForEdicao.email.replace('@temp.local', '')); showAlert('Copiado', 'Login copiado!', 'success'); }} className="text-[10px] text-blue-600 hover:underline font-sans">Copiar</button>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 font-sans font-bold uppercase text-[10px]">Senha:</span>
                                        <div className="flex items-center gap-2">
                                            {existingTempForEdicao.tempPasswordPlain ? (
                                                <>
                                                    <code className="text-slate-800 font-black tracking-wider">{existingTempForEdicao.tempPasswordPlain}</code>
                                                    <button onClick={() => { navigator.clipboard.writeText(existingTempForEdicao.tempPasswordPlain!); showAlert('Copiado', 'Senha copiada!', 'success'); }} className="text-[10px] text-blue-600 hover:underline font-sans">Copiar</button>
                                                </>
                                            ) : (
                                                <span className="text-slate-400 italic font-sans text-[10px]">não disponível — crie novo acesso</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 font-sans font-bold uppercase text-[10px]">Expira em:</span>
                                        <code className="text-amber-700 font-black">{existingTempForEdicao.expiresAt ? new Date(existingTempForEdicao.expiresAt).toLocaleDateString('pt-BR') : '—'}</code>
                                    </div>
                                </div>

                                {/* Botão principal: copiar tudo */}
                                <div className="space-y-1">
                                    <button
                                        onClick={() => {
                                            const login = existingTempForEdicao.email.replace('@temp.local', '');
                                            const senha = existingTempForEdicao.tempPasswordPlain ?? '(não disponível)';
                                            const expira = existingTempForEdicao.expiresAt ? new Date(existingTempForEdicao.expiresAt).toLocaleDateString('pt-BR') : '—';
                                            const edicaoNome = edicoesAtivas.find(e => e.id === tempEdicaoId)?.titulo ?? '';
                                            const msg = `*Acesso Temporário - Dbarros Rural*\n\nOlá! Segue seu acesso de visitante para *${edicaoNome}*:\n\n🔗 *Link:* https://dbarros.vercel.app/#/login\n👤 *Usuário:* ${login}\n🔑 *Senha:* ${senha}\n\n📅 *Válido até:* ${expira}\n\nAcesse para visualizar a planilha e atendimentos.`;
                                            navigator.clipboard.writeText(msg);
                                            showAlert('Copiado!', 'Texto copiado. Abra o WhatsApp e cole (Ctrl+V ou segurar e Colar).', 'success');
                                        }}
                                        className="w-full flex items-center justify-center gap-2 py-3 text-xs font-black text-white bg-slate-800 hover:bg-slate-950 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        Copiar texto para WhatsApp
                                    </button>
                                    <p className="text-[10px] text-slate-500 text-center">Clique para copiar. Depois abra o WhatsApp e cole a mensagem pronta.</p>
                                </div>

                                {/* Ações secundárias */}
                                <div className="border-t border-amber-200 pt-3 space-y-2">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Ou escolha outra ação:</p>
                                    <div className="flex gap-2 flex-wrap">
                                        <button onClick={() => { setExistingTempForEdicao(null); setTempEdicaoId(''); }} className="flex-1 text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 border border-slate-300 hover:border-slate-500 transition-colors text-center">
                                            OK, entendido
                                        </button>
                                        <button onClick={() => setConfirmCreateAnother(true)} className="flex-1 text-xs font-black text-white bg-amber-500 hover:bg-amber-600 px-3 py-2 transition-colors text-center">
                                            Gerar novo acesso
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 text-center">"Gerar novo acesso" cria um segundo visitante — o anterior continua ativo.</p>
                                </div>
                            </div>
                        )}

                        {/* Formulário de data — só aparece se não há conflito ou usuário confirmou criar outro */}
                        {(!existingTempForEdicao || confirmCreateAnother) && tempEdicaoId && (
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Data Limite de Acesso</label>
                                <input
                                    type="date"
                                    value={tempExpiresAt}
                                    onChange={e => setTempExpiresAt(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-blue-600 text-sm font-bold text-slate-800 p-3 rounded-none outline-none transition-all"
                                />
                            </div>
                        )}

                        <div className="pt-2 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setShowTempModal(false)}>Cancelar</Button>
                            {(!existingTempForEdicao || confirmCreateAnother) && (
                                <Button
                                    onClick={handleCreateTempUser}
                                    disabled={formLoading || !tempExpiresAt || !tempEdicaoId}
                                    className="px-8"
                                >
                                    {formLoading ? 'Gerando...' : 'Gerar Acesso'}
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
            <AlertModal
                {...alertState}
                onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
            />
        </Layout>
    );
};

export default Users;
