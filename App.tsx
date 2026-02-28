
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Users from './pages/Users';
import { useAuth } from './context/AuthContext';
import { PresenceProvider } from './context/PresenceContext';
import Photos from './pages/Photos';
import Tags from './pages/Tags';
import CadastroCliente from './pages/CadastroCliente';

import Clientes from './pages/Clientes';
import Eventos from './pages/Eventos';
import CadastroEvento from './pages/CadastroEvento';
import TempPlanilha from './pages/TempPlanilha';
import ConfiguracaoVendas from './pages/ConfiguracaoVendas';
import ItensOpcionais from './pages/ItensOpcionais';
import Dashboard from './pages/Dashboard';
import Atendimentos from './pages/Atendimentos';
import Tarefas from './pages/Tarefas';
import ControleImagens from './pages/ControleImagens';
import TodosEventos from './pages/TodosEventos';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Carregando...</div>;
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <PresenceProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/usuarios" element={<ProtectedRoute><Users /></ProtectedRoute>} />

        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

        <Route path="/fotos" element={<ProtectedRoute><Photos /></ProtectedRoute>} />
        {/* Novas rotas de clientes */}
        <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
        <Route path="/clientes/novo" element={<ProtectedRoute><CadastroCliente /></ProtectedRoute>} />
        <Route path="/clientes/editar/:id" element={<ProtectedRoute><CadastroCliente /></ProtectedRoute>} />

        <Route path="/eventos" element={<ProtectedRoute><Eventos /></ProtectedRoute>} />
        <Route path="/eventos/novo" element={<ProtectedRoute><CadastroEvento /></ProtectedRoute>} />
        <Route path="/eventos/editar/:id" element={<ProtectedRoute><CadastroEvento /></ProtectedRoute>} />

        <Route path="/planilha-vendas/:edicaoId" element={<ProtectedRoute><TempPlanilha /></ProtectedRoute>} />
        <Route path="/configuracao-vendas/:edicaoId" element={<ProtectedRoute><ConfiguracaoVendas /></ProtectedRoute>} />
        <Route path="/atendimentos/:edicaoId" element={<ProtectedRoute><Atendimentos /></ProtectedRoute>} />
        <Route path="/controle-imagens" element={<ProtectedRoute><ControleImagens /></ProtectedRoute>} />
        <Route path="/itens-opcionais" element={<ProtectedRoute><ItensOpcionais /></ProtectedRoute>} />

        <Route path="/todos-eventos" element={<ProtectedRoute><TodosEventos /></ProtectedRoute>} />
        <Route path="/tarefas" element={<ProtectedRoute><Tarefas /></ProtectedRoute>} />

        <Route path="/tags" element={<ProtectedRoute><Tags /></ProtectedRoute>} />

        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
      </PresenceProvider>
    </HashRouter>
  );
};

export default App;
