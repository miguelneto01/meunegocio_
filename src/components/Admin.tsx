import { useState, useEffect } from 'react';
import firebase, { db } from '../firebase';
import { useAuth, useData } from '../store';
import { showToast } from './Toast';
import { Trash2, UserPlus, Edit, ShieldCheck, AlertTriangle, Key, Calendar, Plus, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';

export default function Admin() {
  const { user } = useAuth();
  const { produtos, clientes, vendas, gastos, credito } = useData();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  const [activeAdminTab, setActiveAdminTab] = useState<'usuarios' | 'tokens'>('usuarios');
  const [form, setForm] = useState({ login: '', senha: '', displayName: '', dias: '30' });
  
  // Edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: '', login: '', senha: '', displayName: '', ativo: true, expiracao: '', diasAdicionais: '0' });

  // Custom Modals State
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showZerarModal, setShowZerarModal] = useState(false);
  const [zerarInput, setZerarInput] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (user?.login !== 'miguelneto0x') return;
    const unsubUsers = db.collection('usuarios').onSnapshot(snap => {
      setUsuarios(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubTokens = db.collection('tokens').onSnapshot(snap => {
      setTokens(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => {
      unsubUsers();
      unsubTokens();
    };
  }, [user]);

  const handleCreateUser = async () => {
    if (!form.login || !form.senha) return showToast('Preencha login e senha', 'error');
    try {
      const snap = await db.collection('usuarios').where('login', '==', form.login).get();
      if (!snap.empty) return showToast('Login já existe', 'error');
      
      const dias = parseInt(form.dias) || 30;
      const expiracao = new Date();
      expiracao.setDate(expiracao.getDate() + dias);

      await db.collection('usuarios').add({
        login: form.login,
        senha: form.senha,
        displayName: form.displayName || form.login,
        ativo: true,
        tipo: 'user',
        expiracao: firebase.firestore.Timestamp.fromDate(expiracao)
      });
      showToast(`Usuário criado com ${dias} dias de acesso`, 'success');
      setForm({ login: '', senha: '', displayName: '', dias: '30' });
    } catch (e) {
      showToast('Erro ao criar usuário', 'error');
    }
  };

  const handleUpdateUser = async () => {
    if (!editForm.login) return showToast('Login não pode ser vazio', 'error');
    
    try {
      let novaExpiracao = new Date(editForm.expiracao);
      const diasAdicionais = parseInt(editForm.diasAdicionais) || 0;
      
      if (diasAdicionais > 0) {
        novaExpiracao.setDate(novaExpiracao.getDate() + diasAdicionais);
      }

      const updateData: any = {
        login: editForm.login,
        displayName: editForm.displayName,
        ativo: editForm.ativo,
        expiracao: firebase.firestore.Timestamp.fromDate(novaExpiracao)
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

  const handleZerarSistema = async () => {
    if (zerarInput !== 'ZerarTudo') {
      return showToast('Texto de confirmação incorreto.', 'error');
    }

    try {
      // Firestore batch limit is 500 operations
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

  const generateToken = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    let res = '';
    for (let i = 0; i < 5; i++) res += letters.charAt(Math.floor(Math.random() * letters.length));
    for (let i = 0; i < 5; i++) res += numbers.charAt(Math.floor(Math.random() * numbers.length));
    return res;
  };

  const handleGenerateTokens = async (count: number) => {
    try {
      const batch = db.batch();
      for (let i = 0; i < count; i++) {
        const token = generateToken();
        const ref = db.collection('tokens').doc(token);
        batch.set(ref, {
          criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
          usada: false,
          valor: token
        });
      }
      await batch.commit();
      showToast(`${count} chaves geradas com sucesso`, 'success');
    } catch (e) {
      showToast('Erro ao gerar chaves', 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    setTimeout(() => setCopiedToken(null), 2000);
    showToast('Chave copiada!', 'success');
  };

  const openEditModal = (u: any) => {
    const expDate = u.expiracao?.toDate ? u.expiracao.toDate() : (u.expiracao ? new Date(u.expiracao) : new Date());
    setEditForm({
      id: u.id,
      login: u.login,
      senha: '', 
      displayName: u.displayName || '',
      ativo: u.ativo !== false,
      expiracao: expDate.toISOString().split('T')[0],
      diasAdicionais: '0'
    });
    setShowEditModal(true);
  };

  if (user?.login !== 'miguelneto0x') return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="text-center">
        <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso Negado</h2>
        <p className="text-slate-500">Apenas o administrador mestre tem acesso a este painel.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck size={32} className="text-indigo-600" />
          <h2 className="text-2xl font-bold text-slate-800">Painel Administrativo</h2>
        </div>
        <button 
          onClick={() => setShowZerarModal(true)}
          className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-red-100 transition-all border border-red-100"
        >
          <AlertTriangle size={18} /> ZERAR SISTEMA
        </button>
      </div>
      
      <div className="flex items-center gap-4 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm w-fit">
        <button 
          onClick={() => setActiveAdminTab('usuarios')}
          className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeAdminTab === 'usuarios' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          Usuários
        </button>
        <button 
          onClick={() => setActiveAdminTab('tokens')}
          className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeAdminTab === 'tokens' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          Chaves de Acesso
        </button>
      </div>
      
      {activeAdminTab === 'usuarios' ? (
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
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Dias de Acesso</label>
                  <input type="number" placeholder="30" value={form.dias} onChange={e => setForm({...form, dias: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
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
                {usuarios.filter(u => u.id !== 'admin' && u.login !== 'miguelneto0x').map(u => {
                  const expDate = u.expiracao?.toDate ? u.expiracao.toDate() : (u.expiracao ? new Date(u.expiracao) : null);
                  const isExpiringSoon = expDate && (expDate.getTime() - new Date().getTime()) < (7 * 24 * 60 * 60 * 1000);
                  const isExpired = expDate && expDate < new Date();

                  return (
                    <div key={u.id} className={`flex flex-col p-5 rounded-2xl border transition-all ${isExpired ? 'bg-red-50 border-red-200' : isExpiringSoon ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'} hover:border-indigo-300`}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="font-bold text-slate-800 text-lg">{u.displayName || u.login}</div>
                          <div className="text-sm text-slate-500 font-medium">@{u.login}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${u.ativo !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {u.ativo !== false ? 'ATIVO' : 'INATIVO'}
                          </span>
                          {isExpired && <span className="text-[10px] font-bold text-red-600 uppercase">Expirado</span>}
                          {!isExpired && isExpiringSoon && <span className="text-[10px] font-bold text-amber-600 uppercase">Vence em breve</span>}
                        </div>
                      </div>
                      
                      <div className={`flex items-center gap-2 text-xs font-bold mb-4 p-2 rounded-xl border ${isExpired ? 'bg-red-100/50 text-red-700 border-red-100' : isExpiringSoon ? 'bg-amber-100/50 text-amber-700 border-amber-100' : 'bg-white text-slate-500 border-slate-100'}`}>
                        <Calendar size={14} className={isExpired ? 'text-red-500' : isExpiringSoon ? 'text-amber-500' : 'text-indigo-500'} />
                        Expira em: {expDate ? format(expDate, 'dd/MM/yyyy') : 'Não definida'}
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
                  );
                })}
                {usuarios.length <= 1 && (
                  <div className="col-span-full text-center py-12 text-slate-500">
                    Nenhum usuário cadastrado além do administrador.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Gerenciar Chaves</h3>
                <p className="text-slate-500 text-sm">Gere chaves de acesso para liberar o sistema por 30 dias.</p>
              </div>
              <button 
                onClick={() => handleGenerateTokens(12)}
                className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-100 active:scale-95 transition-all"
              >
                <Plus size={18} /> Gerar 12 Chaves
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {tokens.sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0)).map(t => (
                <div key={t.id} className={`p-4 rounded-2xl border-2 transition-all ${t.usada ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100 hover:border-emerald-200 shadow-sm'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className={`p-2 rounded-lg ${t.usada ? 'bg-slate-200 text-slate-500' : 'bg-emerald-50 text-emerald-600'}`}>
                      <Key size={16} />
                    </div>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase ${t.usada ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>
                      {t.usada ? 'Utilizada' : 'Disponível'}
                    </span>
                  </div>
                  <div className="font-mono font-black text-lg tracking-widest text-slate-800 mb-4 text-center select-all">
                    {t.valor}
                  </div>
                  {!t.usada && (
                    <button 
                      onClick={() => copyToClipboard(t.valor)}
                      className="w-full py-2 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      {copiedToken === t.valor ? <Check size={14} /> : <Copy size={14} />}
                      {copiedToken === t.valor ? 'Copiado' : 'Copiar Chave'}
                    </button>
                  )}
                  {t.usada && (
                    <div className="text-[9px] text-slate-400 font-bold text-center uppercase">
                      Usada em {t.dataUso?.toDate ? format(t.dataUso.toDate(), 'dd/MM/yyyy') : '-'}
                    </div>
                  )}
                </div>
              ))}
              {tokens.length === 0 && (
                <div className="col-span-full text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <Key size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhuma chave gerada ainda.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Data de Expiração</label>
                  <input type="date" value={editForm.expiracao} onChange={e => setEditForm({...editForm, expiracao: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Adicionar Dias</label>
                  <input type="number" placeholder="Ex: 30" value={editForm.diasAdicionais} onChange={e => setEditForm({...editForm, diasAdicionais: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition">
                    <input type="checkbox" checked={editForm.ativo} onChange={e => setEditForm({...editForm, ativo: e.target.checked})} className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" />
                    <span className="font-semibold text-slate-700">Usuário Ativo</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setShowEditModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition font-medium">Cancelar</button>
              <button onClick={handleUpdateUser} className="px-5 py-2.5 bg-slate-600 active:bg-emerald-600 text-white rounded-xl transition font-medium shadow-sm active:shadow-emerald-200">Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
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

      {/* Zerar Sistema Modal */}
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
