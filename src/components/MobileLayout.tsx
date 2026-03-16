import React, { useState } from 'react';
import { useAuth, useData } from '../store';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  History, 
  LogOut, 
  Wallet, 
  CreditCard,
  FileBarChart,
  Settings,
  Bell,
  UserCircle,
  Store,
  Home,
  Plus,
  MoreHorizontal
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Dashboard from './Dashboard';
import MobileDashboard from './MobileDashboard';
import Produtos from './Produtos';
import Clientes from './Clientes';
import Venda from './Venda';
import HistoricoVendas from './HistoricoVendas';
import Gastos from './Gastos';
import Credito from './Credito';
import Relatorios from './Relatorios';
import Perfil from './Perfil';
import Admin from './Admin';

export default function MobileLayout() {
  const { user, setUser } = useAuth();
  const { produtos } = useData();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);

  const produtosComEstoqueBaixo = produtos.filter(p => p.estoque <= 5);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <MobileDashboard onNavigate={setActiveTab} />;
      case 'produtos': return <Produtos />;
      case 'clientes': return <Clientes />;
      case 'venda': return <Venda />;
      case 'historico': return <HistoricoVendas />;
      case 'gastos': return <Gastos />;
      case 'credito': return <Credito />;
      case 'relatorios': return <Relatorios />;
      case 'perfil': return <Perfil />;
      case 'admin': return <Admin />;
      default: return <MobileDashboard onNavigate={setActiveTab} />;
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Início', icon: Home },
    { id: 'produtos', label: 'Estoque', icon: Package },
    { id: 'venda', label: 'Venda', icon: ShoppingCart, primary: true },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'perfil', label: 'Perfil', icon: UserCircle },
  ];

  const moreItems = [
    { id: 'historico', label: 'Histórico', icon: History },
    { id: 'credito', label: 'Crédito (Fiado)', icon: CreditCard },
    { id: 'gastos', label: 'Fluxo de Caixa', icon: Wallet },
    { id: 'relatorios', label: 'Relatórios', icon: FileBarChart },
  ];

  if (user?.tipo === 'admin') {
    moreItems.push({ id: 'admin', label: 'Admin', icon: Settings });
  }

  const [showMore, setShowMore] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] font-sans">
      {/* Mobile Top Bar */}
      <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Store size={18} />
          </div>
          <span className="font-black text-slate-800 tracking-tighter text-sm uppercase">Meu <span className="text-emerald-600">Negócio</span></span>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl relative"
          >
            <Bell size={20} />
            {produtosComEstoqueBaixo.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-emerald-600 font-black text-xs">
            {String(user?.displayName || 'U').charAt(0)}
          </div>
        </div>

        {showNotifications && (
          <div className="absolute top-full right-4 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">Notificações</h3>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {produtosComEstoqueBaixo.length > 0 ? (
                produtosComEstoqueBaixo.map(p => (
                  <div key={p.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors" onClick={() => { setActiveTab('produtos'); setShowNotifications(false); }}>
                    <p className="font-bold text-slate-800 text-xs">{p.nome}</p>
                    <p className="text-[10px] text-red-500 font-medium mt-1">Estoque baixo: {p.estoque} unidades</p>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-500 text-xs">
                  Nenhuma notificação.
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Page Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {renderContent()}
        </div>
      </main>

      {/* More Menu Overlay */}
      {showMore && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end justify-center p-4" onClick={() => setShowMore(false)}>
          <div className="bg-white w-full rounded-[2.5rem] p-6 animate-in slide-in-from-bottom-full duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">Mais Opções</h3>
              <button onClick={() => setShowMore(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {moreItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setShowMore(false);
                  }}
                  className={`flex items-center gap-3 p-4 rounded-2xl transition-all ${
                    activeTab === item.id ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-600'
                  }`}
                >
                  <item.icon size={20} />
                  <span className="font-bold text-xs">{item.label}</span>
                </button>
              ))}
              <button
                onClick={() => setUser(null)}
                className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 text-red-600 col-span-2"
              >
                <LogOut size={20} />
                <span className="font-bold text-xs">Sair do Sistema</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-2 py-2 flex items-center justify-around z-40 pb-safe">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 transition-all relative ${
              activeTab === item.id ? 'text-emerald-600' : 'text-slate-400'
            } ${item.primary ? 'mb-8' : ''}`}
          >
            <div className={`p-2.5 rounded-2xl transition-all ${
              item.primary 
                ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200 scale-125 -translate-y-2' 
                : activeTab === item.id ? 'bg-emerald-50' : ''
            }`}>
              <item.icon size={item.primary ? 24 : 20} />
            </div>
            {!item.primary && <span className="text-[9px] font-black uppercase tracking-wider">{item.label}</span>}
          </button>
        ))}
        <button
          onClick={() => setShowMore(true)}
          className={`flex flex-col items-center gap-1 transition-all text-slate-400`}
        >
          <div className="p-2.5 rounded-2xl">
            <MoreHorizontal size={20} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider">Mais</span>
        </button>
      </nav>
    </div>
  );
}
