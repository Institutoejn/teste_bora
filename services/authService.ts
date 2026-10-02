import { User } from '@supabase/supabase-js';
import { UserProfile, AuthSession, AuthResponse } from '../types';
import { supabase } from './supabaseClient';
import { subscriptionService } from './subscriptionService';

class AuthService {
  /**
   * Converte o usuário do Supabase Auth e os dados da tabela public.profiles
   * no objeto canônico UserProfile do frontend.
   */
  public async fetchOrCreateProfile(authUser: User): Promise<UserProfile> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, nome, telefone, avatar_url, created_at, updated_at')
        .eq('id', authUser.id)
        .maybeSingle();

      if (!error && profile) {
        return {
          id: profile.id,
          name: profile.nome || (authUser.user_metadata?.nome as string) || (authUser.email ? authUser.email.split('@')[0] : 'Revendedor Bora'),
          email: authUser.email || '',
          phone: profile.telefone || (authUser.user_metadata?.telefone as string) || '',
          avatarUrl: profile.avatar_url || null,
          createdAt: profile.created_at || authUser.created_at
        };
      }

      // Se o perfil não existe em public.profiles, cria-o imediatamente
      const fallbackName = (authUser.user_metadata?.nome as string) || (authUser.email ? authUser.email.split('@')[0] : 'Revendedor Bora');
      const fallbackPhone = (authUser.user_metadata?.telefone as string) || '';

      try {
        await supabase.from('profiles').upsert({
          id: authUser.id,
          nome: fallbackName,
          telefone: fallbackPhone,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      } catch (e) {
        console.warn('[Bora Profiles] Auto-create profile error:', e);
      }

      // Garante assinatura inicial pendente se o usuário não possuir assinatura
      try {
        await subscriptionService.initializePendingSubscription(authUser.id);
      } catch (subErr) {
        console.warn('[Bora Profiles] Aviso ao inicializar assinatura pendente:', subErr);
      }

      return {
        id: authUser.id,
        name: fallbackName,
        email: authUser.email || '',
        phone: fallbackPhone,
        avatarUrl: null,
        createdAt: authUser.created_at
      };
    } catch (err) {
      console.warn('[Bora Supabase] Aviso ao buscar/criar perfil em public.profiles:', err);
    }
  }

