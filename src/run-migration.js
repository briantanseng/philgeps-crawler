#!/usr/bin/env node

import 'dotenv/config';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Database configuration
let dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/philgeps.db');

// If DATABASE_PATH is set to /data/philgeps.db (GCS volume), use it directly
if (process.env.DATABASE_PATH && process.env.DATABASE_PATH.startsWith('/data/')) {
  dbPath = process.env.DATABASE_PATH;
  console.log(`Using GCS volume mount for SQLite database: ${dbPath}`);
}

console.log('Running RFQ details migration...');
console.log(`Database path: ${dbPath}`);

try {
  const db = new Database(dbPath);
  
  // Check if migration already applied
  const columns = db.pragma('table_info(opportunities)');
  const hasRfqNumber = columns.some(col => col.name === 'rfq_number');
  
  if (hasRfqNumber) {
    console.log('Migration already applied - RFQ columns exist');
    db.close();
    process.exit(0);
  }
  
  // Run the migration
  console.log('Adding RFQ detail columns...');
  
  db.exec(`
    -- Add RFQ specific columns
    ALTER TABLE opportunities ADD COLUMN rfq_number TEXT;
    ALTER TABLE opportunities ADD COLUMN delivery_period TEXT;
    ALTER TABLE opportunities ADD COLUMN payment_terms TEXT;
    ALTER TABLE opportunities ADD COLUMN procurement_mode TEXT;
    ALTER TABLE opportunities ADD COLUMN funding_source TEXT;
    ALTER TABLE opportunities ADD COLUMN area_of_delivery TEXT;
    ALTER TABLE opportunities ADD COLUMN pre_bid_conference TEXT;
    ALTER TABLE opportunities ADD COLUMN bid_submission_deadline DATETIME;
    ALTER TABLE opportunities ADD COLUMN bid_opening_date DATETIME;
    ALTER TABLE opportunities ADD COLUMN technical_specifications TEXT;
    ALTER TABLE opportunities ADD COLUMN eligibility_criteria TEXT;
    ALTER TABLE opportunities ADD COLUMN additional_requirements TEXT;
    
    -- Create index for RFQ number
    CREATE INDEX IF NOT EXISTS idx_rfq_number ON opportunities(rfq_number);
  `);
  
  console.log('Migration completed successfully!');
  
  // Verify columns were added
  const newColumns = db.pragma('table_info(opportunities)');
  const rfqColumns = newColumns.filter(col => 
    ['rfq_number', 'delivery_period', 'payment_terms', 'procurement_mode', 
     'funding_source', 'area_of_delivery', 'pre_bid_conference', 
     'bid_submission_deadline', 'bid_opening_date', 'technical_specifications',
     'eligibility_criteria', 'additional_requirements'].includes(col.name)
  );
  
  console.log(`Added ${rfqColumns.length} RFQ-related columns`);
  
  db.close();
  process.exit(0);
  
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
}