import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, Button, Input, Modal } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { authService, User } from '../services/authService';

const Users: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Temp User State
    const [showTempModal, setShowTempModal] = useState(false);
    const [tempDays, setTempDays] = useState(1);
    const [createdTempUser, setCreatedTempUser] = useState<{ user: User, passwordRaw: string } | null>(null);

    // Form state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [isVisitor, setIsVisitor] = useState(false);
    const [isActive, setIsActive] = useState(true);
    const [formError, setFormError] = useState('');
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const data = await authService.getAllUsers();
            // Filter out expired/inactive temp users from the view
            const activeUsers = data.filter(u => {
                if (!u.isTemp) return true; // Regular users always show

                // Temp users: show if active AND (not expired OR expires in future)
                if (u.isActive === false) return false;
                if (u.expiresAt && new Date(u.expiresAt) < new Date()) return false;

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
                    password: password || undefined
                });
            } else {
                // Create new user
                if (!password) {
                    throw new Error('Senha é obrigatória para novos usuários');
                }
                await authService.register(name, email, password, isAdmin, isVisitor);
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
        setFormLoading(true);
        try {
            const result = await authService.createTempUser(tempDays);
            setCreatedTempUser(result);
            await fetchUsers();
        } catch (err: any) {
            alert('Erro ao criar usuário temporário: ' + err.message);
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

    const handleCopyTempUser = () => {
        if (!createdTempUser) return;

        const message = `*Acesso Temporário - Galeria de Fotos*\n\n` +
            `Olá! Segue seu acesso de visitante:\n\n` +
            `🔗 *Link:* https://galeria-de-fotos-one-delta.vercel.app/#/login\n` +
            `👤 *Usuário:* ${createdTempUser.user.name}\n` +
            `🔑 *Senha:* ${createdTempUser.passwordRaw}\n\n` +
            `📅 *Válido até:* ${new Date(createdTempUser.user.expiresAt!).toLocaleDateString()}\n\n` +
            `Acesse para visualizar e baixar as fotos.`;

        navigator.clipboard.writeText(message);
        alert('Dados copiados para a área de transferência!');
    };

    return (
        <Layout title="Gerenciamento de Usuários">
            <div className="mb-6 flex justify-between items-center">
                <p className="text-slate-500">Gerencie os usuários do sistema e suas permissões.</p>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setShowTempModal(true); setCreatedTempUser(null); }}>
                        Gerar Temporário
                    </Button>
                    <Button onClick={() => handleOpenForm()}>
                        {showForm ? 'Cancelar' : 'Novo Usuário'}
                    </Button>
                </div>
            </div>

            {showForm && (
                <Card className="mb-8 p-6 animate-fade-in bg-white border border-blue-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">
                        {editingId ? 'Editar Usuário' : 'Adicionar Novo Usuário'}
                    </h3>
                    <form onSubmit={handleSaveUser} className="space-y-4">
                        {formError && (
                            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                                {formError}
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Nome"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                            <Input
                                label="Email"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                            <Input
                                label={editingId ? "Senha (deixe em branco para manter)" : "Senha"}
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required={!editingId}
                                minLength={4}
                            />
                            <div className="flex flex-col justify-center space-y-3 pt-6">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isAdmin}
                                        onChange={e => setIsAdmin(e.target.checked)}
                                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="text-slate-700 font-medium">Conta de Administrador</span>
                                </label>

                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isVisitor}
                                        onChange={e => setIsVisitor(e.target.checked)}
                                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="text-slate-700 font-medium">Visitante (Apenas Leitura + PDF)</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isActive}
                                        onChange={e => setIsActive(e.target.checked)}
                                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className={`font-medium ${isActive ? 'text-green-600' : 'text-red-500'}`}>
                                        {isActive ? 'Usuário Ativo' : 'Usuário Inativo (Sem acesso)'}
                                    </span>
                                </label>
                            </div>
                        </div>
                        <div className="flex justify-end pt-2 space-x-3">
                            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={formLoading}>
                                {formLoading ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Criar Usuário')}
                            </Button>
                        </div>
                    </form>
                </Card >
            )}

            <Card className="overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-4 py-2 font-black text-xs text-slate-500 uppercase tracking-widest">Nome</th>
                            <th className="px-4 py-2 font-black text-xs text-slate-500 uppercase tracking-widest">Email</th>
                            <th className="px-4 py-2 font-black text-xs text-slate-500 uppercase tracking-widest">Status</th>
                            <th className="px-4 py-2 font-black text-xs text-slate-500 uppercase tracking-widest">Função</th>
                            <th className="px-4 py-2 font-black text-xs text-slate-500 uppercase tracking-widest text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">Carregando...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum usuário encontrado.</td></tr>
                        ) : (
                            users.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                                    <td className="px-4 py-2.5 font-bold text-sm text-slate-800">
                                        {user.name}
                                        {user.isTemp && <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full font-black">TEMP</span>}
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-600 text-sm font-medium">{user.email}</td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex flex-col">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-black w-fit uppercase tracking-tighter ${user.isActive !== false
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                                }`}>
                                                {user.isActive !== false ? 'Ativo' : 'Inativo'}
                                            </span>
                                            {user.expiresAt && (
                                                <span className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-tighter">
                                                    Vence: {new Date(user.expiresAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex flex-wrap gap-1">
                                            {user.isAdmin && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-700 uppercase tracking-tighter">Admin</span>
                                            )}
                                            {user.isVisitor && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-700 uppercase tracking-tighter">Visitante</span>
                                            )}
                                            {!user.isAdmin && !user.isVisitor && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-700 uppercase tracking-tighter">Usuário</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                        <div className="flex gap-1.5 justify-end">
                                            <Button
                                                className="px-2.5 py-0.5 text-xs font-black h-auto bg-blue-600 text-white border-2 border-blue-600 hover:bg-blue-700 hover:border-blue-700 uppercase tracking-wider transition-all shadow-sm"
                                                onClick={() => handleOpenForm(user)}
                                            >
                                                Editar
                                            </Button>
                                            {user.isTemp && user.isActive !== false && (
                                                <Button
                                                    className="px-2.5 py-0.5 text-xs font-bold h-auto bg-red-100 text-red-700 border-red-200 hover:bg-red-200 hover:text-red-800 uppercase tracking-wider"
                                                    onClick={async () => {
                                                        if (confirm('Tem certeza que deseja encerrar o acesso deste usuário temporário imediatamente?')) { // Using native confirm for speed/simplicity as requested "immediate"
                                                            try {
                                                                await authService.terminateTempUser(user.id);
                                                                await fetchUsers(); // Refresh list (will hide expired based on filter)
                                                            } catch (e: any) {
                                                                alert('Erro ao encerrar usuário: ' + e.message);
                                                            }
                                                        }
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
            </Card>

            {/* Modal de Usuário Temporário */}
            <Modal isOpen={showTempModal} onClose={() => setShowTempModal(false)} title="Gerar Usuário Temporário">
                {createdTempUser ? (
                    <div className="space-y-6">
                        <div className="bg-green-50 p-4 rounded-xl border border-green-200 text-center">
                            <h4 className="text-lg font-bold text-green-800 mb-2">Usuário Criado com Sucesso!</h4>
                            <p className="text-green-700 text-sm mb-4">Envie os dados abaixo para o visitante.</p>

                            <div className="bg-white p-4 rounded-lg border border-green-100 text-left space-y-3 shadow-sm">
                                <div>
                                    <span className="block text-xs font-bold text-slate-400 uppercase">Link de Acesso</span>
                                    <code className="block bg-slate-50 p-2 rounded text-blue-600 text-sm break-all select-all">
                                        https://galeria-de-fotos-one-delta.vercel.app/#/login
                                    </code>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="block text-xs font-bold text-slate-400 uppercase">Usuário / Email</span>
                                        <code className="block bg-slate-50 p-2 rounded text-slate-800 font-bold select-all">
                                            {createdTempUser.user.name}
                                        </code>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-bold text-slate-400 uppercase">Senha</span>
                                        <code className="block bg-slate-50 p-2 rounded text-slate-800 font-bold select-all">
                                            {createdTempUser.passwordRaw}
                                        </code>
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-xs font-bold text-slate-400 uppercase">Validade</span>
                                    <span className="text-slate-600 text-sm">
                                        {tempDays} dias (até {new Date(createdTempUser.user.expiresAt!).toLocaleDateString()})
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button onClick={handleCopyTempUser} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg transform hover:-translate-y-0.5 transition-all">
                                📋 Copiar para WhatsApp / Email
                            </Button>
                            <Button variant="outline" onClick={() => setShowTempModal(false)} className="w-1/3 py-3">Fechar</Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <p className="text-slate-600">
                            Gere um usuário temporário que expirará automaticamente após o período selecionado.
                            Este usuário terá permissões de <strong>Visitante</strong>.
                        </p>

                        <div className="space-y-3">
                            <label className="block text-sm font-bold text-slate-700">Duração do Acesso (Dias)</label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 5, 7].map(days => (
                                    <button
                                        key={days}
                                        onClick={() => setTempDays(days)}
                                        className={`flex-1 py-2 rounded-lg border font-bold transition-all ${tempDays === days
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                                            }`}
                                    >
                                        {days} {days === 1 ? 'Dia' : 'Dias'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setShowTempModal(false)}>Cancelar</Button>
                            <Button onClick={handleCreateTempUser} disabled={formLoading} className="px-8">
                                {formLoading ? 'Gerando...' : 'Gerar Acesso'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </Layout >
    );
};


export default Users;
