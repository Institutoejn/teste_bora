import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  Settings,
  MessageCircle,
  PlusCircle,
  ArchiveX,
  UserPlus,
  Camera,
  LogOut,
  Loader2,
  Tag,
  ChevronRight,
  Edit3,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dashboard } from './components/Dashboard';
import { SalesForm } from './components/SalesForm';
import { ClientForm } from './components/ClientForm';
import { BrandForm } from './components/BrandForm';
import { GlassCard } from './components/GlassCard';
import { EmptyState } from './components/EmptyState';
import { Toast } from './components/Toast';
import { ClientsView } from './components/ClientsView';
import { ClientDetailModal } from './components/ClientDetailModal';
import { BrandsView } from './components/BrandsView';
import { BrandDetailModal } from './components/BrandDetailModal';
import { SalesView } from './components/SalesView';
import { SaleDetailModal } from './components/SaleDetailModal';
import { EditProfileModal } from './components/EditProfileModal';
import { ViewState, Sale, Client, Brand } from './types';
import { clientService } from './services/clientService';
import { brandService } from './services/brandService';
import { saleService } from './services/saleService';
import { supabase } from './services/supabaseClient';
import { generateReminderMessage } from './services/geminiService';
import { profileService } from './services/profileService';
import { AuthProvider, useAuth } from './components/auth/AuthContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { ResetPasswordModal } from './components/auth/ResetPasswordModal';
import { ChangePasswordCard } from './components/settings/ChangePasswordCard';
import { SubscriptionProvider, useSubscription } from './components/subscription/SubscriptionContext';
import { SubscriptionGate } from './components/subscription/SubscriptionGate';
import { SubscriptionModal } from './components/subscription/SubscriptionModal';
import { SUBSCRIPTION_CONFIG } from './services/subscriptionConfig';
import { OnboardingProvider, useOnboarding } from './components/onboarding/OnboardingContext';
import { OnboardingTour } from './components/onboarding/OnboardingTour';
import { NotificationBell } from './components/notifications/NotificationBell';
import BrandAssets from './BrandAssets';

interface AppShellProps {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  brands: Brand[];
  setBrands: React.Dispatch<React.SetStateAction<Brand[]>>;
  toastMessage: string;
  setToastMessage: (msg: string) => void;
  isToastVisible: boolean;
  setIsToastVisible: (vis: boolean) => void;
  handleLogout: () => Promise<void>;
  showDevToast: () => void;
  getUserInitials: (name?: string) => string;
}

