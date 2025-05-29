import knex from 'knex';
import knexConfig from '../config/knexfile.js';

const db = knex(knexConfig);

export async function initializeDatabase() {
  // Check if tables exist
  const hasOpportunities = await db.schema.hasTable('opportunities');
  
  if (!hasOpportunities) {
    console.log('Creating database tables...');
    
    // Create opportunities table
    await db.schema.createTable('opportunities', (table) => {
      table.increments('id').primary();
      table.string('reference_number').unique().notNullable();
      table.text('title').notNullable();
      table.text('procuring_entity').notNullable();
      table.string('category');
      table.string('classification');
      table.string('status');
      table.string('area_of_delivery');
      table.decimal('approved_budget', 15, 2);
      table.string('currency').defaultTo('PHP');
      table.timestamp('publish_date');
      table.timestamp('closing_date');
      table.string('deadline_type');
      table.string('request_type');
      table.string('awarding_type');
      table.string('trade_agreement');
      table.text('url');
      table.timestamps(true, true);
      
      // ITB specific fields
      table.text('itb_reference_number');
      table.text('itb_category');
      table.text('itb_classification');
      table.text('itb_funding_source');
      table.text('itb_funding_year');
      table.text('itb_duration');
      table.text('itb_has_active_rfq');
      table.text('itb_date_posted');
      table.text('itb_closing_date');
      table.text('itb_status');
      table.text('itb_pre_bid_conference');
      table.text('itb_approved_budget');
      table.text('itb_delivery_period');
      table.text('itb_description');
      table.text('itb_created_by');
      table.text('itb_contact_person');
      table.text('itb_bidding_documents');
      table.text('itb_procuring_entity_org_id');
      table.text('itb_procuring_entity_uacs_code');
      table.text('itb_client_agency_org_id');
      table.text('itb_procurement_mode');
      table.text('itb_eligibility');
      table.text('itb_contract_type');
      table.text('itb_opening_date');
      table.text('itb_pre_procurement_conference');
      table.text('itb_non_disclosure_agreement');
      table.text('itb_bid_evaluation');
      table.text('itb_payment_mode');
      table.text('itb_product_service_name');
      table.text('itb_product_service_code');
      table.text('itb_area_of_delivery');
      table.text('itb_contact_person_postal_code');
      table.text('itb_date_last_updated');
      table.text('itb_solicitation_number');
      table.text('itb_trade_agreement');
      table.text('itb_contact_designation');
      table.text('itb_contact_address');
      table.text('itb_contact_phone');
      table.text('itb_contact_email');
      table.integer('itb_bid_supplements');
      table.integer('itb_document_request_list');
      table.text('itb_client_agency');
      
      // RFQ specific fields
      table.text('rfq_solicitation_number');
      table.text('rfq_title');
      table.text('rfq_status');
      table.text('rfq_open_date');
      table.text('rfq_close_date');
      table.text('rfq_description');
      table.text('rfq_request_type');
      table.text('rfq_published_date');
      table.text('rfq_notice_type');
      table.text('rfq_business_category');
      table.text('rfq_approved_budget');
      table.text('rfq_submission_deadline');
      table.text('rfq_special_instructions');
      table.text('rfq_funding_source');
      table.text('rfq_reason');
      table.text('rfq_area_of_delivery');
      table.text('rfq_delivery_date');
      table.text('rfq_contact_person');
      table.text('rfq_contact_number');
      table.text('rfq_required_documents');
      table.text('rfq_attachments');
      table.text('rfq_line_items');
      table.text('rfq_trade_agreement');
      table.text('rfq_pre_procurement_conference');
      table.text('rfq_pre_bid_conference');
      table.text('rfq_procuring_entity_org_id');
      table.text('rfq_client_agency_org_id');
      table.text('rfq_client_agency');
      
      // Indexes
      table.index('reference_number');
      table.index(['title', 'procuring_entity', 'category', 'area_of_delivery'], 'idx_opportunities_search');
      table.index(['closing_date', 'publish_date'], 'idx_opportunities_dates');
    });
    
    // Create crawl_history table
    await db.schema.createTable('crawl_history', (table) => {
      table.increments('id').primary();
      table.timestamp('crawl_date').defaultTo(db.fn.now());
      table.integer('opportunities_found').defaultTo(0);
      table.integer('new_opportunities').defaultTo(0);
      table.integer('updated_opportunities').defaultTo(0);
      table.integer('errors').defaultTo(0);
      table.decimal('duration_seconds');
      table.string('status');
      table.text('error_message');
    });
    
    console.log('Database tables created successfully');
  }
}

export async function closeDatabase() {
  await db.destroy();
}

export { db };
export default db;