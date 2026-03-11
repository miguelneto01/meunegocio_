import { useState } from 'react';
import { db } from '../firebase';
import { useAuth, useData } from '../store';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { showToast } from './Toast';

export default function Clientes() {
  const { user } = useAuth();
  const { clientes } = useData();
  const [busca, setBusca] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [editId, setEditId] = useState('');
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', cep: '', endereco: '', numero: '', bairro: '', cidade: '' });

  const handleCEP = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setForm(prev => ({
            ...prev,
            cep: cleanCEP,
            endereco: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade
          }));
        }
      } catch (e) {
        console.error('Erro CEP:', e);
      }
    }
  };

  const handleSave = async () => {
    if (!form.nome) return showToast('Nome é obrigatório', 'error');
    const data = { ...form, userId: user?.id };
    try {
      if (editId) {
        await db.collection('clientes').doc(editId).update(data);
        showToast('Cliente atualizado', 'success');
      } else {
        await db.collection('clientes').add(data);
        showToast('Cliente cadastrado', 'success');
      }
      setShowModal(false);
    } catch (e) {
      showToast('Erro ao salvar', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await db.collection('clientes').doc(id).delete();
      showToast('Cliente excluído', 'success');
      setShowDeleteModal(null);
    } catch (e) {
      showToast('Erro ao excluir cliente', 'error');
    }
  };

  const filtered = clientes.filter(c => String(c.nome || '').toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
        <button onClick={() => { setEditId(''); setForm({ nome: '', telefone: '', email: '', cep: '', endereco: '', numero: '', bairro: '', cidade: '' }); setShowModal(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition">
          <Plus size={20} /> Novo Cliente
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Buscar clientes..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm uppercase tracking-wider">
                <th className="p-4 font-medium rounded-tl-xl">Nome</th>
                <th className="p-4 font-medium">Telefone</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium rounded-tr-xl">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition">
                  <td className="p-4">{c.nome}</td>
                  <td className="p-4">{c.telefone}</td>
                  <td className="p-4">{c.email}</td>
                  <td className="p-4 flex gap-2">
                    <button onClick={() => { setEditId(c.id); setForm({ nome: c.nome, telefone: c.telefone, email: c.email, cep: c.cep || '', endereco: c.endereco || '', numero: c.numero || '', bairro: c.bairro || '', cidade: c.cidade || '' }); setShowModal(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"><Edit size={18} /></button>
                    <button onClick={() => setShowDeleteModal(c.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={18} /></button>
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
            <h3 className="text-xl font-bold mb-4">{editId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Nome</label><input type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full p-2 border rounded-xl" /></div>
                <div><label className="block text-sm font-medium mb-1">Telefone</label><input type="text" value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} className="w-full p-2 border rounded-xl" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">CEP</label><input type="text" value={form.cep} onChange={e => { setForm({...form, cep: e.target.value}); handleCEP(e.target.value); }} className="w-full p-2 border rounded-xl" placeholder="00000-000" /></div>
                <div><label className="block text-sm font-medium mb-1">Bairro</label><input type="text" value={form.bairro} onChange={e => setForm({...form, bairro: e.target.value})} className="w-full p-2 border rounded-xl" /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Endereço</label><input type="text" value={form.endereco} onChange={e => setForm({...form, endereco: e.target.value})} className="w-full p-2 border rounded-xl" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Número</label><input type="text" value={form.numero} onChange={e => setForm({...form, numero: e.target.value})} className="w-full p-2 border rounded-xl" /></div>
                <div><label className="block text-sm font-medium mb-1">Cidade</label><input type="text" value={form.cidade} onChange={e => setForm({...form, cidade: e.target.value})} className="w-full p-2 border rounded-xl" /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full p-2 border rounded-xl" /></div>
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
            <h3 className="text-xl font-bold mb-2 text-slate-800">Excluir Cliente</h3>
            <p className="text-slate-500 mb-8">Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.</p>
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
