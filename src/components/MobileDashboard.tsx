import React from 'react';
import { useData, useAuth } from '../store';
import { TrendingUp, Users, Package, DollarSign, ShoppingCart, Plus, History, Wallet } from 'lucide-react';
import { formatCurrency } from '../utils';

export default function MobileDashboard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { user } = useAuth();
  const { vendas, produtos, clientes, gastos } = useData();

  const totalVendas = (vendas || []).reduce((acc, v) => acc + (Number(v.total) || 0), 0);
  const totalGastos = (gastos || []).filter(g => g.tipo === 'saida').reduce((acc, g) => acc + (Number(g.valor) || 0), 0);
  const lucro = totalVendas - totalGastos;

  const quickActions = [
    { id: 'venda', label: 'Nova Venda', icon: <ShoppingCart size={24} />, color: 'bg-slate-600 active:bg-emerald-600' },
    { id: 'produtos', label: 'Estoque', icon: <Package size={24} />, color: 'bg-slate-600 active:bg-emerald-600' },
    { id: 'clientes', label: 'Clientes', icon: <Users size={24} />, color: 'bg-slate-600 active:bg-emerald-600' },
    { id: 'historico', label: 'Histórico', icon: <History size={24} />, color: 'bg-slate-600 active:bg-emerald-600' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            Olá, <span className="text-emerald-600">{String(user?.displayName || 'Usuário').split(' ')[0]}</span>!
          </h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Resumo do seu negócio</p>
        </div>
        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
          <TrendingUp size={24} />
        </div>
      </div>

      {/* Main Stats Card */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-emerald-900/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-[5rem] -mr-8 -mt-8"></div>
        <div className="relative z-10">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Vendas Totais</p>
          <h3 className="text-4xl font-black tracking-tighter mb-6">{formatCurrency(totalVendas)}</h3>
          
          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-800">
            <div>
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Lucro Estimado</p>
              <p className="text-emerald-400 font-black text-lg">{formatCurrency(lucro)}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Gastos</p>
              <p className="text-red-400 font-black text-lg">{formatCurrency(totalGastos)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-4">
        {quickActions.map(action => (
          <button
            key={action.id}
            onClick={() => onNavigate(action.id)}
            className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center gap-4 active:scale-95 transition-all"
          >
            <div className={`${action.color} text-white p-4 rounded-2xl shadow-lg`}>
              {action.icon}
            </div>
            <span className="font-black text-slate-800 text-xs uppercase tracking-wider">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Vendas Recentes</h3>
          <button onClick={() => onNavigate('historico')} className="text-emerald-600 font-black text-[10px] uppercase tracking-widest">Ver Tudo</button>
        </div>
        
        <div className="space-y-4">
          {(vendas || []).slice(0, 3).map((v, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 font-black text-xs border border-slate-100">
                  {String(v.clienteNome || 'C').charAt(0)}
                </div>
                <div>
                  <p className="font-black text-slate-800 text-xs truncate max-w-[120px]">{v.clienteNome || 'Consumidor'}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase">{v.formaPagamento}</p>
                </div>
              </div>
              <p className="font-black text-slate-800 text-sm">{formatCurrency(Number(v.total))}</p>
            </div>
          ))}
          {(vendas || []).length === 0 && (
            <p className="text-center py-4 text-slate-400 font-bold text-xs">Nenhuma venda hoje.</p>
          )}
        </div>
      </div>

      {/* Quick Add Button */}
      <button 
        onClick={() => onNavigate('venda')}
        className="w-full bg-slate-600 active:bg-emerald-600 text-white py-5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-slate-200 active:shadow-emerald-200 active:scale-95 transition-all"
      >
        <Plus size={24} />
        NOVA VENDA AGORA
      </button>
    </div>
  );
}
