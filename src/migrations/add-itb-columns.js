#!/usr/bin/env node

/**
 * Migration to add ITB columns to existing database
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/philgeps.db');

console.log('Adding ITB columns to database...');
console.log(`Database path: ${dbPath}`);

try {
  const db = new Database(dbPath);
  
  // Get current columns
  const columns = db.pragma('table_info(opportunities)').map(col => col.name);
  console.log(`Current columns: ${columns.length}`);
  
  // Define ITB columns that should exist
  const itbColumns = {
    // Basic ITB fields
    'itb_solicitation_number': 'TEXT',
    'itb_trade_agreement': 'TEXT',
    'itb_procurement_mode': 'TEXT',
    'itb_classification': 'TEXT',
    'itb_category': 'TEXT',
    'itb_approved_budget': 'REAL',
    'itb_delivery_period': 'TEXT',
    'itb_client_agency': 'TEXT',
    
    // Contact information
    'itb_contact_person': 'TEXT',
    'itb_contact_designation': 'TEXT',
    'itb_contact_address': 'TEXT',
    'itb_contact_phone': 'TEXT',
    'itb_contact_email': 'TEXT',
    
    // Location and dates
    'itb_area_of_delivery': 'TEXT',
    'itb_date_posted': 'TEXT',
    'itb_date_last_updated': 'TEXT',
    'itb_closing_date': 'DATETIME',
    'itb_opening_date': 'DATETIME',
    'itb_pre_bid_conference': 'TEXT',
    
    // Additional information
    'itb_description': 'TEXT',
    'itb_eligibility': 'TEXT',
    'itb_created_by': 'TEXT',
    'itb_status': 'TEXT',
    'itb_bid_supplements': 'INTEGER',
    'itb_document_request_list': 'INTEGER',
    'itb_bidding_documents': 'TEXT',
    
    // BAC information
    'itb_bac_chairman': 'TEXT',
    'itb_bac_secretariat': 'TEXT'
  };
  
  // Add missing columns
  let addedCount = 0;
  for (const [columnName, columnType] of Object.entries(itbColumns)) {
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
    console.log('✨ All ITB columns already exist!');
  } else {
    console.log(`\n✅ Successfully added ${addedCount} ITB columns!`);
  }
  
  // Verify final column count
  const finalColumns = db.pragma('table_info(opportunities)');
  console.log(`\nFinal column count: ${finalColumns.length}`);
  
  // Show ITB columns
  const itbColumnNames = finalColumns
    .filter(col => col.name.startsWith('itb_'))
    .map(col => col.name);
  console.log(`ITB columns (${itbColumnNames.length}):`, itbColumnNames.slice(0, 5).join(', '), '...');
  
  db.close();
  
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  process.exit(1);
}