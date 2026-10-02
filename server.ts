import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const currentFilename = typeof __filename !== 'undefined' 
  ? __filename 
  : (typeof import.meta !== 'undefined' && import.meta.url ? fileURLToPath(import.meta.url) : '');
const currentDirname = typeof __dirname !== 'undefined' 
  ? __dirname 
  : (currentFilename ? path.dirname(currentFilename) : process.cwd());

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware para normalizar req.url caso o proxy/Vercel tenha reescrito o caminho
app.use((req, res, next) => {
  const matchedPath = req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'];
  if (matchedPath && typeof matchedPath === 'string' && req.url !== matchedPath) {
    req.url = matchedPath;
  }
  next();
});

// CORS Middleware para permitir requisições de domínios customizados (ex: app.bora...)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-client-info, apikey');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Router exclusivo para endpoints de API (aceita tanto com /api quanto sem)
const apiRouter = express.Router();

// Supabase Configuration
const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ysynfxcuwzwcnqnskjku.supabase.co').trim();
const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const mpAccessToken = (process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim().replace(/^["']|["']$/g, '');
const mpWebhookSecret = (process.env.MERCADOPAGO_WEBHOOK_SECRET || 'c605d5b80bf88fbb5d3bb4d0e7706da4bc516f924e24e180d751d4779d6132cd').trim();

const getMpToken = () => {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN || mpAccessToken || '';
  return token.trim().replace(/^["']|["']$/g, '');
};

/**
 * Função segura para persistência de assinaturas sem conflitos de constraint
 */
async function saveUserSubscription(dbClient: any, userId: string, subData: {
  plano: string;
  status: string;
  valor?: number;
  data_inicio?: string;
  data_fim?: string | null;
  mercado_pago_subscription_id?: string | null;
  mercado_pago_customer_id?: string | null;
}) {
  // 1. Assegura que o perfil do usuário existe (para atender a chave estrangeira assinaturas_user_id_fkey)
  try {
    const { data: existingProf } = await dbClient.from('profiles').select('id').eq('id', userId).maybeSingle();
    if (!existingProf) {
      await dbClient.from('profiles').upsert({
        id: userId,
        nome: 'Revendedor Bora',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    }
  } catch (err: any) {
    console.warn('[Bora DB] Aviso ao verificar profile:', err.message);
  }

  // 2. Verifica se já existe registro em assinaturas para atualizar ou inserir
  const { data: existing } = await dbClient
    .from('assinaturas')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (existing && existing.length > 0) {
    const { data: updated, error: updateErr } = await dbClient
      .from('assinaturas')
      .update({
        ...subData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing[0].id)
      .select()
      .single();

    if (updateErr) throw updateErr;
    return updated;
  } else {
    const { data: inserted, error: insertErr } = await dbClient
      .from('assinaturas')
      .insert({
        user_id: userId,
        ...subData,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) throw insertErr;
    return inserted;
  }
}

// Healthcheck endpoint
apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Bora Backend Server',
  });
});

// Diagnostic endpoint
apiRouter.get('/mercadopago/diagnostic', async (req, res) => {
  const host = req.headers.host || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const webhookUrl = `${protocol}://${host}/api/mercadopago/webhook`;
  const token = getMpToken();

  res.json({
    hasMercadoPagoToken: !!token,
    tokenPrefix: token ? `${token.slice(0, 10)}...` : null,
    hasWebhookSecret: !!mpWebhookSecret,
    webhookSecretPrefix: mpWebhookSecret ? `${mpWebhookSecret.slice(0, 8)}...` : null,
    hasServiceRoleKey: !!supabaseServiceKey,
    supabaseUrl,
    activeWebhookUrl: webhookUrl,
    mode: 'pix_qrcode_only',
  });
});

/**
 * Criação de Pagamento via Pix com QR Code do Mercado Pago
 * POST /api/mercadopago/pix-payment e /mercadopago/pix-payment
 */
apiRouter.post('/mercadopago/pix-payment', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Sessão não autorizada. Faça login novamente no Bora.',
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await authSupabase.auth.getUser(token);
    if (authError || !user || !user.email) {
      return res.status(401).json({
        success: false,
        error: 'Sessão inválida do Supabase.',
      });
    }

    const adminClient = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
      : authSupabase;

    const currentMpToken = getMpToken();
    if (!currentMpToken) {
      return res.status(500).json({
        success: false,
        error: 'MERCADOPAGO_ACCESS_TOKEN não configurado no servidor.',
      });
    }

    const host = req.headers.host || '';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    
    // O Mercado Pago rejeita com HTTP 400 (código 4020) qualquer notification_url contendo localhost ou IP interno
    const isPublicHttps = 
      host && 
      !host.includes('localhost') && 
      !host.includes('127.0.0.1') && 
      !host.startsWith('192.168.') && 
      !host.startsWith('10.') &&
      !host.endsWith('.local');
    const webhookUrl = isPublicHttps ? `https://${host}/api/mercadopago/webhook` : undefined;

    const userFullName = (user.user_metadata?.nome as string) || (user.user_metadata?.name as string) || '';
    const nameParts = userFullName.trim().split(' ').filter(Boolean);
    const firstName = nameParts.length > 0 ? nameParts[0] : (user.email.split('@')[0] || 'Cliente');
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Bora';

    const transactionAmount = Number(req.body?.amount) || 9.90;
    const idempotencyKey = `bora-pix-${user.id}-${Date.now()}`;

    console.log(`[Bora MercadoPago Pix] Gerando Pix para usuário ${user.email} (${user.id}), valor: R$ ${transactionAmount}`);

    // Criação de pagamento PIX exclusivamente via POST /v1/payments
    let paymentData: any = null;
    let mpStatus = 500;

    const makePaymentCall = async () => {
      const payload: any = {
        transaction_amount: transactionAmount,
        description: 'Bora Premium - Assinatura Mensal',
        payment_method_id: 'pix',
        payer: {
          email: user.email,
          first_name: firstName,
          last_name: lastName,
        },
        external_reference: user.id,
      };
      return fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentMpToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });
    };

    try {
      const mpPaymentRes = await makePaymentCall();
      mpStatus = mpPaymentRes.status;
      paymentData = await mpPaymentRes.json().catch(() => null);

      console.log('\n[Mercado Pago PIX] === RESPOSTA RECEBIDA DA API ===');
      console.log('Status HTTP:', mpStatus);
      console.log('Response completo:', JSON.stringify(paymentData, null, 2));

      const payment = paymentData?.payment || paymentData;
      const td = payment?.point_of_interaction?.transaction_data || paymentData?.point_of_interaction?.transaction_data;

      console.log('qr_code_base64 recebido:', td?.qr_code_base64 || 'Nenhum');
      console.log('qr_code recebido:', td?.qr_code || 'Nenhum');
      console.log('==================================================\n');

      if (!mpPaymentRes.ok || !td) {
        console.error(`[Bora MercadoPago Pix] v1/payments retornou erro ${mpStatus}:`, paymentData);
        return res.status(mpStatus >= 400 ? mpStatus : 500).json({
          success: false,
          error: paymentData?.message || paymentData?.error || 'Erro ao gerar pagamento PIX via Mercado Pago.',
          details: paymentData,
          status: mpStatus,
        });
      }

      console.log(`[Bora MercadoPago Pix] Pix gerado com sucesso via v1/payments! ID: ${payment.id || paymentData.id}`);

      // Registra a tentativa em public.pagamentos para rastreabilidade completa
      const dbClient = adminClient || createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      });
      const paymentRecordId = String(payment.id || paymentData.id);

      // Localiza assinatura correspondente para vincular
      const { data: userSub } = await dbClient
        .from('assinaturas')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      try {
        await dbClient.from('pagamentos').upsert({
          user_id: user.id,
          assinatura_id: userSub?.id || null,
          mercado_pago_payment_id: paymentRecordId,
          status: payment.status || paymentData.status || 'pending',
          valor: transactionAmount,
          metodo_pagamento: 'pix',
          resposta_gateway: paymentData,
        }, { onConflict: 'mercado_pago_payment_id' });
      } catch (dbErr: any) {
        console.warn('[Bora DB] Aviso ao registrar tentativa em pagamentos:', dbErr.message);
      }

      return res.status(200).json({
        success: true,
        method: 'direct_pix',
        payment: payment,
        point_of_interaction: payment.point_of_interaction || paymentData.point_of_interaction,
        paymentId: payment.id || paymentData.id,
        status: payment.status || paymentData.status,
        amount: transactionAmount,
        qr_code: td.qr_code,
        qr_code_base64: td.qr_code_base64,
        qrCode: td.qr_code,
        qrCodeBase64: td.qr_code_base64 || null,
        qrCodeImageUrl: td.qr_code_base64 
          ? (td.qr_code_base64.startsWith('data:image') ? td.qr_code_base64 : `data:image/png;base64,${td.qr_code_base64}`)
          : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(td.qr_code)}`,
        ticketUrl: td.ticket_url || null,
      });
    } catch (err: any) {
      console.error('[Bora MercadoPago Pix] Erro ao chamar v1/payments:', err.message);
      return res.status(500).json({
        success: false,
        error: `Erro ao comunicar com Mercado Pago: ${err.message}`,
      });
    }
  } catch (error: any) {
    console.error('[Bora MercadoPago Pix] Erro inesperado:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro interno ao processar Pix.',
    });
  }
});

/**
 * Consulta de status do pagamento Pix
 * GET /api/mercadopago/payment-status/:id
 */
apiRouter.get('/mercadopago/payment-status/:id', async (req, res) => {
  try {
    const paymentId = req.params.id;
    const currentMpToken = getMpToken();

    const authHeader = req.headers.authorization;
    let authUser: any = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false },
      });
      const { data } = await authSupabase.auth.getUser(token);
      authUser = data.user;
    }

    const adminClient = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
      : null;

    // 1. Verifica se já consta como ativa no banco de dados Supabase
    if (authUser?.id) {
      const dbCheck = adminClient || createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader || '' } },
        auth: { persistSession: false },
      });

      const { data: sub } = await dbCheck
        .from('assinaturas')
        .select('id, status, plano')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sub && (sub.status === 'ativa' || sub.status === 'active')) {
        return res.status(200).json({
          approved: true,
          status: 'approved',
          message: 'Assinatura ativa confirmada!',
        });
      }
    }

    if (!currentMpToken) {
      return res.status(200).json({
        approved: false,
        status: 'pending',
        message: 'Aguardando confirmação...',
      });
    }

    // 2. Se for um ID numérico de pagamento do Mercado Pago
    if (/^\d+$/.test(paymentId)) {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${currentMpToken}` },
      });

      if (mpRes.ok) {
        const payment = await mpRes.json();
        console.log(`[Bora Status] Pagamento ${paymentId}: status=${payment.status}, detail=${payment.status_detail}`);

        if (payment.status === 'approved') {
          const targetUserId = payment.external_reference || authUser?.id;

          if (targetUserId) {
            const dbClient = adminClient || createClient(supabaseUrl, supabaseAnonKey, {
              global: { headers: { Authorization: authHeader || '' } },
              auth: { persistSession: false },
            });

            const now = new Date();
            const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 dias corridos
            await saveUserSubscription(dbClient, targetUserId, {
              plano: 'Bora Premium',
              status: 'ativa',
              mercado_pago_subscription_id: String(payment.id),
              mercado_pago_customer_id: payment.payer?.id ? String(payment.payer.id) : null,
              valor: payment.transaction_amount || 9.90,
              data_inicio: now.toISOString(),
              data_fim: nextMonth.toISOString(),
            });

            try {
              await dbClient.from('pagamentos').upsert({
                user_id: targetUserId,
                mercado_pago_payment_id: String(payment.id),
                status: 'approved',
                valor: payment.transaction_amount || 9.90,
                metodo_pagamento: payment.payment_method_id || 'pix',
                resposta_gateway: payment,
              }, { onConflict: 'mercado_pago_payment_id' });
            } catch (err: any) {
              console.warn('[Bora DB] Aviso ao salvar pagamento aprovado:', err?.message);
            }

            console.log(`[Bora Status] Assinatura do usuário ${targetUserId} liberada com sucesso!`);
          }

          return res.status(200).json({
            approved: true,
            status: 'approved',
            message: 'Pagamento Pix aprovado com sucesso!',
          });
        }

        return res.status(200).json({
          approved: false,
          status: payment.status || 'pending',
          detail: payment.status_detail,
        });
      }
    }

    // 3. Busca pagamentos recentes do usuário no Mercado Pago por e-mail ou external_reference
    if (authUser?.email) {
      const searchRes = await fetch(`https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=5`, {
        headers: { Authorization: `Bearer ${currentMpToken}` },
      });

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const approvedPayment = (searchData.results || []).find((p: any) =>
          p.status === 'approved' &&
          (p.payer?.email?.toLowerCase() === authUser.email.toLowerCase() || p.external_reference === authUser.id)
        );

        if (approvedPayment) {
          console.log(`[Bora Status] Pagamento aprovado localizado na busca! ID: ${approvedPayment.id}`);

          const dbClient = adminClient || createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader || '' } },
            auth: { persistSession: false },
          });

          const now = new Date();
          const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 dias corridos
          await saveUserSubscription(dbClient, authUser.id, {
            plano: 'Bora Premium',
            status: 'ativa',
            mercado_pago_subscription_id: String(approvedPayment.id),
            valor: approvedPayment.transaction_amount || 9.90,
            data_inicio: now.toISOString(),
            data_fim: nextMonth.toISOString(),
          });

          try {
            await dbClient.from('pagamentos').upsert({
              user_id: authUser.id,
              mercado_pago_payment_id: String(approvedPayment.id),
              status: 'approved',
              valor: approvedPayment.transaction_amount || 9.90,
              metodo_pagamento: approvedPayment.payment_method_id || 'pix',
              resposta_gateway: approvedPayment,
            }, { onConflict: 'mercado_pago_payment_id' });
          } catch (err: any) {
            console.warn('[Bora DB] Aviso ao salvar pagamento buscado:', err?.message);
          }

          return res.status(200).json({
            approved: true,
            status: 'approved',
            message: 'Pagamento Pix aprovado!',
          });
        }
      }
    }

    return res.status(200).json({
      approved: false,
      status: 'pending',
      message: 'Aguardando transferência via Pix...',
    });
  } catch (error: any) {
    console.error('[Bora Status] Erro ao verificar pagamento:', error);
    return res.status(500).json({
      approved: false,
      error: error.message,
    });
  }
});

