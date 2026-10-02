
import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Brand, Client, Sale } from '../types';

interface SalesFormProps {
  brands: Brand[];
  clients: Client[];
  onClose: () => void;
  onSubmit: (saleData: any) => void;
  initialClientId?: string;
  initialBrandId?: string;
  initialData?: Sale | null;
  title?: string;
}

export const SalesForm: React.FC<SalesFormProps> = ({ 
  brands, 
  clients, 
  onClose, 
  onSubmit,
  initialClientId,
  initialBrandId,
  initialData,
  title,
}) => {
  const [selectedClient, setSelectedClient] = useState(initialData?.clientId || initialClientId || '');
  const [selectedBrand, setSelectedBrand] = useState(initialData?.brandId || initialBrandId || '');
  const [amount, setAmount] = useState(initialData ? String(initialData.amount) : '');
  const [dueDate, setDueDate] = useState(initialData ? initialData.dueDate : '');
  const [status, setStatus] = useState<'paid' | 'pending'>(initialData?.status || 'pending');

  useEffect(() => {
    if (initialData) {
      setSelectedClient(initialData.clientId);
      setSelectedBrand(initialData.brandId);
      setAmount(String(initialData.amount));
      setDueDate(initialData.dueDate);
      setStatus(initialData.status);
    } else {
      if (initialClientId) setSelectedClient(initialClientId);
      if (initialBrandId) setSelectedBrand(initialBrandId);
    }
  }, [initialData, initialClientId, initialBrandId]);

  const handleCalculateProfit = () => {
    const brand = brands.find(b => b.id === selectedBrand);
    if (!brand || !amount) return 0;
    const value = parseFloat(amount);
    return value * brand.commission;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !selectedBrand || !amount || !dueDate) return;

    const brand = brands.find(b => b.id === selectedBrand);
    const value = parseFloat(amount);
    const profit = value * (brand?.commission || 0);

    onSubmit({
      ...(initialData ? { id: initialData.id } : {}),
      clientId: selectedClient,
      brandId: selectedBrand,
      amount: value,
      cost: value - profit,
      profit: profit,
      dueDate: dueDate,
      status: status,
      createdAt: initialData ? initialData.createdAt : new Date().toISOString().split('T')[0],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-sm animate-in fade-in duration-300">
      <GlassCard className="w-full max-w-md p-6 bg-white animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold tracking-tight text-[#1D1D1F]">
            {title || (initialData ? 'Editar Venda' : 'Nova Venda')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#86868B] uppercase tracking-wider mb-1">Cliente</label>
            <select 
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full bg-[#F5F5F7] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#7A1C1D] transition-all outline-none"
              required
            >
              <option value="">Selecione o cliente</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#86868B] uppercase tracking-wider mb-1">Marca</label>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-0.5">
              {brands.map(brand => (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => setSelectedBrand(brand.id)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-between ${
                    selectedBrand === brand.id 
                    ? 'border-[#7A1C1D] bg-[#F8E7E9] text-[#7A1C1D] font-bold shadow-sm' 
                    : 'border-gray-200 bg-[#F5F5F7] text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="truncate">{brand.name}</span>
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 ml-1.5" style={{ backgroundColor: brand.color }} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#86868B] uppercase tracking-wider mb-1">Valor da Venda (R$)</label>
            <input 
              type="number" 
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className="w-full bg-[#F5F5F7] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#7A1C1D] transition-all outline-none font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#86868B] uppercase tracking-wider mb-1">Data de Vencimento</label>
            <input 
              type="date" 
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-[#F5F5F7] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#7A1C1D] transition-all outline-none font-medium"
              required
            />
          </div>

          {initialData && (
            <div>
              <label className="block text-xs font-bold text-[#86868B] uppercase tracking-wider mb-1">Status do Pagamento</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('pending')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                    status === 'pending'
                      ? 'border-orange-300 bg-orange-50 text-orange-600'
                      : 'border-gray-200 bg-[#F5F5F7] text-gray-500'
                  }`}
                >
                  Pendente
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('paid')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                    status === 'paid'
                      ? 'border-green-300 bg-green-50 text-green-600'
                      : 'border-gray-200 bg-[#F5F5F7] text-gray-500'
                  }`}
                >
                  Pago
                </button>
              </div>
            </div>
          )}

          {selectedBrand && amount && (
            <div className="bg-green-50 p-4 rounded-xl border border-green-100 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700 font-medium">Lucro estimado:</span>
                <span className="text-lg font-bold text-green-700">
                  R$ {handleCalculateProfit().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-[10px] text-green-600 mt-1 uppercase font-bold tracking-widest">Calculado automaticamente</p>
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-[#7A1C1D] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#6E2E49] transition-all active:scale-[0.98] shadow-lg shadow-[#7A1C1D]/20 mt-4"
          >
            <Check size={20} /> {initialData ? 'Salvar Alterações' : 'Registrar Venda'}
          </button>
        </form>
      </GlassCard>
    </div>
  );
};
