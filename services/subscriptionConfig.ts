/**
 * Bora — Configuração Centralizada da Assinatura e Mercado Pago
 * 
 * Portão de pagamento ativo:
 * Exige assinatura ativa confirmada no Supabase para liberar o acesso ao Bora.
 * Integração com Mercado Pago Pix via QR Code direto.
 */

// Portão de assinatura sempre ativo por padrão para operação real e oficial
const envGateFlag = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUBSCRIPTION_GATE_ENABLED : undefined;

export const isSubscriptionGateEnabled: boolean = envGateFlag !== 'false';

export const SUBSCRIPTION_CONFIG = {
  /**
   * Indica se a verificação de assinatura ativa é obrigatória para acessar o Bora.
   * Ativo por padrão (true).
   */
  isGateEnabled: isSubscriptionGateEnabled,

  /**
   * Nome oficial do plano
   */
  planName: 'Bora Premium',

  /**
   * Valor mensal do plano
   */
  planPrice: 'R$ 9,90',

  /**
   * Período de teste sem custos
   */
  trialDays: 7,
};