const AppShell: React.FC<AppShellProps> = ({
  currentView,
  setCurrentView,
  sales,
  setSales,
  clients,
  setClients,
  brands,
  setBrands,
  toastMessage,
  setToastMessage,
  isToastVisible,
  setIsToastVisible,
  handleLogout,
  showDevToast,
  getUserInitials,
}) => {
  const { user, updateProfile, isPasswordRecovery } = useAuth();
  const { 
    subscription, 
    status: subscriptionStatus, 
    refreshSubscription, 
    isAuthorized,
    isTrial,
    daysRemaining,
  } = useSubscription();

  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isVerifyingInSettings, setIsVerifyingInSettings] = useState(false);

  const {
    step,
    onClientCreated,
    onBrandCreated,
    onSaleCreated,
    preselectedClientId,
    preselectedBrandId,
    resetOnboarding,
  } = useOnboarding();

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  
  // Controle de Modais e Seleções
  const [isSalesFormOpen, setIsSalesFormOpen] = useState(false);
  const [isClientFormOpen, setIsClientFormOpen] = useState(false);
  const [isBrandFormOpen, setIsBrandFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [saleTargetClientId, setSaleTargetClientId] = useState<string | undefined>(undefined);
  const [saleTargetBrandId, setSaleTargetBrandId] = useState<string | undefined>(undefined);

  // Mantém os dados do cliente, marca e venda selecionados sincronizados com o estado global
  const currentSelectedClient = selectedClient
    ? clients.find(c => c.id === selectedClient.id) || selectedClient
    : null;

  const currentSelectedBrand = selectedBrand
    ? brands.find(b => b.id === selectedBrand.id) || selectedBrand
    : null;

  const currentSelectedSale = selectedSale
    ? sales.find(s => s.id === selectedSale.id) || selectedSale
    : null;

  const handleAddSale = async (newSaleData: Omit<Sale, 'id'>) => {
    if (!user?.id) {
      setToastMessage('Você precisa estar autenticado para registrar uma venda.');
      setIsToastVisible(true);
      return;
    }
    try {
      const persistedSale = await saleService.createSale(newSaleData, user.id);
      setSales(prev => {
        const exists = prev.some(s => s.id === persistedSale.id);
        const updated = exists ? prev.map(s => s.id === persistedSale.id ? persistedSale : s) : [persistedSale, ...prev];
        setClients(currentClients => clientService.recalculateClientsTotalDue(currentClients, updated));
        return updated;
      });
      setIsSalesFormOpen(false);
      setSaleTargetClientId(undefined);
      setSaleTargetBrandId(undefined);
      setToastMessage('Venda registrada com sucesso!');
      setIsToastVisible(true);
      // Notifica o fluxo de onboarding se ativo
      onSaleCreated(persistedSale);
    } catch (err) {
      console.error('[BORA] Erro ao registrar venda:', err);
      setToastMessage('Não foi possível registrar a venda.');
      setIsToastVisible(true);
    }
  };

  const handleSaveSale = async (saleData: any) => {
    if (!user?.id) {
      setToastMessage('Você precisa estar autenticado para salvar uma venda.');
      setIsToastVisible(true);
      return;
    }
    if (editingSale) {
      // Atualização de venda existente no Supabase
      try {
        const updatedSale = await saleService.updateSale(editingSale.id, saleData, user.id);
        setSales(prev => {
          const updated = prev.map(s => (s.id === editingSale.id ? updatedSale : s));
          setClients(currentClients => clientService.recalculateClientsTotalDue(currentClients, updated));
          return updated;
        });

        // Atualiza a venda no detalhe se estiver aberta
        if (selectedSale && selectedSale.id === editingSale.id) {
          setSelectedSale(updatedSale);
        }

        setEditingSale(null);
        setIsSalesFormOpen(false);
        setSaleTargetClientId(undefined);
        setSaleTargetBrandId(undefined);
        setToastMessage('Venda atualizada com sucesso!');
        setIsToastVisible(true);
      } catch (err) {
        console.error('[BORA] Erro ao atualizar venda:', err);
        setToastMessage('Não foi possível atualizar a venda.');
        setIsToastVisible(true);
      }
    } else {
      await handleAddSale(saleData);
    }
  };

  const handleToggleSaleStatus = async (sale: Sale) => {
    if (!user?.id) {
      setToastMessage('Você precisa estar autenticado para alterar o status da venda.');
      setIsToastVisible(true);
      return;
    }
    const newStatus: 'paid' | 'pending' = sale.status === 'paid' ? 'pending' : 'paid';
    try {
      const updatedSale = await saleService.toggleSaleStatus(sale.id, newStatus, user.id);
      setSales(prev => {
        const updated = prev.map(s => (s.id === sale.id ? updatedSale : s));
        setClients(currentClients => clientService.recalculateClientsTotalDue(currentClients, updated));
        return updated;
      });

      if (selectedSale && selectedSale.id === sale.id) {
        setSelectedSale(updatedSale);
      }

      setToastMessage(newStatus === 'paid' ? 'Venda marcada como paga!' : 'Venda marcada como pendente!');
      setIsToastVisible(true);
    } catch (err) {
      console.error('[BORA] Erro ao alternar status da venda:', err);
      setToastMessage('Não foi possível atualizar o status da venda.');
      setIsToastVisible(true);
    }
  };

  const handleSaveClient = async (clientData: { name: string; phone: string }) => {
    if (!user?.id) {
      setToastMessage('Você precisa estar autenticado para salvar um cliente.');
      setIsToastVisible(true);
      return;
    }
    if (editingClient) {
      // Edição de cliente existente via Supabase
      try {
        const updatedClient = await clientService.updateClient(editingClient.id, clientData, user.id);
        setClients(prev =>
          prev.map(c => {
            if (c.id === editingClient.id) {
              const merged = { ...c, ...updatedClient, totalDue: c.totalDue };
              if (selectedClient && selectedClient.id === c.id) {
                setSelectedClient(merged);
              }
              return merged;
            }
            return c;
          })
        );
        setEditingClient(null);
        setIsClientFormOpen(false);
        setToastMessage('Cliente atualizado com sucesso!');
        setIsToastVisible(true);
      } catch (err) {
        console.error('[BORA] Erro ao atualizar cliente:', err);
        setToastMessage('Não foi possível salvar o cliente.');
        setIsToastVisible(true);
      }
    } else {
      // Criação de novo cliente persistido no Supabase com ID real (UUID)
      try {
        const newClient = await clientService.createClient(clientData, user.id);
        setClients(prev => {
          if (prev.some(c => c.id === newClient.id)) return prev;
          return [newClient, ...prev];
        });
        setIsClientFormOpen(false);
        setToastMessage('Cliente cadastrado com sucesso!');
        setIsToastVisible(true);
        // Notifica o fluxo de onboarding se ativo
        onClientCreated(newClient);
      } catch (err) {
        console.error('[BORA] Erro ao cadastrar cliente:', err);
        setToastMessage('Não foi possível salvar o cliente.');
        setIsToastVisible(true);
      }
    }
  };

  const handleSaveBrand = async (brandData: { name: string; commission: number; color: string }) => {
    if (!user?.id) {
      setToastMessage('Você precisa estar autenticado para salvar uma marca.');
      setIsToastVisible(true);
      return;
    }
    if (editingBrand) {
      // Edição de marca existente via Supabase
      try {
        const updatedBrand = await brandService.updateBrand(editingBrand.id, brandData, user.id);
        setBrands(prev =>
          prev.map(b => {
            if (b.id === editingBrand.id) {
              if (selectedBrand && selectedBrand.id === b.id) {
                setSelectedBrand(updatedBrand);
              }
              return updatedBrand;
            }
            return b;
          })
        );
        setEditingBrand(null);
        setIsBrandFormOpen(false);
        setToastMessage(`Marca ${brandData.name} atualizada com sucesso!`);
        setIsToastVisible(true);
      } catch (err) {
        console.error('[BORA] Erro ao atualizar marca:', err);
        setToastMessage('Não foi possível salvar a marca.');
        setIsToastVisible(true);
      }
    } else {
      // Criação de nova marca persistida no Supabase com ID real (UUID)
      try {
        const newBrand = await brandService.createBrand(brandData, user.id);
        setBrands(prev => {
          if (prev.some(b => b.id === newBrand.id)) return prev;
          return [newBrand, ...prev];
        });
        setIsBrandFormOpen(false);
        setToastMessage(`Marca ${brandData.name} adicionada!`);
        setIsToastVisible(true);
        // Notifica o fluxo de onboarding se ativo
        onBrandCreated(newBrand);
      } catch (err) {
        console.error('[BORA] Erro ao cadastrar marca:', err);
        setToastMessage('Não foi possível salvar a marca.');
        setIsToastVisible(true);
      }
    }
  };

  const handleDeleteClient = async (clientToDelete: Client) => {
    if (!user?.id) {
      setToastMessage('Você precisa estar autenticado para excluir um cliente.');
      setIsToastVisible(true);
      return;
    }
    try {
      await clientService.deleteClient(clientToDelete.id, user.id);
      // Remove do estado de clientes
      setClients(prev => prev.filter(c => c.id !== clientToDelete.id));
      // Remove do estado de vendas as vendas vinculadas (já que o banco deleta em cascata)
      setSales(prev => prev.filter(s => s.clientId !== clientToDelete.id));
      setSelectedClient(null);
      setToastMessage(`Cliente ${clientToDelete.name} excluído com sucesso!`);
      setIsToastVisible(true);
    } catch (err) {
      console.error('[BORA] Erro ao excluir cliente:', err);
      setToastMessage('Não foi possível excluir o cliente.');
      setIsToastVisible(true);
    }
  };

  const handleDeleteBrand = async (brandToDelete: Brand) => {
    if (!user?.id) {
      setToastMessage('Você precisa estar autenticado para excluir uma marca.');
      setIsToastVisible(true);
      return;
    }
    try {
      await brandService.deleteBrand(brandToDelete.id, user.id);
      // Remove do estado de marcas
      setBrands(prev => prev.filter(b => b.id !== brandToDelete.id));
      // Remove do estado de vendas as vendas vinculadas (já que o banco deleta em cascata)
      setSales(prev => prev.filter(s => s.brandId !== brandToDelete.id));
      setSelectedBrand(null);
      setToastMessage(`Marca ${brandToDelete.name} excluída com sucesso!`);
      setIsToastVisible(true);
    } catch (err) {
      console.error('[BORA] Erro ao excluir marca:', err);
      setToastMessage('Não foi possível excluir a marca.');
      setIsToastVisible(true);
    }
  };

  const handleSaveProfile = async (updatedData: {
    name: string;
    phone: string;
    avatarUrl: string | null;
    avatarFile?: File | null;
    isPhotoRemoved?: boolean;
  }) => {
    try {
      await updateProfile(updatedData);
      setIsEditProfileOpen(false);
      setToastMessage('Perfil atualizado com sucesso.');
      setIsToastVisible(true);
    } catch {
      setToastMessage('Erro ao atualizar perfil. Tente novamente.');
      setIsToastVisible(true);
    }
  };

  const handleWhatsAppReminder = async (sale: Sale) => {
    const client = clients.find(c => c.id === sale.clientId);
    const brand = brands.find(b => b.id === sale.brandId);
    if (!client || !brand) return;
    setToastMessage('Gerando mensagem com IA...');
    setIsToastVisible(true);
    const message = await generateReminderMessage(
      client.name, 
      brand.name, 
      sale.amount, 
      new Date(sale.dueDate).toLocaleDateString('pt-BR')
    );
    window.open(`https://wa.me/${client.phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            sales={sales} 
            clients={clients} 
            brands={brands} 
            userName={user?.name}
            onQuickSale={() => {
              setSaleTargetClientId(undefined);
              setSaleTargetBrandId(undefined);
              setIsSalesFormOpen(true);
            }}
            onRemind={handleWhatsAppReminder}
            isIntroActive={step === 'dashboard_intro'}
          />
        );
      case 'sales':
        return (
          <SalesView
            sales={sales}
            clients={clients}
            brands={brands}
            onOpenNewSaleForm={() => {
              setEditingSale(null);
              setSaleTargetClientId(undefined);
              setSaleTargetBrandId(undefined);
              setIsSalesFormOpen(true);
            }}
            onSelectSale={(sale) => setSelectedSale(sale)}
            onRemindWhatsApp={handleWhatsAppReminder}
            isSaleIntroActive={step === 'sale_intro'}
          />
        );
      case 'clients':
        return (
          <ClientsView
            clients={clients}
            sales={sales}
            brands={brands}
            onOpenNewClientForm={() => {
              setEditingClient(null);
              setIsClientFormOpen(true);
            }}
            onSelectClient={(client) => setSelectedClient(client)}
            isClientsIntroActive={step === 'clients_intro'}
          />
        );
      case 'brands':
        return (
          <BrandsView
            brands={brands}
            sales={sales}
            clients={clients}
            onOpenNewBrandForm={() => {
              setEditingBrand(null);
              setIsBrandFormOpen(true);
            }}
            onSelectBrand={(brand) => setSelectedBrand(brand)}
            isBrandsIntroActive={step === 'brands_intro'}
          />
        );
      case 'settings':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight px-1 text-center">Configurações</h2>
            
            {/* Meu Perfil Refinado */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-6">
                <h3 className="font-bold text-[#1D1D1F]">Meu Perfil</h3>
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#7A1C1D] hover:text-[#6E2E49] px-3 py-1.5 rounded-full hover:bg-[#F8E7E9] transition-colors active:scale-95"
                >
                  <Edit3 size={13} />
                  <span>Editar perfil</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="flex items-center gap-5">
                  <div 
                    className="relative group cursor-pointer shrink-0"
                    onClick={() => setIsEditProfileOpen(true)}
                    title="Editar foto ou perfil"
                  >
                    <div className="w-20 h-20 rounded-full border-4 border-white apple-shadow overflow-hidden flex items-center justify-center bg-gradient-to-tr from-[#7A1C1D] to-[#6E2E49] transition-all group-hover:brightness-95">
                      {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt="Foto de perfil" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-2xl font-bold tracking-tighter">
                          {getUserInitials(user?.name)}
                        </span>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                        <Camera size={20} className="text-white" />
                      </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full apple-shadow border border-gray-100">
                      <Camera size={12} className="text-[#7A1C1D]" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-xl text-[#1A1A1A]">{user?.name || 'Revendedor Bora'}</h4>
                    <p className="text-sm text-[#86868B]">{user?.email || 'contato@bora.app'}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {isTrial ? (
                        <span className="inline-block bg-amber-50 text-amber-800 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-amber-200">
                          Teste Grátis
                        </span>
                      ) : isAuthorized ? (
                        <span className="inline-block bg-yellow-50 text-[#B8860B] text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-yellow-200">
                          {user?.tier || 'Bora Premium'}
                        </span>
                      ) : subscriptionStatus === 'pending' || subscription?.status === 'pendente' ? (
                        <span className="inline-block bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-amber-200">
                          Aguardando ativação
                        </span>
                      ) : (
                        <span className="inline-block bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-rose-200">
                          Acesso Expirado
                        </span>
                      )}
                      {user?.phone && (
                        <span className="text-xs text-[#86868B] font-medium">
                          • {profileService.formatPhone(user.phone)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-gray-100 hover:bg-gray-200/80 text-[#1A1A1A] font-bold text-xs rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 self-start sm:self-center"
                >
                  <Edit3 size={14} className="text-[#7A1C1D]" />
                  <span>Editar perfil</span>
                </button>
              </div>
            </GlassCard>

            {/* Plano & Assinatura (Mercado Pago) */}
            <GlassCard className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[#1A1A1A]">Plano & Assinatura</h3>
                </div>
                {isTrial ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    Teste Grátis ({daysRemaining} {daysRemaining === 1 ? 'dia restante' : 'dias restantes'})
                  </span>
                ) : isAuthorized ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Bora Premium Ativo
                  </span>
                ) : subscriptionStatus === 'pending' || subscription?.status === 'pendente' ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Aguardando ativação
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    Acesso Expirado
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#F8E7E9]/40 border border-[#F2D7D9]">
                <div>
                  <h4 className="font-extrabold text-base text-[#1A1A1A]">
                    {isTrial ? 'Período de Teste Grátis (7 Dias)' : SUBSCRIPTION_CONFIG.planName}
                  </h4>
                  <p className="text-xs text-[#86868B]">
                    {isTrial 
                      ? `Você está no período de teste: restam ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'} de acesso livre.` 
                      : `${SUBSCRIPTION_CONFIG.planPrice}/mês`}
                  </p>
                </div>
                <div className="text-left sm:text-right text-xs">
                  <span className="text-[#86868B] block">Término do Ciclo:</span>
                  <span className="font-bold text-[#1A1A1A]">
                    {subscription?.data_fim
                      ? new Date(subscription.data_fim).toLocaleDateString('pt-BR')
                      : (isTrial ? `${daysRemaining} dias restantes` : (subscription?.status === 'pendente' || subscriptionStatus === 'pending' ? 'Aguardando ativação' : 'Mensal'))}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsSubscriptionModalOpen(true)}
                  className="flex-1 py-3 px-4 rounded-2xl bg-[#7A1C1D] hover:bg-[#6E2E49] active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-[#7A1C1D]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Ver Oferta / Assinar Bora Premium</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setIsVerifyingInSettings(true);
                    await refreshSubscription();
                    setTimeout(() => {
                      setIsVerifyingInSettings(false);
                      setToastMessage('Status da assinatura consultado com sucesso!');
                      setIsToastVisible(true);
                    }, 500);
                  }}
                  disabled={isVerifyingInSettings}
                  className="py-3 px-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-[#1A1A1A] font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  <RefreshCw size={14} className={isVerifyingInSettings ? 'animate-spin text-[#7A1C1D]' : ''} />
                  <span>{isVerifyingInSettings ? 'Verificando...' : 'Sincronizar MP'}</span>
                </button>
              </div>
            </GlassCard>

            {/* Segurança & Trocar Senha */}
            <ChangePasswordCard 
              onSuccessToast={(msg) => {
                setToastMessage(msg);
                setIsToastVisible(true);
              }} 
            />

            {/* Ajuda & Tour de Introdução */}
            <GlassCard className="p-6 space-y-3">
              <h3 className="font-bold border-b border-gray-100 pb-2 text-[#1A1A1A]">Ajuda & Tour</h3>
              <p className="text-xs text-[#86868B] leading-relaxed">
                Quer relembrar como funciona o fluxo principal de clientes, marcas e vendas no Bora?
              </p>
              <button 
                onClick={resetOnboarding}
                className="w-full py-3.5 text-[#7A1C1D] font-bold text-sm bg-[#F8E7E9] hover:bg-[#F2D7D9] rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span>Rever Tour de Introdução</span>
              </button>
            </GlassCard>

            {/* Gerenciamento de Sessão / Logout */}
            <GlassCard className="p-6 space-y-3">
              <h3 className="font-bold border-b border-gray-100 pb-2 text-[#1A1A1A]">Sessão da Conta</h3>
              <div className="flex items-center justify-between text-xs text-[#86868B] pb-1">
                <span>E-mail conectado:</span>
                <span className="font-semibold text-[#1A1A1A]">{user?.email}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full py-3.5 text-rose-600 font-bold text-sm bg-rose-50/70 hover:bg-rose-100/70 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <LogOut size={18} />
                <span>Sair da conta</span>
              </button>
            </GlassCard>
          </div>
        );
      default:
        return <div>View not found</div>;
    }
  };

  return (
    <div className="min-h-screen pb-28 pt-4 sm:pt-6 px-4 md:px-8 max-w-4xl mx-auto overflow-x-hidden">
      <Toast message={toastMessage} isVisible={isToastVisible} onClose={() => setIsToastVisible(false)} />

      {/* Barra de Topo do Bora com Logo, Sininho de Notificações e Perfil */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#F2D7D9]/60">
        <div className="flex items-center gap-2">
          <img 
            src={BrandAssets.horizontalLogos.color.transparent} 
            alt="Bora" 
            className="h-8 w-auto object-contain cursor-pointer"
            onClick={() => setCurrentView('dashboard')}
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sininho de Notificações */}
          <NotificationBell
            onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
            onNavigateSettings={() => setCurrentView('settings')}
          />

          {/* Botão de Perfil */}
          <button
            type="button"
            onClick={() => setIsEditProfileOpen(true)}
            className="w-9 h-9 rounded-2xl bg-[#7A1C1D] hover:bg-[#6E2E49] text-white flex items-center justify-center font-extrabold text-xs shadow-sm active:scale-95 transition-all cursor-pointer border border-[#7A1C1D]/20"
            title="Meu Perfil"
          >
            {getUserInitials(user?.name)}
          </button>
        </div>
      </div>

      {/* Banner Informativo do Período de Teste Grátis (7 Dias) */}
      {isTrial && isAuthorized && (
        <div className="mb-4 p-3.5 rounded-2xl bg-[#F8E7E9] border border-[#F2D7D9] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div className="space-y-0.5">
              <span className="font-bold text-[#7A1C1D] block">Período de Teste Grátis Ativo</span>
              <span className="text-[#1D1D1F]">
                Restam <strong>{daysRemaining} {daysRemaining === 1 ? 'dia corrido' : 'dias corridos'}</strong> de acesso gratuito a todas as funções.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSubscriptionModalOpen(true)}
            className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-[#7A1C1D] hover:bg-[#6E2E49] text-white font-bold text-xs shadow-sm transition-all cursor-pointer whitespace-nowrap"
          >
            Assinar Bora Premium (R$ 9,90)
          </button>
        </div>
      )}

      <main className="relative">
        <AnimatePresence mode="wait">
          <motion.div key={currentView} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}>
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Barra de Navegação Inferior Nativa Apple */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[94%] max-w-lg glass rounded-3xl border border-[#F2D7D9]/60 apple-shadow p-2 z-40 flex justify-around items-center">
        <button 
          onClick={() => setCurrentView('dashboard')} 
          className={`flex flex-col items-center px-3 py-2 rounded-2xl transition-all duration-300 active:scale-[0.9] ${
            currentView === 'dashboard' ? 'text-[#7A1C1D] bg-[#F8E7E9]' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <LayoutDashboard size={24} />
          <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter whitespace-nowrap">Início</span>
        </button>

        <button 
          onClick={() => setCurrentView('sales')} 
          className={`flex flex-col items-center px-3 py-2 rounded-2xl transition-all duration-300 active:scale-[0.9] ${
            currentView === 'sales' ? 'text-[#7A1C1D] bg-[#F8E7E9]' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Receipt size={24} />
          <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter whitespace-nowrap">Vendas</span>
        </button>

        <button 
          onClick={() => setCurrentView('clients')} 
          className={`flex flex-col items-center px-3 py-2 rounded-2xl transition-all duration-300 active:scale-[0.9] ${
            currentView === 'clients' ? 'text-[#7A1C1D] bg-[#F8E7E9]' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Users size={24} />
          <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter whitespace-nowrap">Clientes</span>
        </button>

        <button 
          onClick={() => setCurrentView('brands')} 
          className={`flex flex-col items-center px-3 py-2 rounded-2xl transition-all duration-300 active:scale-[0.9] ${
            currentView === 'brands' ? 'text-[#7A1C1D] bg-[#F8E7E9]' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Tag size={24} />
          <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter whitespace-nowrap">Marcas</span>
        </button>

        <button 
          onClick={() => setCurrentView('settings')} 
          className={`flex flex-col items-center px-3 py-2 rounded-2xl transition-all duration-300 active:scale-[0.9] ${
            currentView === 'settings' ? 'text-[#7A1C1D] bg-[#F8E7E9]' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Settings size={24} />
          <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter whitespace-nowrap">Ajustes</span>
        </button>
      </nav>

      {/* Formulários e Modais */}
      <AnimatePresence>
        {/* Modal de Detalhes do Cliente */}
        {currentSelectedClient && (
          <ClientDetailModal
            key={`modal-client-detail-${currentSelectedClient.id}`}
            client={currentSelectedClient}
            sales={sales}
            brands={brands}
            onClose={() => setSelectedClient(null)}
            onEditClient={(c) => {
              setEditingClient(c);
              setIsClientFormOpen(true);
            }}
            onDeleteClient={handleDeleteClient}
            onRegisterSale={(c) => {
              setSaleTargetClientId(c.id);
              setSaleTargetBrandId(undefined);
              setIsSalesFormOpen(true);
            }}
            onRemindWhatsApp={handleWhatsAppReminder}
          />
        )}

        {/* Modal de Detalhes da Marca */}
        {currentSelectedBrand && (
          <BrandDetailModal
            key={`modal-brand-detail-${currentSelectedBrand.id}`}
            brand={currentSelectedBrand}
            sales={sales}
            clients={clients}
            onClose={() => setSelectedBrand(null)}
            onEditBrand={(b) => {
              setEditingBrand(b);
              setIsBrandFormOpen(true);
            }}
            onDeleteBrand={handleDeleteBrand}
            onRegisterSale={(b) => {
              setSaleTargetBrandId(b.id);
              setSaleTargetClientId(undefined);
              setIsSalesFormOpen(true);
            }}
          />
        )}

        {/* Modal de Detalhes da Venda */}
        {currentSelectedSale && (
          <SaleDetailModal
            key={`modal-sale-detail-${currentSelectedSale.id}`}
            sale={currentSelectedSale}
            client={clients.find(c => c.id === currentSelectedSale.clientId)}
            brand={brands.find(b => b.id === currentSelectedSale.brandId)}
            onClose={() => setSelectedSale(null)}
            onEditSale={(s) => {
              setEditingSale(s);
              setIsSalesFormOpen(true);
            }}
            onViewClient={(c) => {
              setSelectedSale(null);
              setSelectedClient(c);
            }}
            onViewBrand={(b) => {
              setSelectedSale(null);
              setSelectedBrand(b);
            }}
            onToggleStatus={handleToggleSaleStatus}
            onRemindWhatsApp={handleWhatsAppReminder}
          />
        )}

        {/* Modal de Vendas */}
        {isSalesFormOpen && (
          <SalesForm 
            key={`modal-sales-form-${editingSale ? editingSale.id : `${saleTargetClientId || ''}-${saleTargetBrandId || ''}`}`}
            brands={brands} 
            clients={clients} 
            initialData={editingSale}
            title={editingSale ? 'Editar Venda' : 'Nova Venda'}
            onClose={() => {
              setIsSalesFormOpen(false);
              setEditingSale(null);
              setSaleTargetClientId(undefined);
              setSaleTargetBrandId(undefined);
            }} 
            onSubmit={handleSaveSale}
            initialClientId={editingSale ? editingSale.clientId : (saleTargetClientId || (step === 'sale_intro' ? preselectedClientId : undefined))}
            initialBrandId={editingSale ? editingSale.brandId : (saleTargetBrandId || (step === 'sale_intro' ? preselectedBrandId : undefined))}
          />
        )}

        {/* Modal de Cliente (Criação ou Edição) */}
        {isClientFormOpen && (
          <ClientForm 
            key={`modal-client-form-${editingClient ? editingClient.id : 'new'}`}
            initialData={editingClient}
            title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}
            onClose={() => {
              setIsClientFormOpen(false);
              setEditingClient(null);
            }} 
            onSubmit={handleSaveClient} 
          />
        )}

        {/* Modal de Marca (Criação ou Edição) */}
        {isBrandFormOpen && (
          <BrandForm 
            key={`modal-brand-form-${editingBrand ? editingBrand.id : 'new'}`}
            initialData={editingBrand}
            title={editingBrand ? 'Editar Marca' : 'Nova Marca'}
            onClose={() => {
              setIsBrandFormOpen(false);
              setEditingBrand(null);
            }} 
            onSubmit={handleSaveBrand} 
          />
        )}

        {/* Modal de Edição de Perfil */}
        {isEditProfileOpen && user && (
          <EditProfileModal
            key="modal-edit-profile"
            user={user}
            onClose={() => setIsEditProfileOpen(false)}
            onSave={handleSaveProfile}
          />
        )}

        {/* Modal de Assinatura Voluntária / Checkout Mercado Pago */}
        {isSubscriptionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <SubscriptionModal
              onClose={() => setIsSubscriptionModalOpen(false)}
            />
          </div>
        )}

        {/* Modal de Redefinição de Senha (link de recuperação) */}
        {isPasswordRecovery && (
          <ResetPasswordModal
            onSuccess={() => {
              setToastMessage('Senha redefinida com sucesso!');
              setIsToastVisible(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Componente de Tour Interativo do Onboarding */}
      <OnboardingTour
        onOpenClientForm={() => {
          setEditingClient(null);
          setIsClientFormOpen(true);
        }}
        onOpenBrandForm={() => {
          setEditingBrand(null);
          setIsBrandFormOpen(true);
        }}
        onOpenSalesForm={() => {
          setEditingSale(null);
          setSaleTargetClientId(preselectedClientId);
          setSaleTargetBrandId(preselectedBrandId);
          setIsSalesFormOpen(true);
        }}
      />
    </div>
  );
};

const MainApp: React.FC = () => {
  const { user, isLoading: isAuthLoading, logout, isPasswordRecovery } = useAuth();
  const { isAuthorized, status: subscriptionStatus, isLoading: isSubscriptionLoading } = useSubscription();
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [sales, setSales] = useState<Sale[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  
  // Controle de Feedback
  const [toastMessage, setToastMessage] = useState('');
  const [isToastVisible, setIsToastVisible] = useState(false);

  // Carrega e sincroniza dados reais persistidos no Supabase estritamente pelo usuário autenticado
  useEffect(() => {
    let isMounted = true;

    async function loadUserData() {
      if (!user?.id) {
        setSales([]);
        setClients([]);
        setBrands([]);
        setIsDataLoading(false);
        return;
      }

      setIsDataLoading(true);
      try {
        const [fetchedClients, fetchedBrands, fetchedSales] = await Promise.all([
          clientService.fetchClients(user.id),
          brandService.fetchBrands(user.id),
          saleService.fetchSales(user.id),
        ]);

        if (!isMounted) return;

        // Recalcula o saldo devedor real dos clientes com base nas vendas pendentes do Supabase
        const reconciledClients = clientService.recalculateClientsTotalDue(fetchedClients, fetchedSales);

        setSales(fetchedSales);
        setClients(reconciledClients);
        setBrands(fetchedBrands);
      } catch (err) {
        console.error('[BORA Supabase] Erro ao carregar dados do usuário:', err);
        if (isMounted) {
          setToastMessage('Não foi possível carregar seus dados.');
          setIsToastVisible(true);
          setSales([]);
          setClients([]);
          setBrands([]);
        }
      } finally {
        if (isMounted) {
          setIsDataLoading(false);
        }
      }
    }

    loadUserData();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Inscrições Realtime no Supabase para as tabelas clientes, marcas e vendas com reconciliação
  useEffect(() => {
    if (!user?.id) return;

    const channelName = `bora-realtime-${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clientes',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRow = payload.new as any;
            if (!newRow || newRow.user_id !== user.id) return;
            const newClient: Client = {
              id: newRow.id,
              name: newRow.nome || '',
              phone: newRow.telefone || '',
              totalDue: 0,
            };
            setClients((prev) => {
              const idx = prev.findIndex((c) => c.id === newClient.id);
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = { ...prev[idx], ...newClient, totalDue: prev[idx].totalDue };
                return copy;
              }
              return [newClient, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedRow = payload.new as any;
            if (!updatedRow || updatedRow.user_id !== user.id) return;
            setClients((prev) =>
              prev.map((c) =>
                c.id === updatedRow.id
                  ? { ...c, name: updatedRow.nome || '', phone: updatedRow.telefone || '' }
                  : c
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedRow = payload.old as any;
            if (!deletedRow?.id) return;
            setClients((prev) => prev.filter((c) => c.id !== deletedRow.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'marcas',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRow = payload.new as any;
            if (!newRow || newRow.user_id !== user.id) return;
            const newBrand: Brand = {
              id: newRow.id,
              name: newRow.nome || '',
              commission:
                typeof newRow.percentual_comissao === 'number'
                  ? newRow.percentual_comissao
                  : parseFloat(newRow.percentual_comissao) || 0.3,
              color: newRow.cor || '#7A1C1D',
            };
            setBrands((prev) => {
              const idx = prev.findIndex((b) => b.id === newBrand.id);
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = { ...prev[idx], ...newBrand };
                return copy;
              }
              return [newBrand, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedRow = payload.new as any;
            if (!updatedRow || updatedRow.user_id !== user.id) return;
            setBrands((prev) =>
              prev.map((b) =>
                b.id === updatedRow.id
                  ? {
                      ...b,
                      name: updatedRow.nome || '',
                      commission:
                        typeof updatedRow.percentual_comissao === 'number'
                          ? updatedRow.percentual_comissao
                          : parseFloat(updatedRow.percentual_comissao) || 0.3,
                      color: updatedRow.cor || '#7A1C1D',
                    }
                  : b
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedRow = payload.old as any;
            if (!deletedRow?.id) return;
            setBrands((prev) => prev.filter((b) => b.id !== deletedRow.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendas',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRow = payload.new as any;
            if (!newRow || newRow.user_id !== user.id) return;
            const newSale: Sale = {
              id: newRow.id,
              clientId: newRow.cliente_id,
              brandId: newRow.marca_id,
              amount: typeof newRow.valor_venda === 'number' ? newRow.valor_venda : parseFloat(newRow.valor_venda) || 0,
              cost: typeof newRow.custo === 'number' ? newRow.custo : parseFloat(newRow.custo) || 0,
              profit: typeof newRow.lucro === 'number' ? newRow.lucro : parseFloat(newRow.lucro) || 0,
              dueDate: newRow.data_vencimento || '',
              status: (newRow.status === 'paid' || newRow.status === 'pago') ? 'paid' : 'pending',
              createdAt: newRow.data_venda
                ? newRow.data_venda.split('T')[0]
                : (newRow.created_at ? newRow.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
            };
            setSales((prev) => {
              const idx = prev.findIndex((s) => s.id === newSale.id);
              let updatedSales: Sale[];
              if (idx >= 0) {
                updatedSales = [...prev];
                updatedSales[idx] = { ...prev[idx], ...newSale };
              } else {
                updatedSales = [newSale, ...prev];
              }
              // Reconcilia o totalDue dos clientes
              setClients((currentClients) =>
                clientService.recalculateClientsTotalDue(currentClients, updatedSales)
              );
              return updatedSales;
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedRow = payload.new as any;
            if (!updatedRow || updatedRow.user_id !== user.id) return;
            const updatedSale: Sale = {
              id: updatedRow.id,
              clientId: updatedRow.cliente_id,
              brandId: updatedRow.marca_id,
              amount: typeof updatedRow.valor_venda === 'number' ? updatedRow.valor_venda : parseFloat(updatedRow.valor_venda) || 0,
              cost: typeof updatedRow.custo === 'number' ? updatedRow.custo : parseFloat(updatedRow.custo) || 0,
              profit: typeof updatedRow.lucro === 'number' ? updatedRow.lucro : parseFloat(updatedRow.lucro) || 0,
              dueDate: updatedRow.data_vencimento || '',
              status: (updatedRow.status === 'paid' || updatedRow.status === 'pago') ? 'paid' : 'pending',
              createdAt: updatedRow.data_venda
                ? updatedRow.data_venda.split('T')[0]
                : (updatedRow.created_at ? updatedRow.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
            };
            setSales((prev) => {
              const updatedSales = prev.map((s) => (s.id === updatedSale.id ? updatedSale : s));
              setClients((currentClients) =>
                clientService.recalculateClientsTotalDue(currentClients, updatedSales)
              );
              return updatedSales;
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedRow = payload.old as any;
            if (!deletedRow?.id) return;
            setSales((prev) => {
              const updatedSales = prev.filter((s) => s.id !== deletedRow.id);
              setClients((currentClients) =>
                clientService.recalculateClientsTotalDue(currentClients, updatedSales)
              );
              return updatedSales;
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[BORA Supabase Realtime] Inscrito com sucesso para o usuário:', user.id);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const showDevToast = () => {
    setToastMessage('Funcionalidade em desenvolvimento para a versão final');
    setIsToastVisible(true);
  };

  const handleLogout = async () => {
    await logout();
    setSales([]);
    setClients([]);
    setBrands([]);
    setToastMessage('Sessão encerrada com sucesso');
    setIsToastVisible(true);
  };

  const getUserInitials = (name?: string): string => {
    if (!name) return 'JS';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (isAuthLoading || isDataLoading || (SUBSCRIPTION_CONFIG.isGateEnabled && user && isSubscriptionLoading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F6E9E4]">
        <div className="w-16 h-16 flex items-center justify-center mb-3">
          <img src={BrandAssets.usage.loading} alt="BORA" className="w-12 h-12 object-contain animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#86868B]">
          <Loader2 size={16} className="animate-spin text-[#7A1C1D]" />
          <span>Carregando seus dados...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Toast message={toastMessage} isVisible={isToastVisible} onClose={() => setIsToastVisible(false)} />
        <AuthScreen onSuccess={() => {}} />
        {isPasswordRecovery && (
          <ResetPasswordModal
            onSuccess={() => {
              setToastMessage('Senha redefinida com sucesso! Você já pode entrar.');
              setIsToastVisible(true);
            }}
          />
        )}
      </>
    );
  }

  if (SUBSCRIPTION_CONFIG.isGateEnabled && !isAuthorized) {
    return (
      <>
        <Toast message={toastMessage} isVisible={isToastVisible} onClose={() => setIsToastVisible(false)} />
        <SubscriptionGate
          status={subscriptionStatus}
          onLogout={handleLogout}
        />
      </>
    );
  }

  return (
    <OnboardingProvider
      clients={clients}
      brands={brands}
      sales={sales}
      setCurrentView={setCurrentView}
    >
      <AppShell
        currentView={currentView}
        setCurrentView={setCurrentView}
        sales={sales}
        setSales={setSales}
        clients={clients}
        setClients={setClients}
        brands={brands}
        setBrands={setBrands}
        toastMessage={toastMessage}
        setToastMessage={setToastMessage}
        isToastVisible={isToastVisible}
        setIsToastVisible={setIsToastVisible}
        handleLogout={handleLogout}
        showDevToast={showDevToast}
        getUserInitials={getUserInitials}
      />
    </OnboardingProvider>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <MainApp />
      </SubscriptionProvider>
    </AuthProvider>
  );
};

export default App;
