import React, { useState } from 'react';
import { useAuth } from '../store';
import { db } from '../firebase';
import { Package, ArrowRight } from 'lucide-react';
import { showToast } from './Toast';

export default function Login() {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (login === 'miguelneto0x' && senha === '28061996') {
      setUser({ id: 'admin', login, displayName: 'Administrador', tipo: 'admin' });
      showToast('Bem-vindo, Administrador!', 'success');
      setIsLoading(false);
      return;
    }

    try {
      const snapshot = await db.collection('usuarios').where('login', '==', login).where('senha', '==', senha).get();
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data();
        if (data.ativo === false) {
          showToast('Usuário desativado. Contate o administrador.', 'error');
          setIsLoading(false);
          return;
        }
        setUser({ id: doc.id, login: data.login, displayName: data.displayName || data.login, tipo: 'user' });
        showToast(`Bem-vindo, ${data.displayName || data.login}!`, 'success');
      } else {
        showToast('Usuário ou senha inválidos', 'error');
      }
    } catch (error) {
      showToast('Erro ao fazer login', 'error');
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

          <h2 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Acesse sua conta</h2>
          <p className="text-slate-500 mb-8">Insira suas credenciais para continuar.</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Usuário</label>
              <input
                type="text"
                value={login}
                onChange={e => setLogin(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                placeholder="Seu nome de usuário"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                placeholder="••••••••"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              {isLoading ? 'Entrando...' : (
                <>Entrar <ArrowRight size={18} /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
