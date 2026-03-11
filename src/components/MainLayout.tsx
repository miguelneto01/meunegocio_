import React, { useState, useEffect } from 'react';
import { useAuth } from '../store';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  History, 
  LogOut, 
  Menu, 
  X, 
  Wallet, 
  CreditCard,
  FileBarChart,
  Settings,
  Bell,
  Search,
  ChevronRight,
  Activity,
  UserCircle,
  Store,
  Home
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Dashboard from './Dashboard';
import Produtos from './Produtos';
import Clientes from './Clientes';
import Venda from './Venda';
import HistoricoVendas from './HistoricoVendas';
import Gastos from './Gastos';
import Credito from './Credito';
import Relatorios from './Relatorios';
import Perfil from './Perfil';
import Admin from './Admin';

export default function MainLayout() {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth <= 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'venda', label: 'Nova Venda', icon: ShoppingCart },
    { id: 'produtos', label: 'Produtos', icon: Package },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'historico', label: 'Histórico', icon: History },
    { id: 'credito', label: 'Crédito (Fiado)', icon: CreditCard },
    { id: 'gastos', label: 'Fluxo de Caixa', icon: Wallet },
    { id: 'relatorios', label: 'Relatórios', icon: FileBarChart },
    { id: 'perfil', label: 'Meu Perfil', icon: UserCircle },
  ];

  if (user?.tipo === 'admin') {
    menuItems.push({ id: 'admin', label: 'Admin', icon: Settings });
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'produtos': return <Produtos />;
      case 'clientes': return <Clientes />;
      case 'venda': return <Venda />;
      case 'historico': return <HistoricoVendas />;
      case 'gastos': return <Gastos />;
      case 'credito': return <Credito />;
      case 'relatorios': return <Relatorios />;
      case 'perfil': return <Perfil />;
      case 'admin': return <Admin />;
      default: return <Dashboard />;
    }
  };

  const mobileNavItems = [
    { id: 'dashboard', label: 'Início', icon: Home },
    { id: 'venda', label: 'Venda', icon: ShoppingCart },
    { id: 'produtos', label: 'Estoque', icon: Package },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'perfil', label: 'Perfil', icon: UserCircle },
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      {/* Overlay for sidebar (All screens) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Drawer for all screens */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-80 bg-slate-900 text-white transition-transform duration-500 ease-in-out flex flex-col shadow-2xl ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo Section */}
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <Store size={28} className="text-white" />
            </div>
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
              <h1 className="text-xl font-black tracking-tighter uppercase">MEU <span className="text-emerald-400">NEGÓCIO</span></h1>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gestão Inteligente</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group relative ${
                activeTab === item.id 
                  ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={22} className={`${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
              <span className="font-bold text-sm tracking-tight">{item.label}</span>
              {activeTab === item.id && (
                <ChevronRight size={16} className="ml-auto opacity-50" />
              )}
            </button>
          ))}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-6 mt-auto border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-black shrink-0">
              {user?.displayName?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-bottom-2">
              <p className="text-sm font-black truncate">{user?.displayName}</p>
              <p className="text-[10px] font-bold text-slate-500 truncate uppercase tracking-wider">{user?.tipo === 'admin' ? 'Administrador' : 'Usuário'}</p>
            </div>
            <button 
              onClick={() => setUser(null)}
              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
        {/* Header */}
        <header className="h-20 lg:h-24 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-30">
          <div className="flex items-center gap-4 lg:gap-8 flex-1 max-w-2xl">
            {/* Menu Toggle (Hamburger) */}
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
            >
              <Menu size={28} />
            </button>
            
            <div className="relative w-full group hidden sm:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Pesquisar..." 
                className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
              />
            </div>

            {/* Mobile Logo */}
            <div className="sm:hidden flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
                <Store size={18} />
              </div>
              <span className="font-black text-slate-800 tracking-tighter text-sm uppercase">Meu <span className="text-emerald-600">Negócio</span></span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-4 ml-4">
            <button className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-all relative">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-100 mx-1 hidden sm:block"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-xs font-black text-slate-800">{format(new Date(), 'EEEE, dd MMM', { locale: ptBR })}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status: Ativo</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-emerald-600 font-black text-sm">
                {user?.displayName?.charAt(0) || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-10 custom-scrollbar bg-[#F8FAFC] pb-24 lg:pb-10">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {renderContent()}
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 px-6 py-3 flex items-center justify-between z-30">
          {mobileNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 transition-all ${
                activeTab === item.id ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              <div className={`p-2 rounded-xl transition-all ${activeTab === item.id ? 'bg-emerald-50' : ''}`}>
                <item.icon size={22} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider">{item.label}</span>
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
}
