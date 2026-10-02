import React, { useState, useRef } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  Camera, 
  Trash2, 
  Lock, 
  Check, 
  AlertCircle,
  UploadCloud
} from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { UserProfile } from '../types';
import { profileService } from '../services/profileService';

interface EditProfileModalProps {
  user: UserProfile;
  onClose: () => void;
  onSave: (updatedData: {
    name: string;
    phone: string;
    avatarUrl: string | null;
    avatarFile?: File | null;
    isPhotoRemoved?: boolean;
  }) => Promise<void> | void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  user,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(profileService.formatPhone(user.phone || ''));
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(user.avatarUrl || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPhotoRemoved, setIsPhotoRemoved] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formatação em tempo real do número de celular no padrão brasileiro
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = profileService.formatPhone(rawValue);
    if (formatted.length <= 15) {
      setPhone(formatted);
    }
  };

  // Tratamento da seleção de imagem pelo navegador
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação de tipo de arquivo e tamanho (máx 5MB, JPG/PNG/WEBP)
    const validation = profileService.validateImageFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Arquivo de imagem inválido.');
      // Reseta o input para permitir nova tentativa
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setSelectedFile(file);
    setIsPhotoRemoved(false);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewAvatar(reader.result);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Não foi possível ler a foto selecionada. Tente outra imagem.');
    };
    reader.readAsDataURL(file);
  };

  // Remoção da foto de perfil (reverte para iniciais)
  const handleRemovePhoto = () => {
    setPreviewAvatar(null);
    setSelectedFile(null);
    setIsPhotoRemoved(true);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Disparo do seletor nativo de arquivos
  const handleTriggerFileInput = () => {
    setErrorMessage(null);
    fileInputRef.current?.click();
  };

  // Submissão com validações amigáveis
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setErrorMessage('Por favor, informe seu nome com pelo menos 2 caracteres.');
      return;
    }

    setIsSaving(true);

    try {
      await onSave({
        name: trimmedName,
        phone: phone.replace(/\D/g, ''),
        avatarUrl: previewAvatar,
        avatarFile: selectedFile,
        isPhotoRemoved: isPhotoRemoved,
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao atualizar perfil. Tente novamente.');
      setIsSaving(false);
    }
  };

  // Iniciais dinâmicas para o preview com base no nome digitado
  const dynamicInitials = profileService.getUserInitials(name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/30 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-lg my-auto"
      >
        <GlassCard className="p-6 sm:p-8 bg-white/95 rounded-[32px] border-white/60 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
          {/* Cabeçalho do Modal */}
          <div className="flex items-center justify-between pb-5 border-b border-gray-100/80">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">
                Editar perfil
              </h2>
              <p className="text-xs text-[#86868B] font-medium mt-0.5">
                Atualize suas informações visíveis no Bora.
              </p>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors active:scale-90"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>

          {/* Conteúdo com scroll */}
          <form onSubmit={handleSubmit} className="overflow-y-auto py-5 space-y-6 pr-1">
            {/* Mensagem de Erro Contextual */}
            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-center gap-2.5 text-xs text-rose-700 font-medium"
              >
                <AlertCircle size={16} className="shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            {/* Seção da Foto de Perfil */}
            <div className="bg-[#F5F5F7]/80 p-5 rounded-2xl border border-gray-100 space-y-4">
              <label className="text-[10px] font-black text-[#86868B] uppercase tracking-[0.1em] block">
                Foto de Perfil
              </label>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
                id="profile-photo-file-input"
              />

              <div className="flex flex-col sm:flex-row items-center gap-5">
                {/* Visualizador do Avatar com Preview Imediato */}
                <div className="relative group shrink-0">
                  <div className="w-24 h-24 rounded-full border-4 border-white apple-shadow overflow-hidden flex items-center justify-center bg-gradient-to-tr from-[#7A1C1D] to-[#6E2E49] transition-all">
                    {previewAvatar ? (
                      <img 
                        src={previewAvatar} 
                        alt="Preview do perfil" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-3xl font-bold tracking-tighter">
                        {dynamicInitials}
                      </span>
                    )}
                  </div>

                  {/* Indicador de Ação Rápida */}
                  <button
                    type="button"
                    onClick={handleTriggerFileInput}
                    className="absolute -bottom-1 -right-1 bg-white p-2 rounded-full apple-shadow border border-gray-100 text-[#7A1C1D] hover:bg-gray-50 active:scale-95 transition-all"
                    title={previewAvatar ? 'Alterar foto' : 'Adicionar foto'}
                  >
                    <Camera size={14} />
                  </button>
                </div>

                {/* Controles da Foto */}
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <button
                      type="button"
                      onClick={handleTriggerFileInput}
                      className="px-4 py-2 bg-white text-[#7A1C1D] border border-gray-200/80 hover:bg-gray-50 text-xs font-bold rounded-xl transition-all active:scale-95 shadow-sm flex items-center gap-1.5"
                    >
                      <UploadCloud size={14} />
                      <span>{previewAvatar ? 'Alterar foto' : 'Adicionar foto'}</span>
                    </button>

                    {previewAvatar && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="px-3.5 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200/60 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        <Trash2 size={14} />
                        <span>Remover foto</span>
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-[#86868B] leading-normal">
                    Formatos aceitos: JPG, PNG ou WEBP (máx. 5 MB).
                    {!previewAvatar && ' Quando não houver foto, suas iniciais serão exibidas.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Campo: Nome */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#86868B] uppercase tracking-[0.1em] ml-1">
                Nome
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome ou nome da sua loja"
                  className="w-full bg-[#F5F5F7] border-none rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-[#7A1C1D] transition-all outline-none text-[#1D1D1F] font-medium placeholder:text-gray-400"
                  required
                />
              </div>
            </div>

            {/* Campo: Celular */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#86868B] uppercase tracking-[0.1em] ml-1">
                Celular
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Phone size={18} />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="(11) 98765-4321"
                  className="w-full bg-[#F5F5F7] border-none rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-[#7A1C1D] transition-all outline-none text-[#1D1D1F] font-medium placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Campo: E-mail (Identidade da Conta - Somente Leitura) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-black text-[#86868B] uppercase tracking-[0.1em]">
                  E-mail
                </label>
                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                  <Lock size={10} />
                  <span>Identidade da conta</span>
                </span>
              </div>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  readOnly
                  className="w-full bg-[#F5F5F7]/60 border border-gray-200/60 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-500 font-medium cursor-not-allowed select-none"
                />
              </div>
              <p className="text-[11px] text-[#86868B] ml-1">
                O e-mail está vinculado à autenticação da sua conta e não pode ser alterado por aqui.
              </p>
            </div>

            {/* Ações do Rodapé */}
            <div className="pt-4 border-t border-gray-100/80 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onClose}
                className="py-3.5 px-5 bg-gray-100 text-[#1D1D1F] hover:bg-gray-200 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] order-2 sm:order-1"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-[#7A1C1D] text-white py-3.5 px-5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#6E2E49] transition-all active:scale-[0.98] shadow-md shadow-[#7A1C1D]/20 order-1 sm:order-2 disabled:opacity-50"
              >
                <Check size={18} />
                <span>{isSaving ? 'Salvando...' : 'Salvar alterações'}</span>
              </button>
            </div>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );
};
