import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Search, 
  X, 
  Plus, 
  TrendingUp, 
  Wallet, 
  Clock, 
  CheckCircle2, 
  ShoppingBag, 
  ChevronRight,
  MessageCircle,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { EmptyState } from './EmptyState';
import { Sale, Client, Brand } from '../types';
import { saleService } from '../services/saleService';

interface SalesViewProps {
  sales: Sale[];
  clients: Client[];
  brands: Brand[];
  onOpenNewSaleForm: () => void;
  onSelectSale: (sale: Sale) => void;
  onRemindWhatsApp?: (sale: Sale) => void;
  isSaleIntroActive?: boolean;
}

export const SalesView: React.FC<SalesViewProps> = ({
  sales,
  clients,
  brands,
  onOpenNewSaleForm,
  onSelectSale,
  onRemindWhatsApp,
  isSaleIntroActive = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Ordena por data mais recente e filtra pela busca de cliente ou marca
  const sortedSales = useMemo(() => {
    return saleService.sortSalesByDate(sales);
  }, [sales]);

  const filteredSales = useMemo(() => {
    return saleService.searchSales(sortedSales, clients, brands, searchQuery);
  }, [sortedSales, clients, brands, searchQuery]);

  // Métricas calculadas dinamicamente a partir do estado atual
  const metrics = useMemo(() => {
    return saleService.calculateSalesMetrics(sales);
  }, [sales]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Cabeçalho do Módulo de Vendas */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-1 px-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1D1D1F]">
            Vendas
          </h1>
          <p className="text-[#86868B] font-medium text-sm mt-1">
            Acompanhe suas vendas e seus resultados em um só lugar.
          </p>
        </div>

        <button
          onClick={onOpenNewSaleForm}
          className={`bg-[#7A1C1D] text-white px-5 py-3 rounded-full font-bold text-sm shadow-lg shadow-[#7A1C1D]/20 hover:bg-[#6E2E49] active:scale-95 transition-all flex items-center justify-center gap-2 self-start sm:self-auto ${
            isSaleIntroActive ? 'ring-4 ring-[#C87A8A]/50 animate-pulse' : ''
          }`}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Nova venda</span>
        </button>
      </header>

      {/* Grid de Métricas Básicas de Vendas */}
      {sales.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total de Vendas */}
          <GlassCard className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#86868B] mb-2">
              <span>Total Vendas</span>
              <Receipt size={16} className="text-[#7A1C1D]" />
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-[#1A1A1A]">
                {metrics.totalSalesCount}
              </div>
              <p className="text-[11px] text-[#86868B] mt-0.5">
                {metrics.totalSalesCount === 1 ? 'transação' : 'transações'}
              </p>
            </div>
          </GlassCard>

          {/* Total Vendido */}
          <GlassCard className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#86868B] mb-2">
              <span>Total Vendido</span>
              <ShoppingBag size={16} className="text-[#C87A8A]" />
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-[#1A1A1A]">
                {saleService.formatCurrency(metrics.totalSold)}
              </div>
              <p className="text-[11px] text-[#86868B] mt-0.5">
                faturamento bruto
              </p>
            </div>
          </GlassCard>

          {/* Lucro Total */}
          <GlassCard className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#86868B] mb-2">
              <span>Lucro Total</span>
              <TrendingUp size={16} className="text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-emerald-700">
                {saleService.formatCurrency(metrics.totalProfit)}
              </div>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                {metrics.totalSold > 0 
                  ? `${Math.round((metrics.totalProfit / metrics.totalSold) * 100)}% de margem` 
                  : 'comissão acumulada'}
              </p>
            </div>
          </GlassCard>

          {/* Valor Pendente */}
          <GlassCard className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#86868B] mb-2">
              <span>Valor Pendente</span>
              <Clock size={16} className="text-orange-500" />
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-orange-600">
                {saleService.formatCurrency(metrics.pendingAmount)}
              </div>
              <p className="text-[11px] text-[#86868B] mt-0.5">
                a receber de clientes
              </p>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Barra de Busca de Vendas (se existirem vendas) */}
      {sales.length > 0 && (
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente ou marca..."
            className="w-full bg-[#F8E7E9]/40 border-none rounded-2xl py-3.5 pl-11 pr-10 text-sm focus:ring-2 focus:ring-[#7A1C1D] transition-all outline-none text-[#1A1A1A] font-medium placeholder:text-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200/50 transition-colors"
              title="Limpar busca"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Lista de Vendas ou Estados Vazios */}
      {sales.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Você ainda não registrou nenhuma venda."
          description="Cadastre suas primeiras vendas para acompanhar seu faturamento e lucros."
          actionLabel="Registrar primeira venda"
          onAction={onOpenNewSaleForm}
        />
      ) : filteredSales.length === 0 ? (
        <GlassCard className="p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
            <Search size={22} />
          </div>
          <h3 className="text-base font-bold text-[#1D1D1F]">
            Nenhuma venda encontrada.
          </h3>
          <p className="text-xs text-[#86868B] max-w-sm mx-auto">
            Não encontramos nenhuma venda para "{searchQuery}". Verifique a grafia do cliente ou da marca.
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7A1C1D] hover:text-[#6E2E49] pt-1"
          >
            Limpar busca
          </button>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filteredSales.map(sale => {
            const client = clients.find(c => c.id === sale.clientId);
            const brand = brands.find(b => b.id === sale.brandId);
            const isPaid = sale.status === 'paid';
            const formattedSaleDate = saleService.formatDate(sale.createdAt || sale.dueDate);

            return (
              <GlassCard
                key={sale.id}
                onClick={() => onSelectSale(sale)}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-white/80 active:scale-[0.99] transition-all duration-200 group"
              >
                {/* Lado Esquerdo: Identificação de Cliente, Marca e Status */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Badge da Marca */}
                    <span 
                      className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 flex items-center gap-1.5"
                    >
                      <span 
                        className="w-2 h-2 rounded-full shrink-0" 
                        style={{ backgroundColor: brand?.color || '#7A1C1D' }} 
                      />
                      <span>{brand ? brand.name : 'Marca'}</span>
                    </span>

                    {/* Badge de Status */}
                    <span 
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isPaid 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {isPaid ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                      {isPaid ? 'Pago' : 'Pendente'}
                    </span>

                    {/* Data */}
                    <span className="text-xs text-[#86868B]">
                      {formattedSaleDate}
                    </span>
                  </div>

                  {/* Nome do Cliente */}
                  <h4 className="font-bold text-lg text-[#1D1D1F] group-hover:text-[#7A1C1D] transition-colors">
                    {client ? client.name : 'Cliente'}
                  </h4>
                </div>

                {/* Lado Direito: Valores e Ações */}
                <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  <div className="text-left sm:text-right">
                    <div className="text-xl font-black tracking-tight text-[#1D1D1F]">
                      {saleService.formatCurrency(sale.amount)}
                    </div>
                    <div className="text-xs text-green-700 font-semibold flex items-center sm:justify-end gap-1">
                      <TrendingUp size={12} />
                      <span>Lucro: {saleService.formatCurrency(sale.profit)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isPaid && onRemindWhatsApp && client && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemindWhatsApp(sale);
                        }}
                        className="p-2.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-full transition-colors active:scale-95"
                        title="Lembrar cobrança via WhatsApp"
                      >
                        <MessageCircle size={18} />
                      </button>
                    )}

                    <div className="p-2 text-gray-400 group-hover:text-[#7A1C1D] transition-colors">
                      <ChevronRight size={20} />
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
