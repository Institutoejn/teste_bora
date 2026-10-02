import React, { useState, useMemo } from 'react';
import { 
  Tag, 
  Search, 
  X, 
  Plus, 
  ChevronRight, 
  TrendingUp, 
  Wallet, 
  ShoppingBag,
  ChevronLeft
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { EmptyState } from './EmptyState';
import { Brand, Sale, Client } from '../types';
import { brandService } from '../services/brandService';
import { BrandLogoIcon } from '../constants/brandCatalog';

interface BrandsViewProps {
  brands: Brand[];
  sales: Sale[];
  clients: Client[];
  onOpenNewBrandForm: () => void;
  onSelectBrand: (brand: Brand) => void;
  onBackToSettings?: () => void;
  isBrandsIntroActive?: boolean;
}

export const BrandsView: React.FC<BrandsViewProps> = ({
  brands,
  sales,
  clients,
  onOpenNewBrandForm,
  onSelectBrand,
  onBackToSettings,
  isBrandsIntroActive = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filtragem de marcas por nome via brandService
  const filteredBrands = useMemo(() => {
    return brandService.searchBrands(brands, searchQuery);
  }, [brands, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Botão de Retorno para Ajustes se aplicável */}
      {onBackToSettings && (
        <button
          onClick={onBackToSettings}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7A1C1D] hover:text-[#6E2E49] px-1 py-1 rounded-lg transition-colors active:scale-95"
        >
          <ChevronLeft size={16} />
          <span>Voltar para Ajustes</span>
        </button>
      )}

      {/* Cabeçalho do Módulo de Marcas */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-1 px-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1A1A1A]">
            Marcas
          </h1>
          <p className="text-[#86868B] font-medium text-sm mt-1">
            Organize suas marcas e acompanhe o resultado das suas vendas.
          </p>
        </div>

        <button
          onClick={onOpenNewBrandForm}
          className={`bg-[#7A1C1D] text-white px-5 py-3 rounded-full font-bold text-sm shadow-lg shadow-[#7A1C1D]/20 hover:bg-[#6E2E49] active:scale-95 transition-all flex items-center justify-center gap-2 self-start sm:self-auto ${
            isBrandsIntroActive ? 'ring-4 ring-[#C87A8A]/50 animate-pulse' : ''
          }`}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Nova marca</span>
        </button>
      </header>

      {/* Barra de Busca de Marcas (se existirem marcas cadastradas) */}
      {brands.length > 0 && (
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome da marca..."
            className="w-full bg-[#F8E7E9]/40 border-none rounded-2xl py-3.5 pl-11 pr-10 text-sm focus:ring-2 focus:ring-[#7A1C1D] transition-all outline-none text-[#1A1A1A] font-medium placeholder:text-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200/50 transition-colors"
              title="Limpar busca"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Lista de Marcas ou Estados Vazios */}
      {brands.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="Nenhuma marca cadastrada"
          description="Cadastre as marcas que você revende para acompanhar suas vendas e lucros."
          actionLabel="Cadastrar Marca"
          onAction={onOpenNewBrandForm}
        />
      ) : filteredBrands.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
            <Search size={22} />
          </div>
          <p className="text-sm font-semibold text-[#1A1A1A]">
            Nenhuma marca encontrada para "{searchQuery}"
          </p>
          <p className="text-xs text-[#86868B]">
            Verifique a ortografia ou limpe o campo de busca.
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs font-bold text-[#7A1C1D] hover:underline"
          >
            Limpar busca
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredBrands.map((brand) => {
            const metrics = brandService.getBrandMetrics(brand, sales);
            const formattedCommission = brandService.formatCommission(brand.commission);

            return (
              <GlassCard
                key={brand.id}
                onClick={() => onSelectBrand(brand)}
                className="p-5 flex items-center justify-between hover:bg-white/60 active:scale-[0.99] transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center bg-white shadow-sm border border-gray-100 p-1.5 overflow-hidden"
                  >
                    <BrandLogoIcon name={brand.name} className="w-full h-full object-contain" fallbackClassName="text-xl font-black text-[#7A1C1D]" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-[#1A1A1A] truncate group-hover:text-[#7A1C1D] transition-colors">
                        {brand.name}
                      </h3>
                      <span className="bg-white px-2.5 py-0.5 rounded-full font-bold text-xs text-[#1A1A1A] border border-gray-100 shadow-sm flex-shrink-0">
                        {formattedCommission}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 text-xs text-[#86868B] font-medium mt-1">
                      <span className="flex items-center gap-1">
                        <ShoppingBag size={12} className="text-gray-400" />
                        <span>
                          {metrics.salesCount} {metrics.salesCount === 1 ? 'venda' : 'vendas'}
                        </span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-[#1A1A1A] font-semibold">
                        <TrendingUp size={12} className="text-[#7A1C1D]" />
                        <span>R$ {metrics.totalSold.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pl-2 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <span className="text-xs text-[#86868B] font-semibold block">Lucro Total</span>
                    <span className="text-sm font-bold text-emerald-600">
                      R$ {metrics.totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#F8E7E9] group-hover:text-[#7A1C1D] transition-colors">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
