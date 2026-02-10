
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Plans from './pages/Plans';
import Subscriptions from './pages/Subscriptions';
import Payments from './pages/Payments';
import Photos from './pages/Photos';
import Tags from './pages/Tags';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuth = localStorage.getItem('subcontrol_auth') === 'true';
  return isAuth ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/clientes" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
        <Route path="/planos" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
        <Route path="/assinaturas" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
        <Route path="/pagamentos" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
        <Route path="/fotos" element={<ProtectedRoute><Photos /></ProtectedRoute>} />
        <Route path="/tags" element={<ProtectedRoute><Tags /></ProtectedRoute>} />

        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
