import db from './database.js';

class Opportunity {
  static insert(opportunity) {
    // Ensure all required fields have default values
    const data = {
      reference_number: opportunity.reference_number,
      title: opportunity.title,
      procuring_entity: opportunity.procuring_entity || 'Not specified',
      
      // Basic Information
      solicitation_number: opportunity.solicitation_number || null,
      area_of_delivery: opportunity.area_of_delivery || null,
      
      // Procurement Details
      trade_agreement: opportunity.trade_agreement || null,
      procurement_mode: opportunity.procurement_mode || null,
      classification: opportunity.classification || null,
      category: opportunity.category || null,
      
      // Budget and Timeline
      approved_budget: opportunity.approved_budget || null,
      currency: opportunity.currency || 'PHP',
      delivery_period: opportunity.delivery_period || null,
      
      // Dates
      publish_date: opportunity.publish_date || null,
      closing_date: opportunity.closing_date || null,
      date_published: opportunity.date_published || null,
      last_updated: opportunity.last_updated || null,
      
      // Contact Information
      contact_person: opportunity.contact_person || null,
      contact_designation: opportunity.contact_designation || null,
      contact_address: opportunity.contact_address || null,
      contact_phone: opportunity.contact_phone || null,
      contact_email: opportunity.contact_email || null,
      client_agency: opportunity.client_agency || null,
      
      // Bid Details
      bid_supplements: opportunity.bid_supplements || 0,
      document_request_list: opportunity.document_request_list || 0,
      bid_documents_fee: opportunity.bid_documents_fee || null,
      bid_submission_deadline: opportunity.bid_submission_deadline || null,
      bid_opening_date: opportunity.bid_opening_date || null,
      pre_bid_conference: opportunity.pre_bid_conference || null,
      
      // Additional Information
      status: opportunity.status || 'Open',
      description: opportunity.description || null,
      eligibility_requirements: opportunity.eligibility_requirements || null,
      created_by: opportunity.created_by || null,
      bac_chairman: opportunity.bac_chairman || null,
      bac_secretariat: opportunity.bac_secretariat || null,
      
      // URLs and metadata
      source_url: opportunity.source_url || null,
      detail_url: opportunity.detail_url || null
    };
    
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO opportunities (
        reference_number, title, procuring_entity,
        solicitation_number, area_of_delivery,
        trade_agreement, procurement_mode, classification, category,
        approved_budget, currency, delivery_period,
        publish_date, closing_date, date_published, last_updated,
        contact_person, contact_designation, contact_address, contact_phone, contact_email, client_agency,
        bid_supplements, document_request_list, bid_documents_fee, bid_submission_deadline, bid_opening_date, pre_bid_conference,
        status, description, eligibility_requirements, created_by, bac_chairman, bac_secretariat,
        source_url, detail_url, updated_at
      ) VALUES (
        @reference_number, @title, @procuring_entity,
        @solicitation_number, @area_of_delivery,
        @trade_agreement, @procurement_mode, @classification, @category,
        @approved_budget, @currency, @delivery_period,
        @publish_date, @closing_date, @date_published, @last_updated,
        @contact_person, @contact_designation, @contact_address, @contact_phone, @contact_email, @client_agency,
        @bid_supplements, @document_request_list, @bid_documents_fee, @bid_submission_deadline, @bid_opening_date, @pre_bid_conference,
        @status, @description, @eligibility_requirements, @created_by, @bac_chairman, @bac_secretariat,
        @source_url, @detail_url, CURRENT_TIMESTAMP
      )
    `);
    
    return stmt.run(data);
  }

  static findByReferenceNumber(referenceNumber) {
    const stmt = db.prepare('SELECT * FROM opportunities WHERE reference_number = ?');
    return stmt.get(referenceNumber);
  }

  static search(query, filters = {}) {
    let sql = 'SELECT * FROM opportunities WHERE 1=1';
    const params = [];

    if (query) {
      sql += ' AND (title LIKE ? OR description LIKE ? OR procuring_entity LIKE ?)';
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (filters.category) {
      sql += ' AND category = ?';
      params.push(filters.category);
    }

    if (filters.minBudget) {
      sql += ' AND approved_budget >= ?';
      params.push(filters.minBudget);
    }

    if (filters.maxBudget) {
      sql += ' AND approved_budget <= ?';
      params.push(filters.maxBudget);
    }

    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.activeOnly) {
      sql += ' AND closing_date > datetime("now")';
    }

    if (filters.areaOfDelivery) {
      sql += ' AND area_of_delivery = ?';
      params.push(filters.areaOfDelivery);
    }

    sql += ' ORDER BY closing_date ASC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    const stmt = db.prepare(sql);
    return stmt.all(...params);
  }

  static count(query = '', filters = {}) {
    let sql = 'SELECT COUNT(*) as count FROM opportunities WHERE 1=1';
    const params = [];

    if (query) {
      sql += ' AND (title LIKE ? OR description LIKE ? OR procuring_entity LIKE ? OR category LIKE ?)';
      const searchPattern = `%${query}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (filters.category) {
      sql += ' AND category = ?';
      params.push(filters.category);
    }

    if (filters.activeOnly) {
      sql += ' AND closing_date > datetime("now")';
    }

    if (filters.minBudget) {
      sql += ' AND approved_budget >= ?';
      params.push(filters.minBudget);
    }

    if (filters.maxBudget) {
      sql += ' AND approved_budget <= ?';
      params.push(filters.maxBudget);
    }

    if (filters.areaOfDelivery) {
      sql += ' AND area_of_delivery = ?';
      params.push(filters.areaOfDelivery);
    }

    const stmt = db.prepare(sql);
    const result = stmt.get(...params);
    return result.count;
  }

