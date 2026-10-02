import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { OnboardingStep, OnboardingState, Client, Brand, Sale, ViewState } from '../../types';
import { onboardingService } from '../../services/onboardingService';
import { useAuth } from '../auth/AuthContext';

interface OnboardingContextType {
  step: OnboardingStep;
  isActive: boolean;
  isCompleted: boolean;
  lastCreatedClient: Client | null;
  lastCreatedBrand: Brand | null;
  lastCreatedSale: Sale | null;
  advanceToStep: (nextStep: OnboardingStep) => void;
  startOnboarding: () => void;
  onClientCreated: (client: Client) => void;
  onBrandCreated: (brand: Brand) => void;
  onSaleCreated: (sale: Sale) => void;
  skipSale: () => void;
  completeOnboarding: () => void;
  exitOnboarding: () => void;
  resetOnboarding: () => void;
  preselectedClientId?: string;
  preselectedBrandId?: string;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

interface OnboardingProviderProps {
  children: React.ReactNode;
  clients: Client[];
  brands: Brand[];
  sales: Sale[];
  setCurrentView: (view: ViewState) => void;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({
  children,
  clients,
  brands,
  sales,
  setCurrentView,
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<OnboardingStep>('idle');
  const [isCompleted, setIsCompleted] = useState(true);
  const [lastCreatedClient, setLastCreatedClient] = useState<Client | null>(null);
  const [lastCreatedBrand, setLastCreatedBrand] = useState<Brand | null>(null);
  const [lastCreatedSale, setLastCreatedSale] = useState<Sale | null>(null);

  // Inicializa o estado do onboarding ao carregar ou trocar o usuário logado
  useEffect(() => {
    if (!user) {
      setStep('idle');
      setIsCompleted(true);
      return;
    }

    const state = onboardingService.getState(user.id);
    setIsCompleted(state.isCompleted);

    if (!state.isCompleted) {
      // Se não concluiu o onboarding, define o passo inicial ou recupera o salvo
      const currentStep = state.step && state.step !== 'idle' ? state.step : 'welcome';
      setStep(currentStep);

      // Sincroniza a tela correspondente se recuperado do localStorage
      if (currentStep === 'dashboard_intro') setCurrentView('dashboard');
      else if (currentStep === 'clients_intro' || currentStep === 'client_created') setCurrentView('clients');
      else if (currentStep === 'brands_intro' || currentStep === 'brand_created') setCurrentView('brands');
      else if (currentStep === 'sale_intro' || currentStep === 'sale_created') setCurrentView('sales');

      // Restaura referências de entidades criadas se IDs estiverem salvos
      if (state.lastClientId) {
        const found = clients.find(c => c.id === state.lastClientId);
        if (found) setLastCreatedClient(found);
      }
      if (state.lastBrandId) {
        const found = brands.find(b => b.id === state.lastBrandId);
        if (found) setLastCreatedBrand(found);
      }
      if (state.lastSaleId) {
        const found = sales.find(s => s.id === state.lastSaleId);
        if (found) setLastCreatedSale(found);
      }
    } else {
      setStep('idle');
    }
  }, [user?.id]);

  const advanceToStep = useCallback((nextStep: OnboardingStep) => {
    if (!user) return;
    setStep(nextStep);
    onboardingService.setStep(user.id, nextStep, {
      lastClientId: lastCreatedClient?.id,
      lastBrandId: lastCreatedBrand?.id,
      lastSaleId: lastCreatedSale?.id,
    });

    // Controla navegação automática suave entre as seções reais
    if (nextStep === 'dashboard_intro') {
      setCurrentView('dashboard');
    } else if (nextStep === 'clients_intro') {
      setCurrentView('clients');
    } else if (nextStep === 'brands_intro') {
      setCurrentView('brands');
    } else if (nextStep === 'sale_intro') {
      setCurrentView('sales');
    } else if (nextStep === 'completion') {
      setCurrentView('dashboard');
    }
  }, [user, lastCreatedClient, lastCreatedBrand, lastCreatedSale, setCurrentView]);

  const startOnboarding = useCallback(() => {
    if (!user) return;
    setIsCompleted(false);
    advanceToStep('welcome');
  }, [user, advanceToStep]);

  const onClientCreated = useCallback((client: Client) => {
    if (!user) return;
    setLastCreatedClient(client);
    setStep('client_created');
    onboardingService.setStep(user.id, 'client_created', { lastClientId: client.id });
  }, [user]);

  const onBrandCreated = useCallback((brand: Brand) => {
    if (!user) return;
    setLastCreatedBrand(brand);
    setStep('brand_created');
    onboardingService.setStep(user.id, 'brand_created', { lastBrandId: brand.id });
  }, [user]);

  const onSaleCreated = useCallback((sale: Sale) => {
    if (!user) return;
    setLastCreatedSale(sale);
    setStep('sale_created');
    onboardingService.setStep(user.id, 'sale_created', { lastSaleId: sale.id });
  }, [user]);

  const skipSale = useCallback(() => {
    advanceToStep('completion');
  }, [advanceToStep]);

  const completeOnboarding = useCallback(() => {
    if (!user) return;
    onboardingService.complete(user.id);
    setIsCompleted(true);
    setStep('idle');
    setCurrentView('dashboard');
  }, [user, setCurrentView]);

  const exitOnboarding = useCallback(() => {
    if (!user) return;
    onboardingService.complete(user.id);
    setIsCompleted(true);
    setStep('idle');
  }, [user]);

  const resetOnboarding = useCallback(() => {
    if (!user) return;
    onboardingService.reset(user.id);
    setIsCompleted(false);
    setLastCreatedClient(null);
    setLastCreatedBrand(null);
    setLastCreatedSale(null);
    advanceToStep('welcome');
  }, [user, advanceToStep]);

  const isActive = !isCompleted && step !== 'idle';

  return (
    <OnboardingContext.Provider
      value={{
        step,
        isActive,
        isCompleted,
        lastCreatedClient,
        lastCreatedBrand,
        lastCreatedSale,
        advanceToStep,
        startOnboarding,
        onClientCreated,
        onBrandCreated,
        onSaleCreated,
        skipSale,
        completeOnboarding,
        exitOnboarding,
        resetOnboarding,
        preselectedClientId: lastCreatedClient?.id,
        preselectedBrandId: lastCreatedBrand?.id,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding deve ser utilizado dentro de um OnboardingProvider');
  }
  return context;
};