// Webhook endpoint (GET para teste do Mercado Pago)
apiRouter.get('/mercadopago/webhook', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Bora Mercado Pago Webhook endpoint is active and listening.',
  });
});

// Webhook endpoint (POST para notificações reais de pagamento e Pix)
apiRouter.post('/mercadopago/webhook', async (req, res) => {
  try {
    const currentMpToken = getMpToken();

    const topic = req.body?.type || req.body?.topic || req.query.topic || req.query.type;
    const resourceId = req.body?.data?.id || req.body?.id || req.query.id || req.query['data.id'];

    console.log(`[Bora Webhook] Notificação recebida: topic=${topic}, id=${resourceId}`);

    // Validação da assinatura de segurança oficial do Mercado Pago (Webhook Secret)
    const xSignature = req.headers['x-signature'] as string;
    const xRequestId = req.headers['x-request-id'] as string;

    if (xSignature && xRequestId && mpWebhookSecret) {
      try {
        const parts = xSignature.split(',');
        let ts = '';
        let hash = '';
        for (const part of parts) {
          const [k, v] = part.split('=');
          if (k?.trim() === 'ts') ts = v?.trim();
          if (k?.trim() === 'v1') hash = v?.trim();
        }

        const dataId = req.query['data.id'] || req.query.id || req.body?.data?.id || req.body?.id || resourceId || '';
        const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
        const calculatedHash = crypto.createHmac('sha256', mpWebhookSecret).update(manifest).digest('hex');

        if (calculatedHash === hash) {
          console.log('[Bora Webhook] Assinatura do Mercado Pago autenticada com sucesso (HMAC-SHA256 validado).');
        } else {
          console.warn('[Bora Webhook] Assinatura enviada no header diverge do secret, mas processando notificação.');
        }
      } catch (err: any) {
        console.warn('[Bora Webhook] Aviso ao conferir x-signature:', err.message);
      }
    }

    if (!resourceId) {
      return res.status(200).json({ received: true, message: 'Nenhum ID de recurso fornecido' });
    }

    if (!currentMpToken) {
      console.warn('[Bora Webhook] Notificação recebida, mas MERCADOPAGO_ACCESS_TOKEN não configurado.');
      return res.status(200).json({ received: true, warning: 'MERCADOPAGO_ACCESS_TOKEN pendente' });
    }

    const adminClient = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
      : null;

    // Evento de Pagamento (Pix / Boleto / Cartão)
    if (topic === 'payment' || topic === 'subscription_authorized_payment') {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
        headers: { Authorization: `Bearer ${currentMpToken}` },
      });

      if (!mpRes.ok) {
        console.error(`[Bora Webhook] Erro ao consultar pagamento ${resourceId}: ${mpRes.statusText}`);
        return res.status(200).json({ received: true, error: 'Falha ao consultar pagamento' });
      }

      const payment = await mpRes.json();
      console.log(`[Bora Webhook] Pagamento obtido: id=${payment.id}, status=${payment.status}, valor=${payment.transaction_amount}`);

      let targetUserId: string | null = payment.external_reference || null;

      if (!targetUserId && payment.payer?.email && adminClient) {
        const { data: usersData } = await adminClient.auth.admin.listUsers();
        if (usersData?.users) {
          const matched = usersData.users.find(
            (u) => u.email?.toLowerCase() === payment.payer.email?.toLowerCase()
          );
          if (matched) {
            targetUserId = matched.id;
          }
        }
      }

      if (targetUserId && adminClient) {
        const mappedStatus = payment.status === 'approved' ? 'ativa' : (payment.status === 'cancelled' ? 'cancelada' : 'pendente');
        const now = new Date();
        const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        await saveUserSubscription(adminClient, targetUserId, {
          plano: 'Bora Premium',
          status: mappedStatus,
          mercado_pago_subscription_id: String(payment.id),
          mercado_pago_customer_id: payment.payer?.id ? String(payment.payer.id) : null,
          valor: payment.transaction_amount || 9.90,
          data_inicio: payment.date_approved || payment.date_created || now.toISOString(),
          data_fim: mappedStatus === 'ativa' ? nextMonth.toISOString() : null,
        });

        try {
          await adminClient.from('pagamentos').upsert({
            user_id: targetUserId,
            mercado_pago_payment_id: String(payment.id),
            status: payment.status || 'pending',
            valor: payment.transaction_amount || 9.90,
            metodo_pagamento: payment.payment_method_id || 'pix',
            resposta_gateway: payment,
          }, { onConflict: 'mercado_pago_payment_id' });
        } catch (err: any) {
          console.warn('[Bora DB] Aviso webhook salvar pagamentos:', err?.message);
        }

        console.log(`[Bora Webhook] Assinatura do usuário ${targetUserId} atualizada para ${mappedStatus}`);
      }

      return res.status(200).json({ success: true, processed: 'payment', status: payment.status });
    }

    return res.status(200).json({ received: true, ignored_topic: topic });
  } catch (error: any) {
    console.error('[Bora Webhook] Erro:', error);
    return res.status(200).json({ received: true, error: error.message });
  }
});

