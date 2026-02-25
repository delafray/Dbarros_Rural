
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Users from './pages/Users';
import { useAuth } from './context/AuthContext';
import Photos from './pages/Photos';
import Tags from './pages/Tags';
import CadastroCliente from './pages/CadastroCliente';

import Clientes from './pages/Clientes';
import Eventos from './pages/Eventos';
import CadastroEvento from './pages/CadastroEvento';
import TempPlanilha from './pages/TempPlanilha';
import ConfiguracaoVendas from './pages/ConfiguracaoVendas';
import ItensOpcionais from './pages/ItensOpcionais';

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
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/usuarios" element={<ProtectedRoute><Users /></ProtectedRoute>} />

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
        <Route path="/itens-opcionais" element={<ProtectedRoute><ItensOpcionais /></ProtectedRoute>} />

        <Route path="/tags" element={<ProtectedRoute><Tags /></ProtectedRoute>} />

        <Route path="/" element={<Navigate to="/fotos" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
