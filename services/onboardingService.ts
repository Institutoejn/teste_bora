import { OnboardingState, OnboardingStep } from '../types';

const STORAGE_PREFIX = 'bora_onboarding_';

const DEFAULT_STATE: OnboardingState = {
  userId: '',
  isCompleted: false,
  step: 'idle',
};

/**
 * Serviço de Onboarding da plataforma Bora
 * 
 * Atualmente utiliza localStorage para persistência isolada por usuário.
 * 
 * PREPARAÇÃO PARA SUPABASE:
 * Quando o Supabase for integrado, as funções abaixo poderão ler e gravar
 * no campo `onboarding_completed` da tabela `profiles` ou no `user_metadata`
 * do Supabase Auth (ex: `supabase.from('profiles').update({ onboarding_completed: true })`).
 */
export const onboardingService = {
  getStorageKey(userId: string): string {
    return `${STORAGE_PREFIX}${userId}`;
  },

  getState(userId: string): OnboardingState {
    if (!userId) return { ...DEFAULT_STATE };
    try {
      const stored = localStorage.getItem(this.getStorageKey(userId));
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Falha ao ler estado do onboarding do localStorage:', e);
    }
    return {
      userId,
      isCompleted: false,
      step: 'welcome',
    };
  },

  saveState(state: OnboardingState): void {
    if (!state.userId) return;
    try {
      localStorage.setItem(this.getStorageKey(state.userId), JSON.stringify(state));
    } catch (e) {
      console.warn('Falha ao salvar estado do onboarding no localStorage:', e);
    }
  },

  isCompleted(userId: string): boolean {
    if (!userId) return false;
    const state = this.getState(userId);
    return Boolean(state.isCompleted);
  },

  setStep(userId: string, step: OnboardingStep, extra?: Partial<OnboardingState>): OnboardingState {
    const currentState = this.getState(userId);
    const updated: OnboardingState = {
      ...currentState,
      userId,
      step,
      ...extra,
    };
    this.saveState(updated);
    return updated;
  },

  complete(userId: string): OnboardingState {
    const currentState = this.getState(userId);
    const updated: OnboardingState = {
      ...currentState,
      userId,
      isCompleted: true,
      step: 'idle',
    };
    this.saveState(updated);
    return updated;
  },

  reset(userId: string): OnboardingState {
    const resetState: OnboardingState = {
      userId,
      isCompleted: false,
      step: 'welcome',
      lastClientId: undefined,
      lastBrandId: undefined,
      lastSaleId: undefined,
    };
    this.saveState(resetState);
    return resetState;
  }
};
