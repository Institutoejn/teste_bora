import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Bell, 
  Sparkles, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  ChevronRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSubscription } from '../subscription/SubscriptionContext';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timeAgo: string;
  severity: 'urgent' | 'warning' | 'info' | 'success';
  actionText?: string;
  onAction?: () => void;
  isRead?: boolean;
}

interface NotificationBellProps {
  onOpenSubscriptionModal: () => void;
  onNavigateSettings?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  onOpenSubscriptionModal,
  onNavigateSettings,
}) => {
  const { 
    isTrial, 
    daysRemaining, 
    isAuthorized, 
    subscription,
    status: subscriptionStatus
  } = useSubscription();

  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('bora_read_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const popoverRef = useRef<HTMLDivElement>(null);

  // Fecha o popover ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Lista dinâmica de notificações com base no ciclo de assinatura / teste
  const notifications = useMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = [];

    // 1. Notificações do Período de Teste Grátis de 7 Dias
    if (isTrial && isAuthorized) {
      if (daysRemaining <= 1) {
        list.push({
          id: 'trial-warning-1-day',
          title: 'Último dia de Teste Grátis!',
          message: 'Falta apenas 1 dia para terminar seu período de teste gratuito de 7 dias. Assine o Bora Premium para continuar sem interrupções.',
          timeAgo: 'Hoje',
          severity: 'urgent',
          actionText: 'Assinar Bora Premium (R$ 9,90)',
          onAction: () => {
            setIsOpen(false);
            onOpenSubscriptionModal();
          },
        });
      } else if (daysRemaining === 2) {
        list.push({
          id: 'trial-warning-2-days',
          title: 'Faltam 2 dias de Teste Grátis',
          message: 'Faltam 2 dias para terminar seu período de teste gratuito de 7 dias. Garanta sua assinatura para continuar usando todas as funções.',
          timeAgo: 'Hoje',
          severity: 'warning',
          actionText: 'Assinar Bora Premium (R$ 9,90)',
          onAction: () => {
            setIsOpen(false);
            onOpenSubscriptionModal();
          },
        });
      } else {
        list.push({
          id: `trial-info-${daysRemaining}-days`,
          title: 'Período de Teste Grátis Ativo',
          message: `Você está usufruindo dos 7 dias gratuitos. Restam ${daysRemaining} dias de acesso liberado a todas as ferramentas.`,
          timeAgo: 'Ativo',
          severity: 'info',
          actionText: 'Ver Detalhes do Plano',
          onAction: () => {
            setIsOpen(false);
            if (onNavigateSettings) onNavigateSettings();
            else onOpenSubscriptionModal();
          },
        });
      }
    }

    // 2. Notificações da Assinatura Mensal Paga
    if (!isTrial && isAuthorized) {
      if (daysRemaining <= 1) {
        list.push({
          id: 'sub-renewal-1-day',
          title: 'Sua assinatura vence amanhã!',
          message: 'Falta 1 dia para você ter que realizar o novo pagamento da assinatura mensal. Faça o Pix de R$ 9,90 para evitar pausa.',
          timeAgo: 'Importante',
          severity: 'urgent',
          actionText: 'Renovar com Pix (R$ 9,90)',
          onAction: () => {
            setIsOpen(false);
            onOpenSubscriptionModal();
          },
        });
      } else if (daysRemaining <= 5) {
        list.push({
          id: `sub-renewal-${daysRemaining}-days`,
          title: `Aviso: Faltam ${daysRemaining} dias para renovação`,
          message: `Faltam ${daysRemaining} dias para você ter que realizar o novo pagamento da sua assinatura Bora Premium.`,
          timeAgo: 'Em breve',
          severity: 'warning',
          actionText: 'Renovar Antecipadamente',
          onAction: () => {
            setIsOpen(false);
            onOpenSubscriptionModal();
          },
        });
      } else {
        list.push({
          id: 'sub-active-status',
          title: 'Assinatura Bora Premium Ativa',
          message: `Sua conta está liberada. Próxima renovação em ${daysRemaining} dias corridos.`,
          timeAgo: 'Em dia',
          severity: 'success',
        });
      }
    }

    // 3. Notificação se o acesso está pendente ou expirou
    if (!isAuthorized) {
      const isPending = subscription?.status === 'pendente' || subscriptionStatus === 'pending';
      list.push({
        id: isPending ? 'access-pending-alert' : 'access-expired-alert',
        title: isPending ? 'Aguardando Ativação • Realize o Pix' : 'Acesso Pausado • Realize o Pix',
        message: isPending
          ? 'Sua conta está aguardando ativação. Realize o pagamento de R$ 9,90 via Pix para desbloquear todas as funções do Bora Premium.'
          : 'Seu período de teste ou ciclo mensal expirou. Realize o pagamento de R$ 9,90 via Pix para desbloquear todas as funções.',
        timeAgo: 'Atenção',
        severity: 'urgent',
        actionText: isPending ? 'Ativar Bora Premium (R$ 9,90)' : 'Pagar Pix agora (R$ 9,90)',
        onAction: () => {
          setIsOpen(false);
          onOpenSubscriptionModal();
        },
      });
    }

    // 4. Boas-vindas / Dica da plataforma
    list.push({
      id: 'welcome-bora-tips',
      title: 'Dica do Bora',
      message: 'Registre suas marcas com as porcentagens reais de comissão para que o cálculo de lucros seja 100% automático.',
      timeAgo: 'Dica',
      severity: 'info',
    });

    return list.map(item => ({
      ...item,
      isRead: readIds.includes(item.id),
    }));
  }, [isTrial, daysRemaining, isAuthorized, subscription, readIds, onOpenSubscriptionModal, onNavigateSettings]);

  // Contagem de notificações não lidas
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const hasUrgent = useMemo(() => {
    return notifications.some(n => !n.isRead && (n.severity === 'urgent' || n.severity === 'warning'));
  }, [notifications]);

  const handleMarkAsRead = (id: string) => {
    const updated = Array.from(new Set([...readIds, id]));
    setReadIds(updated);
    try {
      localStorage.setItem('bora_read_notifications', JSON.stringify(updated));
    } catch {
      // Ignora erro de storage
    }
  };

  const handleMarkAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    const updated = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(updated);
    try {
      localStorage.setItem('bora_read_notifications', JSON.stringify(updated));
    } catch {
      // Ignora erro de storage
    }
  };

  const getSeverityIcon = (severity: NotificationItem['severity']) => {
    switch (severity) {
      case 'urgent':
        return <AlertTriangle size={17} className="text-rose-600" />;
      case 'warning':
        return <Clock size={17} className="text-amber-600" />;
      case 'success':
        return <CheckCircle2 size={17} className="text-emerald-600" />;
      case 'info':
      default:
        return <Sparkles size={17} className="text-[#7A1C1D]" />;
    }
  };

  const getSeverityBg = (severity: NotificationItem['severity']) => {
    switch (severity) {
      case 'urgent':
        return 'bg-rose-50 border-rose-200/80';
      case 'warning':
        return 'bg-amber-50 border-amber-200/80';
      case 'success':
        return 'bg-emerald-50 border-emerald-200/80';
      case 'info':
      default:
        return 'bg-[#F8E7E9] border-[#F2D7D9]';
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Botão do Sininho */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="relative p-2.5 rounded-2xl bg-white/80 hover:bg-white text-gray-700 hover:text-[#7A1C1D] border border-gray-200/70 shadow-sm transition-all duration-200 active:scale-95 cursor-pointer flex items-center justify-center"
        title="Notificações e Avisos"
        aria-label="Abrir Notificações"
      >
        <Bell size={19} className={hasUrgent ? 'animate-bounce text-[#7A1C1D]' : ''} />
        
        {/* Badge indicador */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#7A1C1D] text-white text-[10px] font-black shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover / Drawer das Notificações */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white/98 backdrop-blur-xl border border-[#F2D7D9] rounded-3xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Cabeçalho do Popover */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#FAF8F8] to-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F8E7E9] flex items-center justify-center text-[#7A1C1D]">
                  <Bell size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#1D1D1F]">Notificações</h3>
                  <p className="text-[11px] text-[#86868B]">
                    {unreadCount > 0 ? `${unreadCount} ${unreadCount === 1 ? 'não lida' : 'não lidas'}` : 'Todas em dia'}
                  </p>
                </div>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="text-[11px] font-bold text-[#7A1C1D] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Check size={12} />
                  <span>Ler todas</span>
                </button>
              )}
            </div>

            {/* Lista de Notificações */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100/80 p-2 space-y-1">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#86868B] space-y-2">
                  <ShieldCheck size={28} className="mx-auto text-gray-300" />
                  <p>Nenhuma notificação nova no momento.</p>
                </div>
              ) : (
                notifications.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleMarkAsRead(item.id)}
                    className={`p-3 rounded-2xl transition-all duration-200 space-y-2 ${
                      item.isRead ? 'bg-white hover:bg-gray-50/80 opacity-80' : 'bg-[#FAF8F8] hover:bg-[#F8E7E9]/30'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`p-2 rounded-xl border shrink-0 ${getSeverityBg(item.severity)}`}>
                        {getSeverityIcon(item.severity)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className={`text-xs font-bold truncate ${item.isRead ? 'text-[#1D1D1F]' : 'text-[#7A1C1D]'}`}>
                            {item.title}
                          </h4>
                          <span className="text-[10px] text-[#86868B] shrink-0 font-medium">
                            {item.timeAgo}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#555] leading-relaxed mt-0.5">
                          {item.message}
                        </p>
                      </div>
                    </div>

                    {/* Botão de Ação Direta */}
                    {item.actionText && item.onAction && (
                      <div className="pl-10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(item.id);
                            item.onAction!();
                          }}
                          className="w-full py-1.5 px-3 rounded-xl bg-[#7A1C1D] hover:bg-[#6E2E49] text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                        >
                          <span>{item.actionText}</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Rodapé informativo */}
            <div className="p-3 bg-gray-50/80 border-t border-gray-100 text-center">
              <p className="text-[10px] text-[#86868B]">
                Bora • Alertas de assinatura e teste sincronizados em tempo real.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