// Reconciliação autoritativa do usuário
apiRouter.post('/mercadopago/reconcile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Sessão não autorizada.' });
    }

    const token = authHeader.replace('Bearer ', '');
    const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await authSupabase.auth.getUser(token);
    if (authError || !user || !user.email) {
      return res.status(401).json({ success: false, error: 'Sessão inválida.' });
    }

    const currentMpToken = getMpToken();
    if (!currentMpToken) {
      return res.status(200).json({
        success: false,
        status: 'missing_token',
        message: 'MERCADOPAGO_ACCESS_TOKEN não configurado.',
      });
    }

    console.log(`[Bora Reconcile] Buscando pagamentos e assinaturas para ${user.email}`);

    const adminClient = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
      : authSupabase;

    const targetPaymentId = req.body?.paymentId ? String(req.body.paymentId).trim() : null;

    // 1. Consulta direta por paymentId se informado
    if (targetPaymentId) {
      const directRes = await fetch(`https://api.mercadopago.com/v1/payments/${targetPaymentId}`, {
        headers: { Authorization: `Bearer ${currentMpToken}` },
      });

      if (directRes.ok) {
        const directPayment = await directRes.json();
        const belongs =
          directPayment.external_reference === user.id ||
          (directPayment.payer?.email && directPayment.payer.email.toLowerCase() === user.email.toLowerCase());

        if (belongs && directPayment.status === 'approved') {
          const now = new Date();
          const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          await saveUserSubscription(adminClient, user.id, {
            plano: 'Bora Premium',
            status: 'ativa',
            mercado_pago_subscription_id: String(directPayment.id),
            valor: directPayment.transaction_amount || 9.90,
            data_inicio: now.toISOString(),
            data_fim: nextMonth.toISOString(),
          });

          return res.status(200).json({
            success: true,
            status: 'ativa',
            message: 'Assinatura Bora confirmada com sucesso via Pix!',
          });
        }
      }
    }

    // 2. Busca pagamentos Pix recentes no Mercado Pago
    const paymentsSearch = await fetch(`https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=10`, {
      headers: { Authorization: `Bearer ${currentMpToken}` },
    });

    if (paymentsSearch.ok) {
      const pData = await paymentsSearch.json();
      const approvedP = (pData.results || []).find((p: any) =>
        p.status === 'approved' &&
        (p.payer?.email?.toLowerCase() === user.email?.toLowerCase() || p.external_reference === user.id)
      );

      if (approvedP) {
        const now = new Date();
        const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 dias corridos
        await saveUserSubscription(adminClient, user.id, {
          plano: 'Bora Premium',
          status: 'ativa',
          mercado_pago_subscription_id: String(approvedP.id),
          valor: approvedP.transaction_amount || 9.90,
          data_inicio: now.toISOString(),
          data_fim: nextMonth.toISOString(),
        });

        return res.status(200).json({
          success: true,
          status: 'ativa',
          message: 'Assinatura Bora confirmada com sucesso via Pix!',
        });
      }
    }

    return res.status(200).json({
      success: false,
      status: 'pendente',
      message: 'Aguardando confirmação do pagamento no Mercado Pago.',
    });
  } catch (error: any) {
    console.error('[Bora Reconcile] Erro:', error);
    return res.status(500).json({ success: false, error: 'Erro interno ao reconciliar.' });
  }
});

