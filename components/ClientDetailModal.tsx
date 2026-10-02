import React, { useState } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Calendar, 
  ShoppingBag, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Edit3, 
  Plus, 
  Receipt,
  MessageCircle,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { Client, Sale, Brand } from '../types';
import { clientService } from '../services/clientService';

interface ClientDetailModalProps {
  client: Client;
  sales: Sale[];
  brands: Brand[];
  onClose: () => void;
  onEditClient: (client: Client) => void;
  onDeleteClient?: (client: Client) => void | Promise<void>;
  onRegisterSale: (client: Client) => void;
  onRemindWhatsApp?: (sale: Sale) => void;
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  client,
  sales,
  brands,
  onClose,
  onEditClient,
  onDeleteClient,
  onRegisterSale,
  onRemindWhatsApp,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const metrics = clientService.getClientMetrics(client, sales);
  const formattedPhone = clientService.formatPhone(client.phone);
  const hasDebt = clientService.hasOutstanding(client);

  const handleConfirmDelete = async () => {
    if (!onDeleteClient || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDeleteClient(client);
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
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#F8E7E9] to-[#F2D7D9] flex items-center justify-center text-[#7A1C1D] font-black text-2xl shadow-inner border border-[#F2D7D9]">
                {client.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">
                    {client.name}
                  </h2>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#86868B] font-medium mt-0.5">
                  <span className="flex items-center gap-1">
                    <Phone size={13} className="text-gray-400" />
                    {formattedPhone}
                  </span>
                  <span>•</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                    hasDebt 
                      ? 'bg-orange-50 text-orange-600 border border-orange-200/50' 
                      : 'bg-green-50 text-green-600 border border-green-200/50'
                  }`}>
                    {hasDebt ? 'Com Pendência' : 'Em Dia'}
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
              onClick={() => onRegisterSale(client)}
              className="flex-1 bg-[#7A1C1D] hover:bg-[#6E2E49] text-white py-3 px-3 sm:px-4 rounded-2xl font-bold text-xs sm:text-sm shadow-md shadow-[#7A1C1D]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 sm:gap-2 min-w-0"
            >
              <Plus size={16} strokeWidth={2.5} className="shrink-0" />
              <span className="truncate">Registrar Venda</span>
            </button>

            <button
              onClick={() => onEditClient(client)}
              className="bg-[#F5F5F7] hover:bg-gray-200/70 text-[#1D1D1F] py-3 px-3 sm:px-4 rounded-2xl font-bold text-xs sm:text-sm active:scale-[0.98] transition-all flex items-center gap-1.5 border border-gray-200/50 shrink-0"
              title="Editar dados cadastrais"
            >
              <Edit3 size={15} className="text-[#86868B] shrink-0" />
              <span>Editar</span>
            </button>

            {onDeleteClient && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-50 hover:bg-red-100 text-red-600 py-3 px-3 sm:px-4 rounded-2xl font-bold text-xs sm:text-sm active:scale-[0.98] transition-all flex items-center gap-1.5 border border-red-200/60 shrink-0"
                title="Excluir cliente"
              >
                <Trash2 size={15} className="text-red-500 shrink-0" />
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
                  Excluir <strong>{client.name}</strong>? Esta ação não pode ser desfeita.
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
            {/* Grid de Resumo Financeiro & Relacionamento */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Total Comprado */}
              <div className="bg-[#F5F5F7]/80 p-3.5 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-1.5 text-[#86868B] text-[10px] font-bold uppercase tracking-wider mb-1">
                  <TrendingUp size={12} className="text-[#7A1C1D]" />
                  <span>Total Comprado</span>
                </div>
                <p className="text-base sm:text-lg font-black text-[#1D1D1F] tracking-tight">
                  R$ {metrics.totalPurchased.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Total em Aberto */}
              <div className={`p-3.5 rounded-2xl border ${
                hasDebt 
                  ? 'bg-orange-50/50 border-orange-200/60' 
                  : 'bg-green-50/40 border-green-200/50'
              }`}>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1">
                  {hasDebt ? (
                    <>
                      <AlertCircle size={12} className="text-orange-600" />
                      <span className="text-orange-700">Em Aberto</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={12} className="text-green-600" />
                      <span className="text-green-700">Situação</span>
                    </>
                  )}
                </div>
                <p className={`text-base sm:text-lg font-black tracking-tight ${
                  hasDebt ? 'text-orange-700' : 'text-green-700'
                }`}>
                  {hasDebt 
                    ? `R$ ${metrics.totalOutstanding.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                    : 'R$ 0,00'}
                </p>
              </div>

              {/* Quantidade de Vendas */}
              <div className="bg-[#F5F5F7]/80 p-3.5 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-1.5 text-[#86868B] text-[10px] font-bold uppercase tracking-wider mb-1">
                  <ShoppingBag size={12} className="text-purple-500" />
                  <span>Compras</span>
                </div>
                <p className="text-base sm:text-lg font-black text-[#1D1D1F] tracking-tight">
                  {metrics.salesCount} {metrics.salesCount === 1 ? 'venda' : 'vendas'}
                </p>
              </div>

              {/* Última Compra */}
              <div className="bg-[#F5F5F7]/80 p-3.5 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-1.5 text-[#86868B] text-[10px] font-bold uppercase tracking-wider mb-1">
                  <Calendar size={12} className="text-emerald-500" />
                  <span>Última Compra</span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-[#1D1D1F] tracking-tight truncate pt-0.5">
                  {metrics.lastPurchaseDate ? formatDate(metrics.lastPurchaseDate) : 'Sem compras'}
                </p>
              </div>
            </div>

            {/* Seção Histórico de Vendas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-[#1D1D1F] uppercase tracking-wider">
                  Histórico de Vendas
                </h3>
                <span className="text-xs text-[#86868B] font-medium">
                  {metrics.salesHistory.length} {metrics.salesHistory.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>

              {metrics.salesHistory.length === 0 ? (
                <div className="bg-[#F5F5F7]/60 rounded-3xl p-8 text-center border border-gray-100/80 flex flex-col items-center">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-300 shadow-sm mb-3">
                    <Receipt size={24} strokeWidth={1.5} />
                  </div>
                  <h4 className="text-base font-bold text-[#1D1D1F] mb-1">
                    Nenhuma venda registrada
                  </h4>
                  <p className="text-xs text-[#86868B] max-w-xs mb-4 leading-relaxed">
                    Este cliente ainda não possui compras cadastradas no Bora.
                  </p>
                  <button
                    onClick={() => onRegisterSale(client)}
                    className="text-xs font-bold text-[#7A1C1D] bg-[#F8E7E9] hover:bg-[#F2D7D9] px-4 py-2 rounded-xl active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Registrar Primeira Venda</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {metrics.salesHistory.map(sale => {
                    const brand = brands.find(b => b.id === sale.brandId);
                    const isPending = sale.status === 'pending';

                    return (
                      <div 
                        key={sale.id}
                        className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between hover:border-gray-200 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span 
                              className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700 flex items-center gap-1.5"
                              style={{ borderLeft: `3px solid ${brand?.color || '#7A1C1D'}` }}
                            >
                              {brand?.name || 'Marca'}
                            </span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              !isPending 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {!isPending ? 'Pago' : 'Pendente'}
                            </span>
                          </div>

                          <p className="text-xs text-[#86868B]">
                            {isPending ? 'Vencimento:' : 'Registrado em:'}{' '}
                            <span className="font-semibold text-[#1D1D1F]">
                              {formatDate(sale.dueDate || sale.createdAt)}
                            </span>
                          </p>
                        </div>

                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p className="text-base font-black text-[#1D1D1F] tracking-tight">
                              R$ {sale.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-[10px] text-[#86868B]">
                              Lucro: R$ {sale.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>

                          {isPending && onRemindWhatsApp && (
                            <button
                              onClick={() => onRemindWhatsApp(sale)}
                              title="Enviar lembrete via WhatsApp"
                              className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 active:scale-95 transition-all border border-green-200/40"
                            >
                              <MessageCircle size={16} />
                            </button>
                          )}
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
