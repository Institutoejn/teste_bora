import React from 'react';
import { 
  X, 
  Receipt, 
  Calendar, 
  TrendingUp, 
  Wallet, 
  Edit3, 
  User, 
  Tag, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  MessageCircle,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { Sale, Client, Brand } from '../types';
import { saleService } from '../services/saleService';

interface SaleDetailModalProps {
  sale: Sale;
  client?: Client;
  brand?: Brand;
  onClose: () => void;
  onEditSale: (sale: Sale) => void;
  onViewClient?: (client: Client) => void;
  onViewBrand?: (brand: Brand) => void;
  onToggleStatus?: (sale: Sale) => void;
  onRemindWhatsApp?: (sale: Sale) => void;
}

export const SaleDetailModal: React.FC<SaleDetailModalProps> = ({
  sale,
  client,
  brand,
  onClose,
  onEditSale,
  onViewClient,
  onViewBrand,
  onToggleStatus,
  onRemindWhatsApp,
}) => {
  const isPaid = sale.status === 'paid';
  const formattedSaleDate = saleService.formatDate(sale.createdAt);
  const formattedDueDate = saleService.formatDate(sale.dueDate);

  // Percentual de lucro sobre o valor total da venda
  const profitMargin = sale.amount > 0 ? Math.round((sale.profit / sale.amount) * 100) : 0;

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
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold shadow-md border border-white/40"
                style={{ backgroundColor: brand?.color || '#7A1C1D' }}
              >
                <Receipt size={28} strokeWidth={2.2} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">
                    Detalhes da Venda
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] uppercase tracking-wider flex items-center gap-1 ${
                    isPaid
                      ? 'bg-green-50 text-green-700 border border-green-200/60'
                      : 'bg-orange-50 text-orange-700 border border-orange-200/60'
                  }`}>
                    {isPaid ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                    {isPaid ? 'Pago' : 'Pendente'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#86868B] font-medium mt-1">
                  <span>Registrada em {formattedSaleDate}</span>
                  <span>•</span>
                  <span>Vencimento em {formattedDueDate}</span>
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

          {/* Conteúdo com Scroll */}
          <div className="overflow-y-auto py-5 space-y-6 pr-1">
            {/* Bloco de Destaque Financeiro */}
            <div className="bg-gradient-to-br from-[#F5F5F7] to-gray-100/70 p-6 rounded-2xl border border-gray-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#86868B]">
                  Valor Total da Venda
                </span>
                <div className="text-3xl sm:text-4xl font-black text-[#1D1D1F] tracking-tight mt-0.5">
                  {saleService.formatCurrency(sale.amount)}
                </div>
              </div>

              {onToggleStatus && (
                <button
                  onClick={() => onToggleStatus(sale)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-sm ${
                    isPaid
                      ? 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  <CheckCircle2 size={16} />
                  <span>{isPaid ? 'Marcar como Pendente' : 'Marcar como Pago'}</span>
                </button>
              )}
            </div>

            {/* Grid de Métricas da Venda */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#F5F5F7] p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-[#86868B] font-bold uppercase tracking-wider mb-1">
                  <TrendingUp size={14} className="text-green-600" />
                  <span>Lucro</span>
                </div>
                <div className="text-lg font-bold text-green-700">
                  {saleService.formatCurrency(sale.profit)}
                </div>
                <span className="text-[10px] text-green-600 font-semibold">
                  {profitMargin}% de margem
                </span>
              </div>

              <div className="bg-[#F5F5F7] p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-[#86868B] font-bold uppercase tracking-wider mb-1">
                  <Wallet size={14} className="text-gray-500" />
                  <span>Custo</span>
                </div>
                <div className="text-lg font-bold text-[#1D1D1F]">
                  {saleService.formatCurrency(sale.cost)}
                </div>
                <span className="text-[10px] text-[#86868B]">
                  Repasse do produto
                </span>
              </div>

              <div className="bg-[#F5F5F7] p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-[#86868B] font-bold uppercase tracking-wider mb-1">
                  <Calendar size={14} className="text-[#7A1C1D]" />
                  <span>Vencimento</span>
                </div>
                <div className="text-lg font-bold text-[#1D1D1F]">
                  {formattedDueDate}
                </div>
                <span className={`text-[10px] font-semibold ${isPaid ? 'text-green-600' : 'text-orange-600'}`}>
                  {isPaid ? 'Liquidado' : 'Aguardando pagamento'}
                </span>
              </div>

              <div className="bg-[#F5F5F7] p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-[#86868B] font-bold uppercase tracking-wider mb-1">
                  <Tag size={14} className="text-[#7A1C1D]" />
                  <span>Comissão</span>
                </div>
                <div className="text-lg font-bold text-[#1D1D1F]">
                  {brand ? `${Math.round(brand.commission * 100)}%` : `${profitMargin}%`}
                </div>
                <span className="text-[10px] text-[#86868B]">
                  Taxa da marca
                </span>
              </div>
            </div>

            {/* Relacionamento Contextual: Cliente e Marca */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#86868B] px-1">
                Relacionamentos da Venda
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Card de Cliente */}
                <div className="bg-white border border-gray-200/70 p-4 rounded-2xl shadow-sm flex items-center justify-between group hover:border-[#7A1C1D]/50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F8E7E9] text-[#7A1C1D] flex items-center justify-center font-bold">
                      <User size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868B]">Cliente</span>
                      <div className="font-bold text-[#1D1D1F] text-sm group-hover:text-[#7A1C1D] transition-colors">
                        {client ? client.name : 'Cliente não encontrado'}
                      </div>
                      {client?.phone && (
                        <div className="text-xs text-[#86868B]">{client.phone}</div>
                      )}
                    </div>
                  </div>

                  {client && onViewClient && (
                    <button
                      onClick={() => onViewClient(client)}
                      className="text-xs font-bold text-[#7A1C1D] hover:text-[#6E2E49] flex items-center gap-1 p-2 rounded-lg hover:bg-[#F8E7E9] transition-colors"
                      title="Abrir detalhes do cliente"
                    >
                      <span>Ver cliente</span>
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>

                {/* Card de Marca */}
                <div className="bg-white border border-gray-200/70 p-4 rounded-2xl shadow-sm flex items-center justify-between group hover:border-[#7A1C1D]/50 transition-all">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                      style={{ backgroundColor: brand?.color || '#7A1C1D' }}
                    >
                      <Tag size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868B]">Marca</span>
                      <div className="font-bold text-[#1D1D1F] text-sm group-hover:text-[#7A1C1D] transition-colors">
                        {brand ? brand.name : 'Marca não encontrada'}
                      </div>
                      {brand && (
                        <div className="text-xs text-[#86868B]">
                          {Math.round(brand.commission * 100)}% de comissão
                        </div>
                      )}
                    </div>
                  </div>

                  {brand && onViewBrand && (
                    <button
                      onClick={() => onViewBrand(brand)}
                      className="text-xs font-bold text-[#7A1C1D] hover:text-[#6E2E49] flex items-center gap-1 p-2 rounded-lg hover:bg-[#F8E7E9] transition-colors"
                      title="Abrir detalhes da marca"
                    >
                      <span>Ver marca</span>
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer com Ações */}
          <div className="pt-4 border-t border-gray-100/80 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => onEditSale(sale)}
              className="flex-1 bg-[#7A1C1D] text-white py-3.5 px-5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#6E2E49] transition-all active:scale-[0.98] shadow-md shadow-[#7A1C1D]/20"
            >
              <Edit3 size={18} />
              <span>Editar venda</span>
            </button>

            {!isPaid && onRemindWhatsApp && client && (
              <button
                onClick={() => onRemindWhatsApp(sale)}
                className="bg-green-50 text-green-700 hover:bg-green-100 border border-green-200/60 py-3.5 px-5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <MessageCircle size={18} />
                <span>Lembrar no WhatsApp</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="py-3.5 px-5 bg-gray-100 text-[#1D1D1F] hover:bg-gray-200 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]"
            >
              Fechar
            </button>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};
