import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function setupTestDatabase(dbName = 'test_db.db') {
  const testDbPath = path.join(__dirname, '../../data', dbName);
  
  // Remove existing test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  
  // Create new test database
  const db = new Database(testDbPath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Create schema
  db.exec(`
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
  `);
  
  return { db, testDbPath };
}

export function cleanupTestDatabase(testDbPath) {
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
}