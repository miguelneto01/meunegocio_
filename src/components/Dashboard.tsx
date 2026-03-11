import React from 'react';
import { useData, useAuth } from '../store';
import { TrendingUp, Users, Package, DollarSign, ArrowUpRight, ArrowDownRight, ShoppingBag, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

import { formatCurrency } from '../utils';

export default function Dashboard() {
  const { user } = useAuth();
  const { vendas, produtos, clientes, gastos } = useData();

  const totalVendas = vendas.reduce((acc, v) => acc + (Number(v.total) || 0), 0);
  const totalGastos = gastos.filter(g => g.tipo === 'saida').reduce((acc, g) => acc + (Number(g.valor) || 0), 0);
  const lucro = totalVendas - totalGastos;

  // Group sales by day for the chart
  const salesByDay = vendas.reduce((acc, v) => {
    const date = v.data?.toDate ? v.data.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : new Date(v.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    acc[date] = (acc[date] || 0) + (Number(v.total) || 0);
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(salesByDay)
    .map(([name, total]) => ({ name, total }))
    .slice(-7);

  const stats = [
    { 
      label: 'Vendas Totais', 
      value: formatCurrency(totalVendas), 
      icon: <DollarSign size={24} />, 
      color: 'bg-emerald-600', 
      trend: '+12%', 
      trendUp: true,
      shadow: 'shadow-emerald-200'
    },
    { 
      label: 'Lucro Estimado', 
      value: formatCurrency(lucro), 
      icon: <TrendingUp size={24} />, 
      color: 'bg-blue-500', 
      trend: '+8%', 
      trendUp: true,
      shadow: 'shadow-blue-200'
    },
    { 
      label: 'Total Clientes', 
      value: clientes.length.toString(), 
      icon: <Users size={24} />, 
      color: 'bg-amber-500', 
      trend: '+3', 
      trendUp: true,
      shadow: 'shadow-amber-200'
    },
    { 
      label: 'Produtos em Estoque', 
      value: produtos.length.toString(), 
      icon: <Package size={24} />, 
      color: 'bg-slate-900', 
      trend: '-2', 
      trendUp: false,
      shadow: 'shadow-slate-200'
    },
  ];

  return (
    <div className="space-y-6 lg:space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl lg:text-4xl font-black text-slate-800 tracking-tight">
            Olá, <span className="text-emerald-600">{(user?.displayName || 'Usuário').split(' ')[0]}</span>! 👋
          </h2>
          <p className="text-slate-500 font-medium mt-1 text-sm lg:text-base">Aqui está o que está acontecendo no seu negócio hoje.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100 self-start">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] lg:text-xs font-black text-slate-600 uppercase tracking-widest">Sistema Online</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat, i) => (
          <div key={i} className={`bg-white p-6 lg:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all group relative overflow-hidden`}>
            <div className={`absolute top-0 right-0 w-24 h-24 ${stat.color} opacity-[0.03] rounded-bl-[4rem] -mr-8 -mt-8 group-hover:opacity-10 transition-opacity`}></div>
            <div className="flex justify-between items-start mb-6">
              <div className={`${stat.color} text-white p-3 lg:p-4 rounded-2xl shadow-lg ${stat.shadow} group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-black ${stat.trendUp ? 'text-emerald-600' : 'text-red-500'} bg-slate-50 px-2 py-1 rounded-lg`}>
                {stat.trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {stat.trend}
              </div>
            </div>
            <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{stat.label}</div>
            <div className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tighter">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 lg:p-8 rounded-[2.5rem] lg:rounded-[3rem] shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 lg:mb-10 gap-4">
            <h3 className="text-lg lg:text-xl font-black text-slate-800 flex items-center gap-3">
              <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                <Activity size={20} />
              </div>
              Desempenho de Vendas
            </h3>
            <select className="bg-slate-50 border-none rounded-xl px-4 py-2 text-[10px] font-black text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500 self-start">
              <option>Últimos 7 dias</option>
              <option>Últimos 30 dias</option>
            </select>
          </div>
          <div className="h-64 lg:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}}
                />
                <Tooltip 
                  contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 800, padding: '15px'}}
                />
                <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 lg:p-8 rounded-[2.5rem] lg:rounded-[3rem] shadow-sm border border-slate-100">
          <h3 className="text-lg lg:text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
              <ShoppingBag size={20} />
            </div>
            Vendas Recentes
          </h3>
          <div className="space-y-6">
            {vendas.slice(0, 5).map((v, i) => (
              <div key={i} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors font-black text-xs">
                    {(v.clienteNome || 'C').charAt(0)}
                  </div>
                  <div>
                    <div className="font-black text-slate-800 text-xs lg:text-sm group-hover:text-emerald-600 transition-colors">{v.clienteNome || 'Cliente não informado'}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {v.data?.toDate ? v.data.toDate().toLocaleDateString() : (v.data ? new Date(v.data).toLocaleDateString() : '')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-slate-800 text-xs lg:text-sm">{formatCurrency(Number(v.total))}</div>
                  <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{v.formaPagamento === 'credito' ? 'FIADO' : v.formaPagamento}</div>
                </div>
              </div>
            ))}
            {vendas.length === 0 && (
              <div className="text-center py-10 text-slate-400 font-bold">Nenhuma venda registrada.</div>
            )}
          </div>
          <button className="w-full mt-8 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-50 hover:text-emerald-600 transition-all">
            Ver Todo Histórico
          </button>
        </div>
      </div>
    </div>
  );
}
