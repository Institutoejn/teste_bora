import { Sale, Client, Brand } from '../types';
import { supabase } from './supabaseClient';

export interface SalesMetrics {
  totalSalesCount: number;
  totalSold: number;
  totalProfit: number;
  pendingAmount: number;
  paidAmount: number;
}

export const saleService = {
  /**
   * Busca as vendas do usuário autenticado diretamente em public.vendas.
   * Filtra estritamente pelo user_id autenticado via RLS / sessão ativa.
   */
  async fetchSales(userId?: string): Promise<Sale[]> {
    try {
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.warn('[saleService] Usuário não autenticado ao buscar vendas.');
          return [];
        }
        targetUserId = user.id;
      }

      const { data, error } = await supabase
        .from('vendas')
        .select('*')
        .eq('user_id', targetUserId)
        .order('data_venda', { ascending: false });

      if (error) {
        console.error('[saleService] Erro ao carregar vendas do Supabase:', error);
        throw error;
      }

      if (!data) return [];

      return data.map(row => ({
        id: row.id,
        clientId: row.cliente_id,
        brandId: row.marca_id,
        amount: typeof row.valor_venda === 'number' ? row.valor_venda : parseFloat(row.valor_venda) || 0,
        cost: typeof row.custo === 'number' ? row.custo : parseFloat(row.custo) || 0,
        profit: typeof row.lucro === 'number' ? row.lucro : parseFloat(row.lucro) || 0,
        dueDate: row.data_vencimento || '',
        status: (row.status === 'paid' || row.status === 'pago') ? 'paid' : 'pending',
        createdAt: row.data_venda
          ? row.data_venda.split('T')[0]
          : (row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
      }));
    } catch (err) {
      console.error('[saleService] Falha na requisição fetchSales:', err);
      throw err;
    }
  },

  /**
   * Registra uma nova venda em public.vendas associada ao user_id autenticado.
   */
  async createSale(data: Omit<Sale, 'id'>, userId?: string): Promise<Sale> {
    try {
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error('Usuário não autenticado.');
        }
        targetUserId = user.id;
      }

      const payload = {
        user_id: targetUserId,
        cliente_id: data.clientId,
        marca_id: data.brandId,
        valor_venda: data.amount,
        custo: data.cost,
        lucro: data.profit,
        status: data.status,
        data_vencimento: data.dueDate,
        data_venda: data.createdAt && data.createdAt.includes('T')
          ? data.createdAt
          : (data.createdAt ? `${data.createdAt}T12:00:00.000Z` : new Date().toISOString()),
      };

      const { data: inserted, error } = await supabase
        .from('vendas')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('[saleService] Erro ao inserir venda no Supabase:', error);
        throw error;
      }

      return {
        id: inserted.id,
        clientId: inserted.cliente_id,
        brandId: inserted.marca_id,
        amount: typeof inserted.valor_venda === 'number' ? inserted.valor_venda : parseFloat(inserted.valor_venda) || 0,
        cost: typeof inserted.custo === 'number' ? inserted.custo : parseFloat(inserted.custo) || 0,
        profit: typeof inserted.lucro === 'number' ? inserted.lucro : parseFloat(inserted.lucro) || 0,
        dueDate: inserted.data_vencimento || '',
        status: (inserted.status === 'paid' || inserted.status === 'pago') ? 'paid' : 'pending',
        createdAt: inserted.data_venda
          ? inserted.data_venda.split('T')[0]
          : (inserted.created_at ? inserted.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
      };
    } catch (err) {
      console.error('[saleService] Falha ao registrar venda:', err);
      throw err;
    }
  },

  /**
   * Atualiza os dados de uma venda existente em public.vendas.
   */
  async updateSale(id: string, data: Partial<Sale>, userId?: string): Promise<Sale> {
    try {
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error('Usuário não autenticado.');
        }
        targetUserId = user.id;
      }

      const updates: Record<string, any> = {};
      if (data.clientId) updates.cliente_id = data.clientId;
      if (data.brandId) updates.marca_id = data.brandId;
      if (data.amount !== undefined) updates.valor_venda = data.amount;
      if (data.cost !== undefined) updates.custo = data.cost;
      if (data.profit !== undefined) updates.lucro = data.profit;
      if (data.status !== undefined) updates.status = data.status;
      if (data.dueDate !== undefined) updates.data_vencimento = data.dueDate;
      if (data.createdAt !== undefined) {
        updates.data_venda = data.createdAt.includes('T') ? data.createdAt : `${data.createdAt}T12:00:00.000Z`;
      }

      const { data: updated, error } = await supabase
        .from('vendas')
        .update(updates)
        .eq('id', id)
        .eq('user_id', targetUserId)
        .select()
        .single();

      if (error) {
        console.error('[saleService] Erro ao atualizar venda no Supabase:', error);
        throw error;
      }

      return {
        id: updated.id,
        clientId: updated.cliente_id,
        brandId: updated.marca_id,
        amount: typeof updated.valor_venda === 'number' ? updated.valor_venda : parseFloat(updated.valor_venda) || 0,
        cost: typeof updated.custo === 'number' ? updated.custo : parseFloat(updated.custo) || 0,
        profit: typeof updated.lucro === 'number' ? updated.lucro : parseFloat(updated.lucro) || 0,
        dueDate: updated.data_vencimento || '',
        status: (updated.status === 'paid' || updated.status === 'pago') ? 'paid' : 'pending',
        createdAt: updated.data_venda
          ? updated.data_venda.split('T')[0]
          : (updated.created_at ? updated.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
      };
    } catch (err) {
      console.error('[saleService] Falha ao atualizar venda:', err);
      throw err;
    }
  },

  /**
   * Alterna o status da venda entre 'paid' e 'pending' no Supabase.
   */
  async toggleSaleStatus(id: string, newStatus: 'paid' | 'pending', userId?: string): Promise<Sale> {
    try {
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error('Usuário não autenticado.');
        }
        targetUserId = user.id;
      }

      const { data: updated, error } = await supabase
        .from('vendas')
        .update({ status: newStatus })
        .eq('id', id)
        .eq('user_id', targetUserId)
        .select()
        .single();

      if (error) {
        console.error('[saleService] Erro ao alternar status da venda no Supabase:', error);
        throw error;
      }

      return {
        id: updated.id,
        clientId: updated.cliente_id,
        brandId: updated.marca_id,
        amount: typeof updated.valor_venda === 'number' ? updated.valor_venda : parseFloat(updated.valor_venda) || 0,
        cost: typeof updated.custo === 'number' ? updated.custo : parseFloat(updated.custo) || 0,
        profit: typeof updated.lucro === 'number' ? updated.lucro : parseFloat(updated.lucro) || 0,
        dueDate: updated.data_vencimento || '',
        status: (updated.status === 'paid' || updated.status === 'pago') ? 'paid' : 'pending',
        createdAt: updated.data_venda
          ? updated.data_venda.split('T')[0]
          : (updated.created_at ? updated.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
      };
    } catch (err) {
      console.error('[saleService] Falha ao alternar status da venda:', err);
      throw err;
    }
  },

  /**
   * Exclui uma venda pertencente ao usuário autenticado.
   */
  async deleteSale(id: string, userId?: string): Promise<void> {
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
        .from('vendas')
        .delete()
        .eq('id', id)
        .eq('user_id', targetUserId);

      if (error) {
        console.error('[saleService] Erro ao excluir venda do Supabase:', error);
        throw error;
      }
    } catch (err) {
      console.error('[saleService] Falha ao excluir venda:', err);
      throw err;
    }
  },

  /**
   * Calcula métricas contextuais a partir do estado atual das vendas em memória.
   * Total de vendas, total vendido, lucro total e valor pendente.
   */
  calculateSalesMetrics(sales: Sale[]): SalesMetrics {
    const totalSalesCount = sales.length;
    const totalSold = sales.reduce((sum, s) => sum + s.amount, 0);
    const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
    const pendingAmount = sales
      .filter(s => s.status === 'pending')
      .reduce((sum, s) => sum + s.amount, 0);
    const paidAmount = sales
      .filter(s => s.status === 'paid')
      .reduce((sum, s) => sum + s.amount, 0);

    return {
      totalSalesCount,
      totalSold,
      totalProfit,
      pendingAmount,
      paidAmount,
    };
  },

  /**
   * Busca vendas pelo nome do cliente ou da marca.
   */
  searchSales(sales: Sale[], clients: Client[], brands: Brand[], query: string): Sale[] {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return sales;

    return sales.filter(sale => {
      const client = clients.find(c => c.id === sale.clientId);
      const brand = brands.find(b => b.id === sale.brandId);

      const clientName = client ? client.name.toLowerCase() : '';
      const brandName = brand ? brand.name.toLowerCase() : '';

      return clientName.includes(cleanQuery) || brandName.includes(cleanQuery);
    });
  },

  /**
   * Formata valores monetários para o padrão Real Brasileiro (pt-BR).
   */
  formatCurrency(value: number): string {
    return `R$ ${value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  },

  /**
   * Formata data para o padrão DD/MM/AAAA brasileiro.
   */
  formatDate(dateString?: string | null): string {
    if (!dateString) return 'Sem data';
    try {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  },

  /**
   * Retorna uma venda específica pelo seu identificador.
   */
  getSaleById(sales: Sale[], id: string): Sale | undefined {
    return sales.find(s => s.id === id);
  },

  /**
   * Ordena vendas pela data mais recente (prioriza createdAt, depois dueDate).
   */
  sortSalesByDate(sales: Sale[]): Sale[] {
    return [...sales].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.dueDate).getTime();
      const dateB = new Date(b.createdAt || b.dueDate).getTime();
      return dateB - dateA;
    });
  },
};
