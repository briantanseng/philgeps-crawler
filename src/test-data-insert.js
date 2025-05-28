#!/usr/bin/env node

import { Opportunity, initializeDatabase } from './models/DatabaseAdapter.js';

async function insertTestData() {
  await initializeDatabase();
  
  const testOpportunities = [
    {
      reference_number: 'TEST-001',
      title: 'Supply of IT Equipment',
      procuring_entity: 'Department of Education',
      category: 'IT Equipment',
      area_of_delivery: 'NCR',
      approved_budget: 5000000,
      closing_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      status: 'Open'
    },
    {
      reference_number: 'TEST-002',
      title: 'Construction of School Building',
      procuring_entity: 'DPWH',
      category: 'Construction',
      area_of_delivery: 'NCR',
      approved_budget: 10000000,
      closing_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
      status: 'Open'
    },
    {
      reference_number: 'TEST-003',
      title: 'Medical Supplies',
      procuring_entity: 'Department of Health',
      category: 'Medical Supplies',
      area_of_delivery: 'Cebu',
      approved_budget: 3000000,
      closing_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      status: 'Open'
    },
    {
      reference_number: 'TEST-004',
      title: 'Office Supplies',
      procuring_entity: 'Department of Education',
      category: 'Office Supplies',
      area_of_delivery: 'NCR',
      approved_budget: 500000,
      closing_date: new Date().toISOString(), // Today
      status: 'Open'
    },
    {
      reference_number: 'TEST-005',
      title: 'Expired Project',
      procuring_entity: 'DPWH',
      category: 'Construction',
      area_of_delivery: 'Davao',
      approved_budget: 2000000,
      closing_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      status: 'Closed'
    }
  ];
  
  console.log('Inserting test data...');
  
  for (const opp of testOpportunities) {
    try {
      Opportunity.insert(opp);
      console.log(`✓ Inserted: ${opp.reference_number} - ${opp.title}`);
    } catch (error) {
      console.error(`✗ Failed to insert ${opp.reference_number}:`, error.message);
    }
  }
  
  console.log('\nTest data insertion complete!');
  process.exit(0);
}

insertTestData();