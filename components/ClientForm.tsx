
import React, { useState, useEffect } from 'react';
import { X, Check, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from './GlassCard';

interface ClientFormProps {
  onClose: () => void;
  onSubmit: (clientData: { name: string; phone: string }) => void;
  initialData?: { id?: string; name: string; phone: string } | null;
  title?: string;
}

export const ClientForm: React.FC<ClientFormProps> = ({ 
  onClose, 
  onSubmit, 
  initialData, 
  title 
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [phone, setPhone] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/^(\d{2})(\d)/g, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
    return value;
  };

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setPhone(formatWhatsApp(initialData.phone));
    } else {
      setName('');
      setPhone('');
    }
  }, [initialData]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value);
    if (formatted.length <= 15) {
      setPhone(formatted);
    }
  };

  const isValid = name.trim().length >= 3 && phone.replace(/\D/g, '').length >= 10;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSuccess) return;

    setIsSuccess(true);
    // Micro-delay to show success animation before closing
    setTimeout(() => {
      onSubmit({ 
        name, 
        phone: phone.replace(/\D/g, '') // Save only numbers
      });
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-md"
      >
        <GlassCard className="p-8 bg-white/90 rounded-[32px] border-white/60">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">
              {title || (initialData ? 'Editar Cliente' : 'Novo Cliente')}
            </h2>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-90"
            >
              <X size={20} className="text-[#86868B]" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#86868B] uppercase tracking-[0.1em] ml-1">
                Nome Completo
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <User size={18} />
                </div>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Maria Oliveira"
                  className="w-full bg-[#F5F5F7] border-none rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-[#7A1C1D] transition-all outline-none text-[#1D1D1F] font-medium placeholder:text-gray-300"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#86868B] uppercase tracking-[0.1em] ml-1">
                WhatsApp
              </label>
              <input 
                type="text" 
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(00) 00000-0000"
                className="w-full bg-[#F5F5F7] border-none rounded-2xl py-4 px-4 text-sm focus:ring-2 focus:ring-[#7A1C1D] transition-all outline-none text-[#1D1D1F] font-medium placeholder:text-gray-300"
                required
              />
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                disabled={!isValid || isSuccess}
                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  isSuccess 
                    ? 'bg-green-500 text-white' 
                    : isValid 
                      ? 'bg-[#7A1C1D] text-white shadow-lg shadow-[#7A1C1D]/20 hover:bg-[#6E2E49]' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isSuccess ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <Check size={24} />
                  </motion.div>
                ) : initialData ? (
                  'Salvar Alterações'
                ) : (
                  'Salvar Cliente'
                )}
              </button>
            </div>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );
};
