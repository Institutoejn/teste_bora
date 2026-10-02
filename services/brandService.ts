import { Brand, Sale } from '../types';
import { supabase } from './supabaseClient';

export interface BrandMetrics {
  totalSold: number;
  totalProfit: number;
  salesCount: number;
  lastSaleDate: string | null;
  salesHistory: Sale[];
}

export const brandService = {
  /**
   * Busca as marcas do usuário autenticado em public.marcas.
   * Filtra estritamente pelo user_id do usuário logado via RLS / sessão ativa.
   */
  async fetchBrands(userId?: string): Promise<Brand[]> {
    try {
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.warn('[brandService] Usuário não autenticado ao buscar marcas.');
          return [];
        }
        targetUserId = user.id;
      }

      const { data, error } = await supabase
        .from('marcas')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[brandService] Erro ao carregar marcas do Supabase:', error);
        throw error;
      }

      if (!data) return [];

      return data.map(row => ({
        id: row.id,
        name: row.nome || '',
        commission: typeof row.percentual_comissao === 'number'
          ? row.percentual_comissao
          : parseFloat(row.percentual_comissao) || 0.3,
        color: row.cor || '#7A1C1D',
      }));
    } catch (err) {
      console.error('[brandService] Falha na requisição fetchBrands:', err);
      throw err;
    }
  },

  /**
   * Cadastra uma nova marca em public.marcas associada ao user_id autenticado.
   */
  async createBrand(
    brandData: { name: string; commission: number; color: string },
    userId?: string
  ): Promise<Brand> {
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
        nome: brandData.name.trim(),
        percentual_comissao: brandData.commission,
        cor: brandData.color || '#7A1C1D',
      };

      const { data: inserted, error } = await supabase
        .from('marcas')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('[brandService] Erro ao inserir marca no Supabase:', error);
        throw error;
      }

      return {
        id: inserted.id,
        name: inserted.nome,
        commission: typeof inserted.percentual_comissao === 'number'
          ? inserted.percentual_comissao
          : parseFloat(inserted.percentual_comissao) || 0.3,
        color: inserted.cor || '#7A1C1D',
      };
    } catch (err) {
      console.error('[brandService] Falha ao cadastrar marca:', err);
      throw err;
    }
  },

  /**
   * Atualiza os dados de uma marca existente em public.marcas.
   */
  async updateBrand(
    id: string,
    brandData: { name: string; commission: number; color: string },
    userId?: string
  ): Promise<Brand> {
    try {
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error('Usuário não autenticado.');
        }
        targetUserId = user.id;
      }

      const updates = {
        nome: brandData.name.trim(),
        percentual_comissao: brandData.commission,
        cor: brandData.color,
      };

      const { data: updated, error } = await supabase
        .from('marcas')
        .update(updates)
        .eq('id', id)
        .eq('user_id', targetUserId)
        .select()
        .single();

      if (error) {
        console.error('[brandService] Erro ao atualizar marca no Supabase:', error);
        throw error;
      }

      return {
        id: updated.id,
        name: updated.nome,
        commission: typeof updated.percentual_comissao === 'number'
          ? updated.percentual_comissao
          : parseFloat(updated.percentual_comissao) || 0.3,
        color: updated.cor || '#7A1C1D',
      };
    } catch (err) {
      console.error('[brandService] Falha ao atualizar marca:', err);
      throw err;
    }
  },

  /**
   * Exclui uma marca pertencente ao usuário autenticado.
   */
  async deleteBrand(id: string, userId?: string): Promise<void> {
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
        .from('marcas')
        .delete()
        .eq('id', id)
        .eq('user_id', targetUserId);

      if (error) {
        console.error('[brandService] Erro ao excluir marca do Supabase:', error);
        throw error;
      }
    } catch (err) {
      console.error('[brandService] Falha ao excluir marca:', err);
      throw err;
    }
  },

  /**
   * Calcula métricas de desempenho e histórico de vendas de uma marca
   * a partir do estado de vendas.
   */
  getBrandMetrics(brand: Brand, sales: Sale[]): BrandMetrics {
    const brandSales = sales.filter(s => s.brandId === brand.id);

    // Total vendido (soma do valor das vendas registradas para esta marca)
    const totalSold = brandSales.reduce((acc, s) => acc + s.amount, 0);

    // Total de lucro obtido com a marca
    const totalProfit = brandSales.reduce((acc, s) => acc + s.profit, 0);

    // Quantidade total de vendas
    const salesCount = brandSales.length;

    // Histórico ordenado pela data mais recente (createdAt ou dueDate)
    const sortedSales = [...brandSales].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.dueDate).getTime();
      const dateB = new Date(b.createdAt || b.dueDate).getTime();
      return dateB - dateA;
    });

    // Data da última venda realizada
    const lastSaleDate = sortedSales.length > 0
      ? sortedSales[0].createdAt || sortedSales[0].dueDate
      : null;

    return {
      totalSold,
      totalProfit,
      salesCount,
      lastSaleDate,
      salesHistory: sortedSales,
    };
  },

  /**
   * Busca marcas por nome (filtragem imediata).
   */
  searchBrands(brands: Brand[], query: string): Brand[] {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return brands;
    return brands.filter(b => b.name.toLowerCase().includes(cleanQuery));
  },

  /**
   * Formata a taxa de comissão para exibição amigável (ex: 0.3 -> 30%).
   */
  formatCommission(commission: number): string {
    const pct = Math.round(commission * 100);
    return `${pct}%`;
  },
};
