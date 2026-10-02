import React from 'react';
import { ArrowRight, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from '../GlassCard';
import { BrandAssets } from '../../BrandAssets';

interface OnboardingWelcomeModalProps {
  userName?: string;
  onStart: () => void;
  onSkip: () => void;
}

export const OnboardingWelcomeModal: React.FC<OnboardingWelcomeModalProps> = ({
  userName,
  onStart,
  onSkip,
}) => {
  const firstName = userName ? userName.trim().split(' ')[0] : 'Revendedora';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-md"
      >
        <GlassCard className="p-8 bg-white/95 rounded-[32px] border border-[#F2D7D9] apple-shadow relative overflow-hidden">
          {/* Botão sutil para fechar ou pular */}
          <button
            onClick={onSkip}
            aria-label="Pular introdução"
            className="absolute top-6 right-6 p-2 text-[#86868B] hover:text-[#1A1A1A] hover:bg-gray-100 rounded-full transition-colors active:scale-90"
          >
            <X size={18} />
          </button>

          {/* Logo / Ícone de Boas-vindas BORA */}
          <div className="flex items-center mb-6">
            <img 
              src={BrandAssets.usage.tour} 
              alt="BORA" 
              className="h-11 max-w-[200px] object-contain select-none"
            />
          </div>

          <div className="space-y-3 mb-8">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#F2D7D9] text-[#7A1C1D] text-[11px] font-bold uppercase tracking-wider">
              <span>Tour de Boas-Vindas</span>
            </div>
            
            <h2 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-[#1A1A1A] leading-tight">
              Olá, {firstName}.<br />Bem-vinda ao Bora.
            </h2>
            
            <p className="text-sm md:text-base text-[#86868B] font-medium leading-relaxed">
              Vamos te mostrar, em poucos passos, como organizar suas vendas, seus clientes e suas marcas.
            </p>

            <p className="text-xs text-[#86868B] font-semibold pt-1">
              Leva menos de 3 minutos.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={onStart}
              className="w-full py-4 px-6 rounded-2xl font-bold text-white bg-[#7A1C1D] hover:bg-[#6E2E49] shadow-lg shadow-[#7A1C1D]/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <span>Conhecer o Bora</span>
              <ArrowRight size={18} />
            </button>

            <button
              onClick={onSkip}
              className="w-full py-2.5 text-xs font-semibold text-[#86868B] hover:text-[#1A1A1A] transition-colors text-center"
            >
              Pular introdução e ir direto ao app
            </button>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};

