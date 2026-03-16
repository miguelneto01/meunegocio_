import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { useAuth } from '../store';
import { UserCircle, KeyRound, Save } from 'lucide-react';
import { showToast } from './Toast';

export default function Perfil() {
  const { user, setUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  const handleUpdateProfile = async () => {
    if (!displayName.trim()) return showToast('Nome não pode ser vazio', 'error');
    if (user?.id === 'admin') {
      setUser({ ...user, displayName });
      return showToast('Perfil atualizado (Admin local)', 'success');
    }

    try {
      await db.collection('usuarios').doc(user?.id).update({ displayName });
      setUser({ ...user!, displayName });
      showToast('Perfil atualizado com sucesso', 'success');
    } catch (e) {
      showToast('Erro ao atualizar perfil', 'error');
    }
  };

  const handleUpdatePassword = async () => {
    if (user?.id === 'admin') {
      return showToast('A senha do administrador padrão não pode ser alterada por aqui.', 'error');
    }
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      return showToast('Preencha todos os campos de senha', 'warning');
    }
    if (novaSenha !== confirmarSenha) {
      return showToast('As novas senhas não coincidem', 'error');
    }

    try {
      const doc = await db.collection('usuarios').doc(user?.id).get();
      if (doc.exists && doc.data()?.senha === senhaAtual) {
        await db.collection('usuarios').doc(user?.id).update({ senha: novaSenha });
        showToast('Senha alterada com sucesso', 'success');
        setSenhaAtual('');
        setNovaSenha('');
        setConfirmarSenha('');
      } else {
        showToast('Senha atual incorreta', 'error');
      }
    } catch (e) {
      showToast('Erro ao alterar senha', 'error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Meu Perfil</h2>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-700">
          <UserCircle size={20} /> Informações Pessoais
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Login / Usuário</label>
            <input type="text" value={user?.login} disabled className="w-full p-3 border rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Nome de Exibição</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <button onClick={handleUpdateProfile} className="bg-slate-600 active:bg-emerald-600 text-white px-6 py-2 rounded-xl font-medium transition flex items-center gap-2 shadow-sm active:shadow-emerald-200">
            <Save size={18} /> Salvar Alterações
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-700">
          <KeyRound size={20} /> Alterar Senha
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Senha Atual</label>
            <input type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Nova Senha</label>
            <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Confirmar Nova Senha</label>
            <input type="password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <button onClick={handleUpdatePassword} className="bg-slate-600 active:bg-emerald-600 text-white px-6 py-2 rounded-xl font-medium transition flex items-center gap-2 shadow-sm active:shadow-emerald-200">
            <Save size={18} /> Atualizar Senha
          </button>
        </div>
      </div>
    </div>
  );
}
