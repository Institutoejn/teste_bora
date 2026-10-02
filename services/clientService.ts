import { Client, Sale } from '../types';
import { supabase } from './supabaseClient';

export interface ClientMetrics {
  totalPurchased: number;
  totalOutstanding: number;
  salesCount: number;
  lastPurchaseDate: string | null;
  salesHistory: Sale[];
}

export const clientService = {
  /**
   * Busca os clientes do usuário autenticado diretamente em public.clientes.
   * Filtra estritamente pelo user_id autenticado via RLS / sessão ativa.
   */
  async fetchClients(userId?: string): Promise<Client[]> {
    try {
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.warn('[clientService] Usuário não autenticado ao buscar clientes.');
          return [];
        }
        targetUserId = user.id;
      }

      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[clientService] Erro ao carregar clientes do Supabase:', error);
        throw error;
      }

      if (!data) return [];

      return data.map(row => ({
        id: row.id,
        name: row.nome || '',
        phone: row.telefone || '',
        totalDue: 0, // Recalculado dinamicamente com base nas vendas pendentes reais
      }));
    } catch (err) {
      console.error('[clientService] Falha na requisição fetchClients:', err);
      throw err;
    }
  },

  /**
   * Cadastra um novo cliente em public.clientes associado ao user_id autenticado.
   */
  async createClient(
    clientData: { name: string; phone: string; email?: string; observacao?: string },
    userId?: string
  ): Promise<Client> {
    try {
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error('Usuário não autenticado.');
        }
        targetUserId = user.id;
      }

      const payload: Record<string, any> = {
        user_id: targetUserId,
        nome: clientData.name.trim(),
        telefone: clientData.phone.replace(/\D/g, '') || clientData.phone.trim(),
      };
      if (clientData.email) payload.email = clientData.email.trim();
      if (clientData.observacao) payload.observacao = clientData.observacao.trim();

      const { data: inserted, error } = await supabase
        .from('clientes')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('[clientService] Erro ao inserir cliente no Supabase:', error);
        throw error;
      }

      return {
        id: inserted.id,
        name: inserted.nome,
        phone: inserted.telefone,
        totalDue: 0,
      };
    } catch (err) {
      console.error('[clientService] Falha ao cadastrar cliente:', err);
      throw err;
    }
  },

  /**
   * Atualiza os dados de um cliente existente em public.clientes.
   */
  async updateClient(
    id: string,
    clientData: { name: string; phone: string; email?: string; observacao?: string },
    userId?: string
  ): Promise<Client> {
    try {
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error('Usuário não autenticado.');
        }
        targetUserId = user.id;
      }

      const updates: Record<string, any> = {
        nome: clientData.name.trim(),
        telefone: clientData.phone.replace(/\D/g, '') || clientData.phone.trim(),
      };
      if (clientData.email !== undefined) updates.email = clientData.email ? clientData.email.trim() : null;
      if (clientData.observacao !== undefined) updates.observacao = clientData.observacao ? clientData.observacao.trim() : null;

      const { data: updated, error } = await supabase
        .from('clientes')
        .update(updates)
        .eq('id', id)
        .eq('user_id', targetUserId)
        .select()
        .single();

      if (error) {
        console.error('[clientService] Erro ao atualizar cliente no Supabase:', error);
        throw error;
      }

      return {
        id: updated.id,
        name: updated.nome,
        phone: updated.telefone,
        totalDue: 0,
      };
    } catch (err) {
      console.error('[clientService] Falha ao atualizar cliente:', err);
      throw err;
    }
  },

  /**
   * Exclui um cliente em public.clientes pertencente ao usuário autenticado.
   */
  async deleteClient(id: string, userId?: string): Promise<void> {
    try {
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error('Usuário não autenticado.');
        }
        targetUserId = user.id;
      }

      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id)
        .eq('user_id', targetUserId);

      if (error) {
        console.error('[clientService] Erro ao excluir cliente do Supabase:', error);
        throw error;
      }
    } catch (err) {
      console.error('[clientService] Falha ao excluir cliente:', err);
      throw err;
    }
  },

  /**
   * Recalcula o saldo devedor (totalDue) de cada cliente com base nas vendas pendentes reais.
   */
  recalculateClientsTotalDue(clients: Client[], sales: Sale[]): Client[] {
    const pendingByClient: Record<string, number> = {};
    for (const s of sales) {
      if (s.status === 'pending') {
        pendingByClient[s.clientId] = (pendingByClient[s.clientId] || 0) + s.amount;
      }
    }
    return clients.map(c => ({
      ...c,
      totalDue: pendingByClient[c.id] || 0,
    }));
  },

  /**
   * Calcula métricas financeiras e de relacionamento de um cliente
   * baseadas no estado atual das vendas.
   */
  getClientMetrics(client: Client, sales: Sale[]): ClientMetrics {
    const clientSales = sales.filter(s => s.clientId === client.id);

    // Total comprado (soma de todos os valores das vendas registradas para o cliente)
    const totalPurchased = clientSales.reduce((acc, s) => acc + s.amount, 0);

    // Total em aberto (prioriza client.totalDue, ou calcula pendências caso haja)
    const totalOutstanding = typeof client.totalDue === 'number' && client.totalDue >= 0
      ? client.totalDue
      : clientSales.filter(s => s.status === 'pending').reduce((acc, s) => acc + s.amount, 0);

    // Quantidade de vendas
    const salesCount = clientSales.length;

    // Histórico ordenado pela data mais recente
    const sortedSales = [...clientSales].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.dueDate).getTime();
      const dateB = new Date(b.createdAt || b.dueDate).getTime();
      return dateB - dateA;
    });

    // Data da última compra
    const lastPurchaseDate = sortedSales.length > 0
      ? sortedSales[0].createdAt || sortedSales[0].dueDate
      : null;

    return {
      totalPurchased,
      totalOutstanding,
      salesCount,
      lastPurchaseDate,
      salesHistory: sortedSales,
    };
  },

  /**
   * Busca clientes por nome ou número de telefone (filtragem imediata).
   */
  searchClients(clients: Client[], query: string): Client[] {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return clients;

    const queryDigits = cleanQuery.replace(/\D/g, '');

    return clients.filter(client => {
      const matchName = client.name.toLowerCase().includes(cleanQuery);
      const clientDigits = (client.phone || '').replace(/\D/g, '');
      const matchPhone = queryDigits.length > 0 
        ? clientDigits.includes(queryDigits) 
        : (client.phone || '').toLowerCase().includes(cleanQuery);

      return matchName || matchPhone;
    });
  },

  /**
   * Formata número de telefone para padrão amigável (BR).
   */
  formatPhone(phone: string): string {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');

    // Se começa com DDI 55 (ex: 5511999999999), ajusta para visualização nacional
    const nationalDigits = digits.length >= 12 && digits.startsWith('55')
      ? digits.slice(2)
      : digits;

    if (nationalDigits.length === 11) {
      return nationalDigits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    }
    if (nationalDigits.length === 10) {
      return nationalDigits.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    }
    return phone;
  },

  /**
   * Verifica se o cliente possui débitos pendentes.
   */
  hasOutstanding(client: Client): boolean {
    return (client.totalDue || 0) > 0;
  }
};
