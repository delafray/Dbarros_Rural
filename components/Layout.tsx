import React, { ReactNode, useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSystemInfo } from '../utils/core_lic';
import { ConfirmModal } from './ConfirmModal';
import { authService } from '../services/authService';

import { APP_VERSION } from '../version';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  headerActions?: ReactNode;
  mobileSidebarContent?: ReactNode;
  onMobileBack?: () => boolean; // return true = modal was closed, skip exit dialog
}

const NavItem = ({ to, label, icon: Icon }: { to: string; label: string; icon: any }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center space-x-3 px-4 py-2 md:py-3 rounded-lg transition-all ${isActive
        ? 'bg-blue-600 text-white shadow-md'
        : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
      }`
    }
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium">{label}</span>
  </NavLink>
);

const Layout: React.FC<LayoutProps> = ({ children, title, headerActions, mobileSidebarContent, onMobileBack }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isBiometricsSupported, setIsBiometricsSupported] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(localStorage.getItem('biometricsEnrolled') === 'true');

  useEffect(() => {
    setIsBiometricsSupported(authService.checkBiometricSupport());
  }, []);

  // Browser level protection (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (user) {
        e.preventDefault();
        e.returnValue = ''; // Required for some browsers
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);

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

  const handleEnrollBiometrics = async () => {
    if (isEnrolling) return;

    if (isEnrolled) {
      localStorage.setItem('biometricsEnrolled', 'false');
      setIsEnrolled(false);
      return;
    }

    setIsEnrolling(true);
    try {
      await authService.enrollPasskey();
      localStorage.setItem('biometricsEnrolled', 'true');
      setIsEnrolled(true);
      alert('Biometria cadastrada com sucesso!');
    } catch (error: any) {
      if (error.message?.includes('cancelada')) return;
      alert('Erro ao cadastrar biometria: ' + error.message);
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile Backdrop */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 transition-opacity md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar - Aside */}
      <aside className={`w-64 bg-white border-r border-slate-200 flex flex-col fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-3 md:p-6 flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="assets/logo.png"
              alt="Logo Dbarros Rural"
              className="w-10 h-10 object-contain p-1.5 bg-white rounded-lg shadow-sm border border-slate-100"
            />
            <div>
              <h1 className="text-xl font-bold text-blue-600 tracking-tight leading-none">
                Dbarros Rural
              </h1>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                v{APP_VERSION}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsMenuOpen(false)}
            className="md:hidden p-2 text-slate-400 hover:text-slate-600"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <nav className="px-4 space-y-0.5 md:space-y-1 mt-1 md:mt-4" onClick={() => setIsMenuOpen(false)}>
            <div className="pt-2 md:pt-4 pb-1 md:pb-2 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Painel</div>
            <NavItem to="/dashboard" label="Dashboard" icon={ChartBarIcon} />

            <div className="pt-2 md:pt-4 pb-1 md:pb-2 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cadastros</div>
            <NavItem to="/eventos" label="Eventos" icon={CalendarIcon} />
            <NavItem to="/clientes" label="Clientes" icon={UsersIcon} />

            <div className="pt-2 md:pt-4 pb-1 md:pb-2 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Arquivos</div>
            <NavItem to="/fotos" label="Fotos" icon={CameraIcon} />
            <NavItem to="/itens-opcionais" label="Itens Opcionais" icon={PlusCircleIcon} />
            {user?.canManageTags && <NavItem to="/tags" label="Tags de Busca" icon={TagIcon} />}

            <div className="pt-2 md:pt-4 pb-1 md:pb-2 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sistema</div>
            {user?.canManageTags && <NavItem to="/usuarios" label="Usuários" icon={UsersIcon} />}

            {isBiometricsSupported && !user?.isVisitor && (
              <div
                className="flex md:hidden items-center justify-between px-4 py-3 md:py-4 w-full rounded-lg text-slate-600 hover:bg-slate-50 transition-all cursor-pointer border-t border-slate-100 mt-2"
                onClick={handleEnrollBiometrics}
              >
                <div className="flex items-center space-x-3">
                  <FingerprintIcon className="w-5 h-5 text-blue-500" />
                  <span className="font-medium text-sm">Logar com digital</span>
                </div>
                <div className={`relative w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ease-in-out ${isEnrolled ? 'bg-green-500' : (isEnrolling ? 'bg-orange-300' : 'bg-slate-200')} cursor-pointer`}>
                  <div className={`absolute left-1 bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${isEnrolled ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>
            )}
          </nav>

          {mobileSidebarContent && (
            <div className="md:hidden px-4 pb-2 border-t-2 border-blue-100 pt-3 mt-2">
              <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest pb-2 mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                Busca Avançada
              </div>
              {mobileSidebarContent}
            </div>
          )}

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

      <main className="flex-1 md:ml-64 px-1.5 py-2 sm:p-4 md:pt-4 md:px-8 w-full max-w-full">
        <header className="mb-1 sm:mb-4 flex justify-between items-center gap-3">
          <div className="flex items-center gap-2 sm:gap-4">
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

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Deseja realmente sair?"
        message="Sua sessão será encerrada e você precisará entrar novamente."
        confirmText="Sim, Sair"
        cancelText="Cancelar"
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
        type="danger"
      />
    </div>
  );
};

const ChartBarIcon = (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const UsersIcon = (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const CameraIcon = (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const TagIcon = (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>;
const LogOutIcon = (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const FingerprintIcon = (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3m0 0a10.003 10.003 0 019.143 5.94l.054.09m-9.197-6.03V3m0 0a10 10 0 00-3.95 19.191m6.95-6.191l-.054.09c-1.744 2.772-2.753 6.054-2.753 9.571m-6.95-15.761V3" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517 1.009 6.799 2.753 9.571m3.44-2.04l-.054-.09A10.003 10.003 0 0112 3" /></svg>;
const CalendarIcon = (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const PlusCircleIcon = (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

export default Layout;

