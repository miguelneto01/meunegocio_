import React, { useState, useEffect, useRef } from 'react';
import { useAuth, useData } from '../store';
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
  ChevronRight,
  UserCircle,
  Store
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

export default function DesktopLayout() {
  const { user, setUser } = useAuth();
  const { produtos } = useData();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const produtosComEstoqueBaixo = produtos.filter(p => p.estoque <= 5);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      {/* Sidebar */}
      <aside 
        className={`bg-slate-900 text-white transition-all duration-300 ease-in-out flex flex-col shadow-2xl ${
          isSidebarOpen ? 'w-80' : 'w-24'
        }`}
      >
        {/* Logo Section */}
        <div className={`p-8 flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <Store size={28} className="text-white" />
            </div>
            {isSidebarOpen && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                <h1 className="text-xl font-black tracking-tighter uppercase">MEU <span className="text-emerald-400">NEGÓCIO</span></h1>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gestão Inteligente</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group relative ${
                activeTab === item.id 
                  ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              } ${!isSidebarOpen && 'justify-center'}`}
              title={!isSidebarOpen ? item.label : ''}
            >
              <item.icon size={22} className={`${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
              {isSidebarOpen && <span className="font-bold text-sm tracking-tight">{item.label}</span>}
              {isSidebarOpen && activeTab === item.id && (
                <ChevronRight size={16} className="ml-auto opacity-50" />
              )}
            </button>
          ))}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-6 mt-auto border-t border-slate-800 bg-slate-900/50">
          <div className={`flex items-center gap-4 ${!isSidebarOpen && 'flex-col'}`}>
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-black shrink-0">
              {String(user?.displayName || 'U').charAt(0)}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-bottom-2">
                <p className="text-sm font-black truncate">{user?.displayName}</p>
                <p className="text-[10px] font-bold text-slate-500 truncate uppercase tracking-wider">{user?.tipo === 'admin' ? 'Administrador' : 'Usuário'}</p>
              </div>
            )}
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
        <header className="h-24 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-10 sticky top-0 z-30">
          <div className="flex items-center gap-8 flex-1 max-w-2xl">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
            >
              <Menu size={28} />
            </button>
            <div className="relative flex-1 max-w-md group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                <Store size={20} />
              </div>
              <div className="pl-12 pr-4 py-3 bg-slate-50 rounded-2xl text-sm font-bold text-slate-400">
                Painel de Controle Profissional
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 ml-4">
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-all relative"
              >
                <Bell size={20} />
                {produtosComEstoqueBaixo.length > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                  <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-800">Notificações</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    {produtosComEstoqueBaixo.length > 0 ? (
                      produtosComEstoqueBaixo.map(p => (
                        <div key={p.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => { setActiveTab('produtos'); setShowNotifications(false); }}>
                          <p className="font-bold text-slate-800 text-sm">{p.nome}</p>
                          <p className="text-xs text-red-500 font-medium mt-1">Estoque baixo: {p.estoque} unidades</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-slate-500 text-sm">
                        Nenhuma notificação no momento.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="h-8 w-px bg-slate-100 mx-1"></div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-black text-slate-800">{format(new Date(), 'EEEE, dd MMM', { locale: ptBR })}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status: Ativo</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-emerald-600 font-black text-sm">
                {String(user?.displayName || 'U').charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}
