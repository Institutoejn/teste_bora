import React, { useState } from 'react';
import { User, Mail, Phone, Lock, Eye, EyeOff, Loader2, Check, ArrowRight, AlertCircle, ShieldCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './AuthContext';

interface SignUpFormProps {
  onSwitchToLogin: () => void;
  onSuccess: () => void;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({ onSwitchToLogin, onSuccess }) => {
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
    agreeTerms?: string;
    general?: string;
  }>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isConfirmationPending, setIsConfirmationPending] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState<'terms' | 'privacy' | null>(null);

  // Formatação de telefone brasileira (WhatsApp)
  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/^(\d{2})(\d)/g, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
    return value.slice(0, 15);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value);
    setPhone(formatted);
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
  };

  const validateEmail = (val: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = 'Informe o seu nome completo.';
    } else if (name.trim().length < 3) {
      newErrors.name = 'O nome deve ter pelo menos 3 caracteres.';
    }

    if (!email.trim()) {
      newErrors.email = 'Informe o seu e-mail.';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Informe um e-mail válido.';
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) {
      newErrors.phone = 'Informe o seu número de celular.';
    } else if (cleanPhone.length < 10) {
      newErrors.phone = 'Informe um telefone com DDD válido.';
    }

    if (!password) {
      newErrors.password = 'Crie uma senha de acesso.';
    } else if (password.length < 6) {
      newErrors.password = 'A senha deve ter no mínimo 6 caracteres.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirme a sua senha.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem.';
    }

    if (!agreeTerms) {
      newErrors.agreeTerms = 'Você deve concordar com os Termos de Uso e a Política de Privacidade.';
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
      const result = await signUp({
        name,
        email,
        phone,
        password
      });

      if (!result.success) {
        setErrors({ general: result.error || 'Falha ao criar conta. Tente novamente.' });
        setIsLoading(false);
        return;
      }

      if (result.requiresEmailConfirmation) {
        setIsConfirmationPending(true);
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 700);
    } catch {
      setErrors({ general: 'Ocorreu um erro ao processar seu cadastro. Tente novamente.' });
      setIsLoading(false);
    }
  };

  if (isConfirmationPending) {
    return (
      <div className="w-full text-center space-y-5 py-4">
        <div className="w-14 h-14 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 mx-auto flex items-center justify-center shadow-sm">
          <Mail size={26} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-[#1A1A1A]">
            Confirme seu e-mail
          </h3>
          <p className="text-xs text-[#86868B] leading-relaxed max-w-sm mx-auto">
            Sua conta foi criada! Enviamos uma mensagem com link de confirmação para{' '}
            <strong className="text-[#1A1A1A] font-semibold">{email}</strong>.
            Acesse seu e-mail para ativar sua conta e entrar no BORA.
          </p>
        </div>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="w-full py-3 px-4 rounded-2xl bg-[#7A1C1D] hover:bg-[#6E2E49] active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-[#7A1C1D]/20 transition-all flex items-center justify-center gap-2"
        >
          <span>Ir para o Login</span>
          <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
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

        {/* Campo Nome */}
        <div className="space-y-1">
          <label 
            htmlFor="signup-name" 
            className="text-[10px] font-black text-[#86868B] uppercase tracking-[0.1em] ml-1 block"
          >
            Nome Completo
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <User size={18} />
            </div>
            <input
              id="signup-name"
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder="Seu nome completo"
              disabled={isLoading || isSuccess}
              className={`w-full bg-[#F8E7E9]/40 rounded-2xl py-3.5 pl-12 pr-4 text-sm outline-none text-[#1A1A1A] font-medium placeholder:text-gray-400 transition-all ${
                errors.name
                  ? 'border border-rose-300 ring-2 ring-rose-500/20 bg-rose-50/20'
                  : 'border border-transparent focus:ring-2 focus:ring-[#7A1C1D] focus:bg-white'
              }`}
            />
          </div>
          {errors.name && (
            <p className="text-xs text-rose-500 font-medium ml-1 flex items-center gap-1">
              {errors.name}
            </p>
          )}
        </div>

        {/* Campo E-mail */}
        <div className="space-y-1">
          <label 
            htmlFor="signup-email" 
            className="text-[10px] font-black text-[#86868B] uppercase tracking-[0.1em] ml-1 block"
          >
            E-mail
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <Mail size={18} />
            </div>
            <input
              id="signup-email"
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
              className={`w-full bg-[#F8E7E9]/40 rounded-2xl py-3.5 pl-12 pr-4 text-sm outline-none text-[#1A1A1A] font-medium placeholder:text-gray-400 transition-all ${
                errors.email
                  ? 'border border-rose-300 ring-2 ring-rose-500/20 bg-rose-50/20'
                  : 'border border-transparent focus:ring-2 focus:ring-[#7A1C1D] focus:bg-white'
              }`}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-rose-500 font-medium ml-1 flex items-center gap-1">
              {errors.email}
            </p>
          )}
        </div>

        {/* Campo Celular */}
        <div className="space-y-1">
          <label 
            htmlFor="signup-phone" 
            className="text-[10px] font-black text-[#86868B] uppercase tracking-[0.1em] ml-1 block"
          >
            Celular (WhatsApp)
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <Phone size={18} />
            </div>
            <input
              id="signup-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(00) 00000-0000"
              disabled={isLoading || isSuccess}
              className={`w-full bg-[#F8E7E9]/40 rounded-2xl py-3.5 pl-12 pr-4 text-sm outline-none text-[#1A1A1A] font-medium placeholder:text-gray-400 transition-all ${
                errors.phone
                  ? 'border border-rose-300 ring-2 ring-rose-500/20 bg-rose-50/20'
                  : 'border border-transparent focus:ring-2 focus:ring-[#7A1C1D] focus:bg-white'
              }`}
            />
          </div>
          {errors.phone && (
            <p className="text-xs text-rose-500 font-medium ml-1 flex items-center gap-1">
              {errors.phone}
            </p>
          )}
        </div>

        {/* Linha dupla: Senha e Confirmar Senha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Senha */}
          <div className="space-y-1">
            <label 
              htmlFor="signup-password" 
              className="text-[10px] font-black text-[#86868B] uppercase tracking-[0.1em] ml-1 block"
            >
              Senha
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <Lock size={18} />
              </div>
              <input
                id="signup-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="Mín. 6 dígitos"
                disabled={isLoading || isSuccess}
                className={`w-full bg-[#F8E7E9]/40 rounded-2xl py-3.5 pl-12 pr-10 text-sm outline-none text-[#1A1A1A] font-medium placeholder:text-gray-400 transition-all ${
                  errors.password
                    ? 'border border-rose-300 ring-2 ring-rose-500/20 bg-rose-50/20'
                    : 'border border-transparent focus:ring-2 focus:ring-[#7A1C1D] focus:bg-white'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-rose-500 font-medium ml-1">
                {errors.password}
              </p>
            )}
          </div>

          {/* Confirmar Senha */}
          <div className="space-y-1">
            <label 
              htmlFor="signup-confirm-password" 
              className="text-[10px] font-black text-[#86868B] uppercase tracking-[0.1em] ml-1 block"
            >
              Confirmar senha
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <Lock size={18} />
              </div>
              <input
                id="signup-confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                placeholder="Repita a senha"
                disabled={isLoading || isSuccess}
                className={`w-full bg-[#F8E7E9]/40 rounded-2xl py-3.5 pl-12 pr-10 text-sm outline-none text-[#1A1A1A] font-medium placeholder:text-gray-400 transition-all ${
                  errors.confirmPassword
                    ? 'border border-rose-300 ring-2 ring-rose-500/20 bg-rose-50/20'
                    : 'border border-transparent focus:ring-2 focus:ring-[#7A1C1D] focus:bg-white'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                aria-label={showConfirmPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-rose-500 font-medium ml-1">
                {errors.confirmPassword}
              </p>
            )}
          </div>
        </div>

        {/* Checkbox Termos de Uso e Política de Privacidade */}
        <div className="pt-1">
          <label className="flex items-start gap-3 cursor-pointer select-none group">
            <div className="relative flex items-center pt-0.5">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => {
                  setAgreeTerms(e.target.checked);
                  if (errors.agreeTerms) setErrors((prev) => ({ ...prev, agreeTerms: undefined }));
                }}
                disabled={isLoading || isSuccess}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                  agreeTerms
                    ? 'bg-[#7A1C1D] text-white shadow-sm'
                    : errors.agreeTerms
                    ? 'border-2 border-rose-400 bg-rose-50/50'
                    : 'border border-gray-300 bg-white group-hover:border-gray-400'
                }`}
              >
                {agreeTerms && <Check size={14} strokeWidth={3} />}
              </div>
            </div>
            <span className="text-xs text-[#86868B] leading-relaxed">
              Li e concordo com os{' '}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTermsModal('terms');
                }}
                className="text-[#7A1C1D] font-semibold underline underline-offset-2 hover:opacity-80"
              >
                Termos de Uso
              </button>{' '}
              e a{' '}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTermsModal('privacy');
                }}
                className="text-[#7A1C1D] font-semibold underline underline-offset-2 hover:opacity-80"
              >
                Política de Privacidade
              </button>
              .
            </span>
          </label>
          {errors.agreeTerms && (
            <p className="text-xs text-rose-500 font-medium ml-8 mt-1">
              {errors.agreeTerms}
            </p>
          )}
        </div>

        {/* Botão Criar Minha Conta */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading || isSuccess}
            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-sm ${
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
                <span>Conta criada com sucesso!</span>
              </motion.div>
            ) : isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                <span>Criando minha conta...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>Criar minha conta</span>
                <ArrowRight size={16} />
              </div>
            )}
          </button>
        </div>

        {/* Alternância para Já tenho uma conta. Entrar */}
        <div className="text-center pt-2 border-t border-gray-100">
          <p className="text-xs text-[#86868B]">
            Já tem uma conta no BORA?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="font-bold text-[#7A1C1D] hover:underline focus:outline-none transition-colors"
            >
              Entrar
            </button>
          </p>
        </div>
      </form>

      {/* Modal informativa de Termos ou Privacidade */}
      <AnimatePresence>
        {showTermsModal && (
          <div key="terms-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <motion.div
              key="terms-modal-content"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 apple-shadow border border-gray-100 space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={20} className="text-[#7A1C1D]" />
                  <h3 className="font-bold text-[#1A1A1A] text-base">
                    {showTermsModal === 'terms' ? 'Termos de Uso BORA' : 'Política de Privacidade BORA'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="text-xs text-[#86868B] space-y-3 leading-relaxed max-h-60 overflow-y-auto pr-2">
                {showTermsModal === 'terms' ? (
                  <>
                    <p>
                      Bem-vindo ao <strong>BORA</strong>. Ao utilizar nossa plataforma de gestão inteligente, você concorda com nossos termos de prestação de serviços voltados a revendedores autônomos.
                    </p>
                    <p>
                      <strong>1. Finalidade:</strong> O BORA fornece ferramentas para registro de vendas, gestão de contatos de clientes, cálculo de comissões e lembretes amigáveis de cobrança.
                    </p>
                    <p>
                      <strong>2. Responsabilidade pelos dados:</strong> O usuário é o único responsável pela precisão e veracidade dos dados de vendas e contatos cadastrados.
                    </p>
                    <p>
                      <strong>3. Segurança e Acesso:</strong> Suas credenciais são de uso pessoal e intransferível.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      Sua privacidade e a proteção de seus contatos e clientes são prioridades fundamentais para o <strong>BORA</strong>.
                    </p>
                    <p>
                      <strong>1. Tratamento de Dados:</strong> Coletamos apenas as informações estritamente necessárias para a prestação dos serviços (nome, e-mail e telefone de cadastro).
                    </p>
                    <p>
                      <strong>2. Não Compartilhamento:</strong> Seus dados de vendas e dados de clientes nunca serão vendidos ou compartilhados com terceiros para fins de marketing.
                    </p>
                    <p>
                      <strong>3. Criptografia:</strong> As transmissões são protegidas com padrões modernos de criptografia para garantir a integridade das suas informações.
                    </p>
                  </>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAgreeTerms(true);
                    setErrors((prev) => ({ ...prev, agreeTerms: undefined }));
                    setShowTermsModal(null);
                  }}
                  className="w-full py-3 bg-[#7A1C1D] hover:bg-[#6E2E49] text-white font-bold rounded-xl text-xs transition-colors"
                >
                  Concordar e Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
