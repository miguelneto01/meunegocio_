import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { useAuth, useData } from '../store';
import { showToast } from './Toast';
import { Trash2, UserPlus, Edit, ShieldCheck, AlertTriangle, Key, Calendar, Plus, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';
import firebase from 'firebase/compat/app';

export default function Admin() {
  const { user } = useAuth();
  const { produtos, clientes, vendas, gastos, credito, tokens } = useData();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [form, setForm] = useState({ login: '', senha: '', displayName: '' });
  const [activeTab, setActiveTab] = useState<'users' | 'access' | 'tokens'>('users');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: '', login: '', senha: '', displayName: '', ativo: true });

  // Custom Modals State
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showZerarModal, setShowZerarModal] = useState(false);
  const [zerarInput, setZerarInput] = useState('');

  useEffect(() => {
    if (user?.tipo !== 'admin') return;
    const unsubscribe = db.collection('usuarios').onSnapshot(snap => {
      setUsuarios(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const handleCreateUser = async () => {
    if (!form.login || !form.senha) return showToast('Preencha login e senha', 'error');
    try {
      const snap = await db.collection('usuarios').where('login', '==', form.login).get();
      if (!snap.empty) return showToast('Login já existe', 'error');
      
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);

      await db.collection('usuarios').add({
        login: form.login,
        senha: form.senha,
        displayName: form.displayName || form.login,
        ativo: true,
        accessExpiresAt: firebase.firestore.Timestamp.fromDate(expirationDate)
      });
      showToast('Usuário criado com 30 dias de acesso', 'success');
      setForm({ login: '', senha: '', displayName: '' });
    } catch (e) {
      showToast('Erro ao criar usuário', 'error');
    }
  };

  const handleUpdateUser = async () => {
    if (!editForm.login) return showToast('Login não pode ser vazio', 'error');
    
    try {
      const updateData: any = {
        login: editForm.login,
        displayName: editForm.displayName,
        ativo: editForm.ativo
      };
      
      if (editForm.senha.trim() !== '') {
        updateData.senha = editForm.senha;
      }

      await db.collection('usuarios').doc(editForm.id).update(updateData);
      showToast('Usuário atualizado com sucesso', 'success');
      setShowEditModal(false);
    } catch (e) {
      showToast('Erro ao atualizar usuário', 'error');
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await db.collection('usuarios').doc(id).delete();
      showToast('Usuário excluído', 'success');
      setShowDeleteModal(null);
    } catch (e) {
      showToast('Erro ao excluir usuário', 'error');
    }
  };

  const generateTokens = async () => {
    setIsGenerating(true);
    try {
      const batch = db.batch();
      for (let i = 0; i < 12; i++) {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        let code = '';
        for (let j = 0; j < 5; j++) code += letters.charAt(Math.floor(Math.random() * letters.length));
        for (let j = 0; j < 5; j++) code += numbers.charAt(Math.floor(Math.random() * numbers.length));
        code = code.split('').sort(() => Math.random() - 0.5).join('');
        const tokenRef = db.collection('tokens').doc();
        batch.set(tokenRef, {
          code,
          used: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      await batch.commit();
      showToast('12 novas chaves geradas!', 'success');
    } catch (error) {
      showToast('Erro ao gerar chaves', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const updateUserAccess = async (userId: string, days: number | null) => {
    try {
      let newDate: any = null;
      if (days !== null) {
        const u = usuarios.find(u => u.id === userId);
        const currentExp = u?.accessExpiresAt?.toDate ? u.accessExpiresAt.toDate() : (u?.accessExpiresAt ? new Date(u.accessExpiresAt) : new Date());
        const baseDate = currentExp > new Date() ? currentExp : new Date();
        newDate = new Date(baseDate);
        newDate.setDate(newDate.getDate() + days);
      }
      await db.collection('usuarios').doc(userId).update({
        accessExpiresAt: newDate ? firebase.firestore.Timestamp.fromDate(newDate) : null
      });
      showToast('Acesso atualizado!', 'success');
    } catch (error) {
      showToast('Erro ao atualizar acesso', 'error');
    }
  };

  const setCustomDate = async (userId: string, dateStr: string) => {
    if (!dateStr) return;
    try {
      const newDate = new Date(dateStr);
      await db.collection('usuarios').doc(userId).update({
        accessExpiresAt: firebase.firestore.Timestamp.fromDate(newDate)
      });
      showToast('Data de acesso definida!', 'success');
    } catch (error) {
      showToast('Erro ao definir data', 'error');
    }
  };

  const deleteToken = async (tokenId: string) => {
    if (!confirm('Excluir esta chave?')) return;
    try {
      await db.collection('tokens').doc(tokenId).delete();
      showToast('Chave excluída', 'success');
    } catch (error) {
      showToast('Erro ao excluir chave', 'error');
    }
  };

  const handleZerarSistema = async () => {
    if (zerarInput !== 'ZerarTudo') {
      return showToast('Texto de confirmação incorreto.', 'error');
    }

    try {
      const chunkSize = 500;
      const deleteInChunks = async (collectionName: string, items: any[]) => {
        for (let i = 0; i < items.length; i += chunkSize) {
          const chunk = items.slice(i, i + chunkSize);
          const batch = db.batch();
          chunk.forEach(item => {
            batch.delete(db.collection(collectionName).doc(item.id));
          });
          await batch.commit();
        }
      };

      await deleteInChunks('produtos', produtos);
      await deleteInChunks('clientes', clientes);
      await deleteInChunks('vendas', vendas);
      await deleteInChunks('gastos', gastos);
      await deleteInChunks('credito', credito);
      await deleteInChunks('usuarios', usuarios);

      showToast('Sistema zerado com sucesso!', 'success');
      setShowZerarModal(false);
      setZerarInput('');
    } catch (e) {
      console.error(e);
      showToast('Erro ao zerar sistema', 'error');
    }
  };

  const openEditModal = (u: any) => {
    setEditForm({
      id: u.id,
      login: u.login,
      senha: '',
      displayName: u.displayName || '',
      ativo: u.ativo !== false
    });
    setShowEditModal(true);
  };

  if (user?.tipo !== 'admin') return <div>Acesso negado</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck size={32} className="text-indigo-600" />
          <h2 className="text-2xl font-bold text-slate-800">Painel Administrativo</h2>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'users' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Usuários</button>
          <button onClick={() => setActiveTab('access')} className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'access' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Acessos</button>
          <button onClick={() => setActiveTab('tokens')} className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'tokens' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Chaves</button>
        </div>

        <button 
          onClick={() => setShowZerarModal(true)}
          className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-red-100 transition-all border border-red-100"
        >
          <AlertTriangle size={18} /> ZERAR SISTEMA
        </button>
      </div>
      
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-6">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800">
                <UserPlus size={20} className="text-indigo-600" /> Novo Usuário
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Login</label>
                  <input type="text" placeholder="Ex: joao.silva" value={form.login} onChange={e => setForm({...form, login: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Senha</label>
                  <input type="password" placeholder="••••••••" value={form.senha} onChange={e => setForm({...form, senha: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nome de Exibição</label>
                  <input type="text" placeholder="Ex: João Silva" value={form.displayName} onChange={e => setForm({...form, displayName: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <button onClick={handleCreateUser} className="w-full bg-slate-600 active:bg-emerald-600 text-white py-3.5 rounded-xl transition font-semibold shadow-sm mt-2 active:shadow-emerald-200">
                  Cadastrar Usuário
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold mb-6 text-slate-800">Usuários Cadastrados</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {usuarios.map(u => (
                  <div key={u.id} className="flex flex-col p-5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="font-bold text-slate-800 text-lg">{u.displayName || u.login}</div>
                        <div className="text-sm text-slate-500 font-medium">@{u.login}</div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${u.ativo !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {u.ativo !== false ? 'ATIVO' : 'INATIVO'}
                      </span>
                    </div>
                    <div className="flex justify-end gap-2 mt-auto pt-4 border-t border-slate-200">
                      <button onClick={() => openEditModal(u)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                        <Edit size={16} /> Editar
                      </button>
                      <button onClick={() => setShowDeleteModal(u.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Trash2 size={16} /> Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'access' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-sm font-bold text-slate-600">Usuário</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-600">Expira em</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-600">Status</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-600 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map(u => {
                  const expDate = u.accessExpiresAt?.toDate ? u.accessExpiresAt.toDate() : (u.accessExpiresAt ? new Date(u.accessExpiresAt) : null);
                  const isExpired = !expDate || expDate < new Date();
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-medium text-slate-900">{u.displayName || u.login}</td>
                      <td className="px-6 py-4">
                        {expDate ? (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Calendar size={16} className="text-slate-400" />
                            {expDate.toLocaleDateString('pt-BR')}
                          </div>
                        ) : <span className="text-slate-400 italic">Sem acesso</span>}
                      </td>
                      <td className="px-6 py-4">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                            <XCircle size={12} /> Expirado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                            <CheckCircle size={12} /> Ativo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <input type="date" onChange={(e) => setCustomDate(u.id, e.target.value)} className="text-xs border border-slate-200 rounded p-1 outline-none" />
                          <button onClick={() => updateUserAccess(u.id, 30)} title="+30 dias" className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Plus size={18} /></button>
                          <button onClick={() => updateUserAccess(u.id, null)} title="Cancelar" className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'tokens' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={generateTokens} disabled={isGenerating} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg disabled:opacity-50">
              <RefreshCw size={18} className={isGenerating ? 'animate-spin' : ''} /> Gerar 12 Chaves
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tokens.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map(t => (
              <div key={t.id} className={`p-4 rounded-2xl border ${t.used ? 'bg-slate-50 opacity-60' : 'bg-white border-indigo-100 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-indigo-600 font-mono font-bold tracking-wider">
                    <Key size={16} /> 
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(t.code);
                        showToast('Chave copiada!', 'success');
                      }}
                      className="hover:underline"
                      title="Clique para copiar"
                    >
                      {t.code}
                    </button>
                  </div>
                  {!t.used && <button onClick={() => deleteToken(t.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-slate-400"><Clock size={12} /> {t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString('pt-BR') : 'Recente'}</div>
                  {t.used ? <span className="text-amber-600 font-bold">Utilizada</span> : <span className="text-emerald-600 font-bold">Disponível</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals remain the same but use the updated state/handlers */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-100">
            <h3 className="text-xl font-bold mb-6 text-slate-800">Editar Usuário</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Login</label>
                <input type="text" value={editForm.login} onChange={e => setEditForm({...editForm, login: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nome de Exibição</label>
                <input type="text" value={editForm.displayName} onChange={e => setEditForm({...editForm, displayName: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nova Senha <span className="text-slate-400 font-normal">(deixe em branco para não alterar)</span></label>
                <input type="password" placeholder="••••••••" value={editForm.senha} onChange={e => setEditForm({...editForm, senha: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition">
                  <input type="checkbox" checked={editForm.ativo} onChange={e => setEditForm({...editForm, ativo: e.target.checked})} className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" />
                  <span className="font-semibold text-slate-700">Usuário Ativo (Pode fazer login)</span>
                </label>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setShowEditModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition font-medium">Cancelar</button>
              <button onClick={handleUpdateUser} className="px-5 py-2.5 bg-slate-600 active:bg-emerald-600 text-white rounded-xl transition font-medium shadow-sm active:shadow-emerald-200">Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-100 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-slate-800">Excluir Usuário</h3>
            <p className="text-slate-500 mb-8">Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowDeleteModal(null)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition font-medium flex-1">Cancelar</button>
              <button onClick={() => handleDeleteUser(showDeleteModal)} className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium shadow-sm flex-1">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      {showZerarModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-100 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-slate-800">Zerar Sistema</h3>
            <p className="text-slate-500 mb-6 text-sm">
              ATENÇÃO: Isso irá apagar TODOS os dados do sistema (vendas, produtos, clientes, gastos, fiados e usuários).
            </p>
            <div className="text-left mb-8">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Digite <span className="text-red-600 font-black">ZerarTudo</span> para confirmar:</label>
              <input 
                type="text" 
                value={zerarInput} 
                onChange={e => setZerarInput(e.target.value)} 
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-center font-bold" 
                placeholder="ZerarTudo"
              />
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={() => { setShowZerarModal(false); setZerarInput(''); }} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition font-medium flex-1">Cancelar</button>
              <button onClick={handleZerarSistema} className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium shadow-sm flex-1">Zerar Sistema</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
