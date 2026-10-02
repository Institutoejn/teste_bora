import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Check, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from '../GlassCard';
import { useAuth } from './AuthContext';

interface ResetPasswordModalProps {
  onSuccess: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ onSuccess }) => {
  const { updatePassword, setIsPasswordRecovery } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem. Verifique e tente novamente.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await updatePassword(newPassword);

      if (!result.success) {
        setErrorMessage(result.error || 'Não foi possível redefinir sua senha. Tente novamente.');
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      if (typeof window !== 'undefined' && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }

      setTimeout(() => {
        setIsPasswordRecovery(false);
        onSuccess();
      }, 1800);
    } catch {
      setErrorMessage('Erro ao redefinir a senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <GlassCard className="p-6 sm:p-8 bg-white/95 rounded-[32px] border border-[#F2D7D9] shadow-2xl space-y-5">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#F8E7E9] text-[#7A1C1D] flex items-center justify-center mx-auto shadow-sm">
              <KeyRound size={24} />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#1D1D1F]">
              Redefinir sua senha
            </h2>
            <p className="text-xs text-[#86868B] max-w-sm mx-auto leading-relaxed">
              Crie uma nova senha de acesso para sua conta Bora.
            </p>
          </div>

          {isSuccess ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <Check size={28} />
              </div>
              <h3 className="font-bold text-base text-[#1D1D1F]">Senha atualizada com sucesso!</h3>
              <p className="text-xs text-[#86868B]">
                Entrando na plataforma com sua nova senha...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Nova Senha */}
              <div className="space-y-1.5">
                <label 
                  htmlFor="reset-new-password"
                  className="text-[10px] font-black text-[#86868B] uppercase tracking-[0.1em] ml-1 block"
                >
                  Nova Senha
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <Lock size={18} />
                  </div>
                  <input
                    id="reset-new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Mínimo 6 caracteres"
                    disabled={isLoading}
                    className="w-full bg-[#F8E7E9]/40 rounded-2xl py-3.5 pl-12 pr-12 text-sm outline-none text-[#1A1A1A] font-medium placeholder:text-gray-400 border border-transparent focus:ring-2 focus:ring-[#7A1C1D] focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirmar Senha */}
              <div className="space-y-1.5">
                <label 
                  htmlFor="reset-confirm-password"
                  className="text-[10px] font-black text-[#86868B] uppercase tracking-[0.1em] ml-1 block"
                >
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <Lock size={18} />
                  </div>
                  <input
                    id="reset-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Repita a nova senha"
                    disabled={isLoading}
                    className="w-full bg-[#F8E7E9]/40 rounded-2xl py-3.5 pl-12 pr-12 text-sm outline-none text-[#1A1A1A] font-medium placeholder:text-gray-400 border border-transparent focus:ring-2 focus:ring-[#7A1C1D] focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !newPassword || !confirmPassword}
                className="w-full py-4 px-6 rounded-2xl bg-[#7A1C1D] hover:bg-[#6E2E49] active:scale-[0.98] text-white font-bold text-xs shadow-lg shadow-[#7A1C1D]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Salvando nova senha...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Redefinir e Entrar</span>
                  </>
                )}
              </button>
            </form>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
};