  /**
   * Obtém a sessão atual diretamente do cliente Supabase.
   */
  public async getCurrentSession(): Promise<AuthSession | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) return null;

      const userProfile = await this.fetchOrCreateProfile(session.user);
      return {
        user: userProfile,
        token: session.access_token,
        expiresAt: (session.expires_at || 0) * 1000
      };
    } catch (err) {
      console.warn('[LUME Supabase] Erro ao recuperar sessão atual:', err);
      return null;
    }
  }

  /**
   * Obtém o usuário atualmente autenticado.
   */
  public async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;
      return this.fetchOrCreateProfile(user);
    } catch (err) {
      console.warn('[LUME Supabase] Erro ao obter usuário atual:', err);
      return null;
    }
  }

  /**
   * Escuta mudanças de estado de autenticação (login, logout, refresh de token).
   * Garante limpeza correta da inscrição e evita ouvintes concorrentes.
   */
  public onAuthStateChange(listener: (user: UserProfile | null) => void): () => void {
    let isSubscribed = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isSubscribed) return;

      if (session?.user) {
        const userProfile = await this.fetchOrCreateProfile(session.user);
        if (isSubscribed) {
          listener(userProfile);
        }
      } else {
        if (isSubscribed) {
          listener(null);
        }
      }
    });

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }

  /**
   * Autenticação de usuário com e-mail e senha via Supabase Auth.
   */
  public async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    try {
      const normalizedEmail = credentials.email.trim().toLowerCase();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: credentials.password
      });

      if (error) {
        return {
          user: null,
          error: this.mapAuthError(error.message)
        };
      }

      if (!data.user) {
        return {
          user: null,
          error: 'Não foi possível entrar. Verifique seu e-mail e senha.'
        };
      }

      const userProfile = await this.fetchOrCreateProfile(data.user);
      return { user: userProfile, error: null };
    } catch {
      return {
        user: null,
        error: 'Ocorreu um erro ao tentar entrar. Tente novamente.'
      };
    }
  }

  /**
   * Criação de nova conta de usuário via Supabase Auth.
   * Transmite metadados 'nome' e 'telefone' para o trigger automático criar public.profiles.
   */
  public async signUp(data: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }): Promise<AuthResponse> {
    try {
      const normalizedEmail = data.email.trim().toLowerCase();
      const cleanPhone = data.phone.replace(/\D/g, '');

      const { data: authData, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: data.password,
        options: {
          data: {
            nome: data.name.trim(),
            telefone: cleanPhone
          }
        }
      });

      if (error) {
        return {
          user: null,
          error: this.mapAuthError(error.message)
        };
      }

      if (!authData.user) {
        return {
          user: null,
          error: 'Não foi possível criar sua conta. Tente novamente.'
        };
      }

      // Garante inserção direta em public.profiles para novos cadastros
      try {
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          nome: data.name.trim(),
          telefone: cleanPhone,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      } catch (profErr) {
        console.warn('[Bora Auth] Aviso ao criar profile inicial:', profErr);
      }

      // Inicializa assinatura com status 'pendente' para o novo usuário
      try {
        await subscriptionService.initializePendingSubscription(authData.user.id);
      } catch (subErr) {
        console.warn('[Bora Auth] Aviso ao inicializar assinatura pendente:', subErr);
      }

      // Se o usuário já existia previamente e a confirmação está ativa, identities é vazio
      if (authData.user.identities && authData.user.identities.length === 0) {
        return {
          user: null,
          error: 'Este e-mail já está cadastrado no Bora. Tente fazer login.'
        };
      }

      // Se a sessão foi retornada imediatamente (auto-confirmação ativa)
      if (authData.session) {
        const userProfile = await this.fetchOrCreateProfile(authData.user);
        return {
          user: userProfile,
          error: null,
          requiresEmailConfirmation: false
        };
      }

      // Caso o projeto do Supabase exija confirmação de e-mail antes do login
      const pendingUser: UserProfile = {
        id: authData.user.id,
        name: data.name.trim(),
        email: normalizedEmail,
        phone: cleanPhone,
        avatarUrl: null,
        createdAt: authData.user.created_at
      };

      return {
        user: pendingUser,
        error: null,
        requiresEmailConfirmation: true
      };
    } catch {
      return {
        user: null,
        error: 'Ocorreu um erro ao processar seu cadastro. Tente novamente.'
      };
    }
  }

  /**
   * Encerramento da sessão atual via Supabase Auth.
   */
  public async logout(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('[Bora Supabase] Aviso durante logout:', error.message);
      }
    } catch (err) {
      console.error('[Bora Supabase] Erro ao deslogar:', err);
    }
  }

  /**
   * Envia e-mail de recuperação de senha via Supabase Auth.
   */
  public async resetPasswordForEmail(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        return {
          success: false,
          error: this.mapAuthError(error.message)
        };
      }

      return { success: true };
    } catch {
      return {
        success: false,
        error: 'Erro ao enviar e-mail de recuperação. Tente novamente.'
      };
    }
  }

  /**
   * Atualiza a senha do usuário (autenticado ou em fluxo de recuperação).
   */
  public async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!newPassword || newPassword.length < 6) {
        return {
          success: false,
          error: 'A nova senha deve ter no mínimo 6 caracteres.'
        };
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return {
          success: false,
          error: this.mapAuthError(error.message)
        };
      }

      return { success: true };
    } catch {
      return {
        success: false,
        error: 'Erro ao atualizar a senha. Tente novamente.'
      };
    }
  }

  /**
   * Mapeia mensagens de erro nativas do Supabase para mensagens em português (pt-BR).
   */
  private mapAuthError(message: string): string {
    const lower = (message || '').toLowerCase();
    if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
      return 'Não foi possível entrar. Verifique seu e-mail e senha.';
    }
    if (lower.includes('email not confirmed')) {
      return 'E-mail ainda não confirmado. Por favor, verifique sua caixa de entrada.';
    }
    if (lower.includes('user already registered') || lower.includes('already registered')) {
      return 'Este e-mail já está cadastrado no Bora. Tente fazer login.';
    }
    if (lower.includes('password should be at least')) {
      return 'A senha deve ter no mínimo 6 caracteres.';
    }
    if (lower.includes('rate limit') || lower.includes('too many requests')) {
      return 'Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.';
    }
    if (lower.includes('invalid email') || lower.includes('valid email')) {
      return 'Por favor, informe um endereço de e-mail válido.';
    }
    return 'Não foi possível completar a operação. Tente novamente.';
  }
}

export const authService = new AuthService();
