import { supabase } from './supabaseClient';
import { SubscriptionRecord, SubscriptionAccessState, SubscriptionStatus } from '../types';
import { mercadoPagoService, PixPaymentResponse } from './mercadoPagoService';
import { SUBSCRIPTION_CONFIG } from './subscriptionConfig';

export const subscriptionService = {
  config: SUBSCRIPTION_CONFIG,

  /**
   * Obtém o registro de assinatura do usuário autenticado a partir de public.assinaturas.
   * Ordena pelo início mais recente para capturar a assinatura mais atual.
   */
  async getCurrentSubscription(userId?: string): Promise<SubscriptionRecord | null> {
    try {
      let targetUserId = userId;

      if (!targetUserId) {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          return null;
        }
        targetUserId = user.id;
      }

      const { data, error } = await supabase
        .from('assinaturas')
        .select('id, user_id, plano, status, mercado_pago_customer_id, mercado_pago_subscription_id, valor, data_inicio, data_fim, created_at, updated_at')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('[Bora Subscription] Erro ao consultar public.assinaturas:', error.message);
        return null;
      }

      return data as SubscriptionRecord | null;
    } catch (err) {
      console.error('[Bora Subscription] Erro inesperado ao obter assinatura:', err);
      return null;
    }
  },

  /**
   * Inicializa o registro de assinatura com status 'pendente' para novos usuários no cadastro.
   * Operação idempotente: se o usuário já possuir qualquer assinatura, preserva-a sem duplicatas.
   */
  async initializePendingSubscription(userId: string): Promise<SubscriptionRecord | null> {
    try {
      if (!userId) return null;

      // 1. Verifica se já existe registro em public.assinaturas para evitar duplicata (idempotente)
      const { data: existing, error: checkError } = await supabase
        .from('assinaturas')
        .select('id, user_id, plano, status, data_inicio, data_fim, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        return existing as SubscriptionRecord;
      }

      // 2. Insere assinatura pendente inicial (plano Bora Premium, status pendente, sem data_fim)
      const now = new Date().toISOString();
      const { data: inserted, error: insertError } = await supabase
        .from('assinaturas')
        .insert({
          user_id: userId,
          plano: 'Bora Premium',
          status: 'pendente',
          data_inicio: now,
          data_fim: null,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (insertError) {
        console.warn('[Bora Subscription] Aviso ao inicializar assinatura pendente:', insertError.message);
        return null;
      }

      return inserted as SubscriptionRecord;
    } catch (err) {
      console.error('[Bora Subscription] Erro inesperado ao inicializar assinatura pendente:', err);
      return null;
    }
  },

  /**
   * Verifica se o usuário já utilizou o teste grátis em algum momento do histórico
   */
  async hasUserUsedTrial(userId?: string): Promise<boolean> {
    try {
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;
        targetUserId = user.id;
      }

      const { data, error } = await supabase
        .from('assinaturas')
        .select('id, plano, status')
        .eq('user_id', targetUserId);

      if (error || !data || data.length === 0) {
        return false;
      }

      return data.some(item => 
        item.status === 'trial' ||
        (item.plano && item.plano.toLowerCase().includes('teste')) ||
        item.status === 'ativa' ||
        item.status === 'active' ||
        item.status === 'cancelled' ||
        item.status === 'overdue' ||
        item.status === 'pendente' ||
        item.status === 'pending'
      );
    } catch (err) {
      console.warn('[Bora Subscription] Erro ao conferir histórico de teste:', err);
      return false;
    }
  },

  /**
   * Mapeia o registro da assinatura para o estado de acesso na interface (SubscriptionAccessState).
   * Considera os 7 dias corridos para o teste grátis e ciclo mensal de 30 dias para assinaturas pagas.
   */
  getSubscriptionAccessState(
    subscription: SubscriptionRecord | null,
    hasUsedTrialHistory = false
  ): SubscriptionAccessState {
    if (!subscription) {
      return {
        status: 'no_subscription',
        isAuthorized: false,
        isTrial: false,
        daysRemaining: 0,
        hasUsedTrial: hasUsedTrialHistory,
      };
    }

    const normalizedStatus = (subscription.status || '').trim().toLowerCase();
    const isTrialPlan = 
      normalizedStatus === 'trial' || 
      normalizedStatus === 'free_trial' || 
      normalizedStatus === 'teste_gratis' || 
      (subscription.plano || '').toLowerCase().includes('teste');

    // Cálculo dos dias corridos restantes com base em data_fim
    let daysRemaining = 0;
    let isExpired = false;

    if (subscription.data_fim) {
      const now = new Date();
      const end = new Date(subscription.data_fim);
      const diffMs = end.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      isExpired = diffMs <= 0;
    }

    // 1. Cenário de Teste Grátis de 7 dias corridos
    if (isTrialPlan) {
      if (!isExpired) {
        return {
          status: 'active',
          isAuthorized: true,
          isTrial: true,
          daysRemaining: Math.max(1, daysRemaining),
          hasUsedTrial: true,
          dataFim: subscription.data_fim,
        };
      } else {
        // Expirou o período de 7 dias corridos -> bloqueio para pagamento
        return {
          status: 'overdue',
          isAuthorized: false,
          isTrial: false,
          daysRemaining: 0,
          hasUsedTrial: true,
          dataFim: subscription.data_fim,
        };
      }
    }

    // 2. Cenário de Assinatura Paga (Ativa) - ciclo de 30 dias
    if (normalizedStatus === 'active' || normalizedStatus === 'ativa' || normalizedStatus === 'authorized') {
      if (subscription.data_fim && isExpired) {
        // Ciclo mensal expirou (30 dias corridos) -> bloqueio para pagamento da renovação
        return {
          status: 'overdue',
          isAuthorized: false,
          isTrial: false,
          daysRemaining: 0,
          hasUsedTrial: true,
          dataFim: subscription.data_fim,
        };
      }

      return {
        status: 'active',
        isAuthorized: true,
        isTrial: false,
        daysRemaining,
        hasUsedTrial: true,
        dataFim: subscription.data_fim,
      };
    }

    // 3. Pagamento Pendente
    if (normalizedStatus === 'pending' || normalizedStatus === 'pendente' || normalizedStatus === 'in_process') {
      return {
        status: 'pending',
        isAuthorized: false,
        isTrial: false,
        daysRemaining: 0,
        hasUsedTrial: true,
        dataFim: subscription.data_fim,
      };
    }

    // 4. Cancelada ou Atrasada
    if (normalizedStatus === 'cancelled' || normalizedStatus === 'cancelada') {
      return {
        status: 'cancelled',
        isAuthorized: false,
        isTrial: false,
        daysRemaining: 0,
        hasUsedTrial: true,
        dataFim: subscription.data_fim,
      };
    }

    return {
      status: 'overdue',
      isAuthorized: false,
      isTrial: false,
      daysRemaining: 0,
      hasUsedTrial: true,
      dataFim: subscription.data_fim,
    };
  },

  /**
   * Ativa os 7 dias grátis de teste para o usuário autenticado
   */
  async startFreeTrial(): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        return { success: false, message: 'Usuário não autenticado.', error: 'unauthorized' };
      }

      // Tenta via endpoint do servidor (autoritativo com verificação anti-fraude)
      for (const endpoint of ['/api/subscription/start-trial', '/subscription/start-trial']) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
          });

          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const resData = await response.json();
            if (response.ok && resData.success) {
              return { success: true, message: resData.message || 'Período de teste ativado com sucesso!' };
            } else if (response.status === 400) {
              return { success: false, message: resData.error || 'Período de teste já utilizado.', error: 'already_used' };
            }
          }
        } catch (fetchErr) {
          console.warn(`[Bora Subscription] Endpoint ${endpoint} oscilou:`, fetchErr);
        }
      }

      // Fallback direto via Supabase se o endpoint local oscilar
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 dias corridos

      // Garante profile
      const fallbackName = (session.user.user_metadata?.nome as string) || (session.user.email ? session.user.email.split('@')[0] : 'Revendedor Bora');
      const fallbackPhone = (session.user.user_metadata?.telefone as string) || '';
      try {
        await supabase.from('profiles').upsert({
          id: session.user.id,
          nome: fallbackName,
          telefone: fallbackPhone,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      } catch {
        // Ignora erro se já existir
      }

      const { data: existing } = await supabase
        .from('assinaturas')
        .select('id')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      let upsertError: any = null;

      if (existing && existing.length > 0) {
        const { error } = await supabase
          .from('assinaturas')
          .update({
            plano: 'Bora - Teste Grátis (7 dias)',
            status: 'trial',
            valor: 0,
            data_inicio: now.toISOString(),
            data_fim: trialEnd.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('id', existing[0].id);
        upsertError = error;
      } else {
        const { error } = await supabase
          .from('assinaturas')
          .insert({
            user_id: session.user.id,
            plano: 'Bora - Teste Grátis (7 dias)',
            status: 'trial',
            valor: 0,
            data_inicio: now.toISOString(),
            data_fim: trialEnd.toISOString(),
            updated_at: now.toISOString(),
          });
        upsertError = error;
      }

      if (upsertError) {
        console.error('[Bora Subscription] Erro ao registrar teste no Supabase:', upsertError.message);
        return { success: false, message: 'Não foi possível ativar seu período de teste. Tente novamente.' };
      }

      return { success: true, message: 'Período de teste grátis de 7 dias ativado com sucesso!' };
    } catch (err: any) {
      console.error('[Bora Subscription] Erro inesperado ao ativar teste grátis:', err);
      return { success: false, message: 'Erro ao ativar o teste grátis.' };
    }
  },

  /**
   * Gera pagamento Pix com QR Code diretamente
   */
  async generatePixPayment(amount = 9.90): Promise<PixPaymentResponse> {
    return mercadoPagoService.createPixPayment(amount);
  },

  /**
   * Checa o status do pagamento Pix
   */
  async checkPixStatus(paymentId: string | number): Promise<{ approved: boolean; status: string; message?: string }> {
    return mercadoPagoService.checkPaymentStatus(paymentId);
  },

  /**
   * Solicita a reconciliação autoritativa do status
   */
  async reconcileSubscription(userEmail?: string, paymentId?: string | number): Promise<{ success: boolean; status?: string; message: string }> {
    return mercadoPagoService.reconcileSubscription(userEmail, paymentId);
  },
};
