import db from './db.js';

class Opportunity {
  static async upsert(data) {
    const existing = await db('opportunities')
      .where('reference_number', data.reference_number)
      .first();
    
    let isNew = false;
    let isUpdated = false;
    
    if (existing) {
      // Update existing record
      await db('opportunities')
        .where('reference_number', data.reference_number)
        .update({
          ...data,
          updated_at: db.fn.now()
        });
      isUpdated = true;
    } else {
      // Insert new record
      await db('opportunities').insert(data);
      isNew = true;
    }
    
    return { isNew, isUpdated };
  }
  
  static async insert(data) {
    // For backward compatibility
    return await this.upsert(data);
  }
  
  static async findByReferenceNumber(referenceNumber) {
    return await db('opportunities')
      .where('reference_number', referenceNumber)
      .first();
  }
  
  static async findAll() {
    return await db('opportunities')
      .orderBy('closing_date', 'desc')
      .select();
  }
  
  static async search(filters = {}) {
    let query = db('opportunities');
    
    if (filters.keyword) {
      query = query.where(function() {
        this.where('title', 'like', `%${filters.keyword}%`)
          .orWhere('procuring_entity', 'like', `%${filters.keyword}%`)
          .orWhere('reference_number', 'like', `%${filters.keyword}%`);
      });
    }
    
    if (filters.category) {
      query = query.where(function() {
        this.where('category', filters.category)
          .orWhere('itb_category', filters.category);
      });
    }
    
    if (filters.area) {
      query = query.where(function() {
        this.where('area_of_delivery', filters.area)
          .orWhere('itb_area_of_delivery', filters.area);
      });
    }
    
    if (filters.budgetMin) {
      query = query.where('approved_budget', '>=', filters.budgetMin);
    }
    
    if (filters.budgetMax) {
      query = query.where('approved_budget', '<=', filters.budgetMax);
    }
    
    if (filters.status) {
      if (filters.status === 'active') {
        query = query.where('closing_date', '>=', db.fn.now());
      } else if (filters.status === 'closed') {
        query = query.where('closing_date', '<', db.fn.now());
      }
    }
    
    query = query.orderBy('closing_date', 'desc');
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters.offset) {
      query = query.offset(filters.offset);
    }
    
    return await query.select();
  }
  
  static async getStatistics() {
    const stats = {
      totalOpportunities: 0,
      activeOpportunities: 0,
      totalCategories: 0,
      totalProcuringEntities: 0
    };
    
    // Total opportunities
    const total = await db('opportunities').count('* as count').first();
    stats.totalOpportunities = total.count;
    
    // Active opportunities
    const active = await db('opportunities')
      .where('closing_date', '>=', db.fn.now())
      .count('* as count')
      .first();
    stats.activeOpportunities = active.count;
    
    // Total categories
    const categories = await db('opportunities')
      .select(db.raw('COUNT(DISTINCT COALESCE(category, itb_category)) as count'))
      .whereNotNull('category')
      .orWhereNotNull('itb_category')
      .first();
    stats.totalCategories = categories.count;
    
    // Total procuring entities
    const entities = await db('opportunities')
      .countDistinct('procuring_entity as count')
      .first();
    stats.totalProcuringEntities = entities.count;
    
    return stats;
  }
}

export default Opportunity;