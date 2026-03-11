import { useState } from 'react';
import { db } from '../firebase';
import { useAuth, useData } from '../store';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { showToast } from './Toast';

import { formatCurrency, parseCurrency, maskCurrency } from '../utils';

export default function Produtos() {
  const { user } = useAuth();
  const { produtos } = useData();
  const [busca, setBusca] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [editId, setEditId] = useState('');
  const [form, setForm] = useState({ nome: '', custo: '', preco: '', estoque: '' });

  const handleSave = async () => {
    if (!form.nome) return showToast('Nome é obrigatório', 'error');
    const data = {
      nome: form.nome,
      custo: parseCurrency(form.custo),
      preco: parseCurrency(form.preco),
      estoque: parseInt(form.estoque) || 0,
      userId: user?.id,
    };
    try {
      if (editId) {
        await db.collection('produtos').doc(editId).update(data);
        showToast('Produto atualizado', 'success');
      } else {
        await db.collection('produtos').add(data);
        showToast('Produto cadastrado', 'success');
      }
      setShowModal(false);
    } catch (e) {
      showToast('Erro ao salvar', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await db.collection('produtos').doc(id).delete();
      showToast('Produto excluído', 'success');
      setShowDeleteModal(null);
    } catch (e) {
      showToast('Erro ao excluir produto', 'error');
    }
  };

  const filtered = produtos.filter(p => (p.nome || '').toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Produtos</h2>
        <button onClick={() => { setEditId(''); setForm({ nome: '', custo: '', preco: '', estoque: '' }); setShowModal(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition">
          <Plus size={20} /> Novo Produto
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Buscar produtos..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm uppercase tracking-wider">
                <th className="p-4 font-medium rounded-tl-xl">Nome</th>
                <th className="p-4 font-medium">Custo</th>
                <th className="p-4 font-medium">Preço</th>
                <th className="p-4 font-medium">Estoque</th>
                <th className="p-4 font-medium rounded-tr-xl">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition">
                  <td className="p-4">{p.nome}</td>
                  <td className="p-4">{formatCurrency(p.custo)}</td>
                  <td className="p-4">{formatCurrency(p.preco)}</td>
                  <td className="p-4">{p.estoque}</td>
                  <td className="p-4 flex gap-2">
                    <button onClick={() => { setEditId(p.id); setForm({ nome: p.nome, custo: maskCurrency(p.custo.toString()), preco: maskCurrency(p.preco.toString()), estoque: p.estoque.toString() }); setShowModal(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"><Edit size={18} /></button>
                    <button onClick={() => setShowDeleteModal(p.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold mb-4">{editId ? 'Editar Produto' : 'Novo Produto'}</h3>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Nome</label><input type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full p-2 border rounded-xl" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Custo (R$)</label><input type="text" value={form.custo} onChange={e => setForm({...form, custo: maskCurrency(e.target.value)})} className="w-full p-2 border rounded-xl font-bold" placeholder="0,00" /></div>
                <div><label className="block text-sm font-medium mb-1">Preço (R$)</label><input type="text" value={form.preco} onChange={e => setForm({...form, preco: maskCurrency(e.target.value)})} className="w-full p-2 border rounded-xl font-bold" placeholder="0,00" /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Estoque</label><input type="number" value={form.estoque} onChange={e => setForm({...form, estoque: e.target.value})} className="w-full p-2 border rounded-xl" /></div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition">Salvar</button>
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
            <h3 className="text-xl font-bold mb-2 text-slate-800">Excluir Produto</h3>
            <p className="text-slate-500 mb-8">Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.</p>
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
