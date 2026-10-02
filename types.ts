
export interface Brand {
  id: string;
  name: string;
  commission: number; // e.g., 0.3 for 30%
  color: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  totalDue: number;
}

export interface Sale {
  id: string;
  clientId: string;
  brandId: string;
  amount: number;
  cost: number;
  profit: number;
  dueDate: string;
  status: 'paid' | 'pending';
  createdAt: string;
}

export type ViewState = 'dashboard' | 'sales' | 'clients' | 'settings' | 'brands';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string | null;
  tier?: string;
  createdAt?: string;
}

export interface AuthSession {
  user: UserProfile;
  token: string;
  expiresAt: number;
}

export interface AuthResponse {
  user: UserProfile | null;
  error: string | null;
  requiresEmailConfirmation?: boolean;
}

export type OnboardingStep = 
  | 'idle'
  | 'welcome'
  | 'dashboard_intro'
  | 'clients_intro'
  | 'client_created'
  | 'brands_intro'
  | 'brand_created'
  | 'sale_intro'
  | 'sale_created'
  | 'completion';

export interface OnboardingState {
  userId: string;
  isCompleted: boolean;
  step: OnboardingStep;
  lastClientId?: string;
  lastBrandId?: string;
  lastSaleId?: string;
}

export type SubscriptionStatus = 
  | 'no_subscription'
  | 'pending'
  | 'active'
  | 'cancelled'
  | 'overdue';

export interface SubscriptionRecord {
  id: string;
  user_id: string;
  plano: string;
  status: string;
  mercado_pago_customer_id?: string | null;
  mercado_pago_subscription_id?: string | null;
  valor?: number | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SubscriptionAccessState {
  status: SubscriptionStatus;
  isAuthorized: boolean;
  isTrial: boolean;
  daysRemaining: number;
  hasUsedTrial: boolean;
  dataFim?: string | null;
}

declare module '*.png' {
  const content: string;
  export default content;
}


