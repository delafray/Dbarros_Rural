import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, Button, Input } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { authService, User } from '../services/authService';

const Users: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

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
            setUsers(data);
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
            setIsVisitor(user.isVisitor);
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

    return (
        <Layout title="Gerenciamento de Usuários">
            <div className="mb-6 flex justify-between items-center">
                <p className="text-slate-500">Gerencie os usuários do sistema e suas permissões.</p>
                <Button onClick={() => handleOpenForm()}>
                    {showForm ? 'Cancelar' : 'Novo Usuário'}
                </Button>
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
                </Card>
    )
}

<Card className="overflow-hidden">
    <table className="w-full text-left border-collapse">
        <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-semibold text-slate-600">Nome</th>
                <th className="p-4 font-semibold text-slate-600">Email</th>
                <th className="p-4 font-semibold text-slate-600">Status</th>
                <th className="p-4 font-semibold text-slate-600">Função</th>
                <th className="p-4 font-semibold text-slate-600">Ações</th>
            </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
            {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Carregando...</td></tr>
            ) : users.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum usuário encontrado.</td></tr>
            ) : (
                users.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-medium text-slate-800">{user.name}</td>
                        <td className="p-4 text-slate-600">{user.email}</td>
                        <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.isActive !== false
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                                }`}>
                                {user.isActive !== false ? 'Ativo' : 'Inativo'}
                            </span>
                        </td>
                        <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                                {user.isAdmin && (
                                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">Admin</span>
                                )}
                                {user.isVisitor && (
                                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">Visitante</span>
                                )}
                                {!user.isAdmin && !user.isVisitor && (
                                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">Usuário</span>
                                )}
                            </div>
                        </td>
                        <td className="p-4">
                            <Button
                                variant="outline"
                                className="px-3 py-1 text-sm h-auto"
                                onClick={() => handleOpenForm(user)}
                            >
                                Editar
                            </Button>
                        </td>
                    </tr>
                ))
            )}
        </tbody>
    </table>
</Card>
        </Layout >
    );
};

export default Users;
