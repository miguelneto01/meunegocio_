import React, { useState } from 'react';
import { useAuth } from '../store';
import { db } from '../firebase';
import { Lock, Key, LogOut } from 'lucide-react';
import { showToast } from './Toast';
import firebase from 'firebase/compat/app';

export default function AccessGuard({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuth();
  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) return <>{children}</>;
  if (user.tipo === 'admin') return <>{children}</>;

  const now = new Date();
  const expirationDate = user.accessExpiresAt?.toDate ? user.accessExpiresAt.toDate() : (user.accessExpiresAt ? new Date(user.accessExpiresAt) : null);

  const isExpired = !expirationDate || expirationDate < now;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setIsSubmitting(true);
    try {
      const tokenSnap = await db.collection('tokens').where('code', '==', token.trim()).where('used', '==', false).get();
      
      if (tokenSnap.empty) {
        showToast('Chave de acesso inválida ou já utilizada', 'error');
        setIsSubmitting(false);
        return;
      }

      const tokenDoc = tokenSnap.docs[0];
      const newExpiration = new Date(Math.max(now.getTime(), expirationDate?.getTime() || 0));
      newExpiration.setDate(newExpiration.getDate() + 30);

      const batch = db.batch();
      batch.update(db.collection('usuarios').doc(user.id), {
        accessExpiresAt: firebase.firestore.Timestamp.fromDate(newExpiration)
      });
      batch.update(tokenDoc.ref, {
        used: true,
        usedBy: user.id,
        usedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      await batch.commit();
      showToast('Acesso renovado por 30 dias!', 'success');
      setToken('');
    } catch (error) {
      console.error(error);
      showToast('Erro ao validar chave', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={40} />
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Acesso Expirado</h2>
          <p className="text-slate-500 mb-8">
            Seu período de acesso terminou. Insira uma nova chave de acesso para continuar utilizando o sistema.
          </p>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={token}
                onChange={e => setToken(e.target.value.toUpperCase())}
                placeholder="INSIRA SUA CHAVE"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-center tracking-widest uppercase"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
            >
              {isSubmitting ? 'Validando...' : 'Desbloquear Sistema'}
            </button>
          </form>

          <button
            onClick={() => setUser(null)}
            className="mt-8 flex items-center gap-2 text-slate-400 hover:text-slate-600 mx-auto text-sm font-medium transition-colors"
          >
            <LogOut size={16} /> Sair da conta
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
