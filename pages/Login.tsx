import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card } from '../components/UI';

const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, user } = useAuth();

  React.useEffect(() => {
    if (user) {
      navigate('/fotos');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Only show initial loading if we don't have a user yet
    setError('');

    const trimmedIdentifier = identifier.trim();
    const trimmedPassword = password.trim();

    try {
      await login(trimmedIdentifier, trimmedPassword);
      navigate('/fotos');
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <img
          src="assets/logo.jpg"
          alt="Logo Galeria de Fotos"
          className="w-24 h-24 object-contain mx-auto mb-4 rounded-2xl shadow-lg"
        />
        <h1 className="text-3xl font-bold text-slate-900">Galeria de Fotos</h1>
      </div>

      <Card className="w-full max-w-md p-8">
        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Input
            label="Email ou Nome de Usuário"
            type="text"
            name="username"
            placeholder="admin"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            required
          />
          <Input
            label="Senha"
            type="password"
            name="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <Button
            type="submit"
            className="w-full py-3 text-lg"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar na plataforma'}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-400">
            Acesso restrito a usuários autorizados.
          </p>
        </div>
      </Card>

      <p className="mt-8 text-sm text-slate-400">
        &copy; {new Date().getFullYear()} Galeria de Fotos. Todos os direitos reservados.
      </p>
    </div >
  );
};

export default Login;
