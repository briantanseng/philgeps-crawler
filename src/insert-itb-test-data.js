#!/usr/bin/env node

import { Opportunity, initializeDatabase } from './models/DatabaseAdapter.js';

async function insertITBTestData() {
  await initializeDatabase();
  
  const testOpportunities = [
    {
      reference_number: 'ITB-TEST-001',
      title: 'Supply and Delivery of Computer Equipment with Complete ITB Details',
      procuring_entity: 'Department of Information Technology',
      category: 'IT Equipment',
      area_of_delivery: 'NCR',
      approved_budget: 8500000,
      closing_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Open',
      // ITB Details
      solicitation_number: '2025-ITB-001',
      procurement_mode: 'Public Bidding',
      trade_agreement: 'Implementing Rules and Regulations',
      classification: 'Goods',
      delivery_period: '45 Calendar Days',
      contact_person: 'Juan Dela Cruz',
      contact_designation: 'BAC Secretariat Head',
      contact_phone: '+63 2 8123-4567',
      contact_email: 'bac.secretariat@dit.gov.ph',
      contact_address: '5th Floor, DIT Building, Ortigas Center, Pasig City',
      pre_bid_conference: '2025-06-05 10:00 AM at DIT Conference Room',
      bid_documents_fee: 'PHP 10,000.00',
      bid_submission_deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      date_published: '29/05/2025',
      description: 'Procurement of high-end computer equipment including servers, workstations, and networking devices for the modernization of government IT infrastructure.',
      detail_url: 'https://notices.philgeps.gov.ph/GEPSNONPILOT/Tender/SplashBidNoticeAbstractUI.aspx?refID=ITB-TEST-001'
    },
    {
      reference_number: 'ITB-TEST-002',
      title: 'Construction of Multi-Purpose Building with ITB Info',
      procuring_entity: 'Department of Public Works and Highways',
      category: 'Construction',
      area_of_delivery: 'Region III',
      approved_budget: 25000000,
      closing_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Open',
      // ITB Details
      solicitation_number: '2025-INFRA-002',
      procurement_mode: 'Public Bidding',
      trade_agreement: 'Implementing Rules and Regulations',
      classification: 'Infrastructure Projects',
      delivery_period: '180 Calendar Days',
      contact_person: 'Maria Santos',
      contact_designation: 'BAC Chairman',
      contact_phone: '+63 45 123-4567',
      contact_email: 'bac@dpwh-r3.gov.ph',
      pre_bid_conference: '2025-06-08 09:00 AM at DPWH Regional Office',
      bid_documents_fee: 'PHP 25,000.00',
      detail_url: 'https://notices.philgeps.gov.ph/GEPSNONPILOT/Tender/SplashBidNoticeAbstractUI.aspx?refID=ITB-TEST-002'
    },
    {
      reference_number: 'ITB-TEST-003',
      title: 'Medical Supplies and Equipment (No ITB Details)',
      procuring_entity: 'Department of Health',
      category: 'Medical Supplies',
      area_of_delivery: 'NCR',
      approved_budget: 5000000,
      closing_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Open',
      // No ITB details for this one - to test show/hide feature
      detail_url: 'https://notices.philgeps.gov.ph/GEPSNONPILOT/Tender/SplashBidNoticeAbstractUI.aspx?refID=ITB-TEST-003'
    },
    {
      reference_number: 'ITB-TEST-004',
      title: 'Janitorial Services with Partial ITB Details',
      procuring_entity: 'Department of Education',
      category: 'Services',
      area_of_delivery: 'Region IV-A',
      approved_budget: 1200000,
      closing_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Open',
      // Partial ITB Details
      solicitation_number: '2025-SVC-004',
      procurement_mode: 'Public Bidding',
      contact_person: 'Pedro Reyes',
      contact_phone: '+63 2 633-1942',
      detail_url: 'https://notices.philgeps.gov.ph/GEPSNONPILOT/Tender/SplashBidNoticeAbstractUI.aspx?refID=ITB-TEST-004'
    }
  ];
  
  console.log('Inserting ITB test data...\n');
  
  for (const opp of testOpportunities) {
    try {
      Opportunity.insert(opp);
      console.log(`✓ Inserted: ${opp.reference_number}`);
      console.log(`  Title: ${opp.title}`);
      console.log(`  ITB Details: ${opp.solicitation_number ? 'Yes' : 'No'}\n`);
    } catch (error) {
      console.error(`✗ Failed to insert ${opp.reference_number}:`, error.message);
    }
  }
  
  console.log('ITB test data insertion complete!');
  console.log('\nYou can now test the table interface at http://localhost:3000');
  process.exit(0);
}

insertITBTestData();