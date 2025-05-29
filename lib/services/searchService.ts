import { getDatabase } from '../db';

export interface Opportunity {
  id: number;
  reference_number: string;
  title: string;
  procuring_entity: string;
  category: string;
  area_of_delivery: string;
  approved_budget: number;
  currency: string;
  closing_date: string;
  publish_date: string;
  solicitation_number?: string;
  trade_agreement?: string;
  procurement_mode?: string;
  classification?: string;
  funding_source?: string;
  delivery_period?: string;
  contact_person?: string;
  contact_designation?: string;
  contact_address?: string;
  contact_email?: string;
  contact_phone?: string;
  client_agency?: string;
  bid_supplements?: number;
  document_request_list?: number;
  pre_bid_conference?: string;
  bid_documents_fee?: string;
  bid_submission_deadline?: string;
  bid_opening_date?: string;
  date_published?: string;
  last_updated?: string;
  status?: string;
  description?: string;
  eligibility_requirements?: string;
  created_by?: string;
  bac_chairman?: string;
  bac_secretariat?: string;
  source_url?: string;
  detail_url?: string;
  [key: string]: any;
}

export interface SearchFilters {
  category?: string;
  areaOfDelivery?: string;
  minBudget?: number;
  maxBudget?: number;
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface FormattedOpportunity extends Opportunity {
  formatted_budget: string;
  days_until_closing: number;
  is_closing_soon: boolean;
  is_expired: boolean;
  hasItbDetails: boolean;
}

export class SearchService {
  private db = getDatabase();
  private defaultLimit = 50;

  async search(query: string, filters: SearchFilters = {}): Promise<Opportunity[]> {
    let sql = 'SELECT * FROM opportunities WHERE 1=1';
    const params: any = {};
    let paramIndex = 1;

    // Add search query
    if (query) {
      sql += ` AND (
        title LIKE $query${paramIndex} OR 
        procuring_entity LIKE $query${paramIndex}
      )`;
      params[`query${paramIndex}`] = `%${query}%`;
      paramIndex++;
    }

    // Add filters
    if (filters.category) {
      sql += ` AND category = $category`;
      params.category = filters.category;
    }

    if (filters.areaOfDelivery) {
      sql += ` AND area_of_delivery = $area`;
      params.area = filters.areaOfDelivery;
    }

    if (filters.minBudget !== undefined) {
      sql += ` AND approved_budget >= $minBudget`;
      params.minBudget = filters.minBudget;
    }

    if (filters.maxBudget !== undefined) {
      sql += ` AND approved_budget <= $maxBudget`;
      params.maxBudget = filters.maxBudget;
    }

    if (filters.activeOnly) {
      sql += ` AND closing_date > datetime('now')`;
    }

    // Add ordering
    sql += ` ORDER BY closing_date ASC`;

    // Add pagination
    const limit = filters.limit || this.defaultLimit;
    const offset = filters.offset || 0;
    sql += ` LIMIT ${limit} OFFSET ${offset}`;

    const stmt = this.db.prepare(sql);
    return stmt.all(params) as Opportunity[];
  }

  async count(query: string, filters: SearchFilters = {}): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM opportunities WHERE 1=1';
    const params: any = {};
    let paramIndex = 1;

    // Add search query
    if (query) {
      sql += ` AND (
        title LIKE $query${paramIndex} OR 
        procuring_entity LIKE $query${paramIndex}
      )`;
      params[`query${paramIndex}`] = `%${query}%`;
      paramIndex++;
    }

    // Add filters (same as search method)
    if (filters.category) {
      sql += ` AND category = $category`;
      params.category = filters.category;
    }

    if (filters.areaOfDelivery) {
      sql += ` AND area_of_delivery = $area`;
      params.area = filters.areaOfDelivery;
    }

    if (filters.minBudget !== undefined) {
      sql += ` AND approved_budget >= $minBudget`;
      params.minBudget = filters.minBudget;
    }

    if (filters.maxBudget !== undefined) {
      sql += ` AND approved_budget <= $maxBudget`;
      params.maxBudget = filters.maxBudget;
    }

    if (filters.activeOnly) {
      sql += ` AND closing_date > datetime('now')`;
    }

    const stmt = this.db.prepare(sql);
    const result = stmt.get(params) as { count: number };
    return result.count;
  }

  async getStatistics() {
    const stats = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN closing_date > datetime('now') THEN 1 END) as active,
        COUNT(DISTINCT category) as categories,
        COUNT(DISTINCT procuring_entity) as entities
      FROM opportunities
    `).get() as any;

    return stats;
  }

  async getCategories(): Promise<string[]> {
    const results = this.db.prepare(`
      SELECT DISTINCT category 
      FROM opportunities 
      WHERE category IS NOT NULL 
      ORDER BY category
    `).all() as { category: string }[];

    return results.map(r => r.category);
  }

  async getAreas(): Promise<string[]> {
    const results = this.db.prepare(`
      SELECT DISTINCT area_of_delivery 
      FROM opportunities 
      WHERE area_of_delivery IS NOT NULL 
      ORDER BY area_of_delivery
    `).all() as { area_of_delivery: string }[];

    return results.map(r => r.area_of_delivery);
  }

  formatOpportunity(opportunity: Opportunity): FormattedOpportunity {
    const closingDate = new Date(opportunity.closing_date);
    const now = new Date();
    const daysUntilClosing = Math.ceil((closingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // Check if opportunity has ITB details
    const hasItbDetails = !!(
      opportunity.procurement_mode ||
      opportunity.funding_source ||
      opportunity.delivery_period ||
      opportunity.contact_person ||
      opportunity.contact_email ||
      opportunity.contact_phone ||
      opportunity.contact_designation ||
      opportunity.contact_address ||
      opportunity.client_agency ||
      opportunity.pre_bid_conference ||
      opportunity.bid_documents_fee ||
      opportunity.bid_submission_deadline ||
      opportunity.bid_opening_date ||
      opportunity.trade_agreement ||
      opportunity.classification ||
      opportunity.date_published ||
      opportunity.solicitation_number ||
      opportunity.description ||
      opportunity.eligibility_requirements ||
      opportunity.bac_chairman ||
      opportunity.bac_secretariat ||
      opportunity.bid_supplements ||
      opportunity.document_request_list
    );
    
    return {
      ...opportunity,
      formatted_budget: this.formatCurrency(opportunity.approved_budget, opportunity.currency),
      days_until_closing: daysUntilClosing,
      is_closing_soon: daysUntilClosing <= 7 && daysUntilClosing >= 0,
      is_expired: daysUntilClosing < 0,
      hasItbDetails: hasItbDetails
    };
  }

  formatCurrency(amount: number | null, currency = 'PHP'): string {
    if (!amount) return 'N/A';
    
    const formatter = new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    
    return formatter.format(amount);
  }
}