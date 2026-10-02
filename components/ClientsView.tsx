import React, { useState, useMemo } from 'react';
import { 
  UserPlus, 
  Search, 
  X, 
  Plus, 
  Phone, 
  ShoppingBag, 
  Calendar, 
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { EmptyState } from './EmptyState';
import { Client, Sale, Brand } from '../types';
import { clientService } from '../services/clientService';

interface ClientsViewProps {
  clients: Client[];
  sales: Sale[];
  brands: Brand[];
  onOpenNewClientForm: () => void;
  onSelectClient: (client: Client) => void;
  isClientsIntroActive?: boolean;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  sales,
  brands,
  onOpenNewClientForm,
  onSelectClient,
  isClientsIntroActive = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filtragem imediata por nome ou telefone via clientService
  const filteredClients = useMemo(() => {
    return clientService.searchClients(clients, searchQuery);
  }, [clients, searchQuery]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    try {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Cabeçalho do Módulo de Clientes */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-1 px-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1D1D1F]">
            Clientes
          </h1>
          <p className="text-[#86868B] font-medium text-sm mt-1">
            Organize seus clientes e acompanhe seus relacionamentos de venda.
          </p>
        </div>

        <button
          onClick={onOpenNewClientForm}
          className={`bg-[#7A1C1D] text-white px-5 py-3 rounded-full font-bold text-sm shadow-lg shadow-[#7A1C1D]/20 hover:bg-[#6E2E49] active:scale-95 transition-all flex items-center justify-center gap-2 self-start sm:self-auto ${
            isClientsIntroActive ? 'ring-4 ring-[#C87A8A]/50 animate-pulse' : ''
          }`}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Novo cliente</span>
        </button>
      </header>

      {/* Barra de Busca de Clientes (se existirem clientes cadastrados) */}
      {clients.length > 0 && (
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
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

      {/* Renderização Condicional de Estados da Lista */}
      {clients.length === 0 ? (
        // Estado Vazio: Nenhum cliente no sistema
        <EmptyState
          icon={UserPlus}
          title="Nenhum cliente cadastrado"
          description="Cadastre seus clientes para organizar seu histórico de vendas e acompanhar valores a receber."
          actionLabel="Cadastrar Primeiro Cliente"
          onAction={onOpenNewClientForm}
        />
      ) : filteredClients.length === 0 ? (
        // Estado Vazio: Busca sem resultados
        <div className="flex flex-col items-center justify-center py-14 px-6 text-center bg-white/60 glass rounded-3xl border border-white/50 apple-shadow">
          <div className="w-14 h-14 bg-gray-100/80 rounded-full flex items-center justify-center text-gray-400 mb-4">
            <Search size={26} strokeWidth={1.75} />
          </div>
          <h3 className="text-lg font-bold text-[#1D1D1F] mb-1">
            Nenhum cliente encontrado
          </h3>
          <p className="text-sm text-[#86868B] max-w-sm mb-6 leading-relaxed">
            Não encontramos nenhum cliente com o termo &ldquo;{searchQuery}&rdquo;. Verifique o nome ou o número digitado.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchQuery('')}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200/70 text-[#1A1A1A] font-bold text-xs rounded-full transition-all active:scale-95"
            >
              Limpar busca
            </button>
            <button
              onClick={onOpenNewClientForm}
              className="px-5 py-2.5 bg-[#7A1C1D] hover:bg-[#6E2E49] text-white font-bold text-xs rounded-full shadow-md shadow-[#7A1C1D]/20 transition-all active:scale-95"
            >
              Cadastrar este cliente
            </button>
          </div>
        </div>
      ) : (
        // Grid de Cards de Clientes
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredClients.map(client => {
            const metrics = clientService.getClientMetrics(client, sales);
            const formattedPhone = clientService.formatPhone(client.phone);
            const hasDebt = clientService.hasOutstanding(client);
            const lastDate = formatDate(metrics.lastPurchaseDate);

            return (
              <GlassCard
                key={client.id}
                onClick={() => onSelectClient(client)}
                className="p-5 flex flex-col justify-between hover:border-[#F2D7D9] transition-all group"
              >
                {/* Linha Superior: Avatar, Nome, Telefone e Status Financeiro */}
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F8E7E9] to-[#F2D7D9] flex-shrink-0 flex items-center justify-center text-[#7A1C1D] font-black text-lg border border-[#F2D7D9]">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-base text-[#1A1A1A] truncate group-hover:text-[#7A1C1D] transition-colors">
                        {client.name}
                      </h4>
                      <p className="text-xs text-[#86868B] flex items-center gap-1 mt-0.5">
                        <Phone size={11} className="text-gray-400" />
                        <span>{formattedPhone}</span>
                      </p>
                    </div>
                  </div>

                  {/* Saldo Devedor / Situação */}
                  <div className="text-right flex-shrink-0">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
                      {hasDebt ? 'A Receber' : 'Situação'}
                    </span>
                    <p className={`text-base font-black tracking-tight ${
                      hasDebt ? 'text-[#1A1A1A]' : 'text-emerald-600'
                    }`}>
                      {hasDebt 
                        ? `R$ ${client.totalDue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                        : 'Em dia'}
                    </p>
                  </div>
                </div>

                {/* Linha Inferior: Resumo de Relacionamento (Vendas & Última Compra) */}
                <div className="pt-3 border-t border-gray-100/70 flex items-center justify-between text-xs text-[#86868B]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-medium">
                      <ShoppingBag size={13} className="text-gray-400" />
                      {metrics.salesCount === 0 ? (
                        <span>Sem compras</span>
                      ) : (
                        <span>{metrics.salesCount} {metrics.salesCount === 1 ? 'venda' : 'vendas'}</span>
                      )}
                    </span>

                    {lastDate && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-medium truncate">
                          <Calendar size={13} className="text-gray-400" />
                          <span>Última: {lastDate}</span>
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[#7A1C1D] font-bold text-xs group-hover:translate-x-0.5 transition-transform">
                    <span>Ver detalhes</span>
                    <ArrowRight size={13} />
                  </div>
                </div>
              </GlassCard>
            );
          })}

          {/* Card Pontilhado para Criação de Novo Cliente */}
          <GlassCard
            onClick={onOpenNewClientForm}
            className={`p-5 border-dashed border-2 flex items-center justify-center gap-2 text-[#86868B] hover:text-[#7A1C1D] hover:border-[#C87A8A] transition-all cursor-pointer min-h-[110px] ${
              isClientsIntroActive ? 'border-[#7A1C1D] bg-[#F8E7E9]/50 text-[#7A1C1D]' : 'border-gray-200'
            }`}
          >
            <Plus size={20} />
            <span className="font-semibold text-sm">Adicionar Novo Cliente</span>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
