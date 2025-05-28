import { Opportunity } from '../models/DatabaseAdapter.js';

class SearchService {
  constructor() {
    this.defaultLimit = 50;
  }

  async search(query, options = {}) {
    const filters = {
      ...options,
      limit: options.limit || this.defaultLimit
    };

    return await Opportunity.search(query, filters);
  }

  async searchWithPagination(query, options = {}) {
    const filters = {
      ...options,
      limit: options.limit || this.defaultLimit,
      offset: options.offset || 0
    };

    const results = await Opportunity.search(query, filters);
    const total = await Opportunity.count(query, filters);

    return {
      data: results,
      total: total
    };
  }

  async getByKeywords(keywords, options = {}) {
    if (!keywords || keywords.length === 0) {
      return await this.search('', options);
    }

    // Join keywords with spaces for a broader search
    const query = keywords.join(' ');
    return await this.search(query, options);
  }

  async getActiveOpportunities(options = {}) {
    return await this.search('', { ...options, activeOnly: true });
  }

  async getByCategory(category, options = {}) {
    return await this.search('', { ...options, category });
  }

  async getByBudgetRange(minBudget, maxBudget, options = {}) {
    return await this.search('', { ...options, minBudget, maxBudget });
  }

  async getByProcuringEntity(entity, options = {}) {
    return await this.search(entity, options);
  }

  async getCategories() {
    return await Opportunity.getCategories();
  }

  async getStatistics() {
    return await Opportunity.getStatistics();
  }

  formatOpportunity(opportunity) {
    const closingDate = new Date(opportunity.closing_date);
    const now = new Date();
    const daysUntilClosing = Math.ceil((closingDate - now) / (1000 * 60 * 60 * 24));
    
    return {
      ...opportunity,
      formatted_budget: this.formatCurrency(opportunity.approved_budget, opportunity.currency),
      days_until_closing: daysUntilClosing,
      is_closing_soon: daysUntilClosing <= 7 && daysUntilClosing >= 0,
      is_expired: daysUntilClosing < 0
    };
  }

  formatCurrency(amount, currency = 'PHP') {
    if (!amount) return 'N/A';
    
    const formatter = new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return formatter.format(amount);
  }

  exportToCSV(opportunities) {
    const headers = [
      'Reference Number',
      'Title',
      'Procuring Entity',
      'Category',
      'Approved Budget',
      'Currency',
      'Publish Date',
      'Closing Date',
      'Status',
      'Days Until Closing',
      'RFQ Number',
      'Procurement Mode',
      'Funding Source',
      'Delivery Period',
      'Payment Terms',
      'Area of Delivery',
      'Pre-bid Conference',
      'Bid Submission Deadline',
      'Bid Opening Date',
      'Source URL'
    ];

    const rows = opportunities.map(opp => {
      const formatted = this.formatOpportunity(opp);
      return [
        opp.reference_number,
        `"${opp.title.replace(/"/g, '""')}"`,
        `"${opp.procuring_entity.replace(/"/g, '""')}"`,
        opp.category || '',
        opp.approved_budget || '',
        opp.currency || 'PHP',
        opp.publish_date || '',
        opp.closing_date || '',
        opp.status || '',
        formatted.days_until_closing,
        opp.rfq_number || '',
        opp.procurement_mode || '',
        opp.funding_source || '',
        opp.delivery_period || '',
        opp.payment_terms || '',
        opp.area_of_delivery || '',
        opp.pre_bid_conference || '',
        opp.bid_submission_deadline || '',
        opp.bid_opening_date || '',
        opp.source_url || ''
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}

export default SearchService;