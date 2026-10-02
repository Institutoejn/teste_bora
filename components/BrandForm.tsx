
import React, { useState, useEffect } from 'react';
import { X, Check, Hash, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { Brand } from '../types';
import { PREDEFINED_BRANDS, findPredefinedBrand, PredefinedBrand, BrandLogoIcon } from '../constants/brandCatalog';

interface BrandFormProps {
  initialData?: Brand | null;
  title?: string;
  onClose: () => void;
  onSubmit: (brandData: { name: string; commission: number; color: string }) => void;
}

export const BrandForm: React.FC<BrandFormProps> = ({ 
  initialData, 
  title, 
  onClose, 
  onSubmit 
}) => {
  const [selectedBrand, setSelectedBrand] = useState<PredefinedBrand | null>(() => {
    if (initialData?.name) {
      return findPredefinedBrand(initialData.name) || {
        name: initialData.name,
        defaultCommission: initialData.commission || 0.3,
        color: initialData.color || '#7A1C1D',
      };
    }
    return null;
  });

  const [commission, setCommission] = useState(
    initialData ? String(Math.round(initialData.commission * 100)) : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      const found = findPredefinedBrand(initialData.name);
      setSelectedBrand(found || {
        name: initialData.name,
        defaultCommission: initialData.commission || 0.3,
        color: initialData.color || '#7A1C1D',
      });
      setCommission(String(Math.round(initialData.commission * 100)));
    }
  }, [initialData]);

  const handleSelectBrand = (brand: PredefinedBrand) => {
    setSelectedBrand(brand);
    // Se a comissão ainda estiver em branco, preenche automaticamente com a sugerida
    if (!commission || commission === '0') {
      setCommission(String(Math.round(brand.defaultCommission * 100)));
    }
  };

  const parsedCommission = parseFloat(commission);
  const isCommissionValid = !isNaN(parsedCommission) && parsedCommission > 0 && parsedCommission <= 100;
  const isValid = Boolean(selectedBrand) && isCommissionValid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting || !selectedBrand) return;

    setIsSubmitting(true);

    const chosenColor = initialData?.color || selectedBrand.color;

    onSubmit({
      name: selectedBrand.name,
      commission: parsedCommission / 100, // Converte 30 para 0.30
      color: chosenColor,
    });
  };

  const formTitle = title || (initialData ? 'Editar Marca' : 'Nova Marca');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/25 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-md my-auto"
      >
        <GlassCard className="p-6 sm:p-8 bg-white/95 rounded-[32px] border-white/60 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">{formTitle}</h2>
              <p className="text-xs text-[#86868B] mt-0.5">
                {initialData ? 'Altere a marca ou comissão' : 'Escolha a marca que você revende'}
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-90 text-[#86868B]"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Seletor Visual de Marcas Pré-definidas */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#86868B] uppercase tracking-[0.1em] ml-1">
                Selecione a Marca
              </label>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 max-h-[260px] overflow-y-auto p-0.5">
                {PREDEFINED_BRANDS.map((b) => {
                  const isSelected = selectedBrand?.name === b.name;
                  return (
                    <button
                      type="button"
                      key={b.name}
                      onClick={() => handleSelectBrand(b)}
                      className={`p-3 rounded-2xl border text-left transition-all duration-200 flex items-center gap-3 relative group active:scale-[0.98] ${
                        isSelected
                          ? 'border-[#7A1C1D] bg-[#F8E7E9]/70 ring-2 ring-[#7A1C1D]/25 shadow-sm'
                          : 'border-gray-200/80 bg-white/80 hover:border-gray-300 hover:bg-gray-50/80'
                      }`}
                    >
                      {/* Logo Real da Marca */}
                      <div className="w-12 h-11 rounded-xl bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm p-1 transition-transform group-hover:scale-105 overflow-hidden">
                        <BrandLogoIcon
                          name={b.name}
                          className="w-full h-full object-contain select-none pointer-events-none"
                        />
                      </div>

                      {/* Informações da marca */}
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-[#1A1A1A] truncate leading-tight">
                          {b.name}
                        </div>
                        <div className="text-[10px] text-[#86868B] font-medium mt-0.5">
                          {Math.round(b.defaultCommission * 100)}% comissão
                        </div>
                      </div>

                      {/* Indicador de Seleção Ativa */}
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#7A1C1D] text-white flex items-center justify-center flex-shrink-0 shadow-sm animate-in zoom-in-50 duration-150">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {!selectedBrand && (
                <p className="text-[11px] text-[#7A1C1D] font-medium mt-1 ml-1">
                  Selecione uma marca acima para continuar.
                </p>
              )}
            </div>

            {/* Campo Numérico de Comissão */}
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-black text-[#86868B] uppercase tracking-[0.1em]">
                  Comissão (%)
                </label>
                {selectedBrand && (
                  <span className="text-[10px] text-[#86868B]">
                    Sugerida: {Math.round(selectedBrand.defaultCommission * 100)}%
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Hash size={18} />
                </div>
                <input 
                  type="number" 
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  placeholder="30"
                  className="w-full bg-[#F5F5F7] border-none rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-[#7A1C1D] transition-all outline-none text-[#1D1D1F] font-medium"
                  required
                  min="1"
                  max="100"
                />
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit"
                disabled={!isValid || isSubmitting}
                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  isValid && !isSubmitting
                    ? 'bg-[#7A1C1D] text-white shadow-lg shadow-[#7A1C1D]/20 hover:bg-[#6E2E49]' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Check size={20} /> {initialData ? 'Salvar Alterações' : 'Salvar Marca'}
              </button>
            </div>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );
};

