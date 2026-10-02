/**
 * Bora — Serviço e Integração Mercado Pago Pix (QR Code)
 * 
 * Fornece métodos para geração de QR Code do Pix em tempo real,
 * consulta de status e reconciliação segura.
 */

import { supabase } from './supabaseClient';

export interface PixPaymentResponse {
  success: boolean;
  method?: 'direct_pix';
  payment?: {
    id?: string | number;
    status?: string;
    point_of_interaction?: {
      transaction_data?: {
        qr_code?: string;
        qr_code_base64?: string;
        ticket_url?: string;
      };
    };
    [key: string]: any;
  };
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
  paymentId?: string | number;
  status?: string;
  amount?: number;
  qr_code?: string;
  qr_code_base64?: string | null;
  qrCode?: string;
  qrCodeBase64?: string | null;
  qrCodeImageUrl?: string;
  ticketUrl?: string | null;
  error?: string;
  [key: string]: any;
}

export interface ReconcileResult {
  success: boolean;
  status?: 'ativa' | 'pendente' | 'cancelada' | 'atrasada' | 'nao_encontrada';
  message: string;
}

export const mercadoPagoService = {
  /**
   * Gera pagamento Pix com QR Code de forma 100% segura via servidor/Edge Function.
   * Nenhum token ou credencial privada do Mercado Pago é exposto ao navegador.
   */
  async createPixPayment(amount = 9.90): Promise<PixPaymentResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        return {
          success: false,
          error: 'Faça login no Bora para gerar o QR Code.',
        };
      }

      // 1. Tenta via Supabase Edge Function 'mercadopago-pix' (padrão de produção)
      try {
        const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('mercadopago-pix', {
          body: { amount },
        });

        if (!edgeErr && edgeData && (edgeData.qrCode || edgeData.qrCodeBase64)) {
          console.log('[MercadoPagoService] QR Code gerado com sucesso via Supabase Edge Function.');
          return {
            success: true,
            method: 'direct_pix',
            paymentId: edgeData.paymentId,
            status: edgeData.status || 'pending',
            amount: edgeData.amount || amount,
            qr_code: edgeData.qrCode,
            qr_code_base64: edgeData.qrCodeBase64,
            qrCode: edgeData.qrCode,
            qrCodeBase64: edgeData.qrCodeBase64,
            qrCodeImageUrl: edgeData.qrCodeImageUrl || (edgeData.qrCodeBase64
              ? `data:image/png;base64,${edgeData.qrCodeBase64}`
              : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(edgeData.qrCode)}`),
            ticketUrl: edgeData.ticketUrl || null,
          };
        }
      } catch (edgeInvokeErr) {
        console.warn('[MercadoPagoService] Edge Function indisponível, tentando backend local /api:', edgeInvokeErr);
      }

      // 2. Fallback via backend Express (/api/mercadopago/pix-payment ou /mercadopago/pix-payment)
      const endpoints = ['/api/mercadopago/pix-payment', '/mercadopago/pix-payment'];
      let lastErrorMessage = '';

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ amount }),
          });

          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            const td = data?.payment?.point_of_interaction?.transaction_data || data?.point_of_interaction?.transaction_data;
            const qr = td?.qr_code || data?.qrCode || data?.qr_code;
            const qrB64 = td?.qr_code_base64 || data?.qrCodeBase64 || data?.qr_code_base64;

            if (res.ok && data.success && (qr || qrB64)) {
              console.log(`[MercadoPagoService] QR Code gerado com sucesso via backend ${endpoint}.`);
              return data;
            }
            if (data.error || data.message) {
              lastErrorMessage = data.error || data.message;
            }
          } else if (res.status === 404) {
            // Tenta o próximo endpoint
            continue;
          }
        } catch (fetchErr: any) {
          console.warn(`[MercadoPagoService] Falha ao conectar em ${endpoint}:`, fetchErr.message);
        }
      }

      return {
        success: false,
        error: lastErrorMessage || 'Não foi possível gerar o código Pix no momento. Tente novamente em instantes.',
      };
    } catch (err: any) {
      console.error('[Bora MercadoPago] Erro ao requisitar Pix:', err);
      return {
        success: false,
        error: 'Erro de conexão ao gerar o QR Code. Tente novamente.',
      };
    }
  },

  /**
   * Consulta o status do pagamento Pix via Supabase Edge Function 'mercadopago-pix'.
   * REGRA CRÍTICA DE SEGURANÇA: Esta função consulta autoritativamente a Edge Function
   * que valida o pagamento junto à API do Mercado Pago no servidor.
   */
  async checkPaymentStatus(paymentId: string | number): Promise<{ approved: boolean; status: string; message?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        return { approved: false, status: 'unauthorized', message: 'Usuário não autenticado.' };
      }

      const pIdStr = String(paymentId).trim();

      // Invoca exclusivamente a Supabase Edge Function 'mercadopago-pix' com a ação check_status
      const { data, error } = await supabase.functions.invoke('mercadopago-pix', {
        body: {
          action: 'check_status',
          paymentId: pIdStr,
        },
      });

      if (error) {
        console.warn('[MercadoPagoService] Erro na consulta de status via Edge Function mercadopago-pix:', error.message);
        return {
          approved: false,
          status: 'pending',
          message: 'Aguardando confirmação do pagamento no Mercado Pago...',
        };
      }

      if (data && (data.approved === true || data.status === 'approved')) {
        return {
          approved: true,
          status: 'approved',
          message: data.message || 'Pagamento Pix confirmado com sucesso!',
        };
      }

      return {
        approved: false,
        status: data?.status || 'pending',
        message: data?.message || 'Pagamento ainda não confirmado. Assim que o Mercado Pago confirmar o pagamento, seu acesso será liberado automaticamente.',
      };
    } catch (err: any) {
      console.warn('[MercadoPagoService] Erro inesperado ao checar status:', err?.message || err);
      return {
        approved: false,
        status: 'pending',
        message: 'Pagamento ainda não confirmado. Assim que o Mercado Pago confirmar o pagamento, seu acesso será liberado automaticamente.',
      };
    }
  },

  /**
   * Reconcilia a assinatura de forma autoritativa no backend
   */
  async reconcileSubscription(userEmail?: string, paymentId?: string | number): Promise<ReconcileResult> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return {
          success: false,
          status: 'nao_encontrada',
          message: 'Usuário não autenticado.',
        };
      }

      let targetPaymentId = paymentId ? String(paymentId).trim() : null;
      if (!targetPaymentId) {
        try {
          targetPaymentId = sessionStorage.getItem('bora_last_pix_payment_id');
        } catch {
          // Ignora
        }
      }

      // 1. Se houver paymentId, consulta diretamente a Edge Function mercadopago-pix
      if (targetPaymentId) {
        try {
          const { data: pixData, error: pixErr } = await supabase.functions.invoke('mercadopago-pix', {
            body: { action: 'check_status', paymentId: targetPaymentId },
          });
          if (!pixErr && pixData && (pixData.approved || pixData.status === 'approved')) {
            return {
              success: true,
              status: 'ativa',
              message: 'Assinatura confirmada com sucesso via Pix!',
            };
          }
        } catch (pixErr) {
          console.warn('[MercadoPagoService] Falha ao verificar mercadopago-pix na reconciliação:', pixErr);
        }
      }

      // 2. Tenta via Edge Function de reconciliação no Supabase
      try {
        const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('reconcile-mercadopago-subscription', {
          body: {
            email: userEmail || session.user.email,
            paymentId: targetPaymentId || undefined,
          },
        });

        if (!edgeErr && edgeData) {
          return {
            success: Boolean(edgeData.success),
            status: edgeData.status || 'pendente',
            message: edgeData.message || 'Reconciliação concluída via Supabase Edge Function.',
          };
        }
      } catch (edgeErr) {
        console.warn('[Bora MercadoPago] Edge Function de reconciliação indisponível:', edgeErr);
      }

      // 2. Fallback via backend local
      const res = await fetch('/api/mercadopago/reconcile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email: userEmail || session.user.email }),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          success: Boolean(data.success),
          status: data.status || 'pendente',
          message: data.message || 'Reconciliação concluída.',
        };
      }

      return {
        success: false,
        status: 'nao_encontrada',
        message: 'Aguardando processamento do pagamento via Pix.',
      };
    } catch (err) {
      console.warn('[Bora MercadoPago] Reconciliação indisponível:', err);
      return {
        success: false,
        status: 'nao_encontrada',
        message: 'Aguardando confirmação do Pix.',
      };
    }
  },
};
