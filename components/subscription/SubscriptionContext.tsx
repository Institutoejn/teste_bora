import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { SubscriptionRecord, SubscriptionStatus } from '../../types';
import { subscriptionService } from '../../services/subscriptionService';
import { SUBSCRIPTION_CONFIG } from '../../services/subscriptionConfig';
import { useAuth } from '../auth/AuthContext';

interface SubscriptionContextType {
  status: SubscriptionStatus;
  isAuthorized: boolean;
  isTrial: boolean;
  daysRemaining: number;
  hasUsedTrial: boolean;
  subscription: SubscriptionRecord | null;
  isLoading: boolean;
  isVerifying: boolean;
  setIsVerifying: (val: boolean) => void;
  refreshSubscription: () => Promise<void>;
  verifyAndPollSubscription: (paymentId?: string | number) => Promise<boolean>;
  startTrial: () => Promise<{ success: boolean; message: string; error?: string }>;
  isGateEnabled: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>('no_subscription');
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isTrial, setIsTrial] = useState<boolean>(false);
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const [hasUsedTrial, setHasUsedTrial] = useState<boolean>(false);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const isPollingRef = useRef<boolean>(false);

  const fetchSubscription = useCallback(async (userId?: string): Promise<boolean> => {
    if (!userId) {
      setStatus('no_subscription');
      setIsAuthorized(false);
      setIsTrial(false);
      setDaysRemaining(0);
      setHasUsedTrial(false);
      setSubscription(null);
      setIsLoading(false);
      return false;
    }

    try {
      const [record, historicalUsed] = await Promise.all([
        subscriptionService.getCurrentSubscription(userId),
        subscriptionService.hasUserUsedTrial(userId),
      ]);

      const access = subscriptionService.getSubscriptionAccessState(record, historicalUsed);
      setSubscription(record);
      setStatus(access.status);
      setIsAuthorized(access.isAuthorized);
      setIsTrial(access.isTrial);
      setDaysRemaining(access.daysRemaining);
      setHasUsedTrial(access.hasUsedTrial);

      return access.isAuthorized;
    } catch (err) {
      console.error('[Bora SubscriptionContext] Erro ao carregar assinatura:', err);
      setStatus('no_subscription');
      setIsAuthorized(false);
      setIsTrial(false);
      setDaysRemaining(0);
      setSubscription(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Realiza polling controlado (até 4 tentativas em ~10s) para aguardar o webhook
   * do Mercado Pago atualizar public.assinaturas.
   * Não inventa status: apenas autoriza se o registro no Supabase se tornar 'ativa'.
   */
  const verifyAndPollSubscription = useCallback(async (paymentId?: string | number): Promise<boolean> => {
    if (!user?.id || isPollingRef.current) return false;
    isPollingRef.current = true;
    setIsVerifying(true);

    try {
      let targetPaymentId = paymentId ? String(paymentId).trim() : null;
      if (!targetPaymentId) {
        try {
          targetPaymentId = sessionStorage.getItem('bora_last_pix_payment_id');
        } catch {
          // Ignora
        }
      }

      // 1. Tenta acionar a reconciliação autoritativa no backend
      await subscriptionService.reconcileSubscription(user.email, targetPaymentId || undefined);

      // 2. Primeira verificação imediata no Supabase
      let authorized = await fetchSubscription(user.id);
      if (authorized) {
        try { sessionStorage.removeItem('bora_last_pix_payment_id'); } catch {}
        setIsVerifying(false);
        isPollingRef.current = false;
        return true;
      }

      // 3. Polling em intervalos de 2.5s (até 3 retentativas adicionais)
      for (let i = 0; i < 3; i++) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        if (targetPaymentId && i === 1) {
          await subscriptionService.reconcileSubscription(user.email, targetPaymentId);
        }
        authorized = await fetchSubscription(user.id);
        if (authorized) {
          try { sessionStorage.removeItem('bora_last_pix_payment_id'); } catch {}
          setIsVerifying(false);
          isPollingRef.current = false;
          return true;
        }
      }

      // Se ainda não foi confirmado pelo webhook/banco, mantém isVerifying false
      // para exibir o estado com opção de verificar novamente
      setIsVerifying(false);
      isPollingRef.current = false;
      return false;
    } catch (error) {
      console.error('[Bora SubscriptionContext] Erro no polling de verificação:', error);
      setIsVerifying(false);
      isPollingRef.current = false;
      return false;
    }
  }, [user?.id, user?.email, fetchSubscription]);

  // Carga inicial ao autenticar
  useEffect(() => {
    if (user?.id) {
      fetchSubscription(user.id);
    } else {
      setStatus('no_subscription');
      setIsAuthorized(false);
      setSubscription(null);
      setIsLoading(false);
      setIsVerifying(false);
    }
  }, [user?.id, fetchSubscription]);

  const refreshSubscription = useCallback(async () => {
    if (user?.id) {
      await fetchSubscription(user.id);
    }
  }, [user?.id, fetchSubscription]);

  const startTrial = useCallback(async () => {
    const res = await subscriptionService.startFreeTrial();
    if (res.success && user?.id) {
      await fetchSubscription(user.id);
    }
    return res;
  }, [user?.id, fetchSubscription]);

  return (
    <SubscriptionContext.Provider
      value={{
        status,
        isAuthorized,
        isTrial,
        daysRemaining,
        hasUsedTrial,
        subscription,
        isLoading,
        isVerifying,
        setIsVerifying,
        refreshSubscription,
        verifyAndPollSubscription,
        startTrial,
        isGateEnabled: SUBSCRIPTION_CONFIG.isGateEnabled,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription deve ser utilizado dentro de um SubscriptionProvider');
  }
  return context;
};
