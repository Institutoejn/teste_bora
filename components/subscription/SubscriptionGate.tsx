import React, { useState } from 'react';
import { Clock, RefreshCw, LogOut, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from '../GlassCard';
import { SubscriptionStatus } from '../../types';
import { SubscriptionModal } from './SubscriptionModal';
import { useSubscription } from './SubscriptionContext';

interface SubscriptionGateProps {
  status: SubscriptionStatus;
  onLogout: () => Promise<void>;
}

export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({ status, onLogout }) => {
  const { refreshSubscription, verifyAndPollSubscription, isLoading } = useSubscription();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await verifyAndPollSubscription();
    await refreshSubscription();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // CASO C: Assinatura Pendente (aguardando confirmação do Mercado Pago)
  if (status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F5F7]">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-lg"
        >
          <GlassCard className="p-7 sm:p-9 bg-white/95 rounded-[32px] border border-white/80 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 border border-amber-200/80 mx-auto flex items-center justify-center shadow-sm">
              <Clock size={30} className="animate-pulse" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                Pagamento em Análise
              </span>
              <h2 className="text-2xl font-extrabold text-[#1D1D1F] tracking-tight">
                Assinatura em processamento
              </h2>
              <p className="text-sm text-[#86868B] leading-relaxed max-w-sm mx-auto">
                Identificamos o início da sua assinatura Bora Premium. O Mercado Pago está processando a confirmação do Pix. Assim que for confirmado, seu acesso será liberado automaticamente.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-gray-200/60 text-xs text-[#86868B] space-y-1 text-left">
              <p className="font-semibold text-[#1D1D1F]">O que acontece agora?</p>
              <p>• Pagamentos via Pix costumam ser confirmados em instantes.</p>
              <p>• Você não precisa reenviar o comprovante.</p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                className="w-full py-3.5 px-5 rounded-2xl bg-[#7A1C1D] hover:bg-[#6E2E49] active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-[#7A1C1D]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
                <span>{isRefreshing ? 'Verificando confirmação...' : 'Verificar confirmação agora'}</span>
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="w-full py-3 px-4 rounded-2xl text-[#86868B] hover:text-rose-600 hover:bg-rose-50/50 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sair da conta</span>
              </button>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  // CASO F: Assinatura com Pagamento Atrasado / Período Expirado (após 7 dias ou mês anterior)
  if (status === 'overdue') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F5F7]">
        <SubscriptionModal
          onLogout={onLogout}
          statusMessage="Seu período de teste grátis ou ciclo de assinatura chegou ao fim. Para continuar usando o Bora, realize o pagamento via Pix."
        />
      </div>
    );
  }

  // CASO E: Assinatura Cancelada
  if (status === 'cancelled') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F5F7]">
        <SubscriptionModal
          onLogout={onLogout}
          statusMessage="Sua assinatura anterior foi cancelada. Gere um novo Pix para continuar desfrutando de todos os recursos do Bora."
        />
      </div>
    );
  }

  // CASO A & B: Novo usuário ou Usuário sem assinatura ativa
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F5F7]">
      <SubscriptionModal onLogout={onLogout} />
    </div>
  );
};
