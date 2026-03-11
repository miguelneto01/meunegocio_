import { useState } from 'react';
import firebase, { db } from '../firebase';
import { useAuth, useData } from '../store';
import { showToast } from './Toast';
import { Search, Printer, Calendar, Clock, User, DollarSign, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

import { formatCurrency } from '../utils';

export default function HistoricoVendas() {
  const { user } = useAuth();
  const { vendas } = useData();
  const [busca, setBusca] = useState('');
  const [vendaSelecionada, setVendaSelecionada] = useState<any>(null);
  const [vendaParaExcluir, setVendaParaExcluir] = useState<any>(null);

  const filtered = vendas.filter(v => 
    (v.clienteNome || '').toLowerCase().includes(busca.toLowerCase()) ||
    (v.formaPagamento || '').toLowerCase().includes(busca.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  const handleDeleteVenda = async () => {
    if (!vendaParaExcluir) return;
    if (user?.tipo !== 'admin') return showToast('Apenas admin pode excluir vendas', 'error');

    try {
      const batch = db.batch();
      
      // Restore stock
      if (vendaParaExcluir.itens && Array.isArray(vendaParaExcluir.itens)) {
        for (const item of vendaParaExcluir.itens) {
          if (item.id) {
            const ref = db.collection('produtos').doc(item.id);
            batch.update(ref, { estoque: firebase.firestore.FieldValue.increment(item.quantidade) });
          }
        }
      }
      
      // Delete sale
      batch.delete(db.collection('vendas').doc(vendaParaExcluir.id));
      await batch.commit();
      
      showToast('Venda excluída e estoque restaurado', 'success');
      setVendaParaExcluir(null);
    } catch (e) {
      console.error(e);
      showToast('Erro ao excluir venda', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800 print:hidden">Histórico de Vendas</h2>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 print:hidden">
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por cliente ou pagamento..." 
            value={busca} 
            onChange={e => setBusca(e.target.value)} 
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none" 
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm uppercase tracking-wider">
                <th className="p-4 font-medium rounded-tl-xl">Data</th>
                <th className="p-4 font-medium">Cliente</th>
                <th className="p-4 font-medium">Pagamento</th>
                <th className="p-4 font-medium">Total</th>
                <th className="p-4 font-medium rounded-tr-xl">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(v => {
                const dataVenda = v.data?.toDate ? v.data.toDate() : new Date(v.data);
                return (
                  <tr key={v.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 text-slate-600">{format(dataVenda, 'dd/MM/yyyy HH:mm')}</td>
                    <td className="p-4 font-medium text-slate-800">{v.clienteNome || 'Cliente não informado'}</td>
                    <td className="p-4 uppercase text-sm font-semibold text-slate-600">{v.formaPagamento === 'credito' ? 'FIADO' : v.formaPagamento}</td>
                    <td className="p-4 font-bold text-emerald-600">{formatCurrency(v.total)}</td>
                    <td className="p-4 flex gap-2">
                      <button 
                        onClick={() => setVendaSelecionada(v)} 
                        className="bg-emerald-100 text-emerald-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-200 transition flex items-center gap-2"
                      >
                        <Printer size={16} /> Ver Recibo
                      </button>
                      {user?.tipo === 'admin' && (
                        <button 
                          onClick={() => setVendaParaExcluir(v)} 
                          className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-200 transition flex items-center gap-2"
                          title="Excluir Venda"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhuma venda encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recibo Modal / Print Area */}
      {vendaSelecionada && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:p-0 print:bg-white print:static print:block">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-xl border border-slate-100 print:shadow-none print:border-none print:w-full print:max-w-none print:rounded-none">
            
            {/* Print Content */}
            <div className="text-center mb-6 border-b border-dashed border-slate-300 pb-6">
              <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-widest mb-1">Recibo de Venda</h2>
              <p className="text-sm text-slate-500">Comprovante não fiscal</p>
            </div>

            <div className="space-y-3 mb-6 text-sm text-slate-700">
              <div className="flex items-center gap-2"><User size={16} className="text-slate-400"/> <strong>Vendedor:</strong> {vendaSelecionada.vendedorNome || user?.displayName}</div>
              <div className="flex items-center gap-2"><User size={16} className="text-slate-400"/> <strong>Cliente:</strong> {vendaSelecionada.clienteNome || 'Não informado'}</div>
              <div className="flex items-center gap-2"><Calendar size={16} className="text-slate-400"/> <strong>Data:</strong> {format(vendaSelecionada.data?.toDate ? vendaSelecionada.data.toDate() : new Date(vendaSelecionada.data), 'dd/MM/yyyy')}</div>
              <div className="flex items-center gap-2"><Clock size={16} className="text-slate-400"/> <strong>Hora:</strong> {format(vendaSelecionada.data?.toDate ? vendaSelecionada.data.toDate() : new Date(vendaSelecionada.data), 'HH:mm:ss')}</div>
              <div className="flex items-center gap-2"><DollarSign size={16} className="text-slate-400"/> <strong>Pagamento:</strong> <span className="uppercase">{vendaSelecionada.formaPagamento === 'credito' ? 'FIADO' : vendaSelecionada.formaPagamento}</span></div>
            </div>

            <div className="border-t border-b border-dashed border-slate-300 py-4 mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="pb-2 font-medium">Qtd</th>
                    <th className="pb-2 font-medium">Produto</th>
                    <th className="pb-2 font-medium text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {vendaSelecionada.itens?.map((item: any, i: number) => (
                    <tr key={i}>
                      <td className="py-1 text-slate-700">{item.quantidade}x</td>
                      <td className="py-1 text-slate-800 font-medium">{item.nome}</td>
                      <td className="py-1 text-right text-slate-700">{formatCurrency(item.preco * item.quantidade)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center text-lg font-bold text-slate-800 mb-8">
              <span>TOTAL</span>
              <span>{formatCurrency(vendaSelecionada.total)}</span>
            </div>

            <div className="text-center text-xs text-slate-400 mt-8 print:block">
              <p>Obrigado pela preferência!</p>
              <p className="mt-1">Volte sempre.</p>
            </div>

            {/* Actions (Hidden in Print) */}
            <div className="mt-8 flex justify-end gap-3 print:hidden">
              <button onClick={() => setVendaSelecionada(null)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition font-medium">Fechar</button>
              <button onClick={handlePrint} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-medium shadow-sm flex items-center gap-2">
                <Printer size={18} /> Imprimir Recibo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {vendaParaExcluir && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-100 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-slate-800">Excluir Venda</h3>
            <p className="text-slate-500 mb-8">Tem certeza que deseja excluir esta venda? O estoque dos produtos será restaurado.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setVendaParaExcluir(null)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition font-medium flex-1">Cancelar</button>
              <button onClick={handleDeleteVenda} className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium shadow-sm flex-1">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
