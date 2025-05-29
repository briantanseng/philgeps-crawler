#!/usr/bin/env node

/**
 * Unified Database Schema Migration
 * 
 * This script creates the complete PhilGEPS crawler database schema including:
 * - Opportunities table with ITB (Invitation to Bid) fields
 * - Crawl history tracking
 * - Categories management
 * - Performance optimization indexes
 * - Update triggers
 */

import 'dotenv/config';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Database configuration
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/philgeps.db');

console.log('PhilGEPS Database Schema Migration');
console.log('==================================');
console.log(`Database path: ${dbPath}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log();

try {
  const db = new Database(dbPath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  console.log('Creating database schema...\n');
  
  // Drop existing tables if clean install is needed (use with caution in production)
  if (process.argv.includes('--clean')) {
    console.log('⚠️  Clean install requested - dropping existing tables');
    db.exec(`
      DROP TABLE IF EXISTS opportunities;
      DROP TABLE IF EXISTS crawl_history;
      DROP TABLE IF EXISTS categories;
    `);
  }
  
  // Create opportunities table with comprehensive ITB fields
  console.log('📋 Creating opportunities table...');
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
  `);
  
  // Create performance optimization indexes
  console.log('🚀 Creating performance indexes...');
  db.exec(`
    -- Single column indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_reference_number ON opportunities(reference_number);
    CREATE INDEX IF NOT EXISTS idx_closing_date ON opportunities(closing_date);
    CREATE INDEX IF NOT EXISTS idx_category ON opportunities(category);
    CREATE INDEX IF NOT EXISTS idx_procuring_entity ON opportunities(procuring_entity);
    CREATE INDEX IF NOT EXISTS idx_solicitation_number ON opportunities(solicitation_number);
    CREATE INDEX IF NOT EXISTS idx_procurement_mode ON opportunities(procurement_mode);
    CREATE INDEX IF NOT EXISTS idx_area_of_delivery ON opportunities(area_of_delivery);
    CREATE INDEX IF NOT EXISTS idx_status ON opportunities(status);
    CREATE INDEX IF NOT EXISTS idx_approved_budget ON opportunities(approved_budget);
    CREATE INDEX IF NOT EXISTS idx_title ON opportunities(title);
    CREATE INDEX IF NOT EXISTS idx_publish_date ON opportunities(publish_date);
    
    -- Composite indexes for common query patterns
    CREATE INDEX IF NOT EXISTS idx_area_status 
      ON opportunities(area_of_delivery, status);
    CREATE INDEX IF NOT EXISTS idx_category_status 
      ON opportunities(category, status);
    CREATE INDEX IF NOT EXISTS idx_procurement_mode_status 
      ON opportunities(procurement_mode, status);
    CREATE INDEX IF NOT EXISTS idx_status_closing_date 
      ON opportunities(status, closing_date);
    CREATE INDEX IF NOT EXISTS idx_entity_status 
      ON opportunities(procuring_entity, status);
    CREATE INDEX IF NOT EXISTS idx_area_category_status 
      ON opportunities(area_of_delivery, category, status);
    
    -- Partial index for budget queries (excluding NULL values)
    CREATE INDEX IF NOT EXISTS idx_budget_status 
      ON opportunities(approved_budget, status) 
      WHERE approved_budget IS NOT NULL;
  `);
  
  // Create crawl history table
  console.log('📊 Creating crawl history table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS crawl_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crawl_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      opportunities_found INTEGER DEFAULT 0,
      new_opportunities INTEGER DEFAULT 0,
      updated_opportunities INTEGER DEFAULT 0,
      errors INTEGER DEFAULT 0,
      duration_seconds REAL,
      status TEXT,
      error_message TEXT,
      page_range TEXT,
      fetch_details BOOLEAN DEFAULT 0
    );
    
    -- Indexes for crawl history
    CREATE INDEX IF NOT EXISTS idx_crawl_date 
      ON crawl_history(crawl_date DESC);
    CREATE INDEX IF NOT EXISTS idx_crawl_status 
      ON crawl_history(status, crawl_date DESC);
  `);
  
  // Create categories table
  console.log('🏷️  Creating categories table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      opportunity_count INTEGER DEFAULT 0,
      last_crawled DATETIME,
      is_active BOOLEAN DEFAULT 1
    );
  `);
  
  // Create update trigger
  console.log('⚡ Creating update triggers...');
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_opportunities_timestamp 
    AFTER UPDATE ON opportunities
    BEGIN
      UPDATE opportunities SET updated_at = CURRENT_TIMESTAMP 
      WHERE id = NEW.id;
    END;
  `);
  
  // Analyze database for query optimization
  console.log('\n🔍 Analyzing database for optimization...');
  db.exec('ANALYZE;');
  
  // Verify schema creation
  console.log('\n✅ Schema creation completed successfully!\n');
  
  // Display summary
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('📋 Created tables:');
  tables.forEach(table => {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get().count;
    console.log(`   - ${table.name} (${count} records)`);
  });
  
  const indexes = db.prepare(`
    SELECT name, tbl_name 
    FROM sqlite_master 
    WHERE type='index' 
    AND name NOT LIKE 'sqlite_%'
    ORDER BY tbl_name, name
  `).all();
  
  console.log('\n🚀 Created indexes:');
  const indexByTable = {};
  indexes.forEach(idx => {
    if (!indexByTable[idx.tbl_name]) {
      indexByTable[idx.tbl_name] = [];
    }
    indexByTable[idx.tbl_name].push(idx.name);
  });
  
  Object.entries(indexByTable).forEach(([table, idxs]) => {
    console.log(`   ${table}: ${idxs.length} indexes`);
  });
  
  // Show column count for opportunities table
  const oppColumns = db.pragma('table_info(opportunities)');
  console.log(`\n📊 Opportunities table: ${oppColumns.length} columns`);
  
  db.close();
  console.log('\n✨ Database migration completed successfully!');
  
  // Migration tips
  console.log('\n💡 Migration Tips:');
  console.log('   - Run with --clean flag to drop and recreate all tables');
  console.log('   - Check ./data/philgeps.db for the database file');
  console.log('   - Use sqlite3 CLI to inspect: sqlite3 data/philgeps.db');
  console.log('   - View schema: sqlite3 data/philgeps.db ".schema"');
  
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error('   Stack trace:', error.stack);
  process.exit(1);
}