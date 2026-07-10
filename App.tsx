
import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { useAuth } from './context/AuthContext';
import { PresenceProvider } from './context/PresenceContext';

// Code splitting: cada rota vira um chunk carregado sob demanda.
// Login e Dashboard ficam estáticos (são as portas de entrada do app);
// o resto só é baixado quando o usuário navega até lá.
const Users = lazy(() => import('./pages/Users'));
const Photos = lazy(() => import('./pages/Photos'));
const Tags = lazy(() => import('./pages/Tags'));
const CadastroCliente = lazy(() => import('./pages/CadastroCliente'));
const Clientes = lazy(() => import('./pages/Clientes'));
const Eventos = lazy(() => import('./pages/Eventos'));
const CadastroEvento = lazy(() => import('./pages/CadastroEvento'));
const TempPlanilha = lazy(() => import('./pages/TempPlanilha'));
const ConfiguracaoVendas = lazy(() => import('./pages/ConfiguracaoVendas'));
const PlanilhaAreaLivre = lazy(() => import('./pages/PlanilhaAreaLivre'));
const ItensOpcionais = lazy(() => import('./pages/ItensOpcionais'));
const Atendimentos = lazy(() => import('./pages/Atendimentos'));
const Tarefas = lazy(() => import('./pages/Tarefas'));
const ControleImagens = lazy(() => import('./pages/ControleImagens'));
const TodosEventos = lazy(() => import('./pages/TodosEventos'));
const CardapioProjetos = lazy(() => import('./pages/CardapioProjetos'));
const CardapioProjeto = lazy(() => import('./pages/CardapioProjeto'));
const CardapioEditor = lazy(() => import('./pages/CardapioEditor'));
const CardapioA4Editor = lazy(() => import('./pages/CardapioA4Editor'));
const A3PreviewA4 = lazy(() => import('./pages/A3PreviewA4'));
const A3PreviewCardapios = lazy(() => import('./pages/A3PreviewCardapios'));

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

const RouteFallback = () => (
  <div className="flex justify-center items-center h-screen text-slate-500">Carregando...</div>
);

// Captura falha de import() dos chunks lazy (ex: deploy novo no meio da sessão
// com cache antigo limpo). Sem isso, a falha desmonta a árvore = tela branca.
class LazyErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-4 text-slate-600">
          <p>Erro ao carregar. Pode haver uma nova versão do sistema disponível.</p>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={() => window.location.reload()}
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App: React.FC = () => {
  return (
    <HashRouter>
      <PresenceProvider>
      <LazyErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
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
        <Route path="/planilha-area-livre/:edicaoId/:categoriaTag" element={<ProtectedRoute><PlanilhaAreaLivre /></ProtectedRoute>} />
        <Route path="/atendimentos/:edicaoId" element={<ProtectedRoute><Atendimentos /></ProtectedRoute>} />
        <Route path="/controle-imagens" element={<ProtectedRoute><ControleImagens /></ProtectedRoute>} />
        <Route path="/itens-opcionais" element={<ProtectedRoute><ItensOpcionais /></ProtectedRoute>} />

        <Route path="/todos-eventos" element={<ProtectedRoute><TodosEventos /></ProtectedRoute>} />
        <Route path="/tarefas" element={<ProtectedRoute><Tarefas /></ProtectedRoute>} />

        <Route path="/tags" element={<ProtectedRoute><Tags /></ProtectedRoute>} />

        {/* Módulo Cardápios — projetos por evento, com abas (Menu A4 | Banner | Painel Duplo | Configuração) */}
        <Route path="/cardapios" element={<ProtectedRoute><CardapioProjetos /></ProtectedRoute>} />
        <Route path="/cardapios/projeto/:projetoId" element={<ProtectedRoute><CardapioProjeto /></ProtectedRoute>} />
        <Route path="/cardapios/projeto/:projetoId/banner/novo" element={<ProtectedRoute><CardapioEditor /></ProtectedRoute>} />
        <Route path="/cardapios/projeto/:projetoId/banner/:id" element={<ProtectedRoute><CardapioEditor /></ProtectedRoute>} />
        <Route path="/cardapios/projeto/:projetoId/a4/novo" element={<ProtectedRoute><CardapioA4Editor /></ProtectedRoute>} />
        <Route path="/cardapios/projeto/:projetoId/a4/:id" element={<ProtectedRoute><CardapioA4Editor /></ProtectedRoute>} />
        <Route path="/a3-preview-cardapios" element={<ProtectedRoute><A3PreviewCardapios /></ProtectedRoute>} />
        <Route path="/a3-preview-a4" element={<ProtectedRoute><A3PreviewA4 /></ProtectedRoute>} />
        {/* Rotas antigas (bookmarks/PWA) → lista de projetos */}
        <Route path="/cardapios-a4/*" element={<Navigate to="/cardapios" replace />} />
        <Route path="/painel-duplo" element={<Navigate to="/cardapios" replace />} />

        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
      </Suspense>
      </LazyErrorBoundary>
      </PresenceProvider>
    </HashRouter>
  );
};

export default App;
