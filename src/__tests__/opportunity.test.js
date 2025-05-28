import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Opportunity, initializeDatabase, closeDatabase } from '../models/DatabaseAdapter.js';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Opportunity Model Tests', () => {
  const testDbPath = path.join(__dirname, '../../data/test_opportunity.db');
  
  beforeAll(async () => {
    // Set test database path
    process.env.DATABASE_PATH = testDbPath;
    await initializeDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  beforeEach(async () => {
    // Clear opportunities table before each test
    const db = new Database(testDbPath);
    try {
      db.exec('DELETE FROM opportunities');
    } catch (error) {
      // Table might not exist on first run, ignore
    }
    db.close();
  });

  test('should insert opportunity with all ITB fields', () => {
    const opportunity = {
      reference_number: 'ITB-001',
      title: 'Supply and Delivery of IT Equipment',
      procuring_entity: 'Department of Technology',
      solicitation_number: '2025-01',
      area_of_delivery: 'Metro Manila',
      trade_agreement: 'Implementing Rules and Regulations',
      procurement_mode: 'Public Bidding',
      classification: 'Goods',
      category: 'IT Equipment and Supplies',
      approved_budget: 5000000,
      currency: 'PHP',
      delivery_period: '60 days',
      publish_date: '2025-05-28',
      closing_date: '2025-06-15',
      date_published: '28/05/2025',
      contact_person: 'Juan Dela Cruz',
      contact_designation: 'BAC Secretariat',
      contact_address: '123 Main St, Manila',
      contact_phone: '+63 2 1234567',
      contact_email: 'bac@agency.gov.ph',
      client_agency: 'Department of Technology',
      bid_supplements: 2,
      document_request_list: 15,
      bid_documents_fee: 'PHP 5,000.00',
      bid_submission_deadline: '2025-06-15 10:00 AM',
      bid_opening_date: '2025-06-15 02:00 PM',
      pre_bid_conference: '2025-06-01 10:00 AM at Conference Room A',
      status: 'Open',
      description: 'Procurement of various IT equipment',
      created_by: 'Admin User',
      source_url: 'https://philgeps.gov.ph',
      detail_url: 'https://philgeps.gov.ph/ITB-001'
    };

    const result = Opportunity.insert(opportunity);
    expect(result.changes).toBe(1);

    const saved = Opportunity.findByReferenceNumber('ITB-001');
    expect(saved).toBeTruthy();
    expect(saved.title).toBe(opportunity.title);
    expect(saved.area_of_delivery).toBe('Metro Manila');
    expect(saved.procurement_mode).toBe('Public Bidding');
    expect(saved.approved_budget).toBe(5000000);
    expect(saved.bid_supplements).toBe(2);
  });

  test('should search by area of delivery', () => {
    // Insert test data
    const opportunities = [
      {
        reference_number: 'TEST-001',
        title: 'NCR Project',
        procuring_entity: 'Agency 1',
        area_of_delivery: 'NCR'
      },
      {
        reference_number: 'TEST-002',
        title: 'Cebu Project',
        procuring_entity: 'Agency 2',
        area_of_delivery: 'Cebu'
      },
      {
        reference_number: 'TEST-003',
        title: 'Another NCR Project',
        procuring_entity: 'Agency 3',
        area_of_delivery: 'NCR'
      }
    ];

    opportunities.forEach(opp => Opportunity.insert(opp));

    // Search by area
    const ncrResults = Opportunity.search('', { areaOfDelivery: 'NCR' });
    expect(ncrResults.length).toBe(2);
    expect(ncrResults.every(r => r.area_of_delivery === 'NCR')).toBe(true);

    const cebuResults = Opportunity.search('', { areaOfDelivery: 'Cebu' });
    expect(cebuResults.length).toBe(1);
    expect(cebuResults[0].area_of_delivery).toBe('Cebu');
  });

  test('should handle complex search filters', () => {
    // Insert test data with various attributes
    const opportunities = [
      {
        reference_number: 'COMPLEX-001',
        title: 'High Budget NCR Construction',
        procuring_entity: 'DPWH',
        area_of_delivery: 'NCR',
        category: 'Construction',
        approved_budget: 10000000,
        closing_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      },
      {
        reference_number: 'COMPLEX-002',
        title: 'Low Budget IT Equipment',
        procuring_entity: 'DepEd',
        area_of_delivery: 'NCR',
        category: 'IT Equipment',
        approved_budget: 500000,
        closing_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days from now
      },
      {
        reference_number: 'COMPLEX-003',
        title: 'Expired Construction Project',
        procuring_entity: 'DPWH',
        area_of_delivery: 'Cebu',
        category: 'Construction',
        approved_budget: 5000000,
        closing_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      }
    ];

    opportunities.forEach(opp => Opportunity.insert(opp));

    // Test multiple filters
    const results = Opportunity.search('', {
      areaOfDelivery: 'NCR',
      category: 'Construction',
      minBudget: 1000000,
      activeOnly: true
    });

    expect(results.length).toBe(1);
    expect(results[0].reference_number).toBe('COMPLEX-001');
  });

  test('should count opportunities correctly', () => {
    // Insert test data
    const opportunities = [
      { reference_number: 'COUNT-001', title: 'Active Project 1', procuring_entity: 'Agency 1', closing_date: new Date(Date.now() + 1000000).toISOString() },
      { reference_number: 'COUNT-002', title: 'Active Project 2', procuring_entity: 'Agency 2', closing_date: new Date(Date.now() + 1000000).toISOString() },
      { reference_number: 'COUNT-003', title: 'Expired Project', procuring_entity: 'Agency 3', closing_date: new Date(Date.now() - 1000000).toISOString() }
    ];

    opportunities.forEach(opp => Opportunity.insert(opp));

    const totalCount = Opportunity.count();
    expect(totalCount).toBe(3);

    const activeCount = Opportunity.count('', { activeOnly: true });
    expect(activeCount).toBe(2);
  });

  test('should get statistics correctly', () => {
    // Insert diverse test data
    const opportunities = [
      { reference_number: 'STAT-001', title: 'Project 1', procuring_entity: 'Agency A', category: 'Construction', closing_date: new Date(Date.now() + 1000000).toISOString() },
      { reference_number: 'STAT-002', title: 'Project 2', procuring_entity: 'Agency B', category: 'IT Equipment', closing_date: new Date(Date.now() + 1000000).toISOString() },
      { reference_number: 'STAT-003', title: 'Project 3', procuring_entity: 'Agency A', category: 'Construction', closing_date: new Date(Date.now() - 1000000).toISOString() },
      { reference_number: 'STAT-004', title: 'Project 4', procuring_entity: 'Agency C', category: 'Services', closing_date: new Date(Date.now() + 1000000).toISOString() }
    ];

    opportunities.forEach(opp => Opportunity.insert(opp));

    const stats = Opportunity.getStatistics();
    expect(stats.total).toBe(4);
    expect(stats.active).toBe(3);
    expect(stats.categories).toBe(3); // Construction, IT Equipment, Services
    expect(stats.entities).toBe(3); // Agency A, B, C
  });

  test('should handle pagination correctly', () => {
    // Insert 25 opportunities
    for (let i = 1; i <= 25; i++) {
      Opportunity.insert({
        reference_number: `PAGE-${i.toString().padStart(3, '0')}`,
        title: `Project ${i}`,
        procuring_entity: `Agency ${i}`,
        closing_date: new Date(Date.now() + i * 1000000).toISOString()
      });
    }

    // Test pagination
    const page1 = Opportunity.search('', { limit: 10, offset: 0 });
    expect(page1.length).toBe(10);
    expect(page1[0].reference_number).toBe('PAGE-001');

    const page2 = Opportunity.search('', { limit: 10, offset: 10 });
    expect(page2.length).toBe(10);
    expect(page2[0].reference_number).toBe('PAGE-011');

    const page3 = Opportunity.search('', { limit: 10, offset: 20 });
    expect(page3.length).toBe(5);
    expect(page3[0].reference_number).toBe('PAGE-021');
  });
});