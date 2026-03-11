import React, { useState, useEffect } from 'react';
import firebase, { db } from '../firebase';
import { useAuth, useData } from '../store';
import { showToast } from './Toast';
import { ShoppingCart, Plus, Trash2, Check, Search, Clock, UserPlus, X, Printer, FileText, Package } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

import { formatCurrency, parseCurrency, maskCurrency } from '../utils';

export default function Venda() {
  const { user } = useAuth();
  const { produtos, vendas, clientes } = useData();
  const [recentes, setRecentes] = useState<any[]>([]);
  const [carrinho, setCarrinho] = useState<any[]>([]);
  
  const [clienteNome, setClienteNome] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ nome: '', telefone: '', email: '', cep: '', endereco: '', numero: '', bairro: '', cidade: '' });
  
  const [buscaProduto, setBuscaProduto] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('dinheiro');
  const [entradaCredito, setEntradaCredito] = useState('');
  const [parcelasCredito, setParcelasCredito] = useState('1');
  const [valorRecebido, setValorRecebido] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState<any>(null);

  const handleCEP = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setNewClientForm(prev => ({
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

  useEffect(() => {
    const recentItemsMap = new Map();
    vendas.slice(0, 10).forEach((v: any) => {
      v.itens?.forEach((item: any) => {
        if (!recentItemsMap.has(item.id)) {
          recentItemsMap.set(item.id, item);
        }
      });
    });
    setRecentes(Array.from(recentItemsMap.values()).slice(0, 4));
  }, [vendas]);

  const handleCreateClient = async () => {
    if (!newClientForm.nome) return showToast('Nome é obrigatório', 'error');
    try {
      await db.collection('clientes').add({
        ...newClientForm,
        userId: user?.id
      });
      setClienteNome(newClientForm.nome);
      setShowNewClientModal(false);
      setNewClientForm({ nome: '', telefone: '', email: '' });
      showToast('Cliente cadastrado com sucesso!', 'success');
    } catch (e) {
      showToast('Erro ao cadastrar cliente', 'error');
    }
  };

  const generateReceipt = (vendaData: any) => {
    try {
      const docHeight = Math.max(150, 80 + (vendaData.itens.length * 5) + 40);
      const doc = new jsPDF({
        unit: 'mm',
        format: [80, docHeight] // Dynamic height for single continuous receipt
      });

      doc.setFontSize(10);
      doc.text('COMPROVANTE DE VENDA', 40, 10, { align: 'center' });
      doc.setFontSize(7);
      doc.text('------------------------------------------', 40, 14, { align: 'center' });
      doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 5, 18);
      doc.text(`Cliente: ${vendaData.clienteNome}`, 5, 22);
      doc.text(`Vendedor: ${user?.displayName}`, 5, 26);
      doc.text('------------------------------------------', 40, 30, { align: 'center' });

      let y = 35;
      doc.text('PRODUTO', 5, y);
      doc.text('QTD', 45, y);
      doc.text('TOTAL', 65, y);
      y += 4;

      vendaData.itens.forEach((item: any) => {
        doc.text(String(item.nome || '').substring(0, 20), 5, y);
        doc.text(String(item.quantidade || 0), 45, y);
        doc.text(`R$ ${(item.preco * item.quantidade).toFixed(2)}`, 65, y);
        y += 4;
      });

      y += 2;
      doc.text('------------------------------------------', 40, y, { align: 'center' });
      y += 5;
      doc.setFontSize(9);
      doc.text(`TOTAL: R$ ${vendaData.total.toFixed(2)}`, 5, y);
      y += 5;
      doc.setFontSize(7);
      doc.text(`Pagamento: ${String(vendaData.formaPagamento || '').toUpperCase()}`, 5, y);
      
      if (vendaData.formaPagamento === 'credito') {
        y += 4;
        doc.text(`Entrada: R$ ${vendaData.entrada.toFixed(2)}`, 5, y);
        y += 4;
        doc.text(`Saldo (Fiado): R$ ${vendaData.saldo.toFixed(2)}`, 5, y);
        y += 4;
        doc.text(`Parcelas: ${vendaData.parcelas}x R$ ${vendaData.valorParcela.toFixed(2)}`, 5, y);
      }

      y += 10;
      doc.text('Obrigado pela preferência!', 40, y, { align: 'center' });

      doc.save(`venda_${format(new Date(), 'ddMMyyyy_HHmm')}.pdf`);
    } catch (e) {
      console.error('Erro PDF:', e);
      showToast('Erro ao gerar comprovante', 'error');
    }
  };

  const adicionarAoCarrinho = (produto: any) => {
    const prodEstoque = produtos.find(p => p.id === produto.id);
    if (!prodEstoque || prodEstoque.estoque <= 0) {
      return showToast('Produto sem estoque disponível', 'warning');
    }

    setCarrinho(prev => {
      const existe = prev.find(item => item.id === prodEstoque.id);
      if (existe) {
        if (existe.quantidade >= prodEstoque.estoque) {
          showToast('Estoque insuficiente', 'warning');
          return prev;
        }
        return prev.map(item => item.id === prodEstoque.id ? { ...item, quantidade: item.quantidade + 1 } : item);
      }
      return [...prev, { ...prodEstoque, quantidade: 1 }];
    });
  };

  const removerDoCarrinho = (id: string) => {
    setCarrinho(prev => prev.filter(item => item.id !== id));
  };

  const total = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
  const troco = Math.max(0, parseCurrency(valorRecebido) - total);

  const finalizarVenda = async () => {
    if (carrinho.length === 0) return showToast('Carrinho vazio', 'warning');
    if (!clienteNome) return showToast('Informe o nome do cliente', 'warning');
    
    if (formaPagamento === 'dinheiro') {
      const recebido = parseCurrency(valorRecebido);
      if (recebido < total) return showToast('Valor recebido insuficiente', 'warning');
    }

    setIsFinalizing(true);
    try {
      const agora = new Date();
      const vendaData: any = {
        clienteNome,
        userId: user?.id || 'anonimo',
        vendedorId: user?.id || 'anonimo',
        vendedorNome: user?.displayName || 'Vendedor',
        data: agora,
        itens: carrinho.map(item => ({
          id: item.id,
          nome: item.nome,
          preco: item.preco,
          quantidade: item.quantidade
        })),
        total,
        formaPagamento,
        valorRecebido: parseCurrency(valorRecebido),
        troco
      };

      if (formaPagamento === 'credito') {
        const entrada = parseCurrency(entradaCredito);
        const parcelas = parseInt(parcelasCredito) || 1;
        const saldo = total - entrada;
        const valorParcela = saldo / parcelas;

        vendaData.entrada = entrada;
        vendaData.parcelas = parcelas;
        vendaData.saldo = saldo;
        vendaData.valorParcela = valorParcela;

        await db.collection('credito').add({
          clienteNome,
          userId: user?.id || 'anonimo',
          vendedorId: user?.id || 'anonimo',
          data: agora,
          total,
          entrada,
          parcelas,
          valorParcela,
          parcelasPagas: 0,
          saldo
        });
      }

      await db.collection('vendas').add(vendaData);

      const batch = db.batch();
      for (const item of carrinho) {
        const ref = db.collection('produtos').doc(item.id);
        batch.update(ref, { estoque: firebase.firestore.FieldValue.increment(-item.quantidade) });
      }
      await batch.commit();

      // Ensure data is serializable for the modal
      const serializableVenda = {
        ...vendaData,
        data: agora.toISOString()
      };

      setShowReceiptModal(serializableVenda);
      showToast('Venda finalizada com sucesso!', 'success');
      setCarrinho([]);
      setClienteNome('');
      setFormaPagamento('dinheiro');
      setEntradaCredito('');
      setParcelasCredito('1');
      setValorRecebido('');
      setBuscaProduto('');
    } catch (e) {
      console.error('Erro ao finalizar venda:', e);
      showToast('Erro ao finalizar venda', 'error');
    } finally {
      setIsFinalizing(false);
    }
  };

  const produtosFiltrados = buscaProduto.trim() === '' 
    ? [] 
    : produtos.filter(p => String(p.nome || '').toLowerCase().includes(buscaProduto.toLowerCase()));
  const clientesFiltrados = clientes.filter(c => String(c.nome || '').toLowerCase().includes(clienteNome.toLowerCase()));
  const clienteExiste = clientesFiltrados.some(c => String(c.nome || '').toLowerCase() === clienteNome.toLowerCase());

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-3 gap-8 h-full pb-20 lg:pb-0">
      {/* Left Column: Products */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <div className="bg-emerald-600 p-2 rounded-xl text-white">
                <ShoppingCart size={24} />
              </div>
              Nova Venda
            </h2>
          </div>
          
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Pesquisar produtos..." 
              value={buscaProduto} 
              onChange={e => setBuscaProduto(e.target.value)} 
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-lg font-medium" 
            />
          </div>

          {recentes.length > 0 && !buscaProduto && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-500">
              <h3 className="text-xs font-black mb-3 text-slate-400 flex items-center gap-2 uppercase tracking-widest">
                <Clock size={14} /> Sugestões Recentes
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {recentes.map(p => (
                  <button 
                    key={p.id} 
                    onClick={() => adicionarAoCarrinho(p)}
                    className="bg-slate-50 hover:bg-emerald-50 p-3 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all text-left group"
                  >
                    <div className="font-bold text-slate-700 truncate group-hover:text-emerald-700">{p.nome}</div>
                    <div className="text-xs text-emerald-600 font-black mt-1">R$ {p.preco?.toFixed(2)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar pb-8">
          {produtosFiltrados.map(p => (
            <div key={p.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-[4rem] -mr-8 -mt-8 group-hover:bg-emerald-600 transition-colors duration-500"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-emerald-100 text-emerald-600 p-3 rounded-2xl group-hover:bg-white group-hover:text-emerald-600 transition-colors">
                    <Package size={24} />
                  </div>
                  <div className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${
                    p.estoque <= 0 ? 'bg-red-100 text-red-600' : 
                    p.estoque <= 5 ? 'bg-amber-100 text-amber-600' : 
                    'bg-slate-100 text-slate-500'
                  }`}>
                    Estoque: {p.estoque}
                  </div>
                </div>
                <h3 className="font-black text-slate-800 text-lg mb-1 truncate">{p.nome}</h3>
                <div className="text-2xl font-black text-emerald-600 mb-6">R$ {p.preco.toFixed(2)}</div>
                <button 
                  onClick={() => adicionarAoCarrinho(p)} 
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-slate-200 hover:shadow-emerald-200"
                >
                  <Plus size={20} /> Adicionar
                </button>
              </div>
            </div>
          ))}
          {produtosFiltrados.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
              <Package size={64} className="opacity-20 mb-4" />
              <p className="font-bold text-lg">Nenhum produto encontrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Checkout */}
      <div className="flex flex-col gap-6" id="checkout-section">
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 flex flex-col h-full overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-slate-50/50">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2 text-slate-800">
              <ShoppingCart size={24} className="text-emerald-600" /> Finalizar Compra
            </h3>
            
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Nome do cliente..." 
                    value={clienteNome} 
                    onChange={e => {
                      setClienteNome(e.target.value);
                      setShowClientDropdown(true);
                    }} 
                    onFocus={() => setShowClientDropdown(true)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-sm font-bold" 
                  />
                </div>
                <button 
                  onClick={() => setShowNewClientModal(true)}
                  className="bg-emerald-600 text-white p-4 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                  title="Novo Cliente"
                >
                  <UserPlus size={20} />
                </button>
              </div>
              
              {showClientDropdown && clienteNome && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                  {clientesFiltrados.map(c => (
                    <div 
                      key={c.id} 
                      className="p-4 hover:bg-emerald-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0"
                      onClick={() => {
                        setClienteNome(c.nome);
                        setShowClientDropdown(false);
                      }}
                    >
                      <div className="font-bold text-slate-800">{c.nome}</div>
                      <div className="text-xs text-slate-500">{c.telefone || 'Sem contato'}</div>
                    </div>
                  ))}
                  {!clienteExiste && clienteNome.trim() !== '' && (
                    <div 
                      className="p-4 hover:bg-emerald-600 hover:text-white cursor-pointer transition-colors text-emerald-600 font-black flex items-center gap-2"
                      onClick={() => setShowNewClientModal(true)}
                    >
                      <Plus size={18} /> Cadastrar "{clienteNome}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar min-h-[200px]">
            {carrinho.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                <div className="truncate pr-4">
                  <div className="font-black text-slate-800 truncate">{item.nome}</div>
                  <div className="text-xs font-bold text-slate-400">{item.quantidade}x R$ {item.preco.toFixed(2)}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="font-black text-emerald-600">R$ {(item.preco * item.quantidade).toFixed(2)}</div>
                  <button onClick={() => removerDoCarrinho(item.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
            {carrinho.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50 py-10">
                <ShoppingCart size={64} />
                <p className="font-black">Carrinho vazio</p>
              </div>
            )}
          </div>

          <div className="p-8 bg-slate-900 text-white space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Forma de Pagamento</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'dinheiro', label: 'Dinheiro' },
                  { id: 'pix', label: 'PIX' },
                  { id: 'cartao', label: 'Cartão' },
                  { id: 'credito', label: 'Fiado' }
                ].map(f => (
                  <button 
                    key={f.id}
                    onClick={() => setFormaPagamento(f.id)}
                    className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      formaPagamento === f.id 
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {formaPagamento === 'dinheiro' && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Recebido (R$)</label>
                  <input 
                    type="text" 
                    value={valorRecebido} 
                    onChange={e => setValorRecebido(maskCurrency(e.target.value))} 
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-white font-bold" 
                    placeholder="0,00" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Troco</label>
                  <div className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-emerald-400 font-black">
                    {formatCurrency(troco)}
                  </div>
                </div>
              </div>
            )}

            {formaPagamento === 'credito' && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Entrada (R$)</label>
                  <input 
                    type="text" 
                    value={entradaCredito} 
                    onChange={e => setEntradaCredito(maskCurrency(e.target.value))} 
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-white font-bold" 
                    placeholder="0,00" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Parcelas</label>
                  <select 
                    value={parcelasCredito} 
                    onChange={e => setParcelasCredito(e.target.value)} 
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-white font-bold"
                  >
                    {[1,2,3,4,5,6,12].map(n => <option key={n} value={n}>{n}x</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-800">
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total</div>
                <div className="text-4xl font-black text-white">{formatCurrency(total)}</div>
              </div>
              <button 
                onClick={finalizarVenda} 
                disabled={isFinalizing || carrinho.length === 0}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-2xl shadow-emerald-900/50"
              >
                {isFinalizing ? '...' : <><Check size={24} /> FINALIZAR</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Floating Cart Summary */}
      {carrinho.length > 0 && (
        <div className="lg:hidden fixed bottom-20 left-4 right-4 z-40 animate-in slide-in-from-bottom-4">
          <button 
            onClick={() => document.getElementById('checkout-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="w-full bg-emerald-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between font-black"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <ShoppingCart size={20} />
              </div>
              <span>{carrinho.length} itens no carrinho</span>
            </div>
            <div className="text-xl">R$ {total.toFixed(2)}</div>
          </button>
        </div>
      )}

      {/* New Client Modal */}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[3rem] p-6 lg:p-10 w-full max-w-md shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl lg:text-3xl font-black text-slate-800 flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-2xl text-emerald-600">
                  <UserPlus size={28} />
                </div>
                Novo Cliente
              </h3>
              <button onClick={() => setShowNewClientModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X size={28} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input 
                    type="text" 
                    value={newClientForm.nome} 
                    onChange={e => setNewClientForm({...newClientForm, nome: e.target.value})} 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold"
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Telefone</label>
                  <input 
                    type="text" 
                    value={newClientForm.telefone} 
                    onChange={e => setNewClientForm({...newClientForm, telefone: e.target.value})} 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">CEP</label>
                  <input 
                    type="text" 
                    value={newClientForm.cep} 
                    onChange={e => {
                      setNewClientForm({...newClientForm, cep: e.target.value});
                      handleCEP(e.target.value);
                    }} 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold"
                    placeholder="00000-000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Bairro</label>
                  <input 
                    type="text" 
                    value={newClientForm.bairro} 
                    onChange={e => setNewClientForm({...newClientForm, bairro: e.target.value})} 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Endereço</label>
                <input 
                  type="text" 
                  value={newClientForm.endereco} 
                  onChange={e => setNewClientForm({...newClientForm, endereco: e.target.value})} 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Número</label>
                  <input 
                    type="text" 
                    value={newClientForm.numero} 
                    onChange={e => setNewClientForm({...newClientForm, numero: e.target.value})} 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Cidade</label>
                  <input 
                    type="text" 
                    value={newClientForm.cidade} 
                    onChange={e => setNewClientForm({...newClientForm, cidade: e.target.value})} 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => setShowNewClientModal(false)} 
                className="flex-1 px-6 py-5 text-slate-500 font-black hover:bg-slate-100 rounded-2xl transition-all"
              >
                CANCELAR
              </button>
              <button 
                onClick={handleCreateClient} 
                className="flex-1 px-6 py-5 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all"
              >
                CADASTRAR
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Receipt Preview Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-[3rem] p-8 w-full max-w-sm shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="text-center mb-6">
              <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                <Check size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-800">Venda Finalizada!</h3>
              <p className="text-slate-500 font-bold">Confira o comprovante abaixo</p>
            </div>

            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 font-mono text-xs space-y-2 mb-8">
              <div className="text-center font-bold border-b border-dashed border-slate-200 pb-2 mb-2">COMPROVANTE DE VENDA</div>
              <div className="flex justify-between"><span>Data:</span> <span>{format(new Date(), 'dd/MM/yyyy HH:mm')}</span></div>
              <div className="flex justify-between"><span>Cliente:</span> <span className="font-bold">{showReceiptModal.clienteNome}</span></div>
              <div className="flex justify-between"><span>Vendedor:</span> <span>{user?.displayName}</span></div>
              <div className="border-b border-dashed border-slate-200 my-2"></div>
              {showReceiptModal.itens.map((item: any) => (
                <div key={item.id} className="flex justify-between">
                  <span className="truncate max-w-[150px]">{item.quantidade}x {item.nome}</span>
                  <span>{formatCurrency(item.preco * item.quantidade)}</span>
                </div>
              ))}
              <div className="border-b border-dashed border-slate-200 my-2"></div>
              <div className="flex justify-between text-base font-black">
                <span>TOTAL:</span>
                <span>{formatCurrency(showReceiptModal.total)}</span>
              </div>
              <div className="flex justify-between"><span>Pagamento:</span> <span className="uppercase">{showReceiptModal.formaPagamento === 'credito' ? 'FIADO' : showReceiptModal.formaPagamento}</span></div>
              {showReceiptModal.formaPagamento === 'dinheiro' && (
                <>
                  <div className="flex justify-between"><span>Recebido:</span> <span>{formatCurrency(showReceiptModal.valorRecebido)}</span></div>
                  <div className="flex justify-between font-bold"><span>Troco:</span> <span>{formatCurrency(showReceiptModal.troco)}</span></div>
                </>
              )}
              <div className="text-center pt-4 italic">Obrigado pela preferência!</div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => generateReceipt(showReceiptModal)}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
              >
                <Printer size={20} /> BAIXAR PDF
              </button>
              <button 
                onClick={() => setShowReceiptModal(null)}
                className="w-full py-4 text-slate-500 font-black hover:bg-slate-100 rounded-2xl transition-all"
              >
                FECHAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
