
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { 
  TrendingUp, 
  Wallet, 
  Clock, 
  Plus, 
  ChevronRight,
  ArrowUpRight,
  Filter,
  Calendar,
  ChevronDown,
  ChevronLeft,
  X,
  RotateCcw,
  Check
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { GlassCard } from './GlassCard';
import { Sale, Client, Brand } from '../types';

interface DashboardProps {
  sales: Sale[];
  clients: Client[];
  brands: Brand[];
  onQuickSale: () => void;
  onRemind: (sale: Sale) => void;
  userName?: string;
  isIntroActive?: boolean;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const SHORT_MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

type FilterType = 'preset' | 'month';
type PresetPeriod = '3M' | '6M' | '12M' | 'year' | '30D';

const parseSaleDate = (sale: Sale): { year: number; month: number; day: number } | null => {
  const rawDate = sale.createdAt || sale.dueDate;
  if (!rawDate) return null;
  const datePart = rawDate.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length < 2) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0 a 11
  const day = parts.length >= 3 ? parseInt(parts[2], 10) : 1;
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
};

export const Dashboard: React.FC<DashboardProps> = ({ 
  sales, 
  clients, 
  brands, 
  onQuickSale, 
  onRemind, 
  userName,
  isIntroActive,
}) => {
  // Cálculo do Lucro Total acumulado (Soma de todos os lucros registrados)
  const totalProfit = sales.reduce((acc, sale) => acc + sale.profit, 0);
  
  // Cálculo do Total Pendente (O que o usuário ainda tem a receber dos clientes)
  const totalToReceive = sales
    .filter(s => s.status === 'pending')
    .reduce((acc, s) => acc + s.amount, 0);
    
  // Identificação de vencimentos para o dia atual
  const today = new Date().toISOString().split('T')[0];
  const dueToday = sales.filter(s => s.status === 'pending' && s.dueDate === today).length;

  // Estados de Filtro do Gráfico
  const [filterMode, setFilterMode] = useState<FilterType>('preset');
  const [presetPeriod, setPresetPeriod] = useState<PresetPeriod>('6M');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Fecha o popover de filtro ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterOpen]);

  // Identifica meses que têm movimentação real de vendas no ano selecionado
  const monthsWithSalesInSelectedYear = useMemo(() => {
    const set = new Set<number>();
    sales.forEach(sale => {
      const parsed = parseSaleDate(sale);
      if (parsed && parsed.year === selectedYear) {
        set.add(parsed.month);
      }
    });
    return set;
  }, [sales, selectedYear]);

  // Cálculo dinâmico dos dados do gráfico com base no filtro selecionado
  const chartData = useMemo(() => {
    if (filterMode === 'month') {
      // Detalhamento diário do mês selecionado
      const daysCount = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const daysList: {
        name: string;
        day: number;
        tooltipLabel: string;
        total: number;
      }[] = [];

      for (let d = 1; d <= daysCount; d++) {
        daysList.push({
          name: `${d < 10 ? '0' : ''}${d}`,
          day: d,
          tooltipLabel: `Dia ${d < 10 ? '0' : ''}${d} de ${MONTH_NAMES[selectedMonth]}`,
          total: 0,
        });
      }

      sales.forEach(sale => {
        const parsed = parseSaleDate(sale);
        if (!parsed) return;
        if (parsed.year === selectedYear && parsed.month === selectedMonth) {
          const target = daysList.find(item => item.day === parsed.day);
          if (target) {
            target.total += Number(sale.amount) || 0;
          }
        }
      });

      return daysList.map(item => ({
        name: item.name,
        tooltipLabel: item.tooltipLabel,
        total: Math.round(item.total * 100) / 100,
      }));
    }

    // Modo Predefinições
    const now = new Date();

    if (presetPeriod === '30D') {
      const daysList: {
        name: string;
        tooltipLabel: string;
        year: number;
        month: number;
        day: number;
        total: number;
      }[] = [];

      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const y = d.getFullYear();
        const m = d.getMonth();
        const day = d.getDate();
        daysList.push({
          name: `${day < 10 ? '0' : ''}${day}/${(m + 1) < 10 ? '0' : ''}${m + 1}`,
          tooltipLabel: `${day < 10 ? '0' : ''}${day} de ${SHORT_MONTH_NAMES[m]}`,
          year: y,
          month: m,
          day: day,
          total: 0,
        });
      }

      sales.forEach(sale => {
        const parsed = parseSaleDate(sale);
        if (!parsed) return;
        const target = daysList.find(item => item.year === parsed.year && item.month === parsed.month && item.day === parsed.day);
        if (target) {
          target.total += Number(sale.amount) || 0;
        }
      });

      return daysList.map(item => ({
        name: item.name,
        tooltipLabel: item.tooltipLabel,
        total: Math.round(item.total * 100) / 100,
      }));
    }

    if (presetPeriod === 'year') {
      // 12 meses do ano selecionado
      const monthsList = SHORT_MONTH_NAMES.map((mName, idx) => ({
        name: mName,
        tooltipLabel: `${MONTH_NAMES[idx]} de ${selectedYear}`,
        year: selectedYear,
        month: idx,
        total: 0,
      }));

      sales.forEach(sale => {
        const parsed = parseSaleDate(sale);
        if (!parsed) return;
        if (parsed.year === selectedYear) {
          monthsList[parsed.month].total += Number(sale.amount) || 0;
        }
      });

      return monthsList.map(item => ({
        name: item.name,
        tooltipLabel: item.tooltipLabel,
        total: Math.round(item.total * 100) / 100,
      }));
    }

    // 3M, 6M ou 12M
    const monthsCount = presetPeriod === '3M' ? 3 : presetPeriod === '12M' ? 12 : 6;
    const monthsList: {
      name: string;
      tooltipLabel: string;
      year: number;
      month: number;
      total: number;
    }[] = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthsList.push({
        name: SHORT_MONTH_NAMES[d.getMonth()],
        tooltipLabel: `${MONTH_NAMES[d.getMonth()]} de ${d.getFullYear()}`,
        year: d.getFullYear(),
        month: d.getMonth(),
        total: 0,
      });
    }

    sales.forEach(sale => {
      const parsed = parseSaleDate(sale);
      if (!parsed) return;
      const target = monthsList.find(m => m.year === parsed.year && m.month === parsed.month);
      if (target) {
        target.total += Number(sale.amount) || 0;
      }
    });

    return monthsList.map(item => ({
      name: item.name,
      tooltipLabel: item.tooltipLabel,
      total: Math.round(item.total * 100) / 100,
    }));
  }, [sales, filterMode, presetPeriod, selectedMonth, selectedYear]);

  const totalSalesInPeriod = useMemo(() => {
    return chartData.reduce((acc, item) => acc + item.total, 0);
  }, [chartData]);

  const isFiltered = filterMode === 'month' || (filterMode === 'preset' && presetPeriod !== '6M');

  const filterButtonLabel = useMemo(() => {
    if (filterMode === 'month') {
      return `${SHORT_MONTH_NAMES[selectedMonth]} / ${selectedYear}`;
    }
    switch (presetPeriod) {
      case '3M':
        return 'Últimos 3 meses';
      case '12M':
        return 'Últimos 12 meses';
      case 'year':
        return `Ano ${selectedYear}`;
      case '30D':
        return 'Últimos 30 dias';
      case '6M':
      default:
        return 'Filtrar período';
    }
  }, [filterMode, presetPeriod, selectedMonth, selectedYear]);

  const periodDescription = useMemo(() => {
    if (filterMode === 'month') {
      return `Detalhamento diário • ${MONTH_NAMES[selectedMonth]} de ${selectedYear}`;
    }
    switch (presetPeriod) {
      case '3M':
        return 'Resumo dos últimos 3 meses de faturamento';
      case '12M':
        return 'Resumo anual (últimos 12 meses) de faturamento';
      case 'year':
        return `Resumo anual de ${selectedYear} (Janeiro a Dezembro)`;
      case '30D':
        return 'Resumo diário dos últimos 30 dias de faturamento';
      case '6M':
      default:
        return 'Resumo semestral (últimos 6 meses) de faturamento';
    }
  }, [filterMode, presetPeriod, selectedMonth, selectedYear]);

  const xAxisInterval = useMemo(() => {
    if (filterMode === 'month') {
      return 3; // exibe a cada ~4 dias para não poluir visualmente o eixo X
    }
    if (filterMode === 'preset' && presetPeriod === '30D') {
      return 4;
    }
    return 0; // exibe todos os meses
  }, [filterMode, presetPeriod]);

  const handleResetFilter = () => {
    setFilterMode('preset');
    setPresetPeriod('6M');
    setSelectedYear(new Date().getFullYear());
    setSelectedMonth(new Date().getMonth());
    setIsFilterOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex justify-between items-end pb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1A1A1A]">
            Olá, {userName ? userName.split(' ')[0] : 'Revendedor'}
          </h1>
          <p className="text-[#86868B] font-medium">Veja como estão seus negócios hoje.</p>
        </div>
        <button 
          onClick={onQuickSale}
          title="Nova Venda"
          className="bg-[#7A1C1D] text-white p-3 rounded-full shadow-lg shadow-[#7A1C1D]/20 hover:bg-[#6E2E49] transition-colors active:scale-95"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      </header>

      {/* Cards de Métricas Principais */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 transition-all duration-500 rounded-3xl ${
        isIntroActive ? 'p-2 ring-2 ring-[#7A1C1D] bg-[#F8E7E9]/40' : ''
      }`}>
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-emerald-100 p-2 rounded-xl">
              <TrendingUp className="text-emerald-600" size={20} />
            </div>
            <span className="text-sm font-semibold text-[#86868B] uppercase tracking-wider">Lucro do Mês</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight">R$ {totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            {totalProfit > 0 && (
              <span className="text-emerald-600 text-xs font-bold flex items-center">
                <ArrowUpRight size={14} className="mr-0.5" /> 12%
              </span>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-[#F8E7E9] p-2 rounded-xl">
              <Wallet className="text-[#7A1C1D]" size={20} />
            </div>
            <span className="text-sm font-semibold text-[#86868B] uppercase tracking-wider">Total a Receber</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight">R$ {totalToReceive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-orange-100 p-2 rounded-xl">
              <Clock className="text-orange-600" size={20} />
            </div>
            <span className="text-sm font-semibold text-[#86868B] uppercase tracking-wider">Vencimentos de Hoje</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight">{dueToday}</span>
            <span className="text-[#86868B] text-sm ml-1 font-medium">pedidos</span>
          </div>
        </GlassCard>
      </div>

      {/* Gráfico de Evolução com Estética Apple e Filtro Interativo */}
      <GlassCard className="p-6 overflow-visible relative">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold tracking-tight text-[#1A1A1A]">Evolução de Vendas</h3>
              {isFiltered && (
                <span className="bg-[#F8E7E9] text-[#7A1C1D] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Filtro Ativo
                </span>
              )}
            </div>
            <p className="text-sm text-[#86868B]">{periodDescription}</p>
          </div>

          <div className="flex items-center gap-3 justify-between sm:justify-end flex-wrap">
            <div className="text-left sm:text-right order-2 sm:order-1">
              <span className="text-[11px] text-[#86868B] uppercase font-semibold block">
                {filterMode === 'month' ? `Total em ${SHORT_MONTH_NAMES[selectedMonth]}` : 'Total no Período'}
              </span>
              <p className="text-lg font-bold text-[#7A1C1D]">
                R$ {totalSalesInPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Menu / Botão de Filtro */}
            <div className="relative order-1 sm:order-2" ref={filterRef}>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer bg-[#7A1C1D] text-white hover:bg-[#6E2E49] shadow-[#7A1C1D]/20"
                  title="Filtrar dados do gráfico"
                >
                  <Filter size={13} className="text-white" />
                  <span className="text-white">{filterButtonLabel}</span>
                  <ChevronDown size={13} className={`text-white transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
                </button>

                {isFiltered && (
                  <button
                    type="button"
                    onClick={handleResetFilter}
                    title="Restaurar padrão (últimos 6 meses)"
                    className="p-2 text-[#86868B] hover:text-[#7A1C1D] hover:bg-[#F8E7E9] rounded-full transition-colors active:scale-95"
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
              </div>

              {/* Popover Dropdown de Seleção de Filtro */}
              {isFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[92vw] bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-gray-100 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#F8E7E9] text-[#7A1C1D]">
                        <Calendar size={14} />
                      </div>
                      <span className="text-xs font-bold text-[#1A1A1A]">Filtrar Período</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsFilterOpen(false)}
                      className="p-1 hover:bg-gray-100 rounded-full text-[#86868B] hover:text-[#1A1A1A] transition-colors cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* Períodos Rápidos */}
                  <div className="mb-3.5">
                    <span className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-2">
                      Períodos Rápidos
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setFilterMode('preset');
                          setPresetPeriod('3M');
                          setIsFilterOpen(false);
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all text-left flex items-center justify-between cursor-pointer ${
                          filterMode === 'preset' && presetPeriod === '3M'
                            ? 'bg-[#7A1C1D] text-white font-semibold'
                            : 'bg-gray-50 hover:bg-gray-100 text-[#1A1A1A]'
                        }`}
                      >
                        <span>3 Meses</span>
                        {filterMode === 'preset' && presetPeriod === '3M' && <Check size={12} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFilterMode('preset');
                          setPresetPeriod('6M');
                          setIsFilterOpen(false);
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all text-left flex items-center justify-between cursor-pointer ${
                          filterMode === 'preset' && presetPeriod === '6M'
                            ? 'bg-[#7A1C1D] text-white font-semibold'
                            : 'bg-gray-50 hover:bg-gray-100 text-[#1A1A1A]'
                        }`}
                      >
                        <span>6 Meses (Padrão)</span>
                        {filterMode === 'preset' && presetPeriod === '6M' && <Check size={12} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFilterMode('preset');
                          setPresetPeriod('12M');
                          setIsFilterOpen(false);
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all text-left flex items-center justify-between cursor-pointer ${
                          filterMode === 'preset' && presetPeriod === '12M'
                            ? 'bg-[#7A1C1D] text-white font-semibold'
                            : 'bg-gray-50 hover:bg-gray-100 text-[#1A1A1A]'
                        }`}
                      >
                        <span>12 Meses</span>
                        {filterMode === 'preset' && presetPeriod === '12M' && <Check size={12} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFilterMode('preset');
                          setPresetPeriod('year');
                          setIsFilterOpen(false);
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all text-left flex items-center justify-between cursor-pointer ${
                          filterMode === 'preset' && presetPeriod === 'year'
                            ? 'bg-[#7A1C1D] text-white font-semibold'
                            : 'bg-gray-50 hover:bg-gray-100 text-[#1A1A1A]'
                        }`}
                      >
                        <span>Ano {selectedYear}</span>
                        {filterMode === 'preset' && presetPeriod === 'year' && <Check size={12} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFilterMode('preset');
                          setPresetPeriod('30D');
                          setIsFilterOpen(false);
                        }}
                        className={`col-span-2 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all text-left flex items-center justify-between cursor-pointer ${
                          filterMode === 'preset' && presetPeriod === '30D'
                            ? 'bg-[#7A1C1D] text-white font-semibold'
                            : 'bg-gray-50 hover:bg-gray-100 text-[#1A1A1A]'
                        }`}
                      >
                        <span>Últimos 30 Dias (Evolução diária)</span>
                        {filterMode === 'preset' && presetPeriod === '30D' && <Check size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Filtrar por Mês Específico */}
                  <div className="pt-2.5 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider">
                        Mês Específico
                      </span>
                      {/* Seletor de Ano */}
                      <div className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">
                        <button
                          type="button"
                          onClick={() => setSelectedYear(y => y - 1)}
                          className="p-0.5 text-[#86868B] hover:text-[#1A1A1A] cursor-pointer"
                          title="Ano anterior"
                        >
                          <ChevronLeft size={13} />
                        </button>
                        <span className="text-xs font-bold text-[#1A1A1A] px-1">{selectedYear}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedYear(y => y + 1)}
                          className="p-0.5 text-[#86868B] hover:text-[#1A1A1A] cursor-pointer"
                          title="Próximo ano"
                        >
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Grade de 12 Meses */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {SHORT_MONTH_NAMES.map((mName, idx) => {
                        const isSelected = filterMode === 'month' && selectedMonth === idx;
                        const hasSales = monthsWithSalesInSelectedYear.has(idx);

                        return (
                          <button
                            key={mName}
                            type="button"
                            onClick={() => {
                              setFilterMode('month');
                              setSelectedMonth(idx);
                              setIsFilterOpen(false);
                            }}
                            className={`py-2 px-1.5 rounded-xl text-xs font-medium transition-all relative flex flex-col items-center justify-center cursor-pointer ${
                              isSelected
                                ? 'bg-[#7A1C1D] text-white font-bold shadow-sm shadow-[#7A1C1D]/20'
                                : 'bg-gray-50 hover:bg-[#F8E7E9]/70 text-[#1A1A1A]'
                            }`}
                          >
                            <span>{mName}</span>
                            {hasSales && (
                              <span 
                                className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                                  isSelected ? 'bg-white' : 'bg-[#7A1C1D]'
                                }`}
                                title="Possui vendas registradas"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rodapé do Menu */}
                  {isFiltered && (
                    <div className="pt-3 mt-3 border-t border-gray-100 flex justify-between items-center">
                      <button
                        type="button"
                        onClick={handleResetFilter}
                        className="text-[11px] font-semibold text-[#7A1C1D] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw size={11} />
                        Restaurar padrão (6 meses)
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsFilterOpen(false)}
                        className="text-[11px] font-bold text-[#86868B] hover:text-[#1A1A1A] cursor-pointer"
                      >
                        Fechar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7A1C1D" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#7A1C1D" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E7" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#86868B', fontSize: 11}}
                interval={xAxisInterval}
                dy={10}
              />
              <YAxis 
                hide 
                domain={[0, (dataMax: number) => (dataMax > 0 ? Math.ceil(dataMax * 1.15) : 100)]} 
              />
              <Tooltip 
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]?.payload?.tooltipLabel) {
                    return payload[0].payload.tooltipLabel;
                  }
                  return label;
                }}
                formatter={(value: any) => [
                  `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                  'Faturamento'
                ]}
                contentStyle={{ 
                  borderRadius: '14px', 
                  border: '1px solid rgba(122, 28, 29, 0.08)', 
                  boxShadow: '0 12px 24px -4px rgba(110, 46, 73, 0.12)',
                  padding: '10px 14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.96)',
                  backdropFilter: 'blur(8px)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="#7A1C1D" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorTotal)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {totalSalesInPeriod === 0 && (
          <p className="text-center text-[#86868B] text-xs pt-3 italic">
            Nenhuma venda registrada no período selecionado. O gráfico exibe a linha base zerada.
          </p>
        )}
      </GlassCard>

      {/* Seção de Cobranças Dinâmicas */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold tracking-tight">Cobranças Pendentes</h3>
        </div>
        <div className="space-y-3">
          {sales.filter(s => s.status === 'pending').slice(0, 4).map(sale => {
            const client = clients.find(c => c.id === sale.clientId);
            const brand = brands.find(b => b.id === sale.brandId);
            return (
              <GlassCard key={sale.id} className="p-4 flex items-center justify-between hover:bg-white/40 transition-colors">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: brand?.color || '#7A1C1D' }}
                  >
                    {brand?.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1A1A1A]">{client?.name || 'Cliente'}</h4>
                    <p className="text-xs text-[#86868B]">{brand?.name} • Vence em {new Date(sale.dueDate).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#1A1A1A]">R$ {sale.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  <button 
                    onClick={() => onRemind(sale)}
                    className="text-[10px] font-bold uppercase tracking-tighter text-[#7A1C1D] bg-[#F8E7E9] px-3 py-1 rounded-full mt-1 hover:bg-[#F2D7D9] transition-all active:scale-95"
                  >
                    Cobrar
                  </button>
                </div>
              </GlassCard>
            );
          })}
          {sales.filter(s => s.status === 'pending').length === 0 && (
            <p className="text-center text-[#86868B] py-8 text-sm italic">Nenhuma cobrança pendente para hoje.</p>
          )}
        </div>
      </div>
    </div>
  );
};
