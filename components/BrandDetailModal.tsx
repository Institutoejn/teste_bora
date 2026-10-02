import React, { useState } from 'react';
import { 
  X, 
  Tag, 
  Calendar, 
  ShoppingBag, 
  TrendingUp, 
  Wallet, 
  Edit3, 
  Plus, 
  Receipt,
  Percent,
  CheckCircle2,
  Clock,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { Brand, Sale, Client } from '../types';
import { brandService } from '../services/brandService';
import { BrandLogoIcon } from '../constants/brandCatalog';

interface BrandDetailModalProps {
  brand: Brand;
  sales: Sale[];
  clients: Client[];
  onClose: () => void;
  onEditBrand: (brand: Brand) => void;
  onDeleteBrand?: (brand: Brand) => void | Promise<void>;
  onRegisterSale: (brand: Brand) => void;
}

export const BrandDetailModal: React.FC<BrandDetailModalProps> = ({
  brand,
  sales,
  clients,
  onClose,
  onEditBrand,
  onDeleteBrand,
  onRegisterSale,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const metrics = brandService.getBrandMetrics(brand, sales);
  const formattedCommission = brandService.formatCommission(brand.commission);

  const handleConfirmDelete = async () => {
    if (!onDeleteBrand || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDeleteBrand(brand);
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Sem registro';
    try {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/25 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-2xl my-auto"
      >
        <GlassCard className="p-6 sm:p-8 bg-white/95 rounded-[32px] border-white/60 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between pb-5 border-b border-gray-100/80">
            <div className="flex items-center gap-4">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white shadow-sm border border-gray-100 p-2 overflow-hidden"
              >
                <BrandLogoIcon name={brand.name} className="w-full h-full object-contain" fallbackClassName="text-2xl font-black text-[#7A1C1D]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">
                    {brand.name}
                  </h2>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#86868B] font-medium mt-0.5">
                  <span className="flex items-center gap-1">
                    <Percent size={13} className="text-[#7A1C1D]" />
                    <span className="font-semibold text-[#1D1D1F]">{formattedCommission}</span> de comissão
                  </span>
                  <span>•</span>
                  <span className="text-[#86868B]">
                    {metrics.salesCount} {metrics.salesCount === 1 ? 'venda registrada' : 'vendas registradas'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors active:scale-90"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>

          {/* Ações Rápidas de Topo */}
          <div className="flex items-center gap-2 pt-5 pb-4">
            <button
              onClick={() => onRegisterSale(brand)}
              className="flex-1 bg-[#7A1C1D] hover:bg-[#6E2E49] text-white py-3 px-3 sm:px-4 rounded-2xl font-bold text-xs sm:text-sm shadow-md shadow-[#7A1C1D]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 sm:gap-2 min-w-0"
            >
              <Plus size={16} strokeWidth={2.5} className="shrink-0" />
              <span className="truncate">Registrar Venda</span>
            </button>

            <button
              onClick={() => onEditBrand(brand)}
              className="bg-[#F5F5F7] hover:bg-gray-200/70 text-[#1D1D1F] py-3 px-3 sm:px-4 rounded-2xl font-bold text-xs sm:text-sm active:scale-[0.98] transition-all flex items-center gap-1.5 border border-gray-200/50 shrink-0"
              title="Editar dados da marca"
            >
              <Edit3 size={15} className="text-[#86868B] shrink-0" />
              <span>Editar</span>
            </button>

            {onDeleteBrand && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-50 hover:bg-red-100 text-red-600 py-3 px-3 sm:px-4 rounded-2xl font-bold text-xs sm:text-sm active:scale-[0.98] transition-all flex items-center gap-1.5 border border-red-200/60 shrink-0"
                title="Excluir marca"
              >
                <Trash2 size={15} className="text-red-500" />
                <span>Excluir</span>
              </button>
            )}
          </div>

          {/* Banner de Confirmação de Exclusão */}
          {showDeleteConfirm && (
            <div className="mb-4 p-4 rounded-2xl bg-red-50/90 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 text-red-800 min-w-0">
                <AlertTriangle size={18} className="text-red-600 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold truncate">
                  Excluir a marca <strong>{brand.name}</strong>? Esta ação não pode ser desfeita.
                </span>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200/60 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {isDeleting ? (
                    <span className="animate-spin text-xs">...</span>
                  ) : (
                    <Trash2 size={13} />
                  )}
                  <span>Sim, excluir</span>
                </button>
              </div>
            </div>
          )}

          {/* Conteúdo Rolável (Métricas + Histórico de Vendas) */}
          <div className="overflow-y-auto pr-1 space-y-6 pb-2">
            {/* Grid de Resumo Financeiro & Desempenho */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Total Vendido */}
              <div className="bg-[#F5F5F7]/80 p-3.5 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-1.5 text-[#86868B] text-[10px] font-bold uppercase tracking-wider mb-1">
                  <TrendingUp size={12} className="text-[#7A1C1D]" />
                  <span>Total Vendido</span>
                </div>
                <p className="text-base sm:text-lg font-black text-[#1D1D1F] tracking-tight">
                  R$ {metrics.totalSold.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Total de Lucro */}
              <div className="bg-green-50/50 p-3.5 rounded-2xl border border-green-200/60">
                <div className="flex items-center gap-1.5 text-green-700 text-[10px] font-bold uppercase tracking-wider mb-1">
                  <Wallet size={12} className="text-green-600" />
                  <span>Lucro Total</span>
                </div>
                <p className="text-base sm:text-lg font-black text-green-700 tracking-tight">
                  R$ {metrics.totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Quantidade de Vendas */}
              <div className="bg-[#F5F5F7]/80 p-3.5 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-1.5 text-[#86868B] text-[10px] font-bold uppercase tracking-wider mb-1">
                  <ShoppingBag size={12} className="text-gray-500" />
                  <span>Nº de Vendas</span>
                </div>
                <p className="text-base sm:text-lg font-black text-[#1D1D1F] tracking-tight">
                  {metrics.salesCount} {metrics.salesCount === 1 ? 'pedido' : 'pedidos'}
                </p>
              </div>

              {/* Última Venda */}
              <div className="bg-[#F5F5F7]/80 p-3.5 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-1.5 text-[#86868B] text-[10px] font-bold uppercase tracking-wider mb-1">
                  <Calendar size={12} className="text-purple-500" />
                  <span>Última Venda</span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-[#1D1D1F] tracking-tight truncate mt-1">
                  {formatDate(metrics.lastSaleDate)}
                </p>
              </div>
            </div>

            {/* Histórico de Vendas da Marca */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-base text-[#1D1D1F]">
                  Histórico de Vendas
                </h3>
                <span className="text-xs font-semibold text-[#86868B]">
                  {metrics.salesHistory.length} {metrics.salesHistory.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>

              {metrics.salesHistory.length === 0 ? (
                <div className="p-8 text-center bg-[#F5F5F7]/60 rounded-2xl border border-dashed border-gray-200 space-y-3">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto text-gray-400 apple-shadow">
                    <Receipt size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#1D1D1F]">Nenhuma venda registrada</h4>
                    <p className="text-xs text-[#86868B] mt-1 max-w-sm mx-auto">
                      Esta marca ainda não possui vendas registradas.
                    </p>
                  </div>
                  <button
                    onClick={() => onRegisterSale(brand)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7A1C1D] bg-[#F8E7E9] hover:bg-[#F2D7D9] px-4 py-2 rounded-xl transition-colors active:scale-95"
                  >
                    <Plus size={14} />
                    <span>Registrar primeira venda</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {metrics.salesHistory.map((sale) => {
                    const client = clients.find((c) => c.id === sale.clientId);
                    const isPaid = sale.status === 'paid';

                    return (
                      <div
                        key={sale.id}
                        className="p-3.5 bg-[#F5F5F7]/70 hover:bg-[#F5F5F7] rounded-2xl flex items-center justify-between border border-gray-100/80 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isPaid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {isPaid ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[#1D1D1F]">
                                {client?.name || 'Cliente'}
                              </span>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                isPaid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                              }`}>
                                {isPaid ? 'Pago' : 'Pendente'}
                              </span>
                            </div>
                            <p className="text-xs text-[#86868B] mt-0.5">
                              {formatDate(sale.createdAt || sale.dueDate)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-bold text-sm text-[#1D1D1F]">
                            R$ {sale.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-[11px] font-semibold text-green-600 mt-0.5">
                            Lucro: R$ {sale.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};
