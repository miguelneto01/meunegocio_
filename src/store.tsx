import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from './firebase';

export type User = {
  id: string;
  login: string;
  displayName: string;
  tipo: 'admin' | 'user';
  accessExpiresAt?: any;
};

type DataContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  produtos: any[];
  clientes: any[];
  vendas: any[];
  gastos: any[];
  credito: any[];
  usuarios: any[];
  tokens: any[];
  loading: boolean;
};

export const AuthContext = createContext<DataContextType>({
  user: null,
  setUser: () => {},
  produtos: [],
  clientes: [],
  vendas: [],
  gastos: [],
  credito: [],
  usuarios: [],
  tokens: [],
  loading: true,
});

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [vendas, setVendas] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [credito, setCredito] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProdutos([]);
      setClientes([]);
      setVendas([]);
      setGastos([]);
      setCredito([]);
      setUsuarios([]);
      setTokens([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const isAdmin = user.tipo === 'admin';

    // Listen to current user data to keep accessExpiresAt updated
    let unsubUser = () => {};
    if (!isAdmin) {
      unsubUser = db.collection('usuarios').doc(user.id).onSnapshot(doc => {
        if (doc.exists) {
          const data = doc.data();
          setUser(prev => prev ? { ...prev, accessExpiresAt: data?.accessExpiresAt } : null);
        }
      });
    }

    const unsubProdutos = (isAdmin ? db.collection('produtos') : db.collection('produtos').where('userId', '==', user.id))
      .onSnapshot(snap => {
        setProdutos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

    const unsubClientes = (isAdmin ? db.collection('clientes') : db.collection('clientes').where('userId', '==', user.id))
      .onSnapshot(snap => {
        setClientes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

    const unsubVendas = (isAdmin ? db.collection('vendas') : db.collection('vendas').where('userId', '==', user.id))
      .limit(100)
      .onSnapshot(snap => {
        const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort in memory to avoid composite index requirement
        docs.sort((a: any, b: any) => {
          const dateA = a.data?.toDate ? a.data.toDate() : (a.data && !isNaN(new Date(a.data).getTime()) ? new Date(a.data) : (a.data?.seconds ? new Date(a.data.seconds * 1000) : new Date(0)));
          const dateB = b.data?.toDate ? b.data.toDate() : (b.data && !isNaN(new Date(b.data).getTime()) ? new Date(b.data) : (b.data?.seconds ? new Date(b.data.seconds * 1000) : new Date(0)));
          return dateB.getTime() - dateA.getTime();
        });
        setVendas(docs);
      });

    const unsubGastos = (isAdmin ? db.collection('gastos') : db.collection('gastos').where('userId', '==', user.id))
      .onSnapshot(snap => {
        setGastos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

    const unsubCredito = (isAdmin ? db.collection('credito') : db.collection('credito').where('userId', '==', user.id))
      .onSnapshot(snap => {
        setCredito(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

    const unsubUsuarios = isAdmin ? db.collection('usuarios').onSnapshot(snap => {
      setUsuarios(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }) : () => {};

    const unsubTokens = isAdmin ? db.collection('tokens').onSnapshot(snap => {
      setTokens(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }) : () => { setLoading(false); };

    return () => {
      unsubUser();
      unsubProdutos();
      unsubClientes();
      unsubVendas();
      unsubGastos();
      unsubCredito();
      unsubUsuarios();
      unsubTokens();
    };
  }, [user?.id]);

  return (
    <AuthContext.Provider value={{ user, setUser, produtos, clientes, vendas, gastos, credito, usuarios, tokens, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export const useData = () => useContext(AuthContext);
