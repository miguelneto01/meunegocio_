import React, { createContext, useContext, useState, useEffect } from 'react';
import firebase, { db, auth } from './firebase';

export type User = {
  id: string;
  login: string;
  displayName: string;
  tipo: 'admin' | 'user';
  email?: string;
  expiracao?: any;
  ativo?: boolean;
};

type DataContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  produtos: any[];
  clientes: any[];
  vendas: any[];
  gastos: any[];
  credito: any[];
  loading: boolean;
  isExpired: boolean;
};

export const AuthContext = createContext<DataContextType>({
  user: null,
  setUser: () => {},
  produtos: [],
  clientes: [],
  vendas: [],
  gastos: [],
  credito: [],
  loading: true,
  isExpired: false,
});

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [vendas, setVendas] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [credito, setCredito] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);

  const handleFirestoreError = (error: any, operation: string, path: string) => {
    const errInfo = {
      error: error.message || String(error),
      operation,
      path,
      authInfo: {
        userId: user?.id,
        login: user?.login,
      }
    };
    console.error('Firestore Error:', JSON.stringify(errInfo));
  };

  // Check for saved session on mount
  useEffect(() => {
    const bootstrapAdmin = async () => {
      try {
        const expiracao = new Date();
        expiracao.setFullYear(expiracao.getFullYear() + 10);
        const adminData = {
          login: 'miguelneto0x',
          senha: '28061996',
          displayName: 'Administrador Mestre',
          tipo: 'admin',
          ativo: true,
          expiracao: firebase.firestore.Timestamp.fromDate(expiracao)
        };

        // Try to check connection first
        await db.collection('_connection_test').doc('ping').set({ lastBootstrap: new Date() }, { merge: true });

        // Force update the 'admin' document ID to be the master admin
        await db.collection('usuarios').doc('admin').set(adminData, { merge: true });
        console.log('Master admin credentials verified');
        
        // Also check if there's any other document with this login and update it too
        const snap = await db.collection('usuarios').where('login', '==', 'miguelneto0x').get();
        for (const doc of snap.docs) {
          if (doc.id !== 'admin') {
            await doc.ref.update({ senha: '28061996' });
          }
        }
      } catch (e: any) {
        if (e.message && e.message.includes('offline')) {
          console.warn('Firestore is still provisioning or offline. Retrying in 5s...');
          setTimeout(bootstrapAdmin, 5000);
        } else {
          console.error('Bootstrap error:', e);
        }
      }
    };
    bootstrapAdmin();

    const savedUser = localStorage.getItem('meunegocio_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('meunegocio_user');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) {
      setProdutos([]);
      setClientes([]);
      setVendas([]);
      setGastos([]);
      setCredito([]);
      setIsExpired(false);
      return;
    }

    // Listen to user document for expiration and active status
    const unsubUser = db.collection('usuarios').doc(user.id).onSnapshot(doc => {
      if (doc.exists) {
        const data = doc.data();
        if (data) {
          const expiracao = data.expiracao?.toDate ? data.expiracao.toDate() : (data.expiracao ? new Date(data.expiracao) : null);
          const now = new Date();
          
          // Hardcoded admin check for the specific login
          const isAdmin = data.login === 'miguelneto0x'; // Or whatever login the user wants as admin
          
          if (!isAdmin) {
            if (data.ativo === false || (expiracao && expiracao < now)) {
              setIsExpired(true);
            } else {
              setIsExpired(false);
            }
          } else {
            setIsExpired(false);
          }
        }
      }
    }, (error) => handleFirestoreError(error, 'listen', `usuarios/${user.id}`));

    const isAdmin = user.login === 'miguelneto0x';

    const unsubProdutos = (isAdmin ? db.collection('produtos') : db.collection('produtos').where('userId', '==', user.id))
      .onSnapshot(snap => {
        setProdutos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, 'listen', 'produtos'));

    const unsubClientes = (isAdmin ? db.collection('clientes') : db.collection('clientes').where('userId', '==', user.id))
      .onSnapshot(snap => {
        setClientes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, 'listen', 'clientes'));

    const unsubVendas = (isAdmin ? db.collection('vendas') : db.collection('vendas').where('userId', '==', user.id))
      .limit(100)
      .onSnapshot(snap => {
        const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        docs.sort((a: any, b: any) => {
          const dateA = a.data?.toDate ? a.data.toDate() : (a.data && !isNaN(new Date(a.data).getTime()) ? new Date(a.data) : (a.data?.seconds ? new Date(a.data.seconds * 1000) : new Date(0)));
          const dateB = b.data?.toDate ? b.data.toDate() : (b.data && !isNaN(new Date(b.data).getTime()) ? new Date(b.data) : (b.data?.seconds ? new Date(b.data.seconds * 1000) : new Date(0)));
          return dateB.getTime() - dateA.getTime();
        });
        setVendas(docs);
      }, (error) => handleFirestoreError(error, 'listen', 'vendas'));

    const unsubGastos = (isAdmin ? db.collection('gastos') : db.collection('gastos').where('userId', '==', user.id))
      .onSnapshot(snap => {
        setGastos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, 'listen', 'gastos'));

    const unsubCredito = (isAdmin ? db.collection('credito') : db.collection('credito').where('userId', '==', user.id))
      .onSnapshot(snap => {
        setCredito(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, 'listen', 'credito'));

    return () => {
      unsubUser();
      unsubProdutos();
      unsubClientes();
      unsubVendas();
      unsubGastos();
      unsubCredito();
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, setUser, produtos, clientes, vendas, gastos, credito, loading, isExpired }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export const useData = () => useContext(AuthContext);
