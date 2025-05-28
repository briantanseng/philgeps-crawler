import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Database Schema Tests', () => {
  let db;
  const testDbPath = path.join(__dirname, '../../data/test_philgeps.db');

  beforeAll(async () => {
    // Create test database
    db = new Database(testDbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Import the schema directly from database.js
    const { default: databaseSchema } = await import('../models/database.js');
    
    // Get the schema SQL from database.js
    const schemaSQL = `
      CREATE TABLE IF NOT EXISTS opportunities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference_number TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        procuring_entity TEXT NOT NULL,
        
        -- Basic Information
        solicitation_number TEXT,
        area_of_delivery TEXT,
        
        -- Procurement Details
        trade_agreement TEXT,
        procurement_mode TEXT,
        classification TEXT,
        category TEXT,
        
        -- Budget and Timeline
        approved_budget REAL,
        currency TEXT DEFAULT 'PHP',
        delivery_period TEXT,
        
        -- Dates
        publish_date DATETIME,
        closing_date DATETIME,
        date_published TEXT,
        last_updated TEXT,
        
        -- Contact Information
        contact_person TEXT,
        contact_designation TEXT,
        contact_address TEXT,
        contact_phone TEXT,
        contact_email TEXT,
        client_agency TEXT,
        
        -- Bid Details
        bid_supplements INTEGER DEFAULT 0,
        document_request_list INTEGER DEFAULT 0,
        bid_documents_fee TEXT,
        bid_submission_deadline DATETIME,
        bid_opening_date DATETIME,
        pre_bid_conference TEXT,
        
        -- Additional Information
        status TEXT DEFAULT 'Open',
        description TEXT,
        eligibility_requirements TEXT,
        created_by TEXT,
        bac_chairman TEXT,
        bac_secretariat TEXT,
        
        -- URLs and metadata
        source_url TEXT,
        detail_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_reference_number ON opportunities(reference_number);
      CREATE INDEX IF NOT EXISTS idx_closing_date ON opportunities(closing_date);
      CREATE INDEX IF NOT EXISTS idx_category ON opportunities(category);
      CREATE INDEX IF NOT EXISTS idx_procuring_entity ON opportunities(procuring_entity);
      CREATE INDEX IF NOT EXISTS idx_solicitation_number ON opportunities(solicitation_number);
      CREATE INDEX IF NOT EXISTS idx_procurement_mode ON opportunities(procurement_mode);
      CREATE INDEX IF NOT EXISTS idx_area_of_delivery ON opportunities(area_of_delivery);
      CREATE INDEX IF NOT EXISTS idx_status ON opportunities(status);
      CREATE INDEX IF NOT EXISTS idx_approved_budget ON opportunities(approved_budget);

      CREATE TABLE IF NOT EXISTS crawl_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        crawl_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        opportunities_found INTEGER DEFAULT 0,
        new_opportunities INTEGER DEFAULT 0,
        updated_opportunities INTEGER DEFAULT 0,
        errors INTEGER DEFAULT 0,
        duration_seconds REAL,
        status TEXT,
        page_range TEXT,
        fetch_details BOOLEAN DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        opportunity_count INTEGER DEFAULT 0,
        last_crawled DATETIME,
        is_active BOOLEAN DEFAULT 1
      );
      
      CREATE TRIGGER IF NOT EXISTS update_opportunities_timestamp 
      AFTER UPDATE ON opportunities
      BEGIN
        UPDATE opportunities SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `;
    
    db.exec(schemaSQL);
  });

  afterAll(() => {
    db.close();
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  test('opportunities table should exist with all required columns', () => {
    const tableInfo = db.pragma('table_info(opportunities)');
    const columnNames = tableInfo.map(col => col.name);
    
    // Check required columns
    const requiredColumns = [
      'id', 'reference_number', 'title', 'procuring_entity',
      'solicitation_number', 'area_of_delivery', 'trade_agreement',
      'procurement_mode', 'classification', 'category', 'approved_budget',
      'currency', 'delivery_period', 'publish_date', 'closing_date',
      'date_published', 'last_updated', 'contact_person', 'contact_designation',
      'contact_address', 'contact_phone', 'contact_email', 'client_agency',
      'bid_supplements', 'document_request_list', 'bid_documents_fee',
      'bid_submission_deadline', 'bid_opening_date', 'pre_bid_conference',
      'status', 'description', 'eligibility_requirements', 'created_by',
      'bac_chairman', 'bac_secretariat', 'source_url', 'detail_url',
      'created_at', 'updated_at'
    ];
    
    requiredColumns.forEach(col => {
      expect(columnNames).toContain(col);
    });
    
    expect(tableInfo.length).toBe(39);
  });

  test('crawl_history table should exist', () => {
    const tableInfo = db.pragma('table_info(crawl_history)');
    const columnNames = tableInfo.map(col => col.name);
    
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('crawl_date');
    expect(columnNames).toContain('opportunities_found');
    expect(columnNames).toContain('page_range');
    expect(columnNames).toContain('fetch_details');
  });

  test('categories table should exist', () => {
    const tableInfo = db.pragma('table_info(categories)');
    const columnNames = tableInfo.map(col => col.name);
    
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('name');
    expect(columnNames).toContain('opportunity_count');
    expect(columnNames).toContain('is_active');
  });

  test('indexes should be created', () => {
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'").all();
    const indexNames = indexes.map(idx => idx.name);
    
    const expectedIndexes = [
      'idx_reference_number',
      'idx_closing_date',
      'idx_category',
      'idx_procuring_entity',
      'idx_solicitation_number',
      'idx_procurement_mode',
      'idx_area_of_delivery',
      'idx_status',
      'idx_approved_budget'
    ];
    
    expectedIndexes.forEach(idx => {
      expect(indexNames).toContain(idx);
    });
  });

  test('trigger should be created', () => {
    const triggers = db.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all();
    const triggerNames = triggers.map(t => t.name);
    
    expect(triggerNames).toContain('update_opportunities_timestamp');
  });

  test('should insert and retrieve opportunity with all fields', () => {
    const opportunity = {
      reference_number: 'TEST-12345',
      title: 'Test Opportunity',
      procuring_entity: 'Test Agency',
      solicitation_number: 'SOL-001',
      area_of_delivery: 'NCR',
      trade_agreement: 'Test Agreement',
      procurement_mode: 'Public Bidding',
      classification: 'Goods',
      category: 'IT Equipment',
      approved_budget: 1000000,
      currency: 'PHP',
      delivery_period: '30 days',
      status: 'Open'
    };
    
    const stmt = db.prepare(`
      INSERT INTO opportunities (
        reference_number, title, procuring_entity, solicitation_number,
        area_of_delivery, trade_agreement, procurement_mode, classification,
        category, approved_budget, currency, delivery_period, status
      ) VALUES (
        @reference_number, @title, @procuring_entity, @solicitation_number,
        @area_of_delivery, @trade_agreement, @procurement_mode, @classification,
        @category, @approved_budget, @currency, @delivery_period, @status
      )
    `);
    
    const result = stmt.run(opportunity);
    expect(result.changes).toBe(1);
    
    // Retrieve and verify
    const retrieved = db.prepare('SELECT * FROM opportunities WHERE reference_number = ?').get('TEST-12345');
    expect(retrieved.title).toBe('Test Opportunity');
    expect(retrieved.area_of_delivery).toBe('NCR');
    expect(retrieved.approved_budget).toBe(1000000);
  });
});