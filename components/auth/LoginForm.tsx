import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, Check, ArrowRight, AlertCircle, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './AuthContext';

interface LoginFormProps {
  onSwitchToSignUp: () => void;
  onSuccess: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToSignUp, onSuccess }) => {
  const { login, resetPassword } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Estados de recuperação de senha
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  // Validação do formato de e-mail
  const validateEmail = (val: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Informe o seu e-mail.';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Informe um e-mail válido.';
    }

    if (!password) {
      newErrors.password = 'Informe a sua senha.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isSuccess) return;

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const result = await login({ email, password });
      if (!result.success) {
        setErrors({ general: result.error || 'Credenciais inválidas. Verifique seu e-mail e senha.' });
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 700);
    } catch {
      setErrors({ general: 'Ocorreu um erro ao tentar entrar. Tente novamente.' });
      setIsLoading(false);
    }
  };

  const handleOpenRecovery = () => {
    setRecoveryEmail(email.trim());
    setRecoveryError(null);
    setRecoverySuccess(false);
    setIsRecoveryMode(true);
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);

    if (!recoveryEmail.trim()) {
      setRecoveryError('Informe seu e-mail para recuperar a senha.');
      return;
    }

    if (!validateEmail(recoveryEmail)) {
      setRecoveryError('Informe um e-mail válido.');
      return;
    }

    setRecoveryLoading(true);

    try {
      const res = await resetPassword(recoveryEmail);
      if (!res.success) {
        setRecoveryError(res.error || 'Não foi possível enviar o e-mail de recuperação. Tente novamente.');
        setRecoveryLoading(false);
        return;
      }

      setRecoverySuccess(true);
    } catch {
      setRecoveryError('Erro ao enviar link de recuperação. Verifique sua conexão.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  // TELA DE RECUPERAÇÃO DE SENHA INTERATIVA E REAL
  if (isRecoveryMode) {
    return (
      <div className="w-full space-y-5">
        {/* Cabeçalho de Recuperação */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsRecoveryMode(false);
              setRecoverySuccess(false);
              setRecoveryError(null);
            }}
            className="p-1.5 -ml-1 text-[#86868B] hover:text-[#1D1D1F] hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            title="Voltar ao login"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h3 className="font-extrabold text-lg text-[#1D1D1F]">Recuperar senha</h3>
            <p className="text-xs text-[#86868B]">
              Enviaremos um link de redefinição para o seu e-mail
            </p>
          </div>
        </div>

        {recoverySuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <Check size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-[#1D1D1F]">Link enviado com sucesso!</h4>
              <p className="text-xs text-[#86868B] leading-relaxed">
                Enviamos as instruções de redefinição para <strong className="text-[#1D1D1F]">{recoveryEmail}</strong>.
              </p>
            </div>
            <div className="text-[11px] text-[#86868B] bg-white/70 p-3 rounded-xl border border-emerald-100 text-left space-y-1">
              <p>• Abra a sua caixa de entrada no e-mail indicado.</p>
              <p>• Verifique também a pasta de spam ou lixo eletrônico.</p>
              <p>• Clique no link recebido para cadastrar sua nova senha.</p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsRecoveryMode(false);
                  setRecoverySuccess(false);
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-[#7A1C1D] hover:bg-[#6E2E49] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Voltar para o login
              </button>
              <button
                type="button"
                onClick={() => setRecoverySuccess(false)}
                className="text-xs text-[#86868B] hover:text-[#1D1D1F] font-semibold py-1 cursor-pointer"
              >
                Tentar outro e-mail
              </button>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleRecoverySubmit} noValidate className="space-y-4">
            {recoveryError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-rose-500" />
                <span>{recoveryError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label 
                htmlFor="recovery-email"
                className="text-[10px] font-black text-[#86868B] uppercase tracking-[0.1em] ml-1 block"
              >
                E-mail cadastrado
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Mail size={18} />
                </div>
                <input
                  id="recovery-email"
                  type="email"
                  autoComplete="email"
                  value={recoveryEmail}
                  onChange={(e) => {
                    setRecoveryEmail(e.target.value);
                    if (recoveryError) setRecoveryError(null);
                  }}
                  placeholder="seuemail@exemplo.com"
                  disabled={recoveryLoading}
                  className="w-full bg-[#F8E7E9]/40 rounded-2xl py-3.5 pl-12 pr-4 text-sm outline-none text-[#1A1A1A] font-medium placeholder:text-gray-400 border border-transparent focus:ring-2 focus:ring-[#7A1C1D] focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={recoveryLoading}
              className="w-full py-4 px-6 rounded-2xl bg-[#7A1C1D] hover:bg-[#6E2E49] active:scale-[0.98] text-white font-bold text-xs shadow-lg shadow-[#7A1C1D]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {recoveryLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Enviando link...</span>
                </>
              ) : (
                <>
                  <span>Enviar link de recuperação</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRecoveryMode(false);
                  setRecoveryError(null);
                }}
                className="text-xs font-semibold text-[#86868B] hover:text-[#1D1D1F] transition-colors py-1 cursor-pointer"
              >
                Lembrou sua senha? <span className="font-bold text-[#7A1C1D]">Entrar</span>
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  // TELA PADRÃO DE LOGIN
  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Notificação geral de erro */}
        <AnimatePresence>
          {errors.general && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/70 text-rose-700 text-xs font-medium flex items-center gap-2.5"
              role="alert"
            >
              <AlertCircle size={16} className="text-rose-500 shrink-0" />
              <span>{errors.general}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Campo E-mail */}
        <div className="space-y-1.5">
          <label 
            htmlFor="login-email" 
            className="text-[10px] font-black text-[#86868B] uppercase tracking-[0.1em] ml-1 block"
          >
            E-mail
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <Mail size={18} />
            </div>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="seuemail@exemplo.com"
              disabled={isLoading || isSuccess}
              className={`w-full bg-[#F8E7E9]/40 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none text-[#1A1A1A] font-medium placeholder:text-gray-400 transition-all ${
                errors.email
                  ? 'border border-rose-300 ring-2 ring-rose-500/20 bg-rose-50/20 focus:ring-rose-500/30'
                  : 'border border-transparent focus:ring-2 focus:ring-[#7A1C1D] focus:bg-white'
              }`}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-rose-500 font-medium ml-1 mt-1 flex items-center gap-1">
              {errors.email}
            </p>
          )}
        </div>

        {/* Campo Senha */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-1">
            <label 
              htmlFor="login-password" 
              className="text-[10px] font-black text-[#86868B] uppercase tracking-[0.1em] block"
            >
              Senha
            </label>
            <button
              type="button"
              onClick={handleOpenRecovery}
              className="text-[11px] font-semibold text-[#7A1C1D] hover:text-[#6E2E49] hover:underline focus:outline-none transition-colors cursor-pointer"
            >
              Esqueci minha senha
            </button>
          </div>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <Lock size={18} />
            </div>
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              placeholder="Sua senha de acesso"
              disabled={isLoading || isSuccess}
              className={`w-full bg-[#F8E7E9]/40 rounded-2xl py-4 pl-12 pr-12 text-sm outline-none text-[#1A1A1A] font-medium placeholder:text-gray-400 transition-all ${
                errors.password
                  ? 'border border-rose-300 ring-2 ring-rose-500/20 bg-rose-50/20 focus:ring-rose-500/30'
                  : 'border border-transparent focus:ring-2 focus:ring-[#7A1C1D] focus:bg-white'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 transition-colors cursor-pointer"
              aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-rose-500 font-medium ml-1 mt-1 flex items-center gap-1">
              {errors.password}
            </p>
          )}
        </div>

        {/* Botão Entrar */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading || isSuccess}
            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm text-sm cursor-pointer ${
              isSuccess
                ? 'bg-emerald-600 text-white shadow-emerald-100'
                : isLoading
                ? 'bg-[#7A1C1D]/80 text-white cursor-wait'
                : 'bg-[#7A1C1D] hover:bg-[#6E2E49] text-white shadow-lg shadow-[#7A1C1D]/20 active:bg-[#5C1415]'
            }`}
          >
            {isSuccess ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                <Check size={20} />
                <span>Acesso autorizado</span>
              </motion.div>
            ) : isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                <span>Entrando...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>Entrar</span>
                <ArrowRight size={16} />
              </div>
            )}
          </button>
        </div>

        {/* Alternância para Criar uma Conta */}
        <div className="text-center pt-3 border-t border-gray-100">
          <p className="text-xs text-[#86868B]">
            Ainda não tem conta no BORA?{' '}
            <button
              type="button"
              onClick={onSwitchToSignUp}
              className="font-bold text-[#7A1C1D] hover:text-[#6E2E49] hover:underline focus:outline-none transition-colors cursor-pointer"
            >
              Criar uma conta
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};
