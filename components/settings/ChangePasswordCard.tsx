import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Check, AlertCircle, Loader2, KeyRound, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../GlassCard';
import { useAuth } from '../auth/AuthContext';

interface ChangePasswordCardProps {
  onSuccessToast?: (msg: string) => void;
}

export const ChangePasswordCard: React.FC<ChangePasswordCardProps> = ({ onSuccessToast }) => {
  const { updatePassword, user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleResetForm = () => {
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage(null);
    setSuccessMessage(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleToggle = () => {
    if (isOpen) {
      handleResetForm();
      setIsOpen(false);
    } else {
      handleResetForm();
      setIsOpen(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

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
        setErrorMessage(result.error || 'Não foi possível atualizar a senha. Tente novamente.');
        setIsLoading(false);
        return;
      }

      setSuccessMessage('Sua senha foi alterada com sucesso!');
      if (onSuccessToast) {
        onSuccessToast('Senha atualizada com sucesso!');
      }

      // Limpa os campos após 2 segundos e fecha
      setTimeout(() => {
        handleResetForm();
        setIsOpen(false);
      }, 2200);
    } catch {
      setErrorMessage('Erro de conexão ao alterar a senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GlassCard className="p-6 space-y-4">
      {/* Cabeçalho do Card */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#F8E7E9] text-[#7A1C1D] flex items-center justify-center">
            <KeyRound size={16} />
          </div>
          <div>
            <h3 className="font-bold text-[#1A1A1A] text-sm sm:text-base">Segurança & Senha</h3>
            <p className="text-[11px] text-[#86868B]">Altere sua senha de acesso a qualquer momento</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggle}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7A1C1D] hover:text-[#6E2E49] px-3.5 py-1.5 rounded-full hover:bg-[#F8E7E9] transition-all cursor-pointer active:scale-95"
        >
          <span>{isOpen ? 'Fechar' : 'Trocar senha'}</span>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Descrição informativa */}
      {!isOpen && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#86868B]">
          <p className="leading-relaxed">
            Mantenha sua conta Bora segura. Recomendamos utilizar senhas fortes com números e caracteres especiais.
          </p>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="self-start sm:self-center px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-[#1A1A1A] font-bold text-xs rounded-2xl transition-all active:scale-[0.98] shrink-0 cursor-pointer"
          >
            Alterar senha
          </button>
        </div>
      )}

      {/* Formulário Expansível */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              {/* Mensagem de Erro */}
              {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Mensagem de Sucesso */}
              {successMessage && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2">
                  <Check size={16} className="shrink-0 text-emerald-600" />
                  <span>{successMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Campo Nova Senha */}
                <div className="space-y-1">
                  <label 
                    htmlFor="settings-new-password"
                    className="text-[10px] font-black text-[#86868B] uppercase tracking-[0.1em] ml-1 block"
                  >
                    Nova Senha
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      <Lock size={16} />
                    </div>
                    <input
                      id="settings-new-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="Mínimo 6 caracteres"
                      disabled={isLoading}
                      className="w-full bg-[#F8E7E9]/40 rounded-2xl py-3 pl-10 pr-10 text-xs outline-none text-[#1A1A1A] font-medium placeholder:text-gray-400 border border-transparent focus:ring-2 focus:ring-[#7A1C1D] focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Campo Confirmar Nova Senha */}
                <div className="space-y-1">
                  <label 
                    htmlFor="settings-confirm-password"
                    className="text-[10px] font-black text-[#86868B] uppercase tracking-[0.1em] ml-1 block"
                  >
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      <Lock size={16} />
                    </div>
                    <input
                      id="settings-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="Repita a nova senha"
                      disabled={isLoading}
                      className="w-full bg-[#F8E7E9]/40 rounded-2xl py-3 pl-10 pr-10 text-xs outline-none text-[#1A1A1A] font-medium placeholder:text-gray-400 border border-transparent focus:ring-2 focus:ring-[#7A1C1D] focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleToggle}
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isLoading || !newPassword || !confirmPassword}
                  className="py-2.5 px-5 rounded-2xl bg-[#7A1C1D] hover:bg-[#6E2E49] active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-[#7A1C1D]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Atualizando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Salvar nova senha</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
};
