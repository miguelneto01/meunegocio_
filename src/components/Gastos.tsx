import { useState } from 'react';
import { db } from '../firebase';
import { useAuth, useData } from '../store';
import { showToast } from './Toast';
import { Plus, Trash2, ArrowDownCircle, ArrowUpCircle, Search } from 'lucide-react';
import { format } from 'date-fns';

import { formatCurrency, parseCurrency, maskCurrency } from '../utils';

export default function Gastos() {
  const { user } = useAuth();
  const { gastos } = useData();
  const [busca, setBusca] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [form, setForm] = useState({ tipo: 'saida', descricao: '', valor: '', data: new Date().toISOString().slice(0, 10) });

  const handleSave = async () => {
    if (!form.descricao || !form.valor) return showToast('Preencha descrição e valor', 'error');
    
    try {
      await db.collection('gastos').add({
        tipo: form.tipo,
        descricao: form.descricao,
        valor: parseCurrency(form.valor),
        data: new Date(form.data + 'T12:00:00'), // Avoid timezone shift
        userId: user?.id
      });
      showToast('Registro salvo com sucesso', 'success');
      setShowModal(false);
      setForm({ tipo: 'saida', descricao: '', valor: '', data: new Date().toISOString().slice(0, 10) });
    } catch (e) {
      showToast('Erro ao salvar registro', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await db.collection('gastos').doc(id).delete();
      showToast('Registro excluído', 'success');
      setShowDeleteModal(null);
    } catch (e) {
      showToast('Erro ao excluir registro', 'error');
    }
  };

  const filtered = gastos.filter(g => (g.descricao || '').toLowerCase().includes(busca.toLowerCase()));
  
  const totalEntradas = filtered.filter(g => g.tipo === 'entrada').reduce((acc, g) => acc + g.valor, 0);
  const totalSaidas = filtered.filter(g => g.tipo === 'saida').reduce((acc, g) => acc + g.valor, 0);
  const saldo = totalEntradas - totalSaidas;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Fluxo de Caixa (Gastos & Entradas)</h2>
        <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition shadow-sm font-medium">
          <Plus size={20} /> Novo Lançamento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-emerald-100 text-emerald-600 p-4 rounded-xl"><ArrowDownCircle size={24} /></div>
          <div>
            <div className="text-sm font-medium text-slate-500">Total Entradas</div>
            <div className="text-2xl font-bold text-slate-800">{formatCurrency(totalEntradas)}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-red-100 text-red-600 p-4 rounded-xl"><ArrowUpCircle size={24} /></div>
          <div>
            <div className="text-sm font-medium text-slate-500">Total Saídas</div>
            <div className="text-2xl font-bold text-slate-800">{formatCurrency(totalSaidas)}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className={`p-4 rounded-xl ${saldo >= 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'}`}>
            <span className="font-bold text-xl">R$</span>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Saldo do Período</div>
            <div className={`text-2xl font-bold ${saldo >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>
              {formatCurrency(saldo)}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Buscar descrição..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm uppercase tracking-wider">
                <th className="p-4 font-medium rounded-tl-xl">Data</th>
                <th className="p-4 font-medium">Descrição</th>
                <th className="p-4 font-medium">Tipo</th>
                <th className="p-4 font-medium">Valor</th>
                <th className="p-4 font-medium rounded-tr-xl">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(g => (
                <tr key={g.id} className="hover:bg-slate-50 transition">
                  <td className="p-4 text-slate-600">
                    {g.data?.toDate ? format(g.data.toDate(), 'dd/MM/yyyy') : new Date(g.data).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-4 font-medium text-slate-800">{g.descricao}</td>
                  <td className="p-4">
                    {g.tipo === 'entrada' 
                      ? <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-xs font-bold flex items-center w-max gap-1"><ArrowDownCircle size={14}/> ENTRADA</span>
                      : <span className="bg-red-100 text-red-700 px-2 py-1 rounded-md text-xs font-bold flex items-center w-max gap-1"><ArrowUpCircle size={14}/> SAÍDA</span>
                    }
                  </td>
                  <td className={`p-4 font-bold ${g.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(g.valor)}
                  </td>
                  <td className="p-4">
                    <button onClick={() => setShowDeleteModal(g.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum registro encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-100">
            <h3 className="text-xl font-bold mb-4 text-slate-800">Novo Lançamento</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                  <option value="saida">Saída (Gasto)</option>
                  <option value="entrada">Entrada (Recebimento)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Data</label>
                <input type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Descrição</label>
                <input type="text" placeholder="Ex: Conta de Luz, Pagamento Fiado..." value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Valor (R$)</label>
                <input type="text" placeholder="0,00" value={form.valor} onChange={e => setForm({...form, valor: maskCurrency(e.target.value)})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition font-medium">Cancelar</button>
              <button onClick={handleSave} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium shadow-sm">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-100 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-slate-800">Excluir Registro</h3>
            <p className="text-slate-500 mb-8">Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowDeleteModal(null)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition font-medium flex-1">Cancelar</button>
              <button onClick={() => handleDelete(showDeleteModal)} className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium shadow-sm flex-1">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
