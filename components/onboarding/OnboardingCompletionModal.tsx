import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from '../GlassCard';

interface OnboardingCompletionModalProps {
  onFinish: () => void;
}

export const OnboardingCompletionModal: React.FC<OnboardingCompletionModalProps> = ({
  onFinish,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-md"
      >
        <GlassCard className="p-8 bg-white/95 rounded-[32px] border-white/60 apple-shadow text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-green-600 mb-6">
            <CheckCircle2 size={32} />
          </div>

          <div className="space-y-3 mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-[11px] font-bold uppercase tracking-wider">
              <span>Onboarding Concluído</span>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#1D1D1F]">
              Pronto. Você já sabe usar o Bora.
            </h2>

            <p className="text-sm md:text-base text-[#86868B] font-medium leading-relaxed">
              Agora é só cadastrar seus clientes, suas marcas e registrar suas vendas. O restante a gente organiza para você.
            </p>
          </div>

          <button
            onClick={onFinish}
            className="w-full py-4 px-6 rounded-2xl font-bold text-white bg-[#7A1C1D] hover:bg-[#6E2E49] shadow-lg shadow-[#7A1C1D]/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <span>Ir para meu Dashboard</span>
            <ArrowRight size={18} />
          </button>
        </GlassCard>
      </motion.div>
    </div>
  );
};
