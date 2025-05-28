import db from './db.js';

class Opportunity {
  static async insert(opportunity) {
    // Ensure all required fields have default values
    const data = {
      reference_number: opportunity.reference_number,
      title: opportunity.title,
      procuring_entity: opportunity.procuring_entity || 'Not specified',
      category: opportunity.category || null,
      approved_budget: opportunity.approved_budget || null,
      currency: opportunity.currency || 'PHP',
      publish_date: opportunity.publish_date || null,
      closing_date: opportunity.closing_date || null,
      status: opportunity.status || 'Open',
      description: opportunity.description || null,
      contact_person: opportunity.contact_person || null,
      contact_details: opportunity.contact_details || null,
      bid_documents: opportunity.bid_documents || null,
      source_url: opportunity.source_url || null,
      detail_url: opportunity.detail_url || null
    };
    
    try {
      // Use upsert (insert or update)
      const existing = await db('opportunities')
        .where('reference_number', data.reference_number)
        .first();
      
      if (existing) {
        await db('opportunities')
          .where('reference_number', data.reference_number)
          .update({
            ...data,
            updated_at: db.fn.now()
          });
        return { action: 'updated', id: existing.id };
      } else {
        const [id] = await db('opportunities').insert(data).returning('id');
        return { action: 'inserted', id };
      }
    } catch (error) {
      console.error('Error inserting opportunity:', error);
      throw error;
    }
  }

  static async findByReferenceNumber(referenceNumber) {
    return await db('opportunities')
      .where('reference_number', referenceNumber)
      .first();
  }

  static async search(query, filters = {}) {
    let queryBuilder = db('opportunities');

    if (query) {
      queryBuilder = queryBuilder.where(function() {
        this.where('title', 'like', `%${query}%`)
          .orWhere('description', 'like', `%${query}%`)
          .orWhere('procuring_entity', 'like', `%${query}%`);
      });
    }

    if (filters.category) {
      queryBuilder = queryBuilder.where('category', filters.category);
    }

    if (filters.minBudget) {
      queryBuilder = queryBuilder.where('approved_budget', '>=', filters.minBudget);
    }

    if (filters.maxBudget) {
      queryBuilder = queryBuilder.where('approved_budget', '<=', filters.maxBudget);
    }

    if (filters.status) {
      queryBuilder = queryBuilder.where('status', filters.status);
    }

    if (filters.activeOnly) {
      queryBuilder = queryBuilder.where('closing_date', '>', db.fn.now());
    }

    queryBuilder = queryBuilder.orderBy('closing_date', 'asc');

    if (filters.limit) {
      queryBuilder = queryBuilder.limit(filters.limit);
    }

    if (filters.offset) {
      queryBuilder = queryBuilder.offset(filters.offset);
    }

    return await queryBuilder;
  }

  static async count(query = '', filters = {}) {
    let queryBuilder = db('opportunities');

    if (query) {
      queryBuilder = queryBuilder.where(function() {
        this.where('title', 'like', `%${query}%`)
          .orWhere('description', 'like', `%${query}%`)
          .orWhere('procuring_entity', 'like', `%${query}%`);
      });
    }

    if (filters.category) {
      queryBuilder = queryBuilder.where('category', filters.category);
    }

    if (filters.minBudget) {
      queryBuilder = queryBuilder.where('approved_budget', '>=', filters.minBudget);
    }

    if (filters.maxBudget) {
      queryBuilder = queryBuilder.where('approved_budget', '<=', filters.maxBudget);
    }

    if (filters.activeOnly) {
      queryBuilder = queryBuilder.where('closing_date', '>', db.fn.now());
    }

    const result = await queryBuilder.count('* as count').first();
    return result.count;
  }

  static async getAll(limit = 100, offset = 0) {
    return await db('opportunities')
      .orderBy('closing_date', 'asc')
      .limit(limit)
      .offset(offset);
  }

  static async getActive() {
    return await db('opportunities')
      .where('closing_date', '>', db.fn.now())
      .orderBy('closing_date', 'asc');
  }

  static async getCategories() {
    const results = await db('opportunities')
      .distinct('category')
      .whereNotNull('category')
      .orderBy('category');
    
    return results.map(row => row.category);
  }

  static async getStatistics() {
    const result = await db('opportunities')
      .select(
        db.raw('COUNT(*) as total'),
        db.raw('COUNT(CASE WHEN closing_date > ? THEN 1 END) as active', [new Date()]),
        db.raw('COUNT(DISTINCT category) as categories'),
        db.raw('COUNT(DISTINCT procuring_entity) as entities')
      )
      .first();
    
    return {
      total: parseInt(result.total) || 0,
      active: parseInt(result.active) || 0,
      categories: parseInt(result.categories) || 0,
      entities: parseInt(result.entities) || 0
    };
  }
}

export default Opportunity;