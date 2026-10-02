import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '../../types';
import { authService } from '../../services/authService';
import { profileService } from '../../services/profileService';
import { supabase } from '../../services/supabaseClient';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  setIsPasswordRecovery: (val: boolean) => void;
  login: (credentials: { email: string; password: string }) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  signUp: (data: { name: string; email: string; phone: string; password: string }) => Promise<{ success: boolean; error?: string; user?: UserProfile; requiresEmailConfirmation?: boolean }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: {
    name?: string;
    phone?: string;
    avatarUrl?: string | null;
    avatarFile?: File | null;
    isPhotoRemoved?: boolean;
  }) => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.location.hash.includes('type=recovery');
    }
    return false;
  });

  useEffect(() => {
    let isMounted = true;

    // Inicia a escuta de sessão e autenticação no Supabase
    const unsubscribe = authService.onAuthStateChange((currentUser) => {
      if (!isMounted) return;
      setUser(currentUser);
      setIsLoading(false);
    });

    // Escuta direta para evento nativo de recuperação de senha do Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!isMounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      subscription.unsubscribe();
    };
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const response = await authService.login(credentials);
    if (response.error || !response.user) {
      return { success: false, error: response.error || 'Falha ao autenticar.' };
    }
    setUser(response.user);
    return { success: true, user: response.user };
  };

  const signUp = async (data: { name: string; email: string; phone: string; password: string }) => {
    const response = await authService.signUp(data);
    if (response.error) {
      return { success: false, error: response.error || 'Falha ao cadastrar.' };
    }
    if (response.user && !response.requiresEmailConfirmation) {
      setUser(response.user);
    }
    return {
      success: true,
      user: response.user || undefined,
      requiresEmailConfirmation: response.requiresEmailConfirmation
    };
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    return await authService.resetPasswordForEmail(email);
  };

  const updatePassword = async (newPassword: string) => {
    return await authService.updatePassword(newPassword);
  };

  const updateProfile = async (data: {
    name?: string;
    phone?: string;
    avatarUrl?: string | null;
    avatarFile?: File | null;
    isPhotoRemoved?: boolean;
  }) => {
    const updated = await profileService.updateProfile(data);
    if (updated) {
      setUser(updated);
    }
    return updated;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      isPasswordRecovery, 
      setIsPasswordRecovery, 
      login, 
      signUp, 
      logout, 
      resetPassword, 
      updatePassword, 
      updateProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
