import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'philgeps.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Set journal mode for better performance
db.pragma('journal_mode = WAL');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS opportunities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_number TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    procuring_entity TEXT NOT NULL,
    category TEXT,
    classification TEXT,
    status TEXT,
    area_of_delivery TEXT,
    approved_budget REAL,
    currency TEXT DEFAULT 'PHP',
    publish_date DATETIME,
    closing_date DATETIME,
    deadline_type TEXT,
    request_type TEXT,
    awarding_type TEXT,
    trade_agreement TEXT,
    url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- ITB specific fields
    itb_reference_number TEXT,
    itb_category TEXT,
    itb_classification TEXT,
    itb_funding_source TEXT,
    itb_funding_year TEXT,
    itb_duration TEXT,
    itb_has_active_rfq TEXT,
    itb_date_posted TEXT,
    itb_closing_date TEXT,
    itb_status TEXT,
    itb_pre_bid_conference TEXT,
    itb_approved_budget TEXT,
    itb_delivery_period TEXT,
    itb_description TEXT,
    itb_created_by TEXT,
    itb_contact_person TEXT,
    itb_bidding_documents TEXT,
    itb_procuring_entity_org_id TEXT,
    itb_procuring_entity_uacs_code TEXT,
    itb_client_agency_org_id TEXT,
    itb_procurement_mode TEXT,
    itb_eligibility TEXT,
    itb_contract_type TEXT,
    itb_opening_date TEXT,
    itb_pre_procurement_conference TEXT,
    itb_non_disclosure_agreement TEXT,
    itb_bid_evaluation TEXT,
    itb_payment_mode TEXT,
    itb_product_service_name TEXT,
    itb_product_service_code TEXT,
    itb_area_of_delivery TEXT,
    itb_contact_person_postal_code TEXT,
    itb_date_last_updated TEXT,
    itb_solicitation_number TEXT,
    itb_trade_agreement TEXT,
    itb_contact_designation TEXT,
    itb_contact_address TEXT,
    itb_contact_phone TEXT,
    itb_contact_email TEXT,
    itb_bid_supplements INTEGER,
    itb_document_request_list INTEGER,
    itb_client_agency TEXT,
    
    -- RFQ specific fields
    rfq_solicitation_number TEXT,
    rfq_title TEXT,
    rfq_status TEXT,
    rfq_open_date TEXT,
    rfq_close_date TEXT,
    rfq_description TEXT,
    rfq_request_type TEXT,
    rfq_published_date TEXT,
    rfq_notice_type TEXT,
    rfq_business_category TEXT,
    rfq_approved_budget TEXT,
    rfq_submission_deadline TEXT,
    rfq_special_instructions TEXT,
    rfq_funding_source TEXT,
    rfq_reason TEXT,
    rfq_area_of_delivery TEXT,
    rfq_delivery_date TEXT,
    rfq_contact_person TEXT,
    rfq_contact_number TEXT,
    rfq_required_documents TEXT,
    rfq_attachments TEXT,
    rfq_line_items TEXT,
    rfq_trade_agreement TEXT,
    rfq_pre_procurement_conference TEXT,
    rfq_pre_bid_conference TEXT,
    rfq_procuring_entity_org_id TEXT,
    rfq_client_agency_org_id TEXT,
    rfq_client_agency TEXT
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
  
  CREATE INDEX IF NOT EXISTS idx_opportunities_reference_number 
  ON opportunities(reference_number);
  
  CREATE INDEX IF NOT EXISTS idx_opportunities_search 
  ON opportunities(title, procuring_entity, category, area_of_delivery);
  
  CREATE INDEX IF NOT EXISTS idx_opportunities_dates 
  ON opportunities(closing_date, publish_date);
`);

export default db;