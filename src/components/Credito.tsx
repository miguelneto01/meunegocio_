import { useState } from 'react';
import { db } from '../firebase';
import { useAuth, useData } from '../store';
import { Search, DollarSign, CheckCircle, Trash2 } from 'lucide-react';
import { showToast } from './Toast';

import { formatCurrency, parseCurrency, maskCurrency } from '../utils';

export default function Credito() {
  const { user } = useAuth();
  const { credito: creditos } = useData();
  const [busca, setBusca] = useState('');
  const [apenasPendentes, setApenasPendentes] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLimparModal, setShowLimparModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<any>(null);
  const [negociacao, setNegociacao] = useState<any>(null);
  const [valorPago, setValorPago] = useState('');
  const [novasParcelas, setNovasParcelas] = useState('');

  const filtered = creditos.filter(c => {
    const matchNome = String(c.clienteNome || '').toLowerCase().includes(busca.toLowerCase());
    const matchStatus = apenasPendentes ? c.saldo > 0 : true;
    return matchNome && matchStatus;
  });

  const totalReceber = creditos.reduce((acc, c) => acc + (c.saldo || 0), 0);
  const clientesDebito = creditos.filter(c => c.saldo > 0).length;

  const handleNegociar = async () => {
    if (!negociacao) return;
    const pago = parseCurrency(valorPago);
    const novoSaldo = negociacao.saldo - pago;
    
    if (pago < 0 || pago > negociacao.saldo) {
      return showToast('Valor inválido', 'error');
    }

    const update: any = {
      saldo: novoSaldo,
      parcelasPagas: (negociacao.parcelasPagas || 0) + (pago > 0 ? 1 : 0)
    };

    if (novasParcelas) {
      update.parcelas = parseInt(novasParcelas);
      update.valorParcela = novoSaldo / parseInt(novasParcelas);
    }

    try {
      await db.collection('credito').doc(negociacao.id).update(update);
      
      if (pago > 0) {
        await db.collection('gastos').add({
          tipo: 'entrada',
          data: new Date(),
          descricao: `Pagamento de crédito - ${negociacao.clienteNome}`,
          valor: pago,
          userId: user?.id
        });
      }
      
      showToast('Negociação registrada com sucesso', 'success');
      setShowModal(false);
    } catch (e) {
      showToast('Erro ao registrar negociação', 'error');
    }
  };

  const limparQuitados = async () => {
    try {
      const quitados = creditos.filter(c => c.saldo <= 0);
      for (const q of quitados) {
        await db.collection('credito').doc(q.id).delete();
      }
      showToast('Registros quitados removidos', 'success');
      setShowLimparModal(false);
    } catch (e) {
      showToast('Erro ao limpar registros', 'error');
    }
  };

  const excluirCredito = async () => {
    if (!showDeleteModal) return;
    try {
      await db.collection('credito').doc(showDeleteModal.id).delete();
      showToast('Fiado excluído com sucesso', 'success');
      setShowDeleteModal(null);
    } catch (e) {
      showToast('Erro ao excluir fiado', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Crédito</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-emerald-100 text-emerald-600 p-4 rounded-xl"><DollarSign size={24} /></div>
          <div>
            <div className="text-sm font-medium text-slate-500">Total a Receber</div>
            <div className="text-2xl font-bold text-slate-800">{formatCurrency(totalReceber)}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-amber-100 text-amber-600 p-4 rounded-xl"><CheckCircle size={24} /></div>
          <div>
            <div className="text-sm font-medium text-slate-500">Clientes com Débito</div>
            <div className="text-2xl font-bold text-slate-800">{clientesDebito}</div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input type="text" placeholder="Buscar cliente..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={apenasPendentes} onChange={e => setApenasPendentes(e.target.checked)} className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" />
              <span className="text-sm font-medium text-slate-700">Apenas Pendentes</span>
            </label>
            <button onClick={() => setShowLimparModal(true)} className="text-sm text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition font-medium">
              Limpar Quitados
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm uppercase tracking-wider">
                <th className="p-4 font-medium rounded-tl-xl">Cliente</th>
                <th className="p-4 font-medium">Total</th>
                <th className="p-4 font-medium">Entrada</th>
                <th className="p-4 font-medium">Parcelas</th>
                <th className="p-4 font-medium">Val. Parcela</th>
                <th className="p-4 font-medium">Pagas</th>
                <th className="p-4 font-medium">Saldo</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium rounded-tr-xl">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition">
                  <td className="p-4 font-medium text-slate-800">{c.clienteNome}</td>
                  <td className="p-4">{formatCurrency(c.total)}</td>
                  <td className="p-4">{formatCurrency(c.entrada)}</td>
                  <td className="p-4">{c.parcelas}</td>
                  <td className="p-4">{formatCurrency(c.valorParcela)}</td>
                  <td className="p-4">{c.parcelasPagas || 0}</td>
                  <td className="p-4 font-bold text-slate-800">{formatCurrency(c.saldo)}</td>
                  <td className="p-4">
                    {c.saldo > 0 
                      ? <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-md text-xs font-bold">PENDENTE</span>
                      : <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-xs font-bold">QUITADO</span>
                    }
                  </td>
                  <td className="p-4 flex gap-2">
                    {c.saldo > 0 && (
                      <button onClick={() => {
                        setNegociacao(c);
                        setValorPago(maskCurrency(c.valorParcela.toString()));
                        setNovasParcelas('');
                        setShowModal(true);
                      }} className="bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-200 transition">
                        Pagar Parcela
                      </button>
                    )}
                    {user?.tipo === 'admin' && (
                      <button onClick={() => setShowDeleteModal(c)} className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-200 transition" title="Excluir Fiado">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-slate-500">Nenhum registro encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && negociacao && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold mb-2">Pagar Parcela</h3>
            <p className="text-slate-600 mb-4">Cliente: <span className="font-bold text-slate-800">{negociacao.clienteNome}</span></p>
            <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100">
              <div className="text-sm text-slate-500">Saldo Atual</div>
              <div className="text-2xl font-bold text-slate-800">{formatCurrency(negociacao.saldo)}</div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Valor a Pagar (R$)</label>
                <input 
                  type="text" 
                  value={valorPago} 
                  onChange={e => setValorPago(maskCurrency(e.target.value))} 
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" 
                  placeholder="0,00" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Novas Parcelas (Opcional)</label>
                <select value={novasParcelas} onChange={e => setNovasParcelas(e.target.value)} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Sem alteração</option>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n}x</option>)}
                </select>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition font-medium">Cancelar</button>
              <button onClick={handleNegociar} className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Limpar Quitados Confirmation Modal */}
      {showLimparModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-100 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-slate-800">Limpar Quitados</h3>
            <p className="text-slate-500 mb-8">Tem certeza que deseja remover todos os créditos já quitados? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowLimparModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition font-medium flex-1">Cancelar</button>
              <button onClick={limparQuitados} className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium shadow-sm flex-1">Sim, Limpar</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Active Credit Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-100 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-slate-800">Excluir Fiado</h3>
            <p className="text-slate-500 mb-8">Tem certeza que deseja excluir este fiado ativo de <strong>{showDeleteModal.clienteNome}</strong>? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowDeleteModal(null)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition font-medium flex-1">Cancelar</button>
              <button onClick={excluirCredito} className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium shadow-sm flex-1">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
