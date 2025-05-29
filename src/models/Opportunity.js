import db from './database.js';

class Opportunity {
  // Get valid column names from the schema
  static getValidColumns() {
    if (!this._validColumns) {
      const tableInfo = db.pragma('table_info(opportunities)');
      this._validColumns = tableInfo.map(col => col.name);
    }
    return this._validColumns;
  }
  
  // Sanitize data to only include valid columns
  static sanitizeData(data) {
    const validColumns = this.getValidColumns();
    const sanitized = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (validColumns.includes(key)) {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  static async upsert(data) {
    // Sanitize the data to only include valid columns
    const sanitizedData = this.sanitizeData(data);
    
    const existingStmt = db.prepare('SELECT id FROM opportunities WHERE reference_number = ?');
    const existing = existingStmt.get(sanitizedData.reference_number);
    
    let isNew = false;
    let isUpdated = false;
    
    if (existing) {
      // Update existing record
      const updateFields = Object.keys(sanitizedData)
        .filter(key => key !== 'reference_number')
        .map(key => `${key} = @${key}`)
        .join(', ');
      
      const updateStmt = db.prepare(`
        UPDATE opportunities 
        SET ${updateFields}, updated_at = CURRENT_TIMESTAMP 
        WHERE reference_number = @reference_number
      `);
      
      updateStmt.run(sanitizedData);
      isUpdated = true;
    } else {
      // Insert new record
      const fields = Object.keys(sanitizedData).join(', ');
      const placeholders = Object.keys(sanitizedData).map(key => `@${key}`).join(', ');
      
      const insertStmt = db.prepare(`
        INSERT INTO opportunities (${fields}) 
        VALUES (${placeholders})
      `);
      
      insertStmt.run(sanitizedData);
      isNew = true;
    }
    
    return { isNew, isUpdated };
  }
  
  static async insert(data) {
    // For backward compatibility with crawl-all.js
    return await this.upsert(data);
  }
  
  static async findByReferenceNumber(referenceNumber) {
    const stmt = db.prepare('SELECT * FROM opportunities WHERE reference_number = ?');
    return stmt.get(referenceNumber);
  }
  
  static async findAll() {
    const stmt = db.prepare('SELECT * FROM opportunities ORDER BY closing_date DESC');
    return stmt.all();
  }
  
  static async search(filters = {}) {
    let query = 'SELECT * FROM opportunities WHERE 1=1';
    const params = [];
    
    if (filters.keyword) {
      query += ' AND (title LIKE ? OR procuring_entity LIKE ? OR reference_number LIKE ?)';
      const keywordPattern = `%${filters.keyword}%`;
      params.push(keywordPattern, keywordPattern, keywordPattern);
    }
    
    if (filters.category) {
      query += ' AND (category = ? OR itb_category = ?)';
      params.push(filters.category, filters.category);
    }
    
    if (filters.area) {
      query += ' AND (area_of_delivery = ? OR itb_area_of_delivery = ?)';
      params.push(filters.area, filters.area);
    }
    
    if (filters.budgetMin) {
      query += ' AND approved_budget >= ?';
      params.push(filters.budgetMin);
    }
    
    if (filters.budgetMax) {
      query += ' AND approved_budget <= ?';
      params.push(filters.budgetMax);
    }
    
    if (filters.status) {
      if (filters.status === 'active') {
        query += ' AND closing_date >= date("now")';
      } else if (filters.status === 'closed') {
        query += ' AND closing_date < date("now")';
      }
    }
    
    query += ' ORDER BY closing_date DESC';
    
    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }
    
    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  }
  
  static async getStatistics() {
    const stats = {
      totalOpportunities: 0,
      activeOpportunities: 0,
      totalCategories: 0,
      totalProcuringEntities: 0
    };
    
    // Total opportunities
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM opportunities');
    stats.totalOpportunities = totalStmt.get().count;
    
    // Active opportunities
    const activeStmt = db.prepare('SELECT COUNT(*) as count FROM opportunities WHERE closing_date >= date("now")');
    stats.activeOpportunities = activeStmt.get().count;
    
    // Total categories
    const categoriesStmt = db.prepare('SELECT COUNT(DISTINCT COALESCE(category, itb_category)) as count FROM opportunities WHERE category IS NOT NULL OR itb_category IS NOT NULL');
    stats.totalCategories = categoriesStmt.get().count;
    
    // Total procuring entities
    const entitiesStmt = db.prepare('SELECT COUNT(DISTINCT procuring_entity) as count FROM opportunities');
    stats.totalProcuringEntities = entitiesStmt.get().count;
    
    return stats;
  }
}

export default Opportunity;