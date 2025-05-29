#!/usr/bin/env node

/**
 * Migration to add missing columns to existing database
 * This handles the case where the database already exists but is missing new columns
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/philgeps.db');

console.log('Adding missing columns to database...');
console.log(`Database path: ${dbPath}`);

try {
  const db = new Database(dbPath);
  
  // Get current columns
  const columns = db.pragma('table_info(opportunities)').map(col => col.name);
  console.log(`Current columns: ${columns.length}`);
  
  // Define all columns that should exist
  const requiredColumns = {
    // URLs
    'source_url': 'TEXT',
    'detail_url': 'TEXT',
    
    // RFQ fields
    'itb_has_active_rfq': 'TEXT',
    'rfq_solicitation_number': 'TEXT',
    'rfq_title': 'TEXT',
    'rfq_status': 'TEXT',
    'rfq_open_date': 'DATETIME',
    'rfq_close_date': 'DATETIME',
    'rfq_description': 'TEXT',
    'rfq_request_type': 'TEXT',
    'rfq_published_date': 'DATETIME',
    'rfq_notice_type': 'TEXT',
    'rfq_business_category': 'TEXT',
    'rfq_approved_budget': 'TEXT',
    'rfq_submission_deadline': 'DATETIME',
    'rfq_special_instructions': 'TEXT',
    'rfq_funding_source': 'TEXT',
    'rfq_reason': 'TEXT',
    'rfq_area_of_delivery': 'TEXT',
    'rfq_delivery_date': 'DATETIME',
    'rfq_contact_person': 'TEXT',
    'rfq_contact_number': 'TEXT',
    'rfq_required_documents': 'TEXT',
    'rfq_attachments': 'TEXT',
    'rfq_line_items': 'TEXT',
    'rfq_trade_agreement': 'TEXT',
    'rfq_pre_procurement_conference': 'TEXT',
    'rfq_pre_bid_conference': 'TEXT',
    'rfq_procuring_entity_org_id': 'TEXT',
    'rfq_client_agency_org_id': 'TEXT',
    'rfq_client_agency': 'TEXT',
    
    // ITB fields that might be missing
    'funding_source': 'TEXT',
  };
  
  // Add missing columns
  let addedCount = 0;
  for (const [columnName, columnType] of Object.entries(requiredColumns)) {
    if (!columns.includes(columnName)) {
      try {
        db.exec(`ALTER TABLE opportunities ADD COLUMN ${columnName} ${columnType}`);
        console.log(`✅ Added column: ${columnName}`);
        addedCount++;
      } catch (error) {
        if (!error.message.includes('duplicate column name')) {
          console.error(`❌ Failed to add column ${columnName}:`, error.message);
        }
      }
    }
  }
  
  if (addedCount === 0) {
    console.log('✨ All required columns already exist!');
  } else {
    console.log(`\n✅ Successfully added ${addedCount} missing columns!`);
  }
  
  // Verify final column count
  const finalColumns = db.pragma('table_info(opportunities)');
  console.log(`\nFinal column count: ${finalColumns.length}`);
  
  db.close();
  
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  process.exit(1);
}