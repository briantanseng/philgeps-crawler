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
  
  // ITB Fields (Invitation to Bid)
  itb_solicitation_number?: string;
  itb_trade_agreement?: string;
  itb_procurement_mode?: string;
  itb_classification?: string;
  itb_category?: string;
  itb_approved_budget?: number;
  itb_delivery_period?: string;
  itb_client_agency?: string;
  itb_contact_person?: string;
  itb_contact_designation?: string;
  itb_contact_address?: string;
  itb_contact_phone?: string;
  itb_contact_email?: string;
  itb_area_of_delivery?: string;
  itb_date_posted?: string;
  itb_date_last_updated?: string;
  itb_closing_date?: string;
  itb_opening_date?: string;
  itb_pre_bid_conference?: string;
  itb_description?: string;
  itb_eligibility?: string;
  itb_created_by?: string;
  itb_status?: string;
  itb_bid_supplements?: number;
  itb_document_request_list?: number;
  itb_bidding_documents?: string;
  itb_bac_chairman?: string;
  itb_bac_secretariat?: string;
  
  // RFQ Fields
  itb_has_active_rfq?: string;
  rfq_solicitation_number?: string;
  rfq_title?: string;
  rfq_status?: string;
  rfq_open_date?: string;
  rfq_close_date?: string;
  rfq_description?: string;
  rfq_request_type?: string;
  rfq_published_date?: string;
  rfq_notice_type?: string;
  rfq_business_category?: string;
  rfq_approved_budget?: string;
  rfq_submission_deadline?: string;
  rfq_special_instructions?: string;
  rfq_funding_source?: string;
  rfq_reason?: string;
  rfq_area_of_delivery?: string;
  rfq_delivery_date?: string;
  rfq_contact_person?: string;
  rfq_contact_number?: string;
  rfq_required_documents?: string;
  rfq_attachments?: string;
  rfq_line_items?: string;
  rfq_trade_agreement?: string;
  rfq_pre_procurement_conference?: string;
  rfq_pre_bid_conference?: string;
  rfq_procuring_entity_org_id?: string;
  rfq_client_agency_org_id?: string;
  rfq_client_agency?: string;
  
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
  hasRfqDetails: boolean;
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
      opportunity.itb_solicitation_number ||
      opportunity.itb_procurement_mode ||
      opportunity.itb_trade_agreement ||
      opportunity.itb_classification ||
      opportunity.itb_category ||
      opportunity.itb_approved_budget ||
      opportunity.itb_delivery_period ||
      opportunity.itb_client_agency ||
      opportunity.itb_contact_person ||
      opportunity.itb_contact_email ||
      opportunity.itb_contact_phone ||
      opportunity.itb_contact_designation ||
      opportunity.itb_contact_address ||
      opportunity.itb_area_of_delivery ||
      opportunity.itb_pre_bid_conference ||
      opportunity.itb_bidding_documents ||
      opportunity.itb_date_posted ||
      opportunity.itb_date_last_updated ||
      opportunity.itb_closing_date ||
      opportunity.itb_opening_date ||
      opportunity.itb_description ||
      opportunity.itb_eligibility ||
      opportunity.itb_created_by ||
      opportunity.itb_status ||
      opportunity.itb_bac_chairman ||
      opportunity.itb_bac_secretariat ||
      opportunity.itb_bid_supplements ||
      opportunity.itb_document_request_list
    );
    
    // Check if opportunity has RFQ details
    const hasRfqDetails = !!(
      opportunity.itb_has_active_rfq === 'true' ||
      opportunity.rfq_solicitation_number ||
      opportunity.rfq_title ||
      opportunity.rfq_status ||
      opportunity.rfq_description ||
      opportunity.rfq_approved_budget ||
      opportunity.rfq_submission_deadline ||
      opportunity.rfq_special_instructions ||
      opportunity.rfq_funding_source ||
      opportunity.rfq_contact_person ||
      opportunity.rfq_contact_number ||
      opportunity.rfq_required_documents ||
      opportunity.rfq_line_items ||
      opportunity.rfq_area_of_delivery ||
      opportunity.rfq_delivery_date
    );
    
    return {
      ...opportunity,
      formatted_budget: this.formatCurrency(opportunity.approved_budget, opportunity.currency),
      days_until_closing: daysUntilClosing,
      is_closing_soon: daysUntilClosing <= 7 && daysUntilClosing >= 0,
      is_expired: daysUntilClosing < 0,
      hasItbDetails: hasItbDetails,
      hasRfqDetails: hasRfqDetails
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