import { UserProfile } from '../types';
import { supabase } from './supabaseClient';
import { authService } from './authService';

export interface ProfileValidationResult {
  valid: boolean;
  error?: string;
}

export const profileService = {
  /**
   * Obtém o perfil do usuário autenticado a partir de public.profiles.
   * Restrito ao usuário da sessão ativa.
   */
  async getProfile(): Promise<UserProfile | null> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return authService.fetchOrCreateProfile(user);
  },

  /**
   * Atualiza as informações de perfil do usuário autenticado no Supabase (public.profiles).
   * Suporta atualização de nome, telefone, envio de nova foto ou remoção da foto existente.
   */
  async updateProfile(data: {
    name?: string;
    phone?: string;
    avatarUrl?: string | null;
    avatarFile?: File | null;
    isPhotoRemoved?: boolean;
  }): Promise<UserProfile | null> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Usuário não autenticado.');
    }

    const userId = user.id;
    let newAvatarUrl: string | null | undefined = undefined;

    // Se for solicitada a remoção da foto de perfil
    if (data.isPhotoRemoved) {
      await this.removeAvatar(userId);
      newAvatarUrl = null;
    } else if (data.avatarFile) {
      // Se um novo arquivo de imagem foi fornecido para upload
      newAvatarUrl = await this.uploadAvatar(userId, data.avatarFile);
    } else if (data.avatarUrl !== undefined) {
      newAvatarUrl = data.avatarUrl;
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (data.name !== undefined) {
      updates.nome = data.name.trim();
    }
    if (data.phone !== undefined) {
      updates.telefone = data.phone.replace(/\D/g, '');
    }
    if (newAvatarUrl !== undefined) {
      updates.avatar_url = newAvatarUrl;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (updateError) {
      console.error('[Bora Supabase] Erro ao salvar public.profiles:', updateError.message);
      throw new Error('Não foi possível salvar seu perfil.');
    }

    // Sincroniza metadados no auth.users caso nome ou telefone tenham mudado
    if (data.name || data.phone) {
      try {
        await supabase.auth.updateUser({
          data: {
            ...(data.name ? { nome: data.name.trim() } : {}),
            ...(data.phone ? { telefone: data.phone.replace(/\D/g, '') } : {}),
          }
        });
      } catch (err: any) {
        console.warn('[Bora Supabase] Aviso ao atualizar user_metadata:', err?.message);
      }
    }

    return this.getProfile();
  },

  /**
   * Realiza o upload do arquivo para o bucket 'avatars' no Supabase Storage.
   * O caminho é estritamente restrito ao usuário autenticado: {userId}/avatar.{ext}
   */
  async uploadAvatar(userId: string, file: File): Promise<string> {
    const validation = this.validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error || 'Arquivo de imagem inválido.');
    }

    const rawExt = file.name.split('.').pop()?.toLowerCase();
    const ext = rawExt && ['jpg', 'jpeg', 'png', 'webp'].includes(rawExt) ? rawExt : 'webp';
    const filePath = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type || 'image/jpeg'
      });

    if (uploadError) {
      console.error('[Bora Supabase] Erro de upload no Storage:', uploadError.message);
      throw new Error('Não foi possível fazer o upload da foto. Tente novamente.');
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Parâmetro de timestamp para contornar o cache de imagens do navegador
    return `${publicUrl}?t=${Date.now()}`;
  },

  /**
   * Remove o avatar do usuário do Supabase Storage e desvincula a URL em public.profiles.
   */
  async removeAvatar(userId: string): Promise<void> {
    try {
      const { data: files } = await supabase.storage.from('avatars').list(userId);
      if (files && files.length > 0) {
        const filePaths = files.map(f => `${userId}/${f.name}`);
        await supabase.storage.from('avatars').remove(filePaths);
      }
    } catch (err) {
      console.warn('[Bora Supabase] Aviso ao remover arquivos de avatar do storage:', err);
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        avatar_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('[Bora Supabase] Erro ao limpar avatar_url em public.profiles:', error.message);
      throw new Error('Não foi possível remover a foto do perfil.');
    }
  },

  /**
   * Atualiza especificamente a foto de perfil do usuário.
   */
  async updateProfilePhoto(avatarFile: File): Promise<UserProfile | null> {
    return this.updateProfile({ avatarFile });
  },

  /**
   * Remove a foto de perfil do usuário (revertendo o avatar para as iniciais).
   */
  async removeProfilePhoto(): Promise<UserProfile | null> {
    return this.updateProfile({ isPhotoRemoved: true });
  },

  /**
   * Formata número de telefone celular para o formato padrão brasileiro:
   * (XX) XXXXX-XXXX ou (XX) XXXX-XXXX.
   */
  formatPhone(phone?: string | null): string {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');

    // Trata prefixo de DDI 55
    const nationalDigits = digits.length >= 12 && digits.startsWith('55')
      ? digits.slice(2)
      : digits;

    if (nationalDigits.length <= 2) {
      return nationalDigits.length > 0 ? `(${nationalDigits}` : '';
    }
    if (nationalDigits.length <= 6) {
      return `(${nationalDigits.slice(0, 2)}) ${nationalDigits.slice(2)}`;
    }
    if (nationalDigits.length <= 10) {
      return `(${nationalDigits.slice(0, 2)}) ${nationalDigits.slice(2, 6)}-${nationalDigits.slice(6)}`;
    }
    return `(${nationalDigits.slice(0, 2)}) ${nationalDigits.slice(2, 7)}-${nationalDigits.slice(7, 11)}`;
  },

  /**
   * Extrai as iniciais do nome do usuário para exibição no avatar quando não houver foto.
   * Exemplo: "Júlia Silva" -> "JS", "Maria" -> "MA"
   */
  getUserInitials(name?: string | null): string {
    if (!name || !name.trim()) return 'LU';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  },

  /**
   * Validação básica do arquivo de imagem selecionado no cliente (LGPD e integridade).
   * Aceita formatos comuns (JPG/JPEG, PNG, WEBP) com limite de tamanho de 5 MB.
   */
  validateImageFile(file: File): ProfileValidationResult {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return {
        valid: false,
        error: 'Formato inválido. Por favor, envie uma foto em JPG, PNG ou WEBP.'
      };
    }

    const maxSizeInBytes = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSizeInBytes) {
      return {
        valid: false,
        error: 'A foto selecionada ultrapassa o limite de 5 MB.'
      };
    }

    return { valid: true };
  }
};
