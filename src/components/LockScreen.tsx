import React, { useState } from 'react';
import { useAuth } from '../store';
import firebase, { db } from '../firebase';
import { Lock, Key, LogOut, ArrowRight, RefreshCw } from 'lucide-react';
import { showToast } from './Toast';

export default function LockScreen() {
  const { user, setUser } = useAuth();
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    if (!user) return;

    setIsLoading(true);
    try {
      // Check if token exists and is not used
      const tokenSnap = await db.collection('tokens').doc(token.toUpperCase()).get();
      
      if (!tokenSnap.exists) {
        showToast('Chave de acesso inválida', 'error');
        setIsLoading(false);
        return;
      }

      const tokenData = tokenSnap.data();
      if (tokenData?.usada) {
        showToast('Esta chave já foi utilizada', 'error');
        setIsLoading(false);
        return;
      }

      // Mark token as used and extend user access
      const batch = db.batch();
      
      const tokenRef = db.collection('tokens').doc(token.toUpperCase());
      batch.update(tokenRef, {
        usada: true,
        usadaPor: user.id,
        dataUso: firebase.firestore.FieldValue.serverTimestamp()
      });

      const userRef = db.collection('usuarios').doc(user.id);
      const userDoc = await userRef.get();
      const userData = userDoc.data();
      
      let currentExp = userData?.expiracao?.toDate ? userData.expiracao.toDate() : new Date();
      if (currentExp < new Date()) currentExp = new Date();
      
      // Add 30 days
      const newExp = new Date(currentExp.getTime() + (30 * 24 * 60 * 60 * 1000));
      
      batch.update(userRef, {
        expiracao: firebase.firestore.Timestamp.fromDate(newExp),
        ativo: true
      });

      await batch.commit();
      showToast('Acesso liberado por mais 30 dias!', 'success');
      // The store listener will automatically update isExpired
    } catch (error) {
      console.error('Erro ao validar chave:', error);
      showToast('Erro ao validar chave de acesso', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-500 via-slate-900 to-slate-900"></div>
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-red-500 via-slate-900 to-slate-900"></div>
      
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 relative z-10 border border-slate-100">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mb-6 shadow-lg shadow-red-100 animate-pulse">
            <Lock size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Acesso Bloqueado</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Seu período de acesso expirou ou sua conta está inativa. Insira uma chave de acesso para continuar.
          </p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Key size={20} />
            </div>
            <input
              type="text"
              value={token}
              onChange={e => setToken(e.target.value.toUpperCase())}
              placeholder="DIGITE SUA CHAVE"
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-mono font-bold text-center tracking-[0.3em] uppercase"
              maxLength={10}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-slate-600 active:bg-emerald-600 text-white font-black py-4 rounded-2xl transition-all shadow-lg active:shadow-emerald-200 flex items-center justify-center gap-3 uppercase tracking-widest text-xs disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCw size={20} className="animate-spin" />
            ) : (
              <>Validar Chave <ArrowRight size={20} /></>
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col gap-4">
          <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Precisa de uma chave? Entre em contato com o suporte.
          </p>
          <button
            onClick={() => setUser(null)}
            className="w-full flex items-center justify-center gap-2 py-3 text-slate-400 hover:text-slate-600 font-bold text-xs transition-colors"
          >
            <LogOut size={16} />
            Sair da Conta
          </button>
        </div>
      </div>
    </div>
  );
}
