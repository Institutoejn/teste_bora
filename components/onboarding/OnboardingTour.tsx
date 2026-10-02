import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useOnboarding } from './OnboardingContext';
import { useAuth } from '../auth/AuthContext';
import { OnboardingWelcomeModal } from './OnboardingWelcomeModal';
import { OnboardingCompletionModal } from './OnboardingCompletionModal';
import { OnboardingStepCard } from './OnboardingStepCard';

interface OnboardingTourProps {
  onOpenClientForm: () => void;
  onOpenBrandForm: () => void;
  onOpenSalesForm: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  onOpenClientForm,
  onOpenBrandForm,
  onOpenSalesForm,
}) => {
  const { user } = useAuth();
  const {
    step,
    isActive,
    lastCreatedClient,
    lastCreatedBrand,
    lastCreatedSale,
    advanceToStep,
    skipSale,
    completeOnboarding,
    exitOnboarding,
  } = useOnboarding();

  if (!isActive || step === 'idle') {
    return null;
  }

  const handleNextFromStep = () => {
    switch (step) {
      case 'dashboard_intro':
        advanceToStep('clients_intro');
        break;
      case 'client_created':
        advanceToStep('brands_intro');
        break;
      case 'brand_created':
        advanceToStep('sale_intro');
        break;
      case 'sale_created':
        advanceToStep('completion');
        break;
      default:
        break;
    }
  };

  return (
    <>
      <AnimatePresence>
        {step === 'welcome' && (
          <OnboardingWelcomeModal
            key="onboarding-welcome-modal"
            userName={user?.name}
            onStart={() => advanceToStep('dashboard_intro')}
            onSkip={exitOnboarding}
          />
        )}

        {step === 'completion' && (
          <OnboardingCompletionModal
            key="onboarding-completion-modal"
            onFinish={completeOnboarding}
          />
        )}
      </AnimatePresence>

      {[
        'dashboard_intro',
        'clients_intro',
        'client_created',
        'brands_intro',
        'brand_created',
        'sale_intro',
        'sale_created',
      ].includes(step) && (
        <OnboardingStepCard
          step={step}
          lastCreatedClient={lastCreatedClient}
          lastCreatedBrand={lastCreatedBrand}
          lastCreatedSale={lastCreatedSale}
          onNext={handleNextFromStep}
          onOpenClientForm={onOpenClientForm}
          onOpenBrandForm={onOpenBrandForm}
          onOpenSalesForm={onOpenSalesForm}
          onSkipSale={skipSale}
          onExit={exitOnboarding}
        />
      )}
    </>
  );
};
