// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This code is designed for Supabase Edge Functions.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const rawToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    const mpAccessToken = (rawToken || '').trim().replace(/^["']|["']$/g, '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!mpAccessToken || !supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Configuração de ambiente ausente no servidor' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Autorização necessária' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Validação do token JWT do usuário que fez a requisição
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user || !user.email) {
      return new Response(JSON.stringify({ error: 'Sessão de usuário inválida ou sem e-mail' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let reqBody: any = {};
    try {
      reqBody = await req.json();
    } catch {
      // Body vazio
    }

    const targetPaymentId = reqBody?.paymentId ? String(reqBody.paymentId).trim() : null;
    let approvedP: any = null;

    // 1. Se paymentId foi informado, consulta diretamente na API do Mercado Pago (imediato e em tempo real)
    if (targetPaymentId) {
      console.log(`[Reconciliação] Verificando diretamente pagamento ${targetPaymentId} para: ${user.email} (${user.id})`);
      try {
        const directRes = await fetch(`https://api.mercadopago.com/v1/payments/${targetPaymentId}`, {
          headers: { Authorization: `Bearer ${mpAccessToken}` },
        });

        if (directRes.ok) {
          const directPayment = await directRes.json();
          const { data: existingPaymentRecord } = await supabaseAdmin
            .from('pagamentos')
            .select('user_id')
            .eq('mercado_pago_payment_id', String(directPayment.id))
            .maybeSingle();

          const belongs =
            directPayment.external_reference === user.id ||
            (directPayment.payer?.email && directPayment.payer.email.toLowerCase() === user.email.toLowerCase()) ||
            existingPaymentRecord?.user_id === user.id;

          if (belongs && directPayment.status === 'approved') {
            approvedP = directPayment;
            console.log(`[Reconciliação] Pagamento ${targetPaymentId} confirmado diretamente como approved!`);
          }
        }
      } catch (directErr: any) {
        console.warn('[Reconciliação] Erro na consulta direta:', directErr?.message);
      }
    }

    // 2. Se não encontrou por paymentId direto, busca nos pagamentos recentes do Mercado Pago
    if (!approvedP) {
      console.log(`[Reconciliação] Buscando pagamentos recentes Pix no Mercado Pago para: ${user.email} (${user.id})`);
      const paymentsSearchUrl = `https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=10`;
      const pRes = await fetch(paymentsSearchUrl, {
        headers: { Authorization: `Bearer ${mpAccessToken}` },
      });

      if (pRes.ok) {
        const pData = await pRes.json();
        approvedP = (pData.results || []).find((p: any) =>
          p.status === 'approved' &&
          (p.payer?.email?.toLowerCase() === user.email.toLowerCase() || p.external_reference === user.id)
        );
      }
    }

      if (approvedP) {
        console.log(`[Reconciliação] Pagamento Pix aprovado localizado: ID ${approvedP.id}`);
        const now = new Date();
        const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 dias corridos

        // Garante que o profile existe
        try {
          await supabaseAdmin.from('profiles').upsert({ id: user.id, nome: 'Revendedor Bora' }, { onConflict: 'id' });
        } catch {
          // Ignora
        }

        // Localiza assinatura correspondente
        const { data: userSub } = await supabaseAdmin
          .from('assinaturas')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Registra em pagamentos se não existir
        try {
          await supabaseAdmin.from('pagamentos').upsert({
            user_id: user.id,
            assinatura_id: userSub?.id || null,
            mercado_pago_payment_id: String(approvedP.id),
            status: 'approved',
            valor: approvedP.transaction_amount || 9.90,
            metodo_pagamento: approvedP.payment_method_id || 'pix',
            resposta_gateway: approvedP,
          }, { onConflict: 'mercado_pago_payment_id' });
        } catch {
          // Ignora
        }

        // Atualiza ou insere assinatura ativa
        if (userSub) {
          await supabaseAdmin
            .from('assinaturas')
            .update({
              status: 'ativa',
              plano: 'Bora Premium',
              mercado_pago_subscription_id: String(approvedP.id),
              valor: approvedP.transaction_amount || 9.90,
              data_inicio: now.toISOString(),
              data_fim: nextMonth.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq('id', userSub.id);
        } else {
          await supabaseAdmin.from('assinaturas').insert({
            user_id: user.id,
            plano: 'Bora Premium',
            status: 'ativa',
            mercado_pago_subscription_id: String(approvedP.id),
            valor: approvedP.transaction_amount || 9.90,
            data_inicio: now.toISOString(),
            data_fim: nextMonth.toISOString(),
          });
        }

        return new Response(JSON.stringify({
          success: true,
          status: 'ativa',
          message: 'Assinatura confirmada com sucesso via Pix!',
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

    return new Response(JSON.stringify({
      success: false,
      status: 'pendente',
      message: 'Pagamento ainda não confirmado. Assim que o Mercado Pago confirmar o pagamento, seu acesso será liberado automaticamente.',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Reconciliação] Erro interno:', error);
    return new Response(JSON.stringify({ error: 'Erro ao processar reconciliação' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
