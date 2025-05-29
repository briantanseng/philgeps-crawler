import Database from 'better-sqlite3';
import { Opportunity } from '@/src/models/Opportunity';
import path from 'path';
import fs from 'fs';

describe('Database Operations', () => {
  let db: Database.Database;
  const testDbPath = path.join(__dirname, 'test.db');

  beforeAll(() => {
    // Create test database
    db = new Database(testDbPath);
    
    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS opportunities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference_number TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        procuring_entity TEXT NOT NULL,
        category TEXT,
        approved_budget REAL,
        currency TEXT DEFAULT 'PHP',
        closing_date DATETIME,
        publish_date DATETIME,
        url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        itb_description TEXT,
        itb_area_of_delivery TEXT,
        itb_category TEXT
      );
      
      CREATE TABLE IF NOT EXISTS crawl_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        crawl_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        opportunities_found INTEGER DEFAULT 0,
        new_opportunities INTEGER DEFAULT 0,
        updated_opportunities INTEGER DEFAULT 0,
        errors INTEGER DEFAULT 0,
        duration_seconds REAL,
        status TEXT,
        error_message TEXT
      );
    `);

    // Mock the database instance in Opportunity model
    jest.spyOn(Opportunity as any, 'db', 'get').mockReturnValue(db);
  });

  afterAll(() => {
    // Close database and remove test file
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  beforeEach(() => {
    // Clear tables before each test
    db.exec('DELETE FROM opportunities');
    db.exec('DELETE FROM crawl_history');
  });

  describe('Opportunity operations', () => {
    const testOpportunity = {
      reference_number: 'TEST001',
      title: 'Test Opportunity',
      procuring_entity: 'Test Entity',
      category: 'Test Category',
      approved_budget: 100000,
      currency: 'PHP',
      closing_date: new Date('2025-06-01'),
      publish_date: new Date('2025-05-01'),
      url: 'https://test.example.com',
    };

    it('should insert new opportunity', () => {
      const stmt = db.prepare(`
        INSERT INTO opportunities (reference_number, title, procuring_entity, category, approved_budget, currency, closing_date, publish_date, url)
        VALUES (@reference_number, @title, @procuring_entity, @category, @approved_budget, @currency, @closing_date, @publish_date, @url)
      `);
      
      const result = stmt.run(testOpportunity);
      
      expect(result.changes).toBe(1);
      
      // Verify insertion
      const opportunity = db.prepare('SELECT * FROM opportunities WHERE reference_number = ?').get(testOpportunity.reference_number);
      expect(opportunity).toBeTruthy();
      expect(opportunity.title).toBe(testOpportunity.title);
    });

    it('should update existing opportunity', () => {
      // Insert first
      const insertStmt = db.prepare(`
        INSERT INTO opportunities (reference_number, title, procuring_entity, category, approved_budget, currency)
        VALUES (@reference_number, @title, @procuring_entity, @category, @approved_budget, @currency)
      `);
      insertStmt.run(testOpportunity);
      
      // Update
      const updateStmt = db.prepare(`
        UPDATE opportunities 
        SET title = @title, approved_budget = @approved_budget, updated_at = CURRENT_TIMESTAMP
        WHERE reference_number = @reference_number
      `);
      
      const updatedData = {
        reference_number: testOpportunity.reference_number,
        title: 'Updated Title',
        approved_budget: 200000,
      };
      
      const result = updateStmt.run(updatedData);
      expect(result.changes).toBe(1);
      
      // Verify update
      const opportunity = db.prepare('SELECT * FROM opportunities WHERE reference_number = ?').get(testOpportunity.reference_number);
      expect(opportunity.title).toBe('Updated Title');
      expect(opportunity.approved_budget).toBe(200000);
    });

    it('should search opportunities', () => {
      // Insert test data
      const opportunities = [
        { ...testOpportunity, reference_number: 'TEST001', title: 'Construction Project' },
        { ...testOpportunity, reference_number: 'TEST002', title: 'IT Services' },
        { ...testOpportunity, reference_number: 'TEST003', title: 'Construction Materials' },
      ];
      
      const stmt = db.prepare(`
        INSERT INTO opportunities (reference_number, title, procuring_entity, category, approved_budget, currency)
        VALUES (@reference_number, @title, @procuring_entity, @category, @approved_budget, @currency)
      `);
      
      opportunities.forEach(opp => stmt.run(opp));
      
      // Search by keyword
      const searchStmt = db.prepare(`
        SELECT * FROM opportunities 
        WHERE title LIKE ? OR procuring_entity LIKE ?
        ORDER BY created_at DESC
      `);
      
      const results = searchStmt.all('%Construction%', '%Construction%');
      expect(results).toHaveLength(2);
    });

    it('should get statistics', () => {
      // Insert test data with different dates
      const today = new Date();
      const pastDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const futureDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days future
      
      const opportunities = [
        { ...testOpportunity, reference_number: 'TEST001', closing_date: futureDate, category: 'Construction' },
        { ...testOpportunity, reference_number: 'TEST002', closing_date: futureDate, category: 'IT' },
        { ...testOpportunity, reference_number: 'TEST003', closing_date: pastDate, category: 'Construction' },
      ];
      
      const stmt = db.prepare(`
        INSERT INTO opportunities (reference_number, title, procuring_entity, category, approved_budget, currency, closing_date)
        VALUES (@reference_number, @title, @procuring_entity, @category, @approved_budget, @currency, @closing_date)
      `);
      
      opportunities.forEach(opp => stmt.run(opp));
      
      // Get statistics
      const totalCount = db.prepare('SELECT COUNT(*) as count FROM opportunities').get().count;
      const activeCount = db.prepare('SELECT COUNT(*) as count FROM opportunities WHERE closing_date >= datetime("now")').get().count;
      const categoryCount = db.prepare('SELECT COUNT(DISTINCT category) as count FROM opportunities').get().count;
      const entityCount = db.prepare('SELECT COUNT(DISTINCT procuring_entity) as count FROM opportunities').get().count;
      
      expect(totalCount).toBe(3);
      expect(activeCount).toBe(2);
      expect(categoryCount).toBe(2);
      expect(entityCount).toBe(1);
    });
  });

  describe('Crawl history operations', () => {
    it('should record crawl history', () => {
      const crawlData = {
        opportunities_found: 10,
        new_opportunities: 5,
        updated_opportunities: 3,
        errors: 0,
        duration_seconds: 15.5,
        status: 'completed',
      };
      
      const stmt = db.prepare(`
        INSERT INTO crawl_history (opportunities_found, new_opportunities, updated_opportunities, errors, duration_seconds, status)
        VALUES (@opportunities_found, @new_opportunities, @updated_opportunities, @errors, @duration_seconds, @status)
      `);
      
      const result = stmt.run(crawlData);
      expect(result.changes).toBe(1);
      
      // Verify
      const history = db.prepare('SELECT * FROM crawl_history ORDER BY id DESC LIMIT 1').get();
      expect(history.opportunities_found).toBe(10);
      expect(history.status).toBe('completed');
    });

    it('should get last crawl info', () => {
      // Insert multiple crawl records
      const stmt = db.prepare(`
        INSERT INTO crawl_history (opportunities_found, status, crawl_date)
        VALUES (?, ?, ?)
      `);
      
      const now = new Date();
      stmt.run(5, 'completed', new Date(now.getTime() - 60000).toISOString());
      stmt.run(10, 'completed', now.toISOString());
      stmt.run(3, 'failed', new Date(now.getTime() - 120000).toISOString());
      
      // Get last crawl
      const lastCrawl = db.prepare('SELECT * FROM crawl_history ORDER BY crawl_date DESC LIMIT 1').get();
      expect(lastCrawl.opportunities_found).toBe(10);
    });
  });

  describe('Database constraints', () => {
    it('should enforce unique reference_number', () => {
      const stmt = db.prepare(`
        INSERT INTO opportunities (reference_number, title, procuring_entity)
        VALUES (?, ?, ?)
      `);
      
      stmt.run('TEST001', 'First', 'Entity');
      
      expect(() => {
        stmt.run('TEST001', 'Second', 'Entity');
      }).toThrow(/UNIQUE constraint failed/);
    });

    it('should enforce required fields', () => {
      const stmt = db.prepare(`
        INSERT INTO opportunities (reference_number)
        VALUES (?)
      `);
      
      expect(() => {
        stmt.run('TEST001');
      }).toThrow(/NOT NULL constraint failed/);
    });
  });
});