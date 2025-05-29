import { Page, expect } from '@playwright/test';

/**
 * Common test utilities and helpers for e2e tests
 */

export class TestUtils {
  constructor(private page: Page) {}

  /**
   * Wait for API response with optional status check
   */
  async waitForAPI(
    url: string | RegExp,
    options?: {
      method?: string;
      status?: number;
      timeout?: number;
    }
  ) {
    const response = await this.page.waitForResponse(
      (resp) => {
        const urlMatches = typeof url === 'string' 
          ? resp.url().includes(url)
          : url.test(resp.url());
        
        const methodMatches = !options?.method || resp.request().method() === options.method;
        const statusMatches = !options?.status || resp.status() === options.status;
        
        return urlMatches && methodMatches && statusMatches;
      },
      { timeout: options?.timeout || 10000 }
    );
    
    return response;
  }

  /**
   * Fill search form with provided data
   */
  async fillSearchForm(searchData: {
    query?: string;
    category?: string;
    area?: string;
    minBudget?: string;
    maxBudget?: string;
    activeOnly?: boolean;
  }) {
    if (searchData.query) {
      await this.page.fill('input[placeholder="Enter keywords..."]', searchData.query);
    }
    
    if (searchData.category) {
      await this.page.selectOption('select#category', searchData.category);
    }
    
    if (searchData.area) {
      await this.page.selectOption('select#areaOfDelivery', searchData.area);
    }
    
    if (searchData.minBudget) {
      await this.page.fill('input#minBudget', searchData.minBudget);
    }
    
    if (searchData.maxBudget) {
      await this.page.fill('input#maxBudget', searchData.maxBudget);
    }
    
    if (searchData.activeOnly !== undefined) {
      await this.page.selectOption('select#activeOnly', searchData.activeOnly ? 'true' : 'false');
    }
  }

  /**
   * Check if statistics are loaded with valid numbers
   */
  async verifyStatisticsLoaded() {
    const statElements = {
      total: await this.page.textContent('#totalOpportunities'),
      active: await this.page.textContent('#activeOpportunities'),
      categories: await this.page.textContent('#totalCategories'),
      entities: await this.page.textContent('#totalEntities')
    };

    // Verify all stats are numbers and not placeholders
    for (const [key, value] of Object.entries(statElements)) {
      expect(value).not.toBe('-');
      expect(value).not.toBe('');
      expect(Number(value?.replace(/,/g, ''))).toBeGreaterThanOrEqual(0);
    }
  }

  /**
   * Wait for table to load with results
   */
  async waitForTableResults() {
    await this.page.waitForSelector('table tbody tr', { timeout: 10000 });
    const rowCount = await this.page.locator('table tbody tr').count();
    expect(rowCount).toBeGreaterThan(0);
    return rowCount;
  }

  /**
   * Get table data as array of objects
   */
  async getTableData(): Promise<Record<string, string>[]> {
    const headers = await this.page.$$eval('table thead th', 
      cells => cells.map(cell => cell.textContent?.trim() || '').filter(h => h !== '')
    );
    
    const rows = await this.page.$$eval('table tbody tr', (rows, headers) => {
      return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        const rowData: Record<string, string> = {};
        
        headers.forEach((header, index) => {
          if (cells[index]) {
            rowData[header] = cells[index].textContent?.trim() || '';
          }
        });
        
        return rowData;
      });
    }, headers);
    
    return rows;
  }

  /**
   * Check if row has ITB indicator
   */
  async rowHasITBIndicator(rowIndex: number): Promise<boolean> {
    const indicator = await this.page.locator(`table tbody tr:nth-child(${rowIndex + 1}) .bg-blue-100`);
    return await indicator.isVisible();
  }

  /**
   * Expand a table row
   */
  async expandRow(rowIndex: number) {
    const expandButton = await this.page.locator(`table tbody tr:nth-child(${rowIndex + 1}) button:has-text("▶")`);
    if (await expandButton.isVisible()) {
      await expandButton.click();
      // Wait for animation
      await this.page.waitForTimeout(300);
      return true;
    }
    return false;
  }

  /**
   * Check if row is expanded
   */
  async isRowExpanded(rowIndex: number): Promise<boolean> {
    const expandButton = await this.page.locator(`table tbody tr:nth-child(${rowIndex + 1}) button:has-text("▼")`);
    return await expandButton.isVisible();
  }

  /**
   * Get ITB details from expanded row
   */
  async getITBDetails(rowIndex: number): Promise<Record<string, string>> {
    const detailsSelector = `table tbody tr:nth-child(${rowIndex + 2}) .bg-white`;
    await this.page.waitForSelector(detailsSelector);
    
    const details = await this.page.$$eval(`${detailsSelector} .grid > div`, elements => {
      const data: Record<string, string> = {};
      elements.forEach(el => {
        const label = el.querySelector('dt')?.textContent?.trim() || '';
        const value = el.querySelector('dd')?.textContent?.trim() || '';
        if (label) {
          data[label] = value;
        }
      });
      return data;
    });
    
    return details;
  }

  /**
   * Mock API responses for testing
   */
  async mockAPIResponse(url: string | RegExp, data: any, status = 200) {
    await this.page.route(url, async route => {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(data)
      });
    });
  }

  /**
   * Add test data with ITB details
   */
  getMockOpportunityWithITB() {
    return {
      id: 1,
      reference_number: 'TEST-2025-001',
      title: 'Test Opportunity with ITB Details',
      procuring_entity: 'Test Agency',
      category: 'Construction',
      area_of_delivery: 'NCR',
      approved_budget: 1000000,
      currency: 'PHP',
      closing_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      days_until_closing: 7,
      formatted_budget: '₱1,000,000',
      is_closing_soon: true,
      is_expired: false,
      hasItbDetails: true,
      hasRfqDetails: false,
      detail_url: 'https://example.com/opportunity/1',
      
      // ITB Details
      itb_solicitation_number: 'ITB-TEST-2025-001',
      itb_procurement_mode: 'Public Bidding',
      itb_trade_agreement: 'Implementing Entity',
      itb_classification: 'Goods',
      itb_delivery_period: '30 calendar days',
      itb_contact_person: 'John Doe',
      itb_contact_email: 'john.doe@testagency.gov.ph',
      itb_contact_phone: '(02) 8888-1234',
      itb_pre_bid_conference: 'June 15, 2025 10:00 AM',
      itb_bidding_documents: 'PHP 5,000.00',
      itb_description: 'This is a test ITB description with detailed requirements.',
      itb_eligibility: 'Must be registered with PhilGEPS'
    };
  }
}