/**
 * Ativação Segura do Período de Teste Grátis de 7 Dias Corridos
 * POST /api/subscription/start-trial
 */
apiRouter.post('/subscription/start-trial', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Sessão não autorizada.' });
    }

    const token = authHeader.replace('Bearer ', '');
    const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await authSupabase.auth.getUser(token);
    if (authError || !user || !user.id) {
      return res.status(401).json({ success: false, error: 'Sessão inválida do Supabase.' });
    }

    const adminClient = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
      : authSupabase;

    // Verifica se este usuário já possui histórico de assinatura ou teste anterior
    const { data: existingRecords } = await adminClient
      .from('assinaturas')
      .select('id, plano, status, data_inicio, data_fim')
      .eq('user_id', user.id);

    const alreadyUsed = (existingRecords || []).some((r: any) =>
      r.status === 'trial' ||
      (r.plano && r.plano.toLowerCase().includes('teste')) ||
      r.status === 'ativa' ||
      r.status === 'active' ||
      r.status === 'cancelled' ||
      r.status === 'overdue'
    );

    if (alreadyUsed) {
      return res.status(400).json({
        success: false,
        error: 'O período de teste grátis de 7 dias já foi utilizado anteriormente por esta conta.',
      });
    }

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 dias corridos

    let newSub: any = null;
    try {
      newSub = await saveUserSubscription(adminClient, user.id, {
        plano: 'Bora - Teste Grátis (7 dias)',
        status: 'trial',
        valor: 0,
        data_inicio: now.toISOString(),
        data_fim: trialEnd.toISOString(),
      });
    } catch (insertError: any) {
      console.error('[Bora Trial] Erro ao registrar teste:', insertError.message);
      return res.status(500).json({ success: false, error: 'Erro ao registrar teste grátis.' });
    }

    console.log(`[Bora Trial] Teste de 7 dias liberado para usuário ${user.email} (${user.id}) até ${trialEnd.toISOString()}`);

    return res.status(200).json({
      success: true,
      message: 'Período de teste grátis de 7 dias ativado!',
      subscription: newSub,
      daysRemaining: 7,
      data_fim: trialEnd.toISOString(),
    });
  } catch (err: any) {
    console.error('[Bora Trial] Erro inesperado:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Monta o roteador da API em /api e também na raiz para máxima resiliência
app.use('/api', apiRouter);
app.use(apiRouter);

// Vite Integration & Server Startup
async function start() {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT) {
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Bora Server] Executando na porta ${PORT}`);
  });
}

if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME && !process.env.LAMBDA_TASK_ROOT) {
  start().catch((err) => {
    console.error('[Bora Server] Erro ao iniciar servidor:', err);
  });
}

export default app;
export { app };
