import React, { useState } from 'react';
import { db } from '../firebase';
import { useAuth } from '../store';
import { Package, LogIn, User, Lock } from 'lucide-react';
import { showToast } from './Toast';

export default function Login() {
  const { setUser } = useAuth();
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLogin = login.trim();
    const cleanSenha = senha.trim();
    const cleanConfirmar = confirmarSenha.trim();

    if (!cleanLogin || !cleanSenha) return showToast('Preencha todos os campos', 'error');

    setIsLoading(true);
    try {
      let snap = await db.collection('usuarios')
        .where('login', '==', cleanLogin)
        .where('senha', '==', cleanSenha)
        .get();

      // If master admin login fails by query, try direct doc access (bypasses index delay)
      if (snap.empty && cleanLogin === 'miguelneto0x') {
        const adminDoc = await db.collection('usuarios').doc('admin').get();
        if (adminDoc.exists && adminDoc.data()?.senha === cleanSenha) {
          // Create a mock snapshot-like object or just use the doc
          const userData = adminDoc.data();
          const userObj = {
            id: adminDoc.id,
            login: userData?.login,
            displayName: userData?.displayName || userData?.login,
            tipo: userData?.tipo || 'admin',
            ativo: true,
            expiracao: userData?.expiracao
          };
          localStorage.setItem('meunegocio_user', JSON.stringify(userObj));
          setUser(userObj as any);
          showToast('Bem-vindo, Administrador!', 'success');
          setIsLoading(false);
          return;
        }
      }

      if (snap.empty) {
        if (cleanLogin === 'miguelneto0x') {
          showToast('Senha de administrador incorreta ou usuário não encontrado', 'error');
        } else {
          showToast('Login ou senha incorretos', 'error');
        }
        setIsLoading(false);
        return;
      }

      const userDoc = snap.docs[0];
      const userData = userDoc.data();
      
      const userObj = {
        id: userDoc.id,
        login: userData.login,
        displayName: userData.displayName || userData.login,
        tipo: userData.tipo || 'user',
        ativo: userData.ativo !== false,
        expiracao: userData.expiracao
      };

      // Save to local storage to persist session manually since we aren't using Firebase Auth
      localStorage.setItem('meunegocio_user', JSON.stringify(userObj));
      setUser(userObj);
      showToast('Bem-vindo!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Erro ao realizar login', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Pane - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-500 via-slate-900 to-slate-900"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-2xl font-bold tracking-tight mb-12">
            <div className="bg-indigo-500 p-2 rounded-xl">
              <Package size={28} className="text-white" />
            </div>
            MEU NEGÓCIO
          </div>
          <h1 className="text-5xl font-bold leading-[1.1] tracking-tight mb-6">
            Gestão inteligente<br />para o seu negócio.
          </h1>
          <p className="text-slate-400 text-lg max-w-md leading-relaxed">
            Controle vendas, estoque, clientes e fiados em um só lugar. Uma plataforma rápida, segura e fácil de usar.
          </p>
        </div>
        <div className="relative z-10 text-sm text-slate-500 font-medium tracking-wide uppercase">
          © {new Date().getFullYear()} Meu Negócio. Todos os direitos reservados.
        </div>
      </div>

      {/* Right Pane - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 text-2xl font-bold tracking-tight mb-12 text-slate-900">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <Package size={24} className="text-white" />
            </div>
            MEU NEGÓCIO
          </div>

          <h2 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Bem-vindo</h2>
          <p className="text-slate-500 mb-8">Acesse sua conta para gerenciar seu negócio.</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Login</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <User size={20} />
                </div>
                <input 
                  type="text" 
                  value={login}
                  onChange={e => setLogin(e.target.value.trim())}
                  placeholder="Seu usuário" 
                  className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Lock size={20} />
                </div>
                <input 
                  type="password" 
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" 
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>Entrar <LogIn size={20} /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
