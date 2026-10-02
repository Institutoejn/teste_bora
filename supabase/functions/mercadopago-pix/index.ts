import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Tratamento de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const rawToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    const mpAccessToken = (rawToken || '').trim().replace(/^["']|["']$/g, '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!mpAccessToken || !supabaseUrl || !supabaseServiceKey) {
      console.error('[MercadoPago Pix Edge Function] Variáveis de ambiente ausentes no Supabase.');
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor incompleta no Supabase.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Sessão de usuário não autorizada.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user || !user.email) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado ou inválido.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Leitura do corpo da requisição
    let reqBody: any = {};
    try {
      reqBody = await req.json();
    } catch {
      // Body vazio, assume valor padrão
    }

    // =========================================================================
    // 1. CHECAGEM AUTORITATIVA DE STATUS DO PAGAMENTO (check_status)
    // =========================================================================
    if (reqBody?.action === 'check_status') {
      const paymentId = String(reqBody?.paymentId || '').trim();

      // 3. Validação do Payment ID
      if (!paymentId) {
        return new Response(
          JSON.stringify({
            success: false,
            approved: false,
            status: 'invalid',
            message: 'paymentId é obrigatório.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 4. Verificação de titularidade do pagamento em public.pagamentos
      const { data: existingPayment, error: existingPaymentErr } = await supabaseAdmin
        .from('pagamentos')
        .select('*')
        .eq('mercado_pago_payment_id', paymentId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingPaymentErr) {
        console.error(`[MercadoPago Pix Edge Function] Erro ao buscar pagamento ${paymentId} para user ${user.id}:`, existingPaymentErr);
        return new Response(
          JSON.stringify({
            success: false,
            approved: false,
            status: 'database_error',
            message: 'Erro ao consultar registro de pagamento.',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!existingPayment) {
        console.warn(`[MercadoPago Pix Edge Function] Pagamento ${paymentId} não encontrado para usuário ${user.id} (${user.email})`);
        return new Response(
          JSON.stringify({
            success: false,
            approved: false,
            status: 'not_found',
            message: 'Pagamento não encontrado para este usuário.',
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 5. Consulta autoritativa no Mercado Pago (GET /v1/payments/{paymentId})
      console.log(`[MercadoPago Pix Edge Function] Checking payment ${paymentId} for user ${user.id}`);

      const mpCheckRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`,
        },
      });

      // 6. Tratamento de erros da API do Mercado Pago
      if (!mpCheckRes.ok) {
        const errBody = await mpCheckRes.json().catch(() => null);
        console.error(`[MercadoPago Pix Edge Function] Falha na consulta Mercado Pago (${mpCheckRes.status}):`, errBody?.message || errBody?.error || 'Erro desconhecido');
        return new Response(
          JSON.stringify({
            success: false,
            approved: false,
            status: 'gateway_error',
            message: 'Não foi possível consultar o pagamento no Mercado Pago.',
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const payment = await mpCheckRes.json();
      console.log(`[MercadoPago Pix Edge Function] Mercado Pago payment ${paymentId} status=${payment.status}`);

      let paymentToApprove: { record: any; mpData: any } | null = null;

      // Se o pagamento solicitado já for aprovado, ele é o selecionado
      if (payment.status === 'approved') {
        paymentToApprove = { record: existingPayment, mpData: payment };
      } else {
        // 4. Se o pagamento solicitado NÃO estiver aprovado, sincroniza seu status atual no banco
        try {
          await supabaseAdmin
            .from('pagamentos')
            .update({
              status: payment.status || 'pending',
              resposta_gateway: payment,
            })
            .eq('mercado_pago_payment_id', paymentId)
            .eq('user_id', user.id);
        } catch (syncErr: any) {
          console.warn('[MercadoPago Pix Edge Function] Aviso ao sincronizar status não aprovado:', syncErr?.message);
        }

        // 5. Busca pagamentos Pix recentes do usuário autenticado (até 10 registros)
        console.log(`[MercadoPago Pix Edge Function] Pagamento solicitado ${paymentId} está '${payment.status}'. Buscando pagamentos Pix recentes do usuário ${user.id} para verificar aprovação prévia...`);

        const { data: recentUserPayments } = await supabaseAdmin
          .from('pagamentos')
          .select('*')
          .eq('user_id', user.id)
          .eq('metodo_pagamento', 'pix')
          .order('created_at', { ascending: false })
          .limit(10);

        const candidatePayments = (recentUserPayments || []).filter((p) => {
          const pIdStr = String(p.mercado_pago_payment_id || '').trim();
          return pIdStr !== '' && pIdStr !== paymentId;
        });

        if (candidatePayments.length > 0) {
          console.log(`[MercadoPago Pix Edge Function] Consultando ${candidatePayments.length} outro(s) candidato(s) recente(s) no Mercado Pago para o usuário ${user.id}...`);

          for (const candidate of candidatePayments) {
            const cId = String(candidate.mercado_pago_payment_id).trim();
            try {
              const cRes = await fetch(`https://api.mercadopago.com/v1/payments/${cId}`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${mpAccessToken}`,
                },
              });

              if (!cRes.ok) {
                console.log(`[MercadoPago Pix Edge Function] Candidato ${cId} retornou HTTP ${cRes.status} no Mercado Pago`);
                continue;
              }

              const cData = await cRes.json();
              const cStatus = String(cData?.status || '').toLowerCase();

              // Validação de titularidade adicional
              const belongsToUser =
                cData.external_reference === user.id ||
                (cData.payer?.email && cData.payer.email.toLowerCase() === user.email.toLowerCase()) ||
                candidate.user_id === user.id;

              if (!belongsToUser) {
                console.warn(`[MercadoPago Pix Edge Function] Candidato ${cId} não pertence ao usuário ${user.id}`);
                continue;
              }

              // Sincroniza status se mudou
              if (candidate.status !== cStatus && cStatus) {
                await supabaseAdmin
                  .from('pagamentos')
                  .update({
                    status: cStatus,
                    resposta_gateway: cData,
                  })
                  .eq('id', candidate.id)
                  .eq('user_id', user.id);
              }

              // 7. Se QUALQUER pagamento candidato for retornado como 'approved', ele tem prioridade máxima
              if (cStatus === 'approved') {
                console.log(`[MercadoPago Pix Edge Function] Pagamento anterior APROVADO identificado (${cId}) para o usuário ${user.id}!`);
                paymentToApprove = { record: candidate, mpData: cData };
                break;
              }
            } catch (cErr) {
              console.warn(`[MercadoPago Pix Edge Function] Erro ao consultar pagamento candidato ${cId}:`, cErr);
            }
          }
        }
      }

      // 10. Se nenhum pagamento recente estiver aprovado, retorna o status real do pagamento solicitado
      if (!paymentToApprove) {
        return new Response(
          JSON.stringify({
            success: true,
            paymentId: paymentId,
            status: payment.status || 'pending',
            approved: false,
            accessActive: false,
            message: 'Pagamento ainda não confirmado pelo Mercado Pago.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 8, 9. Fluxo para Pagamento APROVADO (seja o atual ou um histórico encontrado)
      const targetRecord = paymentToApprove.record;
      const targetMpData = paymentToApprove.mpData;
      const targetPaymentId = String(targetRecord.mercado_pago_payment_id).trim();

      // Garante integridade do profile do usuário
      const userFullName = (user.user_metadata?.nome as string) || (user.user_metadata?.name as string) || '';
      try {
        await supabaseAdmin.from('profiles').upsert({
          id: user.id,
          nome: userFullName.trim() || 'Revendedor Bora',
        }, { onConflict: 'id' });
      } catch {
        // Ignora se já existir
      }

      // Busca o registro mais recente em public.assinaturas para este usuário
      const { data: userSub, error: userSubErr } = await supabaseAdmin
        .from('assinaturas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (userSubErr) {
        console.error('[MercadoPago Pix Edge Function] Erro ao buscar assinatura do usuário:', userSubErr);
      }

      // Verificação de IDEMPOTÊNCIA:
      // O mesmo pagamento aprovado NÃO deve estender mais 30 dias em chamadas repetidas de polling.
      const alreadyProcessed =
        targetRecord.resposta_gateway?.bora_processed === true ||
        targetRecord.resposta_gateway?.bora_payment_applied === true ||
        (userSub && (userSub.status === 'ativa' || userSub.status === 'active') && userSub.mercado_pago_subscription_id === targetPaymentId);

      const now = new Date();
      let finalAssinaturaId = userSub?.id || targetRecord.assinatura_id || null;

      if (!alreadyProcessed) {
        // Lógica de Renovação de 30 dias
        let newStartDate: Date;
        let newEndDate: Date;

        if (userSub && userSub.data_fim && new Date(userSub.data_fim) > now) {
          // Período atual ainda ativo (ex: trial de 7 dias ou ciclo anterior): estende a partir de data_fim
          const currentEnd = new Date(userSub.data_fim);
          newStartDate = userSub.data_inicio ? new Date(userSub.data_inicio) : now;
          newEndDate = new Date(currentEnd.getTime() + 30 * 24 * 60 * 60 * 1000);
        } else {
          // Expirado ou sem período anterior: 30 dias a partir de agora
          newStartDate = now;
          newEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        }

        if (userSub) {
          const { error: updateSubErr } = await supabaseAdmin
            .from('assinaturas')
            .update({
              status: 'ativa',
              plano: 'Bora Premium',
              mercado_pago_subscription_id: targetPaymentId,
              valor: targetMpData.transaction_amount || targetRecord.valor || 9.90,
              data_inicio: newStartDate.toISOString(),
              data_fim: newEndDate.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq('id', userSub.id);

          if (updateSubErr) {
            console.error('[MercadoPago Pix Edge Function] Erro ao atualizar public.assinaturas:', updateSubErr);
            return new Response(
              JSON.stringify({
                success: false,
                approved: false,
                status: 'database_error',
                message: 'Erro ao ativar assinatura no banco de dados.',
              }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          finalAssinaturaId = userSub.id;
          console.log(`[MercadoPago Pix Edge Function] Assinatura ${userSub.id} renovada/ativada até ${newEndDate.toISOString()} para usuário ${user.id}`);
        } else {
          const { data: newSub, error: newSubErr } = await supabaseAdmin
            .from('assinaturas')
            .insert({
              user_id: user.id,
              plano: 'Bora Premium',
              status: 'ativa',
              mercado_pago_subscription_id: targetPaymentId,
              valor: targetMpData.transaction_amount || targetRecord.valor || 9.90,
              data_inicio: newStartDate.toISOString(),
              data_fim: newEndDate.toISOString(),
            })
            .select('id')
            .single();

          if (newSubErr) {
            console.error('[MercadoPago Pix Edge Function] Erro ao criar public.assinaturas:', newSubErr);
            return new Response(
              JSON.stringify({
                success: false,
                approved: false,
                status: 'database_error',
                message: 'Erro ao registrar assinatura no banco de dados.',
              }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          finalAssinaturaId = newSub?.id || null;
          console.log(`[MercadoPago Pix Edge Function] Nova assinatura criada para usuário ${user.id}, válida até ${newEndDate.toISOString()}`);
        }
      } else {
        console.log(`[MercadoPago Pix Edge Function] Pagamento ${targetPaymentId} já processado anteriormente para usuário ${user.id}. Idempotência garantida.`);
      }

      // Atualiza o registro exato em public.pagamentos
      const updatedGatewayPayload = {
        ...targetMpData,
        bora_processed: true,
        bora_payment_applied: true,
        bora_processed_at: targetRecord.resposta_gateway?.bora_processed_at || now.toISOString(),
      };

      const paymentUpdateData: Record<string, any> = {
        status: 'approved',
        resposta_gateway: updatedGatewayPayload,
      };

      if (finalAssinaturaId && !targetRecord.assinatura_id) {
        paymentUpdateData.assinatura_id = finalAssinaturaId;
      }

      const { error: updateApprovedErr } = await supabaseAdmin
        .from('pagamentos')
        .update(paymentUpdateData)
        .eq('id', targetRecord.id)
        .eq('user_id', user.id);

      if (updateApprovedErr) {
        console.error('[MercadoPago Pix Edge Function] Erro ao atualizar pagamento aprovado em public.pagamentos:', updateApprovedErr);
        return new Response(
          JSON.stringify({
            success: false,
            approved: false,
            status: 'database_error',
            message: 'Erro ao persistir status aprovado no banco de dados.',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 9, 12, 13. Resposta aprovada com o paymentId aprovado real
      return new Response(
        JSON.stringify({
          success: true,
          paymentId: targetPaymentId,
          status: 'approved',
          approved: true,
          accessActive: true,
          message: 'Pagamento aprovado pelo Mercado Pago.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // 2. SELEÇÃO DE CANDIDATOS E REAPROVEITAMENTO INTELIGENTE (PRIORIDADE: APPROVED)
    // =========================================================================
    const userFullName = (user.user_metadata?.nome as string) || (user.user_metadata?.name as string) || '';
    const transactionAmount = Number(reqBody?.amount) || 9.90;

    // 1. Busca múltiplos pagamentos Pix recentes do usuário autenticado (até 10 registros)
    const { data: recentPayments, error: recentPaymentsErr } = await supabaseAdmin
      .from('pagamentos')
      .select('*')
      .eq('user_id', user.id)
      .eq('metodo_pagamento', 'pix')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentPaymentsErr) {
      console.warn('[MercadoPago Pix Edge Function] Aviso ao buscar pagamentos recentes:', recentPaymentsErr.message);
    }

    const candidates = (recentPayments || []).filter(
      (p) => p && p.mercado_pago_payment_id && String(p.mercado_pago_payment_id).trim() !== ''
    );

    let approvedMatch: { paymentRecord: any; mpData: any } | null = null;
    let pendingMatch: { paymentRecord: any; mpData: any; qrCode: string; qrCodeBase64: string | null; ticketUrl: string | null } | null = null;

    if (candidates.length > 0) {
      console.log(`[MercadoPago Pix Edge Function] Avaliando ${candidates.length} candidato(s) Pix para usuário ${user.id}`);

      // 2. Consulta autoritativa no Mercado Pago para cada candidato em paralelo
      const checkResults = await Promise.allSettled(
        candidates.map(async (candidate) => {
          const candidatePaymentId = String(candidate.mercado_pago_payment_id).trim();
          console.log(`[MercadoPago Pix Edge Function] Checking candidate payment ${candidatePaymentId} at Mercado Pago for user ${user.id}`);
          const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${candidatePaymentId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${mpAccessToken}`,
            },
          });

          if (!mpRes.ok) {
            console.log(`[MercadoPago Pix Edge Function] Candidato ${candidatePaymentId} retornou status ${mpRes.status} no Mercado Pago`);
            return null;
          }

          const mpData = await mpRes.json();
          return { candidate, mpData };
        })
      );

      // Processa os resultados respeitando a ordem cronológica
      for (const res of checkResults) {
        if (res.status === 'fulfilled' && res.value) {
          const { candidate, mpData } = res.value;
          const candidatePaymentId = String(candidate.mercado_pago_payment_id).trim();
          const mpStatus = String(mpData?.status || '').toLowerCase();

          // Sincroniza status local se divergir do Mercado Pago
          if (candidate.status !== mpStatus && mpStatus) {
            await supabaseAdmin
              .from('pagamentos')
              .update({
                status: mpStatus,
                resposta_gateway: mpData,
              })
              .eq('id', candidate.id)
              .eq('user_id', user.id);
          }

          // REGRA DE PRIORIDADE MÁXIMA: Pagamento aprovado
          if (mpStatus === 'approved') {
            console.log(`[MercadoPago Pix Edge Function] Pagamento Pix APROVADO identificado (${candidatePaymentId}) para usuário ${user.id}!`);
            approvedMatch = { paymentRecord: candidate, mpData };
            break; // O pagamento aprovado tem prioridade absoluta
          }

          // REGRA SECUNDÁRIA: Candidato pendente válido mais recente
          if (!pendingMatch && (mpStatus === 'pending' || mpStatus === 'in_process')) {
            const isExpired = mpData.date_of_expiration && new Date(mpData.date_of_expiration).getTime() <= Date.now();
            if (!isExpired) {
              const td = mpData?.point_of_interaction?.transaction_data || candidate.resposta_gateway?.point_of_interaction?.transaction_data;
              const qrCode = td?.qr_code;
              const qrCodeBase64 = td?.qr_code_base64;
              const ticketUrl = td?.ticket_url || null;

              if (qrCode || qrCodeBase64) {
                pendingMatch = {
                  paymentRecord: candidate,
                  mpData,
                  qrCode,
                  qrCodeBase64: qrCodeBase64 || null,
                  ticketUrl,
                };
              }
            } else {
              console.log(`[MercadoPago Pix Edge Function] Candidato pendente ${candidatePaymentId} expirou`);
            }
          }
        }
      }
    }

    // 3. SE ALGUM PAGAMENTO ESTIVER APROVADO, ELE VENCE (PRIORIDADE MÁXIMA)
    if (approvedMatch) {
      const { paymentRecord, mpData } = approvedMatch;
      const approvedPaymentId = String(paymentRecord.mercado_pago_payment_id).trim();
      const now = new Date();

      console.log(`[MercadoPago Pix Edge Function] Ativando/renovando acesso para pagamento aprovado ${approvedPaymentId} (usuário ${user.id})`);

      // Assegura profile
      try {
        await supabaseAdmin.from('profiles').upsert({
          id: user.id,
          nome: userFullName.trim() || 'Revendedor Bora',
        }, { onConflict: 'id' });
      } catch {
        // Ignora
      }

      // Busca assinatura mais recente
      const { data: userSub } = await supabaseAdmin
        .from('assinaturas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Idempotência
      const alreadyProcessed =
        paymentRecord.resposta_gateway?.bora_processed === true ||
        paymentRecord.resposta_gateway?.bora_payment_applied === true ||
        (userSub && (userSub.status === 'ativa' || userSub.status === 'active') && userSub.mercado_pago_subscription_id === approvedPaymentId);

      let finalAssinaturaId = userSub?.id || paymentRecord.assinatura_id || null;

      if (!alreadyProcessed) {
        let newStartDate: Date;
        let newEndDate: Date;

        if (userSub && userSub.data_fim && new Date(userSub.data_fim) > now) {
          // Período atual ainda ativo (ex: trial ou ciclo anterior): estende a partir de data_fim
          const currentEnd = new Date(userSub.data_fim);
          newStartDate = userSub.data_inicio ? new Date(userSub.data_inicio) : now;
          newEndDate = new Date(currentEnd.getTime() + 30 * 24 * 60 * 60 * 1000);
        } else {
          // Expirado ou sem período anterior: 30 dias a partir de agora
          newStartDate = now;
          newEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        }

        if (userSub) {
          await supabaseAdmin
            .from('assinaturas')
            .update({
              status: 'ativa',
              plano: 'Bora Premium',
              mercado_pago_subscription_id: approvedPaymentId,
              valor: mpData.transaction_amount || paymentRecord.valor || 9.90,
              data_inicio: newStartDate.toISOString(),
              data_fim: newEndDate.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq('id', userSub.id);
          finalAssinaturaId = userSub.id;
          console.log(`[MercadoPago Pix Edge Function] Assinatura ${userSub.id} ativada/renovada até ${newEndDate.toISOString()}`);
        } else {
          const { data: newSub } = await supabaseAdmin
            .from('assinaturas')
            .insert({
              user_id: user.id,
              plano: 'Bora Premium',
              status: 'ativa',
              mercado_pago_subscription_id: approvedPaymentId,
              valor: mpData.transaction_amount || paymentRecord.valor || 9.90,
              data_inicio: newStartDate.toISOString(),
              data_fim: newEndDate.toISOString(),
            })
            .select('id')
            .single();
          finalAssinaturaId = newSub?.id || null;
          console.log(`[MercadoPago Pix Edge Function] Nova assinatura criada para usuário ${user.id}`);
        }
      } else {
        console.log(`[MercadoPago Pix Edge Function] Pagamento ${approvedPaymentId} já processado anteriormente. Idempotência garantida.`);
      }

      // Atualiza public.pagamentos
      const updatedGateway = {
        ...mpData,
        bora_processed: true,
        bora_payment_applied: true,
        bora_processed_at: paymentRecord.resposta_gateway?.bora_processed_at || now.toISOString(),
      };

      const paymentUpdateData: Record<string, any> = {
        status: 'approved',
        resposta_gateway: updatedGateway,
      };
      if (finalAssinaturaId && !paymentRecord.assinatura_id) {
        paymentUpdateData.assinatura_id = finalAssinaturaId;
      }

      await supabaseAdmin
        .from('pagamentos')
        .update(paymentUpdateData)
        .eq('id', paymentRecord.id)
        .eq('user_id', user.id);

      const td = mpData?.point_of_interaction?.transaction_data || paymentRecord.resposta_gateway?.point_of_interaction?.transaction_data;
      const qrCode = td?.qr_code;
      const qrCodeBase64 = td?.qr_code_base64;

      return new Response(
        JSON.stringify({
          success: true,
          paymentId: approvedPaymentId,
          status: 'approved',
          approved: true,
          accessActive: true,
          amount: Number(mpData.transaction_amount || paymentRecord.valor || transactionAmount),
          qrCode: qrCode || null,
          qrCodeBase64: qrCodeBase64 || null,
          qrCodeImageUrl: qrCodeBase64
            ? (qrCodeBase64.startsWith('data:image') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`)
            : (qrCode ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(qrCode)}` : null),
          ticketUrl: td?.ticket_url || null,
          message: 'Pagamento Pix já aprovado com sucesso!',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. SE NÃO HOUVER APROVADO, MAS HOUVER UM PENDENTE REUTILIZÁVEL VÁLIDO
    if (pendingMatch) {
      const { paymentRecord, mpData, qrCode, qrCodeBase64, ticketUrl } = pendingMatch;
      const pendingPaymentId = String(paymentRecord.mercado_pago_payment_id).trim();

      console.log(`[MercadoPago Pix Edge Function] Reusing pending Pix payment ${pendingPaymentId} for user ${user.id}`);

      return new Response(
        JSON.stringify({
          success: true,
          paymentId: pendingPaymentId,
          status: mpData.status || 'pending',
          amount: Number(mpData.transaction_amount || paymentRecord.valor || transactionAmount),
          qrCode: qrCode,
          qrCodeBase64: qrCodeBase64 || null,
          qrCodeImageUrl: qrCodeBase64
            ? (qrCodeBase64.startsWith('data:image') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`)
            : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(qrCode)}`,
          ticketUrl: ticketUrl,
          reused: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. NENHUM APROVADO E NENHUM PENDENTE REUTILIZÁVEL ENCONTRADO
    console.log(`[MercadoPago Pix Edge Function] No approved or reusable pending Pix found for user ${user.id}; creating a new Pix payment`);

    // =========================================================================
    // 3. CRIAÇÃO DE NOVO PAGAMENTO PIX (QUANDO NÃO HÁ PIX PENDENTE REUTILIZÁVEL)
    // =========================================================================
    const nameParts = userFullName.trim().split(' ').filter(Boolean);
    const firstName = nameParts.length > 0 ? nameParts[0] : (user.email.split('@')[0] || 'Cliente');
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Bora';

    const idempotencyKey = `bora-pix-${user.id}-${Date.now()}`;

    console.log(`[MercadoPago Pix Edge Function] Gerando Pix para ${user.email} (${user.id}), valor: R$ ${transactionAmount}`);

    // Chamada à API segura do Mercado Pago através do Access Token do servidor
    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: transactionAmount,
        description: 'Bora Premium - Assinatura Mensal',
        payment_method_id: 'pix',
        payer: {
          email: user.email.trim().toLowerCase(),
          first_name: firstName,
          last_name: lastName,
        },
        external_reference: user.id,
        notification_url: 'https://ysynfxcuwzwcnqnskjku.supabase.co/functions/v1/mercadopago-webhook',
      }),
    });

    if (!mpRes.ok) {
      const errData = await mpRes.json().catch(() => null);
      console.error('[MercadoPago Pix Edge Function] Erro na API do Mercado Pago:', mpRes.status, errData);
      return new Response(
        JSON.stringify({
          success: false,
          error: errData?.message || 'Falha ao gerar cobrança Pix no Mercado Pago.',
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pData = await mpRes.json();
    const td = pData?.point_of_interaction?.transaction_data;
    const qrCode = td?.qr_code;
    const qrCodeBase64 = td?.qr_code_base64;

    if (!qrCode && !qrCodeBase64) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Mercado Pago não retornou dados de QR Code para este pagamento.',
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Localiza assinatura correspondente do usuário para vincular em public.pagamentos
    const { data: userSub } = await supabaseAdmin
      .from('assinaturas')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Garante que o profile existe para satisfazer a chave estrangeira pagamentos_user_id_fkey
    try {
      await supabaseAdmin.from('profiles').upsert({
        id: user.id,
        nome: userFullName.trim() || 'Revendedor Bora',
      }, { onConflict: 'id' });
    } catch {
      // Ignora erro
    }

    // Registra a tentativa de pagamento em public.pagamentos
    try {
      await supabaseAdmin.from('pagamentos').insert({
        user_id: user.id,
        assinatura_id: userSub?.id || null,
        mercado_pago_payment_id: String(pData.id),
        status: pData.status || 'pending',
        valor: transactionAmount,
        metodo_pagamento: 'pix',
        resposta_gateway: pData,
      });
    } catch (dbErr: any) {
      console.warn('[MercadoPago Pix Edge Function] Aviso ao registrar em public.pagamentos:', dbErr?.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: pData.id,
        status: pData.status,
        amount: transactionAmount,
        qrCode: qrCode,
        qrCodeBase64: qrCodeBase64 || null,
        qrCodeImageUrl: qrCodeBase64
          ? (qrCodeBase64.startsWith('data:image') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`)
          : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(qrCode)}`,
        ticketUrl: td?.ticket_url || null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[MercadoPago Pix Edge Function] Erro interno:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno ao processar requisição Pix.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
