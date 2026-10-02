import React, { useState, useEffect, useRef } from 'react';
import { 
  Check, 
  ShieldCheck, 
  RefreshCw, 
  LogOut,
  AlertCircle,
  Copy,
  ExternalLink,
  QrCode,
  CheckCircle2,
  X,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../GlassCard';
import { useSubscription } from './SubscriptionContext';
import { PixPaymentResponse, mercadoPagoService } from '../../services/mercadoPagoService';

interface SubscriptionModalProps {
  onLogout?: () => Promise<void>;
  onClose?: () => void;
  statusMessage?: string;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ onLogout, onClose, statusMessage }) => {
  const { 
    subscription,
    status: subscriptionStatus,
    isAuthorized,
    refreshSubscription, 
    verifyAndPollSubscription, 
    isVerifying, 
    isLoading,
    hasUsedTrial,
    isTrial,
    daysRemaining,
    startTrial,
  } = useSubscription();

  const [pixData, setPixData] = useState<PixPaymentResponse | null>(null);
  const [isGeneratingPix, setIsGeneratingPix] = useState(true);
  const [pixError, setPixError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isActivatingTrial, setIsActivatingTrial] = useState(false);
  const [trialError, setTrialError] = useState<string | null>(null);
  const [internalStatusMessage, setInternalStatusMessage] = useState<string | null>(null);

  const displayStatusMessage = internalStatusMessage || statusMessage;

  const pollIntervalRef = useRef<any>(null);
  const isGeneratingRef = useRef<boolean>(false);

  // Ativação do período de teste gratuito de 7 dias
  const handleStartTrial = async () => {
    setIsActivatingTrial(true);
    setTrialError(null);
    try {
      const res = await startTrial();
      if (res.success) {
        await refreshSubscription();
        if (onClose) onClose();
      } else {
        setTrialError(res.message || 'Não foi possível ativar o teste grátis.');
      }
    } catch {
      setTrialError('Erro ao ativar período de teste. Tente novamente.');
    } finally {
      setIsActivatingTrial(false);
    }
  };

  // Gera ou recupera o Pix QR Code existente imediatamente ao carregar o modal
  const loadPixPayment = async () => {
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;
    setIsGeneratingPix(true);
    setPixError(null);
    try {
      const result: any = await mercadoPagoService.createPixPayment(9.90);

      // Tratamento da resposta para consumir:
      // payment.point_of_interaction.transaction_data.qr_code_base64
      // payment.point_of_interaction.transaction_data.qr_code
      const payment = result?.payment || result;
      const transactionData = 
        payment?.point_of_interaction?.transaction_data || 
        result?.point_of_interaction?.transaction_data || 
        result?.transaction_data;

      const qrCodeBase64 = 
        transactionData?.qr_code_base64 || 
        result?.qrCodeBase64 || 
        payment?.qr_code_base64;

      const qrCode = 
        transactionData?.qr_code || 
        result?.qrCode || 
        payment?.qr_code;

      // Log completo da resposta recebida para diagnóstico
      console.log('=== [DIAGNÓSTICO PIX - MERCADO PAGO] ===');
      console.log('Response completo:', result);
      console.log('qr_code_base64 recebido:', qrCodeBase64);
      console.log('qr_code recebido:', qrCode);
      console.log('=======================================');

      if (qrCodeBase64 || qrCode || result?.qrCodeImageUrl || result?.ticketUrl) {
        setPixData({
          ...result,
          payment: {
            ...payment,
            point_of_interaction: {
              ...(payment?.point_of_interaction || {}),
              transaction_data: {
                ...(transactionData || {}),
                qr_code_base64: qrCodeBase64,
                qr_code: qrCode,
              },
            },
          },
          qrCode,
          qrCodeBase64,
          paymentId: payment?.id || result?.paymentId || result?.id,
          ticketUrl: transactionData?.ticket_url || result?.ticketUrl || null,
        });
      } else {
        setPixError(result?.error || 'Não foi possível gerar o QR Code no Mercado Pago no momento.');
      }
    } catch {
      setPixError('Erro ao conectar ao Mercado Pago. Tente novamente.');
    } finally {
      setIsGeneratingPix(false);
      isGeneratingRef.current = false;
    }
  };

  useEffect(() => {
    loadPixPayment();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Polling automático a cada 3.5 segundos para detectar o pagamento do Pix
  useEffect(() => {
    if (!pixData || isApproved) return;

    const paymentId = pixData.paymentId || pixData.preferenceId;
    if (!paymentId) return;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const check = await mercadoPagoService.checkPaymentStatus(paymentId);
        if (check.approved) {
          setIsApproved(true);
          clearInterval(pollIntervalRef.current);
          await refreshSubscription();
          setTimeout(() => {
            if (onClose) onClose();
          }, 1800);
        }
      } catch {
        // Ignora erros transitórios no polling
      }
    }, 3500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [pixData, isApproved, refreshSubscription, onClose]);

  // Função para copiar o código Pix copia e cola
  const handleCopyPix = async () => {
    const codeToCopy = 
      pixData?.payment?.point_of_interaction?.transaction_data?.qr_code ||
      pixData?.point_of_interaction?.transaction_data?.qr_code ||
      pixData?.qrCode || 
      pixData?.ticketUrl || 
      '';
    if (!codeToCopy) return;

    try {
      await navigator.clipboard.writeText(codeToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback simples
      const textArea = document.createElement('textarea');
      textArea.value = codeToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // Verificação manual imediata
  const handleManualCheck = async () => {
    setIsCheckingPayment(true);
    setInternalStatusMessage(null);
    try {
      if (pixData?.paymentId || pixData?.preferenceId) {
        const check = await mercadoPagoService.checkPaymentStatus(pixData.paymentId || pixData.preferenceId!);
        if (check.approved) {
          setIsApproved(true);
          await refreshSubscription();
          setTimeout(() => {
            if (onClose) onClose();
          }, 1800);
          return;
        } else {
          setInternalStatusMessage(
            check.message || 
            'Pagamento ainda não confirmado pelo Mercado Pago. Se você já concluiu o Pix no app do seu banco, aguarde alguns instantes enquanto o banco finaliza a compensação e clique em verificar novamente.'
          );
        }
      }

      const currentPaymentId = pixData?.paymentId || pixData?.preferenceId;
      const verified = await verifyAndPollSubscription(currentPaymentId);
      if (verified) {
        setIsApproved(true);
        setTimeout(() => {
          if (onClose) onClose();
        }, 1800);
      } else {
        setInternalStatusMessage(
          'Pagamento ainda não confirmado pelo Mercado Pago. O Bora monitora a confirmação em tempo real e liberará seu acesso Premium automaticamente assim que o pagamento for aprovado.'
        );
      }
    } finally {
      setIsCheckingPayment(false);
    }
  };

  // TELA DE SUCESSO: Pagamento Aprovado
  if (isApproved) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <GlassCard className="p-8 bg-white/95 rounded-[32px] border border-emerald-200 shadow-2xl text-center space-y-5">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 size={44} className="animate-bounce" />
            </div>
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Sparkles size={13} />
                Bora Premium Ativo
              </span>
              <h2 className="text-2xl font-black text-[#1D1D1F]">Seu Bora está liberado!</h2>
              <p className="text-xs text-[#86868B] leading-relaxed">
                Confirmamos seu pagamento via Pix no Mercado Pago. Entrando na plataforma com 30 dias de acesso liberado...
              </p>
            </div>
            <div className="pt-2">
              <div className="w-full bg-emerald-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full w-full animate-pulse" />
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  // TELA PRINCIPAL: QR Code Pix do Mercado Pago
  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      >
        <GlassCard className="p-6 sm:p-8 bg-white/95 rounded-[32px] border border-[#F2D7D9] shadow-2xl space-y-6 relative overflow-hidden">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors z-10 cursor-pointer"
              title="Fechar"
            >
              <X size={18} />
            </button>
          )}

          {/* Cabeçalho */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-[#F8E7E9] text-[#7A1C1D] border border-[#F2D7D9]">
              <QrCode size={13} />
              <span>
                {isAuthorized
                  ? 'Renovação Bora Premium • R$ 9,90'
                  : subscription?.status === 'pendente' || subscriptionStatus === 'pending'
                  ? 'Aguardando ativação • R$ 9,90'
                  : 'Mercado Pago Pix • QR Code'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1D1D1F]">
              {isAuthorized ? 'Renovação do Plano' : 'Bora Premium'}
            </h1>
            <p className="text-xs text-[#86868B] max-w-sm mx-auto leading-relaxed">
              {isAuthorized
                ? `Você já possui o Bora Premium ativo${daysRemaining > 0 ? ` (restam ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'})` : ''}. Ao renovar antecipadamente, mais 30 dias são adicionados ao término do seu ciclo atual.`
                : subscription?.status === 'pendente' || subscriptionStatus === 'pending'
                ? 'Sua conta está aguardando ativação. Realize o pagamento de R$ 9,90 via Pix para liberar 30 dias de acesso completo ao Bora Premium.'
                : hasUsedTrial 
                ? 'Para continuar utilizando o Bora com todas as funcionalidades, realize o pagamento da assinatura mensal via Pix.'
                : 'Escaneie o QR Code abaixo com o app do seu banco ou pague via Pix Copia e Cola para ativar seu acesso.'}
            </p>
          </div>

          {/* Mensagem de status condicional */}
          {displayStatusMessage && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-amber-600" />
              <span>{displayStatusMessage}</span>
            </div>
          )}

          {/* Área do QR Code */}
          <div className="bg-[#FAF8F8] border border-gray-100 rounded-3xl p-5 text-center space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200/60 pb-3">
              <span className="text-xs font-bold text-[#86868B] uppercase tracking-wider">
                Valor da Assinatura
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-[#7A1C1D]">R$ 9,90</span>
                <span className="text-xs text-[#86868B] font-semibold">/ mês</span>
              </div>
            </div>

            {/* Renderização do QR Code */}
            {isGeneratingPix ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <RefreshCw size={32} className="animate-spin text-[#7A1C1D]" />
                <p className="text-xs font-semibold text-[#86868B]">
                  Puxando QR Code do Mercado Pago...
                </p>
              </div>
            ) : pixError ? (
              <div className="py-8 px-4 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                  <AlertCircle size={24} />
                </div>
                <p className="text-xs text-rose-700 font-medium">{pixError}</p>
                <button
                  type="button"
                  onClick={loadPixPayment}
                  className="px-4 py-2 bg-[#7A1C1D] text-white text-xs font-bold rounded-xl hover:bg-[#6E2E49] transition-all cursor-pointer"
                >
                  Tentar novamente
                </button>
              </div>
            ) : pixData ? (
              <div className="space-y-4">
                {/* Imagem do QR Code Pix via payment.point_of_interaction.transaction_data.qr_code_base64 */}
                <div className="inline-block p-3 bg-white rounded-2xl border border-gray-200/80 shadow-sm mx-auto">
                  {(() => {
                    const rawBase64 = 
                      pixData.payment?.point_of_interaction?.transaction_data?.qr_code_base64 ||
                      pixData.point_of_interaction?.transaction_data?.qr_code_base64 ||
                      pixData.qrCodeBase64;

                    const imageSrc = rawBase64
                      ? (rawBase64.startsWith('data:image') ? rawBase64 : `data:image/png;base64,${rawBase64}`)
                      : (pixData.qrCodeImageUrl || '');

                    return imageSrc ? (
                      <img
                        src={imageSrc}
                        alt="QR Code Pix Mercado Pago"
                        className="w-48 h-48 sm:w-52 sm:h-52 object-contain mx-auto select-none rounded-lg"
                      />
                    ) : (
                      <div className="w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center text-gray-400 text-xs">
                        QR Code indisponível
                      </div>
                    );
                  })()}
                </div>

                {/* Copia e Cola via payment.point_of_interaction.transaction_data.qr_code */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-[#86868B] block">
                    Pix Copia e Cola:
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={
                        pixData.payment?.point_of_interaction?.transaction_data?.qr_code ||
                        pixData.point_of_interaction?.transaction_data?.qr_code ||
                        pixData.qrCode ||
                        pixData.ticketUrl ||
                        ''
                      }
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-[#1D1D1F] select-all outline-none font-mono text-ellipsis overflow-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-sm active:scale-95 ${
                        copied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#7A1C1D] hover:bg-[#6E2E49] text-white shadow-[#7A1C1D]/20'
                      }`}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copied ? 'Copiado!' : 'Copiar Pix'}</span>
                    </button>
                  </div>
                </div>

                {/* Indicador de monitoramento em tempo real */}
                <div className="pt-1 flex items-center justify-center gap-2 text-xs text-[#7A1C1D] font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7A1C1D] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7A1C1D]"></span>
                  </span>
                  <span>Aguardando confirmação do pagamento pelo Mercado Pago...</span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Instruções passo a passo */}
          <div className="space-y-2 text-xs text-[#86868B] px-1">
            <p className="font-bold text-[#1D1D1F] flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-[#7A1C1D]" />
              Como pagar:
            </p>
            <ol className="list-decimal list-inside space-y-1 leading-relaxed pl-1 text-[11px]">
              <li>Abra o aplicativo do seu banco ou instituição financeira.</li>
              <li>Escolha a opção <strong>Pix &gt; Pagar com QR Code</strong> ou <strong>Pix Copia e Cola</strong>.</li>
              <li>Conclua a transferência. O Bora reconhece e libera sua conta automaticamente.</li>
            </ol>
          </div>

          {/* Ações de Verificação */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={handleManualCheck}
              disabled={isCheckingPayment || isVerifying || isGeneratingPix}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#7A1C1D] hover:bg-[#6E2E49] active:scale-[0.98] text-white font-bold text-xs shadow-lg shadow-[#7A1C1D]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              <RefreshCw size={15} className={(isCheckingPayment || isVerifying) ? 'animate-spin' : ''} />
              <span>
                {isCheckingPayment || isVerifying 
                  ? 'Consultando Mercado Pago...' 
                  : 'Já realizei o Pix! Verificar agora'}
              </span>
            </button>

            {pixData?.ticketUrl && (
              <a
                href={pixData.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#1D1D1F] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center"
              >
                <ExternalLink size={13} />
                <span>Pagar no app do Mercado Pago</span>
              </a>
            )}

            {/* Opção de Teste Grátis de 7 Dias Corridos para Novos Usuários */}
            {!hasUsedTrial && (
              <div className="pt-3 border-t border-gray-100 space-y-2">
                {trialError && (
                  <p className="text-xs text-rose-600 font-semibold text-center">{trialError}</p>
                )}
                <button
                  type="button"
                  onClick={handleStartTrial}
                  disabled={isActivatingTrial}
                  className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  <Sparkles size={16} />
                  <span>
                    {isActivatingTrial ? 'Ativando seu teste...' : 'Usufruir dos 7 dias grátis'}
                  </span>
                </button>
                <p className="text-[11px] text-center text-[#86868B] leading-tight">
                  Comece agora com 7 dias corridos sem custo imediato. Acesso a todas as funções.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-[#86868B]">
              <button
                type="button"
                onClick={loadPixPayment}
                disabled={isGeneratingPix}
                className="hover:text-[#7A1C1D] transition-colors py-1 cursor-pointer flex items-center gap-1"
              >
                <RefreshCw size={12} className={isGeneratingPix ? 'animate-spin' : ''} />
                <span>Gerar novo código</span>
              </button>

              {onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="hover:text-[#1D1D1F] font-semibold transition-colors py-1 cursor-pointer"
                >
                  Fechar
                </button>
              ) : onLogout ? (
                <button
                  type="button"
                  onClick={onLogout}
                  className="hover:text-rose-600 transition-colors py-1 cursor-pointer flex items-center gap-1"
                >
                  <LogOut size={13} />
                  <span>Sair da conta</span>
                </button>
              ) : null}
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};