  static getAll(limit = 100, offset = 0) {
    const stmt = db.prepare('SELECT * FROM opportunities ORDER BY closing_date ASC LIMIT ? OFFSET ?');
    return stmt.all(limit, offset);
  }

  static getActive() {
    const stmt = db.prepare('SELECT * FROM opportunities WHERE closing_date > datetime("now") ORDER BY closing_date ASC');
    return stmt.all();
  }

  static getCategories() {
    const stmt = db.prepare('SELECT DISTINCT category FROM opportunities WHERE category IS NOT NULL ORDER BY category');
    return stmt.all().map(row => row.category);
  }

  static getStatistics() {
    // Basic statistics
    const basicStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN closing_date > datetime('now') THEN 1 END) as active,
        COUNT(DISTINCT category) as categories,
        COUNT(DISTINCT procuring_entity) as entities
      FROM opportunities
    `).get();

    // Additional statistics
    const additional = {};
    
    // Closing today
    additional.closingToday = db.prepare(`
      SELECT COUNT(*) as count
      FROM opportunities
      WHERE DATE(closing_date) = DATE('now', 'localtime')
      AND status = 'Open'
    `).get().count;
    
    // Closing this week
    additional.closingThisWeek = db.prepare(`
      SELECT COUNT(*) as count
      FROM opportunities
      WHERE DATE(closing_date) BETWEEN DATE('now', 'localtime') AND DATE('now', 'localtime', '+7 days')
      AND status = 'Open'
    `).get().count;
    
    // Total and average budget for active opportunities
    const budgetStats = db.prepare(`
      SELECT 
        SUM(approved_budget) as totalBudget,
        AVG(approved_budget) as averageBudget
      FROM opportunities
      WHERE closing_date > datetime('now')
      AND approved_budget IS NOT NULL
      AND approved_budget > 0
    `).get();
    
    additional.totalBudget = budgetStats.totalBudget || 0;
    additional.averageBudget = budgetStats.averageBudget || 0;
    
    // Most active category
    const topCategory = db.prepare(`
      SELECT category, COUNT(*) as count
      FROM opportunities
      WHERE closing_date > datetime('now')
      AND category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
      LIMIT 1
    `).get();
    
    additional.topCategory = topCategory ? topCategory.category : 'N/A';
    
    // Most active procuring entity
    const topEntity = db.prepare(`
      SELECT procuring_entity, COUNT(*) as count
      FROM opportunities
      WHERE closing_date > datetime('now')
      GROUP BY procuring_entity
      ORDER BY count DESC
      LIMIT 1
    `).get();
    
    additional.topEntity = topEntity ? topEntity.procuring_entity : 'N/A';
    
    // New opportunities today
    additional.newToday = db.prepare(`
      SELECT COUNT(*) as count
      FROM opportunities
      WHERE DATE(created_at) = DATE('now', 'localtime')
    `).get().count;
    
    return {
      ...basicStats,
      additional
    };
  }
}

export default Opportunity;