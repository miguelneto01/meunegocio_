import React, { useState } from 'react';
import { useAuth, useData } from '../store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { FileDown, Search, Filter, FileText, CalendarOff, TrendingUp, Package, Wallet, Trash2, Download } from 'lucide-react';
import { showToast } from './Toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { db } from '../firebase';

import { formatCurrency } from '../utils';

export default function Relatorios() {
  const { user } = useAuth();
  const { vendas, produtos, gastos, credito, clientes } = useData();
  
  const [tipoRelatorio, setTipoRelatorio] = useState('vendas');
  const [dataInicio, setDataInicio] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [dataFim, setDataFim] = useState(new Date().toISOString().slice(0, 10));

  const [reportResult, setReportResult] = useState<{
    headers: string[];
    rows: any[][];
    totals?: { label: string; value: string }[];
  } | null>(null);

  const [showFecharMesModal, setShowFecharMesModal] = useState(false);

  const gerarRelatorio = async () => {
    if (!dataInicio || !dataFim) return showToast('Preencha as datas', 'warning');
    try {
      const start = new Date(dataInicio + 'T00:00:00');
      const end = new Date(dataFim + 'T23:59:59');
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return showToast('Data inválida', 'error');
      }
      
      let headers: string[] = [];
      let rows: any[][] = [];
      let totals: { label: string; value: string }[] = [];

      if (tipoRelatorio === 'vendas') {
        const filteredVendas = vendas.filter(v => {
          const data = v.data?.toDate ? v.data.toDate() : (v.data && !isNaN(new Date(v.data).getTime()) ? new Date(v.data) : new Date(0));
          return data >= start && data <= end;
        });

        let totalValue = 0;
        headers = ['Data', 'Cliente', 'Pagamento', 'Total'];
        filteredVendas.forEach((v: any) => {
          const val = Number(v.total) || 0;
          totalValue += val;
          rows.push([
            v.data?.toDate ? format(v.data.toDate(), 'dd/MM/yyyy HH:mm') : (v.data && !isNaN(new Date(v.data).getTime()) ? new Date(v.data).toLocaleString('pt-BR') : 'Desconhecido'),
            v.clienteNome,
            v.formaPagamento === 'credito' ? 'FIADO' : String(v.formaPagamento || '').toUpperCase(),
            formatCurrency(val)
          ]);
        });
        totals.push({ label: 'TOTAL DE VENDAS', value: formatCurrency(totalValue) });
      } else if (tipoRelatorio === 'estoque') {
        headers = ['Produto', 'Custo', 'Preço', 'Estoque', 'V. Total'];
        produtos.forEach((p: any) => {
          const vTotal = (p.preco || 0) * (p.estoque || 0);
          rows.push([
            p.nome,
            formatCurrency(p.custo || 0),
            formatCurrency(p.preco || 0),
            p.estoque.toString(),
            formatCurrency(vTotal)
          ]);
        });
      } else if (tipoRelatorio === 'gastos') {
        const filteredGastos = gastos.filter(g => {
          const data = g.data?.toDate ? g.data.toDate() : (g.data && !isNaN(new Date(g.data).getTime()) ? new Date(g.data) : new Date(0));
          return data >= start && data <= end;
        });

        let totalEntradas = 0;
        let totalSaidas = 0;
        
        headers = ['Data', 'Descrição', 'Tipo', 'Valor'];
        filteredGastos.forEach((g: any) => {
          const val = Number(g.valor) || 0;
          if (g.tipo === 'entrada') totalEntradas += val;
          else totalSaidas += val;
          
          rows.push([
            g.data?.toDate ? format(g.data.toDate(), 'dd/MM/yyyy') : (g.data && !isNaN(new Date(g.data).getTime()) ? new Date(g.data).toLocaleDateString('pt-BR') : 'Desconhecido'),
            g.descricao,
            g.tipo === 'entrada' ? 'ENTRADA' : String(g.tipo || '').toUpperCase(),
            formatCurrency(val)
          ]);
        });
        
        totals.push({ label: 'TOTAL ENTRADAS', value: formatCurrency(totalEntradas) });
        totals.push({ label: 'TOTAL SAÍDAS', value: formatCurrency(totalSaidas) });
        totals.push({ label: 'SALDO', value: formatCurrency(totalEntradas - totalSaidas) });
      }

      setReportResult({ headers, rows, totals });
      showToast('Relatório gerado com sucesso!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Erro ao gerar relatório', 'error');
    }
  };

  const exportarPDF = () => {
    if (!reportResult) return showToast('Gere o relatório primeiro', 'warning');
    if (!dataInicio || !dataFim) return showToast('Preencha as datas', 'warning');
    
    try {
      const doc = new jsPDF();
      const start = new Date(dataInicio + 'T00:00:00');
      const end = new Date(dataFim + 'T23:59:59');

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return showToast('Data inválida', 'error');
      }

      // Header
      doc.setFillColor(16, 185, 129); // Emerald 500
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('MEU NEGÓCIO', 14, 20);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Relatório de ${tipoRelatorio.toUpperCase()}`, 14, 28);
      doc.text(`Período: ${format(start, 'dd/MM/yyyy')} a ${format(end, 'dd/MM/yyyy')}`, 14, 34);

      // Info
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 48);
      doc.text(`Usuário: ${user?.displayName}`, 14, 53);

      const tableData = [...reportResult.rows];
      if (reportResult.totals) {
        reportResult.totals.forEach(t => {
          const emptyCells = Array(reportResult.headers.length - 2).fill('');
          tableData.push([...emptyCells, t.label, t.value]);
        });
      }

      autoTable(doc, {
        startY: 60,
        head: [reportResult.headers],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 14, right: 14 }
      });

      doc.save(`relatorio_${tipoRelatorio}_${format(new Date(), 'ddMMyyyy_HHmm')}.pdf`);
      showToast('PDF exportado com sucesso!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Erro ao exportar PDF', 'error');
    }
  };

  const fecharMes = async () => {
    try {
      if (vendas.length === 0 && gastos.length === 0) {
        setShowFecharMesModal(false);
        return showToast('Nenhum dado para fechar.', 'warning');
      }

      const doc = new jsPDF();
      
      // Header
      doc.setFillColor(16, 185, 129); // Emerald 500
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('MEU NEGÓCIO', 14, 20);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Fechamento de Período (Geral)', 14, 28);
      doc.text(`Data do Fechamento: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 34);

      // System Metrics
      doc.setTextColor(15, 23, 42); // Slate 900
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo do Sistema', 14, 50);

      let totalVendasValor = 0;
      vendas.forEach((v: any) => { totalVendasValor += (Number(v.total) || 0); });

      const totalEstoquePositivo = produtos.filter(p => p.estoque > 0).length;
      const totalEstoqueNegativo = produtos.filter(p => p.estoque <= 0).length;
      const valorTotalEstoque = produtos.reduce((acc, p) => acc + ((p.preco || 0) * (p.estoque || 0)), 0);

      const clientesComCredito = credito.filter(c => c.saldo > 0).length;
      const totalCredito = credito.reduce((acc, c) => acc + (c.saldo || 0), 0);

      const totalEntradas = gastos.filter(g => g.tipo === 'entrada').reduce((acc, g) => acc + g.valor, 0);
      const totalSaidas = gastos.filter(g => g.tipo === 'saida').reduce((acc, g) => acc + g.valor, 0);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const metrics = [
        ['Vendas Realizadas', vendas.length.toString(), 'Faturamento Total', formatCurrency(totalVendasValor)],
        ['Produtos em Estoque', totalEstoquePositivo.toString(), 'Produtos Zerados', totalEstoqueNegativo.toString()],
        ['Valor em Estoque', formatCurrency(valorTotalEstoque), 'Total de Clientes', clientes.length.toString()],
        ['Clientes com Fiado', clientesComCredito.toString(), 'Total a Receber (Fiado)', formatCurrency(totalCredito)],
        ['Entradas Extras', formatCurrency(totalEntradas), 'Saídas/Gastos', formatCurrency(totalSaidas)]
      ];

      autoTable(doc, {
        startY: 55,
        body: metrics,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: [100, 116, 139] },
          1: { fontStyle: 'bold', textColor: [15, 23, 42] },
          2: { fontStyle: 'bold', textColor: [100, 116, 139] },
          3: { fontStyle: 'bold', textColor: [15, 23, 42] }
        }
      });

      // Sales Details
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Detalhamento de Vendas', 14, (doc as any).lastAutoTable.finalY + 15);

      const rows = vendas.map((v: any) => [
        v.data?.toDate ? format(v.data.toDate(), 'dd/MM/yyyy HH:mm') : (v.data && !isNaN(new Date(v.data).getTime()) ? new Date(v.data).toLocaleString('pt-BR') : 'Desconhecido'),
        v.clienteNome || 'Não informado',
        v.formaPagamento === 'credito' ? 'FIADO' : String(v.formaPagamento || '').toUpperCase(),
        formatCurrency(Number(v.total) || 0)
      ]);

      rows.push(['', '', 'TOTAL GERAL', formatCurrency(totalVendasValor)]);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Data', 'Cliente', 'Pagamento', 'Total']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 9 }
      });

      doc.save(`fechamento_meunegocio_${format(new Date(), 'ddMMyyyy')}.pdf`);

      // Firestore batch limit is 500 operations
      const chunkSize = 500;
      for (let i = 0; i < vendas.length; i += chunkSize) {
        const chunk = vendas.slice(i, i + chunkSize);
        const batch = db.batch();
        chunk.forEach((v: any) => {
          batch.delete(db.collection('vendas').doc(v.id));
        });
        await batch.commit();
      }

      for (let i = 0; i < gastos.length; i += chunkSize) {
        const chunk = gastos.slice(i, i + chunkSize);
        const batch = db.batch();
        chunk.forEach((g: any) => {
          batch.delete(db.collection('gastos').doc(g.id));
        });
        await batch.commit();
      }

      showToast('Período fechado e histórico limpo!', 'success');
      setReportResult(null);
      setShowFecharMesModal(false);
    } catch (e) {
      console.error(e);
      showToast('Erro ao fechar período', 'error');
    }
  };

  const vendasPorDia = (vendas || []).reduce((acc, v) => {
    let data = 'Desconhecido';
    if (v.data?.toDate) {
      data = v.data.toDate().toLocaleDateString();
    } else if (v.data) {
      const d = new Date(v.data);
      if (!isNaN(d.getTime())) data = d.toLocaleDateString();
    }
    acc[data] = (acc[data] || 0) + (Number(v.total) || 0);
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(vendasPorDia).map(([date, total]) => ({ date, total })).slice(-7);

  const produtosVendidos = (vendas || []).reduce((acc, v) => {
    v.itens?.forEach((item: any) => {
      acc[item.nome] = (acc[item.nome] || 0) + (Number(item.quantidade) || 0);
    });
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(produtosVendidos).map(([name, value]) => ({ name, value })).sort((a, b) => Number(b.value) - Number(a.value)).slice(0, 5);
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Relatórios & Análises</h2>
          <p className="text-slate-500 font-medium">Acompanhe o desempenho do seu negócio em tempo real.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowFecharMesModal(true)}
            className="bg-red-50 text-red-600 px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-red-100 transition-all border border-red-100"
          >
            <CalendarOff size={18} /> FECHAR PERÍODO
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Relatório</label>
            <select 
              value={tipoRelatorio} 
              onChange={e => setTipoRelatorio(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700"
            >
              <option value="vendas">Vendas Detalhadas</option>
              <option value="estoque">Posição de Estoque</option>
              <option value="gastos">Fluxo de Caixa</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Inicial</label>
            <input 
              type="date" 
              value={dataInicio} 
              onChange={e => setDataInicio(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Final</label>
            <input 
              type="date" 
              value={dataFim} 
              onChange={e => setDataFim(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" 
            />
          </div>
          <div className="flex items-end gap-2">
            <button 
              onClick={gerarRelatorio}
              className="flex-1 bg-slate-600 active:bg-emerald-600 text-white p-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-xl shadow-slate-100 active:shadow-emerald-100"
            >
              <TrendingUp size={20} /> GERAR
            </button>
            {reportResult && (
              <button 
                onClick={exportarPDF}
                className="bg-slate-600 active:bg-emerald-600 text-white p-4 rounded-2xl font-black transition-all shadow-xl shadow-slate-100 active:shadow-emerald-100"
                title="Exportar PDF"
              >
                <Download size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h3 className="text-lg font-black mb-8 text-slate-800 flex items-center gap-2">
            <TrendingUp size={20} className="text-indigo-600" /> Vendas nos Últimos 7 Dias
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 700}}
                  cursor={{fill: '#f8fafc'}}
                />
                <Bar dataKey="total" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h3 className="text-lg font-black mb-8 text-slate-800 flex items-center gap-2">
            <Package size={20} className="text-indigo-600" /> Top 5 Produtos Vendidos
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 700}}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Report Table View */}
      {reportResult && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Prévia do Relatório</h3>
            <div className="flex gap-4">
              {reportResult.totals?.map((t, i) => (
                <div key={i} className="text-right">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.label}</div>
                  <div className="text-lg font-black text-indigo-600">{t.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                  {reportResult.headers.map((h, i) => (
                    <th key={i} className="p-6 border-b border-slate-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reportResult.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors group">
                    {row.map((cell, j) => (
                      <td key={j} className="p-6 text-sm font-bold text-slate-600 group-hover:text-slate-900">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fechar Mes Modal */}
      {showFecharMesModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-100 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarOff size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-slate-800">Fechar Período</h3>
            <p className="text-slate-500 mb-8">ATENÇÃO: Isso irá gerar um PDF com o balanço geral do sistema e APAGAR todo o seu histórico de vendas e gastos. Deseja continuar?</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowFecharMesModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition font-medium flex-1">Cancelar</button>
              <button onClick={fecharMes} className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium shadow-sm flex-1">Sim, Fechar Período</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
