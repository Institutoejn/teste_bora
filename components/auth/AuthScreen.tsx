import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginForm } from './LoginForm';
import { SignUpForm } from './SignUpForm';
import { ShieldCheck } from 'lucide-react';
import { BrandAssets } from '../../BrandAssets';

interface AuthScreenProps {
  onSuccess: () => void;
  initialMode?: 'login' | 'signup';
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess, initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  return (
    <div className="min-h-screen bg-[#F6E9E4] text-[#1A1A1A] flex flex-col justify-between relative overflow-x-hidden selection:bg-[#F2D7D9] selection:text-[#7A1C1D]">
      {/* Elementos sutis de fundo atmosféricos na paleta oficial */}
      <div 
        className="absolute -top-36 -left-36 w-[650px] h-[650px] rounded-full bg-[#F2D7D9]/60 blur-[140px] pointer-events-none -z-10" 
        aria-hidden="true" 
      />
      <div 
        className="absolute top-1/4 -right-36 w-[550px] h-[550px] rounded-full bg-[#E4A9B4]/30 blur-[150px] pointer-events-none -z-10" 
        aria-hidden="true" 
      />
      <div 
        className="absolute -bottom-36 left-1/4 w-[500px] h-[500px] rounded-full bg-[#F8E7E9]/80 blur-[130px] pointer-events-none -z-10" 
        aria-hidden="true" 
      />

      {/* Área principal responsiva */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-10 lg:p-12 xl:p-16">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center">
          
          {/* LADO ESQUERDO: Marca e Posicionamento BORA (Desktop) / Superior (Mobile) */}
          <div className="lg:col-span-7 flex flex-col justify-center py-2 lg:py-6 space-y-6 lg:space-y-7">
            <div className="space-y-4 lg:space-y-5">
              {/* Logo BORA Oficial */}
              <div className="flex items-center">
                <img 
                  src={BrandAssets.usage.authLight} 
                  alt="BORA" 
                  className="w-[200px] h-[75px] object-contain select-none"
                />
              </div>

              {/* Posicionamento Principal */}
              <h1 className="text-3xl sm:text-4xl lg:text-[44px] xl:text-[48px] font-black tracking-tight text-[#1A1A1A] leading-[1.12]">
                Seu negócio de revenda,<br />
                no seu ritmo.
              </h1>

              {/* Slogan de Suporte com Logo Inline */}
              <p className="text-base sm:text-lg lg:text-xl font-medium text-[#1A1A1A]/85 flex items-center flex-wrap gap-x-2">
                <span>Você vende.</span>
                <span className="inline-flex items-center gap-1.5 font-bold text-[#7A1C1D]">
                  <img 
                    src={BrandAssets.symbols.color.transparent} 
                    alt="BORA" 
                    className="h-5 sm:h-6 w-auto object-contain inline-block align-middle"
                  />
                  <span>organiza.</span>
                </span>
              </p>

              {/* Descrição Secundária */}
              <p className="text-sm sm:text-base text-[#86868B] leading-relaxed max-w-lg">
                Vendas, clientes, marcas e recebimentos em um só lugar.
              </p>
            </div>

            {/* Imagem Hero BORA - Card Premium com Interação Hover */}
            <div className="w-full max-w-lg lg:max-w-xl pt-1">
              <div className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#F2D7D9] bg-white shadow-md shadow-[#7A1C1D]/5 transition-all duration-500 ease-out hover:shadow-xl hover:shadow-[#7A1C1D]/10 hover:border-[#E8B4B8]">
                <div className="relative aspect-[1672/941] w-full overflow-hidden bg-[#FAF5F5]">
                  <img
                    src="/bora-hero.png.png"
                    alt="BORA"
                    className="w-full h-full object-cover object-center select-none pointer-events-none transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    loading="eager"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* LADO DIREITO: Cartão de Autenticação */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto lg:max-w-none">
            <div className="bg-white/95 rounded-[32px] border border-[#F2D7D9] shadow-xl shadow-[#7A1C1D]/5 p-6 sm:p-8 backdrop-blur-sm">
              {/* Controle Segmentado / Abas de Alternância */}
              <div className="relative bg-[#F8E7E9] p-1 rounded-2xl flex items-center mb-6">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 relative z-10 ${
                    mode === 'login'
                      ? 'text-[#7A1C1D] shadow-sm'
                      : 'text-[#B1818F] hover:text-[#7A1C1D]'
                  }`}
                >
                  {mode === 'login' && (
                    <motion.div
                      layoutId="auth-pill-active"
                      className="absolute inset-0 bg-white rounded-xl -z-10 shadow-sm"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  Entrar
                </button>

                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 relative z-10 ${
                    mode === 'signup'
                      ? 'text-[#7A1C1D] shadow-sm'
                      : 'text-[#B1818F] hover:text-[#7A1C1D]'
                  }`}
                >
                  {mode === 'signup' && (
                    <motion.div
                      layoutId="auth-pill-active"
                      className="absolute inset-0 bg-white rounded-xl -z-10 shadow-sm"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  Criar conta
                </button>
              </div>

              {/* Transição suave de formulários */}
              <AnimatePresence mode="wait">
                {mode === 'login' ? (
                  <motion.div
                    key="login-form-container"
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 14 }}
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <LoginForm 
                      onSwitchToSignUp={() => setMode('signup')} 
                      onSuccess={onSuccess} 
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="signup-form-container"
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 14 }}
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <SignUpForm 
                      onSwitchToLogin={() => setMode('login')} 
                      onSuccess={onSuccess} 
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Rodapé de Segurança e Confiança */}
            <footer className="mt-4 text-center flex items-center justify-center gap-2 text-[11px] text-[#B1818F] font-medium">
              <ShieldCheck size={14} className="text-[#C87A8A]" />
              <span>Ambiente seguro • Seus dados protegidos</span>
            </footer>

            {/* Mensagem Institucional (Mobile) */}
            <div className="block lg:hidden mt-6 text-center">
              <p className="text-xs text-[#B1818F] font-medium leading-snug">
                Tecnologia inteligente para quem vende.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};


