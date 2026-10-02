import React from 'react';
import { ArrowRight, CheckCircle, Check, X, Plus, Tag, UserPlus, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../GlassCard';
import { OnboardingStep, Client, Brand, Sale } from '../../types';

interface OnboardingStepCardProps {
  step: OnboardingStep;
  lastCreatedClient: Client | null;
  lastCreatedBrand: Brand | null;
  lastCreatedSale: Sale | null;
  onNext: () => void;
  onOpenClientForm: () => void;
  onOpenBrandForm: () => void;
  onOpenSalesForm: () => void;
  onSkipSale: () => void;
  onExit: () => void;
}

export const OnboardingStepCard: React.FC<OnboardingStepCardProps> = ({
  step,
  lastCreatedClient,
  lastCreatedBrand,
  lastCreatedSale,
  onNext,
  onOpenClientForm,
  onOpenBrandForm,
  onOpenSalesForm,
  onSkipSale,
  onExit,
}) => {
  const getStepProgress = () => {
    switch (step) {
      case 'dashboard_intro':
        return '1 de 4';
      case 'clients_intro':
      case 'client_created':
        return '2 de 4';
      case 'brands_intro':
      case 'brand_created':
        return '3 de 4';
      case 'sale_intro':
      case 'sale_created':
        return '4 de 4';
      default:
        return '';
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'dashboard_intro':
        return {
          badge: 'Centro de Controle',
          title: 'Este é o seu centro de controle.',
          description:
            'Aqui você acompanha o que está acontecendo no seu negócio: vendas, lucro, valores a receber e próximos vencimentos.',
          primaryAction: {
            label: 'Próximo',
            icon: <ArrowRight size={16} />,
            onClick: onNext,
          },
          secondaryAction: {
            label: 'Pular tour',
            onClick: onExit,
          },
        };

      case 'clients_intro':
        return {
          badge: 'Clientes',
          title: 'Vamos cadastrar seu primeiro cliente.',
          description: 'É aqui que você organiza as pessoas para quem você vende.',
          primaryAction: {
            label: 'Cadastrar cliente',
            icon: <UserPlus size={16} />,
            onClick: onOpenClientForm,
          },
          secondaryAction: {
            label: 'Pular tour',
            onClick: onExit,
          },
        };

      case 'client_created':
        return {
          badge: 'Cliente Criado',
          isSuccess: true,
          title: 'Cliente cadastrado.',
          description: 'Agora você já tem seu primeiro cliente no Bora.',
          highlight: lastCreatedClient ? `Cliente: ${lastCreatedClient.name}` : undefined,
          primaryAction: {
            label: 'Continuar',
            icon: <ArrowRight size={16} />,
            onClick: onNext,
          },
        };

      case 'brands_intro':
        return {
          badge: 'Marcas',
          title: 'Agora vamos cadastrar uma marca.',
          description:
            'Cadastre uma marca que você revende para começar a organizar suas vendas por marca.',
          primaryAction: {
            label: 'Adicionar marca',
            icon: <Tag size={16} />,
            onClick: onOpenBrandForm,
          },
          secondaryAction: {
            label: 'Pular tour',
            onClick: onExit,
          },
        };

      case 'brand_created':
        return {
          badge: 'Marca Criada',
          isSuccess: true,
          title: 'Marca cadastrada.',
          description: 'Agora suas vendas podem ser organizadas por marca.',
          highlight: lastCreatedBrand
            ? `${lastCreatedBrand.name} (${(lastCreatedBrand.commission * 100).toFixed(0)}% comissão)`
            : undefined,
          primaryAction: {
            label: 'Continuar',
            icon: <ArrowRight size={16} />,
            onClick: onNext,
          },
        };

      case 'sale_intro':
        return {
          badge: 'Primeira Venda',
          title: 'Agora vamos registrar uma venda.',
          description:
            'Você já tem um cliente e uma marca. Veja como funciona o coração do Bora.',
          primaryAction: {
            label: 'Registrar venda',
            icon: <DollarSign size={16} />,
            onClick: onOpenSalesForm,
          },
          secondaryAction: {
            label: 'Pular esta etapa',
            onClick: onSkipSale,
          },
        };

      case 'sale_created':
        return {
          badge: 'Venda Concluída',
          isSuccess: true,
          title: 'Venda registrada.',
          description: 'Veja as informações calculadas pelo LUME:',
          saleDetails: lastCreatedSale,
          primaryAction: {
            label: 'Continuar',
            icon: <ArrowRight size={16} />,
            onClick: onNext,
          },
        };

      default:
        return null;
    }
  };

  const config = renderContent();
  if (!config) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[92%] max-w-lg z-30 pointer-events-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        >
          <GlassCard className="p-5 md:p-6 bg-white/95 rounded-[28px] border border-[#F2D7D9] apple-shadow relative overflow-hidden shadow-xl shadow-[#7A1C1D]/5">
            {/* Linha de Progresso e Fechar */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100/80 mb-3.5">
              <div className="flex items-center gap-2">
                <span className="bg-[#F2D7D9] text-[#7A1C1D] text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-[#E4A9B4]/40">
                  {getStepProgress()}
                </span>
                <span className="text-xs font-semibold text-[#86868B]">
                  {config.badge}
                </span>
              </div>
              <button
                onClick={onExit}
                title="Sair do tour"
                aria-label="Sair do tour"
                className="p-1.5 text-[#86868B] hover:text-[#1A1A1A] hover:bg-gray-100 rounded-full transition-colors active:scale-90"
              >
                <X size={16} />
              </button>
            </div>

            {/* Conteúdo Principal */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2">
                {config.isSuccess && (
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
                <h3 className="text-lg md:text-xl font-bold tracking-tight text-[#1A1A1A]">
                  {config.title}
                </h3>
              </div>

              <p className="text-xs md:text-sm text-[#86868B] leading-relaxed">
                {config.description}
              </p>

              {/* Destaque opcional (ex: nome do cliente ou marca) */}
              {config.highlight && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100 text-xs font-bold text-[#1A1A1A] mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{config.highlight}</span>
                </div>
              )}

              {/* Resumo da Venda Registrada */}
              {config.saleDetails && (
                <div className="grid grid-cols-3 gap-2 p-3 bg-[#F8E7E9]/50 rounded-2xl border border-[#F2D7D9] mt-2 text-center">
                  <div>
                    <span className="block text-[10px] font-black text-[#86868B] uppercase tracking-wider">
                      Valor
                    </span>
                    <span className="text-xs md:text-sm font-bold text-[#1A1A1A]">
                      R$ {config.saleDetails.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="border-x border-gray-200">
                    <span className="block text-[10px] font-black text-emerald-600 uppercase tracking-wider">
                      Lucro
                    </span>
                    <span className="text-xs md:text-sm font-bold text-emerald-600">
                      R$ {config.saleDetails.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-black text-[#7A1C1D] uppercase tracking-wider">
                      A Receber
                    </span>
                    <span className="text-xs md:text-sm font-bold text-[#7A1C1D]">
                      R$ {config.saleDetails.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2.5 pt-1">
              {config.secondaryAction && (
                <button
                  onClick={config.secondaryAction.onClick}
                  className="py-3 px-4 rounded-xl text-xs font-semibold text-[#86868B] hover:text-[#1A1A1A] hover:bg-gray-100 transition-all active:scale-[0.98]"
                >
                  {config.secondaryAction.label}
                </button>
              )}

              <button
                onClick={config.primaryAction.onClick}
                className="flex-1 py-3.5 px-4 rounded-2xl font-bold text-xs md:text-sm text-white bg-[#7A1C1D] hover:bg-[#6E2E49] shadow-md shadow-[#7A1C1D]/20 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
              >
                <span>{config.primaryAction.label}</span>
                {config.primaryAction.icon}
              </button>
            </div>
          </GlassCard>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
