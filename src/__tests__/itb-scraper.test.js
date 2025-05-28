import { describe, test, expect, jest } from '@jest/globals';
import ITBDetailScraper from '../scrapers/ITBDetailScraper.js';

describe('ITB Detail Scraper Tests', () => {
  test('should parse ITB page correctly', () => {
    const scraper = new ITBDetailScraper();
    
    // Mock HTML content similar to actual ITB page
    const mockHTML = `
      <table>
        <tr>
          <td>Area of Delivery:</td>
          <td>Metro Manila</td>
        </tr>
        <tr>
          <td>Solicitation Number:</td>
          <td>2025-001</td>
        </tr>
        <tr>
          <td>Trade Agreement:</td>
          <td>Implementing Rules and Regulations</td>
        </tr>
        <tr>
          <td>Procurement Mode:</td>
          <td>Public Bidding</td>
        </tr>
        <tr>
          <td>Classification:</td>
          <td>Goods</td>
        </tr>
        <tr>
          <td>Category:</td>
          <td>Construction Materials</td>
        </tr>
        <tr>
          <td>Approved Budget for the Contract:</td>
          <td>PHP 5,000,000.00</td>
        </tr>
        <tr>
          <td>Delivery Period:</td>
          <td>60 days</td>
        </tr>
        <tr>
          <td>Contact Person:</td>
          <td>Juan Dela Cruz</td>
        </tr>
        <tr>
          <td>Designation:</td>
          <td>BAC Secretariat</td>
        </tr>
        <tr>
          <td>E-mail Address:</td>
          <td>bac@agency.gov.ph</td>
        </tr>
      </table>
    `;
    
    // Create a mock cheerio instance
    const cheerio = jest.requireActual('cheerio');
    const $ = cheerio.load(mockHTML);
    
    const details = scraper.parseITBPage($);
    
    expect(details.area_of_delivery).toBe('Metro Manila');
    expect(details.solicitation_number).toBe('2025-001');
    expect(details.trade_agreement).toBe('Implementing Rules and Regulations');
    expect(details.procurement_mode).toBe('Public Bidding');
    expect(details.classification).toBe('Goods');
    expect(details.category).toBe('Construction Materials');
    expect(details.approved_budget).toBe(5000000);
    expect(details.delivery_period).toBe('60 days');
    expect(details.contact_person).toBe('Juan Dela Cruz');
    expect(details.contact_designation).toBe('BAC Secretariat');
    expect(details.contact_email).toBe('bac@agency.gov.ph');
  });

  test('should handle missing fields gracefully', () => {
    const scraper = new ITBDetailScraper();
    
    const mockHTML = `
      <table>
        <tr>
          <td>Area of Delivery:</td>
          <td>NCR</td>
        </tr>
        <tr>
          <td>Invalid Field:</td>
          <td>Some Value</td>
        </tr>
      </table>
    `;
    
    const cheerio = jest.requireActual('cheerio');
    const $ = cheerio.load(mockHTML);
    
    const details = scraper.parseITBPage($);
    
    expect(details.area_of_delivery).toBe('NCR');
    expect(Object.keys(details).length).toBeGreaterThan(0);
  });

  test('should parse budget amounts correctly', () => {
    const scraper = new ITBDetailScraper();
    
    const testCases = [
      { input: 'PHP 1,234,567.89', expected: 1234567.89 },
      { input: 'PHP 500,000', expected: 500000 },
      { input: 'PHP 1000000.00', expected: 1000000 },
      { input: 'Not a budget', expected: undefined }
    ];
    
    testCases.forEach(({ input, expected }) => {
      const mockHTML = `
        <table>
          <tr>
            <td>Approved Budget:</td>
            <td>${input}</td>
          </tr>
        </table>
      `;
      
      const cheerio = jest.requireActual('cheerio');
      const $ = cheerio.load(mockHTML);
      const details = scraper.parseITBPage($);
      
      expect(details.approved_budget).toBe(expected);
    });
  });
});