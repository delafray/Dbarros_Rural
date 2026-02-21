import React, { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSystemInfo } from '../utils/core_lic';
import { Button, Modal } from './UI';

import { APP_VERSION } from '../version';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  headerActions?: ReactNode;
  mobileSidebarContent?: ReactNode; // Mobile-only content injected below nav links
}

const NavItem = ({ to, label, icon: Icon }: { to: string; label: string; icon: any }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${isActive
        ? 'bg-blue-600 text-white shadow-md'
        : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
      }`
    }
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium">{label}</span>
  </NavLink>
);

const Layout: React.FC<LayoutProps> = ({ children, title, headerActions, mobileSidebarContent }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [showExitConfirm, setShowExitConfirm] = React.useState(false);
  const exitDialogOpenRef = React.useRef(false);

  // Removed useBlocker because it is unsupported in HashRouter and causes a fatal crash.

  // Browser level protection (beforeunload)
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (user) {
        e.preventDefault();
        e.returnValue = ''; // Required for some browsers
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);

  // Mobile back button protection — robust for Android Chrome + HashRouter
  React.useEffect(() => {
    if (!user) return;

    // Always push the guard state on mount/user-change
    window.history.pushState({ appGuard: true }, '');

    const handlePopState = (event: PopStateEvent) => {
      // Only act if this is our guard entry being popped (not an in-app hash navigation)
      if (!event.state?.appGuard) return;

      // CRITICAL: Re-push SYNCHRONOUSLY first, to prevent the browser from leaving the page
      window.history.pushState({ appGuard: true }, '');

      if (exitDialogOpenRef.current) {
        // 2nd press while dialog is open → force logout immediately
        exitDialogOpenRef.current = false;
        setShowExitConfirm(false);
        logout().then(() => navigate('/login'));
        return;
      }

      // 1st press → show dialog
      exitDialogOpenRef.current = true;
      setShowExitConfirm(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    navigate('/login');
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const getRoleLabel = () => {
    if (user?.isAdmin) return 'Admin';
    if (user?.isVisitor) return 'Visitante';
    return 'Usuário';
  };

  const confirmExit = async () => {
    exitDialogOpenRef.current = false;
    setShowExitConfirm(false);
    await logout();
    navigate('/login');
  };

  const cancelExit = () => {
    exitDialogOpenRef.current = false;
    setShowExitConfirm(false);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Back-button exit confirmation (mobile) */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center md:items-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-base">Sair do sistema?</h3>
                <p className="text-xs text-slate-500 mt-0.5">Pressione voltar novamente para sair imediatamente.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={cancelExit} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
                Ficar
              </button>
              <button onClick={confirmExit} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-all">
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Backdrop */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 transition-opacity md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar - Aside */}
      <aside className={`w-64 bg-white border-r border-slate-200 flex flex-col fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="assets/logo.jpg"
              alt="Logo"
              className="w-8 h-8 object-contain mr-3 rounded shadow-sm bg-white"
            />
            <div>
              <h1 className="text-xl font-bold text-blue-600 tracking-tight leading-none">
                Galeria de Fotos
              </h1>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                v{APP_VERSION}
              </span>
            </div>
          </div>
          {/* Close button inside sidebar for mobile */}
          <button
            onClick={() => setIsMenuOpen(false)}
            className="md:hidden p-2 text-slate-400 hover:text-slate-600"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Single unified scrollable area: nav + busca avançada */}
        <div className="flex-1 overflow-y-auto">
          <nav className="px-4 space-y-1 mt-4" onClick={() => setIsMenuOpen(false)}>
            <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Arquivos</div>
            <NavItem to="/fotos" label="Fotos" icon={CameraIcon} />
            {user?.canManageTags && <NavItem to="/tags" label="Tags de Busca" icon={TagIcon} />}

            <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sistema</div>
            {user?.canManageTags && <NavItem to="/usuarios" label="Usuários" icon={UsersIcon} />}
          </nav>

          {/* Mobile-only: secondary filter controls injected from page */}
          {mobileSidebarContent && (
            <div className="md:hidden px-4 pb-2 border-t-2 border-blue-100 pt-3 mt-2">
              <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest pb-2 mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                Busca Avançada
              </div>
              {mobileSidebarContent}
            </div>
          )}

          {/* Mobile-only: Sair + créditos inside scroll */}
          <div className="md:hidden px-4 pt-3 pb-6 border-t border-slate-100 mt-2">
            <button onClick={handleLogout} className="flex items-center space-x-3 px-4 py-3 w-full text-left rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all">
              <LogOutIcon className="w-5 h-5" />
              <span className="font-medium">Sair</span>
            </button>
            <div className="px-4 pb-2">
              <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
                {getSystemInfo().label}
              </p>
              <p className="text-[9px] text-slate-400 font-black mt-1 tracking-wider">
                <span className="lowercase font-medium">{getSystemInfo().contact}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Desktop-only: Sair + créditos fixed at bottom */}
        <div className="hidden md:flex p-4 border-t border-slate-100 flex-col gap-4">
          <button onClick={handleLogout} className="flex items-center space-x-3 px-4 py-3 w-full text-left rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all">
            <LogOutIcon className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </button>

          <div className="px-4 pb-2">
            <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
              {getSystemInfo().label}
            </p>
            <p className="text-[9px] text-slate-400 font-black mt-1 tracking-wider">
              <span className="lowercase font-medium">{getSystemInfo().contact}</span>
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 p-3 sm:p-4 md:pt-4 md:px-8 w-full max-w-full">
        <header className="mb-1 sm:mb-4 flex justify-between items-center gap-3">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Hamburger Button for Mobile */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="md:hidden p-2 sm:p-3 bg-white border border-slate-200 rounded-xl text-blue-600 shadow-sm hover:bg-blue-50 transition-all active:scale-95"
              aria-label="Menu"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 truncate">{title}</h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Custom Header Actions */}
            {headerActions && (
              <div className="hidden md:flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-500">
                {headerActions}
              </div>
            )}

            <div className="bg-white px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-xl border border-slate-200 flex items-center shadow-sm flex-shrink-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs sm:text-sm mr-1.5 sm:mr-2 uppercase flex-shrink-0">
                {user?.name?.substring(0, 2) || 'US'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-sm font-bold text-slate-700 truncate max-w-[120px]">{user?.name || 'Usuário'}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">{getRoleLabel()}</span>
              </div>
            </div>
          </div>
        </header>
        {children}
      </main>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutConfirm}
        onClose={cancelLogout}
        title="Confirmar Saída"
        maxWidth="max-w-md"
      >
        <div className="space-y-6 py-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 flex-shrink-0">
              <LogOutIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-800">Deseja realmente sair?</p>
              <p className="text-sm text-slate-500">Sua sessão será encerrada e você precisará entrar novamente.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={cancelLogout}
              className="flex-1 h-11"
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={confirmLogout}
              className="flex-1 h-11 border-none shadow-lg shadow-red-500/20"
            >
              Sim, Sair
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const UsersIcon = (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const CameraIcon = (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const TagIcon = (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>;
const LogOutIcon = (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;

export default Layout;
