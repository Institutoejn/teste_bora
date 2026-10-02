// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This code is designed for Supabase Edge Functions.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface MercadoPagoPayment {
  id: number | string;
  status: string; // 'approved' | 'pending' | 'in_process' | 'rejected' | 'cancelled'
  transaction_amount?: number;
  payment_method_id?: string;
  payer?: {
    email?: string;
  };
  external_reference?: string;
  date_created?: string;
  date_approved?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
};

/**
 * Calcula o hash HMAC-SHA256 utilizando a API nativa Web Crypto
 */
async function calculateHmacSha256(secret: string, manifest: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(manifest));
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Comparação em tempo constante para mitigar timing attacks
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

Deno.serve(async (req) => {
  // Tratamento de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const queryTopic = url.searchParams.get('topic') || url.searchParams.get('type');
  const queryDataId = url.searchParams.get('data.id') || url.searchParams.get('id');

  // Permite GET simples de ping/healthcheck apenas se não contiver parâmetros de evento e sem x-signature
  if (req.method === 'GET' && !queryDataId && !queryTopic && !req.headers.get('x-signature')) {
    return new Response(JSON.stringify({ status: 'ok', service: 'mercadopago-webhook' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const rawToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    const mpAccessToken = (rawToken || '').trim().replace(/^["']|["']$/g, '');
    const rawSecret = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET');
    const mpWebhookSecret = (rawSecret || '').trim().replace(/^["']|["']$/g, '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!mpAccessToken || !supabaseUrl || !supabaseServiceKey) {
      console.error('[Webhook] Configurações de ambiente ausentes no Edge Function');
      return new Response(JSON.stringify({ error: 'Configuração do servidor incompleta' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    let body: any = null;
    if (req.method === 'POST') {
      try {
        body = await req.json();
      } catch {
        // Corpo não-JSON ou vazio
      }
    }

    // =========================================================================
    // 1. EXTRAÇÃO NORMALIZADA DO PAYMENT ID
    // =========================================================================
    // Suporta os formatos de notificação documentados para Payments API:
    // - query 'data.id' quando type=payment (Webhooks v2 ou IPN)
    // - query 'id' quando topic=payment (IPN legado do Mercado Pago)
    // - body.data.id para Webhooks v2 assinados
    // - body.id como fallback
    const rawPaymentId =
      url.searchParams.get('data.id') ||
      (body?.data?.id ? String(body.data.id) : '') ||
      url.searchParams.get('id') ||
      (body?.id ? String(body.id) : '');

    const paymentId = rawPaymentId.trim();
    const topic = (body?.type || body?.topic || queryTopic || '').trim().toLowerCase();

    // =========================================================================
    // 2. VALIDAÇÃO DE SEGURANÇA (WEBHOOKS ASSINADOS vs NOTIFICAÇÕES IPN)
    // =========================================================================
    const xSignature = req.headers.get('x-signature');
    const xRequestId = req.headers.get('x-request-id');
    const isSigned = Boolean(xSignature && xRequestId);

    if (isSigned) {
      // Notificação com cabeçalhos de assinatura (Mercado Pago Webhook v2)
      if (!mpWebhookSecret) {
        console.error('[Webhook] MERCADOPAGO_WEBHOOK_SECRET não configurado.');
        return new Response(JSON.stringify({ error: 'Configuração de webhook secret incompleta.' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let ts = '';
      let hash = '';
      const signatureParts = (xSignature || '').split(',');
      for (const part of signatureParts) {
        const [k, v] = part.split('=');
        if (k?.trim() === 'ts') ts = v?.trim() || '';
        if (k?.trim() === 'v1') hash = v?.trim() || '';
      }

      if (!ts || !hash) {
        console.warn('[Webhook] Header x-signature malformado.');
        return new Response(JSON.stringify({ error: 'Assinatura inválida ou malformada' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Manifesto oficial do Mercado Pago: id:[data.id];request-id:[x-request-id];ts:[ts];
      const manifest = `id:${paymentId};request-id:${xRequestId};ts:${ts};`;
      const calculatedHash = await calculateHmacSha256(mpWebhookSecret, manifest);

      if (!constantTimeEqual(calculatedHash.toLowerCase(), hash.toLowerCase())) {
        console.warn('[Webhook] Assinatura HMAC inválida. Rejeitando requisição.');
        return new Response(JSON.stringify({ error: 'Assinatura HMAC inválida' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`[Webhook] Assinatura HMAC validada com sucesso para o pagamento ${paymentId}`);
    } else {
      // Notificação sem cabeçalho x-signature (IPN legado disparado via notification_url de /v1/payments)
      console.log(`[Webhook] Notificação IPN sem assinatura para o recurso ${paymentId} (topic: ${topic}). Validação autoritativa via API do Mercado Pago.`);
    }

    // Se não for um ID de pagamento numérico válido:
    if (!paymentId || !/^\d+$/.test(paymentId)) {
      console.warn(`[Webhook] Notificação ignorada: Payment ID numérico ausente ou inválido (${paymentId})`);
      return new Response(JSON.stringify({ error: 'Payment ID ausente ou inválido', received: true }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // =========================================================================
    // 3. CONSULTA AUTORITATIVA JUNTO À API DO MERCADO PAGO (SERVER-TO-SERVER)
    // =========================================================================
    console.log(`[Webhook] Consultando autoritativamente pagamento ${paymentId} na API do Mercado Pago...`);
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
      },
    });

    if (!mpRes.ok) {
      console.error(`[Webhook] Falha ao consultar pagamento ${paymentId} no Mercado Pago. Status HTTP: ${mpRes.status}`);
      return new Response(JSON.stringify({ error: 'Falha ao consultar pagamento no Mercado Pago' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mpPayment: MercadoPagoPayment = await mpRes.json();
    console.log(`[Webhook] Pagamento ${paymentId} retornado pelo Mercado Pago: status=${mpPayment.status}`);

    // =========================================================================
    // 4. ASSOCIAÇÃO SEGURA COM O USUÁRIO BORA
    // =========================================================================
    // Busca o registro prévio na tabela public.pagamentos emitido durante a geração do Pix
    const { data: dbPaymentRecord, error: dbPayErr } = await supabaseAdmin
      .from('pagamentos')
      .select('id, user_id, status, valor, assinatura_id')
      .eq('mercado_pago_payment_id', String(mpPayment.id))
      .maybeSingle();

    if (dbPayErr) {
      console.warn('[Webhook] Aviso ao consultar public.pagamentos:', dbPayErr.message);
    }

    let targetUserId: string | null = null;

    if (dbPaymentRecord && dbPaymentRecord.user_id) {
      targetUserId = dbPaymentRecord.user_id;

      // Se external_reference estiver presente na resposta do Mercado Pago, deve ser consistente
      if (mpPayment.external_reference && mpPayment.external_reference.trim() !== targetUserId) {
        console.error(`[Webhook] Inconsistência de segurança: external_reference (${mpPayment.external_reference}) diverge de public.pagamentos.user_id (${targetUserId})`);
        return new Response(JSON.stringify({ error: 'Inconsistência no vínculo de usuário do pagamento' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else if (mpPayment.external_reference) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const ref = mpPayment.external_reference.trim();
      if (uuidRegex.test(ref)) {
        targetUserId = ref;
      }
    }

    if (!targetUserId) {
      console.warn(`[Webhook] Pagamento ${paymentId} não pôde ser associado a nenhum usuário BORA válido.`);
      return new Response(JSON.stringify({ error: 'Usuário BORA não localizado para este pagamento' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Webhook] Usuário BORA validado para pagamento ${paymentId}: ${targetUserId}`);

    // Garante que o profile existe
    try {
      const { data: prof } = await supabaseAdmin.from('profiles').select('id').eq('id', targetUserId).maybeSingle();
      if (!prof) {
        await supabaseAdmin.from('profiles').upsert({ id: targetUserId, nome: 'Revendedor Bora' }, { onConflict: 'id' });
      }
    } catch (profErr: any) {
      console.warn('[Webhook] Aviso ao verificar profile:', profErr?.message);
    }

    // Localiza assinatura correspondente do usuário
    const { data: userSub } = await supabaseAdmin
      .from('assinaturas')
      .select('id, status, mercado_pago_subscription_id, data_inicio, data_fim')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // =========================================================================
    // 5. ATUALIZAÇÃO AUTORITATIVA EM public.pagamentos
    // =========================================================================
    try {
      await supabaseAdmin.from('pagamentos').upsert({
        user_id: targetUserId,
        assinatura_id: userSub?.id || dbPaymentRecord?.assinatura_id || null,
        mercado_pago_payment_id: String(mpPayment.id),
        status: mpPayment.status,
        valor: mpPayment.transaction_amount || 9.90,
        metodo_pagamento: mpPayment.payment_method_id || 'pix',
        resposta_gateway: mpPayment,
      }, { onConflict: 'mercado_pago_payment_id' });
      console.log(`[Webhook] public.pagamentos atualizado para status '${mpPayment.status}'`);
    } catch (payUpsertErr: any) {
      console.warn('[Webhook] Aviso ao atualizar public.pagamentos:', payUpsertErr?.message);
    }

    // =========================================================================
    // 6. ATIVAÇÃO DE ACESSO E IDEMPOTÊNCIA EM public.assinaturas
    // =========================================================================
    if (mpPayment.status === 'approved') {
      // Se a assinatura já está ativa para este mesmo pagamento, preserva sem estender repetidamente
      const isAlreadyActiveForThisPayment =
        userSub &&
        (userSub.status === 'ativa' || userSub.status === 'active') &&
        userSub.mercado_pago_subscription_id === String(mpPayment.id);

      if (isAlreadyActiveForThisPayment) {
        console.log(`[Webhook] Assinatura do usuário ${targetUserId} já estava ativa para o pagamento ${mpPayment.id}. Idempotência garantida.`);
        return new Response(JSON.stringify({ success: true, processed: 'payment', status: 'already_active' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const startDate = mpPayment.date_approved ? new Date(mpPayment.date_approved) : new Date();
      const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 dias corridos

      if (userSub) {
        const { error: subUpdateErr } = await supabaseAdmin
          .from('assinaturas')
          .update({
            status: 'ativa',
            plano: 'Bora Premium',
            mercado_pago_subscription_id: String(mpPayment.id),
            valor: mpPayment.transaction_amount || 9.90,
            data_inicio: startDate.toISOString(),
            data_fim: endDate.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userSub.id);

        if (subUpdateErr) {
          console.error('[Webhook] Erro ao atualizar public.assinaturas:', subUpdateErr.message);
          return new Response(JSON.stringify({ error: 'Erro ao atualizar assinatura' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        console.log(`[Webhook] Assinatura ${userSub.id} ativada para usuário ${targetUserId} até ${endDate.toISOString()}`);
      } else {
        const { error: subInsertErr } = await supabaseAdmin
          .from('assinaturas')
          .insert({
            user_id: targetUserId,
            plano: 'Bora Premium',
            status: 'ativa',
            mercado_pago_subscription_id: String(mpPayment.id),
            valor: mpPayment.transaction_amount || 9.90,
            data_inicio: startDate.toISOString(),
            data_fim: endDate.toISOString(),
          });

        if (subInsertErr) {
          console.error('[Webhook] Erro ao inserir public.assinaturas:', subInsertErr.message);
          return new Response(JSON.stringify({ error: 'Erro ao criar assinatura' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        console.log(`[Webhook] Nova assinatura criada e ativada para usuário ${targetUserId} até ${endDate.toISOString()}`);
      }

      return new Response(JSON.stringify({ success: true, processed: 'payment', status: 'approved' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Status não aprovado (pending, in_process, rejected, cancelled)
    console.log(`[Webhook] Pagamento ${mpPayment.id} possui status '${mpPayment.status}' — Acesso não liberado.`);
    return new Response(JSON.stringify({ success: true, processed: 'payment', status: mpPayment.status }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[Webhook] Erro interno:', error?.message || error);
    return new Response(JSON.stringify({ error: 'Erro interno ao processar webhook' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
